import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CATALOG,
  assertCurrencyMatch,
  calculateRevenueShare,
  canRequestRefund,
  canTransitionTransaction,
  reconcileSettlementTotals,
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

test('creator revenue sharing uses exact integer minor-unit arithmetic and preserves rule version', () => {
  const share = calculateRevenueShare({ grossMinor: 10000, providerFeeMinor: 500, taxMinor: 500, platformCommissionBps: 2000, ruleVersion: 'creator-v1' });
  assert.deepEqual(share, {
    grossMinor: 10000,
    providerFeeMinor: 500,
    taxMinor: 500,
    platformCommissionMinor: 1800,
    creatorShareMinor: 7200,
    ruleVersion: 'creator-v1',
  });
  assert.throws(() => calculateRevenueShare({ grossMinor: 100, providerFeeMinor: 60, taxMinor: 50, platformCommissionBps: 2000, ruleVersion: 'bad' }), /exceed gross/);
  assert.throws(() => calculateRevenueShare({ grossMinor: Number.MAX_SAFE_INTEGER, providerFeeMinor: 0, taxMinor: 0, platformCommissionBps: 10000, ruleVersion: 'x' }), /invalid/);
  assert.throws(() => calculateRevenueShare({ grossMinor: 100, providerFeeMinor: 0, taxMinor: 0, platformCommissionBps: 1, ruleVersion: ' ' }), /invalid/);
});

test('settlement reconciliation matches currency, gross minor units and transaction count', () => {
  assert.deepEqual(reconcileSettlementTotals(
    { currency: 'NGN', grossMinor: 125000, transactionCount: 12 },
    { currency: 'NGN', grossMinor: 125000, transactionCount: 12 },
  ), { status: 'matched', amountVarianceMinor: 0, transactionCountVariance: 0 });
  assert.deepEqual(reconcileSettlementTotals(
    { currency: 'NGN', grossMinor: 125000, transactionCount: 12 },
    { currency: 'NGN', grossMinor: 124000, transactionCount: 11 },
  ), { status: 'mismatch', amountVarianceMinor: -1000, transactionCountVariance: -1 });
  assert.throws(() => reconcileSettlementTotals(
    { currency: 'NGN', grossMinor: 1, transactionCount: 1 },
    { currency: 'USD', grossMinor: 1, transactionCount: 1 },
  ), /currency mismatch/);
  assert.throws(() => reconcileSettlementTotals(
    { currency: 'NGN', grossMinor: -1, transactionCount: 1 },
    { currency: 'NGN', grossMinor: 1, transactionCount: 1 },
  ), /invalid/);
});

test('currency mismatches are rejected rather than coerced', () => {
  assert.doesNotThrow(() => assertCurrencyMatch('USD', 'USD'));
  assert.throws(() => assertCurrencyMatch('USD', 'EUR'), /Currency mismatch/);
});
