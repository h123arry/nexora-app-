import test from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { advanceBankLookupQuota, advancePayoutOtpQuota, calculateNgnPayoutKobo, livePayoutGatesPassed, verifyPaystackWebhookSignature } from '../src/paystackPayoutPolicy.ts';

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


test('bank lookup quota permits ten attempts and blocks the eleventh', () => {
  let state = advanceBankLookupQuota(null, 10_000);
  for (let i = 1; i < 10; i += 1) state = advanceBankLookupQuota(state, 10_000 + i);
  assert.equal(state.allowed, true);
  assert.equal(state.attempts, 10);
  const blocked = advanceBankLookupQuota(state, 10_100);
  assert.equal(blocked.allowed, false);
  assert.equal(blocked.retryAfterMs, 15 * 60 * 1000 - 100);
});

test('bank lookup quota resets only after expiry and rejects malformed state', () => {
  const expired = advanceBankLookupQuota(
    { windowStartedAt: 5_000, attempts: 10 },
    5_000 + 15 * 60 * 1000,
  );
  assert.equal(expired.allowed, true);
  assert.equal(expired.attempts, 1);
  assert.equal(advanceBankLookupQuota({ windowStartedAt: 'bad', attempts: 2 }, 10_000).allowed, false);
  assert.equal(advanceBankLookupQuota({ windowStartedAt: 1, attempts: 99 }, 10_000).allowed, false);
  assert.equal(advanceBankLookupQuota(null, -1).allowed, false);
});


test('payout OTP quota permits five attempts per payout and blocks the sixth', () => {
  let state = advancePayoutOtpQuota(null, 20_000);
  for (let i = 1; i < 5; i += 1) state = advancePayoutOtpQuota(state, 20_000 + i);
  assert.equal(state.allowed, true);
  assert.equal(state.attempts, 5);
  const blocked = advancePayoutOtpQuota(state, 20_100);
  assert.equal(blocked.allowed, false);
  assert.equal(blocked.retryAfterMs, 15 * 60 * 1000 - 100);
});

test('payout OTP quota resets after expiry and rejects corrupt counters', () => {
  const reset = advancePayoutOtpQuota({ windowStartedAt: 1_000, attempts: 5 }, 1_000 + 15 * 60 * 1000);
  assert.equal(reset.allowed, true);
  assert.equal(reset.attempts, 1);
  assert.equal(advancePayoutOtpQuota({ windowStartedAt: 'bad', attempts: 2 }, 10_000).allowed, false);
});
