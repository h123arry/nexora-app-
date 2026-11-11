import test from 'node:test';
import assert from 'node:assert/strict';
import { getStudioTimelineAudioPosition } from '../src/utils/studioTimelineAudioPolicy';

test('voiceover remains inactive before its project start and begins at source zero', () => {
  assert.deepEqual(getStudioTimelineAudioPosition(3, 5, 8), { active: false, sourceTime: 0 });
  assert.deepEqual(getStudioTimelineAudioPosition(5, 5, 8), { active: true, sourceTime: 0 });
  assert.deepEqual(getStudioTimelineAudioPosition(7.5, 5, 8), { active: true, sourceTime: 2.5 });
});

test('voiceover becomes inactive at its exact source duration', () => {
  assert.deepEqual(getStudioTimelineAudioPosition(13, 5, 8), { active: false, sourceTime: 8 });
});

test('soundtrack loops against its own duration while retaining global alignment', () => {
  assert.deepEqual(getStudioTimelineAudioPosition(17, 0, 6, true), { active: true, sourceTime: 5 });
});

test('invalid timeline values are clamped and unknown duration remains seekable', () => {
  assert.deepEqual(getStudioTimelineAudioPosition(Number.NaN, -4, null), { active: true, sourceTime: 0 });
  assert.deepEqual(getStudioTimelineAudioPosition(4, 8, 0), { active: false, sourceTime: 0 });
  assert.deepEqual(getStudioTimelineAudioPosition(9, 2, null), { active: true, sourceTime: 7 });
});
