import { createHash } from 'node:crypto';
import { FieldValue, Timestamp, getFirestore } from 'firebase-admin/firestore';
import { HttpsError } from 'firebase-functions/v2/https';
import { onCallWithSession as onCall } from './callableSession.js';
import { getFirebaseAdminApp, resolveFirestoreDatabaseId } from './runtimeConfig.js';
import {
  isEligiblePublicTextPostView,
  shouldCountTextPostView,
  validTextPostViewRequest,
} from './postViewAnalyticsPolicy.js';

const db = getFirestore(getFirebaseAdminApp(), resolveFirestoreDatabaseId());

function digest(value: string): string {
  return createHash('sha256').update(value).digest('hex').slice(0, 40);
}
function utcDay(date: Date): string {
  return date.toISOString().slice(0, 10);
}
function validId(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0 && value.length <= 150 && !value.includes('/');
}

/**
 * A text-post view is credited after the card remains at least 50% visible
 * for three continuous seconds. The server validates the public text post,
 * account relationship and a per-viewer/day marker. Client timing is a
 * bounded visibility signal, not proof against a modified client.
 */
export const recordPublicTextPostView = onCall({ maxInstances: 20 }, async request => {
  if (!request.auth?.uid) throw new HttpsError('unauthenticated', 'Sign in to record a post view.');
  const uid = request.auth.uid;
  const postId = request.data?.postId;
  const visibleSeconds = request.data?.visibleSeconds;
  if (!validTextPostViewRequest(postId, visibleSeconds)) {
    throw new HttpsError('invalid-argument', 'A valid post ID and at least three visible seconds are required.');
  }

  const postRef = db.collection('posts').doc(postId);
  const markerRef = db.collection('postTextViewers').doc(digest(postId + ':' + uid));
  const now = Timestamp.now();
  const day = utcDay(now.toDate());

  return db.runTransaction(async tx => {
    const [postSnap, markerSnap] = await Promise.all([tx.get(postRef), tx.get(markerRef)]);
    if (!postSnap.exists) throw new HttpsError('not-found', 'This post is unavailable.');
    const post = postSnap.data()!;
    const creatorId = typeof post.userId === 'string' ? post.userId
      : typeof post.authorId === 'string' ? post.authorId : '';
    const eligible = isEligiblePublicTextPostView({
      viewerId: uid,
      creatorId,
      audience: post.audience,
      videoUrl: post.videoUrl,
      image: post.image,
      images: post.images,
      mediaType: post.mediaType,
      isArchived: post.isArchived,
      isDraft: post.isDraft,
    });
    if (!eligible) {
      if (creatorId === uid) return { counted: false, reason: 'creator_view', views: Number(post.views) || 0 };
      throw new HttpsError('not-found', 'This public text post is unavailable.');
    }

    const [viewerSnap, creatorSnap] = await Promise.all([
      tx.get(db.collection('users').doc(uid)),
      tx.get(db.collection('users').doc(creatorId)),
    ]);
    const viewerBlocks = viewerSnap.get('messaging')?.blockedUserIds;
    const creatorBlocks = creatorSnap.get('messaging')?.blockedUserIds;
    if ((Array.isArray(viewerBlocks) && viewerBlocks.includes(creatorId))
      || (Array.isArray(creatorBlocks) && creatorBlocks.includes(uid))) {
      throw new HttpsError('permission-denied', 'This post is unavailable to this account.');
    }

    const alreadyCountedToday = markerSnap.exists && markerSnap.get('lastCountedDay') === day;
    if (!shouldCountTextPostView({ eligible, visibleSeconds, alreadyCountedToday })) {
      return { counted: false, reason: 'already_counted_today', views: Number(post.views) || 0 };
    }

    const rawViews = post.views;
    const currentViews = Number.isSafeInteger(rawViews) && (rawViews as number) >= 0 ? rawViews as number : 0;
    const dailyRef = postRef.collection('viewDaily').doc(day);
    const dailySnap = await tx.get(dailyRef);
    const marker = {
      postId,
      creatorId,
      viewerHash: digest(uid),
      lastCountedDay: day,
      lastCountedAt: FieldValue.serverTimestamp(),
    };
    if (markerSnap.exists) tx.update(markerRef, marker);
    else tx.create(markerRef, marker);
    tx.update(postRef, { views: currentViews + 1, viewsUpdatedAt: FieldValue.serverTimestamp() });
    if (dailySnap.exists) {
      tx.update(dailyRef, {
        views: FieldValue.increment(1),
        uniqueViewers: FieldValue.increment(1),
        updatedAt: FieldValue.serverTimestamp(),
      });
    } else {
      tx.create(dailyRef, {
        postId,
        creatorId,
        day,
        views: 1,
        uniqueViewers: 1,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
    }
    return { counted: true, views: currentViews + 1, day };
  });
});

/** Private creator-only daily view series for a post they own. */
export const getPostViewAnalytics = onCall({ maxInstances: 10 }, async request => {
  if (!request.auth?.uid) throw new HttpsError('unauthenticated', 'Sign in to view post analytics.');
  const uid = request.auth.uid;
  const postId = request.data?.postId;
  const requestedDays = typeof request.data?.days === 'number' ? Math.floor(request.data.days) : 7;
  const days = Math.max(7, Math.min(30, requestedDays));
  if (!validId(postId)) throw new HttpsError('invalid-argument', 'A valid post ID is required.');

  const postRef = db.collection('posts').doc(postId);
  const postSnap = await postRef.get();
  if (!postSnap.exists) throw new HttpsError('not-found', 'This post is unavailable.');
  if (postSnap.get('userId') !== uid && postSnap.get('authorId') !== uid) {
    throw new HttpsError('permission-denied', 'Only the post owner can view its analytics.');
  }

  const start = new Date();
  start.setUTCHours(0, 0, 0, 0);
  start.setUTCDate(start.getUTCDate() - (days - 1));
  const dailySnap = await postRef.collection('viewDaily').orderBy('day', 'asc').limit(30).get();
  const byDay = new Map(dailySnap.docs.map(doc => [String(doc.get('day')), {
    views: Number.isSafeInteger(doc.get('views')) ? doc.get('views') as number : 0,
    uniqueViewers: Number.isSafeInteger(doc.get('uniqueViewers')) ? doc.get('uniqueViewers') as number : 0,
  }]));
  const points = Array.from({ length: days }, (_, index) => {
    const date = new Date(start);
    date.setUTCDate(start.getUTCDate() + index);
    const day = utcDay(date);
    const counts = byDay.get(day) || { views: 0, uniqueViewers: 0 };
    return { day, views: counts.views, uniqueViewers: counts.uniqueViewers };
  });
  const totalViews = postSnap.get('views');
  return {
    postId,
    days,
    totalViews: Number.isSafeInteger(totalViews) && (totalViews as number) >= 0 ? totalViews as number : 0,
    points,
    source: 'server_recorded_daily_text_post_views',
  };
});
