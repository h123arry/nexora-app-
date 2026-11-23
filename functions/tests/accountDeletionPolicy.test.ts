import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { initializeApp, deleteApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { accountStoragePrefixes, deleteUserOwnedDocuments } from '../src/accountDeletionPolicy.js';

const app = initializeApp({ projectId: process.env.GCLOUD_PROJECT || 'demo-nexora-engagement' }, 'account-deletion-policy-tests');
const db = getFirestore(app);

async function cleanupIdentityFixtures(): Promise<void> {
  for (const userId of ['identity-delete-test', 'identity-delete-other']) {
    const signal = db.collection('identityImpersonationSignals').doc(userId);
    const reporters = await signal.collection('reporters').get();
    for (const reporter of reporters.docs) await reporter.ref.delete();
    await signal.delete().catch(() => undefined);
    for (const collection of ['identityVerificationApplications', 'identityVerificationPrivateSignals', 'verifiedIdentities', 'identityImpersonationCases']) {
      await db.collection(collection).doc(userId).delete().catch(() => undefined);
    }
  }
  for (const id of ['identity-delete-audit', 'identity-delete-audit-unrelated-reviewer']) {
    await db.collection('identityVerificationAuditEvents').doc(id).delete().catch(() => undefined);
  }
  const audit = await db.collection('identityVerificationAuditEvents').where('userId', '==', 'identity-delete-test').get();
  for (const row of audit.docs) await row.ref.delete();
  const reporterRows = await db.collectionGroup('reporters').where('reporterId', '==', 'identity-delete-test').get();
  for (const row of reporterRows.docs) await row.ref.delete();
}

async function cleanupPayoutFixtures(): Promise<void> {
  for (const userId of ['payout-delete-test', 'payout-delete-other']) {
    await db.collection('creatorPayoutBeneficiaries').doc(userId).delete().catch(() => undefined);
    await db.collection('creatorPayoutCompliance').doc(userId).delete().catch(() => undefined);
  }
  for (const id of ['payout-delete-pending', 'payout-delete-submitting', 'payout-delete-unknown', 'payout-delete-approval',
    'payout-delete-success', 'payout-delete-failed', 'payout-delete-reversed', 'payout-delete-other-history']) {
    await db.collection('creatorPayoutRequests').doc(id).delete().catch(() => undefined);
  }
  for (const id of ['payout-delete-audit', 'payout-delete-creator-audit', 'payout-delete-actor-audit']) {
    await db.collection('creatorPayoutAuditEvents').doc(id).delete().catch(() => undefined);
  }
}

async function cleanupOriginFixtures(): Promise<void> {
  for (const userId of ['account-delete-test', 'account-delete-other']) {
    const origins = await db.collection('mediaOrigins').where('ownerUid', '==', userId).get();
    for (const origin of origins.docs) {
      const events = await origin.ref.collection('events').get();
      for (const event of events.docs) await event.ref.delete();
      await origin.ref.delete();
    }
  }
}

before(async () => {
  assert.ok(process.env.FIRESTORE_EMULATOR_HOST, 'Account deletion policy tests require the Firestore Emulator.');
  await cleanupOriginFixtures();
  await db.collection('posts').doc('delete-comment-host-post').delete().catch(() => undefined);
  await cleanupIdentityFixtures();
  await cleanupPayoutFixtures();
  for (const collection of ['mediaAssets', 'academyProgress', 'academyLessonNotes', 'posts']) {
    const rows = await db.collection(collection).where('ownerId', '==', 'account-delete-test').get();
    for (const row of rows.docs) await row.ref.delete();
    const userRows = await db.collection(collection).where('userId', '==', 'account-delete-test').get();
    for (const row of userRows.docs) await row.ref.delete();
  }
});
after(async () => {
  await cleanupOriginFixtures();
  await db.collection('posts').doc('delete-comment-host-post').delete().catch(() => undefined);
  await cleanupIdentityFixtures();
  await cleanupPayoutFixtures();
  for (const collection of ['mediaAssets', 'academyProgress', 'academyLessonNotes', 'posts']) {
    for (const userId of ['account-delete-test', 'account-delete-other']) {
      const rows = await db.collection(collection).where('ownerId', '==', userId).get();
      for (const row of rows.docs) await row.ref.delete();
      const userRows = await db.collection(collection).where('userId', '==', userId).get();
      for (const row of userRows.docs) await row.ref.delete();
    }
  }
  await deleteApp(app);
});

describe('account deletion data and storage scope', () => {
  it('removes user-owned media and Academy records without touching another account', async () => {
    await db.collection('mediaAssets').doc('delete-media').set({ ownerId: 'account-delete-test' });
    await db.collection('academyProgress').doc('delete-progress').set({ userId: 'account-delete-test' });
    await db.collection('academyLessonNotes').doc('delete-note').set({ userId: 'account-delete-test' });
    await db.collection('posts').doc('delete-post').set({ userId: 'account-delete-test' });
    await db.collection('posts').doc('delete-comment-host-post').set({
      userId: 'account-delete-other',
      commentsCount: 3,
      comments: [
        { id: 'deleted-parent-with-replies', userId: 'account-delete-test', username: 'old-user', name: 'Old User', content: 'Private comment content', replies: [
          { id: 'deleted-reply', userId: 'account-delete-test', content: 'Private reply' },
          { id: 'other-reply', userId: 'account-delete-other', content: 'Keep this reply' },
        ] },
        { id: 'other-parent', userId: 'account-delete-other', content: 'Keep this comment', replies: [
          { id: 'deleted-child-reply', userId: 'account-delete-test', content: 'Remove this reply' },
        ] },
        { id: 'deleted-parent-no-replies', userId: 'account-delete-test', content: 'Remove this entirely', replies: [] },
      ],
    });
    const origin = db.collection('mediaOrigins').doc('delete-origin');
    await origin.set({ assetId: 'delete-origin', ownerUid: 'account-delete-test' });
    await origin.collection('events').doc('upload-event').set({ eventType: 'uploaded_to_nexora' });
    await db.collection('mediaAssets').doc('keep-media').set({ ownerId: 'account-delete-other' });
    await db.collection('academyProgress').doc('keep-progress').set({ userId: 'account-delete-other' });
    await db.collection('mediaOrigins').doc('keep-origin').set({ assetId: 'keep-origin', ownerUid: 'account-delete-other' });

    const deleted = await deleteUserOwnedDocuments(db, 'account-delete-test');
    assert.equal(deleted, 6);
    assert.equal((await db.collection('mediaAssets').doc('delete-media').get()).exists, false);
    assert.equal((await db.collection('academyProgress').doc('delete-progress').get()).exists, false);
    assert.equal((await db.collection('academyLessonNotes').doc('delete-note').get()).exists, false);
    assert.equal((await db.collection('posts').doc('delete-post').get()).exists, false);
    const hostPost = await db.collection('posts').doc('delete-comment-host-post').get();
    const remainingComments = hostPost.get('comments');
    assert.equal(hostPost.get('commentsCount'), 2);
    assert.equal(remainingComments.length, 2);
    assert.equal(remainingComments[0].content, 'Comment removed');
    assert.equal(remainingComments[0].userId, '');
    assert.equal(remainingComments[0].username, 'deleted_account');
    assert.deepEqual(remainingComments[0].replies.map((reply: { id: string }) => reply.id), ['other-reply']);
    assert.equal(remainingComments[1].content, 'Keep this comment');
    assert.deepEqual(remainingComments[1].replies, []);
    assert.equal((await db.collection('mediaOrigins').doc('delete-origin').get()).exists, false);
    assert.equal((await db.collection('mediaOrigins').doc('delete-origin').collection('events').get()).size, 0);
    assert.equal((await db.collection('mediaAssets').doc('keep-media').get()).exists, true);
    assert.equal((await db.collection('academyProgress').doc('keep-progress').get()).exists, true);
    assert.equal((await db.collection('mediaOrigins').doc('keep-origin').get()).exists, true);
    assert.equal(await deleteUserOwnedDocuments(db, 'account-delete-test'), 0);
  });

  it('removes private identity evidence and reporter signals while redacting, not deleting, audit history', async () => {
    await db.collection('identityVerificationApplications').doc('identity-delete-test').set({
      userId: 'identity-delete-test', status: 'pending_review', evidenceUrls: ['https://example.test/private']
    });
    await db.collection('identityVerificationPrivateSignals').doc('identity-delete-test').set({
      userId: 'identity-delete-test', evidenceUrlHashes: ['private-hash']
    });
    await db.collection('verifiedIdentities').doc('identity-delete-test').set({
      userId: 'identity-delete-test', status: 'verified', displayName: 'Private Identity'
    });
    await db.collection('identityImpersonationCases').doc('identity-delete-test').set({
      userId: 'identity-delete-test', status: 'open'
    });
    await db.collection('identityImpersonationSignals').doc('identity-delete-test')
      .collection('reporters').doc('reporter-hash').set({
        reporterId: 'identity-delete-other', reportId: 'report-target'
      });
    await db.collection('identityImpersonationSignals').doc('identity-delete-other')
      .collection('reporters').doc('deleted-reporter-hash').set({
        reporterId: 'identity-delete-test', reportId: 'report-reporter'
      });
    await db.collection('identityVerificationAuditEvents').doc('identity-delete-audit').set({
      userId: 'identity-delete-test', reviewerId: 'identity-delete-test', actorId: 'identity-delete-test',
      reviewNote: 'private reviewer note', event: 'identity_reviewed'
    });
    await db.collection('identityVerificationAuditEvents').doc('identity-delete-audit-unrelated-reviewer').set({
      userId: 'identity-delete-test', reviewerId: 'identity-delete-other', actorId: 'identity-delete-other',
      reviewNote: 'private review note', event: 'identity_reviewed'
    });
    await db.collection('securityAuditEvents').doc('session-delete-audit').set({
      userId: 'identity-delete-test', action: 'revoke_all_sessions', status: 'completed'
    });
    await db.collection('identityVerificationApplications').doc('identity-delete-other').set({
      userId: 'identity-delete-other', status: 'pending_review'
    });

    await deleteUserOwnedDocuments(db, 'identity-delete-test');

    for (const collection of ['identityVerificationApplications', 'identityVerificationPrivateSignals', 'verifiedIdentities', 'identityImpersonationCases']) {
      assert.equal((await db.collection(collection).doc('identity-delete-test').get()).exists, false);
    }
    assert.equal((await db.collection('identityImpersonationSignals').doc('identity-delete-test').collection('reporters').get()).size, 0);
    assert.equal((await db.collection('identityImpersonationSignals').doc('identity-delete-other').collection('reporters').get()).size, 0);
    const audit = await db.collection('identityVerificationAuditEvents').doc('identity-delete-audit').get();
    assert.equal(audit.exists, true);
    assert.equal(audit.get('accountDeleted'), true);
    assert.equal(audit.get('reviewNote'), undefined);
    assert.equal(audit.get('userId'), undefined);
    assert.equal(audit.get('reviewerId'), undefined);
    assert.equal(audit.get('actorId'), undefined);
    const unrelatedAudit = await db.collection('identityVerificationAuditEvents').doc('identity-delete-audit-unrelated-reviewer').get();
    assert.equal(unrelatedAudit.get('userId'), undefined);
    assert.equal(unrelatedAudit.get('reviewerId'), 'identity-delete-other');
    assert.equal(unrelatedAudit.get('actorId'), 'identity-delete-other');
    assert.equal(unrelatedAudit.get('reviewNote'), undefined);
    const securityAudit = await db.collection('securityAuditEvents').doc('session-delete-audit').get();
    assert.equal(securityAudit.exists, true);
    assert.equal(securityAudit.get('accountDeleted'), true);
    assert.equal(securityAudit.get('userId'), undefined);
    assert.equal((await db.collection('identityVerificationApplications').doc('identity-delete-other').get()).exists, true);
  });

  it('pauses account deletion during active payouts, then removes bank PII while retaining settlement evidence', async () => {
    await db.collection('creatorPayoutBeneficiaries').doc('payout-delete-test').set({
      creatorId: 'payout-delete-test', providerBeneficiaryRef: 'RCP_test_123',
      accountName: 'Test Creator', accountNumberLast4: '1234', bankName: 'Test Bank', status: 'verified'
    });
    await db.collection('creatorPayoutCompliance').doc('payout-delete-test').set({
      creatorId: 'payout-delete-test', beneficiaryRef: 'RCP_test_123',
      status: 'approved', evidenceReference: 'private-evidence-ref'
    });
    for (const [id, status] of [
      ['payout-delete-pending', 'processing'],
      ['payout-delete-submitting', 'submitting'],
      ['payout-delete-unknown', 'submission_unknown'],
      ['payout-delete-approval', 'awaiting_provider_approval'],
    ] as const) {
      await db.collection('creatorPayoutRequests').doc(id).set({
        creatorId: 'payout-delete-test', reference: id,
        amountNex: 1000, amountKobo: 100000, status, beneficiaryRef: 'RCP_test_123'
      });
    }
    await db.collection('creatorPayoutBeneficiaries').doc('payout-delete-other').set({
      creatorId: 'payout-delete-other', providerBeneficiaryRef: 'RCP_other',
      accountName: 'Other Creator', accountNumberLast4: '9999', bankName: 'Other Bank', status: 'verified'
    });
    await db.collection('creatorPayoutCompliance').doc('payout-delete-other').set({
      creatorId: 'payout-delete-other', beneficiaryRef: 'RCP_other', status: 'approved'
    });
    await db.collection('creatorPayoutRequests').doc('payout-delete-other-history').set({
      creatorId: 'payout-delete-other', reference: 'payout-delete-other-history',
      amountNex: 1000, amountKobo: 100000, status: 'success', beneficiaryRef: 'RCP_other'
    });
    await db.collection('creatorPayoutAuditEvents').doc('payout-delete-audit').set({
      creatorId: 'payout-delete-test', actorId: 'payout-delete-test',
      accountNumberLast4: '1234', bankCode: '058', beneficiaryRef: 'RCP_test_123',
      evidenceReference: 'private-evidence-ref', action: 'beneficiary_verified'
    });
    await db.collection('creatorPayoutAuditEvents').doc('payout-delete-creator-audit').set({
      creatorId: 'payout-delete-test', actorId: 'finance-operator',
      accountNumberLast4: '5678', bankCode: '058', beneficiaryRef: 'RCP_creator_456',
      evidenceReference: 'creator-evidence-ref', action: 'creator_payout_compliance_approved'
    });
    await db.collection('creatorPayoutAuditEvents').doc('payout-delete-actor-audit').set({
      creatorId: 'another-creator', actorId: 'payout-delete-test',
      accountNumberLast4: '9012', bankCode: '011', beneficiaryRef: 'RCP_actor_789',
      evidenceReference: 'actor-evidence-ref', action: 'ngn_payout_policy_updated'
    });

    await assert.rejects(
      deleteUserOwnedDocuments(db, 'payout-delete-test'),
      /payout is still pending provider settlement or reconciliation/
    );
    assert.equal((await db.collection('creatorPayoutBeneficiaries').doc('payout-delete-test').get()).exists, true);
    assert.equal((await db.collection('creatorPayoutCompliance').doc('payout-delete-test').get()).exists, true);

    for (const [id, status] of [
      ['payout-delete-pending', 'success'],
      ['payout-delete-success', 'success'],
      ['payout-delete-failed', 'failed'],
      ['payout-delete-reversed', 'reversed'],
    ] as const) {
      await db.collection('creatorPayoutRequests').doc(id).set({
        creatorId: 'payout-delete-test', reference: id,
        amountNex: 1000, amountKobo: 100000, status
      });
    }
    for (const id of ['payout-delete-submitting', 'payout-delete-unknown', 'payout-delete-approval']) {
      await db.collection('creatorPayoutRequests').doc(id).delete();
    }
    const deleted = await deleteUserOwnedDocuments(db, 'payout-delete-test');
    assert.equal(deleted, 2);

    assert.equal((await db.collection('creatorPayoutBeneficiaries').doc('payout-delete-test').get()).exists, false);
    assert.equal((await db.collection('creatorPayoutCompliance').doc('payout-delete-test').get()).exists, false);
    for (const id of ['payout-delete-pending', 'payout-delete-success', 'payout-delete-failed', 'payout-delete-reversed']) {
      assert.equal((await db.collection('creatorPayoutRequests').doc(id).get()).exists, true);
    }
    assert.equal((await db.collection('creatorPayoutBeneficiaries').doc('payout-delete-other').get()).exists, true);
    assert.equal((await db.collection('creatorPayoutCompliance').doc('payout-delete-other').get()).exists, true);
    assert.equal((await db.collection('creatorPayoutRequests').doc('payout-delete-other-history').get()).get('beneficiaryRef'), 'RCP_other');
    for (const id of ['payout-delete-pending', 'payout-delete-success', 'payout-delete-failed', 'payout-delete-reversed']) {
      assert.equal((await db.collection('creatorPayoutRequests').doc(id).get()).get('beneficiaryRef'), undefined);
    }
    const audit = await db.collection('creatorPayoutAuditEvents').doc('payout-delete-audit').get();
    assert.equal(audit.exists, true);
    assert.equal(audit.get('accountDeleted'), true);
    for (const field of ['creatorId', 'actorId', 'accountNumberLast4', 'bankCode', 'beneficiaryRef', 'evidenceReference']) {
      assert.equal(audit.get(field), undefined);
    }
    const creatorAudit = await db.collection('creatorPayoutAuditEvents').doc('payout-delete-creator-audit').get();
    assert.equal(creatorAudit.get('creatorId'), undefined);
    assert.equal(creatorAudit.get('actorId'), 'finance-operator');
    assert.equal(creatorAudit.get('accountNumberLast4'), undefined);
    assert.equal(creatorAudit.get('beneficiaryRef'), undefined);
    const actorAudit = await db.collection('creatorPayoutAuditEvents').doc('payout-delete-actor-audit').get();
    assert.equal(actorAudit.get('creatorId'), 'another-creator');
    assert.equal(actorAudit.get('actorId'), undefined);
    assert.equal(actorAudit.get('accountNumberLast4'), undefined);
    assert.equal(actorAudit.get('beneficiaryRef'), undefined);
  });

  it('includes processed media renditions in the account storage deletion scope', () => {
    assert.deepEqual(accountStoragePrefixes('creator-123'), [
      'users/creator-123/', 'media/creator-123/', 'processed/creator-123/',
    ]);
    assert.throws(() => accountStoragePrefixes('../other-user'), /valid account ID/);
  });
});
