import { createHash } from 'node:crypto';
import { FieldValue, type Firestore } from 'firebase-admin/firestore';

export type SocialFollowErrorCode = 'unauthenticated' | 'invalid-argument' | 'not-found' | 'failed-precondition';

export class SocialFollowError extends Error {
  constructor(public readonly code: SocialFollowErrorCode, message: string) {
    super(message);
    this.name = 'SocialFollowError';
  }
}

const validUid = (value: unknown): value is string =>
  typeof value === 'string' && value.length > 0 && value.length <= 128 && !value.includes('/');
const hash = (value: string) => createHash('sha256').update(value).digest('hex').slice(0, 40);
const dayKey = (date: Date) => date.toISOString().slice(0, 10);

const publicProfileSeed = (uid: string, source: Record<string, unknown>) => {
  const allowed = [
    'username', 'name', 'avatar', 'bio', 'website', 'followers', 'following', 'sparks',
    'hasStory', 'coverImage', 'profileFrameId', 'profileBadgeId', 'joinedDate',
    'reputationPoints', 'reputationBreakdown', 'skills', 'statusText', 'statusEmoji',
    'pronouns', 'profileCategory', 'creatorType', 'socialTwitter', 'socialInstagram',
    'pinnedMusicSong', 'pinnedMusicArtist', 'pinnedMusicUrl', 'pinnedPosts',
  ];
  const projection: Record<string, unknown> = { id: uid };
  for (const key of allowed) {
    if (source[key] !== undefined) projection[key] = source[key];
  }
  return projection;
};

const safeCount = (value: unknown) => {
  const count = Number(value || 0);
  return Number.isSafeInteger(count) && count >= 0 ? count : 0;
};

/** Canonical, idempotent follow mutation shared by the authenticated API. */
export async function setCreatorFollowStateForUser(
  store: Firestore,
  followerId: string,
  creatorId: string,
  shouldFollow: boolean,
  now = new Date(),
) {
  if (!validUid(followerId)) throw new SocialFollowError('unauthenticated', 'Sign in to follow creators.');
  if (!validUid(creatorId) || creatorId === followerId || typeof shouldFollow !== 'boolean') {
    throw new SocialFollowError('invalid-argument', 'A valid creator and follow state are required.');
  }

  const followRef = store.collection('follows').doc(followerId + '_' + creatorId);
  const creatorPublicRef = store.collection('publicProfiles').doc(creatorId);
  const creatorPageRef = store.collection('pages').doc(creatorId);
  const followerPublicRef = store.collection('publicProfiles').doc(followerId);
  const creatorPrivateRef = store.collection('users').doc(creatorId);
  const followerPrivateRef = store.collection('users').doc(followerId);
  const day = dayKey(now);
  const dailyRef = store.collection('creatorAudienceDaily').doc(hash(creatorId + ':' + day));

  return store.runTransaction(async tx => {
    const [follow, creatorPublic, creatorPage, followerPublic, creatorPrivate, followerPrivate] = await Promise.all([
      tx.get(followRef), tx.get(creatorPublicRef), tx.get(creatorPageRef),
      tx.get(followerPublicRef), tx.get(creatorPrivateRef), tx.get(followerPrivateRef),
    ]);
    if (!creatorPublic.exists && !creatorPage.exists && !creatorPrivate.exists) {
      throw new SocialFollowError('not-found', 'This creator or Page is unavailable.');
    }
    if (!followerPublic.exists && !followerPrivate.exists) {
      throw new SocialFollowError('failed-precondition', 'Your account profile is still being prepared. Please retry.');
    }

    if (follow.exists === shouldFollow) {
      if (!creatorPublic.exists && creatorPrivate.exists) {
        tx.set(creatorPublicRef, publicProfileSeed(creatorId, creatorPrivate.data() || {}), { merge: true });
      }
      if (!followerPublic.exists && followerPrivate.exists) {
        tx.set(followerPublicRef, publicProfileSeed(followerId, followerPrivate.data() || {}), { merge: true });
      }
      return {
        following: follow.exists,
        changed: false,
        followerCount: creatorPublic.exists
          ? safeCount(creatorPublic.get('followers'))
          : creatorPrivate.exists ? safeCount(creatorPrivate.get('followers'))
          : creatorPage.exists ? safeCount(creatorPage.get('followersCount')) : null,
      };
    }

    const delta = shouldFollow ? 1 : -1;
    const nextCreatorCount = creatorPublic.exists
      ? Math.max(0, safeCount(creatorPublic.get('followers')) + delta)
      : creatorPrivate.exists ? Math.max(0, safeCount(creatorPrivate.get('followers')) + delta) : null;
    const nextPageCount = creatorPage.exists ? Math.max(0, safeCount(creatorPage.get('followersCount')) + delta) : null;
    const followerFollowingCount = followerPublic.exists
      ? safeCount(followerPublic.get('following'))
      : safeCount(followerPrivate.get('following'));
    const nextFollowerCount = Math.max(0, followerFollowingCount + delta);

    if (shouldFollow) {
      tx.create(followRef, { followerId, followingId: creatorId, createdAt: FieldValue.serverTimestamp() });
    } else {
      tx.delete(followRef);
    }
    if (creatorPublic.exists && nextCreatorCount !== null) {
      tx.update(creatorPublicRef, { followers: nextCreatorCount });
    } else if (creatorPrivate.exists && nextCreatorCount !== null) {
      tx.set(creatorPublicRef, { ...publicProfileSeed(creatorId, creatorPrivate.data() || {}), followers: nextCreatorCount }, { merge: true });
    }
    if (creatorPrivate.exists && nextCreatorCount !== null) {
      tx.update(creatorPrivateRef, { followers: nextCreatorCount, updatedAt: FieldValue.serverTimestamp() });
    }
    if (creatorPage.exists && nextPageCount !== null) tx.update(creatorPageRef, { followersCount: nextPageCount });
    if (followerPublic.exists) {
      tx.update(followerPublicRef, { following: nextFollowerCount });
    } else if (followerPrivate.exists) {
      tx.set(followerPublicRef, { ...publicProfileSeed(followerId, followerPrivate.data() || {}), following: nextFollowerCount }, { merge: true });
    }
    if (followerPrivate.exists) tx.update(followerPrivateRef, { following: nextFollowerCount, updatedAt: FieldValue.serverTimestamp() });
    if ((creatorPublic.exists || creatorPrivate.exists) && nextCreatorCount !== null) {
      tx.set(dailyRef, {
        creatorId, day,
        follows: FieldValue.increment(shouldFollow ? 1 : 0),
        unfollows: FieldValue.increment(shouldFollow ? 0 : 1),
        netFollowerChange: FieldValue.increment(delta),
        followerCount: nextCreatorCount,
        updatedAt: FieldValue.serverTimestamp(),
      }, { merge: true });
    }
    return { following: shouldFollow, changed: true, followerCount: nextCreatorCount ?? nextPageCount };
  });
}
