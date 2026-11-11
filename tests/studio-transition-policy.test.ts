import test from 'node:test';
import assert from 'node:assert/strict';
import { getCrossDissolveProgress, STUDIO_CROSS_DISSOLVE_SECONDS } from '../src/utils/studioTransitionPolicy';

test('cross-dissolve progress stays at zero before overlap and reaches one at clip end', () => {
  assert.equal(getCrossDissolveProgress(8, 10), 0);
  assert.equal(getCrossDissolveProgress(9.4, 10), 0);
  assert.equal(getCrossDissolveProgress(9.7, 10), 0.5);
  assert.equal(getCrossDissolveProgress(10, 10), 1);
  assert.equal(STUDIO_CROSS_DISSOLVE_SECONDS, 0.6);
});

test('cross-dissolve progress handles invalid inputs and non-positive durations', () => {
  assert.equal(getCrossDissolveProgress(Number.NaN, 10), 0);
  assert.equal(getCrossDissolveProgress(10, 10, 0), 0);
  assert.equal(getCrossDissolveProgress(20, 10), 1);
});
