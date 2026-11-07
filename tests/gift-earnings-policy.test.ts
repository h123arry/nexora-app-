import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateGiftRevenueSplit } from '../functions/src/giftEarningsPolicy.ts';

test('gift revenue split is deterministic and conserves every NEX unit', () => {
  assert.deepEqual(calculateGiftRevenueSplit(1000), {
    grossNex: 1000, creatorShareNex: 700, platformShareNex: 300, policyVersion: 'gift-revenue-v1',
  });
  assert.deepEqual(calculateGiftRevenueSplit(1), {
    grossNex: 1, creatorShareNex: 1, platformShareNex: 0, policyVersion: 'gift-revenue-v1',
  });
  for (const gross of [1, 2, 3, 17, 99, 100, 101, 999, 10001, 999999]) {
    const split = calculateGiftRevenueSplit(gross);
    assert.equal(split.creatorShareNex + split.platformShareNex, gross);
  }
});

test('gift revenue split rejects invalid and unsafe values', () => {
  for (const gross of [0, -1, 1.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1, '100']) {
    assert.throws(() => calculateGiftRevenueSplit(gross));
  }
});
