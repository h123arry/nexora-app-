import test from 'node:test';
import assert from 'node:assert/strict';
import { buildWaveformPeaks, getAudioEnvelopeGain, getDuckedMusicGain } from '../src/utils/studioAudioPolicy';

test('audio envelope applies fade-in, fade-out and base volume', () => {
  const input = { volume: 0.8, elapsed: 0, totalDuration: 20, fadeIn: 4, fadeOut: 4 };
  assert.equal(getAudioEnvelopeGain(input), 0);
  assert.equal(getAudioEnvelopeGain({ ...input, elapsed: 2 }), 0.4);
  assert.equal(getAudioEnvelopeGain({ ...input, elapsed: 18 }), 0.4);
  assert.equal(getAudioEnvelopeGain({ ...input, elapsed: 20 }), 0);
});

test('audio envelope clamps invalid and out-of-range values', () => {
  assert.equal(getAudioEnvelopeGain({ volume: 3, elapsed: 5, totalDuration: 10, fadeIn: 0, fadeOut: 0 }), 1);
  assert.equal(getAudioEnvelopeGain({ volume: -1, elapsed: 5, totalDuration: 10, fadeIn: 0, fadeOut: 0 }), 0);
  assert.equal(getAudioEnvelopeGain({ volume: 0.5, elapsed: Number.NaN, totalDuration: 10, fadeIn: 0, fadeOut: 0 }), 0.5);
});

test('music ducks only while the voiceover is active', () => {
  const input = { volume: 0.8, elapsed: 5, totalDuration: 30, fadeIn: 0, fadeOut: 0, duckingEnabled: true, voiceoverStart: 4, voiceoverDuration: 8, duckingLevel: 0.25 };
  assert.equal(getDuckedMusicGain(input), 0.2);
  assert.equal(getDuckedMusicGain({ ...input, elapsed: 13 }), 0.8);
  assert.equal(getDuckedMusicGain({ ...input, duckingEnabled: false }), 0.8);
});

test('waveform builder returns normalized peaks with bounded bar count', () => {
  const peaks = buildWaveformPeaks([0, -0.25, 0.5, -1, 0.25, 0], 3);
  assert.deepEqual(peaks, [0.25, 1, 0.25]);
  assert.deepEqual(buildWaveformPeaks([], 12), []);
  assert.equal(buildWaveformPeaks([0, 0, 0], 4).length, 4);
  assert.equal(buildWaveformPeaks([1], 999).length, 512);
});
