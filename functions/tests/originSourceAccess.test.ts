import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { initializeApp, deleteApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { assertCrossAccountOriginSourceAccess } from '../src/originSourceAccess.js';

const app = initializeApp({ projectId: 'demo-nexora-origin-source' }, 'origin-source-access-emulator');
const db = getFirestore(app);
const sourceAssetId = 'origin-source-access-asset';
const sourcePost = db.collection('posts').doc('origin-source-access-post');
const sourcePrefs = db.collection('users').doc('origin-source-access-source').collection('settings').doc('preferences');
const derivativePrefs = db.collection('users').doc('origin-source-access-derivative').collection('settings').doc('preferences');
const input = {
  derivativeOwnerUid: 'origin-source-access-derivative',
  sourceOwnerUid: 'origin-source-access-source',
  sourceAssetId,
};

async function assertAllowed() {
  await db.runTransaction(tx => assertCrossAccountOriginSourceAccess(db, tx, input));
}
async function assertDenied() {
  await assert.rejects(assertAllowed());
}

before(async () => {
  await Promise.all([
    sourcePost.set({ mediaAssetId: sourceAssetId, userId: input.sourceOwnerUid, audience: 'public', status: 'published' }),
    sourcePrefs.set({ privacy: { isPrivateAccount: false }, messaging: { blockedUserIds: [] }, feed: { blockedCreatorIds: [] } }),
    derivativePrefs.set({ privacy: { isPrivateAccount: false }, messaging: { blockedUserIds: [] }, feed: { blockedCreatorIds: [] } }),
  ]);
});

after(async () => {
  await Promise.all([
    db.recursiveDelete(db.collection('posts')),
    db.recursiveDelete(db.collection('users')),
  ]);
  await deleteApp(app);
});

test('cross-account Origin source authorization uses live Firestore records', async t => {
  await t.test('allows one explicitly public source post when neither account blocks the other', async () => {
    await assertAllowed();
  });

  await t.test('rejects private source accounts', async () => {
    await sourcePrefs.set({ privacy: { isPrivateAccount: true } }, { merge: true });
    await assertDenied();
    await sourcePrefs.set({ privacy: { isPrivateAccount: false } }, { merge: true });
  });

  await t.test('rejects follower-only and other non-public source posts', async () => {
    await sourcePost.set({ audience: 'followers' }, { merge: true });
    await assertDenied();
    await sourcePost.set({ audience: 'public' }, { merge: true });
  });

  await t.test('rejects a block in either direction', async () => {
    await sourcePrefs.set({ feed: { blockedCreatorIds: [input.derivativeOwnerUid] } }, { merge: true });
    await assertDenied();
    await sourcePrefs.set({ feed: { blockedCreatorIds: [] } }, { merge: true });
    await derivativePrefs.set({ messaging: { blockedUserIds: [input.sourceOwnerUid] } }, { merge: true });
    await assertDenied();
    await derivativePrefs.set({ messaging: { blockedUserIds: [] } }, { merge: true });
  });

  await t.test('rejects ambiguous media-to-post bindings', async () => {
    const duplicate = db.collection('posts').doc('origin-source-access-duplicate');
    await duplicate.set({ mediaAssetId: sourceAssetId, userId: input.sourceOwnerUid, audience: 'public' });
    await assertDenied();
    await duplicate.delete();
  });

  await t.test('rejects a post whose owner does not match the recorded source creator', async () => {
    await sourcePost.set({ userId: 'different-account' }, { merge: true });
    await assertDenied();
    await sourcePost.set({ userId: input.sourceOwnerUid }, { merge: true });
  });
});
