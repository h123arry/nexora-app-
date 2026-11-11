import test from 'node:test';
import assert from 'node:assert/strict';
import {
  chooseStudioMp4Rendition,
  isOwnedStudioExportAsset,
  isStudioExportExpired,
} from '../src/studioMp4ExportPolicy.js';

const asset = {
  ownerId: 'alice',
  sourcePurpose: 'studio-export',
  storagePath: 'users/alice/media/export-1',
  status: 'ready',
  studioExportExpiresAt: { toMillis: () => 1000 },
};

test('Studio MP4 delivery is restricted to the owning account and tagged temporary asset', () => {
  assert.equal(isOwnedStudioExportAsset(asset, 'alice', 'export-1'), true);
  assert.equal(isOwnedStudioExportAsset(asset, 'bob', 'export-1'), false);
  assert.equal(isOwnedStudioExportAsset({ ...asset, sourcePurpose: 'post-upload' }, 'alice', 'export-1'), false);
  assert.equal(isOwnedStudioExportAsset({ ...asset, storagePath: 'users/bob/media/export-1' }, 'alice', 'export-1'), false);
});

test('MP4 delivery selects the highest server-generated rendition available', () => {
  assert.equal(chooseStudioMp4Rendition([
    { height: 360, path: '360.mp4' },
    { height: 1080, path: '1080.mp4' },
    { height: 720, path: '720.mp4' },
  ])?.height, 1080);
  assert.equal(chooseStudioMp4Rendition([]), null);
});

test('temporary export cleanup waits until expiry and never deletes active processing', () => {
  assert.equal(isStudioExportExpired(asset, 999), false);
  assert.equal(isStudioExportExpired(asset, 1000), true);
  assert.equal(isStudioExportExpired({ ...asset, status: 'processing' }, 5000), false);
  assert.equal(isStudioExportExpired({ ...asset, studioExportExpiresAt: null }, 5000), false);
});
