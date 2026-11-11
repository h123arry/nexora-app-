import test from 'node:test';
import assert from 'node:assert/strict';
import { getStudioShapeLayerFrame, normalizeStudioShapeLayer } from '../src/utils/studioShapeLayerPolicy';

test('normalizes supported native shape kinds and colour values', () => {
  assert.equal(normalizeStudioShapeLayer({ shape: 'circle', color: '#123456' }, 'a').shape, 'circle');
  assert.equal(normalizeStudioShapeLayer({ shape: 'line' }, 'b').shape, 'line');
  assert.equal(normalizeStudioShapeLayer({ shape: 'unknown' as never, color: 'red' }, 'c').shape, 'rectangle');
  assert.equal(normalizeStudioShapeLayer({ color: 'red' }, 'c').color, '#A855F7');
});

test('clamps shape geometry, opacity and rotation to safe normalized bounds', () => {
  const shape = normalizeStudioShapeLayer({ x: 4, y: -2, width: 0, height: 9, opacity: 4, rotation: 900 }, 'shape');
  assert.equal(shape.x, 1);
  assert.equal(shape.y, 0);
  assert.equal(shape.width, 0.02);
  assert.equal(shape.height, 1);
  assert.equal(shape.opacity, 1);
  assert.equal(shape.rotation, 180);
});

test('shape visibility respects its timeline range', () => {
  const shape = normalizeStudioShapeLayer({ start: 3, end: 7 }, 'shape');
  assert.equal(getStudioShapeLayerFrame(shape, 2, 10), null);
  assert.equal(getStudioShapeLayerFrame(shape, 4, 10)?.id, 'shape');
  assert.equal(getStudioShapeLayerFrame(shape, 8, 10), null);
});
