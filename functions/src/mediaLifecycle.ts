import { createHash } from 'node:crypto';
import { getStorage } from 'firebase-admin/storage';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import { onObjectFinalized } from 'firebase-functions/v2/storage';
import { getFirebaseAdminApp, resolveFirestoreDatabaseId } from './runtimeConfig.js';
import { shouldAcceptFinalizedMediaTransition } from './mediaLifecyclePolicy.js';
import { buildOriginUploadRecords } from './originPolicy.js';

const app = getFirebaseAdminApp();
const databaseId = resolveFirestoreDatabaseId();
const db = getFirestore(app, databaseId);
const MAX_BYTES: Record<string, number> = {
  image: 12 * 1024 * 1024,
  video: 250 * 1024 * 1024,
  audio: 50 * 1024 * 1024,
};

function classify(contentType: string): 'image' | 'video' | 'audio' | null {
  if (contentType.startsWith('image/')) return 'image';
  if (contentType.startsWith('video/')) return 'video';
  if (contentType.startsWith('audio/')) return 'audio';
  return null;
}

async function sha256FinalizedObject(bucketName: string, objectName: string, generation: string): Promise<string> {
  const file = getStorage(app).bucket(bucketName).file(objectName, { generation });
  const digest = createHash('sha256');
  // Stream the immutable Cloud Storage generation; never load a full video into memory.
  for await (const chunk of file.createReadStream()) digest.update(chunk as Buffer);
  return digest.digest('hex');
}

export const verifyFinalizedMedia = onObjectFinalized(async event => {
  const object = event.data;
  const match = object.name?.match(/^users\/([A-Za-z0-9_-]{1,128})\/media\/([A-Za-z0-9_-]{1,128})$/);
  if (!match || !object.name) return;
  const [, ownerId, mediaId] = match;
  const contentType = String(object.contentType || '').toLowerCase();
  const kind = classify(contentType);
  const size = Number(object.size || 0);
  const generation = String(object.generation || '');
  const ref = db.collection('mediaAssets').doc(mediaId);
  const isValid = Boolean(
    kind
    && size > 0
    && size <= (kind ? MAX_BYTES[kind] : 0)
    && object.metadata?.ownerId === ownerId
    && object.metadata?.mediaId === mediaId
    && /^\d{1,32}$/.test(generation)
    && typeof object.bucket === 'string'
    && object.bucket.length > 0,
  );

  // Compute a real SHA-256 over the exact immutable object generation. This is
  // streamed so large videos do not need to fit in function memory.
  const contentDigest = isValid && kind
    ? await sha256FinalizedObject(object.bucket, object.name, generation)
    : null;

  // Storage finalization is delivered at least once. The asset lifecycle,
  // origin record, and generation-scoped event commit atomically.
  await db.runTransaction(async transaction => {
    const existing = await transaction.get(ref);
    const current = existing.data();
    if (!shouldAcceptFinalizedMediaTransition(current, ownerId)) return;

    if (!isValid || !kind || !contentDigest) {
      transaction.set(ref, {
        id: mediaId,
        ownerId,
        storagePath: object.name,
        status: 'rejected',
        failureCategory: 'invalid_finalized_object',
        updatedAt: FieldValue.serverTimestamp(),
      }, { merge: true });
      return;
    }

    const originRef = db.collection('mediaOrigins').doc(mediaId);
    const originEventId = `generation_${generation}`;
    const eventRef = originRef.collection('events').doc(originEventId);
    const [originSnapshot, eventSnapshot] = await Promise.all([
      transaction.get(originRef),
      transaction.get(eventRef),
    ]);
    const records = buildOriginUploadRecords({
      assetId: mediaId,
      ownerUid: ownerId,
      mediaGeneration: generation,
      contentDigest,
      contentType,
      byteSize: size,
      studioExport: object.metadata?.purpose === 'studio-export',
    });

    if (originSnapshot.exists) {
      const prior = originSnapshot.data();
      if (prior?.ownerUid !== ownerId
        || prior?.mediaGeneration !== generation
        || prior?.contentDigest !== contentDigest) {
        throw new Error('Origin record conflicts with the finalized media generation.');
      }
    } else {
      transaction.create(originRef, {
        ...records.origin,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
    }
    if (!eventSnapshot.exists) {
      transaction.create(eventRef, {
        ...records.event,
        createdAt: FieldValue.serverTimestamp(),
      });
    }

    // No fabricated duration, thumbnail, moderation or playback variant is written here.
    transaction.set(ref, {
      id: mediaId,
      ownerId,
      storagePath: object.name,
      kind,
      contentType,
      size,
      generation,
      md5Hash: object.md5Hash || null,
      status: 'uploaded',
      uploadedAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true });
  });
});
