import assert from 'node:assert/strict';
import test from 'node:test';
import { canResolveOriginDispute, isOriginReviewer, originCaseNotificationRecipients } from '../functions/src/originCaseOperationsPolicy.ts';

test('Origin dispute review requires a trusted reviewer claim', () => {
  assert.equal(isOriginReviewer({ role: 'moderator' }), true);
  assert.equal(isOriginReviewer({ admin: true }), true);
  assert.equal(isOriginReviewer({ role: 'user', moderator: false }), false);
  assert.equal(isOriginReviewer(undefined), false);
});

test('only disputed cases can be resolved with supported outcomes', () => {
  assert.equal(canResolveOriginDispute('disputed', 'upheld'), true);
  assert.equal(canResolveOriginDispute('disputed', 'overturned'), true);
  assert.equal(canResolveOriginDispute('open', 'upheld'), false);
  assert.equal(canResolveOriginDispute('resolved', 'overturned'), false);
  assert.equal(canResolveOriginDispute('disputed', 'dismiss'), false);
});

test('case transitions notify only the appropriate participants', () => {
  const base = { requesterUid: 'requester', sourceCreatorUid: 'source' };
  assert.deepEqual(originCaseNotificationRecipients({ ...base, status: 'open' }), [{ uid: 'source', kind: 'request' }]);
  assert.deepEqual(originCaseNotificationRecipients({ ...base, status: 'rejected' }), [{ uid: 'requester', kind: 'response' }]);
  assert.deepEqual(originCaseNotificationRecipients({ ...base, status: 'disputed' }), [{ uid: 'source', kind: 'dispute' }]);
  assert.deepEqual(originCaseNotificationRecipients({ ...base, status: 'resolved' }), [
    { uid: 'requester', kind: 'resolution' }, { uid: 'source', kind: 'resolution' },
  ]);
  assert.deepEqual(originCaseNotificationRecipients({ requesterUid: 'same', sourceCreatorUid: 'same', status: 'open' }), []);
});
