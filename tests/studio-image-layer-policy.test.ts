import test from 'node:test';
import assert from 'node:assert/strict';
import { isStudioImageLayerVisible, normalizeStudioImageLayer } from '../src/utils/studioImageLayerPolicy';

test('image layers clamp placement, scale, rotation and opacity', () => {
  const layer = normalizeStudioImageLayer({ name: 'x'.repeat(140), x: 3, y: -1, scale: 5, rotation: -240, opacity: 2, start: -1 }, 'image-1');
  assert.equal(layer.id, 'image-1');
  assert.equal(layer.name.length, 120);
  assert.equal(layer.x, 1);
  assert.equal(layer.y, 0);
  assert.equal(layer.scale, 1);
  assert.equal(layer.rotation, -180);
  assert.equal(layer.opacity, 1);
  assert.equal(layer.start, 0);
});

test('image layers respect their timeline visibility interval', () => {
  const layer = normalizeStudioImageLayer({ start: 2, end: 5 }, 'image-1');
  assert.equal(isStudioImageLayerVisible(layer, 1.9, 10), false);
  assert.equal(isStudioImageLayerVisible(layer, 2, 10), true);
  assert.equal(isStudioImageLayerVisible(layer, 5, 10), true);
  assert.equal(isStudioImageLayerVisible(layer, 5.1, 10), false);
});

test('zero end keeps an image layer visible through the end of the video', () => {
  const layer = normalizeStudioImageLayer({ start: 1, end: 0 }, 'image-1');
  assert.equal(isStudioImageLayerVisible(layer, 9, 10), true);
  assert.equal(isStudioImageLayerVisible(layer, 10.1, 10), false);
});
