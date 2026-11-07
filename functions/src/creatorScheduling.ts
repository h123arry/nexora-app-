import { randomUUID } from 'node:crypto';
import type { Firestore, DocumentData } from 'firebase-admin/firestore';
import { getFirestore } from 'firebase-admin/firestore';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { getFirebaseAdminApp, resolveFirestoreDatabaseId } from './runtimeConfig.js';

const db = getFirestore(getFirebaseAdminApp(), resolveFirestoreDatabaseId());
const MAX_SCHEDULED_POSTS = 30;
const MAX_BATCH = 25;
const MIN_LEAD_MS = 5 * 60 * 1000;
const MAX_LEAD_MS = 90 * 24 * 60 * 60 * 1000;

type ScheduleInput = {
  content?: unknown;
  imageUrl?: unknown;
  videoUrl?: unknown;
  tags?: unknown;
  scheduledAt?: unknown;
};

function requireUid(request: { auth?: { uid: string } | null }): string {
  if (!request.auth?.uid) throw new HttpsError('unauthenticated', 'Sign in to schedule a post.');
  return request.auth.uid;
}

function validMediaUrl(value: unknown): value is string {
  if (typeof value !== 'string' || value.length > 1200) return false;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && Boolean(url.hostname);
  } catch {
    return false;
  }
}

function validateSchedule(input: ScheduleInput, now = Date.now()) {
  const content = typeof input?.content === 'string' ? input.content.trim() : '';
  const imageUrl = input?.imageUrl === undefined ? '' : input.imageUrl;
  const videoUrl = input?.videoUrl === undefined ? '' : input.videoUrl;
  const tags = Array.isArray(input?.tags)
    ? [...new Set(input.tags.filter((tag): tag is string => typeof tag === 'string')
      .map(tag => tag.trim().replace(/^#/, '').slice(0, 40)).filter(Boolean))].slice(0, 30)
    : [];
  const scheduledAt = typeof input?.scheduledAt === 'string' ? Date.parse(input.scheduledAt) : NaN;
  if (content.length > 10000 || (!content && !imageUrl && !videoUrl)) {
    throw new HttpsError('invalid-argument', 'Add post text or media before scheduling.');
  }
  if (imageUrl && !validMediaUrl(imageUrl)) throw new HttpsError('invalid-argument', 'Image media must use a valid HTTPS URL.');
  if (videoUrl && !validMediaUrl(videoUrl)) throw new HttpsError('invalid-argument', 'Video media must use a valid HTTPS URL.');
  if (imageUrl && videoUrl) throw new HttpsError('invalid-argument', 'Schedule one media format per post.');
  if (!Number.isFinite(scheduledAt) || scheduledAt < now + MIN_LEAD_MS || scheduledAt > now + MAX_LEAD_MS) {
    throw new HttpsError('invalid-argument', 'Choose a publishing time at least five minutes and no more than 90 days away.');
  }
  return { content, imageUrl: imageUrl as string, videoUrl: videoUrl as string, tags, scheduledAt: new Date(scheduledAt) };
}

function accountCannotPublish(status: DocumentData | undefined, now: Date): boolean {
  if (!status) return false;
  const active = (field: string) => status[field] === true
    && !(status.expiresAt?.toDate instanceof Function && status.expiresAt.toDate() < now);
  return active('postingRestricted') || active('suspended');
}

export async function createCreatorSchedule(
  store: Firestore,
  uid: string,
  input: ScheduleInput,
  now = Date.now(),
): Promise<{ scheduleId: string; status: 'scheduled'; scheduledAt: string }> {
  if (!uid) throw new HttpsError('unauthenticated', 'Sign in to schedule a post.');
  const payload = validateSchedule(input, now);
  const profileRef = store.collection('publicProfiles').doc(uid);
  const accountStatusRef = store.collection('accountStatus').doc(uid);
  const counterRef = store.collection('creatorScheduleCounters').doc(uid);
  const ref = store.collection('creatorScheduledPosts').doc(randomUUID());
  await store.runTransaction(async transaction => {
    const [profile, accountStatus, counter] = await Promise.all([
      transaction.get(profileRef), transaction.get(accountStatusRef), transaction.get(counterRef),
    ]);
    if (!profile.exists) throw new HttpsError('failed-precondition', 'Complete your public profile before scheduling posts.');
    if (accountCannotPublish(accountStatus.data(), new Date(now))) {
      throw new HttpsError('permission-denied', 'Your account cannot publish posts right now.');
    }
    const pendingCount = counter.exists ? Number(counter.get('pendingCount') || 0) : 0;
    if (!Number.isSafeInteger(pendingCount) || pendingCount < 0 || pendingCount >= MAX_SCHEDULED_POSTS) {
      throw new HttpsError('resource-exhausted', 'You can have up to 30 scheduled posts at a time.');
    }
    transaction.set(counterRef, { ownerId: uid, pendingCount: pendingCount + 1, updatedAt: new Date(now) }, { merge: true });
    transaction.create(ref, {
      id: ref.id, ownerId: uid, ...payload, status: 'scheduled',
      createdAt: new Date(now), updatedAt: new Date(now), schemaVersion: 1,
    });
  });
  return { scheduleId: ref.id, status: 'scheduled', scheduledAt: payload.scheduledAt.toISOString() };
}

export async function cancelCreatorSchedule(store: Firestore, uid: string, scheduleId: unknown) {
  if (!uid) throw new HttpsError('unauthenticated', 'Sign in to manage scheduled posts.');
  if (typeof scheduleId !== 'string' || !/^[A-Za-z0-9_-]{1,120}$/.test(scheduleId)) {
    throw new HttpsError('invalid-argument', 'A valid scheduled post ID is required.');
  }
  const ref = store.collection('creatorScheduledPosts').doc(scheduleId);
  return store.runTransaction(async transaction => {
    const snapshot = await transaction.get(ref);
    if (!snapshot.exists) throw new HttpsError('not-found', 'This scheduled post is unavailable.');
    if (snapshot.get('ownerId') !== uid) throw new HttpsError('permission-denied', 'You cannot cancel another creator’s post.');
    if (snapshot.get('status') !== 'scheduled') throw new HttpsError('failed-precondition', 'Only pending scheduled posts can be cancelled.');
    const counterRef = store.collection('creatorScheduleCounters').doc(uid);
    const counter = await transaction.get(counterRef);
    const pendingCount = counter.exists ? Number(counter.get('pendingCount') || 0) : 0;
    transaction.update(ref, { status: 'cancelled', updatedAt: new Date() });
    transaction.set(counterRef, { ownerId: uid, pendingCount: Math.max(0, pendingCount - 1), updatedAt: new Date() }, { merge: true });
    return { cancelled: true };
  });
}

export async function publishDueCreatorSchedules(store: Firestore, now = new Date(), batchSize = MAX_BATCH) {
  const due = await store.collection('creatorScheduledPosts')
    .where('status', '==', 'scheduled').where('scheduledAt', '<=', now)
    .orderBy('scheduledAt', 'asc').limit(Math.max(1, Math.min(MAX_BATCH, batchSize))).get();
  let published = 0;
  let blocked = 0;
  for (const candidate of due.docs) {
    const scheduleRef = candidate.ref;
    const outcome = await store.runTransaction(async transaction => {
      const schedule = await transaction.get(scheduleRef);
      if (!schedule.exists || schedule.get('status') !== 'scheduled'
        || !(schedule.get('scheduledAt')?.toDate?.() instanceof Date)
        || schedule.get('scheduledAt').toDate() > now) return 'skipped';
      const uid = String(schedule.get('ownerId') || '');
      const profileRef = store.collection('publicProfiles').doc(uid);
      const statusRef = store.collection('accountStatus').doc(uid);
      const counterRef = store.collection('creatorScheduleCounters').doc(uid);
      const [profile, accountStatus, counter] = await Promise.all([
        transaction.get(profileRef), transaction.get(statusRef), transaction.get(counterRef),
      ]);
      const pendingCount = counter.exists ? Number(counter.get('pendingCount') || 0) : 0;
      if (!profile.exists || accountCannotPublish(accountStatus.data(), now)) {
        transaction.update(scheduleRef, {
          status: 'blocked', blockReason: profile.exists ? 'account_restricted' : 'profile_unavailable',
          updatedAt: now,
        });
        transaction.set(counterRef, { ownerId: uid, pendingCount: Math.max(0, pendingCount - 1), updatedAt: now }, { merge: true });
        return 'blocked';
      }
      const postId = 'scheduled-' + scheduleRef.id;
      const postRef = store.collection('posts').doc(postId);
      const post = {
        id: postId, userId: uid, authorId: uid,
        username: String(profile.get('username') || ''),
        name: String(profile.get('name') || 'NEXORA creator'),
        avatar: String(profile.get('avatar') || ''),
        isVerified: profile.get('isVerified') === true,
        content: String(schedule.get('content') || ''),
        ...(schedule.get('imageUrl') ? { image: schedule.get('imageUrl') } : {}),
        ...(schedule.get('videoUrl') ? { videoUrl: schedule.get('videoUrl') } : {}),
        audience: 'public', tags: Array.isArray(schedule.get('tags')) ? schedule.get('tags') : [],
        likes: 0, commentsCount: 0, shares: 0, views: 0, saves: 0,
        bookmarksCount: 0, likeCount: 0, isLikedByUser: false, isBookmarkedByUser: false,
        comments: [], isDraft: false, isArchived: false,
        timestamp: now.toISOString(), scheduledTime: schedule.get('scheduledAt').toDate().toISOString(),
      };
      transaction.create(postRef, post);
      transaction.update(scheduleRef, {
        status: 'published', publishedPostId: postId, publishedAt: now, updatedAt: now,
      });
      transaction.set(counterRef, { ownerId: uid, pendingCount: Math.max(0, pendingCount - 1), updatedAt: now }, { merge: true });
      return 'published';
    });
    if (outcome === 'published') published += 1;
    if (outcome === 'blocked') blocked += 1;
  }
  return { checked: due.size, published, blocked };
}

export const scheduleCreatorPost = onCall({ maxInstances: 10 }, async request => {
  const uid = requireUid(request);
  return createCreatorSchedule(db, uid, request.data as ScheduleInput);
});

export const cancelCreatorScheduledPost = onCall({ maxInstances: 10 }, async request => {
  const uid = requireUid(request);
  return cancelCreatorSchedule(db, uid, request.data?.scheduleId);
});

export const listCreatorScheduledPosts = onCall({ maxInstances: 10 }, async request => {
  const uid = requireUid(request);
  const snapshot = await db.collection('creatorScheduledPosts').where('ownerId', '==', uid)
    .orderBy('createdAt', 'desc').limit(MAX_SCHEDULED_POSTS).get();
  return { schedules: snapshot.docs.map(item => ({
    id: item.id, content: item.get('content'), imageUrl: item.get('imageUrl') || '',
    videoUrl: item.get('videoUrl') || '', tags: item.get('tags') || [],
    status: item.get('status'), scheduledAt: item.get('scheduledAt')?.toDate?.()?.toISOString() || null,
    publishedPostId: item.get('publishedPostId') || null,
  })) };
});

export const publishDueCreatorPosts = onSchedule({
  schedule: 'every 1 minutes', timeZone: 'UTC', maxInstances: 1,
}, async () => {
  await publishDueCreatorSchedules(db);
});
