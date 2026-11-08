import test from 'node:test';
import assert from 'node:assert/strict';
import { after, before } from 'node:test';
import { initializeApp, deleteApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { setPublicPostCommentLike } from '../src/postCommentReactions.js';

const projectId = process.env.GCLOUD_PROJECT || 'demo-nexora-comment-reactions';
const actorId = 'comment-reaction-actor';
const authorId = 'comment-reaction-author';
const postId = 'comment-reaction-post';
const commentId = 'comment-reaction-comment';
const app = initializeApp({ projectId }, 'post-comment-reaction-tests');
const db = getFirestore(app);

before(async () => {
  assert.ok(process.env.FIRESTORE_EMULATOR_HOST, 'Comment reaction tests require the Firestore Emulator.');
  await db.doc(`publicProfiles/${actorId}`).set({ username: actorId, name: 'Reaction Actor', avatar: '' });
  await db.doc(`publicProfiles/${authorId}`).set({ username: authorId, name: 'Reaction Author', avatar: '' });
  await db.doc(`posts/${postId}`).set({
    id: postId, userId: authorId, audience: 'public', comments: [
      { id: commentId, userId: authorId, content: 'Original comment', likes: 0 },
    ],
  });
});

after(async () => {
  await Promise.all([
    db.doc(`posts/${postId}`).delete(),
    db.doc(`publicProfiles/${actorId}`).delete(),
    db.doc(`publicProfiles/${authorId}`).delete(),
    db.recursiveDelete(db.collection('users').doc(actorId).collection('commentLikes')),
    db.recursiveDelete(db.collection('users').doc(authorId).collection('notifications')),
  ]);
  await deleteApp(app);
});

test('comment reactions are idempotent and maintain the server-authoritative count', async () => {
  assert.deepEqual(await setPublicPostCommentLike(db, actorId, postId, commentId, true), { liked: true, likes: 1, changed: true });
  assert.deepEqual(await setPublicPostCommentLike(db, actorId, postId, commentId, true), { liked: true, likes: 1, changed: false });
  assert.equal((await db.collection('users').doc(authorId).collection('notifications').get()).size, 1);
  assert.deepEqual(await setPublicPostCommentLike(db, actorId, postId, commentId, false), { liked: false, likes: 0, changed: true });
  assert.deepEqual(await setPublicPostCommentLike(db, actorId, postId, commentId, false), { liked: false, likes: 0, changed: false });
  assert.equal((await db.doc(`posts/${postId}`).get()).get('comments')[0].likes, 0);
});

test('rejects missing, private and malformed comment targets', async () => {
  await assert.rejects(setPublicPostCommentLike(db, actorId, postId, 'missing-comment', true), /no longer available/);
  await assert.rejects(setPublicPostCommentLike(db, actorId, '../bad', commentId, true), /valid post/);
  await db.doc(`posts/${postId}`).update({ audience: 'followers' });
  await assert.rejects(setPublicPostCommentLike(db, actorId, postId, commentId, true), /unavailable/);
});
