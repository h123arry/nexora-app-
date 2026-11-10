import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { initializeApp, deleteApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { createHash } from 'node:crypto';
import { getNexoraTrending, searchNexoraContent, syncUniversalSearchRecord } from '../src/universalSearch.js';

const app = initializeApp({ projectId: process.env.GCLOUD_PROJECT || 'demo-nexora-search' }, 'universal-search-tests');
const db = getFirestore(app);
const paths = ['viewer','public-user','private-user','blocked-user'];
before(async () => {
  assert.ok(process.env.FIRESTORE_EMULATOR_HOST, 'Universal search tests require the Firestore Emulator.');
  await Promise.all(paths.map(id => db.doc('users/' + id).delete().catch(() => undefined)));
  await db.doc('users/viewer').set({ username: 'viewer', interestDNA: { design: 1 } });
  await db.doc('users/public-user').set({ username: 'nexora_creator', name: 'Nexora Creator', bio: 'Building social video' });
  await db.doc('users/private-user').set({ username: 'nexora_private', name: 'Nexora Private' });
  await db.doc('users/private-user/settings/preferences').set({ privacy: { isPrivate: true } });
  await db.doc('users/blocked-user').set({ username: 'nexora_blocked', name: 'Nexora Blocked' });
  await db.doc('users/creator-two').set({ username: 'creator_two', name: 'Creator Two' });
  await db.doc('users/blocked-user/settings/preferences').set({ privacy: { blockedUserIds: ['viewer'] } });
  await db.doc('users/viewer/settings/preferences').set({ privacy: { blockedUserIds: [] }, messaging: { blockedUserIds: [] } });
  await db.doc('communities/search-circle').set({ id:'search-circle', type:'public', name:'Nexora Public Circle', description:'Public discovery space', bannedUsers:[] });
  await db.doc('posts/public-video').set({ id:'public-video', userId:'public-user', content:'Nexora video discovery', audience:'public', mediaType:'video', timestamp:new Date(), tags:['nexora','design'], likes:24 });
  await db.doc('posts/private-post').set({ id:'private-post', userId:'private-user', content:'Nexora private content', audience:'public', timestamp:new Date(), tags:['nexora'] });
  await db.doc('posts/blocked-post').set({ id:'blocked-post', userId:'blocked-user', content:'Nexora blocked content', audience:'public', timestamp:new Date(), tags:['nexora'] });
  await db.doc('follows/viewer_creator-two').set({ followerId:'viewer', followingId:'creator-two', createdAt:new Date() });
  await db.doc('posts/followed-video').set({ id:'followed-video', userId:'creator-two', content:'Nexora video discovery', audience:'public', mediaType:'video', timestamp:new Date(), tags:['community'], likes:2 });
  await db.doc('posts/trend-a').set({ id:'trend-a', userId:'public-user', content:'A trending design post', audience:'public', timestamp:new Date(), tags:['trending'], likes:20 });
  await db.doc('posts/trend-b').set({ id:'trend-b', userId:'creator-two', content:'Another trending design post', audience:'public', timestamp:new Date(), tags:['trending'], likes:15 });
  await db.doc('posts/private-trend-a').set({ id:'private-trend-a', userId:'private-user', content:'Private-only trend', audience:'public', timestamp:new Date(), tags:['private-only'] });
  await db.doc('posts/private-trend-b').set({ id:'private-trend-b', userId:'private-user', content:'Private-only trend', audience:'public', timestamp:new Date(), tags:['private-only'] });
  await syncUniversalSearchRecord(db,'person','public-user','users/public-user',(await db.doc('users/public-user').get()).data()!);
  await syncUniversalSearchRecord(db,'person','private-user','users/private-user',(await db.doc('users/private-user').get()).data()!);
  await syncUniversalSearchRecord(db,'person','blocked-user','users/blocked-user',(await db.doc('users/blocked-user').get()).data()!);
  await syncUniversalSearchRecord(db,'video','public-video','posts/public-video',(await db.doc('posts/public-video').get()).data()!);
  await syncUniversalSearchRecord(db,'post','private-post','posts/private-post',(await db.doc('posts/private-post').get()).data()!);
  await syncUniversalSearchRecord(db,'post','blocked-post','posts/blocked-post',(await db.doc('posts/blocked-post').get()).data()!);
  await syncUniversalSearchRecord(db,'video','followed-video','posts/followed-video',(await db.doc('posts/followed-video').get()).data()!);
  await syncUniversalSearchRecord(db,'circle','search-circle','communities/search-circle',(await db.doc('communities/search-circle').get()).data()!);
});
after(async () => {
  for (const [kind, path] of [['person','users/public-user'],['person','users/private-user'],['person','users/blocked-user'],['video','posts/public-video'],['video','posts/followed-video'],['post','posts/private-post'],['post','posts/blocked-post']]) {
    const id = kind + '_' + createHash('sha256').update(path).digest('hex');
    await db.doc('searchIndex/' + id).delete().catch(() => undefined);
  }
  await db.recursiveDelete(db.doc('users/private-user')).catch(() => undefined);
  await db.recursiveDelete(db.doc('users/blocked-user')).catch(() => undefined);
  await db.recursiveDelete(db.doc('users/viewer')).catch(() => undefined);
  await db.doc('posts/public-video').delete().catch(() => undefined);
  await db.doc('posts/private-post').delete().catch(() => undefined);
  await db.doc('posts/blocked-post').delete().catch(() => undefined);
  await db.doc('posts/followed-video').delete().catch(() => undefined);
  await db.doc('follows/viewer_creator-two').delete().catch(() => undefined);
  for (const id of ['trend-a','trend-b','private-trend-a','private-trend-b']) await db.doc('posts/' + id).delete().catch(() => undefined);
  await db.recursiveDelete(db.doc('users/creator-two')).catch(() => undefined);
  await db.recursiveDelete(db.doc('users/public-user')).catch(() => undefined);
  await db.doc('searchIndex/circle_' + createHash('sha256').update('communities/search-circle').digest('hex')).delete().catch(() => undefined);
  await db.doc('communities/search-circle').delete().catch(() => undefined);
  await deleteApp(app);
});
describe('NEXORA universal search', () => {
  it('indexes and returns public people and video content while respecting blocks and private profiles', async () => {
    const result = await searchNexoraContent(db,'viewer','nexora');
    assert.ok(result.results.some(hit => hit.kind === 'person' && hit.targetId === 'public-user'));
    assert.ok(result.results.some(hit => hit.kind === 'video' && hit.targetId === 'public-video'));
    assert.ok(!result.results.some(hit => hit.targetId === 'private-user' || hit.targetId === 'blocked-user' || hit.targetId === 'private-post' || hit.targetId === 'blocked-post'));
  });
  it('does not index non-public posts or invite-only Circles', async () => {
    await db.doc('posts/friends-only').set({ id:'friends-only', userId:'public-user', content:'Nexora friends only', audience:'followers', timestamp:new Date() });
    await db.doc('communities/invite-circle').set({ id:'invite-circle', type:'invite-only', name:'Nexora Invite Circle' });
    await syncUniversalSearchRecord(db,'post','friends-only','posts/friends-only',(await db.doc('posts/friends-only').get()).data()!);
    await syncUniversalSearchRecord(db,'circle','invite-circle','communities/invite-circle',(await db.doc('communities/invite-circle').get()).data()!);
    const postIndexId = 'post_' + createHash('sha256').update('posts/friends-only').digest('hex');
    const circleIndexId = 'circle_' + createHash('sha256').update('communities/invite-circle').digest('hex');
    assert.equal((await db.doc('searchIndex/' + postIndexId).get()).exists, false);
    assert.equal((await db.doc('searchIndex/' + circleIndexId).get()).exists, false);
    await db.doc('posts/friends-only').delete();
    await db.doc('communities/invite-circle').delete();
  });
  it('rechecks Circle visibility at query time after a Circle becomes private', async () => {
    const before = await searchNexoraContent(db,'viewer','nexora');
    assert.ok(before.results.some(hit => hit.kind === 'circle' && hit.targetId === 'search-circle'));
    await db.doc('communities/search-circle').update({ type: 'invite-only' });
    const afterPrivacyChange = await searchNexoraContent(db,'viewer','nexora');
    assert.ok(!afterPrivacyChange.results.some(hit => hit.targetId === 'search-circle'));
  });
  it('boosts followed creators in personalized search ranking', async () => {
    const result = await searchNexoraContent(db,'viewer','nexora video');
    const videos = result.results.filter(hit => hit.kind === 'video');
    assert.equal(videos[0]?.targetId, 'followed-video');
  });
  it('returns hashtag discoveries from matching public posts', async () => {
    const result = await searchNexoraContent(db,'viewer','nexora');
    assert.ok(result.results.some(hit => hit.kind === 'hashtag' && hit.targetId === 'nexora'));
  });
  it('uses typo fallback for a one-character search misspelling', async () => {
    const result = await searchNexoraContent(db,'viewer','nexorra');
    assert.ok(result.results.some(hit => hit.targetId === 'public-video'));
  });
  it('calculates platform trends across distinct public creators and ignores private creators', async () => {
    const trends = await getNexoraTrending(db);
    assert.ok(trends.some(item => item.tag === 'trending' && item.postCount === 2 && item.creatorCount === 2));
    assert.ok(!trends.some(item => item.tag === 'private only'));
  });
  it('rejects unauthenticated, short and malformed cursor requests', async () => {
    await assert.rejects(searchNexoraContent(db,'','nexora'),/Sign in/);
    await assert.rejects(searchNexoraContent(db,'viewer','x'),/between 2 and 80/);
    await assert.rejects(searchNexoraContent(db,'viewer','nexora','invalid-cursor'),/cursor is invalid/);
  });
});
