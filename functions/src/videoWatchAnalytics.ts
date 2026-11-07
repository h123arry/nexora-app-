import { createHash } from 'node:crypto';
import { FieldValue, Timestamp, getFirestore } from 'firebase-admin/firestore';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { getFirebaseAdminApp, resolveFirestoreDatabaseId } from './runtimeConfig.js';

const db = getFirestore(getFirebaseAdminApp(), resolveFirestoreDatabaseId());
const MAX_HEARTBEAT_GAP_MS = 30_000;
const MAX_CREDIT_SECONDS = 15;
const MIN_CREDIT_SECONDS = 2;

function validId(value: unknown, max = 150): value is string {
  return typeof value === 'string' && value.length > 0 && value.length <= max && !value.includes('/');
}
function safePosition(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? Math.max(0, Math.min(value, 86_400)) : -1;
}
function digest(value: string): string {
  return createHash('sha256').update(value).digest('hex').slice(0, 40);
}
function utcDay(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/**
 * Server-timed viewing observations. The server controls elapsed time, credit
 * caps, session ownership and aggregate writes. Position remains a client
 * playback signal, so this is abuse-bounded telemetry, not cryptographic proof
 * that a human watched every frame.
 */
export const recordVideoWatchHeartbeat = onCall({ maxInstances: 20 }, async request => {
  if (!request.auth?.uid) throw new HttpsError('unauthenticated', 'Sign in to record video playback.');
  const uid = request.auth.uid;
  const postId = request.data?.postId;
  const sessionId = request.data?.sessionId;
  const position = safePosition(request.data?.positionSeconds);
  if (!validId(postId) || !validId(sessionId, 100) || position < 0) {
    throw new HttpsError('invalid-argument', 'A valid post, session and playback position are required.');
  }

  const postRef = db.collection('posts').doc(postId);
  const sessionRef = db.collection('videoWatchSessions').doc(digest(uid + ':' + sessionId));
  const now = Timestamp.now();
  const day = utcDay(now.toDate());
  const result = await db.runTransaction(async tx => {
    const [postSnap, sessionSnap] = await Promise.all([tx.get(postRef), tx.get(sessionRef)]);
    if (!postSnap.exists) throw new HttpsError('not-found', 'This video is unavailable.');
    const post = postSnap.data()!;
    const creatorId = typeof post.userId === 'string' ? post.userId : '';
    if (!creatorId || !(post.videoUrl || post.mediaType === 'video')) {
      throw new HttpsError('failed-precondition', 'This post is not a playable video.');
    }
    const previous = sessionSnap.data();
    if (previous && (previous.viewerId !== uid || previous.postId !== postId || previous.creatorId !== creatorId)) {
      throw new HttpsError('permission-denied', 'This viewing session is not valid.');
    }

    let creditedSeconds = 0;
    let started = false;
    const viewerRef = db.collection('creatorVideoDailyViewers').doc(digest(creatorId + ':' + day + ':' + uid));
    const viewerSnap = !previous ? await tx.get(viewerRef) : null;
    if (!previous) {
      started = true;
      tx.create(sessionRef, {
        viewerId: uid, postId, creatorId, day,
        lastPositionSeconds: position,
        lastHeartbeatAt: now,
        creditedSeconds: 0,
        heartbeatCount: 1,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
    } else {
      const elapsed = Math.max(0, (now.toMillis() - (previous.lastHeartbeatAt as Timestamp).toMillis()) / 1000);
      const delta = position - Number(previous.lastPositionSeconds || 0);
      if (elapsed >= MIN_CREDIT_SECONDS && elapsed <= MAX_HEARTBEAT_GAP_MS / 1000
        && delta > 0.25 && delta <= elapsed * 1.75 + 2) {
        creditedSeconds = Math.min(elapsed, MAX_CREDIT_SECONDS);
      }
      tx.update(sessionRef, {
        lastPositionSeconds: position,
        lastHeartbeatAt: now,
        creditedSeconds: FieldValue.increment(creditedSeconds),
        heartbeatCount: FieldValue.increment(1),
        updatedAt: FieldValue.serverTimestamp(),
      });
    }

    if (started || creditedSeconds > 0) {
      const aggregateRef = db.collection('creatorVideoDaily').doc(digest(creatorId + ':' + day));
      tx.set(aggregateRef, {
        creatorId, day,
        sessionsStarted: FieldValue.increment(started ? 1 : 0),
        uniqueViewers: FieldValue.increment(started && !viewerSnap?.exists ? 1 : 0),
        acceptedWatchSeconds: FieldValue.increment(creditedSeconds),
        heartbeatCredits: FieldValue.increment(creditedSeconds > 0 ? 1 : 0),
        updatedAt: FieldValue.serverTimestamp(),
      }, { merge: true });
      if (started && !viewerSnap?.exists) tx.create(viewerRef, { creatorId, day, viewerHash: digest(uid), createdAt: FieldValue.serverTimestamp() });
    }
    return { accepted: true, started, creditedSeconds, serverTime: now.toDate().toISOString() };
  });
  return result;
});

export const getCreatorVideoRetention = onCall({ maxInstances: 10 }, async request => {
  if (!request.auth?.uid) throw new HttpsError('unauthenticated', 'Sign in to view creator analytics.');
  const creatorId = request.auth.uid;
  const requestedDays = typeof request.data?.days === 'number' ? Math.floor(request.data.days) : 7;
  const days = Math.max(1, Math.min(30, requestedDays));
  const start = new Date();
  start.setUTCHours(0, 0, 0, 0);
  start.setUTCDate(start.getUTCDate() - (days - 1));
  const snapshot = await db.collection('creatorVideoDaily')
    .where('creatorId', '==', creatorId)
    .where('day', '>=', utcDay(start))
    .orderBy('day', 'asc')
    .limit(30)
    .get();
  const points = snapshot.docs.map(doc => {
    const data = doc.data();
    const seconds = typeof data.acceptedWatchSeconds === 'number' ? data.acceptedWatchSeconds : 0;
    return {
      day: data.day,
      sessionsStarted: data.sessionsStarted || 0,
      uniqueViewers: data.uniqueViewers || 0,
      acceptedWatchSeconds: seconds,
      averageAcceptedWatchSeconds: data.sessionsStarted ? Number((seconds / data.sessionsStarted).toFixed(1)) : null,
    };
  });
  return {
    days,
    source: 'server_timed_bounded_playback_observations',
    verifiedByServer: true,
    humanPlaybackProof: false,
    points,
  };
});
