import { onDocumentCreated, onDocumentWritten } from 'firebase-functions/v2/firestore';
import { setGlobalOptions } from 'firebase-functions/v2';
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { processAccountDeletion } from './accountDeletionWorker.js';
import { FieldPath, getFirestore } from 'firebase-admin/firestore';
import { setPostLike } from './postEngagement.js';
import { createPublicPostRepost } from './postReposts.js';
import { addPublicPostCommentReply } from './postReplies.js';
import { addPublicPostComment } from './postComments.js';
import { setPublicPostCommentLike } from './postCommentReactions.js';
import { deletePublicPostComment } from './postCommentDeletion.js';
import { createCirclePoll, castCirclePollVote } from './communityPolls.js';
import { createCircleEvent, setCircleEventRsvp } from './communityEvents.js';
import { createCircleAnnouncement, setCircleAnnouncementPinned } from './communityAnnouncements.js';
import { setCircleMemberRole, moderateCircleMember, listCircleBans } from './communityGovernance.js';
import { submitCircleReport, listCircleReports, resolveCircleReport } from './communityReports.js';
import { createCircleInvite, redeemCircleInvite, revokeCircleInvite } from './communityInvites.js';
import { createReferralCode, claimReferral, qualifyReferral, getReferralSummary, getReferralInvitePreview } from './referrals.js';
import { createSocialChallenge as createSocialChallengeRecord, joinSocialChallenge as joinSocialChallengeRecord, listSocialChallenges as listSocialChallengesRecords, recordSocialChallengePost } from './socialChallenges.js';
import { getAuth } from 'firebase-admin/auth';
import { createContentSeries as createContentSeriesRecord, appendPostToSeries, listMyContentSeries as listMyContentSeriesRecord, listContentSeriesEpisodes } from './contentSeries.js';
import { voteOnPublicPostPoll, getMyPublicPostPollVotes } from './publicPostPolls.js';
import { createPageBookingRequest, respondToPageBookingRequest, cancelPageBookingRequest } from './pageBookings.js';
import { createGroupChat as createGroupChatRecord } from './groupChats.js';
import { publishBusinessService, setBusinessServiceStatus } from './businessServices.js';
import { searchPublicDirectory } from './directorySearch.js';
import { syncUniversalSearchRecord, searchNexoraContent, getNexoraTrending } from './universalSearch.js';
import { publishPageChannelUpdate as publishPageChannelUpdateRecord, deletePageChannelUpdate as deletePageChannelUpdateRecord } from './pageChannels.js';
import { getFirebaseAdminApp, resolveFirestoreDatabaseId } from './runtimeConfig.js';
import { createDailySessionRecorder } from './retention.js';
export { saveCreatorStudioTemplate, listCreatorStudioTemplates, deleteCreatorStudioTemplate } from './creatorStudio.js';
export { saveCreatorLens, submitCreatorLensForReview, reviewCreatorLens, listMyCreatorLenses, listPublishedCreatorLenses } from './creatorLenses.js';
export { getCreatorEarningsSnapshot, getPendingGiftEarningsForFinance, settleGiftCreatorEarning } from './giftEarnings.js';
export { listAdminUsers, updateAdminUser, listAdminAuditEvents } from './adminUsers.js';
export { setCreatorEconomyDisplayCurrency, getCreatorGiftAnalytics, createGiftCompetition, getActiveGiftCompetitions, getGiftCompetitionLeaderboard, getGiftRiskReviewQueue, resolveGiftRiskSignal } from './giftEconomy.js';
export { getNgnPayoutProviderStatus, getNgnPayoutPolicyForFinance, getNgnPayoutOtpQueue, finalizeNgnPayoutTransfer, getCreatorPayoutComplianceQueue, configureNgnPayoutPolicy, reviewCreatorPayoutCompliance, getNgnBanks, resolveNgnBankAccount, setCreatorPayoutBeneficiary, getCreatorPayoutReadiness, requestCreatorPayout, paystackPayoutWebhook, reconcilePaystackCreatorPayouts } from './paystackPayouts.js';
export { scheduleCreatorPost, cancelCreatorScheduledPost, listCreatorScheduledPosts, publishDueCreatorPosts } from './creatorScheduling.js';
export { verifyFinalizedMedia } from './mediaLifecycle.js';
export { recordMyRemixLineage } from './originLineage.js';
export { setMyOriginRemixPolicy } from './originPermissions.js';
export { getPublicPostPlayback } from './publicMediaPlayback.js';
export { getStudioExportMp4Url, cleanupExpiredStudioMp4Exports } from './studioMp4Export.js';
export { cleanupDeletedWorldWeaveMoment, cleanupUnpublishedWorldWeaveMedia } from './worldWeaveCleanup.js';
export { recordVideoWatchHeartbeat, getCreatorVideoRetention } from './videoWatchAnalytics.js';
export { setCreatorFollowState, recordCreatorProfileVisit, getCreatorAudienceAnalytics } from './creatorAudienceAnalytics.js';
export { createCommunityPost } from './communityPosts.js';
export { getCommunityInsights } from './communityAnalytics.js';
export { submitModerationReport, reviewModerationReport, submitModerationAppeal } from './moderation.js';
export { submitIdentityVerificationApplication, getMyIdentityVerificationApplication, listIdentityVerificationApplications, reviewIdentityVerificationApplication, listIdentityImpersonationCases, reviewIdentityImpersonationCase } from './identityVerification.js';
export { ingestClientAnalytics, aggregateAnalyticsDaily, getPlatformAnalytics } from './analytics.js';
export { getMonetizationCatalog, createCheckoutSession, getBillingSummary, getFinanceOverview } from './monetization.js';
export { listCreatorMembershipTiers, createCreatorMembershipTier, updateCreatorMembershipTier, archiveCreatorMembershipTier } from './creatorMemberships.js';
export { getNexWalletSnapshot } from './nexWallet.js';
export { getGiftCatalog, quoteNexGift } from './giftCatalog.js';
export { sendNexGift } from './giftDelivery.js';
export { cleanupExpiredStories } from './storyCleanup.js';
export { moderateLiveParticipant } from './liveModeration.js';
export { sendPageBookingReminders } from './pageBookingReminders.js';
import { createNotificationPushDelivery } from './pushDelivery.js';
import { createFollowInboxNotification } from './followNotificationDelivery.js';
import {
  saveAcademyCourseDraft, saveAcademyLesson, submitAcademyCourseForReview, reviewAcademyCourse,
  getPublishedAcademyCourse, listPublishedAcademyCourses, createAcademyAssessment, publishAcademyAssessment, submitAcademyAssessment,
  issueAcademyCertificate, verifyAcademyCertificate, revokeAcademyCertificate, getAcademyTutorContext,
  createAcademyMentorshipSession, listUpcomingAcademyMentorshipSessions, bookAcademyMentorshipSession,
  completeAcademyLesson,
} from './academyInstitution.js';


const adminApp = getFirebaseAdminApp();
const firestoreDatabaseId = resolveFirestoreDatabaseId();
const adminDb = getFirestore(adminApp, firestoreDatabaseId);

export const deliverNotificationPush = createNotificationPushDelivery(adminDb, adminApp);
export const deliverFollowInboxNotification = createFollowInboxNotification(adminDb);

const syncSearch = (kind: Parameters<typeof syncUniversalSearchRecord>[1], id: string, path: string, data: Record<string, unknown> | null, parent?: Record<string, unknown>) =>
  syncUniversalSearchRecord(adminDb, kind, id, path, data, parent);

const searchFieldsChanged = (
  before: Record<string, unknown> | null,
  after: Record<string, unknown> | null,
  fields: string[],
): boolean => {
  if (!before || !after) return true;
  return fields.some(field => JSON.stringify(before[field] ?? null) !== JSON.stringify(after[field] ?? null));
};

export const indexPublicPostForSearch = onDocumentWritten('posts/{postId}', async event => {
  const before = event.data?.before.exists ? event.data.before.data() as Record<string, unknown> : null;
  const after = event.data?.after.exists ? event.data.after.data() as Record<string, unknown> : null;
  const id = event.params.postId;
  const path = 'posts/' + id;
  if (before && after && !searchFieldsChanged(before, after, ['content','audience','tags','videoUrl','mediaType','type','timestamp','likes','likesCount','commentsCount','views','viewCount','image','images','thumbnailUrl','videoThumbnail','username','name','avatar','isVerified','status','userId'])) return;
  const resolveKind = (data: Record<string, unknown> | null): 'video' | 'post' =>
    data && (data.videoUrl || data.mediaType === 'video' || data.type === 'video') ? 'video' : 'post';
  const previousKind = resolveKind(before);
  const nextKind = resolveKind(after);
  if (before && (!after || previousKind !== nextKind)) await syncSearch(previousKind, id, path, null);
  if (after) await syncSearch(nextKind, id, path, after);
});
export const indexPublicProfileForSearch = onDocumentWritten('users/{userId}', async event => {
  const before = event.data?.before.exists ? event.data.before.data() as Record<string, unknown> : null;
  const data = event.data?.after.exists ? event.data.after.data() as Record<string, unknown> : null;
  if (before && data && !searchFieldsChanged(before, data, ['username','name','avatar','bio','isVerified','isBanned','isSuspended','isSeedProfile'])) return;
  await syncSearch('person', event.params.userId, 'users/' + event.params.userId, data);
});
export const indexPageForSearch = onDocumentWritten('pages/{pageId}', async event => {
  const before = event.data?.before.exists ? event.data.before.data() as Record<string, unknown> : null;
  const data = event.data?.after.exists ? event.data.after.data() as Record<string, unknown> : null;
  if (before && data && !searchFieldsChanged(before, data, ['username','name','avatar','coverImage','category','description','status','isPrivate','privacy','ownerId','isVerified'])) return;
  await syncSearch('page', event.params.pageId, 'pages/' + event.params.pageId, data);
});
export const indexCircleForSearch = onDocumentWritten('communities/{communityId}', async event => {
  const before = event.data?.before.exists ? event.data.before.data() as Record<string, unknown> : null;
  const data = event.data?.after.exists ? event.data.after.data() as Record<string, unknown> : null;
  if (before && data && !searchFieldsChanged(before, data, ['name','description','bannerImage','type','isPrivate','bannedUsers','status','isVerified'])) return;
  await syncSearch('circle', event.params.communityId, 'communities/' + event.params.communityId, data);
});
export const indexLiveRoomForSearch = onDocumentWritten('liveSessions/{sessionId}', async event => {
  const before = event.data?.before.exists ? event.data.before.data() as Record<string, unknown> : null;
  const data = event.data?.after.exists ? event.data.after.data() as Record<string, unknown> : null;
  if (before && data && !searchFieldsChanged(before, data, ['title','description','hostName','hostId','status','thumbnailUrl','startedAt','category','isVerified'])) return;
  await syncSearch('live', event.params.sessionId, 'liveSessions/' + event.params.sessionId, data);
});
export const indexCirclePostForSearch = onDocumentWritten('communities/{communityId}/posts/{postId}', async event => {
  const before = event.data?.before.exists ? event.data.before.data() as Record<string, unknown> : null;
  const data = event.data?.after.exists ? event.data.after.data() as Record<string, unknown> : null;
  if (before && data && !searchFieldsChanged(before, data, ['content','tags','status','likesCount','commentsCount','image','authorName','authorUsername','authorAvatar','isVerified'])) return;
  const parentSnapshot = await adminDb.collection('communities').doc(event.params.communityId).get();
  await syncSearch('post', event.params.postId, event.data?.after.exists ? event.data.after.ref.path : 'communities/' + event.params.communityId + '/posts/' + event.params.postId,
    data, parentSnapshot.data() as Record<string, unknown> | undefined);
});
export const indexCirclePollForSearch = onDocumentWritten('communities/{communityId}/polls/{pollId}', async event => {
  const before = event.data?.before.exists ? event.data.before.data() as Record<string, unknown> : null;
  const data = event.data?.after.exists ? event.data.after.data() as Record<string, unknown> : null;
  if (before && data && !searchFieldsChanged(before, data, ['question','status'])) return;
  const parentSnapshot = await adminDb.collection('communities').doc(event.params.communityId).get();
  await syncSearch('poll', event.params.pollId, 'communities/' + event.params.communityId + '/polls/' + event.params.pollId,
    data, parentSnapshot.data() as Record<string, unknown> | undefined);
});
export const indexCircleAnnouncementForSearch = onDocumentWritten('communities/{communityId}/announcements/{announcementId}', async event => {
  const before = event.data?.before.exists ? event.data.before.data() as Record<string, unknown> : null;
  const data = event.data?.after.exists ? event.data.after.data() as Record<string, unknown> : null;
  if (before && data && !searchFieldsChanged(before, data, ['title','body','deleted','status'])) return;
  const parentSnapshot = await adminDb.collection('communities').doc(event.params.communityId).get();
  await syncSearch('announcement', event.params.announcementId, 'communities/' + event.params.communityId + '/announcements/' + event.params.announcementId,
    data, parentSnapshot.data() as Record<string, unknown> | undefined);
});
export const indexCircleEventForSearch = onDocumentWritten('communities/{communityId}/events/{eventId}', async event => {
  const before = event.data?.before.exists ? event.data.before.data() as Record<string, unknown> : null;
  const data = event.data?.after.exists ? event.data.after.data() as Record<string, unknown> : null;
  if (before && data && !searchFieldsChanged(before, data, ['title','location','status','startsAt'])) return;
  const parentSnapshot = await adminDb.collection('communities').doc(event.params.communityId).get();
  await syncSearch('event', event.params.eventId, 'communities/' + event.params.communityId + '/events/' + event.params.eventId,
    data, parentSnapshot.data() as Record<string, unknown> | undefined);
});
export const indexPageServiceForSearch = onDocumentWritten('pages/{pageId}/services/{serviceId}', async event => {
  const before = event.data?.before.exists ? event.data.before.data() as Record<string, unknown> : null;
  const data = event.data?.after.exists ? event.data.after.data() as Record<string, unknown> : null;
  if (before && data && !searchFieldsChanged(before, data, ['name','serviceName','description','status','durationMinutes','priceMinor','currency','category'])) return;
  const parentSnapshot = await adminDb.collection('pages').doc(event.params.pageId).get();
  await syncSearch('service', event.params.serviceId, 'pages/' + event.params.pageId + '/services/' + event.params.serviceId,
    data, parentSnapshot.data() as Record<string, unknown> | undefined);
});
export const indexPageChannelUpdateForSearch = onDocumentWritten('pages/{pageId}/channelUpdates/{updateId}', async event => {
  const before = event.data?.before.exists ? event.data.before.data() as Record<string, unknown> : null;
  const data = event.data?.after.exists ? event.data.after.data() as Record<string, unknown> : null;
  if (before && data && !searchFieldsChanged(before, data, ['title','content','body','status','deleted'])) return;
  const parentSnapshot = await adminDb.collection('pages').doc(event.params.pageId).get();
  await syncSearch('update', event.params.updateId, 'pages/' + event.params.pageId + '/channelUpdates/' + event.params.updateId,
    data, parentSnapshot.data() as Record<string, unknown> | undefined);
});

export const searchNexora = onCall({ maxInstances: 10 }, async request => {
  if (!request.auth?.uid) throw new HttpsError('unauthenticated', 'Sign in to search NEXORA.');
  try {
    return await searchNexoraContent(adminDb, request.auth.uid, request.data?.query, request.data?.cursor, request.data?.kinds);
  } catch (error) {
    const message = error instanceof Error ? error.message : '';
    if (message.includes('Search terms') || message.includes('Enter a search term') || message.includes('cursor is invalid') || message.includes('cursor is stale')) {
      throw new HttpsError('invalid-argument', message);
    }
    throw new HttpsError('internal', 'NEXORA search is temporarily unavailable.');
  }
});
export const getNexoraTrendingTopics = onCall({ maxInstances: 5 }, async request => {
  if (!request.auth?.uid) throw new HttpsError('unauthenticated', 'Sign in to view NEXORA trends.');
  try { return { topics: await getNexoraTrending(adminDb) }; }
  catch { throw new HttpsError('unavailable', 'Trending topics are temporarily unavailable.'); }
});

/** Admin-only, cursor-based one-time index backfill. Invoke once per source until done=true. */
export const backfillNexoraSearchIndex = onCall({ maxInstances: 2, timeoutSeconds: 540 }, async request => {
  const claims = request.auth?.token as Record<string, unknown> | undefined;
  if (!request.auth?.uid || !(claims?.admin === true || claims?.role === 'admin' || claims?.role === 'founder' || claims?.role === 'super_admin')) {
    throw new HttpsError('permission-denied', 'Only NEXORA administrators can rebuild the search index.');
  }
  const source = request.data?.source;
  const sources = ['users','posts','pages','communities','liveSessions','circlePosts','circleEvents','circlePolls','circleAnnouncements','pageServices','pageUpdates'];
  if (typeof source !== 'string' || !sources.includes(source)) throw new HttpsError('invalid-argument', 'Choose a supported search index source.');
  const cursor = request.data?.cursor;
  if (cursor !== undefined && cursor !== null && (typeof cursor !== 'string' || cursor.length > 500 || cursor.includes('..'))) {
    throw new HttpsError('invalid-argument', 'The backfill cursor is invalid.');
  }
  const isCollectionGroup = ['circlePosts','circleEvents','circlePolls','circleAnnouncements','pageServices','pageUpdates'].includes(source);
  const collectionName = source === 'circlePosts' ? 'posts'
    : source === 'circleEvents' ? 'events'
      : source === 'circlePolls' ? 'polls'
        : source === 'circleAnnouncements' ? 'announcements'
          : source === 'pageServices' ? 'services'
        : source === 'pageUpdates' ? 'channelUpdates' : source;
  let query: FirebaseFirestore.Query = isCollectionGroup
    ? adminDb.collectionGroup(collectionName)
    : adminDb.collection(collectionName);
  query = query.orderBy(FieldPath.documentId());
  if (cursor) {
    if (isCollectionGroup) {
      const cursorSegments = cursor.split('/');
      const expectedCollection = source === 'circlePosts' ? 'posts' : source === 'circleEvents' ? 'events' : source === 'circlePolls' ? 'polls' : source === 'circleAnnouncements' ? 'announcements' : source === 'pageServices' ? 'services' : 'channelUpdates';
      const expectedRoot = source.startsWith('circle') ? 'communities' : 'pages';
      if (cursorSegments.length !== 4 || cursorSegments[0] !== expectedRoot || cursorSegments[2] !== expectedCollection) {
        throw new HttpsError('invalid-argument', 'The backfill cursor does not belong to this source.');
      }
      const previous = await adminDb.doc(cursor).get();
      if (!previous.exists) throw new HttpsError('invalid-argument', 'The backfill cursor is stale. Restart this source.');
      query = query.startAfter(previous);
    } else query = query.startAfter(cursor);
  }
  const snapshot = await query.limit(100).get();
  let processed = 0;
  for (const document of snapshot.docs) {
    const data = document.data() as Record<string, unknown>;
    const segments = document.ref.path.split('/');
    if (source === 'circlePosts' || source === 'circleEvents' || source === 'circlePolls' || source === 'circleAnnouncements') {
      if (segments.length !== 4 || segments[0] !== 'communities') continue;
      const parent = await adminDb.collection('communities').doc(segments[1]).get();
      const kind = source === 'circleEvents' ? 'event' : source === 'circlePolls' ? 'poll' : source === 'circleAnnouncements' ? 'announcement' : 'post';
      await syncUniversalSearchRecord(adminDb, kind, document.id, document.ref.path, data, parent.data() as Record<string, unknown> | undefined);
    } else if (source === 'pageServices' || source === 'pageUpdates') {
      if (segments.length !== 4 || segments[0] !== 'pages') continue;
      const parent = await adminDb.collection('pages').doc(segments[1]).get();
      const kind = source === 'pageServices' ? 'service' : 'update';
      await syncUniversalSearchRecord(adminDb, kind, document.id, document.ref.path, data, parent.data() as Record<string, unknown> | undefined);
    } else {
      const kind = source === 'users' ? 'person'
        : source === 'pages' ? 'page'
          : source === 'communities' ? 'circle'
            : source === 'liveSessions' ? 'live'
              : (data.videoUrl || data.mediaType === 'video' || data.type === 'video') ? 'video' : 'post';
      await syncUniversalSearchRecord(adminDb, kind, document.id, document.ref.path, data);
    }
    processed++;
  }
  const nextCursor = snapshot.size === 100
    ? (isCollectionGroup ? snapshot.docs[snapshot.docs.length - 1].ref.path : snapshot.docs[snapshot.docs.length - 1].id)
    : null;
  return { source, processed, nextCursor, done: nextCursor === null };
});


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

export const addPublicPostCommentEntry = onCall({ maxInstances: 20 }, async request => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Sign in to comment on a post.');
  const postId = request.data?.postId;
  const commentId = request.data?.commentId;
  const content = request.data?.content;
  if (typeof postId !== 'string' || typeof commentId !== 'string' || typeof content !== 'string') {
    throw new HttpsError('invalid-argument', 'A post, comment ID and comment body are required.');
  }
  try {
    return await addPublicPostComment(adminDb, request.auth.uid, postId, content, commentId);
  } catch (error) {
    const message = error instanceof Error ? error.message : '';
    if (message.includes('unavailable')) throw new HttpsError('not-found', 'This public post is unavailable.');
    if (message.includes('disabled') || message.includes('Complete your public profile')) {
      throw new HttpsError('failed-precondition', message);
    }
    if (message.includes('valid') || message.includes('between 1 and 500')) {
      throw new HttpsError('invalid-argument', message);
    }
    throw new HttpsError('internal', 'The comment could not be saved. Please retry.');
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


export const deletePublicPostCommentEntry = onCall({ maxInstances: 10 }, async request => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Sign in to delete comments.');
  try {
    return await deletePublicPostComment(adminDb, request.auth.uid, request.data?.postId, request.data?.commentId);
  } catch (error) {
    const message = error instanceof Error ? error.message : '';
    if (message.includes('valid post')) throw new HttpsError('invalid-argument', message);
    if (message.includes('no longer available')) throw new HttpsError('not-found', message);
    if (message.includes('permission')) throw new HttpsError('permission-denied', message);
    throw new HttpsError('internal', 'The comment could not be deleted. Please retry.');
  }
});

export const setPublicPostCommentLikeState = onCall({ maxInstances: 10 }, async request => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Sign in to react to comments.');
  const { postId, commentId, liked } = request.data || {};
  if (typeof liked !== 'boolean') throw new HttpsError('invalid-argument', 'A boolean reaction state is required.');
  try {
    return await setPublicPostCommentLike(adminDb, request.auth.uid, postId, commentId, liked);
  } catch (error) {
    const message = error instanceof Error ? error.message : '';
    if (message.includes('valid post') || message.includes('desired reaction')) throw new HttpsError('invalid-argument', message);
    if (message.includes('unavailable') || message.includes('no longer available')) throw new HttpsError('not-found', message);
    throw new HttpsError('internal', 'Your comment reaction could not be saved. Please retry.');
  }
});

export const replyToPublicPostComment = onCall({ maxInstances: 10 }, async request => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Sign in to reply to comments.');
  try {
    return await addPublicPostCommentReply(
      adminDb, request.auth.uid, request.data?.postId, request.data?.commentId,
      request.data?.content, request.data?.replyId,
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : '';
    if (message.includes('valid post') || message.includes('between 1 and 500')) throw new HttpsError('invalid-argument', message);
    if (message.includes('unavailable') || message.includes('no longer available')) throw new HttpsError('not-found', message);
    if (message.includes('public profile')) throw new HttpsError('failed-precondition', message);
    throw new HttpsError('internal', 'Your reply could not be saved. Please retry.');
  }
});

export const repostPublicPost = onCall({ maxInstances: 10 }, async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Sign in to repost.');
  const postId = request.data?.postId;
  if (typeof postId !== 'string' || postId.length < 1 || postId.length > 150 || postId.includes('/')) {
    throw new HttpsError('invalid-argument', 'A valid post ID is required.');
  }
  try {
    return await createPublicPostRepost(adminDb, request.auth.uid, postId, request.data?.quoteText);
  } catch (error) {
    const message = error instanceof Error ? error.message : '';
    if (message.includes('unavailable')) throw new HttpsError('not-found', 'This public post is unavailable.');
    if (message.includes('Invalid') || message.includes('Quote text')) throw new HttpsError('invalid-argument', message);
    if (message.includes('public profile')) throw new HttpsError('failed-precondition', message);
    throw new HttpsError('internal', 'The post could not be reposted. Please retry.');
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


export const listCommunityBans = onCall({ maxInstances: 10 }, async request => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Sign in to review Circle moderation records.');
  try {
    return await listCircleBans(adminDb, request.auth.uid, request.data?.communityId);
  } catch (error) {
    const message = error instanceof Error ? error.message : '';
    if (message.includes('valid Circle')) throw new HttpsError('invalid-argument', message);
    if (message.includes('Only active Circle managers')) throw new HttpsError('permission-denied', message);
    throw new HttpsError('internal', 'The Circle ban list could not be loaded. Please retry.');
  }
});

export const moderateCommunityMember = onCall({ maxInstances: 10 }, async request => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Sign in to moderate Circle members.');
  try {
    return await moderateCircleMember(
      adminDb,
      request.auth.uid,
      request.data?.communityId,
      request.data?.targetUid,
      request.data?.action,
      request.data?.reason,
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : '';
    if (message.includes('valid member') || message.includes('valid Circle')) {
      throw new HttpsError('invalid-argument', message);
    }
    if (message.includes('Only active Circle managers') || message.includes('equal or higher role')) {
      throw new HttpsError('permission-denied', message);
    }
    if (message.includes('not an active Circle member') || message.includes('not banned') || message.includes('existing Circle member')) {
      throw new HttpsError('failed-precondition', message);
    }
    throw new HttpsError('internal', 'The Circle moderation action could not be completed. Please retry.');
  }
});

export const submitCommunityReport = onCall({ maxInstances: 10 }, async request => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Sign in to report Circle content.');
  try {
    return await submitCircleReport(
      adminDb, request.auth.uid, request.data?.communityId,
      request.data?.targetType, request.data?.targetId, request.data?.reason,
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : '';
    if (message.includes('valid Circle') || message.includes('Choose valid')) throw new HttpsError('invalid-argument', message);
    if (message.includes('Join this Circle')) throw new HttpsError('permission-denied', message);
    if (message.includes('already reported') || message.includes('unavailable') || message.includes('own Circle content')) throw new HttpsError('failed-precondition', message);
    throw new HttpsError('internal', 'Your Circle report could not be submitted. Please retry.');
  }
});

export const listCommunityReports = onCall({ maxInstances: 10 }, async request => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Sign in to review Circle reports.');
  try {
    return await listCircleReports(adminDb, request.auth.uid, request.data?.communityId);
  } catch (error) {
    const message = error instanceof Error ? error.message : '';
    if (message.includes('valid Circle')) throw new HttpsError('invalid-argument', message);
    if (message.includes('Only active Circle managers')) throw new HttpsError('permission-denied', message);
    throw new HttpsError('internal', 'Circle reports could not be loaded. Please retry.');
  }
});

export const resolveCommunityReport = onCall({ maxInstances: 10 }, async request => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Sign in to review Circle reports.');
  try {
    return await resolveCircleReport(
      adminDb, request.auth.uid, request.data?.communityId,
      request.data?.reportId, request.data?.action, request.data?.reviewReason,
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : '';
    if (message.includes('valid report') || message.includes('valid Circle')) throw new HttpsError('invalid-argument', message);
    if (message.includes('Only active Circle managers') || message.includes('equal or higher role')) throw new HttpsError('permission-denied', message);
    if (message.includes('no longer open') || message.includes('Only member reports') || message.includes('Member reports')) {
      throw new HttpsError('failed-precondition', message);
    }
    throw new HttpsError('internal', 'The Circle report could not be resolved. Please retry.');
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


export const cancelBusinessBookingRequest = onCall({ maxInstances: 10 }, async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Sign in to cancel a business booking.');
  try {
    return await cancelPageBookingRequest(adminDb, request.auth.uid, request.data?.bookingId);
  } catch (error) {
    const message = error instanceof Error ? error.message : '';
    if (message.includes('valid booking')) throw new HttpsError('invalid-argument', message);
    if (message.includes('Only the customer or business')) throw new HttpsError('permission-denied', message);
    if (message.includes('unavailable')) throw new HttpsError('not-found', message);
    if (message.includes('can no longer be cancelled') || message.includes('Only pending or confirmed')) {
      throw new HttpsError('failed-precondition', message);
    }
    throw new HttpsError('internal', 'The booking could not be cancelled. Please retry.');
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
export const academyCompleteLesson = onCall({ maxInstances: 10 }, async request => {
  if (!request.auth?.uid) throw new HttpsError('unauthenticated', 'Sign in to save Academy progress.');
  try {
    return await completeAcademyLesson(adminDb, request.auth.uid, request.data?.courseId, request.data?.lessonId);
  } catch (error) {
    const message = error instanceof Error ? error.message : '';
    if (message.includes('valid course') || message.includes('not part of the selected course')) {
      throw new HttpsError('invalid-argument', message);
    }
    if (message.includes('unavailable')) throw new HttpsError('not-found', message);
    if (message.includes('supported lesson limit')) throw new HttpsError('resource-exhausted', message);
    throw new HttpsError('internal', 'Your Academy progress could not be saved. Please retry.');
  }
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

export { startLiveSession, endLiveSession, joinLiveSession, leaveLiveSession, heartbeatLiveSession, sendLiveChatMessage, updateLiveSessionSettings, requestLiveGuestAccess, reviewLiveGuestAccess, reconcileLiveSessionViewers } from './liveSessions.js';
export { getLiveKitToken } from './liveKitTransport.js';

export { startLiveRecording, stopLiveRecording, getLiveReplayPlayback } from './liveReplays.js';



export const qualifyReferralOnFirstPublicPost = onDocumentCreated('posts/{postId}', async event => {
  const post = event.data?.data();
  if (!post || post.audience !== 'public' || typeof post.userId !== 'string') return;
  try {
    const identity = await getAuth(getFirebaseAdminApp()).getUser(post.userId);
    await qualifyReferral(adminDb, post.userId, identity.emailVerified, event.params.postId);
  } catch (error) {
    // Referral failures must never block post creation; pending attribution is retained.
    console.error('[Referrals] Public-post qualification did not complete.', error);
  }
});




export const voteOnFeedPoll = onCall({ maxInstances: 20 }, async request => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Sign in to vote in this poll.');
  try { return await voteOnPublicPostPoll(adminDb, request.auth.uid, request.data?.postId, request.data?.optionId); }
  catch (error) {
    const message = error instanceof Error ? error.message : '';
    if (message.includes('identifiers') || message.includes('valid poll') || message.includes('valid options') || message.includes('valid poll option')) {
      throw new HttpsError('invalid-argument', message);
    }
    if (message.includes('unavailable')) throw new HttpsError('not-found', message);
    throw new HttpsError('failed-precondition', 'Your poll vote could not be recorded.');
  }
});

export const getMyFeedPollVotes = onCall({ maxInstances: 20 }, async request => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Sign in to view your poll activity.');
  try { return await getMyPublicPostPollVotes(adminDb, request.auth.uid, request.data?.postIds); }
  catch (error) {
    const message = error instanceof Error ? error.message : '';
    if (message.includes('valid list')) throw new HttpsError('invalid-argument', message);
    throw new HttpsError('unavailable', 'Your poll activity is temporarily unavailable.');
  }
});

export const createMyContentSeries = onCall({ maxInstances: 10 }, async request => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Sign in to create a content series.');
  try { return await createContentSeriesRecord(adminDb, request.auth.uid, request.data || {}); }
  catch (error) {
    const message = error instanceof Error ? error.message : '';
    if (message.includes('details are invalid') || message.includes('limit')) throw new HttpsError('invalid-argument', message);
    throw new HttpsError('internal', 'The content series could not be created.');
  }
});

export const addPostToMyContentSeries = onCall({ maxInstances: 10 }, async request => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Sign in to organize your posts.');
  try { return await appendPostToSeries(adminDb, request.auth.uid, request.data?.seriesId, request.data?.postId); }
  catch (error) {
    const message = error instanceof Error ? error.message : '';
    if (message.includes('identifiers')) throw new HttpsError('invalid-argument', message);
    if (message.includes('unavailable') || message.includes('Only your own')) throw new HttpsError('failed-precondition', message);
    throw new HttpsError('internal', 'The post could not be added to this series.');
  }
});

export const listMyContentSeries = onCall({ maxInstances: 10 }, async request => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Sign in to view your content series.');
  try { return await listMyContentSeriesRecord(adminDb, request.auth.uid); }
  catch { throw new HttpsError('unavailable', 'Your content series are temporarily unavailable.'); }
});

export const listMyContentSeriesEpisodes = onCall({ maxInstances: 10 }, async request => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Sign in to view series episodes.');
  try { return await listContentSeriesEpisodes(adminDb, request.auth.uid, request.data?.seriesId); }
  catch (error) {
    const message = error instanceof Error ? error.message : '';
    if (message.includes('identifiers')) throw new HttpsError('invalid-argument', message);
    if (message.includes('unavailable')) throw new HttpsError('not-found', message);
    throw new HttpsError('internal', 'The series episodes could not be loaded.');
  }
});

export const createSocialChallenge = onCall({ maxInstances: 10 }, async request => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Sign in to start a challenge.');
  try { return await createSocialChallengeRecord(adminDb, request.auth.uid, request.data || {}); }
  catch (error) {
    const message = error instanceof Error ? error.message : '';
    if (message.includes('invalid') || message.includes('limits')) throw new HttpsError('invalid-argument', message);
    throw new HttpsError('internal', 'The challenge could not be created. Please retry.');
  }
});

export const joinSocialChallenge = onCall({ maxInstances: 10 }, async request => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Sign in to join a challenge.');
  try { return await joinSocialChallengeRecord(adminDb, request.auth.uid, request.data?.challengeId); }
  catch (error) {
    const message = error instanceof Error ? error.message : '';
    if (message.includes('valid challenge')) throw new HttpsError('invalid-argument', message);
    if (message.includes('closed or unavailable')) throw new HttpsError('failed-precondition', message);
    throw new HttpsError('internal', 'The challenge could not be joined. Please retry.');
  }
});

export const listSocialChallenges = onCall({ maxInstances: 10 }, async request => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Sign in to explore challenges.');
  try { return await listSocialChallengesRecords(adminDb); }
  catch { throw new HttpsError('unavailable', 'Challenges are temporarily unavailable.'); }
});

export const trackSocialChallengePost = onDocumentCreated('posts/{postId}', async event => {
  const post = event.data?.data();
  if (!post || post.audience !== 'public' || typeof post.userId !== 'string') return;
  const source = [post.content, ...(Array.isArray(post.tags) ? post.tags : [])].filter(value => typeof value === 'string').join(' ');
  const matches = [...source.matchAll(/#nxchallenge_([A-Za-z0-9_-]{1,150})/g)];
  for (const match of matches.slice(0, 3)) {
    try { await recordSocialChallengePost(adminDb, post.userId, event.params.postId, match[1]); }
    catch (error) { console.error('[Challenges] Contribution tracking failed.', error); }
  }
});


export const previewReferralInvite = onCall({ maxInstances: 10 }, async request => {
  try { return await getReferralInvitePreview(adminDb, request.data?.code); }
  catch { throw new HttpsError('unavailable', 'This invitation preview is temporarily unavailable.'); }
});

export const createMyReferralCode = onCall({ maxInstances: 10 }, async request => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Sign in to create your referral link.');
  try { return await createReferralCode(adminDb, request.auth.uid); }
  catch (error) {
    const message = error instanceof Error ? error.message : '';
    if (message.includes('not currently available')) throw new HttpsError('failed-precondition', message);
    throw new HttpsError('internal', 'Your referral link could not be created. Please retry.');
  }
});

export const claimMyReferral = onCall({ maxInstances: 10 }, async request => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Sign in to accept a referral.');
  try {
    const identity = await getAuth(getFirebaseAdminApp()).getUser(request.auth.uid);
    const createdAt = Date.parse(identity.metadata.creationTime);
    if (!Number.isFinite(createdAt) || Date.now() - createdAt > 7 * 86400000) {
      throw new HttpsError('failed-precondition', 'Referral invitations can only be applied to newly created accounts.');
    }
    return await claimReferral(adminDb, request.auth.uid, request.data?.code);
  }
  catch (error) {
    const message = error instanceof Error ? error.message : '';
    if (error instanceof HttpsError) throw error;
    if (message.includes('valid referral') || message.includes('own account')) throw new HttpsError('invalid-argument', message);
    if (message.includes('unavailable') || message.includes('reached its limit')) throw new HttpsError('failed-precondition', message);
    throw new HttpsError('internal', 'The referral could not be applied. Please retry.');
  }
});

export const getMyReferralSummary = onCall({ maxInstances: 10 }, async request => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Sign in to view referral activity.');
  try { return await getReferralSummary(adminDb, request.auth.uid); }
  catch { throw new HttpsError('unavailable', 'Referral activity is temporarily unavailable.'); }
});

export const recordDailySession = onCall({ maxInstances: 10 }, async request => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Sign in to record your NEXORA session.');
  try {
    return await createDailySessionRecorder(adminDb)(request.auth.uid);
  } catch (error) {
    console.error('[Retention] Unable to record daily session.', error);
    throw new HttpsError('internal', 'Your session could not be recorded. Please try again.');
  }
});
