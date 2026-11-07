import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { initializeApp, deleteApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { createCirclePostForUser } from '../src/communityPosts.js';
import { getCommunityInsightsForUser } from '../src/communityAnalytics.js';

const projectId = process.env.GCLOUD_PROJECT || 'demo-nexora-community-hub';
const app = initializeApp({ projectId }, 'community-hub-tests');
const db = getFirestore(app);
const now = new Date();

before(async () => {
  assert.ok(process.env.FIRESTORE_EMULATOR_HOST, 'Community hub tests require the Firestore Emulator.');
  await db.recursiveDelete(db.doc('communities/hub-circle'));
  await Promise.all([
    db.doc('publicProfiles/hub-owner').set({ name: 'Hub Owner', username: 'hub-owner', avatar: 'https://cdn.example.test/alice.png' }),
    db.doc('accountStatus/hub-restricted').set({ postingRestricted: true }),
    db.doc('communities/hub-circle').set({ id: 'hub-circle', ownerId: 'hub-owner', type: 'private', bannedUsers: [] }),
    db.doc('communities/hub-circle/members/alice').set({ userId: 'hub-owner', role: 'owner', status: 'active', joinedAt: now }),
    db.doc('communities/hub-circle/members/bob').set({ userId: 'hub-member', role: 'member', status: 'active', joinedAt: now }),
    db.doc('communities/hub-circle/members/mallory').set({ userId: 'hub-restricted', role: 'member', status: 'active', joinedAt: now }),
    db.doc('communities/hub-circle/events/event-1').set({ id: 'event-1', title: 'Creator meetup', status: 'scheduled', createdAt: now, startsAt: new Date(now.getTime() + 86400000), attendeeCount: 4 }),
    db.doc('communities/hub-circle/polls/poll-1').set({ id: 'poll-1', createdAt: now, options: [{ id: 'a', text: 'A', votes: 2 }, { id: 'b', text: 'B', votes: 3 }] }),
    db.doc('communities/hub-circle/announcements/announcement-1').set({ id: 'announcement-1', createdAt: now, title: 'Welcome' }),
  ]);
});

after(async () => {
  await db.recursiveDelete(db.doc('communities/hub-circle'));
  await Promise.all([db.doc('publicProfiles/hub-owner').delete(), db.doc('accountStatus/hub-restricted').delete()]);
  await deleteApp(app);
});

describe('Circle community feed and trusted insights', () => {
  it('creates server-attributed posts only for active, unrestricted members', async () => {
    const result = await createCirclePostForUser(db, 'hub-owner', 'hub-circle', 'A real community update', now);
    const post = await db.doc(`communities/hub-circle/posts/${result.postId}`).get();
    assert.equal(post.get('authorId'), 'hub-owner');
    assert.equal(post.get('authorName'), 'Hub Owner');
    assert.equal(post.get('authorUsername'), 'hub-owner');
    assert.equal(post.get('content'), 'A real community update');
    assert.equal(post.get('status'), 'published');
    await assert.rejects(createCirclePostForUser(db, 'unknown', 'hub-circle', 'Not a member', now), /Join this Circle/);
    await assert.rejects(createCirclePostForUser(db, 'hub-restricted', 'hub-circle', 'Restricted account', now), /cannot publish/);
    await assert.rejects(createCirclePostForUser(db, 'hub-owner', 'hub-circle', ' '.repeat(2), now), /1 and 3,000/);
  });

  it('returns bounded 30-day activity to active Circle managers only', async () => {
    const insights = await getCommunityInsightsForUser(db, 'hub-owner', 'hub-circle', now);
    assert.equal(insights.activeMembers, 3);
    assert.equal(insights.recentJoins, 3);
    assert.equal(insights.eventsCreated, 1);
    assert.equal(insights.upcomingEvents, 1);
    assert.equal(insights.eventRsvps, 4);
    assert.equal(insights.pollsCreated, 1);
    assert.equal(insights.pollVotes, 5);
    assert.equal(insights.announcementsPublished, 1);
    assert.equal(insights.postsPublished, 1);
    await assert.rejects(getCommunityInsightsForUser(db, 'hub-member', 'hub-circle', now), error => error?.code === 'permission-denied');
    await assert.rejects(getCommunityInsightsForUser(db, 'hub-owner', 'missing-circle', now), error => error?.code === 'permission-denied');
  });
});
