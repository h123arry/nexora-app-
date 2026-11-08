import test from 'node:test';
import assert from 'node:assert/strict';
import { after, before } from 'node:test';
import { initializeApp, deleteApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { deletePublicPostComment } from '../src/postCommentDeletion.js';

const projectId = process.env.GCLOUD_PROJECT || 'demo-nexora-comment-deletion';
const postOwnerId = 'comment-delete-owner';
const commentOwnerId = 'comment-delete-author';
const otherUserId = 'comment-delete-other';
const postId = 'comment-delete-post';
const app = initializeApp({ projectId }, 'post-comment-deletion-tests');
const db = getFirestore(app);

before(async () => {
  assert.ok(process.env.FIRESTORE_EMULATOR_HOST, 'Comment deletion tests require the Firestore Emulator.');
  await db.doc(`posts/${postId}`).set({
    id: postId, userId: postOwnerId, audience: 'public', commentsCount: 3,
    comments: [
      { id: 'author-comment', userId: commentOwnerId, username: commentOwnerId, content: 'Own comment', replies: [] },
      { id: 'owner-removable-comment', userId: otherUserId, username: otherUserId, content: 'Another comment', replies: [] },
      { id: 'protected-comment', userId: otherUserId, username: otherUserId, content: 'Protected comment', replies: [] },
    ],
  });
});

after(async () => {
  await db.doc(`posts/${postId}`).delete();
  await deleteApp(app);
});

test('a comment author can delete their own comment durably', async () => {
  const result = await deletePublicPostComment(db, commentOwnerId, postId, 'author-comment');
  assert.deepEqual(result, { deleted: true, commentsCount: 2 });
  const post = await db.doc(`posts/${postId}`).get();
  assert.equal(post.get('comments').some((comment: any) => comment.id === 'author-comment'), false);
});

test('the post owner can delete another user comment', async () => {
  const result = await deletePublicPostComment(db, postOwnerId, postId, 'owner-removable-comment');
  assert.deepEqual(result, { deleted: true, commentsCount: 1 });
});

test('unrelated users cannot delete another person comment', async () => {
  await assert.rejects(deletePublicPostComment(db, 'unrelated-user', postId, 'protected-comment'), /permission/);
  assert.equal((await db.doc(`posts/${postId}`).get()).get('comments').length, 1);
});

test('missing comments and malformed IDs are rejected without changing the post', async () => {
  await assert.rejects(deletePublicPostComment(db, postOwnerId, postId, 'missing-comment'), /no longer available/);
  await assert.rejects(deletePublicPostComment(db, postOwnerId, '../bad', 'protected-comment'), /valid post/);
  assert.equal((await db.doc(`posts/${postId}`).get()).get('commentsCount'), 1);
});
