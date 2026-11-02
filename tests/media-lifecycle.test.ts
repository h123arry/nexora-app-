import test from 'node:test';
import assert from 'node:assert/strict';
import { assertMediaTransition, canTransitionMedia } from '../src/services/media/mediaLifecycle';
import { videoFileExtension } from '../src/services/media/videoFileExtension';

test('media lifecycle allows only forward processing transitions', () => {
  assert.equal(canTransitionMedia('pending_upload', 'uploaded'), true);
  assert.equal(canTransitionMedia('uploaded', 'processing'), true);
  assert.equal(canTransitionMedia('processing', 'ready'), true);
  assert.equal(canTransitionMedia('ready', 'processing'), false);
  assert.equal(canTransitionMedia('rejected', 'ready'), false);
});

test('media lifecycle rejects invalid transitions with an actionable error', () => {
  assert.throws(
    () => assertMediaTransition('pending_upload', 'ready'),
    /Invalid media lifecycle transition: pending_upload -> ready/,
  );
});


test('video filenames retain the extension matching their validated MIME type', () => {
  assert.equal(videoFileExtension('video/mp4'), 'mp4');
  assert.equal(videoFileExtension('video/webm; codecs=vp9'), 'webm');
  assert.equal(videoFileExtension('video/quicktime'), 'mov');
  assert.equal(videoFileExtension('video/ogg'), 'ogv');
  assert.equal(videoFileExtension('video/unknown'), null);
});
