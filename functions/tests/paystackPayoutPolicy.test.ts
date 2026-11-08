import test from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { calculateNgnPayoutKobo, livePayoutGatesPassed, verifyPaystackWebhookSignature } from '../src/paystackPayoutPolicy.ts';

const body = Buffer.from('{"event":"transfer.success","data":{"reference":"nxp_example","amount":125000,"currency":"NGN"}}');
const webhookSecret = 'whsec_test_secret';
const secretKey = 'sk_test_secret';

test('NEX to NGN conversion uses integer kobo and rejects unsafe values', () => {
  assert.equal(calculateNgnPayoutKobo(2500, 125), 312500);
  assert.throws(() => calculateNgnPayoutKobo(Number.MAX_SAFE_INTEGER, 100));
  assert.throws(() => calculateNgnPayoutKobo(100, 0));
});

test('live withdrawals require every operational approval gate', () => {
  const approved = { liveSettlementApproved: true, providerBusinessVerified: true, settlementFundingVerified: true,
    complianceApproved: true, webhookVerified: true, liveTestTransferVerified: true };
  assert.equal(livePayoutGatesPassed(approved), true);
  assert.equal(livePayoutGatesPassed({ ...approved, webhookVerified: false }), false);
  assert.equal(livePayoutGatesPassed({ ...approved, liveTestTransferVerified: undefined }), false);
});

test('modern Paystack webhook signature validates raw body and timestamp', () => {
  const now = 1_800_000_000_000;
  const timestamp = Math.floor(now / 1000);
  const signature = createHmac('sha512', webhookSecret).update(String(timestamp) + '.' + body.toString('utf8')).digest('hex');
  assert.equal(verifyPaystackWebhookSignature(body, { 'paystack-signature': `t=${timestamp},v1=whk_test:${signature}` }, webhookSecret, secretKey, now), true);
  assert.equal(verifyPaystackWebhookSignature(Buffer.from(body.toString() + ' '), { 'paystack-signature': `t=${timestamp},v1=whk_test:${signature}` }, webhookSecret, secretKey, now), false);
  assert.equal(verifyPaystackWebhookSignature(body, { 'paystack-signature': `t=${timestamp - 301},v1=whk_test:${signature}` }, webhookSecret, secretKey, now), false);
});

test('legacy Paystack signature is accepted only when HMAC matches', () => {
  const signature = createHmac('sha512', secretKey).update(body).digest('hex');
  assert.equal(verifyPaystackWebhookSignature(body, { 'x-paystack-signature': signature }, '', secretKey), true);
  assert.equal(verifyPaystackWebhookSignature(body, { 'x-paystack-signature': '0'.repeat(128) }, '', secretKey), false);
});
