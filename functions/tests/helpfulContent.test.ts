import test from 'node:test';
import assert from 'node:assert/strict';
import { after, before } from 'node:test';
import { initializeApp, deleteApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { endorsePublicPostAsHelpful } from '../src/helpfulContent.js';

const projectId = process.env.GCLOUD_PROJECT || 'demo-nexora-helpfulness';
const app = initializeApp({ projectId }, 'helpful-content-tests');
const db = getFirestore(app);
const author = 'helpful-author';
const member = 'helpful-member';
const limitMember = 'helpful-limit-member';
const postId = 'helpful-public-post';

before(async () => {
  assert.ok(process.env.FIRESTORE_EMULATOR_HOST, 'Helpful-content tests require the Firestore Emulator.');
  await db.doc(`posts/${postId}`).set({ userId: author, audience: 'public', helpfulnessCount: 0 });
});

after(async () => {
  await db.doc(`posts/${postId}`).delete();
  await db.recursiveDelete(db.doc(`posts/${postId}`).collection('helpfulnessEndorsements'));
  await db.recursiveDelete(db.doc(`users/${member}`).collection('helpfulnessLimits'));
  await db.recursiveDelete(db.doc(`users/${limitMember}`).collection('helpfulnessLimits'));
  await deleteApp(app);
});

test('one account can endorse a public post once; retries do not inflate the count', async () => {
  assert.deepEqual(await endorsePublicPostAsHelpful(db, member, postId), { endorsed: true, helpfulnessCount: 1, changed: true });
  assert.deepEqual(await endorsePublicPostAsHelpful(db, member, postId), { endorsed: true, helpfulnessCount: 1, changed: false });
  assert.equal((await db.doc(`posts/${postId}`).get()).get('helpfulnessCount'), 1);
});

test('rejects self-endorsement, private posts and malformed IDs', async () => {
  await assert.rejects(endorsePublicPostAsHelpful(db, author, postId), /own post/);
  await db.doc(`posts/${postId}`).update({ audience: 'followers' });
  await assert.rejects(endorsePublicPostAsHelpful(db, member, postId), /unavailable/);
  await assert.rejects(endorsePublicPostAsHelpful(db, '../bad', postId), /valid account/);
});

test('limits daily endorsements to twenty per account', async () => {
  const day = new Date().toISOString().slice(0, 10);
  await db.doc(`users/${limitMember}/helpfulnessLimits/${day}`).set({ count: 20 });
  await db.doc(`posts/${postId}`).update({ audience: 'public' });
  await assert.rejects(endorsePublicPostAsHelpful(db, limitMember, postId), /daily helpfulness endorsement limit/);
});
