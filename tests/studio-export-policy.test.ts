import test from 'node:test';
import assert from 'node:assert/strict';
import { getStudioExportDimensions } from '../src/utils/studioExportPolicy';
test('720p dimensions preserve portrait, square and landscape ratios', () => {
 assert.deepEqual(getStudioExportDimensions('portrait','720p'),{width:720,height:1280});
 assert.deepEqual(getStudioExportDimensions('square','720p'),{width:720,height:720});
 assert.deepEqual(getStudioExportDimensions('landscape','720p'),{width:1280,height:720});
});
test('1080p dimensions preserve portrait, square and landscape ratios', () => {
 assert.deepEqual(getStudioExportDimensions('portrait','1080p'),{width:1080,height:1920});
 assert.deepEqual(getStudioExportDimensions('square','1080p'),{width:1080,height:1080});
 assert.deepEqual(getStudioExportDimensions('landscape','1080p'),{width:1920,height:1080});
});

import { getStudioExpectedExportDuration } from '../src/utils/studioExportPolicy';

test('expected duration accounts for transition overlaps and fade-to-black holds', () => {
  assert.equal(getStudioExpectedExportDuration([4, 5, 6], 'cut'), 15);
  assert.equal(getStudioExpectedExportDuration([4, 5, 6], 'cross-dissolve'), 13.8);
  assert.equal(getStudioExpectedExportDuration([4, 5, 6], 'fade'), 15.7);
});

test('transition duration calculation safely clamps short and invalid clips', () => {
  assert.equal(getStudioExpectedExportDuration([0.2, 0.3], 'cross-dissolve'), 0.3);
  assert.equal(getStudioExpectedExportDuration([2, Number.NaN, 3], 'cut'), 5);
});


import { estimateStudioExportSizeBytes, getStudioExportBitrates } from '../src/utils/studioExportPolicy';

test('export bitrate scales with resolution and quality without changing audio mix semantics', () => {
  assert.deepEqual(getStudioExportBitrates('720p', 'balanced'), { video: 4_500_000, audio: 128_000 });
  assert.deepEqual(getStudioExportBitrates('1080p', 'balanced'), { video: 7_000_000, audio: 128_000 });
  assert.deepEqual(getStudioExportBitrates('1080p', 'high'), { video: 12_000_000, audio: 192_000 });
});

test('export size estimate is duration-aware, monotonic and safe for invalid input', () => {
  const short = estimateStudioExportSizeBytes(30, '720p', 'balanced');
  const long = estimateStudioExportSizeBytes(60, '720p', 'balanced');
  const high = estimateStudioExportSizeBytes(30, '1080p', 'high');
  assert.ok(short > 0);
  assert.equal(long, short * 2);
  assert.ok(high > short);
  assert.equal(estimateStudioExportSizeBytes(Number.NaN, '720p', 'balanced'), 0);
});
