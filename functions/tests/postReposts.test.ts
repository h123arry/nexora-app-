import test from 'node:test';
import assert from 'node:assert/strict';
import { after, before } from 'node:test';
import { initializeApp, deleteApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { createPublicPostRepost } from '../src/postReposts.js';

const projectId = process.env.GCLOUD_PROJECT || 'demo-nexora-reposts';
const actorId = 'repost-test-actor';
const authorId = 'repost-test-author';
const sourcePostId = 'repost-test-public-source';
const privatePostId = 'repost-test-private-source';
const quoteSourcePostId = 'repost-test-quote-source';
const createdRepostIds = new Set<string>();
const app = initializeApp({ projectId }, 'post-repost-tests');
const db = getFirestore(app);

before(async () => {
  assert.ok(process.env.FIRESTORE_EMULATOR_HOST, 'Repost tests require the Firestore Emulator.');
  await db.doc(`publicProfiles/${actorId}`).set({ username: actorId, name: 'Repost Actor', avatar: '', isVerified: false });
  await db.doc(`publicProfiles/${authorId}`).set({ username: authorId, name: 'Repost Author', avatar: '', isVerified: false });
  await db.doc(`posts/${sourcePostId}`).set({
    id: sourcePostId, userId: authorId, username: authorId, name: 'Repost Author', content: 'Original post',
    audience: 'public', tags: ['nexora'], likes: 0, commentsCount: 0, shares: 0,
    timestamp: new Date().toISOString(), image: 'https://example.test/post.png',
  });
  await db.doc(`posts/${privatePostId}`).set({ id: privatePostId, userId: authorId, audience: 'followers', shares: 0 });
  await db.doc(`posts/${quoteSourcePostId}`).set({ id: quoteSourcePostId, userId: authorId, username: authorId, name: 'Repost Author', content: 'Original quote source', audience: 'public', tags: [], shares: 0 });
});

after(async () => {
  await Promise.all([
    db.doc(`posts/${sourcePostId}`).delete(),
    db.doc(`posts/${privatePostId}`).delete(),
    db.doc(`posts/${quoteSourcePostId}`).delete(),
    db.doc(`users/${actorId}/postReposts/${quoteSourcePostId}`).delete(),
    db.doc(`publicProfiles/${actorId}`).delete(),
    db.doc(`publicProfiles/${authorId}`).delete(),
    db.doc(`users/${actorId}/postReposts/${sourcePostId}`).delete(),
    db.recursiveDelete(db.collection('users').doc(authorId).collection('notifications')),
    ...Array.from(createdRepostIds, id => db.doc(`posts/${id}`).delete()),
  ]);
  await deleteApp(app);
});

test('creates an attributed public repost and increments the source share count once', async () => {
  const result = await createPublicPostRepost(db, actorId, sourcePostId);
  assert.equal(result.reposted, true);
  assert.equal(result.shares, 1);
  createdRepostIds.add(result.repostPostId);
  const repost = await db.doc(`posts/${result.repostPostId}`).get();
  assert.equal(repost.get('userId'), actorId);
  assert.equal(repost.get('isRepost'), true);
  assert.equal(repost.get('sourcePostId'), sourcePostId);
  assert.equal(repost.get('content'), 'Original post');
  assert.equal(repost.get('sourceAuthorUsername'), authorId);
  assert.equal(repost.get('image'), 'https://example.test/post.png');
  assert.equal((await db.doc(`users/${actorId}/postReposts/${sourcePostId}`).get()).exists, true);
  assert.equal((await db.collection('users').doc(authorId).collection('notifications').get()).size, 1);
});

test('retries are idempotent and do not create duplicate reposts or inflate counters', async () => {
  const first = await createPublicPostRepost(db, actorId, sourcePostId);
  const second = await createPublicPostRepost(db, actorId, sourcePostId);
  assert.equal(second.repostPostId, first.repostPostId);
  assert.equal(second.shares, first.shares);
  assert.equal((await db.collection('posts').where('sourcePostId', '==', sourcePostId).get()).size, 1);
});


test('creates a quote repost while preserving the original creator and source text', async () => {
  const result = await createPublicPostRepost(db, actorId, quoteSourcePostId, 'My perspective on this.');
  createdRepostIds.add(result.repostPostId);
  const repost = await db.doc(`posts/${result.repostPostId}`).get();
  assert.equal(repost.get('isQuoteRepost'), true);
  assert.equal(repost.get('quoteText'), 'My perspective on this.');
  assert.equal(repost.get('content'), 'My perspective on this.');
  assert.equal(repost.get('sourcePostContent'), 'Original quote source');
  assert.equal(repost.get('sourceAuthorUsername'), authorId);
});

test('rejects private, missing and malformed source posts', async () => {
  await assert.rejects(createPublicPostRepost(db, actorId, privatePostId), /unavailable/);
  await assert.rejects(createPublicPostRepost(db, actorId, 'repost-test-missing-source'), /unavailable/);
  await assert.rejects(createPublicPostRepost(db, actorId, '../bad'), /Invalid post ID/);
});

test('requires a public profile for a valid author attribution', async () => {
  await assert.rejects(createPublicPostRepost(db, 'repost-test-unknown', sourcePostId), /public profile/);
});
