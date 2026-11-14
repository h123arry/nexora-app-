import { after, before, test as it } from 'node:test';
import assert from 'node:assert/strict';
import { initializeApp, deleteApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getPublicOriginAttributionForViewer } from '../src/originAttributionViewer.js';

const app = initializeApp({ projectId: process.env.GCLOUD_PROJECT || 'demo-nexora-origin-viewer' }, 'origin-attribution-viewer-tests');
const db = getFirestore(app);
const viewerUid = 'origin-viewer-account';
const derivativeOwnerUid = 'origin-viewer-remixer';
const sourceOwnerUid = 'origin-viewer-source';
const derivativePostId = 'origin-viewer-derivative-post';
const derivativeAssetId = 'origin-viewer-derivative-asset';
const sourcePostId = 'origin-viewer-source-post';
const sourceAssetId = 'origin-viewer-source-asset';
const viewerSettings = db.doc(`users/${viewerUid}/settings/preferences`);
const derivativeSettings = db.doc(`users/${derivativeOwnerUid}/settings/preferences`);
const sourceSettings = db.doc(`users/${sourceOwnerUid}/settings/preferences`);
const derivativeOrigin = db.doc(`mediaOrigins/${derivativeAssetId}`);
const sourceOrigin = db.doc(`mediaOrigins/${sourceAssetId}`);
const derivativePost = db.doc(`posts/${derivativePostId}`);
const sourcePost = db.doc(`posts/${sourcePostId}`);

before(async () => {
  assert.ok(process.env.FIRESTORE_EMULATOR_HOST, 'Origin viewer tests require the Firestore Emulator.');
  await Promise.all([
    viewerSettings.set({ messaging: { blockedUserIds: [] }, feed: { blockedCreatorIds: [] } }),
    derivativeSettings.set({ messaging: { blockedUserIds: [] }, feed: { blockedCreatorIds: [] } }),
    sourceSettings.set({ privacy: { isPrivateAccount: false }, messaging: { blockedUserIds: [] }, feed: { blockedCreatorIds: [] } }),
    derivativePost.set({ userId: derivativeOwnerUid, audience: 'public', mediaAssetId: derivativeAssetId }),
    sourcePost.set({ userId: sourceOwnerUid, audience: 'public', username: 'sourcecreator', name: 'Source Creator', avatar: 'https://example.test/avatar.png' }),
    derivativeOrigin.set({ ownerUid: derivativeOwnerUid, mediaGeneration: '2' }),
    sourceOrigin.set({ ownerUid: sourceOwnerUid, mediaGeneration: '1' }),
  ]);
  await derivativeOrigin.collection('events').doc(`derivative_${derivativeAssetId}`).set({
    eventType: 'remix_created',
    parentAttribution: [{ sourceAssetId, creatorUid: sourceOwnerUid, permissionSnapshot: 'allow_with_attribution' }],
  });
});

after(async () => {
  await Promise.all([
    db.recursiveDelete(db.collection('posts')),
    db.recursiveDelete(db.collection('mediaOrigins')),
    db.recursiveDelete(db.collection('users')),
  ]);
  await deleteApp(app);
});

it('returns only the public source identity and no private asset identifiers', async () => {
  const result = await getPublicOriginAttributionForViewer(db, viewerUid, derivativePostId) as any;
  assert.equal(result.hasLineage, true);
  assert.equal(result.sources.length, 1);
  assert.equal(result.sources[0].available, true);
  assert.equal(result.sources[0].postId, sourcePostId);
  assert.equal(result.sources[0].username, 'sourcecreator');
  assert.equal('sourceAssetId' in result.sources[0], false);
  assert.equal('creatorUid' in result.sources[0], false);
});

it('hides sources that become private, follower-only, deleted or ambiguously bound', async t => {
  await t.test('private account', async () => {
    await sourceSettings.set({ privacy: { isPrivateAccount: true } }, { merge: true });
    const result = await getPublicOriginAttributionForViewer(db, viewerUid, derivativePostId) as any;
    assert.equal(result.sources[0].available, false);
    await sourceSettings.set({ privacy: { isPrivateAccount: false } }, { merge: true });
  });
  await t.test('follower-only post', async () => {
    await sourcePost.set({ audience: 'followers' }, { merge: true });
    const result = await getPublicOriginAttributionForViewer(db, viewerUid, derivativePostId) as any;
    assert.equal(result.sources[0].available, false);
    await sourcePost.set({ audience: 'public' }, { merge: true });
  });
  await t.test('deleted post', async () => {
    await sourcePost.set({ deleted: true }, { merge: true });
    const result = await getPublicOriginAttributionForViewer(db, viewerUid, derivativePostId) as any;
    assert.equal(result.sources[0].available, false);
    await sourcePost.set({ deleted: false }, { merge: true });
  });
  await t.test('ambiguous media binding', async () => {
    const duplicate = db.doc('posts/origin-viewer-duplicate-source');
    await duplicate.set({ userId: sourceOwnerUid, audience: 'public', mediaAssetId: sourceAssetId });
    const result = await getPublicOriginAttributionForViewer(db, viewerUid, derivativePostId) as any;
    assert.equal(result.sources[0].available, false);
    await duplicate.delete();
  });
});

it('hides sources when the viewer or source creator blocks the other', async t => {
  await t.test('viewer blocked source', async () => {
    await viewerSettings.set({ feed: { blockedCreatorIds: [sourceOwnerUid] } }, { merge: true });
    const result = await getPublicOriginAttributionForViewer(db, viewerUid, derivativePostId) as any;
    assert.equal(result.sources[0].available, false);
    await viewerSettings.set({ feed: { blockedCreatorIds: [] } }, { merge: true });
  });
  await t.test('source blocks viewer', async () => {
    await sourceSettings.set({ messaging: { blockedUserIds: [viewerUid] } }, { merge: true });
    const result = await getPublicOriginAttributionForViewer(db, viewerUid, derivativePostId) as any;
    assert.equal(result.sources[0].available, false);
    await sourceSettings.set({ messaging: { blockedUserIds: [] } }, { merge: true });
  });
});

it('denies the derivative when it is not public or the viewer is blocked by its creator', async t => {
  await t.test('non-public derivative', async () => {
    await derivativePost.set({ audience: 'followers' }, { merge: true });
    await assert.rejects(getPublicOriginAttributionForViewer(db, viewerUid, derivativePostId), (error: any) => error.code === 'permission-denied');
    await derivativePost.set({ audience: 'public' }, { merge: true });
  });
  await t.test('derivative creator blocks viewer', async () => {
    await derivativeSettings.set({ messaging: { blockedUserIds: [viewerUid] } }, { merge: true });
    await assert.rejects(getPublicOriginAttributionForViewer(db, viewerUid, derivativePostId), (error: any) => error.code === 'permission-denied');
    await derivativeSettings.set({ messaging: { blockedUserIds: [] } }, { merge: true });
  });
});
