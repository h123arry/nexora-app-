import { createHash } from 'node:crypto';
import { FieldValue, Timestamp, getFirestore } from 'firebase-admin/firestore';
import { HttpsError } from 'firebase-functions/v2/https';
import { onCallWithSession as onCall } from './callableSession.js';
import { getFirebaseAdminApp, resolveFirestoreDatabaseId } from './runtimeConfig.js';
import { acceptedWatchCredit, shouldCountPublicVideoView } from './videoWatchAnalyticsPolicy.js';

const db = getFirestore(getFirebaseAdminApp(), resolveFirestoreDatabaseId());

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
    if (post.isArchived === true || post.isDraft === true) {
      throw new HttpsError('not-found', 'This video is no longer available.');
    }
    const creatorId = typeof post.userId === 'string' ? post.userId : '';
    if (!creatorId || !(post.videoUrl || post.mediaType === 'video')) {
      throw new HttpsError('failed-precondition', 'This post is not a playable video.');
    }
    const [viewerUserSnapshot, creatorUserSnapshot] = await Promise.all([
      tx.get(db.collection('users').doc(uid)),
      tx.get(db.collection('users').doc(creatorId)),
    ]);
    const viewerBlocks = viewerUserSnapshot.get('messaging')?.blockedUserIds;
    const creatorBlocks = creatorUserSnapshot.get('messaging')?.blockedUserIds;
    if ((Array.isArray(viewerBlocks) && viewerBlocks.includes(creatorId))
      || (Array.isArray(creatorBlocks) && creatorBlocks.includes(uid))) {
      throw new HttpsError('permission-denied', 'This video is unavailable to this account.');
    }
    const previous = sessionSnap.data();
    if (previous && (previous.viewerId !== uid || previous.postId !== postId || previous.creatorId !== creatorId)) {
      throw new HttpsError('permission-denied', 'This viewing session is not valid.');
    }

    let creditedSeconds = 0;
    const started = !previous;
    let viewCounted = false;
    const postViewerRef = db.collection('postVideoViewers').doc(digest(postId + ':' + uid));
    const viewerRef = db.collection('creatorVideoDailyViewers').doc(digest(creatorId + ':' + day + ':' + uid));

    if (previous) {
      const elapsed = previous.lastHeartbeatAt instanceof Timestamp
        ? Math.max(0, (now.toMillis() - previous.lastHeartbeatAt.toMillis()) / 1000)
        : 0;
      creditedSeconds = acceptedWatchCredit({
        elapsedSeconds: elapsed,
        previousPositionSeconds: Number(previous.lastPositionSeconds || 0),
        nextPositionSeconds: position,
      });
    }

    const shouldEvaluatePublicView = shouldCountPublicVideoView({
      viewerId: uid,
      creatorId,
      audience: post.audience,
      creditedSeconds,
      alreadyCounted: false,
    });
    const [viewerSnap, postViewerSnapshot] = await Promise.all([
      !previous ? tx.get(viewerRef) : Promise.resolve(null),
      shouldEvaluatePublicView ? tx.get(postViewerRef) : Promise.resolve(null),
    ]);

    if (!previous) {
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
      if (shouldCountPublicVideoView({
        viewerId: uid,
        creatorId,
        audience: post.audience,
        creditedSeconds,
        alreadyCounted: postViewerSnapshot?.get('lastCountedDay') === day,
      })) {
        const currentViews = post.views;
        const safeViews = Number.isSafeInteger(currentViews) && (currentViews as number) >= 0 ? currentViews as number : 0;
        const viewMarker = {
          postId,
          creatorId,
          lastCountedDay: day,
          viewerHash: digest(uid),
          lastCountedAt: FieldValue.serverTimestamp(),
        };
        if (postViewerSnapshot?.exists) tx.update(postViewerRef, viewMarker);
        else tx.create(postViewerRef, viewMarker);
        tx.update(postRef, {
          views: safeViews + 1,
          viewsUpdatedAt: FieldValue.serverTimestamp(),
        });
        viewCounted = true;
      }
    }
    return { accepted: true, started, creditedSeconds, viewCounted, serverTime: now.toDate().toISOString() };
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
