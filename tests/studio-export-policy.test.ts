import test from 'node:test';
import assert from 'node:assert/strict';
import { getStudioExportDimensions } from '../src/utils/studioExportPolicy';
test('720p dimensions preserve portrait, square and landscape ratios', () => {
 assert.deepEqual(getStudioExportDimensions('portrait','720p'),{width:405,height:720});
 assert.deepEqual(getStudioExportDimensions('square','720p'),{width:720,height:720});
 assert.deepEqual(getStudioExportDimensions('landscape','720p'),{width:720,height:405});
});
test('1080p dimensions preserve portrait, square and landscape ratios', () => {
 assert.deepEqual(getStudioExportDimensions('portrait','1080p'),{width:608,height:1080});
 assert.deepEqual(getStudioExportDimensions('square','1080p'),{width:1080,height:1080});
 assert.deepEqual(getStudioExportDimensions('landscape','1080p'),{width:1080,height:608});
});
