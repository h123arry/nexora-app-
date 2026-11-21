import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  classifyStorageObject, classifyR2StorageObject, hasR2VideoRendition, shouldReconcileR2Asset, imageRenditionWidths, videoRenditionsForHeight, videoRenditionsForSize, videoRenditionDimensions, canClaimMediaProcessing,
  MAX_INPUT_BYTES, MAX_IMAGE_BYTES,
} from '../src/policies.js';

const validVideo = (overrides = {}) => ({
  name: 'users/creator-1/media/media-1',
  bucket: 'nexora-media',
  size: '1048576',
  contentType: 'video/mp4',
  generation: '1731000000000000',
  metadata: { ownerId: 'creator-1', mediaId: 'media-1' },
  ...overrides,
});

describe('NEXORA media worker object validation', () => {
  it('accepts a correctly scoped video object and returns normalized identity', () => {
    const result = classifyStorageObject(validVideo(), 'nexora-media');
    assert.equal(result.ignored, false);
    assert.equal(result.ownerId, 'creator-1');
    assert.equal(result.mediaId, 'media-1');
    assert.equal(result.size, 1048576);
    assert.equal(result.isVideo, true);
    assert.equal(result.isImage, false);
    assert.equal(result.generation, '1731000000000000');
  });

  it('ignores objects outside the exact owner path, bucket or metadata identity', () => {
    assert.equal(classifyStorageObject(validVideo({ bucket: 'other-bucket' }), 'nexora-media').ignored, true);
    assert.equal(classifyStorageObject(validVideo({ name: 'public/media-1.mp4' }), 'nexora-media').ignored, true);
    assert.equal(classifyStorageObject(validVideo({ metadata: { ownerId: 'other-user', mediaId: 'media-1' } }), 'nexora-media').ignored, true);
    assert.equal(classifyStorageObject(validVideo({ metadata: { ownerId: 'creator-1', mediaId: 'other-media' } }), 'nexora-media').ignored, true);
  });

  it('rejects unknown, empty, unsafe and oversized object sizes', () => {
    for (const size of [undefined, '', 'not-a-size', 0, -1, MAX_INPUT_BYTES + 1, Number.MAX_SAFE_INTEGER + 1]) {
      assert.throws(() => classifyStorageObject(validVideo({ size }), 'nexora-media'));
    }
    assert.equal(classifyStorageObject(validVideo({ size: String(MAX_INPUT_BYTES) }), 'nexora-media').size, MAX_INPUT_BYTES);
  });

  it('rejects images above their stricter processing limit and ignores unsupported audio objects', () => {
    assert.throws(() => classifyStorageObject(validVideo({ contentType: 'image/jpeg', size: MAX_IMAGE_BYTES + 1 }), 'nexora-media'), /12 MiB/);
    assert.equal(classifyStorageObject(validVideo({ contentType: 'audio/webm' }), 'nexora-media').reason, 'unsupported-media-type');
  });

  it('requires a real Cloud Storage generation before writing immutable outputs', () => {
    for (const generation of [undefined, '', 'current', '../1']) {
      assert.throws(() => classifyStorageObject(validVideo({ generation }), 'nexora-media'), /generation/);
    }
  });
});

describe('NEXORA media rendition planning', () => {
  it('never upscales small images or labels a small output as a larger rendition', () => {
    assert.deepEqual(imageRenditionWidths(180), [180]);
    assert.deepEqual(imageRenditionWidths(320), [320]);
    assert.deepEqual(imageRenditionWidths(1080), [320, 640]);
    assert.deepEqual(imageRenditionWidths(1920), [320, 640, 1280]);
    assert.throws(() => imageRenditionWidths(0));
  });

  it('preserves portrait, landscape and square short-edge resolutions without upscaling', () => {
    const plan = [{ height: 360 }, { height: 720 }, { height: 1080 }];
    assert.deepEqual(videoRenditionsForSize(1080, 1920, plan), plan);
    assert.deepEqual(videoRenditionsForSize(1920, 1080, plan), plan);
    assert.deepEqual(videoRenditionsForSize(720, 1280, plan), [{ height: 360 }, { height: 720 }]);
    assert.deepEqual(videoRenditionsForSize(1080, 1080, plan), plan);
    assert.deepEqual(videoRenditionDimensions(1080, 1920, 1080), { width: 1080, height: 1920 });
    assert.deepEqual(videoRenditionDimensions(1920, 1080, 720), { width: 1280, height: 720 });
    assert.deepEqual(videoRenditionDimensions(1080, 1920, 720), { width: 720, height: 1280 });
    assert.throws(() => videoRenditionsForSize(0, 1920, plan));
    assert.throws(() => videoRenditionDimensions(720, 1280, 1080));
  });

  it('only creates video renditions supported by the source height', () => {
    const plan = [{ height: 360 }, { height: 720 }, { height: 1080 }];
    assert.deepEqual(videoRenditionsForHeight(480, plan), [{ height: 360 }]);
    assert.deepEqual(videoRenditionsForHeight(1080, plan), plan);
    assert.deepEqual(videoRenditionsForHeight(2160, plan), plan);
    assert.throws(() => videoRenditionsForHeight(-1, plan));
  });
});

it('processing leases are protected while active and recover after expiry', () => {
  const now = 2_000_000;
  assert.equal(canClaimMediaProcessing({ status: 'processing', processingStartedAt: { toMillis: () => now - 60_000 } }, now), false);
  assert.equal(canClaimMediaProcessing({ status: 'processing', processingStartedAt: { toMillis: () => now - 16 * 60_000 } }, now), true);
  assert.equal(canClaimMediaProcessing({ status: 'ready' }, now), false);
  assert.equal(canClaimMediaProcessing({ status: 'failed' }, now), true);
});


describe('NEXORA R2 media event validation', () => {
  const event = (overrides = {}) => ({
    provider: 'r2',
    object: {
      name: 'users/creator-1/media/media-1',
      bucket: 'nexora-media',
      size: '1048576',
      contentType: 'video/mp4',
      generation: '1795090000000',
      metadata: { ownerId: 'creator-1', mediaId: 'media-1' },
      ...overrides,
    },
  });
  it('accepts verified R2 user-media events with immutable generation identity', () => {
    const result = classifyR2StorageObject(event(), 'nexora-media');
    assert.equal(result.ignored, false);
    assert.equal(result.provider, 'r2');
    assert.equal(result.ownerId, 'creator-1');
    assert.equal(result.mediaId, 'media-1');
    assert.equal(result.isVideo, true);
  });
  it('never accepts private chat paths or mismatched bucket/owner metadata', () => {
    assert.equal(classifyR2StorageObject(event({ name: 'chats/dm/media/user/media-1' }), 'nexora-media').ignored, true);
    assert.equal(classifyR2StorageObject(event({ bucket: 'other' }), 'nexora-media').ignored, true);
    assert.equal(classifyR2StorageObject(event({ metadata: { ownerId: 'other', mediaId: 'media-1' } }), 'nexora-media').ignored, true);
  });
  it('rejects missing or unsafe immutable generations', () => {
    for (const generation of ['', 'latest', '../1']) {
      assert.throws(() => classifyR2StorageObject(event({ generation }), 'nexora-media'), /generation/);
    }
  });
});


describe('NEXORA R2 video reconciliation eligibility', () => {
  const ownerId = 'creator-1';
  const mediaId = 'media-1';
  const original = {
    ownerId, storageProvider: 'r2', kind: 'video', status: 'ready', generation: '1795090000000',
    renditions: [{ height: 720, mp4Path: 'processed/creator-1/media-1/1795090000000/720p/video.mp4' }],
  };
  it('recognizes only a rendition belonging to the exact owner, media and generation', () => {
    assert.equal(hasR2VideoRendition(original, ownerId, mediaId), true);
    assert.equal(hasR2VideoRendition({ ...original, renditions: [{ height: 720, mp4Path: 'processed/other/media-1/1795090000000/720p/video.mp4' }] }, ownerId, mediaId), false);
    assert.equal(hasR2VideoRendition({ ...original, renditions: [{ height: 720, mp4Path: 'processed/creator-1/media-1/old/720p/video.mp4' }] }, ownerId, mediaId), false);
  });
  it('rebuilds ready videos missing R2 renditions and skips already-ready R2 videos', () => {
    assert.equal(shouldReconcileR2Asset(original, mediaId), false);
    assert.equal(shouldReconcileR2Asset({ ...original, renditions: [{ height: 720, mp4Path: 'gs://legacy-bucket/720p/video.mp4' }] }, mediaId), true);
    assert.equal(shouldReconcileR2Asset({ ...original, renditions: [] }, mediaId), true);
  });
  it('retries uploaded and failed assets, but waits for an active processing lease', () => {
    assert.equal(shouldReconcileR2Asset({ ...original, status: 'uploaded', renditions: [] }, mediaId), true);
    assert.equal(shouldReconcileR2Asset({ ...original, status: 'failed', renditions: [] }, mediaId), true);
    assert.equal(shouldReconcileR2Asset({ ...original, status: 'processing', processingStartedAt: { toMillis: () => 1_950_000 } }, mediaId, 2_000_000), false);
    assert.equal(shouldReconcileR2Asset({ ...original, status: 'processing', processingStartedAt: { toMillis: () => 1_000_000 } }, mediaId, 2_000_000), true);
  });
});
