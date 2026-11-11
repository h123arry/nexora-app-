import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import { onDocumentDeleted } from 'firebase-functions/v2/firestore';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { getFirebaseAdminApp, resolveFirebaseStorageBucket, resolveFirestoreDatabaseId } from './runtimeConfig.js';

const app = getFirebaseAdminApp();
const db = getFirestore(app, resolveFirestoreDatabaseId());
const bucket = getStorage(app).bucket(resolveFirebaseStorageBucket());

/**
 * A media moment is the durable owner of its uploaded object. Cleanup runs
 * with Admin privileges because completed mediaAssets records are deliberately
 * not client-deletable. The path is reconstructed and checked against both
 * the authenticated author recorded on the moment and its document ID.
 */
export const cleanupDeletedWorldWeaveMoment = onDocumentDeleted(
  { document: 'worldWeaves/{weaveId}/moments/{momentId}', retry: true },
  async event => {
    const moment = event.data?.data();
    if (!moment || typeof moment.authorId !== 'string' || typeof moment.storagePath !== 'string') return;

    const authorId = moment.authorId;
    const momentId = event.params.momentId;
    if (!/^[A-Za-z0-9_-]{1,128}$/.test(authorId) || !/^[A-Za-z0-9_-]{1,128}$/.test(momentId)) return;

    const expectedPath = `users/${authorId}/media/${momentId}`;
    if (moment.storagePath !== expectedPath) {
      console.warn(JSON.stringify({ event: 'worldweave_media_cleanup_skipped', reason: 'path_mismatch', weaveId: event.params.weaveId, momentId }));
      return;
    }

    // Storage deletion is idempotent. If Firestore cleanup fails, the trigger
    // can retry safely without leaving an orphaned object.
    await bucket.file(expectedPath).delete({ ignoreNotFound: true });
    const assetRef = db.collection('mediaAssets').doc(momentId);
    const asset = await assetRef.get();
    if (asset.exists && asset.data()?.ownerId === authorId && asset.data()?.storagePath === expectedPath) {
      await assetRef.delete();
    }
    console.info(JSON.stringify({ event: 'worldweave_media_cleanup_completed', weaveId: event.params.weaveId, momentId }));
  },
);

/**
 * Compensating cleanup for an upload whose moment batch did not commit.
 * The callable refuses to delete anything once a published moment references it.
 */
export const cleanupUnpublishedWorldWeaveMedia = onCall({ maxInstances: 10 }, async request => {
  const userId = request.auth?.uid;
  if (!userId) throw new HttpsError('unauthenticated', 'Sign in to clean up this upload.');

  const weaveId = request.data?.weaveId;
  const momentId = request.data?.momentId;
  if (typeof weaveId !== 'string' || !/^[A-Za-z0-9_-]{1,128}$/.test(weaveId)
    || typeof momentId !== 'string' || !/^[A-Za-z0-9_-]{1,128}$/.test(momentId)) {
    throw new HttpsError('invalid-argument', 'The WorldWeave upload reference is invalid.');
  }

  const momentRef = db.doc(`worldWeaves/${weaveId}/moments/${momentId}`);
  if ((await momentRef.get()).exists) {
    throw new HttpsError('failed-precondition', 'This upload is already attached to a published moment.');
  }

  const expectedPath = `users/${userId}/media/${momentId}`;
  const assetRef = db.collection('mediaAssets').doc(momentId);
  const asset = await assetRef.get();
  if (!asset.exists) return { cleaned: false };
  const data = asset.data();
  if (data?.ownerId !== userId || data?.storagePath !== expectedPath) {
    throw new HttpsError('permission-denied', 'This upload does not belong to your account.');
  }

  await bucket.file(expectedPath).delete({ ignoreNotFound: true });
  await assetRef.delete();
  return { cleaned: true };
});
