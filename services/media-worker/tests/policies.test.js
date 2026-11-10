import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  classifyStorageObject, imageRenditionWidths, videoRenditionsForHeight, canClaimMediaProcessing,
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

  it('only creates video renditions supported by the source height', () => {
    const plan = [{ height: 360 }, { height: 720 }, { height: 1080 }];
    assert.deepEqual(videoRenditionsForHeight(480, plan), [{ height: 360 }]);
    assert.deepEqual(videoRenditionsForHeight(1080, plan), plan);
    assert.deepEqual(videoRenditionsForHeight(2160, plan), plan);
    assert.throws(() => videoRenditionsForHeight(-1, plan));
  });
});

