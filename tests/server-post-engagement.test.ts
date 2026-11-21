import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { initializeApp, deleteApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { setPostLike } from '../server/postEngagement';

const projectId = process.env.GCLOUD_PROJECT || 'demo-nexora-engagement';
const app = initializeApp({ projectId }, 'render-post-engagement-tests');
const db = getFirestore(app);
const postId = 'render-api-integration-post';
const actorId = 'render-api-integration-actor';
const authorId = 'render-api-integration-author';

before(async () => {
  assert.ok(process.env.FIRESTORE_EMULATOR_HOST, 'Render Spark integration test requires the Firestore Emulator.');
  await Promise.all([
    db.recursiveDelete(db.doc(`posts/${postId}`)),
    db.recursiveDelete(db.doc(`users/${actorId}`)),
    db.recursiveDelete(db.doc(`users/${authorId}`)),
    db.doc(`publicProfiles/${actorId}`).delete(),
    db.doc(`publicProfiles/${authorId}`).delete(),
  ]);
  await Promise.all([
    db.doc(`users/${actorId}`).set({ sparks: 0 }),
    db.doc(`users/${authorId}`).set({ sparks: 0 }),
    db.doc(`publicProfiles/${actorId}`).set({ username: 'render-actor', name: 'Render Actor', avatar: '' }),
    db.doc(`publicProfiles/${authorId}`).set({ username: 'render-author', name: 'Render Author', avatar: '', sparks: 0 }),
    db.doc(`posts/${postId}`).set({ id: postId, userId: authorId, audience: 'public', likes: 0 }),
  ]);
});

after(async () => {
  await Promise.all([
    db.recursiveDelete(db.doc(`posts/${postId}`)),
    db.recursiveDelete(db.doc(`users/${actorId}`)),
    db.recursiveDelete(db.doc(`users/${authorId}`)),
    db.doc(`publicProfiles/${actorId}`).delete(),
    db.doc(`publicProfiles/${authorId}`).delete(),
  ]);
  await deleteApp(app);
});

test('Render Spark transaction persists creator events, counters and notifications atomically', async () => {
  const first = await setPostLike(db, actorId, postId, true);
  assert.deepEqual(first, { liked: true, likes: 1, changed: true });
  assert.equal((await db.doc(`posts/${postId}`).get()).get('likes'), 1);
  assert.equal((await db.doc(`users/${actorId}/postLikes/${postId}`).get()).exists, true);
  assert.equal((await db.doc(`publicProfiles/${authorId}`).get()).get('sparks'), 1);
  assert.equal((await db.doc(`users/${authorId}`).get()).get('sparks'), 1);
  assert.equal((await db.collection('users').doc(authorId).collection('sparkEvents').where('postId', '==', postId).get()).size, 1);
  assert.equal((await db.collection('users').doc(authorId).collection('notifications').where('targetId', '==', postId).get()).size, 1);

  const duplicate = await setPostLike(db, actorId, postId, true);
  assert.deepEqual(duplicate, { liked: true, likes: 1, changed: false });
  assert.equal((await db.collection('users').doc(authorId).collection('notifications').where('targetId', '==', postId).get()).size, 1);

  const removed = await setPostLike(db, actorId, postId, false);
  assert.deepEqual(removed, { liked: false, likes: 0, changed: true });
  assert.equal((await db.doc(`posts/${postId}`).get()).get('likes'), 0);
  assert.equal((await db.doc(`publicProfiles/${authorId}`).get()).get('sparks'), 0);
  assert.equal((await db.collection('users').doc(authorId).collection('sparkEvents').where('postId', '==', postId).get()).size, 0);
});
