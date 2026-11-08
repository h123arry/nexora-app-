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
import { createCircleInvite, redeemCircleInvite, revokeCircleInvite } from './communityInvites.js';
import { createPageBookingRequest, respondToPageBookingRequest } from './pageBookings.js';
import { createGroupChat as createGroupChatRecord } from './groupChats.js';
import { publishBusinessService, setBusinessServiceStatus } from './businessServices.js';
import { searchPublicDirectory } from './directorySearch.js';
import { publishPageChannelUpdate as publishPageChannelUpdateRecord, deletePageChannelUpdate as deletePageChannelUpdateRecord } from './pageChannels.js';
import { getFirebaseAdminApp, resolveFirestoreDatabaseId } from './runtimeConfig.js';
export { saveCreatorStudioTemplate, listCreatorStudioTemplates, deleteCreatorStudioTemplate } from './creatorStudio.js';
export { getCreatorEarningsSnapshot, getPendingGiftEarningsForFinance, settleGiftCreatorEarning } from './giftEarnings.js';
export { listAdminUsers, updateAdminUser, listAdminAuditEvents } from './adminUsers.js';
export { setCreatorEconomyDisplayCurrency, getCreatorGiftAnalytics, createGiftCompetition, getActiveGiftCompetitions, getGiftCompetitionLeaderboard, getGiftRiskReviewQueue, resolveGiftRiskSignal } from './giftEconomy.js';
export { getNgnPayoutProviderStatus, getNgnPayoutPolicyForFinance, getNgnPayoutOtpQueue, finalizeNgnPayoutTransfer, getCreatorPayoutComplianceQueue, configureNgnPayoutPolicy, reviewCreatorPayoutCompliance, getNgnBanks, resolveNgnBankAccount, setCreatorPayoutBeneficiary, getCreatorPayoutReadiness, requestCreatorPayout, paystackPayoutWebhook, reconcilePaystackCreatorPayouts } from './paystackPayouts.js';
export { scheduleCreatorPost, cancelCreatorScheduledPost, listCreatorScheduledPosts, publishDueCreatorPosts } from './creatorScheduling.js';
export { verifyFinalizedMedia } from './mediaLifecycle.js';
export { recordVideoWatchHeartbeat, getCreatorVideoRetention } from './videoWatchAnalytics.js';
export { setCreatorFollowState, recordCreatorProfileVisit, getCreatorAudienceAnalytics } from './creatorAudienceAnalytics.js';
export { createCommunityPost } from './communityPosts.js';
export { getCommunityInsights } from './communityAnalytics.js';
export { submitModerationReport, reviewModerationReport, submitModerationAppeal } from './moderation.js';
export { ingestClientAnalytics, aggregateAnalyticsDaily, getPlatformAnalytics } from './analytics.js';
export { getMonetizationCatalog, createCheckoutSession, getBillingSummary, getFinanceOverview } from './monetization.js';
export { listCreatorMembershipTiers, createCreatorMembershipTier, updateCreatorMembershipTier, archiveCreatorMembershipTier } from './creatorMemberships.js';
export { getNexWalletSnapshot } from './nexWallet.js';
export { getGiftCatalog, quoteNexGift } from './giftCatalog.js';
export { sendNexGift } from './giftDelivery.js';
export { cleanupExpiredStories } from './storyCleanup.js';
import { createNotificationPushDelivery } from './pushDelivery.js';
import {
  saveAcademyCourseDraft, saveAcademyLesson, submitAcademyCourseForReview, reviewAcademyCourse,
  getPublishedAcademyCourse, listPublishedAcademyCourses, createAcademyAssessment, publishAcademyAssessment, submitAcademyAssessment,
  issueAcademyCertificate, verifyAcademyCertificate, revokeAcademyCertificate, getAcademyTutorContext,
  createAcademyMentorshipSession, listUpcomingAcademyMentorshipSessions, bookAcademyMentorshipSession,
} from './academyInstitution.js';


const adminApp = getFirebaseAdminApp();
const firestoreDatabaseId = resolveFirestoreDatabaseId();
const adminDb = getFirestore(adminApp, firestoreDatabaseId);

export const deliverNotificationPush = createNotificationPushDelivery(adminDb, adminApp);
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
    if (message.includes('Only active Circle owners, admins, or moderators')) throw new HttpsError('permission-denied', message);
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
    if (message.includes('Only active Circle owners, admins, or moderators')) throw new HttpsError('permission-denied', message);
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


export const createCommunityInvite = onCall({ maxInstances: 10 }, async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Sign in to invite people to a Circle.');
  try {
    return await createCircleInvite(adminDb, request.auth.uid, request.data?.communityId, request.data?.expiresInDays, request.data?.maxUses);
  } catch (error) {
    const message = error instanceof Error ? error.message : '';
    if (message.includes('Invalid Circle')) throw new HttpsError('invalid-argument', message);
    if (message.includes('Only active Circle managers')) throw new HttpsError('permission-denied', message);
    throw new HttpsError('internal', 'The Circle invitation could not be created. Please retry.');
  }
});

export const redeemCommunityInvite = onCall({ maxInstances: 10 }, async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Sign in to accept a Circle invitation.');
  try {
    return await redeemCircleInvite(adminDb, request.auth.uid, request.data?.token);
  } catch (error) {
    const message = error instanceof Error ? error.message : '';
    if (message.includes('Invalid or expired')) throw new HttpsError('not-found', message);
    if (message.includes('cannot join')) throw new HttpsError('permission-denied', message);
    throw new HttpsError('internal', 'The Circle invitation could not be redeemed. Please retry.');
  }
});

export const revokeCommunityInvite = onCall({ maxInstances: 10 }, async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Sign in to revoke a Circle invitation.');
  try {
    await revokeCircleInvite(adminDb, request.auth.uid, request.data?.token);
    return { revoked: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : '';
    if (message.includes('Invalid Circle invitation')) throw new HttpsError('not-found', message);
    if (message.includes('Only active Circle managers')) throw new HttpsError('permission-denied', message);
    throw new HttpsError('internal', 'The Circle invitation could not be revoked. Please retry.');
  }
});


export const getPageFollowerCount = onCall({ maxInstances: 10 }, async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Sign in to view Page audience metrics.');
  const pageId = request.data?.pageId;
  if (typeof pageId !== 'string' || pageId.length < 1 || pageId.length > 150 || pageId.includes('/')) {
    throw new HttpsError('invalid-argument', 'A valid Page ID is required.');
  }
  try {
    const page = await adminDb.collection('pages').doc(pageId).get();
    if (!page.exists) throw new HttpsError('not-found', 'This Page is unavailable.');
    const aggregate = await adminDb.collection('follows').where('followingId', '==', pageId).count().get();
    return { pageId, followerCount: aggregate.data().count };
  } catch (error) {
    if (error instanceof HttpsError) throw error;
    throw new HttpsError('internal', 'Page audience metrics are temporarily unavailable.');
  }
});


export const createBusinessBookingRequest = onCall({ maxInstances: 10 }, async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Sign in to request a business booking.');
  try {
    return await createPageBookingRequest(adminDb, request.auth.uid, request.data?.pageId, request.data?.serviceId, request.data?.requestedAt, request.data?.note ?? '', request.data?.idempotencyKey);
  } catch (error) {
    const message = error instanceof Error ? error.message : '';
    if (message.includes('Provide a valid')) throw new HttpsError('invalid-argument', message);
    if (message.includes('unavailable')) throw new HttpsError('not-found', message);
    if (message.includes('request key')) throw new HttpsError('already-exists', message);
    if (message.includes('Too many booking requests')) throw new HttpsError('resource-exhausted', message);
    throw new HttpsError('internal', 'Your booking request could not be created. Please retry.');
  }
});

export const respondToBusinessBookingRequest = onCall({ maxInstances: 10 }, async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Sign in to manage business bookings.');
  try {
    return await respondToPageBookingRequest(adminDb, request.auth.uid, request.data?.bookingId, request.data?.decision);
  } catch (error) {
    const message = error instanceof Error ? error.message : '';
    if (message.includes('valid booking')) throw new HttpsError('invalid-argument', message);
    if (message.includes('Only the business Page owner')) throw new HttpsError('permission-denied', message);
    if (message.includes('unavailable')) throw new HttpsError('not-found', message);
    if (message.includes('already been resolved')) throw new HttpsError('failed-precondition', message);
    throw new HttpsError('internal', 'The booking request could not be updated. Please retry.');
  }
});


export const publishBusinessServiceListing = onCall({ maxInstances: 10 }, async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Sign in to publish a business service.');
  try {
    return await publishBusinessService(adminDb, request.auth.uid, request.data?.pageId, request.data);
  } catch (error) {
    const message = error instanceof Error ? error.message : '';
    if (message.includes('Provide a valid')) throw new HttpsError('invalid-argument', message);
    if (message.includes('Only the owning')) throw new HttpsError('permission-denied', message);
    throw new HttpsError('internal', 'The business service could not be published. Please retry.');
  }
});

export const setBusinessServiceListingStatus = onCall({ maxInstances: 10 }, async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Sign in to manage business services.');
  try {
    return await setBusinessServiceStatus(adminDb, request.auth.uid, request.data?.pageId, request.data?.serviceId, request.data?.status);
  } catch (error) {
    const message = error instanceof Error ? error.message : '';
    if (message.includes('valid business')) throw new HttpsError('invalid-argument', message);
    if (message.includes('Only the owning')) throw new HttpsError('permission-denied', message);
    if (message.includes('unavailable')) throw new HttpsError('not-found', message);
    throw new HttpsError('internal', 'The business service could not be updated. Please retry.');
  }
});


export const searchNexoraDirectory = onCall({ maxInstances: 10 }, async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Sign in to search NEXORA.');
  try {
    return await searchPublicDirectory(adminDb, request.auth.uid, request.data?.query, request.data?.cursor);
  } catch (error) {
    const message = error instanceof Error ? error.message : '';
    if (message.includes('between 2 and 40') || message.includes('Enter a search term') || message.includes('cursor is invalid') || message.includes('cursor is stale')) {
      throw new HttpsError('invalid-argument', message);
    }
    throw new HttpsError('internal', 'Directory search is temporarily unavailable.');
  }
});


export const createGroupChat = onCall({ maxInstances: 10 }, async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Sign in to create a group conversation.');
  try {
    return await createGroupChatRecord(adminDb, request.auth.uid, request.data?.name, request.data?.description, request.data?.participantIds);
  } catch (error) {
    const message = error instanceof Error ? error.message : '';
    if (message.includes('needs a name') || message.includes('valid, unique')) throw new HttpsError('invalid-argument', message);
    if (message.includes('cannot create') || message.includes('privacy restriction') || message.includes('does not accept')) throw new HttpsError('permission-denied', message);
    if (message.includes('selected accounts')) throw new HttpsError('not-found', message);
    throw new HttpsError('internal', 'The group conversation could not be created. Please retry.');
  }
});

export const publishPageChannelUpdate = onCall({ maxInstances: 10 }, async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Sign in to publish a Page channel update.');
  try {
    return await publishPageChannelUpdateRecord(adminDb, request.auth.uid, request.data?.pageId, request.data?.content, request.data?.idempotencyKey);
  } catch (error) {
    const message = error instanceof Error ? error.message : '';
    if (message.includes('1 to 2,000')) throw new HttpsError('invalid-argument', message);
    if (message.includes('Only the owning')) throw new HttpsError('permission-denied', message);
    if (message.includes('request key')) throw new HttpsError('already-exists', message);
    throw new HttpsError('internal', 'The Page channel update could not be published. Please retry.');
  }
});

export const deletePageChannelUpdate = onCall({ maxInstances: 10 }, async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Sign in to manage Page channel updates.');
  try {
    await deletePageChannelUpdateRecord(adminDb, request.auth.uid, request.data?.pageId, request.data?.updateId);
    return { deleted: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : '';
    if (message.includes('valid Page update')) throw new HttpsError('invalid-argument', message);
    if (message.includes('Only the owning')) throw new HttpsError('permission-denied', message);
    if (message.includes('unavailable')) throw new HttpsError('not-found', message);
    throw new HttpsError('internal', 'The Page channel update could not be deleted. Please retry.');
  }
});


// NEXORA Institute: all privileged authoring, grading and credential mutations
// run through trusted callables. Learner clients never write grades/certificates.
function academyFailure(error: unknown): HttpsError {
  const message = error instanceof Error ? error.message : 'Academy service unavailable.';
  if (message.includes('required.') || message.includes('valid ') || message.includes('Provide ') || message.includes('needs between') || message.includes('Answer every')) {
    return new HttpsError('invalid-argument', message);
  }
  if (message.includes('Only the owner') || message.includes('cannot edit') || message.includes('instructor') || message.includes('Only active')) {
    return new HttpsError('permission-denied', message);
  }
  if (message.includes('unavailable') || message.includes('not found')) return new HttpsError('not-found', message);
  if (message.includes('Pass the published') || message.includes('not awaiting') || message.includes('must be revised')) return new HttpsError('failed-precondition', message);
  if (message.includes('full')) return new HttpsError('resource-exhausted', message);
  return new HttpsError('internal', 'The Academy request could not be completed. Please retry.');
}

export const academySaveCourseDraft = onCall({ maxInstances: 10 }, async request => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Sign in to author an Academy course.');
  try { return await saveAcademyCourseDraft(adminDb, request.auth.uid, request.data); } catch (error) { throw academyFailure(error); }
});
export const academySaveLesson = onCall({ maxInstances: 10 }, async request => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Sign in to author an Academy lesson.');
  try { return await saveAcademyLesson(adminDb, request.auth.uid, request.data); } catch (error) { throw academyFailure(error); }
});
export const academySubmitCourseForReview = onCall({ maxInstances: 10 }, async request => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Sign in to submit an Academy course.');
  try { return await submitAcademyCourseForReview(adminDb, request.auth.uid, request.data?.courseId); } catch (error) { throw academyFailure(error); }
});
export const academyReviewCourse = onCall({ maxInstances: 10 }, async request => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Sign in to review an Academy course.');
  try { return await reviewAcademyCourse(adminDb, request.auth.uid, request.data?.courseId, request.data?.decision, request.data?.note); } catch (error) { throw academyFailure(error); }
});
export const academyGetPublishedCourse = onCall({ maxInstances: 10 }, async request => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Sign in to access the Academy.');
  try { return await getPublishedAcademyCourse(adminDb, request.data?.courseId); } catch (error) { throw academyFailure(error); }
});

export const academyListPublishedCourses = onCall({ maxInstances: 10 }, async request => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Sign in to browse the Academy.');
  try { return await listPublishedAcademyCourses(adminDb); } catch (error) { throw academyFailure(error); }
});
export const academyCreateAssessment = onCall({ maxInstances: 10 }, async request => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Sign in to create an Academy assessment.');
  try { return await createAcademyAssessment(adminDb, request.auth.uid, request.data); } catch (error) { throw academyFailure(error); }
});
export const academyPublishAssessment = onCall({ maxInstances: 10 }, async request => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Sign in to publish an Academy assessment.');
  try { return await publishAcademyAssessment(adminDb, request.auth.uid, request.data?.courseId, request.data?.assessmentId); } catch (error) { throw academyFailure(error); }
});
export const academySubmitAssessment = onCall({ maxInstances: 10 }, async request => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Sign in to take an Academy assessment.');
  try { return await submitAcademyAssessment(adminDb, request.auth.uid, request.data?.courseId, request.data?.assessmentId, request.data?.answers); } catch (error) { throw academyFailure(error); }
});
export const academyIssueCertificate = onCall({ maxInstances: 10 }, async request => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Sign in to request your Academy certificate.');
  try { return await issueAcademyCertificate(adminDb, request.auth.uid, request.data?.courseId, request.data?.assessmentId); } catch (error) { throw academyFailure(error); }
});
export const academyVerifyCertificate = onCall({ maxInstances: 10 }, async request => {
  try { return await verifyAcademyCertificate(adminDb, request.data?.verificationCode); } catch (error) { throw academyFailure(error); }
});
export const academyRevokeCertificate = onCall({ maxInstances: 10 }, async request => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Sign in to revoke an Academy certificate.');
  try { return await revokeAcademyCertificate(adminDb, request.auth.uid, request.data?.certificateId, request.data?.reason); } catch (error) { throw academyFailure(error); }
});
export const academyGetTutorContext = onCall({ maxInstances: 10 }, async request => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Sign in to use the Creator Tutor.');
  try { return await getAcademyTutorContext(adminDb, request.auth.uid, request.data?.courseId, request.data?.lessonIds); } catch (error) { throw academyFailure(error); }
});
export const academyCreateMentorshipSession = onCall({ maxInstances: 10 }, async request => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Sign in to host an Academy session.');
  try { return await createAcademyMentorshipSession(adminDb, request.auth.uid, request.data); } catch (error) { throw academyFailure(error); }
});
export const academyListMentorshipSessions = onCall({ maxInstances: 10 }, async request => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Sign in to browse Academy mentorship sessions.');
  try { return await listUpcomingAcademyMentorshipSessions(adminDb, request.auth.uid); } catch (error) { throw academyFailure(error); }
});

export const academyBookMentorshipSession = onCall({ maxInstances: 10 }, async request => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Sign in to book an Academy session.');
  try { return await bookAcademyMentorshipSession(adminDb, request.auth.uid, request.data?.sessionId); } catch (error) { throw academyFailure(error); }
});

export { startLiveSession, endLiveSession, joinLiveSession, leaveLiveSession, heartbeatLiveSession, sendLiveChatMessage, reconcileLiveSessionViewers } from './liveSessions.js';
export { getLiveKitToken } from './liveKitTransport.js';
