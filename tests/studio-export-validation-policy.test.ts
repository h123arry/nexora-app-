import test from 'node:test';
import assert from 'node:assert/strict';
import { getStudioExportValidationError } from '../src/utils/studioExportValidationPolicy';

const expected = { durationSeconds: 12, width: 720, height: 1280 };
const valid = { mimeType: 'video/webm;codecs=vp9,opus', sizeBytes: 2_000_000, durationSeconds: 12.2, width: 720, height: 1280 };

test('accepts a readable WebM export matching the timeline and selected dimensions', () => {
  assert.equal(getStudioExportValidationError(valid, expected), null);
});

test('rejects empty or unsupported export output', () => {
  assert.match(getStudioExportValidationError({ ...valid, sizeBytes: 0 }, expected) || '', /empty/i);
  assert.match(getStudioExportValidationError({ ...valid, mimeType: 'video/mp4' }, expected) || '', /WebM/i);
});

test('rejects output with incorrect dimensions', () => {
  assert.match(getStudioExportValidationError({ ...valid, width: 1080 }, expected) || '', /dimensions/i);
});

test('rejects output with a materially incomplete or extended timeline', () => {
  assert.match(getStudioExportValidationError({ ...valid, durationSeconds: 5 }, expected) || '', /duration/i);
  assert.match(getStudioExportValidationError({ ...valid, durationSeconds: 20 }, expected) || '', /duration/i);
});

test('rejects unreadable media metadata', () => {
  assert.match(getStudioExportValidationError({ ...valid, durationSeconds: Number.NaN }, expected) || '', /duration/i);
});
