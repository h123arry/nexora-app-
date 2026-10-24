import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { initializeApp, deleteApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { setPostLike } from '../src/postEngagement.js';

const projectId = process.env.GCLOUD_PROJECT || 'demo-nexora-engagement';
const app = initializeApp({ projectId }, 'post-engagement-tests');
const db = getFirestore(app);

before(async () => {
  assert.ok(process.env.FIRESTORE_EMULATOR_HOST, 'Engagement tests require the Firestore Emulator.');
  await Promise.all([
    db.recursiveDelete(db.collection('posts')),
    db.recursiveDelete(db.collection('users')),
    db.recursiveDelete(db.collection('notifications')),
    db.recursiveDelete(db.collection('publicProfiles')),
  ]);
  await db.doc('publicProfiles/alice').set({ username: 'alice', avatar: 'https://example.test/alice.png' });
  for (let index = 0; index < 12; index += 1) {
    await db.doc(`publicProfiles/user-${index}`).set({ username: `user-${index}`, avatar: '' });
  }
  await db.doc('posts/public-post').set({ id: 'public-post', userId: 'author', audience: 'public', likes: 0 });
  await db.doc('posts/restricted-post').set({ id: 'restricted-post', userId: 'author', audience: 'followers', likes: 3 });
});
after(async () => {
  await Promise.all([
    db.recursiveDelete(db.collection('posts')),
    db.recursiveDelete(db.collection('users')),
    db.recursiveDelete(db.collection('notifications')),
    db.recursiveDelete(db.collection('publicProfiles')),
  ]);
  await deleteApp(app);
});

describe('trusted post engagement', () => {
  it('is idempotent for a requested state and keeps the counter consistent', async () => {
    const liked = await setPostLike(db, 'alice', 'public-post', true);
    assert.deepEqual(liked, { liked: true, likes: 1, changed: true });
    assert.deepEqual(await setPostLike(db, 'alice', 'public-post', true), { liked: true, likes: 1, changed: false });
    assert.deepEqual(await setPostLike(db, 'alice', 'public-post', false), { liked: false, likes: 0, changed: true });
    assert.deepEqual(await setPostLike(db, 'alice', 'public-post', false), { liked: false, likes: 0, changed: false });
    assert.equal((await db.doc('posts/public-post').get()).get('likes'), 0);
    assert.equal((await db.doc('users/alice/postLikes/public-post').get()).exists, false);
    const notifications = await db.collection('notifications').where('userId', '==', 'author').get();
    assert.equal(notifications.size, 1);
    assert.equal(notifications.docs[0].get('username'), 'alice');
  });

  it('serializes concurrent users without lost counter updates', async () => {
    await db.recursiveDelete(db.collection('notifications'));
    const results = await Promise.all(Array.from({ length: 12 }, (_, index) => setPostLike(db, `user-${index}`, 'public-post', true)));
    assert.equal(results.filter(result => result.changed).length, 12);
    assert.equal((await db.doc('posts/public-post').get()).get('likes'), 12);
    const markers = await Promise.all(Array.from({ length: 12 }, (_, index) => db.doc(`users/user-${index}/postLikes/public-post`).get()));
    assert.equal(markers.filter(marker => marker.exists).length, 12);
    const notifications = await db.collection('notifications').where('userId', '==', 'author').get();
    assert.equal(notifications.size, 12);
  });

  it('refuses restricted, missing, and malformed post identifiers without changing counts', async () => {
    await assert.rejects(setPostLike(db, 'alice', 'restricted-post', true), /unavailable/);
    await assert.rejects(setPostLike(db, 'alice', 'absent-post', true), /unavailable/);
    await assert.rejects(setPostLike(db, 'alice', '../bad', true), /Invalid post ID/);
    await assert.rejects(setPostLike(db, '', 'public-post', true), /Authentication/);
    assert.equal((await db.doc('posts/restricted-post').get()).get('likes'), 3);
    assert.equal((await db.doc('posts/public-post').get()).get('likes'), 12);
  });
});
