import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import { onDocumentDeleted } from 'firebase-functions/v2/firestore';
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
