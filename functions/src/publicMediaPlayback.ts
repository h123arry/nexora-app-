import { getStorage } from 'firebase-admin/storage';
import { getFirestore } from 'firebase-admin/firestore';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { getFirebaseAdminApp, resolveFirebaseStorageBucket, resolveFirestoreDatabaseId } from './runtimeConfig.js';

const app = getFirebaseAdminApp();
const db = getFirestore(app, resolveFirestoreDatabaseId());
const bucket = getStorage(app).bucket(resolveFirebaseStorageBucket());
const ID = /^[A-Za-z0-9_-]{1,128}$/;
const URL_TTL_MS = 15 * 60 * 1000;

type Rendition = { height?: unknown; mp4Path?: unknown };

function safeRenditions(value: unknown, ownerId: string, mediaAssetId: string): Array<{ height: number; path: string }> {
  if (!Array.isArray(value)) return [];
  const prefix = `processed/${ownerId}/${mediaAssetId}/`;
  return value.flatMap((item: Rendition) => {
    if (!item || !Number.isSafeInteger(item.height) || (item.height as number) < 144 || (item.height as number) > 4320
      || typeof item.mp4Path !== 'string' || !item.mp4Path.startsWith(prefix)
      || item.mp4Path.includes('..') || item.mp4Path.includes('\\\\')) return [];
    return [{ height: item.height as number, path: item.mp4Path }];
  }).sort((a, b) => a.height - b.height);
}

/**
 * Resolve playback only after checking the post's current public audience and
 * matching its media asset to the publishing account. mediaAssets stays owner-only.
 */
export const getPublicPostPlayback = onCall({ maxInstances: 40 }, async request => {
  if (!request.auth?.uid) throw new HttpsError('unauthenticated', 'Sign in to play this video.');
  const postId = request.data?.postId;
  const mediaAssetId = request.data?.mediaAssetId;
  if (typeof postId !== 'string' || !ID.test(postId)
    || typeof mediaAssetId !== 'string' || !ID.test(mediaAssetId)) {
    throw new HttpsError('invalid-argument', 'A valid post and media asset are required.');
  }

  const postRef = db.collection('posts').doc(postId);
  const assetRef = db.collection('mediaAssets').doc(mediaAssetId);
  const [postSnapshot, assetSnapshot] = await Promise.all([postRef.get(), assetRef.get()]);
  const post = postSnapshot.data();
  const asset = assetSnapshot.data();
  if (!postSnapshot.exists || post?.audience !== 'public' || post?.mediaAssetId !== mediaAssetId
    || typeof post?.userId !== 'string' || !assetSnapshot.exists || asset?.ownerId !== post.userId
    || asset?.kind !== 'video') {
    throw new HttpsError('not-found', 'Processed playback is unavailable for this post.');
  }
  if (asset?.status !== 'ready') return { ready: false as const };

  const renditions = safeRenditions(asset.renditions, post.userId, mediaAssetId);
  if (!renditions.length) return { ready: false as const };
  const selected = renditions.find(item => item.height === 720)
    || renditions.filter(item => item.height <= 720).at(-1)
    || renditions[0];
  const expiresAt = Date.now() + URL_TTL_MS;
  const [url] = await bucket.file(selected.path).getSignedUrl({
    action: 'read',
    expires: expiresAt,
    version: 'v4',
  });
  return { ready: true as const, playbackUrl: url, renditionHeight: selected.height, expiresAt };
});
