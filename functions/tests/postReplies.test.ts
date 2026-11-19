import test from 'node:test';
import assert from 'node:assert/strict';
import { after, before } from 'node:test';
import { initializeApp, deleteApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { addPublicPostCommentReply } from '../src/postReplies.js';

const projectId = process.env.GCLOUD_PROJECT || 'demo-nexora-replies';
const actorId = 'reply-test-actor';
const authorId = 'reply-test-author';
const postId = 'reply-test-post';
const commentId = 'reply-test-comment';
const app = initializeApp({ projectId }, 'post-reply-tests');
const db = getFirestore(app);

before(async () => {
  assert.ok(process.env.FIRESTORE_EMULATOR_HOST, 'Reply tests require the Firestore Emulator.');
  await db.doc(`publicProfiles/${actorId}`).set({ username: actorId, name: 'Reply Actor', avatar: '' });
  await db.doc(`publicProfiles/${authorId}`).set({ username: authorId, name: 'Reply Author', avatar: '' });
  await db.doc('publicProfiles/reply-mentioned').set({ username: 'replymentioned', name: 'Reply Mentioned', avatar: '' });
  await db.doc(`posts/${postId}`).set({
    id: postId, userId: authorId, audience: 'public', likes: 0, commentsCount: 1,
    comments: [{ id: commentId, userId: authorId, content: 'Original comment', replies: [] }],
  });
});

after(async () => {
  await Promise.all([
    db.doc(`posts/${postId}`).delete(),
    db.doc(`publicProfiles/${actorId}`).delete(),
    db.doc(`publicProfiles/${authorId}`).delete(),
    db.doc('publicProfiles/reply-mentioned').delete(),
    db.recursiveDelete(db.collection('users').doc('reply-mentioned').collection('notifications')),
    db.recursiveDelete(db.collection('users').doc(authorId).collection('notifications')),
  ]);
  await deleteApp(app);
});

test('stores a reply on the correct comment and notifies its author', async () => {
  const result = await addPublicPostCommentReply(db, actorId, postId, commentId, 'A thoughtful reply', 'reply-test-id');
  assert.equal(result.created, true);
  assert.equal(result.reply.userId, actorId);
  const snapshot = await db.doc(`posts/${postId}`).get();
  assert.equal(snapshot.get('comments')[0].replies[0].content, 'A thoughtful reply');
  const inbox = await db.collection('users').doc(authorId).collection('notifications').get();
  assert.equal(inbox.size, 1);
  assert.equal(inbox.docs[0].get('userId'), actorId);
  assert.equal(inbox.docs[0].get('actorName'), 'Reply Actor');
});


test('creates a mention notification for a profile tagged in a reply', async () => {
  await addPublicPostCommentReply(db, actorId, postId, commentId, 'Thanks @replymentioned!', 'reply-mention-id');
  const inbox = await db.collection('users').doc('reply-mentioned').collection('notifications').get();
  assert.equal(inbox.size, 1);
  assert.equal(inbox.docs[0].get('type'), 'mention');
  assert.equal(inbox.docs[0].get('userId'), actorId);
  assert.equal(inbox.docs[0].get('actorName'), 'Reply Actor');
});

test('reply retries with the same idempotency key do not duplicate the reply', async () => {
  const first = await addPublicPostCommentReply(db, actorId, postId, commentId, 'A thoughtful reply', 'reply-test-idempotent');
  const second = await addPublicPostCommentReply(db, actorId, postId, commentId, 'A thoughtful reply', 'reply-test-idempotent');
  assert.equal(first.created, true);
  assert.equal(second.created, false);
  assert.equal((await db.doc(`posts/${postId}`).get()).get('comments')[0].replies.length, 2);
});

test('rejects invalid, private, missing and oversized replies', async () => {
  await assert.rejects(addPublicPostCommentReply(db, actorId, postId, commentId, '', 'bad-empty'), /between 1 and 500/);
  await assert.rejects(addPublicPostCommentReply(db, actorId, postId, commentId, 'x'.repeat(501), 'bad-long'), /between 1 and 500/);
  await assert.rejects(addPublicPostCommentReply(db, actorId, postId, 'missing-comment', 'reply', 'missing-comment'), /no longer available/);
  await db.doc(`posts/${postId}`).update({ audience: 'followers' });
  await assert.rejects(addPublicPostCommentReply(db, actorId, postId, commentId, 'reply', 'private'), /unavailable/);
  await db.doc(`posts/${postId}`).update({ audience: 'public' });
});
