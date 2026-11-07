import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { initializeApp, deleteApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { applyCreatorFollowEvent } from '../src/creatorAudienceAnalytics.js';

const app = initializeApp({ projectId: process.env.GCLOUD_PROJECT || 'demo-nexora-engagement' }, 'creator-audience-analytics-tests');
const db = getFirestore(app);
const creatorId = 'creator-audience-test-owner';
const followerId = 'creator-audience-test-follower';
const followId = followerId + '_' + creatorId;
const hash = (value: string) => createHash('sha256').update(value).digest('hex').slice(0, 40);

before(async () => {
  assert.ok(process.env.FIRESTORE_EMULATOR_HOST, 'Creator audience tests require the Firestore Emulator.');
  await db.doc('follows/' + followId).delete();
  await db.doc('publicProfiles/' + creatorId).set({ id: creatorId, followers: 4 });
  await db.doc('publicProfiles/' + followerId).set({ id: followerId, following: 2 });
  await db.doc('users/' + creatorId).set({ id: creatorId, followers: 4 });
  await db.doc('users/' + followerId).set({ id: followerId, following: 2 });
});

after(async () => {
  await db.doc('follows/' + followId).delete();
  for (const collectionName of ['creatorAudienceEventReceipts', 'creatorFollowProjections', 'creatorAudienceDaily']) {
    const snap = await db.collection(collectionName).where(collectionName === 'creatorAudienceEventReceipts' ? 'creatorId' : 'creatorId', '==', creatorId).get().catch(() => null);
    if (snap) for (const item of snap.docs) await item.ref.delete();
  }
  await db.doc('publicProfiles/' + creatorId).delete();
  await db.doc('publicProfiles/' + followerId).delete();
  await db.doc('users/' + creatorId).delete();
  await db.doc('users/' + followerId).delete();
  await deleteApp(app);
});

describe('Creator audience analytics', () => {
  it('reconciles follow and unfollow edges exactly once and updates trusted counters', async () => {
    await db.doc('follows/' + followId).set({ followerId, followingId: creatorId });
    const created = await applyCreatorFollowEvent(db, 'follow-created-event-1', followId, { followerId, followingId: creatorId }, 'created', new Date('2026-11-07T12:00:00.000Z'));
    assert.equal(created.changed, true);
    assert.equal((await db.doc('publicProfiles/' + creatorId).get()).get('followers'), 5);
    assert.equal((await db.doc('users/' + followerId).get()).get('following'), 3);

    const duplicate = await applyCreatorFollowEvent(db, 'follow-created-event-1', followId, { followerId, followingId: creatorId }, 'created', new Date('2026-11-07T12:00:00.000Z'));
    assert.equal(duplicate.reason, 'duplicate-event');
    assert.equal((await db.doc('publicProfiles/' + creatorId).get()).get('followers'), 5);

    await db.doc('follows/' + followId).delete();
    const removed = await applyCreatorFollowEvent(db, 'follow-deleted-event-1', followId, { followerId, followingId: creatorId }, 'deleted', new Date('2026-11-07T13:00:00.000Z'));
    assert.equal(removed.changed, true);
    assert.equal((await db.doc('publicProfiles/' + creatorId).get()).get('followers'), 4);
    assert.equal((await db.doc('users/' + followerId).get()).get('following'), 2);

    const daily = await db.collection('creatorAudienceDaily').where('creatorId', '==', creatorId).where('day', '==', '2026-11-07').get();
    assert.equal(daily.size, 1);
    assert.equal(daily.docs[0].get('follows'), 1);
    assert.equal(daily.docs[0].get('unfollows'), 1);
    assert.equal(daily.docs[0].get('netFollowerChange'), 0);
  });

  it('does not count stale create events after the relationship has already been removed', async () => {
    const staleId = 'stale_' + creatorId;
    await db.doc('follows/' + staleId).set({ followerId: 'stale-follower', followingId: creatorId });
    await db.doc('follows/' + staleId).delete();
    const result = await applyCreatorFollowEvent(db, 'stale-create-event', staleId, { followerId: 'stale-follower', followingId: creatorId }, 'created');
    assert.equal(result.changed, false);
  });
});
