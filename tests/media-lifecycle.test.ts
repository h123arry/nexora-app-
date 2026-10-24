import test from 'node:test';
import assert from 'node:assert/strict';
import { assertMediaTransition, canTransitionMedia } from '../src/services/media/mediaLifecycle';

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
