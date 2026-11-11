import { getStorage } from 'firebase-admin/storage';
import { getFirestore } from 'firebase-admin/firestore';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { getFirebaseAdminApp, resolveFirebaseStorageBucket, resolveFirestoreDatabaseId } from './runtimeConfig.js';
import { canResolvePublicPostMedia, chooseVideoRendition, safeVideoRenditions } from './publicMediaPlaybackPolicy.js';

const app = getFirebaseAdminApp();
const db = getFirestore(app, resolveFirestoreDatabaseId());
const ID = /^[A-Za-z0-9_-]{1,128}$/;
const URL_TTL_MS = 15 * 60 * 1000;


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
  if (!postSnapshot.exists || !assetSnapshot.exists
    || !canResolvePublicPostMedia(post, asset, mediaAssetId)) {
    throw new HttpsError('not-found', 'Processed playback is unavailable for this post.');
  }
  if (asset?.status !== 'ready') return { ready: false as const };

  const ownerId = typeof post?.userId === 'string' ? post.userId : '';
  const renditions = safeVideoRenditions(asset?.renditions, ownerId, mediaAssetId);
  const selected = chooseVideoRendition(renditions);
  if (!selected) return { ready: false as const };
  const expiresAt = Date.now() + URL_TTL_MS;
  try {
    // Resolve Storage lazily so an unconfigured bucket cannot prevent unrelated
    // Firebase Functions from loading or deploying.
    const bucket = getStorage(app).bucket(resolveFirebaseStorageBucket());
    const file = bucket.file(selected.path);
    const [exists] = await file.exists();
    if (!exists) return { ready: false as const };
    const [url] = await file.getSignedUrl({
      action: 'read',
      expires: expiresAt,
      version: 'v4',
    });
    return { ready: true as const, playbackUrl: url, renditionHeight: selected.height, expiresAt };
  } catch (error) {
    console.error('[MediaPlayback] Signed rendition delivery is unavailable.', error);
    throw new HttpsError('unavailable', 'Processed playback is temporarily unavailable.');
  }
});
