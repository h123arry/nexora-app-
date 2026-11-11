import test from 'node:test';
import assert from 'node:assert/strict';
import { canAddStudioImageLayer, getStudioImageLayerFrame, isStudioImageLayerVisible, normalizeStudioImageLayer } from '../src/utils/studioImageLayerPolicy';

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

test('image layer imports enforce supported formats and memory limits', () => {
  const small = { type: 'image/png', size: 100 } as Blob;
  const invalid = { type: 'image/gif', size: 100 } as Blob;
  const oversized = { type: 'image/png', size: 10 * 1024 * 1024 + 1 } as Blob;
  const existing = (count: number, size: number) => Array.from({ length: count }, (_, index) => normalizeStudioImageLayer({ blob: { size, type: 'image/png' } as Blob }, String(index)));
  assert.equal(canAddStudioImageLayer([], small), true);
  assert.equal(canAddStudioImageLayer([], invalid), false);
  assert.equal(canAddStudioImageLayer([], oversized), false);
  assert.equal(canAddStudioImageLayer(existing(20, 1), small), false);
  assert.equal(canAddStudioImageLayer(existing(4, 10 * 1024 * 1024), small), false);
});

test('image keyframes normalize, sort, clamp and cap transform values', () => {
  const layer = normalizeStudioImageLayer({ keyframes: [
    { time: 4, x: 2, y: -1, scale: 3, rotation: 240, opacity: 2 },
    { time: 1, x: -1, y: 2, scale: 0, rotation: -240, opacity: -1 },
  ] }, 'animated-image');
  assert.deepEqual(layer.keyframes, [
    { time: 1, x: 0, y: 1, scale: 0.05, rotation: -180, opacity: 0 },
    { time: 4, x: 1, y: 0, scale: 1, rotation: 180, opacity: 1 },
  ]);
});

test('image keyframes interpolate position, size, rotation and opacity', () => {
  const layer = normalizeStudioImageLayer({ start: 0, end: 8, keyframes: [
    { time: 0, x: 0.2, y: 0.4, scale: 0.2, rotation: -30, opacity: 0 },
    { time: 4, x: 0.8, y: 0.6, scale: 0.6, rotation: 30, opacity: 1 },
  ] }, 'animated-image');
  assert.deepEqual(getStudioImageLayerFrame(layer, 2, 8), {
    x: 0.5, y: 0.5, scale: 0.4, rotation: 0, opacity: 0.5,
  });
  assert.deepEqual(getStudioImageLayerFrame(layer, 6, 8), {
    x: 0.8, y: 0.6, scale: 0.6, rotation: 30, opacity: 1,
  });
  assert.equal(getStudioImageLayerFrame(layer, 9, 8), null);
});
