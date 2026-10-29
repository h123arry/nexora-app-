import { getApps, initializeApp } from 'firebase-admin/app';
import { onDocumentCreated } from 'firebase-functions/v2/firestore';
import { setGlobalOptions } from 'firebase-functions/v2';
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { processAccountDeletion } from './accountDeletionWorker.js';
import { getFirestore } from 'firebase-admin/firestore';
import { setPostLike } from './postEngagement.js';
export { verifyFinalizedMedia } from './mediaLifecycle.js';
export { submitModerationReport, reviewModerationReport, submitModerationAppeal } from './moderation.js';
export { ingestClientAnalytics, aggregateAnalyticsDaily, getPlatformAnalytics } from './analytics.js';
export { getMonetizationCatalog, createCheckoutSession, getBillingSummary, getFinanceOverview } from './monetization.js';
export { cleanupExpiredStories } from './storyCleanup.js';

const adminApp = getApps().find(app => app.name === '[DEFAULT]') || initializeApp();
const firestoreDatabaseId = process.env.FIRESTORE_DATABASE_ID || '(default)';
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
