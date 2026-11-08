import test from 'node:test';
import assert from 'node:assert/strict';
import { isGiftRiskClearedForSettlement } from '../src/giftEarningsPolicy.ts';

test('low-risk gifts can settle after deterministic auto-clearance', () => {
  assert.equal(isGiftRiskClearedForSettlement({ tier: 'low', disposition: 'auto_cleared' }), true);
});

test('review and high-risk gifts require explicit finance clearance', () => {
  assert.equal(isGiftRiskClearedForSettlement({ tier: 'review', disposition: 'review_only' }), false);
  assert.equal(isGiftRiskClearedForSettlement({ tier: 'high', disposition: 'review_only' }), false);
  assert.equal(isGiftRiskClearedForSettlement({ tier: 'high', disposition: 'cleared' }), true);
});

test('escalated gifts cannot be settled', () => {
  assert.equal(isGiftRiskClearedForSettlement({ tier: 'high', disposition: 'escalated' }), false);
});

test('legacy gifts without a risk signal retain finance-only manual settlement', () => {
  assert.equal(isGiftRiskClearedForSettlement(null), true);
});
