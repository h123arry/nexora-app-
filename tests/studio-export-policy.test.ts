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
