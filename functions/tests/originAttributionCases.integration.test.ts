import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { getFirestore } from 'firebase-admin/firestore';
import { writeOriginAttributionCaseNotifications } from '../src/originCaseNotifications.js';
import {
  requestMyOriginAttributionCorrection,
  respondToOriginAttributionCorrection,
  disputeOriginAttributionCorrection,
  getMyOriginAttributionPreview,
  listMyOriginAttributionCases,
} from '../src/originAttributionCases.js';
import {
  getOriginAttributionDisputeQueue,
  resolveOriginAttributionDispute,
} from '../src/originCaseOperations.js';
import { getFirebaseAdminApp, resolveFirestoreDatabaseId } from '../src/runtimeConfig.js';

const db = getFirestore(getFirebaseAdminApp(), resolveFirestoreDatabaseId());
const derivativeAssetId = 'origin-attribution-integration-derivative';
const sourceAssetId = 'origin-attribution-integration-source';
const requesterUid = 'origin-attribution-integration-requester';
const sourceCreatorUid = 'origin-attribution-integration-source-creator';
const originRef = db.collection('mediaOrigins').doc(derivativeAssetId);
const eventRef = originRef.collection('events').doc(`derivative_${derivativeAssetId}`);
const auth = (uid: string, token: Record<string, unknown> = {}) => ({ uid, token });
const call = (fn: any, uid: string, data: Record<string, unknown> = {}, token: Record<string, unknown> = {}) =>
  fn.run({ auth: auth(uid, token), data });

before(async () => {
  assert.ok(process.env.FIRESTORE_EMULATOR_HOST, 'Origin attribution integration tests require the Firestore Emulator.');
  await Promise.all([
    originRef.delete().catch(() => undefined),
    eventRef.delete().catch(() => undefined),
    db.collection('originAttributionCases').where('requesterUid', '==', requesterUid).get()
      .then(snapshot => Promise.all(snapshot.docs.map(doc => doc.ref.delete()))),
  ]);
  await originRef.set({ ownerUid: requesterUid, credentialState: 'untrusted', credentialInspection: { validationCodes: ['signingCredential.untrusted'] } });
  await eventRef.set({
    parentAssetIds: [sourceAssetId],
    parentAttribution: [{ sourceAssetId, creatorUid: sourceCreatorUid, permissionSnapshot: 'allow_with_attribution' }],
  });
});

after(async () => {
  const cases = await db.collection('originAttributionCases').where('requesterUid', '==', requesterUid).get();
  await Promise.all([
    ...cases.docs.map(doc => doc.ref.delete()),
    eventRef.delete().catch(() => undefined),
    originRef.delete().catch(() => undefined),
  ]);
});

test('attribution correction, creator response, requester dispute and staff resolution run against Firestore emulator', async () => {
  const preview = await call(getMyOriginAttributionPreview, requesterUid, { assetId: derivativeAssetId });
  assert.equal(preview.hasLineage, true);
  assert.equal(preview.credentialState, 'untrusted');
  assert.deepEqual(preview.attribution, [{
    sourceAssetId, creatorUid: sourceCreatorUid, permissionSnapshot: 'allow_with_attribution',
  }]);

  const submitted = await call(requestMyOriginAttributionCorrection, requesterUid, {
    derivativeAssetId, sourceAssetId, reason: 'The original source creator needs a clearer attribution label.',
  });
  assert.equal(submitted.submitted, true);
  assert.equal(submitted.status, 'open');
  const caseId = submitted.caseId as string;
  const caseRef = db.collection('originAttributionCases').doc(caseId);
  assert.equal((await caseRef.get()).get('sourceCreatorUid'), sourceCreatorUid);

  await assert.rejects(
    call(respondToOriginAttributionCorrection, requesterUid, { caseId, decision: 'accepted', note: 'I am not the source creator.' }),
    /permission-denied|attributed source creator/i,
  );

  await call(respondToOriginAttributionCorrection, sourceCreatorUid, {
    caseId, decision: 'rejected', note: 'The source credit is accurate and should remain unchanged.',
  });
  assert.equal((await caseRef.get()).get('status'), 'rejected');

  await assert.rejects(
    call(disputeOriginAttributionCorrection, sourceCreatorUid, { caseId, reason: 'I am not the original requester disputing this case.' }),
    /permission-denied|original requester/i,
  );
  await call(disputeOriginAttributionCorrection, requesterUid, {
    caseId, reason: 'The source credit still does not identify the original creator clearly enough.',
  });
  assert.equal((await caseRef.get()).get('status'), 'disputed');

  const queue = await call(getOriginAttributionDisputeQueue, 'origin-attribution-reviewer', {}, { role: 'moderator' });
  assert.equal(queue.cases.some((item: { id: string }) => item.id === caseId), true);
  await assert.rejects(
    call(resolveOriginAttributionDispute, requesterUid, { caseId, outcome: 'upheld', note: 'This account is not a reviewer and cannot decide this dispute.' }),
    /permission-denied|authorized moderators/i,
  );
  await call(resolveOriginAttributionDispute, 'origin-attribution-reviewer', {
    caseId, outcome: 'overturned', note: 'The evidence supports a correction to the recorded attribution presentation.',
  }, { role: 'moderator' });

  const finalCase = await caseRef.get();
  assert.equal(finalCase.get('status'), 'resolved');
  assert.equal(finalCase.get('reviewOutcome'), 'overturned');
  assert.equal((await eventRef.get()).get('parentAttribution')[0].creatorUid, sourceCreatorUid,
    'the immutable lineage snapshot must not be rewritten by dispute resolution');

  const requesterCases = await call(listMyOriginAttributionCases, requesterUid);
  assert.equal(requesterCases.cases.some((item: { id: string }) => item.id === caseId), true);
  const sourceCases = await call(listMyOriginAttributionCases, sourceCreatorUid);
  assert.equal(sourceCases.cases.some((item: { id: string }) => item.id === caseId), true);
  await assert.rejects(call(getMyOriginAttributionPreview, sourceCreatorUid, { assetId: derivativeAssetId }),
    /permission-denied|asset owner/i);
});

test('Origin case notification delivery is participant-scoped and idempotent', async () => {
  const caseId = 'origin-attribution-notification-integration';
  const requesterInbox = db.collection('users').doc(requesterUid).collection('notifications');
  const sourceInbox = db.collection('users').doc(sourceCreatorUid).collection('notifications');
  const record = { requesterUid, sourceCreatorUid, status: 'open' };
  try {
    assert.equal(await writeOriginAttributionCaseNotifications(db, caseId, null, record, new Date().toISOString()), 1);
    assert.equal((await sourceInbox.get()).docs.some(item => item.id === `origin_${caseId}_open_request_${sourceCreatorUid}`), true);
    assert.equal((await requesterInbox.get()).docs.some(item => item.id.includes(caseId)), false);

    assert.equal(await writeOriginAttributionCaseNotifications(db, caseId, 'open', record, new Date().toISOString()), 0,
      'retries with an unchanged status must not create another notification');

    assert.equal(await writeOriginAttributionCaseNotifications(db, caseId, 'open', { ...record, status: 'rejected' }, new Date().toISOString()), 1);
    assert.equal((await requesterInbox.get()).docs.some(item => item.id === `origin_${caseId}_rejected_response_${requesterUid}`), true);

    assert.equal(await writeOriginAttributionCaseNotifications(db, caseId, 'disputed', { ...record, status: 'resolved' }, new Date().toISOString()), 2);
    assert.equal((await requesterInbox.get()).docs.some(item => item.id === `origin_${caseId}_resolved_resolution_${requesterUid}`), true);
    assert.equal((await sourceInbox.get()).docs.some(item => item.id === `origin_${caseId}_resolved_resolution_${sourceCreatorUid}`), true);
  } finally {
    const [requester, source] = await Promise.all([requesterInbox.get(), sourceInbox.get()]);
    await Promise.all([...requester.docs, ...source.docs].filter(item => item.id.includes(caseId)).map(item => item.ref.delete()));
  }
});
