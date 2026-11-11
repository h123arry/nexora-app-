import test from 'node:test';
import assert from 'node:assert/strict';
import { getStudioTextLayerFrame, isStudioTextLayerVisible, normalizeStudioTextLayer } from '../src/utils/studioTextLayerPolicy';

test('text layers normalize unsafe values and enforce editor bounds', () => {
  const layer = normalizeStudioTextLayer({ text: 'x'.repeat(140), color: 'red', fontSize: 200, opacity: -1, scale: 5, rotation: 270, start: -2 }, 'layer-1');
  assert.equal(layer.id, 'layer-1');
  assert.equal(layer.text.length, 120);
  assert.equal(layer.color, '#FFFFFF');
  assert.equal(layer.fontSize, 100);
  assert.equal(layer.opacity, 0);
  assert.equal(layer.scale, 2);
  assert.equal(layer.rotation, 180);
  assert.equal(layer.start, 0);
});

test('text layers are visible only inside their configured timeline interval', () => {
  const layer = normalizeStudioTextLayer({ id: 'title', text: 'NEXORA', start: 3, end: 7 }, 'fallback');
  assert.equal(isStudioTextLayerVisible(layer, 2.9, 10), false);
  assert.equal(isStudioTextLayerVisible(layer, 3, 10), true);
  assert.equal(isStudioTextLayerVisible(layer, 7, 10), true);
  assert.equal(isStudioTextLayerVisible(layer, 7.1, 10), false);
});

test('zero end means visible through the end of the video', () => {
  const layer = normalizeStudioTextLayer({ text: 'Title', start: 2, end: 0 }, 'fallback');
  assert.equal(isStudioTextLayerVisible(layer, 9, 10), true);
  assert.equal(isStudioTextLayerVisible(layer, 10.1, 10), false);
  assert.equal(isStudioTextLayerVisible({ ...layer, start: 5, end: 3 }, 6, 10), false);
});

test('text entrance animations interpolate opacity and scale over time', () => {
  const fade = normalizeStudioTextLayer({ text: 'Fade', start: 2, end: 6, animation: 'fade', animationDuration: 1 }, 'fade');
  assert.equal(getStudioTextLayerFrame(fade, 2, 10)?.opacity, 0);
  assert.equal(getStudioTextLayerFrame(fade, 2.5, 10)?.opacity, 0.5);
  assert.equal(getStudioTextLayerFrame(fade, 6, 10)?.opacity, 0);

  const zoom = normalizeStudioTextLayer({ text: 'Zoom', animation: 'zoom', animationDuration: 1 }, 'zoom');
  assert.equal(getStudioTextLayerFrame(zoom, 0, 10)?.scale, 0.78);
  assert.equal(getStudioTextLayerFrame(zoom, 1, 10)?.scale, 1);
});

test('slide and pop animations produce bounded starting frames', () => {
  const slide = normalizeStudioTextLayer({ text: 'Slide', animation: 'slide-up' }, 'slide');
  assert.equal(getStudioTextLayerFrame(slide, 0, 10)?.offsetY, 64);
  const pop = normalizeStudioTextLayer({ text: 'Pop', animation: 'pop' }, 'pop');
  assert.ok((getStudioTextLayerFrame(pop, 0, 10)?.scale || 0) < 0.6);
  assert.equal(getStudioTextLayerFrame(pop, 1, 10)?.scale, 1);
});

test('text keyframes normalize, sort, clamp and cap values', () => {
  const layer = normalizeStudioTextLayer({ text: 'Keyframes', keyframes: [
    { time: 4, opacity: 2, scale: 3, rotation: 240, offsetY: 1400 },
    { time: 1, opacity: -1, scale: 0.1, rotation: -240, offsetY: -1400 },
    { time: 4, opacity: 0.5, scale: 1, rotation: 0, offsetY: 0 },
  ] }, 'keyframed');
  assert.deepEqual(layer.keyframes, [
    { time: 1, opacity: 0, scale: 0.5, rotation: -180, offsetY: -1000 },
    { time: 4, opacity: 1, scale: 2, rotation: 180, offsetY: 1000 },
  ]);
});

test('user-authored text keyframes interpolate opacity, scale, rotation and vertical position', () => {
  const layer = normalizeStudioTextLayer({ text: 'Motion', keyframes: [
    { time: 2, opacity: 0, scale: 0.5, rotation: -20, offsetY: 40 },
    { time: 6, opacity: 1, scale: 1.5, rotation: 20, offsetY: -40 },
  ] }, 'motion');
  assert.deepEqual(getStudioTextLayerFrame(layer, 4, 10), {
    opacity: 0.5, scale: 1, rotation: 0, offsetY: 0,
  });
  assert.deepEqual(getStudioTextLayerFrame(layer, 8, 10), {
    opacity: 1, scale: 1.5, rotation: 20, offsetY: -40,
  });
});

test('keyframes compose with existing entrance animation and stay inside layer timing', () => {
  const layer = normalizeStudioTextLayer({ text: 'Layer', start: 2, end: 8, animation: 'fade', animationDuration: 2, keyframes: [
    { time: 2, opacity: 1, scale: 1, rotation: 0, offsetY: 0 },
    { time: 6, opacity: 0.5, scale: 1.2, rotation: 10, offsetY: 12 },
  ] }, 'combined');
  assert.equal(getStudioTextLayerFrame(layer, 1, 10), null);
  assert.equal(getStudioTextLayerFrame(layer, 3, 10)?.opacity, 0.9375);
});
