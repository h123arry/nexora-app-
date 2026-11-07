import assert from 'node:assert/strict';
import test from 'node:test';
import { shouldAcceptFinalizedMediaTransition } from '../functions/src/mediaLifecyclePolicy';

test('accepts a new finalized object and its matching pending upload', () => {
  assert.equal(shouldAcceptFinalizedMediaTransition(undefined, 'owner-a'), true);
  assert.equal(shouldAcceptFinalizedMediaTransition({ ownerId: 'owner-a', status: 'pending_upload' }, 'owner-a'), true);
});

test('rejects ownership collisions and non-pending lifecycle states', () => {
  assert.equal(shouldAcceptFinalizedMediaTransition({ ownerId: 'owner-b', status: 'pending_upload' }, 'owner-a'), false);
  for (const status of ['uploaded', 'processing', 'ready', 'rejected', 'failed', undefined]) {
    assert.equal(shouldAcceptFinalizedMediaTransition({ ownerId: 'owner-a', status }, 'owner-a'), false, String(status));
  }
});
