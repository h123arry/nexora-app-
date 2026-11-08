import test from 'node:test';
import assert from 'node:assert/strict';
import { after, before } from 'node:test';
import { initializeApp, deleteApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { createPublicPostRepost } from '../src/postReposts.js';

const projectId = process.env.GCLOUD_PROJECT || 'demo-nexora-reposts';
const app = initializeApp({ projectId }, 'post-repost-tests');
const db = getFirestore(app);

before(async () => {
  assert.ok(process.env.FIRESTORE_EMULATOR_HOST, 'Repost tests require the Firestore Emulator.');
  await Promise.all([
    db.recursiveDelete(db.collection('posts')),
    db.recursiveDelete(db.collection('users')),
    db.recursiveDelete(db.collection('publicProfiles')),
  ]);
  await db.doc('publicProfiles/alice').set({ username: 'alice', name: 'Alice', avatar: '', isVerified: false });
  await db.doc('publicProfiles/bob').set({ username: 'bob', name: 'Bob', avatar: '', isVerified: false });
  await db.doc('posts/public-post').set({
    id: 'public-post', userId: 'bob', username: 'bob', name: 'Bob', content: 'Original post',
    audience: 'public', tags: ['nexora'], likes: 0, commentsCount: 0, shares: 0,
    timestamp: new Date().toISOString(), image: 'https://example.test/post.png',
  });
  await db.doc('posts/private-post').set({ id: 'private-post', userId: 'bob', audience: 'followers', shares: 0 });
});

after(async () => {
  await Promise.all([
    db.recursiveDelete(db.collection('posts')),
    db.recursiveDelete(db.collection('users')),
    db.recursiveDelete(db.collection('publicProfiles')),
  ]);
  await deleteApp(app);
});

test('creates an attributed public repost and increments the source share count once', async () => {
  const result = await createPublicPostRepost(db, 'alice', 'public-post');
  assert.equal(result.reposted, true);
  assert.equal(result.shares, 1);
  const repost = await db.doc(`posts/${result.repostPostId}`).get();
  assert.equal(repost.get('userId'), 'alice');
  assert.equal(repost.get('isRepost'), true);
  assert.equal(repost.get('sourcePostId'), 'public-post');
  assert.equal(repost.get('content'), 'Original post');
  assert.equal(repost.get('sourceAuthorUsername'), 'bob');
  assert.equal(repost.get('image'), 'https://example.test/post.png');
  assert.equal((await db.doc('users/alice/postReposts/public-post').get()).exists, true);
  assert.equal((await db.collection('users').doc('bob').collection('notifications').get()).size, 1);
});

test('retries are idempotent and do not create duplicate reposts or inflate counters', async () => {
  const first = await createPublicPostRepost(db, 'alice', 'public-post');
  const second = await createPublicPostRepost(db, 'alice', 'public-post');
  assert.equal(second.repostPostId, first.repostPostId);
  assert.equal(second.shares, first.shares);
  assert.equal((await db.collection('posts').where('isRepost', '==', true).get()).size, 1);
});

test('rejects private, missing and malformed source posts', async () => {
  await assert.rejects(createPublicPostRepost(db, 'alice', 'private-post'), /unavailable/);
  await assert.rejects(createPublicPostRepost(db, 'alice', 'missing-post'), /unavailable/);
  await assert.rejects(createPublicPostRepost(db, 'alice', '../bad'), /Invalid post ID/);
});

test('requires a public profile for a valid author attribution', async () => {
  await assert.rejects(createPublicPostRepost(db, 'unknown', 'public-post'), /public profile/);
});
