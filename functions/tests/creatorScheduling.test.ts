import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { initializeApp, deleteApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import {
  createCreatorSchedule,
  cancelCreatorSchedule,
  publishDueCreatorSchedules,
} from '../src/creatorScheduling.js';

const projectId = process.env.GCLOUD_PROJECT || 'demo-nexora-creator-scheduling';
const app = initializeApp({ projectId }, 'creator-scheduling-tests');
const db = getFirestore(app);
const fixedNow = Date.parse('2026-11-07T12:00:00.000Z');

before(async () => {
  assert.ok(process.env.FIRESTORE_EMULATOR_HOST, 'Creator scheduling tests require the Firestore Emulator.');
  await db.recursiveDelete(db.collection('creatorScheduledPosts'));
  await db.recursiveDelete(db.collection('posts'));
  await db.doc('publicProfiles/alice').set({
    id: 'alice', username: 'alice', name: 'Alice Creator', avatar: 'https://cdn.example.test/alice.png', isVerified: true,
  });
  await db.doc('publicProfiles/bob').set({ id: 'bob', username: 'bob', name: 'Bob Creator', avatar: '' });
});

after(async () => {
  await db.recursiveDelete(db.collection('creatorScheduledPosts'));
  await db.recursiveDelete(db.collection('posts'));
  await db.recursiveDelete(db.doc('publicProfiles/alice'));
  await db.recursiveDelete(db.doc('publicProfiles/bob'));
  await db.recursiveDelete(db.doc('accountStatus/alice'));
  await db.recursiveDelete(db.doc('accountStatus/bob'));
  await deleteApp(app);
});

describe('trusted Creator Studio scheduled publishing', () => {
  it('validates content, HTTPS media and a bounded future publishing time', async () => {
    await assert.rejects(createCreatorSchedule(db, 'alice', {
      content: 'Hello', scheduledAt: new Date(fixedNow + 60_000).toISOString(),
    }, fixedNow), /at least five minutes/);
    await assert.rejects(createCreatorSchedule(db, 'alice', {
      content: 'Hello', imageUrl: 'http://cdn.example.test/image.png',
      scheduledAt: new Date(fixedNow + 600_000).toISOString(),
    }, fixedNow), /HTTPS URL/);
    await assert.rejects(createCreatorSchedule(db, 'alice', {
      content: '', scheduledAt: new Date(fixedNow + 600_000).toISOString(),
    }, fixedNow), /Add post text or media/);
  });

  it('creates owner-scoped schedules and prevents other creators from cancelling them', async () => {
    const created = await createCreatorSchedule(db, 'alice', {
      content: 'A scheduled update', tags: ['#NEXORA', 'creator'],
      scheduledAt: new Date(fixedNow + 600_000).toISOString(),
    }, fixedNow);
    const record = await db.doc('creatorScheduledPosts/' + created.scheduleId).get();
    assert.equal(record.get('ownerId'), 'alice');
    assert.equal(record.get('status'), 'scheduled');
    assert.deepEqual(record.get('tags'), ['NEXORA', 'creator']);
    await assert.rejects(cancelCreatorSchedule(db, 'bob', created.scheduleId), /cannot cancel another creator/);
    assert.deepEqual(await cancelCreatorSchedule(db, 'alice', created.scheduleId), { cancelled: true });
    assert.equal((await db.doc('creatorScheduledPosts/' + created.scheduleId).get()).get('status'), 'cancelled');
  });

  it('publishes due posts exactly once using trusted profile identity and zeroed engagement', async () => {
    const created = await createCreatorSchedule(db, 'alice', {
      content: 'Launch day', imageUrl: 'https://cdn.example.test/launch.png',
      tags: ['launch'], scheduledAt: new Date(fixedNow + 600_000).toISOString(),
    }, fixedNow);
    const dueTime = new Date(fixedNow + 11 * 60_000);
    assert.deepEqual(await publishDueCreatorSchedules(db, dueTime), { checked: 1, published: 1, blocked: 0 });
    assert.deepEqual(await publishDueCreatorSchedules(db, dueTime), { checked: 0, published: 0, blocked: 0 });
    const schedule = await db.doc('creatorScheduledPosts/' + created.scheduleId).get();
    const post = await db.doc('posts/' + schedule.get('publishedPostId')).get();
    assert.equal(schedule.get('status'), 'published');
    assert.equal(post.get('userId'), 'alice');
    assert.equal(post.get('username'), 'alice');
    assert.equal(post.get('isVerified'), true);
    assert.equal(post.get('audience'), 'public');
    assert.equal(post.get('image'), 'https://cdn.example.test/launch.png');
    assert.equal(post.get('likes'), 0);
    assert.equal(post.get('views'), 0);
    assert.equal(post.get('commentsCount'), 0);
  });

  it('blocks publication when the creator is suspended at delivery time', async () => {
    await db.doc('accountStatus/bob').set({ suspended: true });
    const created = await createCreatorSchedule(db, 'bob', {
      content: 'This should not publish',
      scheduledAt: new Date(fixedNow + 600_000).toISOString(),
    }, fixedNow);
    const result = await publishDueCreatorSchedules(db, new Date(fixedNow + 11 * 60_000));
    assert.equal(result.blocked, 1);
    assert.equal((await db.doc('creatorScheduledPosts/' + created.scheduleId).get()).get('status'), 'blocked');
    assert.equal((await db.doc('posts/scheduled-' + created.scheduleId).get()).exists, false);
  });
});
