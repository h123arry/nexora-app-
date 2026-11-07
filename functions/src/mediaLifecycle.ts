import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import { onObjectFinalized } from 'firebase-functions/v2/storage';
import { getFirebaseAdminApp, resolveFirestoreDatabaseId } from './runtimeConfig.js';
import { shouldAcceptFinalizedMediaTransition } from './mediaLifecyclePolicy.js';

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

export const verifyFinalizedMedia = onObjectFinalized(async event => {
  const object = event.data;
  const match = object.name?.match(/^users\/([A-Za-z0-9_-]{1,128})\/media\/([A-Za-z0-9_-]{1,128})$/);
  if (!match || !object.name) return;
  const [, ownerId, mediaId] = match;
  const contentType = String(object.contentType || '').toLowerCase();
  const kind = classify(contentType);
  const size = Number(object.size || 0);
  const ref = db.collection('mediaAssets').doc(mediaId);
  const isValid = Boolean(
    kind
    && size > 0
    && size <= (kind ? MAX_BYTES[kind] : 0)
    && object.metadata?.ownerId === ownerId
    && object.metadata?.mediaId === mediaId,
  );

  // Storage finalization is delivered at least once. Use a transaction so a
  // duplicate or racing event cannot overwrite a later processing/ready state,
  // or mutate another account's mediaAssets record if an ID is ever reused.
  await db.runTransaction(async transaction => {
    const existing = await transaction.get(ref);
    const current = existing.data();
    if (!shouldAcceptFinalizedMediaTransition(current, ownerId)) return;

    if (!isValid || !kind) {
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

    // This worker verifies the finalized object and records a durable uploaded
    // state. A configured transcoder may later advance uploaded -> processing
    // -> ready. No fake duration, thumbnail, moderation or playback variant
    // is written here.
    transaction.set(ref, {
      id: mediaId,
      ownerId,
      storagePath: object.name,
      kind,
      contentType,
      size,
      generation: object.generation || null,
      md5Hash: object.md5Hash || null,
      status: 'uploaded',
      uploadedAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true });
  });
});
