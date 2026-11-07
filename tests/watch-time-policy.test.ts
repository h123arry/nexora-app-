import assert from 'node:assert/strict';
import test from 'node:test';
import { getCreditedWatchDelta } from '../src/utils/watchTimePolicy';

test('credits plausible forward playback only', () => {
  assert.equal(getCreditedWatchDelta(4, 4.5, true), 0.5);
});

test('does not credit time while paused or before the first observation', () => {
  assert.equal(getCreditedWatchDelta(null, 1, true), 0);
  assert.equal(getCreditedWatchDelta(1, 2, false), 0);
});

test('does not credit seeks, rewinds, or implausibly large timer gaps', () => {
  assert.equal(getCreditedWatchDelta(4, 40, true), 0);
  assert.equal(getCreditedWatchDelta(8, 2, true), 0);
  assert.equal(getCreditedWatchDelta(4, 7, true), 0);
});

test('rejects non-finite media times', () => {
  assert.equal(getCreditedWatchDelta(Number.NaN, 5, true), 0);
  assert.equal(getCreditedWatchDelta(1, Number.POSITIVE_INFINITY, true), 0);
});
