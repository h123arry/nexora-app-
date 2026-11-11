import test from 'node:test';
import assert from 'node:assert/strict';
import { getStudioVideoLayerFrame, normalizeStudioVideoLayer, type StudioVideoLayer } from '../src/utils/studioVideoLayerPolicy';

const base: StudioVideoLayer = {
  id: 'clip', start: 0, end: 10, volume: 1, x: 0.5, y: 0.5, scale: 1, rotation: 0, opacity: 1, keyframes: [],
};

test('video keyframes normalize, sort, clamp and cap transform values', () => {
  const layer = normalizeStudioVideoLayer({ ...base, keyframes: [
    { time: 4, x: 2, y: -1, scale: 3, rotation: 240, opacity: 2 },
    { time: 1, x: -1, y: 2, scale: 0.1, rotation: -240, opacity: -1 },
  ] });
  assert.deepEqual(layer.keyframes, [
    { time: 1, x: 0, y: 1, scale: 0.25, rotation: -180, opacity: 0 },
    { time: 4, x: 1, y: 0, scale: 2, rotation: 180, opacity: 1 },
  ]);
});

test('video keyframes interpolate position, scale, rotation and opacity', () => {
  const layer = normalizeStudioVideoLayer({ ...base, keyframes: [
    { time: 0, x: 0.2, y: 0.4, scale: 0.5, rotation: -20, opacity: 0 },
    { time: 4, x: 0.8, y: 0.6, scale: 1.5, rotation: 20, opacity: 1 },
  ] });
  assert.deepEqual(getStudioVideoLayerFrame(layer, 2), {
    x: 0.5, y: 0.5, scale: 1, rotation: 0, opacity: 0.5,
  });
  assert.deepEqual(getStudioVideoLayerFrame(layer, 8), {
    x: 0.8, y: 0.6, scale: 1.5, rotation: 20, opacity: 1,
  });
});

test('legacy clips receive safe default transform values and empty keyframes', () => {
  const legacy = normalizeStudioVideoLayer({ id: 'legacy', start: 0, end: 5, volume: 1 } as StudioVideoLayer);
  assert.deepEqual(getStudioVideoLayerFrame(legacy, 1), {
    x: 0.5, y: 0.5, scale: 1, rotation: 0, opacity: 1,
  });
});
