import test from 'node:test';
import assert from 'node:assert/strict';
import { CREATOR_EARNINGS_PAGE_SIZE, validateCreatorEarningsCursor } from '../src/creatorEarningsPolicy.ts';

test('creator earnings pages are bounded to 100 records', () => {
  assert.equal(CREATOR_EARNINGS_PAGE_SIZE, 100);
});

test('creator earnings cursor accepts only canonical gift transaction document IDs', () => {
  const valid = 'gift_' + 'a'.repeat(64);
  assert.equal(validateCreatorEarningsCursor(valid), valid);
  assert.equal(validateCreatorEarningsCursor(undefined), undefined);
  assert.equal(validateCreatorEarningsCursor(null), undefined);
  assert.throws(() => validateCreatorEarningsCursor('../otherCreator'));
  assert.throws(() => validateCreatorEarningsCursor('gift_' + 'g'.repeat(64)));
  assert.throws(() => validateCreatorEarningsCursor(42));
});
