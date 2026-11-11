import test from 'node:test';
import assert from 'node:assert/strict';
import { getStudioClipTimelinePosition, normalizeStudioTimelineTime } from '../src/utils/studioTimelinePolicy';

const clips = [
  { id: 'a', start: 2, end: 7 },
  { id: 'b', start: 1, end: 4 },
  { id: 'c', start: 0, end: 2 },
];

test('shared timeline maps global time into each clip source range', () => {
  assert.deepEqual(getStudioClipTimelinePosition(clips, 0), {
    clipId: 'a', clipIndex: 0, globalTime: 0, localTime: 2, clipOffset: 0,
  });
  assert.deepEqual(getStudioClipTimelinePosition(clips, 5.5), {
    clipId: 'b', clipIndex: 1, globalTime: 5.5, localTime: 1.5, clipOffset: 5,
  });
  assert.deepEqual(getStudioClipTimelinePosition(clips, 8), {
    clipId: 'c', clipIndex: 2, globalTime: 8, localTime: 1, clipOffset: 8,
  });
});

test('shared timeline uses the next clip at an exact clip boundary', () => {
  const position = getStudioClipTimelinePosition(clips, 5);
  assert.equal(position?.clipId, 'b');
  assert.equal(position?.localTime, 1);
});

test('shared timeline clamps seeks before zero and before the exclusive end', () => {
  assert.equal(normalizeStudioTimelineTime(-5, 10), 0);
  assert.equal(normalizeStudioTimelineTime(20, 10), 9.999);
  assert.equal(getStudioClipTimelinePosition(clips, 100)?.clipId, 'c');
});

test('shared timeline safely rejects invalid and empty timelines', () => {
  assert.equal(getStudioClipTimelinePosition([], 1), null);
  assert.equal(getStudioClipTimelinePosition(clips, Number.NaN), null);
  assert.equal(getStudioClipTimelinePosition([{ id: 'empty', start: 2, end: 2 }], 0), null);
});
