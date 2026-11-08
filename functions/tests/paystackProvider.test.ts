import test from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { validateNgnBankAccountInput, verifyPaystackWebhookSignature } from '../src/paystackProvider.ts';

test('NGN bank-account input accepts only ten-digit account numbers and numeric bank codes', () => {
  assert.deepEqual(validateNgnBankAccountInput({ accountNumber: '0123456789', bankCode: '058' }), {
    accountNumber: '0123456789', bankCode: '058',
  });
  assert.throws(() => validateNgnBankAccountInput({ accountNumber: '1234', bankCode: '058' }));
  assert.throws(() => validateNgnBankAccountInput({ accountNumber: '0123456789', bankCode: 'abc' }));
});

test('Paystack timestamped webhook signatures validate raw bytes and reject stale timestamps', () => {
  const raw = Buffer.from('{"event":"transfer.success","data":{"reference":"nexora_payout_000001"}}');
  const timestamp = 1_800_000_000;
  const secret = 'whsec_test_signing_secret';
  const signature = createHmac('sha512', secret).update(String(timestamp) + '.').update(raw).digest('hex');
  const header = `t=${timestamp},v1=whk_test:${signature}`;
  assert.equal(verifyPaystackWebhookSignature(raw, header, undefined, secret, '', timestamp), true);
  assert.equal(verifyPaystackWebhookSignature(raw, header, undefined, secret, '', timestamp + 301), false);
  assert.equal(verifyPaystackWebhookSignature(Buffer.from(raw.toString() + ' '), header, undefined, secret, '', timestamp), false);
});

test('Paystack legacy webhook signature is verified with constant-time digest comparison', () => {
  const raw = Buffer.from('{"event":"transfer.failed"}');
  const key = 'sk_test_legacy_secret';
  const signature = createHmac('sha512', key).update(raw).digest('hex');
  assert.equal(verifyPaystackWebhookSignature(raw, undefined, signature, '', key), true);
  assert.equal(verifyPaystackWebhookSignature(raw, undefined, '0'.repeat(128), '', key), false);
});
