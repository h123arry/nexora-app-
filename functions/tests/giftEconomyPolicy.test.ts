import test from 'node:test';
import assert from 'node:assert/strict';
import { assessGiftRisk, isSupportedDisplayCurrency, validatePayoutRequest } from '../src/giftEconomyPolicy.ts';
import { isLiveGiftDeliveryEnabled } from '../src/giftDeliveryPolicy.ts';

test('gift risk scoring classifies velocity and high value without treating low activity as suspicious', () => {
  assert.deepEqual(assessGiftRisk({ senderGiftCount10m: 1, senderGrossNex10m: 100, giftGrossNex: 100, senderAccountAgeDays: 90, senderRestricted: false, recipientRestricted: false }), { score: 0, tier: 'low', reasons: [] });
  const high = assessGiftRisk({ senderGiftCount10m: 7, senderGrossNex10m: 12000, giftGrossNex: 30000, senderAccountAgeDays: 2, senderRestricted: false, recipientRestricted: false });
  assert.equal(high.tier, 'high');
  assert.ok(high.score >= 60);
  assert.ok(high.reasons.includes('sender_velocity_high'));
});
test('restricted accounts force high risk and invalid metrics are rejected', () => {
  assert.equal(assessGiftRisk({ senderGiftCount10m: 0, senderGrossNex10m: 0, giftGrossNex: 1, senderAccountAgeDays: null, senderRestricted: true, recipientRestricted: false }).tier, 'high');
  assert.throws(() => assessGiftRisk({ senderGiftCount10m: -1, senderGrossNex10m: 0, giftGrossNex: 1, senderAccountAgeDays: null, senderRestricted: false, recipientRestricted: false }));
});
test('currency preferences accept only the explicit ISO currency allowlist', () => {
  assert.equal(isSupportedDisplayCurrency('NGN'), true);
  assert.equal(isSupportedDisplayCurrency('EUR'), true);
  assert.equal(isSupportedDisplayCurrency('BTC'), false);
});
test('payout requests validate positive bounded NEX amounts and NGN corridor', () => {
  assert.deepEqual(validatePayoutRequest({ amountNex: 1000, currency: 'NGN' }), { amountNex: 1000, currency: 'NGN' });
  assert.throws(() => validatePayoutRequest({ amountNex: 999, currency: 'NGN' }));
  assert.throws(() => validatePayoutRequest({ amountNex: 1000, currency: 'USD' }));
});


test('live gift delivery requires an active room with host gifting explicitly enabled', () => {
  assert.equal(isLiveGiftDeliveryEnabled({ status: 'live', giftsEnabled: true }), true);
  assert.equal(isLiveGiftDeliveryEnabled({ status: 'live', giftsEnabled: false }), false);
  assert.equal(isLiveGiftDeliveryEnabled({ status: 'live' }), false);
  assert.equal(isLiveGiftDeliveryEnabled({ status: 'ended', giftsEnabled: true }), false);
  assert.equal(isLiveGiftDeliveryEnabled(null), false);
});
