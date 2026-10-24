import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CATALOG,
  assertCurrencyMatch,
  calculateRevenueShare,
  canRequestRefund,
  canTransitionTransaction,
  validateCheckoutRequest,
  validateMoney,
} from '../functions/src/monetizationPolicy.ts';

test('catalog is backend-controlled and unavailable until a real provider adapter exists', () => {
  assert.equal(CATALOG.every(product => product.available === false), true);
  assert.throws(() => validateCheckoutRequest('nexora_plus'), /not available/);
  assert.equal(validateMoney(1299, 'USD').ok, true);
  assert.equal(validateMoney(12.5, 'USD').ok, false);
  assert.equal(validateMoney(1299, 'BTC').ok, false);
});

test('transaction lifecycle allows only documented forward transitions', () => {
  assert.equal(canTransitionTransaction('payment_pending', 'payment_confirmed'), true);
  assert.equal(canTransitionTransaction('payment_confirmed', 'payment_pending'), false);
  assert.equal(canTransitionTransaction('payment_confirmed', 'refund_requested'), true);
  assert.equal(canTransitionTransaction('payment_failed', 'payment_confirmed'), false);
});

test('refund eligibility prevents duplicate or excessive refunds', () => {
  assert.equal(canRequestRefund('payment_confirmed', 0, 2500), true);
  assert.equal(canRequestRefund('payment_confirmed', 2500, 2500), false);
  assert.equal(canRequestRefund('payment_pending', 0, 2500), false);
});

test('creator revenue sharing uses integer minor units and preserves rule version', () => {
  const share = calculateRevenueShare({ grossMinor: 10000, providerFeeMinor: 500, taxMinor: 500, platformCommissionBps: 2000, ruleVersion: 'creator-v1' });
  assert.deepEqual(share, {
    grossMinor: 10000,
    providerFeeMinor: 500,
    taxMinor: 500,
    platformCommissionMinor: 1800,
    creatorShareMinor: 7200,
    ruleVersion: 'creator-v1',
  });
  assert.throws(() => calculateRevenueShare({ grossMinor: 100, providerFeeMinor: 0, taxMinor: 0, platformCommissionBps: 10001, ruleVersion: 'bad' }), /invalid/);
});

test('currency mismatches are rejected rather than coerced', () => {
  assert.doesNotThrow(() => assertCurrencyMatch('USD', 'USD'));
  assert.throws(() => assertCurrencyMatch('USD', 'EUR'), /Currency mismatch/);
});
