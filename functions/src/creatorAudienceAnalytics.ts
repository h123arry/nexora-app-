import { createHash } from 'node:crypto';
import {
  FieldValue, type Firestore, getFirestore,
} from 'firebase-admin/firestore';
import { onDocumentCreated, onDocumentDeleted } from 'firebase-functions/v2/firestore';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { getFirebaseAdminApp, resolveFirestoreDatabaseId } from './runtimeConfig.js';

const db = getFirestore(getFirebaseAdminApp(), resolveFirestoreDatabaseId());
const validUid = (value: unknown): value is string =>
  typeof value === 'string' && value.length > 0 && value.length <= 128 && !value.includes('/');
const hash = (value: string) => createHash('sha256').update(value).digest('hex').slice(0, 40);
const dayKey = (date: Date) => date.toISOString().slice(0, 10);

type FollowAction = 'created' | 'deleted';

/**
 * Reconciles a follow edge against its server-owned projection. Reading the
 * current edge makes rapid follow/unfollow toggles safe when trigger delivery
 * is delayed or reordered. Event receipts make retries idempotent.
 */
export async function applyCreatorFollowEvent(
  store: Firestore,
  eventId: string,
  followId: string,
  edge: { followerId?: unknown; followingId?: unknown },
  action: FollowAction,
  occurredAt = new Date(),
) {
  const followerId = edge.followerId;
  const creatorId = edge.followingId;
  if (!validUid(followerId) || !validUid(creatorId) || followerId === creatorId) return { changed: false, reason: 'invalid-edge' };
  const receiptRef = store.collection('creatorAudienceEventReceipts').doc(hash(eventId));
  const edgeRef = store.collection('follows').doc(followId);
  const projectionRef = store.collection('creatorFollowProjections').doc(hash(followerId + ':' + creatorId));
  const creatorPublicRef = store.collection('publicProfiles').doc(creatorId);
  const followerPublicRef = store.collection('publicProfiles').doc(followerId);
  const creatorPrivateRef = store.collection('users').doc(creatorId);
  const followerPrivateRef = store.collection('users').doc(followerId);
  const day = dayKey(occurredAt);
  const dailyRef = store.collection('creatorAudienceDaily').doc(hash(creatorId + ':' + day));

  return store.runTransaction(async tx => {
    const [receipt, liveEdge, projection, creatorPublic, followerPublic, creatorPrivate, followerPrivate] = await Promise.all([
      tx.get(receiptRef), tx.get(edgeRef), tx.get(projectionRef), tx.get(creatorPublicRef),
      tx.get(followerPublicRef), tx.get(creatorPrivateRef), tx.get(followerPrivateRef),
    ]);
    if (receipt.exists) return { changed: false, reason: 'duplicate-event' };
    if (!creatorPublic.exists) {
      tx.create(receiptRef, { eventId, followId, followerId, creatorId, action, ignored: 'missing-public-profile', processedAt: FieldValue.serverTimestamp() });
      return { changed: false, reason: 'missing-public-profile' };
    }
    const activeNow = liveEdge.exists;
    // A delete snapshot proves the edge was active before this event when no
    // projection exists yet (legacy follows predate the analytics ledger).
    const activeBefore = projection.exists ? projection.get('active') === true : action === 'deleted';
    const delta = activeNow === activeBefore ? 0 : activeNow ? 1 : -1;
    tx.create(receiptRef, { eventId, followId, followerId, creatorId, action, processedAt: FieldValue.serverTimestamp() });
    if (delta === 0) return { changed: false, reason: 'already-reconciled' };

    const creatorRawCount = Number(creatorPublic.get('followers') || 0);
    const followerRawCount = Number(followerPublic.get('following') || 0);
    const creatorCount = Number.isSafeInteger(creatorRawCount) && creatorRawCount >= 0 ? creatorRawCount : 0;
    const followerCount = Number.isSafeInteger(followerRawCount) && followerRawCount >= 0 ? followerRawCount : 0;
    const nextCreatorCount = Math.max(0, creatorCount + delta);
    const nextFollowerCount = Math.max(0, followerCount + delta);
    tx.set(projectionRef, {
      followerId, creatorId, active: activeNow, updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true });

    if (creatorPublic.exists) tx.set(creatorPublicRef, { followers: nextCreatorCount }, { merge: true });
    if (creatorPrivate.exists) tx.set(creatorPrivateRef, { followers: nextCreatorCount, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
    if (followerPublic.exists) tx.set(followerPublicRef, { following: nextFollowerCount }, { merge: true });
    if (followerPrivate.exists) tx.set(followerPrivateRef, { following: nextFollowerCount, updatedAt: FieldValue.serverTimestamp() }, { merge: true });

    tx.set(dailyRef, {
      creatorId, day,
      follows: FieldValue.increment(delta > 0 ? 1 : 0),
      unfollows: FieldValue.increment(delta < 0 ? 1 : 0),
      netFollowerChange: FieldValue.increment(delta),
      followerCount: nextCreatorCount,
      updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true });
    return { changed: true, active: activeNow, delta, followerCount: nextCreatorCount };
  });
}

export const creatorFollowCreated = onDocumentCreated('follows/{followId}', async event => {
  const snapshot = event.data;
  if (!snapshot) return;
  await applyCreatorFollowEvent(db, event.id, event.params.followId, snapshot.data(), 'created', new Date(event.time));
});

export const creatorFollowDeleted = onDocumentDeleted('follows/{followId}', async event => {
  const snapshot = event.data;
  if (!snapshot) return;
  await applyCreatorFollowEvent(db, event.id, event.params.followId, snapshot.data(), 'deleted', new Date(event.time));
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
  const dailyRef = store.collection('creatorAudienceDaily').doc(hash(creatorId + ':' + day));
  return store.runTransaction(async tx => {
    const [profile, visitor] = await Promise.all([tx.get(profileRef), tx.get(visitorRef)]);
    if (!profile.exists) throw new HttpsError('not-found', 'This public profile is unavailable.');
    if (visitor.exists) return { recorded: false, reason: 'already-counted-today' };
    tx.create(visitorRef, {
      creatorId, day, visitorHash: hash(viewerId), createdAt: FieldValue.serverTimestamp(),
    });
    tx.set(dailyRef, {
      creatorId, day,
      profileVisits: FieldValue.increment(1),
      uniqueProfileVisitors: FieldValue.increment(1),
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
      follows: Number(data.follows || 0),
      unfollows: Number(data.unfollows || 0),
      netFollowerChange: Number(data.netFollowerChange || 0),
      followerCount: Number.isFinite(data.followerCount) ? data.followerCount : null,
      profileVisits: Number(data.profileVisits || 0),
      uniqueProfileVisitors: Number(data.uniqueProfileVisitors || 0),
    };
  });
  return {
    days,
    source: 'server_reconciled_follow_edges_and_authenticated_daily_profile_visitors',
    points,
    totals: points.reduce((total, point) => ({
      follows: total.follows + point.follows,
      unfollows: total.unfollows + point.unfollows,
      netFollowerChange: total.netFollowerChange + point.netFollowerChange,
      profileVisits: total.profileVisits + point.profileVisits,
      uniqueProfileVisitors: total.uniqueProfileVisitors + point.uniqueProfileVisitors,
    }), { follows: 0, unfollows: 0, netFollowerChange: 0, profileVisits: 0, uniqueProfileVisitors: 0 }),
  };
});
