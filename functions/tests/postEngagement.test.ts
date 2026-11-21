import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { initializeApp, deleteApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { setPostLike } from '../src/postEngagement.js';
import { setPostLike as setServerPostLike } from '../../server/postEngagement.js';

const projectId = process.env.GCLOUD_PROJECT || 'demo-nexora-engagement';
const app = initializeApp({ projectId }, 'post-engagement-tests');
const db = getFirestore(app);

before(async () => {
  assert.ok(process.env.FIRESTORE_EMULATOR_HOST, 'Engagement tests require the Firestore Emulator.');
  const fixtureUsers = ['author', 'alice', 'author-missing-projection', 'deleted-author', ...Array.from({ length: 12 }, (_, index) => `user-${index}`)];
  const fixturePosts = ['public-post', 'restricted-post', 'public-post-missing-projection', 'public-post-orphan-author', 'server-api-post'];
  await Promise.all([
    ...fixturePosts.map(id => db.recursiveDelete(db.doc(`posts/${id}`))),
    ...fixtureUsers.map(id => db.recursiveDelete(db.doc(`users/${id}`))),
    ...fixtureUsers.map(id => db.doc(`publicProfiles/${id}`).delete()),
  ]);
  await db.doc('publicProfiles/author').set({ username: 'author', name: 'Author', avatar: '', sparks: 0 });
  await db.doc('users/author').set({ sparks: 0 });
  await db.doc('publicProfiles/alice').set({ username: 'alice', avatar: 'https://example.test/alice.png' });
  for (let index = 0; index < 12; index += 1) {
    await db.doc(`publicProfiles/user-${index}`).set({ username: `user-${index}`, avatar: '' });
  }
  await db.doc('posts/public-post').set({ id: 'public-post', userId: 'author', audience: 'public', likes: 0 });
  await db.doc('posts/server-api-post').set({ id: 'server-api-post', userId: 'author', audience: 'public', likes: 0 });
  await db.doc('posts/restricted-post').set({ id: 'restricted-post', userId: 'author', audience: 'followers', likes: 3 });
  await db.doc('users/author-missing-projection').set({ id: 'author-missing-projection', username: 'missing-projection', name: 'Missing Projection', avatar: '', sparks: 2, followers: 1, following: 0 });
  await db.doc('posts/public-post-missing-projection').set({ id: 'public-post-missing-projection', userId: 'author-missing-projection', audience: 'public', likes: 0 });
  await db.doc('posts/public-post-orphan-author').set({ id: 'public-post-orphan-author', userId: 'deleted-author', audience: 'public', likes: 0 });
});
after(async () => {
  const fixtureUsers = ['author', 'alice', 'author-missing-projection', 'deleted-author', ...Array.from({ length: 12 }, (_, index) => `user-${index}`)];
  const fixturePosts = ['public-post', 'restricted-post', 'public-post-missing-projection', 'public-post-orphan-author'];
  await Promise.all([
    ...fixturePosts.map(id => db.recursiveDelete(db.doc(`posts/${id}`))),
    ...fixtureUsers.map(id => db.recursiveDelete(db.doc(`users/${id}`))),
    ...fixtureUsers.map(id => db.doc(`publicProfiles/${id}`).delete()),
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
    assert.equal((await db.doc('publicProfiles/author').get()).get('sparks'), 0);
    assert.equal((await db.doc('users/author').get()).get('sparks'), 0);
    assert.equal((await db.collection('users/author/sparkEvents').get()).size, 0);
    const notifications = await db.collection('users').doc('author').collection('notifications').get();
    assert.equal(notifications.size, 1);
    assert.equal(notifications.docs[0].get('username'), 'alice');
    assert.equal(notifications.docs[0].get('userId'), 'alice');
    assert.equal(notifications.docs[0].get('type'), 'spark');
    assert.equal(notifications.docs[0].get('content'), 'sparked your post.');
  });


  it('Render API Spark transaction persists the same creator records and counters', async () => {
    const result = await setServerPostLike(db, 'alice', 'server-api-post', true);
    assert.deepEqual(result, { liked: true, likes: 1, changed: true });
    assert.equal((await db.doc('posts/server-api-post').get()).get('likes'), 1);
    assert.equal((await db.doc('users/alice/postLikes/server-api-post').get()).exists, true);
    assert.equal((await db.doc('users/author/sparkEvents').where('postId', '==', 'server-api-post').get()).size, 1);
    assert.equal((await db.doc('publicProfiles/author').get()).get('sparks'), 1);
    const notifications = await db.collection('users').doc('author').collection('notifications').where('targetId', '==', 'server-api-post').get();
    assert.equal(notifications.size, 1);
    assert.equal((await setServerPostLike(db, 'alice', 'server-api-post', true)).changed, false);
  });

  it('records Sparks and repairs the creator projection when a public profile is missing', async () => {
    const result = await setPostLike(db, 'alice', 'public-post-missing-projection', true);
    assert.deepEqual(result, { liked: true, likes: 1, changed: true });
    assert.equal((await db.doc('users/author-missing-projection/sparkEvents/' + (await import('node:crypto')).createHash('sha256').update('alice:public-post-missing-projection').digest('hex').slice(0, 48)).get()).exists, true);
    const projection = (await db.doc('publicProfiles/author-missing-projection').get()).data() || {};
    assert.equal(projection.sparks, 3);
    assert.equal(projection.username, 'missing-projection');
    assert.equal((await db.doc('users/author-missing-projection').get()).get('sparks'), 3);
  });

  it('does not create a ghost public profile for a deleted post author', async () => {
    const result = await setPostLike(db, 'alice', 'public-post-orphan-author', true);
    assert.deepEqual(result, { liked: true, likes: 1, changed: true });
    assert.equal((await db.doc('publicProfiles/deleted-author').get()).exists, false);
    assert.equal((await db.doc('users/deleted-author').get()).exists, false);
    assert.equal((await db.collection('users/deleted-author/sparkEvents').get()).size, 1);
  });

  it('serializes concurrent users without lost counter updates', async () => {
    await db.recursiveDelete(db.collection('users').doc('author').collection('notifications'));
    const results = await Promise.all(Array.from({ length: 12 }, (_, index) => setPostLike(db, `user-${index}`, 'public-post', true)));
    assert.equal(results.filter(result => result.changed).length, 12);
    assert.equal((await db.doc('posts/public-post').get()).get('likes'), 12);
    assert.equal((await db.doc('publicProfiles/author').get()).get('sparks'), 12);
    assert.equal((await db.doc('users/author').get()).get('sparks'), 12);
    assert.equal((await db.collection('users/author/sparkEvents').get()).size, 12);
    const markers = await Promise.all(Array.from({ length: 12 }, (_, index) => db.doc(`users/user-${index}/postLikes/public-post`).get()));
    assert.equal(markers.filter(marker => marker.exists).length, 12);
    const notifications = await db.collection('users').doc('author').collection('notifications').get();
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
