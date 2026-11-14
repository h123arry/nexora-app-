import { getFirestore } from 'firebase-admin/firestore';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { getFirebaseAdminApp, resolveFirestoreDatabaseId } from './runtimeConfig.js';
import { canExposeOriginSource, isOriginAccountBlocked, isOriginPublicPost, type OriginViewerAccountSettings } from './originViewerPolicy.js';

const db = getFirestore(getFirebaseAdminApp(), resolveFirestoreDatabaseId());
const SAFE_ID = /^[A-Za-z0-9_-]{1,128}$/;
const MAX_PUBLIC_SOURCES = 10;

/** Returns only currently public, viewer-accessible source-post identities for a public derivative. */
export const getPublicOriginAttribution = onCall({ maxInstances: 10 }, async request => {
  const viewerUid = request.auth?.uid;
  if (!viewerUid) throw new HttpsError('unauthenticated', 'Sign in to view NEXORA Origin attribution.');
  const postId = request.data?.postId;
  if (typeof postId !== 'string' || !SAFE_ID.test(postId)) throw new HttpsError('invalid-argument', 'Choose a valid post.');
  try {
    const derivativePostSnap = await db.collection('posts').doc(postId).get();
    if (!derivativePostSnap.exists) throw new HttpsError('not-found', 'This post is no longer available.');
    const derivativePost = derivativePostSnap.data()!;
    const derivativeOwnerUid = String(derivativePost.userId || derivativePost.authorId || '');
    if (!isOriginPublicPost(derivativePost, derivativeOwnerUid)) {
      throw new HttpsError('permission-denied', 'Origin details are available only for public posts.');
    }
    const mediaAssetId = derivativePost.mediaAssetId;
    if (typeof mediaAssetId !== 'string' || !SAFE_ID.test(mediaAssetId)) return { postId, hasLineage: false, sources: [] };
    const originRef = db.collection('mediaOrigins').doc(mediaAssetId);
    const originSnap = await originRef.get();
    if (!originSnap.exists || originSnap.get('ownerUid') !== derivativeOwnerUid) return { postId, hasLineage: false, sources: [] };
    const eventSnap = await originRef.collection('events').doc(`derivative_${mediaAssetId}`).get();
    if (!eventSnap.exists) return { postId, hasLineage: false, sources: [] };
    const entries = eventSnap.get('parentAttribution');
    if (!Array.isArray(entries) || entries.length === 0) return { postId, hasLineage: false, sources: [] };

    const settingsCache = new Map<string, Promise<OriginViewerAccountSettings | null>>();
    const readSettings = (uid: string): Promise<OriginViewerAccountSettings | null> => {
      if (!settingsCache.has(uid)) {
        settingsCache.set(uid, db.collection('users').doc(uid).collection('settings').doc('preferences').get()
          .then(snapshot => snapshot.exists ? snapshot.data() as OriginViewerAccountSettings : null));
      }
      return settingsCache.get(uid)!;
    };
    const [viewerSettings, derivativeSettings] = await Promise.all([readSettings(viewerUid), readSettings(derivativeOwnerUid)]);
    if (isOriginAccountBlocked({ viewerUid, creatorUid: derivativeOwnerUid, viewerSettings, creatorSettings: derivativeSettings })) {
      throw new HttpsError('permission-denied', 'This creator is not available to your account.');
    }

    const sources = await Promise.all(entries.slice(0, MAX_PUBLIC_SOURCES).map(async (entry: any, index: number) => {
      const sourceAssetId = typeof entry?.sourceAssetId === 'string' ? entry.sourceAssetId : '';
      const sourceOwnerUid = typeof entry?.creatorUid === 'string' ? entry.creatorUid : '';
      if (!SAFE_ID.test(sourceAssetId) || !SAFE_ID.test(sourceOwnerUid)) return { index, available: false };
      const [sourceOrigin, sourcePosts, sourceSettings] = await Promise.all([
        db.collection('mediaOrigins').doc(sourceAssetId).get(),
        db.collection('posts').where('mediaAssetId', '==', sourceAssetId).limit(2).get(),
        readSettings(sourceOwnerUid),
      ]);
      if (!sourceOrigin.exists || sourceOrigin.get('ownerUid') !== sourceOwnerUid || sourcePosts.size !== 1) {
        return { index, available: false };
      }
      const sourcePost = sourcePosts.docs[0].data();
      if (!canExposeOriginSource({ viewerUid, derivativeOwnerUid, sourceOwnerUid, viewerSettings, derivativeSettings, sourceSettings, sourcePost })) {
        return { index, available: false };
      }
      return {
        index,
        available: true,
        postId: sourcePosts.docs[0].id,
        username: typeof sourcePost.username === 'string' ? sourcePost.username.slice(0, 64) : 'creator',
        displayName: typeof sourcePost.name === 'string' ? sourcePost.name.slice(0, 80) : 'NEXORA creator',
        avatar: typeof sourcePost.avatar === 'string' ? sourcePost.avatar.slice(0, 2048) : '',
      };
    }));
    return { postId, hasLineage: true, sources };
  } catch (error) {
    if (error instanceof HttpsError) throw error;
    console.error('[NEXORA Origin] Public attribution projection failed.', error);
    throw new HttpsError('unavailable', 'Origin attribution is temporarily unavailable.');
  }
});
