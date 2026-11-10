import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { initializeApp, deleteApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { createHash } from 'node:crypto';
import { searchNexoraContent, syncUniversalSearchRecord } from '../src/universalSearch.js';

const app = initializeApp({ projectId: process.env.GCLOUD_PROJECT || 'demo-nexora-search' }, 'universal-search-tests');
const db = getFirestore(app);
const paths = ['viewer','public-user','private-user','blocked-user'];
before(async () => {
  assert.ok(process.env.FIRESTORE_EMULATOR_HOST, 'Universal search tests require the Firestore Emulator.');
  await Promise.all(paths.map(id => db.doc('users/' + id).delete().catch(() => undefined)));
  await db.doc('users/viewer').set({ username: 'viewer' });
  await db.doc('users/public-user').set({ username: 'nexora_creator', name: 'Nexora Creator', bio: 'Building social video' });
  await db.doc('users/private-user').set({ username: 'nexora_private', name: 'Nexora Private' });
  await db.doc('users/private-user/settings/preferences').set({ privacy: { isPrivate: true } });
  await db.doc('users/blocked-user').set({ username: 'nexora_blocked', name: 'Nexora Blocked' });
  await db.doc('users/blocked-user/settings/preferences').set({ privacy: { blockedUserIds: ['viewer'] } });
  await db.doc('users/viewer/settings/preferences').set({ privacy: { blockedUserIds: [] }, messaging: { blockedUserIds: [] } });
  await db.doc('posts/public-video').set({ id:'public-video', userId:'public-user', content:'Nexora video discovery', audience:'public', mediaType:'video', timestamp:new Date(), tags:['nexora','design'], likes:24 });
  await db.doc('posts/private-post').set({ id:'private-post', userId:'private-user', content:'Nexora private content', audience:'public', timestamp:new Date(), tags:['nexora'] });
  await db.doc('posts/blocked-post').set({ id:'blocked-post', userId:'blocked-user', content:'Nexora blocked content', audience:'public', timestamp:new Date(), tags:['nexora'] });
  await syncUniversalSearchRecord(db,'person','public-user','users/public-user',(await db.doc('users/public-user').get()).data()!);
  await syncUniversalSearchRecord(db,'person','private-user','users/private-user',(await db.doc('users/private-user').get()).data()!);
  await syncUniversalSearchRecord(db,'person','blocked-user','users/blocked-user',(await db.doc('users/blocked-user').get()).data()!);
  await syncUniversalSearchRecord(db,'video','public-video','posts/public-video',(await db.doc('posts/public-video').get()).data()!);
  await syncUniversalSearchRecord(db,'post','private-post','posts/private-post',(await db.doc('posts/private-post').get()).data()!);
  await syncUniversalSearchRecord(db,'post','blocked-post','posts/blocked-post',(await db.doc('posts/blocked-post').get()).data()!);
});
after(async () => {
  for (const [kind, path] of [['person','users/public-user'],['person','users/private-user'],['person','users/blocked-user'],['video','posts/public-video'],['post','posts/private-post'],['post','posts/blocked-post']]) {
    const id = kind + '_' + createHash('sha256').update(path).digest('hex');
    await db.doc('searchIndex/' + id).delete().catch(() => undefined);
  }
  await db.recursiveDelete(db.doc('users/private-user')).catch(() => undefined);
  await db.recursiveDelete(db.doc('users/blocked-user')).catch(() => undefined);
  await db.recursiveDelete(db.doc('users/viewer')).catch(() => undefined);
  await db.doc('posts/public-video').delete().catch(() => undefined);
  await db.doc('posts/private-post').delete().catch(() => undefined);
  await db.doc('posts/blocked-post').delete().catch(() => undefined);
  await db.recursiveDelete(db.doc('users/public-user')).catch(() => undefined);
  await deleteApp(app);
});
describe('NEXORA universal search', () => {
  it('indexes and returns public people and video content while respecting blocks and private profiles', async () => {
    const result = await searchNexoraContent(db,'viewer','nexora');
    assert.ok(result.results.some(hit => hit.kind === 'person' && hit.targetId === 'public-user'));
    assert.ok(result.results.some(hit => hit.kind === 'video' && hit.targetId === 'public-video'));
    assert.ok(!result.results.some(hit => hit.targetId === 'private-user' || hit.targetId === 'blocked-user' || hit.targetId === 'private-post' || hit.targetId === 'blocked-post'));
  });
  it('returns hashtag discoveries from matching public posts', async () => {
    const result = await searchNexoraContent(db,'viewer','nexora');
    assert.ok(result.results.some(hit => hit.kind === 'hashtag' && hit.targetId === 'nexora'));
  });
  it('uses typo fallback for a one-character search misspelling', async () => {
    const result = await searchNexoraContent(db,'viewer','nexorra');
    assert.ok(result.results.some(hit => hit.targetId === 'public-video'));
  });
  it('rejects unauthenticated, short and malformed cursor requests', async () => {
    await assert.rejects(searchNexoraContent(db,'','nexora'),/Sign in/);
    await assert.rejects(searchNexoraContent(db,'viewer','x'),/between 2 and 80/);
    await assert.rejects(searchNexoraContent(db,'viewer','nexora','invalid-cursor'),/cursor is invalid/);
  });
});
