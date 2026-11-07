import test from 'node:test';
import assert from 'node:assert/strict';
import { giftDeliveryReferences, validateGiftDeliveryInput } from '../functions/src/giftDeliveryPolicy.ts';

const valid = {
  recipientId: 'creator_123', giftId: 'dragon-01', quantity: 2,
  contextType: 'live', contextId: 'live_session_1', idempotencyKey: 'request_key_12345',
};

test('validates bounded gift delivery requests', () => {
  assert.deepEqual(validateGiftDeliveryInput(valid), valid);
  assert.throws(() => validateGiftDeliveryInput({ ...valid, quantity: 21 }));
  assert.throws(() => validateGiftDeliveryInput({ ...valid, quantity: 0 }));
  assert.throws(() => validateGiftDeliveryInput({ ...valid, contextType: 'post' }));
  assert.throws(() => validateGiftDeliveryInput({ ...valid, idempotencyKey: 'short' }));
  assert.throws(() => validateGiftDeliveryInput({ ...valid, recipientId: 'bad/id' }));
});

test('creates stable, opaque ledger references for retries', () => {
  const first = giftDeliveryReferences('sender_1', 'request_key_12345');
  const retry = giftDeliveryReferences('sender_1', 'request_key_12345');
  const other = giftDeliveryReferences('sender_2', 'request_key_12345');
  assert.deepEqual(first, retry);
  assert.notEqual(first.transactionId, other.transactionId);
  assert.match(first.transactionId, /^gift_[a-f0-9]+$/);
  assert.match(first.requestId, /^gift_req_[a-f0-9]+$/);
});
