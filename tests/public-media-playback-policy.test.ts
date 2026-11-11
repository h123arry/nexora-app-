import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { canResolvePublicPostMedia, chooseVideoRendition, safeVideoRenditions } from '../functions/src/publicMediaPlaybackPolicy.js';

describe('public media playback policy', () => {
  it('accepts only rendition paths scoped to the verified owner and asset', () => {
    const result = safeVideoRenditions([
      { height: 360, mp4Path: 'processed/owner-1/asset-1/360p/video.mp4' },
      { height: 720, mp4Path: 'processed/owner-1/asset-1/720p/video.mp4' },
      { height: 1080, mp4Path: 'processed/other-owner/asset-1/1080p/video.mp4' },
      { height: 1080, mp4Path: 'processed/owner-1/asset-1/1080p/../../private.mp4' },
      { height: 12000, mp4Path: 'processed/owner-1/asset-1/12000p/video.mp4' },
    ], 'owner-1', 'asset-1');
    assert.deepEqual(result.map(item => item.height), [360, 720]);
  });


  it('only resolves public video assets attached to their actual author', () => {
    const post = { audience: 'public', mediaAssetId: 'asset-1', userId: 'owner-1' };
    const asset = { ownerId: 'owner-1', kind: 'video', status: 'ready' };
    assert.equal(canResolvePublicPostMedia(post, asset, 'asset-1'), true);
    assert.equal(canResolvePublicPostMedia({ ...post, audience: 'followers' }, asset, 'asset-1'), false);
    assert.equal(canResolvePublicPostMedia({ ...post, mediaAssetId: 'asset-2' }, asset, 'asset-1'), false);
    assert.equal(canResolvePublicPostMedia(post, { ...asset, ownerId: 'attacker' }, 'asset-1'), false);
    assert.equal(canResolvePublicPostMedia(post, { ...asset, kind: 'image' }, 'asset-1'), false);
  });

  it('chooses 720p when available and otherwise the highest rendition below it', () => {
    assert.equal(chooseVideoRendition([
      { height: 360, path: '360.mp4' },
      { height: 720, path: '720.mp4' },
      { height: 1080, path: '1080.mp4' },
    ])?.height, 720);
    assert.equal(chooseVideoRendition([
      { height: 360, path: '360.mp4' },
      { height: 540, path: '540.mp4' },
      { height: 1080, path: '1080.mp4' },
    ])?.height, 540);
    assert.equal(chooseVideoRendition([]), null);
  });
});
