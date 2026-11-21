import test from 'node:test';
import assert from 'node:assert/strict';
import { getStudioAudioDurationError, getStudioAudioImportError, STUDIO_MAX_AUDIO_IMPORT_BYTES } from '../src/utils/studioAudioImportPolicy';

test('audio import accepts supported audio blobs within the size limit', () => {
  assert.equal(getStudioAudioImportError({ type: 'audio/mpeg', size: 1024 }), null);
  assert.equal(getStudioAudioImportError({ type: 'audio/webm;codecs=opus', size: STUDIO_MAX_AUDIO_IMPORT_BYTES }), null);
});

test('audio import rejects non-audio, empty and oversized files with actionable messages', () => {
  assert.match(getStudioAudioImportError({ type: 'video/mp4', size: 1024 }) || '', /audio file/i);
  assert.match(getStudioAudioImportError({ type: 'audio/mpeg', size: 0 }) || '', /empty/i);
  assert.match(getStudioAudioImportError({ type: 'audio/mpeg', size: STUDIO_MAX_AUDIO_IMPORT_BYTES + 1 }) || '', /100 MB/i);
});

test('audio duration guard rejects unreadable and excessively long tracks', () => {
  assert.match(getStudioAudioDurationError(Number.NaN) || '', /duration/i);
  assert.match(getStudioAudioDurationError(31 * 60) || '', /30 minutes/i);
  assert.equal(getStudioAudioDurationError(180), null);
});
