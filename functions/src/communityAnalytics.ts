import type { Firestore } from 'firebase-admin/firestore';
import { getFirestore } from 'firebase-admin/firestore';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { getFirebaseAdminApp, resolveFirestoreDatabaseId } from './runtimeConfig.js';

const db = getFirestore(getFirebaseAdminApp(), resolveFirestoreDatabaseId());
const validId = (value: unknown): value is string =>
  typeof value === 'string' && value.length > 0 && value.length <= 150 && !value.includes('/');
const dateOf = (value: unknown): Date | null => {
  if (value instanceof Date) return value;
  const date = (value as { toDate?: () => Date } | null)?.toDate?.();
  return date instanceof Date && Number.isFinite(date.getTime()) ? date : null;
};

export async function getCommunityInsightsForUser(
  store: Firestore,
  uid: string,
  communityId: string,
  now = new Date(),
) {
  if (!uid || !validId(communityId)) throw new HttpsError('invalid-argument', 'A valid Circle is required.');
  const communityRef = store.collection('communities').doc(communityId);
  const memberRef = communityRef.collection('members').doc(uid);
  const [community, member] = await Promise.all([communityRef.get(), memberRef.get()]);
  const role = member.exists ? String(member.get('role') || 'member') : 'member';
  if (!community.exists || !member.exists || member.get('status') !== 'active'
    || !['owner', 'admin', 'moderator'].includes(role)) {
    throw new HttpsError('permission-denied', 'Active Circle managers can view community insights.');
  }

  const start = new Date(now.getTime() - 30 * 86400000);
  const members = communityRef.collection('members');
  const [activeCount, recentMembers, events, polls, announcements] = await Promise.all([
    members.where('status', '==', 'active').count().get(),
    members.orderBy('joinedAt', 'desc').limit(200).get(),
    communityRef.collection('events').orderBy('createdAt', 'desc').limit(100).get(),
    communityRef.collection('polls').orderBy('createdAt', 'desc').limit(100).get(),
    communityRef.collection('announcements').orderBy('createdAt', 'desc').limit(100).get(),
  ]);

  const recentJoins = recentMembers.docs.filter(item => {
    const joinedAt = dateOf(item.get('joinedAt'));
    return item.get('status') === 'active' && joinedAt !== null && joinedAt >= start;
  }).length;
  const eventRows = events.docs.filter(item => {
    const createdAt = dateOf(item.get('createdAt'));
    return createdAt !== null && createdAt >= start;
  });
  const upcomingEvents = events.docs.filter(item => {
    const startsAt = dateOf(item.get('startsAt'));
    return item.get('status') === 'scheduled' && startsAt !== null && startsAt >= now;
  }).length;
  const eventRsvps = eventRows.reduce((sum, item) => {
    const count = Number(item.get('attendeeCount') || 0);
    return sum + (Number.isSafeInteger(count) && count > 0 ? count : 0);
  }, 0);
  const pollRows = polls.docs.filter(item => {
    const createdAt = dateOf(item.get('createdAt'));
    return createdAt !== null && createdAt >= start;
  });
  const pollVotes = pollRows.reduce((sum, item) => {
    const options = item.get('options');
    if (!Array.isArray(options)) return sum;
    return sum + options.reduce((total: number, option: unknown) => {
      const votes = option && typeof option === 'object' ? (option as { votes?: unknown }).votes : 0;
      return total + (Number.isSafeInteger(votes) && Number(votes) > 0 ? Number(votes) : 0);
    }, 0);
  }, 0);
  const announcementCount = announcements.docs.filter(item => {
    const createdAt = dateOf(item.get('createdAt'));
    return createdAt !== null && createdAt >= start;
  }).length;

  return {
    communityId,
    windowDays: 30,
    source: 'server_aggregated_circle_members_events_polls_and_announcements',
    activeMembers: activeCount.data().count,
    recentJoins,
    eventsCreated: eventRows.length,
    upcomingEvents,
    eventRsvps,
    pollsCreated: pollRows.length,
    pollVotes,
    announcementsPublished: announcementCount,
    truncated: {
      members: recentMembers.size === 200,
      events: events.size === 100,
      polls: polls.size === 100,
      announcements: announcements.size === 100,
    },
  };
}

export const getCommunityInsights = onCall({ maxInstances: 10 }, async request => {
  if (!request.auth?.uid) throw new HttpsError('unauthenticated', 'Sign in to view Circle insights.');
  return getCommunityInsightsForUser(db, request.auth.uid, request.data?.communityId);
});
