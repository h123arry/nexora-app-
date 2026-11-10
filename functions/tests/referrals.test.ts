import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { initializeApp, deleteApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { claimReferral, createReferralCode, getReferralSummary, qualifyReferral } from '../src/referrals.js';

const projectId = process.env.GCLOUD_PROJECT || 'demo-nexora-referrals';
const app = initializeApp({ projectId }, 'referral-engine-tests');
const db = getFirestore(app);
const config = db.doc('referralProgramConfig/current');
const promo = db.doc('nexWallets/referral_promo_pool');

before(async () => {
  assert.ok(process.env.FIRESTORE_EMULATOR_HOST, 'Referral tests require the Firestore Emulator.');
  await config.set({ enabled: true, rewardNex: 25, maxSuccessfulReferrals: 10 });
  await promo.set({ availableBalance: 1000 });
});
after(async () => {
  const [codes, attributions] = await Promise.all([
    db.collection('referralCodes').get(), db.collection('referralAttributions').get(),
  ]);
  await Promise.all([
    ...codes.docs.filter(doc => doc.get('ownerId') === 'referrer-a').map(doc => doc.ref.delete()),
    ...attributions.docs.filter(doc => ['invitee-a', 'invitee-b'].includes(doc.id)).map(doc => doc.ref.delete()),
    db.doc('posts/qualifying-post-a').delete(),
    db.doc('nexWallets/referrer-a').delete(),
    db.doc('nexWallets/referral_promo_pool').delete(),
    config.delete(),
  ]);
  const ledger = await db.collection('nexLedgerTransactions').where('type', '==', 'referral_reward').get();
  await Promise.all(ledger.docs.map(async doc => {
    const entries = await db.collection('nexLedgerEntries').where('transactionId', '==', doc.id).get();
    await Promise.all(entries.docs.map(entry => entry.ref.delete()));
    await db.collection('nexLedgerRequests').doc(String(doc.get('idempotencyKey'))).delete();
    await doc.ref.delete();
  }));
  await deleteApp(app);
});

describe('trusted referral programme', () => {
  it('stores only a digest, prevents self-referrals and allows one attribution per account', async () => {
    const { code } = await createReferralCode(db, 'referrer-a');
    const digest = (await db.collection('referralCodes').get()).docs.find(doc => doc.get('ownerId') === 'referrer-a');
    assert.ok(digest);
    assert.notEqual(digest!.id, code);
    await assert.rejects(claimReferral(db, 'referrer-a', code), /own account/);
    assert.deepEqual(await claimReferral(db, 'invitee-a', code), { claimed: true });
    assert.deepEqual(await claimReferral(db, 'invitee-a', code), { claimed: false });
    assert.equal((await db.doc('referralAttributions/invitee-a').get()).get('status'), 'pending');
  });

  it('qualifies only verified invitees with their own public post and posts a balanced NEX reward once', async () => {
    const { code } = await createReferralCode(db, 'referrer-a');
    await claimReferral(db, 'invitee-b', code);
    await db.doc('posts/qualifying-post-a').set({ id: 'qualifying-post-a', userId: 'invitee-b', audience: 'public' });
    await assert.rejects(qualifyReferral(db, 'invitee-b', false, 'qualifying-post-a'), /verified account/);
    await db.doc('nexWallets/referrer-a').set({ availableBalance: 5 });
    assert.deepEqual(await qualifyReferral(db, 'invitee-b', true, 'qualifying-post-a'), { qualified: true, rewardNex: 25 });
    assert.deepEqual(await qualifyReferral(db, 'invitee-b', true, 'qualifying-post-a'), { qualified: false, rewardNex: 0 });
    assert.equal((await db.doc('nexWallets/referrer-a').get()).get('availableBalance'), 30);
    assert.equal((await promo.get()).get('availableBalance'), 975);
    assert.equal((await db.collection('nexLedgerEntries').where('transactionId', '==',
      'ref_' + (await import('node:crypto')).createHash('sha256').update('invitee-b').digest('hex').slice(0, 48)).get()).size, 2);
    assert.deepEqual(await getReferralSummary(db, 'referrer-a'), {
      codeCount: 2, totalInvites: 2, pending: 1, qualified: 1, rewardsNex: 25,
    });
  });

  it('fails closed when promotional treasury funding is insufficient', async () => {
    const { code } = await createReferralCode(db, 'referrer-a');
    await claimReferral(db, 'invitee-a', code);
    await db.doc('posts/qualifying-post-a').set({ id: 'qualifying-post-a', userId: 'invitee-a', audience: 'public' });
    await promo.set({ availableBalance: 0 });
    await assert.rejects(qualifyReferral(db, 'invitee-a', true, 'qualifying-post-a'), /Insufficient NEX balance/);
    assert.equal((await db.doc('referralAttributions/invitee-a').get()).get('status'), 'pending');
  });
});
