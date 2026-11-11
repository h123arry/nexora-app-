import { getFirestore, type DocumentSnapshot } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { getFirebaseAdminApp, resolveFirebaseStorageBucket, resolveFirestoreDatabaseId } from './runtimeConfig.js';
import { safeVideoRenditions } from './publicMediaPlaybackPolicy.js';

const app = getFirebaseAdminApp();
const db = getFirestore(app, resolveFirestoreDatabaseId());
const ID = /^[A-Za-z0-9_-]{1,128}$/;
const URL_TTL_MS = 15 * 60 * 1000;
const EXPORT_TTL_MS = 24 * 60 * 60 * 1000;

function bucket() {
  return getStorage(app).bucket(resolveFirebaseStorageBucket());
}

async function deleteExportAsset(snapshot: DocumentSnapshot): Promise<void> {
  const asset = snapshot.data();
  const ownerId = typeof asset?.ownerId === 'string' ? asset.ownerId : '';
  const mediaId = snapshot.id;
  if (!ownerId || asset?.sourcePurpose !== 'studio-export' || asset?.status === 'processing') return;
  const sourcePath = `users/${ownerId}/media/${mediaId}`;
  if (asset.storagePath === sourcePath) {
    await bucket().file(sourcePath).delete({ ignoreNotFound: true });
  }
  await bucket().deleteFiles({ prefix: `processed/${ownerId}/${mediaId}/` });
  await snapshot.ref.delete();
}

export const getStudioExportMp4Url = onCall({ maxInstances: 30 }, async request => {
  const uid = request.auth?.uid;
  const mediaAssetId = request.data?.mediaAssetId;
  if (!uid) throw new HttpsError('unauthenticated', 'Sign in to prepare an MP4 export.');
  if (typeof mediaAssetId !== 'string' || !ID.test(mediaAssetId)) {
    throw new HttpsError('invalid-argument', 'A valid Studio export asset is required.');
  }
  const snapshot = await db.collection('mediaAssets').doc(mediaAssetId).get();
  const asset = snapshot.data();
  if (!snapshot.exists || asset?.ownerId !== uid) {
    throw new HttpsError('not-found', 'This Studio export is unavailable.');
  }
  if (asset.sourcePurpose !== 'studio-export') {
    if (asset.status === 'ready') throw new HttpsError('not-found', 'This media asset is not a Studio export.');
    return { ready: false as const };
  }
  if (asset.status === 'failed' || asset.status === 'rejected') {
    throw new HttpsError('failed-precondition', 'The server could not prepare this MP4. Your original Studio export is still available.');
  }
  if (asset.status !== 'ready') return { ready: false as const };
  const renditions = safeVideoRenditions(asset.renditions, uid, mediaAssetId);
  const selected = [...renditions].sort((a, b) => b.height - a.height)[0];
  if (!selected) throw new HttpsError('unavailable', 'The MP4 rendition is not ready yet.');
  const file = bucket().file(selected.path);
  const [exists] = await file.exists();
  if (!exists) throw new HttpsError('unavailable', 'The MP4 file is not available yet.');
  const expiresAt = Date.now() + URL_TTL_MS;
  const [downloadUrl] = await file.getSignedUrl({ action: 'read', expires: expiresAt, version: 'v4' });
  return { ready: true as const, downloadUrl, renditionHeight: selected.height, expiresAt };
});

export const cleanupStudioExportAsset = onCall({ maxInstances: 20 }, async request => {
  const uid = request.auth?.uid;
  const mediaAssetId = request.data?.mediaAssetId;
  if (!uid) throw new HttpsError('unauthenticated', 'Sign in to clean up this Studio export.');
  if (typeof mediaAssetId !== 'string' || !ID.test(mediaAssetId)) {
    throw new HttpsError('invalid-argument', 'A valid Studio export asset is required.');
  }
  const snapshot = await db.collection('mediaAssets').doc(mediaAssetId).get();
  const asset = snapshot.data();
  if (!snapshot.exists || asset?.ownerId !== uid || asset?.sourcePurpose !== 'studio-export') {
    throw new HttpsError('not-found', 'This temporary Studio export is unavailable.');
  }
  if (asset.status === 'processing') {
    throw new HttpsError('failed-precondition', 'The MP4 conversion is still processing.');
  }
  await deleteExportAsset(snapshot);
  return { cleaned: true as const };
});

export const cleanupExpiredStudioMp4Exports = onSchedule('every 6 hours', async () => {
  let cursor: DocumentSnapshot | null = null;
  while (true) {
    let query = db.collection('mediaAssets')
      .where('sourcePurpose', '==', 'studio-export')
      .limit(200);
    if (cursor) query = query.startAfter(cursor);
    const page = await query.get();
    if (page.empty) break;
    for (const snapshot of page.docs) {
      const expiresAt = snapshot.get('studioExportExpiresAt');
      const expiry = typeof expiresAt?.toMillis === 'function' ? expiresAt.toMillis() : 0;
      if (expiry > 0 && expiry <= Date.now() && snapshot.get('status') !== 'processing') {
        await deleteExportAsset(snapshot);
      }
    }
    if (page.size < 200) break;
    cursor = page.docs[page.docs.length - 1];
  }
});
