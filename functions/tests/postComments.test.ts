import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { initializeApp, deleteApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { addPublicPostComment } from '../src/postComments.js';

const app = initializeApp({ projectId: process.env.GCLOUD_PROJECT || 'demo-nexora-post-comments' }, 'post-comment-tests');
const db = getFirestore(app);
const postIds = ['comment-post-public', 'comment-post-disabled', 'comment-post-private'];

before(async () => {
  assert.ok(process.env.FIRESTORE_EMULATOR_HOST, 'Post comment tests require the Firestore Emulator.');
  await Promise.all([
    db.doc('publicProfiles/author').set({ username: 'author', name: 'Post Author', avatar: 'https://cdn.example.com/author.webp' }),
    db.doc('publicProfiles/commenter').set({ username: 'commenter', name: 'Commenter', avatar: 'https://cdn.example.com/commenter.webp' }),
  ]);
  await db.doc('posts/comment-post-public').set({
    id: 'comment-post-public', userId: 'author', audience: 'public', commentsCount: 0, comments: [],
  });
  await db.doc('posts/comment-post-disabled').set({
    id: 'comment-post-disabled', userId: 'author', audience: 'public', commentsDisabled: true, commentsCount: 0, comments: [],
  });
  await db.doc('posts/comment-post-private').set({
    id: 'comment-post-private', userId: 'author', audience: 'followers', commentsCount: 0, comments: [],
  });
});

after(async () => {
  const notifications = await db.collection('users').doc('author').collection('notifications').get();
  await Promise.all(notifications.docs.map(doc => doc.ref.delete()));
  for (const postId of postIds) await db.doc(`posts/${postId}`).delete();
  await Promise.all(['author', 'commenter'].map(id => db.doc(`publicProfiles/${id}`).delete()));
  await deleteApp(app);
});

describe('trusted public post comments', () => {
  it('creates the comment and the post owner inbox notification atomically', async () => {
    const result = await addPublicPostComment(db, 'commenter', 'comment-post-public', 'Great post!', 'comment-1');
    assert.equal(result.created, true);
    assert.equal(result.commentsCount, 1);
    assert.equal(result.comment.username, 'commenter');
    const post = await db.doc('posts/comment-post-public').get();
    assert.equal(post.get('comments').length, 1);
    assert.equal(post.get('commentsCount'), 1);
    const notifications = await db.collection('users').doc('author').collection('notifications').get();
    assert.equal(notifications.size, 1);
    assert.equal(notifications.docs[0].get('type'), 'comment');
    assert.equal(notifications.docs[0].get('userId'), 'commenter');
    assert.equal(notifications.docs[0].get('targetId'), 'comment-post-public');
  });

  it('is idempotent when the same client comment ID is retried', async () => {
    const first = await addPublicPostComment(db, 'commenter', 'comment-post-public', 'Retry safely', 'comment-retry');
    const replay = await addPublicPostComment(db, 'commenter', 'comment-post-public', 'Retry safely', 'comment-retry');
    assert.equal(first.created, true);
    assert.equal(replay.created, false);
    assert.equal(replay.commentsCount, 2);
    const post = await db.doc('posts/comment-post-public').get();
    assert.equal(post.get('comments').filter((comment: { id: string }) => comment.id === 'comment-retry').length, 1);
    const notifications = await db.collection('users').doc('author').collection('notifications').get();
    assert.equal(notifications.size, 2);
  });

  it('rejects private or disabled posts and does not notify for self-comments', async () => {
    await assert.rejects(addPublicPostComment(db, 'commenter', 'comment-post-private', 'Hello', 'private-comment'), /unavailable/);
    await assert.rejects(addPublicPostComment(db, 'commenter', 'comment-post-disabled', 'Hello', 'disabled-comment'), /disabled/);
    const self = await addPublicPostComment(db, 'author', 'comment-post-public', 'My own note', 'self-comment');
    assert.equal(self.created, true);
    const notifications = await db.collection('users').doc('author').collection('notifications').get();
    assert.equal(notifications.size, 2);
  });
});
