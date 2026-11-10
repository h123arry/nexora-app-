import test from 'node:test';
import assert from 'node:assert/strict';
import { isStudioTextLayerVisible, normalizeStudioTextLayer } from '../src/utils/studioTextLayerPolicy';

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
});
