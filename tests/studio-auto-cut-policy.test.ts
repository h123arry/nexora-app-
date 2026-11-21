import test from 'node:test';
import assert from 'node:assert/strict';
import {
  analyzeStudioAudioBeats,
  buildStudioAutoCutSegments,
  createStudioFallbackBeatGrid,
} from '../src/utils/studioAutoCutPolicy';

test('audio beat analysis estimates a regular pulse from a synthetic rhythmic signal', () => {
  const sampleRate = 16000;
  const duration = 8;
  const samples = new Float32Array(sampleRate * duration);
  for (let beat = 0; beat < duration; beat += 0.5) {
    const start = Math.floor(beat * sampleRate);
    for (let i = 0; i < 160 && start + i < samples.length; i += 1) {
      samples[start + i] = Math.sin((i / sampleRate) * 2 * Math.PI * 110) * Math.exp(-i / 24);
    }
  }
  const analysis = analyzeStudioAudioBeats(samples, sampleRate);
  assert.ok(analysis.bpm >= 65 && analysis.bpm <= 160);
  assert.ok(analysis.beats.length > 4);
  assert.ok(analysis.duration > 7.9);
});

test('beat grid fallback creates predictable pacing and rejects invalid durations', () => {
  assert.deepEqual(createStudioFallbackBeatGrid(4, 1), [1, 2, 3]);
  assert.deepEqual(createStudioFallbackBeatGrid(-1), []);
});

test('auto cut splits source clips on beat boundaries while preserving source ranges and metadata', () => {
  const clips = [{
    id: 'source', name: 'Original', start: 0, end: 4, duration: 4, volume: 0.8,
    keyframes: [{ time: 1, x: .2, y: .3, scale: 1, rotation: 0, opacity: 1 }, { time: 3, x: .7, y: .6, scale: 1.2, rotation: 0, opacity: 1 }],
  }];
  let id = 0;
  const segments = buildStudioAutoCutSegments(clips, [1, 2, 3], () => `segment-${++id}`);
  assert.equal(segments.length, 4);
  assert.deepEqual(segments.map(item => [item.start, item.end]), [[0, 1], [1, 2], [2, 3], [3, 4]]);
  assert.deepEqual(segments[1].keyframes.map(frame => frame.time), [0]);
  assert.equal(segments[0].volume, .8);
  assert.equal(new Set(segments.map(item => item.id)).size, 4);
});

test('auto cut ignores beat points that would create unusably short fragments', () => {
  const clips = [{ id: 'x', name: 'X', start: 0, end: 2, duration: 2, keyframes: [] }];
  const segments = buildStudioAutoCutSegments(clips, [.2, .4, .8, 1.2, 1.8], () => 'new');
  assert.ok(segments.every(item => item.end - item.start >= .45));
  assert.equal(segments[0].start, 0);
  assert.equal(segments.at(-1)?.end, 2);
});
