import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeMediaAssetId } from '../src/utils/mediaAssetReference';

test('accepts stable Firebase media asset IDs', () => {
  assert.equal(normalizeMediaAssetId('f7a8d2c1-4e3b-4a5d-8f90-123456789abc'), 'f7a8d2c1-4e3b-4a5d-8f90-123456789abc');
  assert.equal(normalizeMediaAssetId('studio_asset_01'), 'studio_asset_01');
});

test('trims surrounding whitespace without changing the ID', () => {
  assert.equal(normalizeMediaAssetId('  studio_asset_01  '), 'studio_asset_01');
});

test('rejects empty, oversized, non-string and path-like identifiers', () => {
  assert.equal(normalizeMediaAssetId(''), undefined);
  assert.equal(normalizeMediaAssetId('   '), undefined);
  assert.equal(normalizeMediaAssetId('x'.repeat(129)), undefined);
  assert.equal(normalizeMediaAssetId('users/owner/media/file'), undefined);
  assert.equal(normalizeMediaAssetId(null), undefined);
  assert.equal(normalizeMediaAssetId(123), undefined);
});
