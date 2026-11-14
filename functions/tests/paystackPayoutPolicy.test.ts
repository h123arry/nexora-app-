import test from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { advanceBankLookupQuota, calculateNgnPayoutKobo, livePayoutGatesPassed, verifyPaystackWebhookSignature } from '../src/paystackPayoutPolicy.ts';

const body = Buffer.from('{"event":"transfer.success","data":{"reference":"nxp_example","amount":125000,"currency":"NGN"}}');
const webhookSecret = ['whsec','test','placeholder'].join('_');
const secretKey = ['sk','test','placeholder'].join('_');

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

test('bank account lookup quota blocks the eleventh attempt and resets after expiry', () => {
  const start = 1_800_000_000_000;
  let state: { windowStartedAt?: unknown; attempts?: unknown } = {};
  for (let attempt = 1; attempt <= 10; attempt++) {
    const decision = advanceBankLookupQuota(state, start + attempt);
    assert.equal(decision.allowed, true);
    state = { windowStartedAt: decision.windowStartedAt, attempts: decision.attempts };
  }
  const blocked = advanceBankLookupQuota(state, start + 11);
  assert.equal(blocked.allowed, false);
  assert.equal(blocked.attempts, 10);
  assert.ok(blocked.retryAfterMs > 0);
  const reset = advanceBankLookupQuota(state, start + 15 * 60 * 1000 + 1);
  assert.equal(reset.allowed, true);
  assert.equal(reset.attempts, 1);
});

test('bank account lookup quota resets malformed stored state safely', () => {
  assert.deepEqual(advanceBankLookupQuota({ windowStartedAt: -1, attempts: -100 }, 1_800_000_000_000),
    { allowed: true, windowStartedAt: 1_800_000_000_000, attempts: 1, retryAfterMs: 0 });
});
