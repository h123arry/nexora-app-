import test from 'node:test';
import assert from 'node:assert/strict';
import { canAddStudioSubtitle, isStudioSubtitleVisible, normalizeStudioSubtitleSegment } from '../src/utils/studioSubtitlePolicy';

test('subtitle segments clamp times and text length', () => {
  const segment = normalizeStudioSubtitleSegment({ id: 's1', text: 'x'.repeat(220), start: -4, end: 900 }, 'fallback', 12);
  assert.equal(segment.id, 's1');
  assert.equal(segment.text.length, 180);
  assert.equal(segment.start, 0);
  assert.equal(segment.end, 12);
});

test('subtitle segments enforce a positive interval and bounded values', () => {
  const segment = normalizeStudioSubtitleSegment({ start: 5, end: 4 }, 's2', 20);
  assert.equal(segment.start, 5);
  assert.equal(segment.end, 5.1);
});

test('subtitle visibility uses an inclusive start and exclusive end', () => {
  const segment = normalizeStudioSubtitleSegment({ text: 'Hello', start: 2, end: 4 }, 's3', 10);
  assert.equal(isStudioSubtitleVisible(segment, 1.99), false);
  assert.equal(isStudioSubtitleVisible(segment, 2), true);
  assert.equal(isStudioSubtitleVisible(segment, 3.99), true);
  assert.equal(isStudioSubtitleVisible(segment, 4), false);
  assert.equal(isStudioSubtitleVisible({ ...segment, text: '   ' }, 3), false);
});

test('subtitle count is bounded to thirty segments', () => {
  assert.equal(canAddStudioSubtitle(Array.from({ length: 29 }, (_, i) => normalizeStudioSubtitleSegment({}, String(i)))), true);
  assert.equal(canAddStudioSubtitle(Array.from({ length: 30 }, (_, i) => normalizeStudioSubtitleSegment({}, String(i)))), false);
});
