import { onDocumentCreated } from 'firebase-functions/v2/firestore';
import { setGlobalOptions } from 'firebase-functions/v2';
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { processAccountDeletion } from './accountDeletionWorker.js';
import { getFirestore } from 'firebase-admin/firestore';
import { setPostLike } from './postEngagement.js';
import { createCirclePoll, castCirclePollVote } from './communityPolls.js';
import { createCircleEvent, setCircleEventRsvp } from './communityEvents.js';
import { createCircleAnnouncement, setCircleAnnouncementPinned } from './communityAnnouncements.js';
import { setCircleMemberRole } from './communityGovernance.js';
import { getFirebaseAdminApp, resolveFirestoreDatabaseId } from './runtimeConfig.js';
export { verifyFinalizedMedia } from './mediaLifecycle.js';
export { submitModerationReport, reviewModerationReport, submitModerationAppeal } from './moderation.js';
export { ingestClientAnalytics, aggregateAnalyticsDaily, getPlatformAnalytics } from './analytics.js';
export { getMonetizationCatalog, createCheckoutSession, getBillingSummary, getFinanceOverview } from './monetization.js';
export { cleanupExpiredStories } from './storyCleanup.js';

const adminApp = getFirebaseAdminApp();
const firestoreDatabaseId = resolveFirestoreDatabaseId();
const adminDb = getFirestore(adminApp, firestoreDatabaseId);
setGlobalOptions({
  region: 'us-central1',
  maxInstances: 5,
  timeoutSeconds: 540,
  memory: '512MiB',
});

export const processAccountLifecycleRequest = onDocumentCreated(
  {
    document: 'accountLifecycleRequests/{requestId}',
    retry: true,
  },
  async (event) => {
    const snapshot = event.data;
    if (!snapshot) return;
    const request = snapshot.data() as { type?: string; requesterId?: string };
    if (request.type !== 'delete_account' || !request.requesterId) return;
    await processAccountDeletion(snapshot.id, request.requesterId);
  },
);

export const createCommunityPoll = onCall({ maxInstances: 10 }, async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Sign in to create a Circle poll.');
  try {
    return await createCirclePoll(adminDb, request.auth.uid, request.data?.communityId, request.data?.question, request.data?.options);
  } catch (error) {
    const message = error instanceof Error ? error.message : '';
    if (message.includes('valid Circle') || message.includes('Add a question')) {
      throw new HttpsError('invalid-argument', message);
    }
    if (message.includes('Join this Circle')) throw new HttpsError('permission-denied', message);
    throw new HttpsError('internal', 'The poll could not be created. Please retry.');
  }
});

export const voteInCommunityPoll = onCall({ maxInstances: 10 }, async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Sign in to vote in a Circle poll.');
  try {
    return await castCirclePollVote(adminDb, request.auth.uid, request.data?.communityId, request.data?.pollId, request.data?.optionId);
  } catch (error) {
    const message = error instanceof Error ? error.message : '';
    if (message.includes('valid poll')) throw new HttpsError('invalid-argument', message);
    if (message.includes('Join this Circle') || message.includes('Join this Circle to vote')) {
      throw new HttpsError('permission-denied', message);
    }
    if (message.includes('closed or unavailable')) throw new HttpsError('not-found', message);
    throw new HttpsError('internal', 'Your vote could not be saved. Please retry.');
  }
});


export const createCommunityEvent = onCall({ maxInstances: 10 }, async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Sign in to create a Circle event.');
  try {
    return await createCircleEvent(adminDb, request.auth.uid, request.data?.communityId, request.data?.title, request.data?.startsAt, request.data?.location);
  } catch (error) {
    const message = error instanceof Error ? error.message : '';
    if (message.includes('valid Circle') || message.includes('event title')) throw new HttpsError('invalid-argument', message);
    if (message.includes('Join this Circle')) throw new HttpsError('permission-denied', message);
    throw new HttpsError('internal', 'The event could not be created. Please retry.');
  }
});

export const respondToCommunityEvent = onCall({ maxInstances: 10 }, async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Sign in to RSVP.');
  try {
    return await setCircleEventRsvp(adminDb, request.auth.uid, request.data?.communityId, request.data?.eventId, request.data?.attending);
  } catch (error) {
    const message = error instanceof Error ? error.message : '';
    if (message.includes('valid event')) throw new HttpsError('invalid-argument', message);
    if (message.includes('Join this Circle')) throw new HttpsError('permission-denied', message);
    if (message.includes('unavailable')) throw new HttpsError('not-found', message);
    throw new HttpsError('internal', 'Your RSVP could not be saved. Please retry.');
  }
});

export const createCommunityAnnouncement = onCall({ maxInstances: 10 }, async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Sign in to publish a Circle announcement.');
  try {
    return await createCircleAnnouncement(adminDb, request.auth.uid, request.data?.communityId, request.data?.title, request.data?.body);
  } catch (error) {
    const message = error instanceof Error ? error.message : '';
    if (message.includes('valid Circle') || message.includes('character limits')) throw new HttpsError('invalid-argument', message);
    if (message.includes('Only the active Circle owner')) throw new HttpsError('permission-denied', message);
    throw new HttpsError('internal', 'The announcement could not be published. Please retry.');
  }
});

export const setCommunityAnnouncementPinned = onCall({ maxInstances: 10 }, async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Sign in to manage Circle announcements.');
  try {
    return await setCircleAnnouncementPinned(adminDb, request.auth.uid, request.data?.communityId, request.data?.announcementId, request.data?.pinned);
  } catch (error) {
    const message = error instanceof Error ? error.message : '';
    if (message.includes('valid announcement')) throw new HttpsError('invalid-argument', message);
    if (message.includes('Only the active Circle owner')) throw new HttpsError('permission-denied', message);
    if (message.includes('unavailable')) throw new HttpsError('not-found', message);
    throw new HttpsError('internal', 'The announcement could not be updated. Please retry.');
  }
});

export const setPublicPostLike = onCall({ maxInstances: 10 }, async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Sign in to like a post.');
  const postId = request.data?.postId;
  const liked = request.data?.liked;
  if (typeof postId !== 'string' || postId.length < 1 || postId.length > 150 || postId.includes('/')) {
    throw new HttpsError('invalid-argument', 'A valid post ID is required.');
  }
  if (typeof liked !== 'boolean') throw new HttpsError('invalid-argument', 'A boolean like state is required.');
  try {
    return await setPostLike(adminDb, request.auth.uid, postId, liked);
  } catch (error) {
    if (error instanceof Error && error.message.includes('unavailable')) {
      throw new HttpsError('not-found', 'This public post is unavailable.');
    }
    if (error instanceof Error && error.message.includes('Invalid')) {
      throw new HttpsError('invalid-argument', 'Invalid post interaction.');
    }
    throw new HttpsError('internal', 'The post interaction could not be saved. Please retry.');
  }
});


export const setCommunityMemberRole = onCall({ maxInstances: 10 }, async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Sign in to manage Circle roles.');
  try {
    return await setCircleMemberRole(
      adminDb,
      request.auth.uid,
      request.data?.communityId,
      request.data?.targetUid,
      request.data?.role,
      request.data?.reason,
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : '';
    if (message.includes('valid member') || message.includes('valid Circle')) {
      throw new HttpsError('invalid-argument', message);
    }
    if (message.includes('Only the active Circle owner')) {
      throw new HttpsError('permission-denied', message);
    }
    if (message.includes('active Circle member')) throw new HttpsError('failed-precondition', message);
    throw new HttpsError('internal', 'The Circle role could not be updated. Please retry.');
  }
});
