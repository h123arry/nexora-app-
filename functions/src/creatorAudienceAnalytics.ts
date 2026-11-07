import { createHash } from 'node:crypto';
import { FieldValue, type Firestore, getFirestore } from 'firebase-admin/firestore';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { getFirebaseAdminApp, resolveFirestoreDatabaseId } from './runtimeConfig.js';

const db = getFirestore(getFirebaseAdminApp(), resolveFirestoreDatabaseId());
const validUid = (value: unknown): value is string =>
  typeof value === 'string' && value.length > 0 && value.length <= 128 && !value.includes('/');
const hash = (value: string) => createHash('sha256').update(value).digest('hex').slice(0, 40);
const dayKey = (date: Date) => date.toISOString().slice(0, 10);
const safeCount = (value: unknown) => {
  const count = Number(value || 0);
  return Number.isSafeInteger(count) && count >= 0 ? count : 0;
};

/**
 * A single trusted transaction owns follow edges, profile counters and daily
 * creator growth metrics. Idempotency comes from comparing the requested
 * state with the canonical relationship document inside the transaction.
 */
export async function setCreatorFollowStateForUser(
  store: Firestore,
  followerId: string,
  creatorId: string,
  shouldFollow: boolean,
  now = new Date(),
) {
  if (!validUid(followerId)) throw new HttpsError('unauthenticated', 'Sign in to follow creators.');
  if (!validUid(creatorId) || creatorId === followerId || typeof shouldFollow !== 'boolean') {
    throw new HttpsError('invalid-argument', 'A valid creator and follow state are required.');
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
    if (!creatorPublic.exists && !creatorPage.exists) {
      throw new HttpsError('not-found', 'This creator or Page is unavailable.');
    }
    if (!followerPublic.exists) throw new HttpsError('failed-precondition', 'Complete your public profile before following.');
    if (follow.exists === shouldFollow) {
      return {
        following: follow.exists,
        changed: false,
        followerCount: creatorPublic.exists ? safeCount(creatorPublic.get('followers')) : creatorPage.exists ? safeCount(creatorPage.get('followersCount')) : null,
      };
    }

    const delta = shouldFollow ? 1 : -1;
    const nextCreatorCount = creatorPublic.exists ? Math.max(0, safeCount(creatorPublic.get('followers')) + delta) : null;
    const nextPageCount = creatorPage.exists ? Math.max(0, safeCount(creatorPage.get('followersCount')) + delta) : null;
    const nextFollowerCount = Math.max(0, safeCount(followerPublic.get('following')) + delta);
    if (shouldFollow) {
      tx.create(followRef, {
        followerId, followingId: creatorId, createdAt: FieldValue.serverTimestamp(),
      });
    } else {
      tx.delete(followRef);
    }
    if (creatorPublic.exists && nextCreatorCount !== null) {
      tx.update(creatorPublicRef, { followers: nextCreatorCount });
      if (creatorPrivate.exists) tx.update(creatorPrivateRef, { followers: nextCreatorCount, updatedAt: FieldValue.serverTimestamp() });
    }
    if (creatorPage.exists && nextPageCount !== null) tx.update(creatorPageRef, { followersCount: nextPageCount });
    tx.update(followerPublicRef, { following: nextFollowerCount });
    if (followerPrivate.exists) tx.update(followerPrivateRef, { following: nextFollowerCount, updatedAt: FieldValue.serverTimestamp() });
    if (creatorPublic.exists && nextCreatorCount !== null) {
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

export const setCreatorFollowState = onCall({ maxInstances: 20 }, async request => {
  const followerId = request.auth?.uid;
  if (!followerId) throw new HttpsError('unauthenticated', 'Sign in to follow creators.');
  return setCreatorFollowStateForUser(db, followerId, request.data?.creatorId, request.data?.following);
});

/**
 * Counts one authenticated visitor per creator per UTC day. This is a
 * rate-limited profile-visit signal, not proof of a human reading the page.
 */
export async function recordCreatorProfileVisitForUser(
  store: Firestore,
  viewerId: string,
  creatorId: string,
  now = new Date(),
) {
  if (!validUid(viewerId)) throw new HttpsError('unauthenticated', 'Sign in to record a profile visit.');
  if (!validUid(creatorId) || creatorId === viewerId) {
    throw new HttpsError('invalid-argument', 'A valid public creator profile is required.');
  }
  const profileRef = store.collection('publicProfiles').doc(creatorId);
  const day = dayKey(now);
  const visitorRef = store.collection('creatorProfileDailyVisitors').doc(hash(creatorId + ':' + day + ':' + viewerId));
  const historyRef = store.collection('creatorProfileVisitorHistory').doc(hash(creatorId + ':' + viewerId));
  const dailyRef = store.collection('creatorAudienceDaily').doc(hash(creatorId + ':' + day));
  return store.runTransaction(async tx => {
    const [profile, visitor, history] = await Promise.all([tx.get(profileRef), tx.get(visitorRef), tx.get(historyRef)]);
    if (!profile.exists) throw new HttpsError('not-found', 'This public profile is unavailable.');
    if (visitor.exists) return { recorded: false, reason: 'already-counted-today' };
    tx.create(visitorRef, {
      creatorId, day, visitorHash: hash(viewerId), createdAt: FieldValue.serverTimestamp(),
      expireAt: new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000),
    });
    tx.set(historyRef, {
      creatorId, visitorHash: hash(viewerId),
      firstSeenAt: history.exists ? history.get('firstSeenAt') : FieldValue.serverTimestamp(),
      lastSeenAt: FieldValue.serverTimestamp(), lastSeenDay: day,
      expireAt: new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000),
    }, { merge: true });
    tx.set(dailyRef, {
      creatorId, day,
      uniqueProfileVisitors: FieldValue.increment(1),
      newProfileVisitors: FieldValue.increment(history.exists ? 0 : 1),
      returningProfileVisitors: FieldValue.increment(history.exists ? 1 : 0),
      updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true });
    return { recorded: true, day };
  });
}

export const recordCreatorProfileVisit = onCall({ maxInstances: 10 }, async request => {
  const viewerId = request.auth?.uid;
  if (!viewerId) throw new HttpsError('unauthenticated', 'Sign in to record a profile visit.');
  return recordCreatorProfileVisitForUser(db, viewerId, request.data?.creatorId);
});

export const getCreatorAudienceAnalytics = onCall({ maxInstances: 10 }, async request => {
  const creatorId = request.auth?.uid;
  if (!creatorId) throw new HttpsError('unauthenticated', 'Sign in to view audience analytics.');
  const requestedDays = typeof request.data?.days === 'number' ? Math.floor(request.data.days) : 7;
  const days = Math.max(1, Math.min(30, requestedDays));
  const start = new Date();
  start.setUTCHours(0, 0, 0, 0);
  start.setUTCDate(start.getUTCDate() - (days - 1));
  const snapshot = await db.collection('creatorAudienceDaily')
    .where('creatorId', '==', creatorId)
    .where('day', '>=', dayKey(start))
    .orderBy('day', 'asc')
    .limit(30)
    .get();
  const points = snapshot.docs.map(item => {
    const data = item.data();
    return {
      day: data.day,
      follows: safeCount(data.follows),
      unfollows: safeCount(data.unfollows),
      netFollowerChange: Number.isSafeInteger(data.netFollowerChange) ? data.netFollowerChange : 0,
      followerCount: Number.isSafeInteger(data.followerCount) ? data.followerCount : null,
      uniqueProfileVisitors: safeCount(data.uniqueProfileVisitors),
      newProfileVisitors: safeCount(data.newProfileVisitors),
      returningProfileVisitors: safeCount(data.returningProfileVisitors),
    };
  });
  return {
    days,
    source: 'server_transactional_follow_edges_and_authenticated_daily_profile_visitors',
    points,
    totals: points.reduce((total, point) => ({
      follows: total.follows + point.follows,
      unfollows: total.unfollows + point.unfollows,
      netFollowerChange: total.netFollowerChange + point.netFollowerChange,
      uniqueProfileVisitors: total.uniqueProfileVisitors + point.uniqueProfileVisitors,
      newProfileVisitors: total.newProfileVisitors + point.newProfileVisitors,
      returningProfileVisitors: total.returningProfileVisitors + point.returningProfileVisitors,
    }), { follows: 0, unfollows: 0, netFollowerChange: 0, uniqueProfileVisitors: 0, newProfileVisitors: 0, returningProfileVisitors: 0 }),
  };
});
