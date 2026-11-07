import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { initializeApp, deleteApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { setCreatorFollowStateForUser, recordCreatorProfileVisitForUser } from '../src/creatorAudienceAnalytics.js';

const app = initializeApp({ projectId: process.env.GCLOUD_PROJECT || 'demo-nexora-engagement' }, 'creator-audience-analytics-tests');
const db = getFirestore(app);
const creatorId = 'creator-audience-test-owner';
const followerId = 'creator-audience-test-follower';
const pageId = 'creator-audience-test-page';

before(async () => {
  assert.ok(process.env.FIRESTORE_EMULATOR_HOST, 'Creator audience tests require the Firestore Emulator.');
  await db.doc('follows/' + followerId + '_' + creatorId).delete();
  await db.doc('publicProfiles/' + creatorId).set({ id: creatorId, followers: 4 });
  await db.doc('publicProfiles/' + followerId).set({ id: followerId, following: 2 });
  await db.doc('users/' + creatorId).set({ id: creatorId, followers: 4 });
  await db.doc('users/' + followerId).set({ id: followerId, following: 2 });
  await db.doc('pages/' + pageId).set({ id: pageId, followersCount: 7, ownerId: 'page-owner' });
});

after(async () => {
  await db.doc('follows/' + followerId + '_' + creatorId).delete();
  for (const collectionName of ['creatorAudienceDaily', 'creatorProfileDailyVisitors']) {
    const snap = await db.collection(collectionName).where('creatorId', '==', creatorId).get();
    for (const item of snap.docs) await item.ref.delete();
  }
  await db.doc('publicProfiles/' + creatorId).delete();
  await db.doc('publicProfiles/' + followerId).delete();
  await db.doc('users/' + creatorId).delete();
  await db.doc('users/' + followerId).delete();
  await db.doc('pages/' + pageId).delete();
  await deleteApp(app);
});

describe('Creator audience analytics', () => {
  it('updates follow edges, public/private counters and daily growth exactly once', async () => {
    const day = new Date('2026-11-07T12:00:00.000Z');
    const followed = await setCreatorFollowStateForUser(db, followerId, creatorId, true, day);
    assert.equal(followed.changed, true);
    assert.equal(followed.followerCount, 5);
    assert.equal((await db.doc('follows/' + followerId + '_' + creatorId).get()).exists, true);
    assert.equal((await db.doc('publicProfiles/' + creatorId).get()).get('followers'), 5);
    assert.equal((await db.doc('users/' + followerId).get()).get('following'), 3);

    const duplicateFollow = await setCreatorFollowStateForUser(db, followerId, creatorId, true, day);
    assert.equal(duplicateFollow.changed, false);
    assert.equal((await db.doc('publicProfiles/' + creatorId).get()).get('followers'), 5);

    const unfollowed = await setCreatorFollowStateForUser(db, followerId, creatorId, false, new Date('2026-11-07T13:00:00.000Z'));
    assert.equal(unfollowed.changed, true);
    assert.equal(unfollowed.followerCount, 4);
    assert.equal((await db.doc('follows/' + followerId + '_' + creatorId).get()).exists, false);
    assert.equal((await db.doc('publicProfiles/' + creatorId).get()).get('followers'), 4);
    assert.equal((await db.doc('users/' + followerId).get()).get('following'), 2);

    const duplicateUnfollow = await setCreatorFollowStateForUser(db, followerId, creatorId, false, day);
    assert.equal(duplicateUnfollow.changed, false);
    const daily = await db.collection('creatorAudienceDaily').where('creatorId', '==', creatorId).where('day', '==', '2026-11-07').get();
    assert.equal(daily.size, 1);
    assert.equal(daily.docs[0].get('follows'), 1);
    assert.equal(daily.docs[0].get('unfollows'), 1);
    assert.equal(daily.docs[0].get('netFollowerChange'), 0);
  });

  it('preserves Page follows and updates Page follower totals', async () => {
    const followed = await setCreatorFollowStateForUser(db, followerId, pageId, true);
    assert.equal(followed.changed, true);
    assert.equal(followed.followerCount, 8);
    assert.equal((await db.doc('pages/' + pageId).get()).get('followersCount'), 8);
    const unfollowed = await setCreatorFollowStateForUser(db, followerId, pageId, false);
    assert.equal(unfollowed.followerCount, 7);
    assert.equal((await db.doc('pages/' + pageId).get()).get('followersCount'), 7);
  });

  it('rejects self-follows and follows to profiles that do not exist', async () => {
    await assert.rejects(setCreatorFollowStateForUser(db, followerId, followerId, true), /valid creator/);
    await assert.rejects(setCreatorFollowStateForUser(db, followerId, 'missing-creator', true), /This creator or Page is unavailable/);
  });

  it('counts signed-in profile visitors once per creator per UTC day', async () => {
    const day = new Date('2026-11-06T15:00:00.000Z');
    const first = await recordCreatorProfileVisitForUser(db, 'visitor-one', creatorId, day);
    const duplicate = await recordCreatorProfileVisitForUser(db, 'visitor-one', creatorId, new Date('2026-11-06T20:00:00.000Z'));
    const second = await recordCreatorProfileVisitForUser(db, 'visitor-two', creatorId, day);
    assert.equal(first.recorded, true);
    assert.equal(duplicate.recorded, false);
    assert.equal(second.recorded, true);
    const daily = await db.collection('creatorAudienceDaily').where('creatorId', '==', creatorId).where('day', '==', '2026-11-06').get();
    assert.equal(daily.size, 1);
    assert.equal(daily.docs[0].get('profileVisits'), 2);
    assert.equal(daily.docs[0].get('uniqueProfileVisitors'), 2);
    await assert.rejects(recordCreatorProfileVisitForUser(db, 'visitor-one', 'visitor-one', day), /valid public creator profile/);
  });
});
