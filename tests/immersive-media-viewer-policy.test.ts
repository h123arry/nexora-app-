import test from 'node:test';
import assert from 'node:assert/strict';
import { getNearestMediaIndex, resolvePreservedMediaIndex } from '../src/utils/immersiveMediaViewerPolicy';

test('preserves the currently viewed post when creator posts reorder', () => {
  const posts = [{ id: 'c' }, { id: 'a' }, { id: 'b' }];
  assert.equal(resolvePreservedMediaIndex(posts, 'b', 'a', 'a'), 2);
});

test('uses the newly selected initial post when the viewer is opened for another post', () => {
  const posts = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];
  assert.equal(resolvePreservedMediaIndex(posts, 'a', 'c', 'a'), 2);
});

test('falls back to the first available post when the active post was removed', () => {
  const posts = [{ id: 'a' }, { id: 'c' }];
  assert.equal(resolvePreservedMediaIndex(posts, 'missing', 'a', 'a'), 0);
});

test('snaps to the nearest full-screen page and clamps to available posts', () => {
  assert.equal(getNearestMediaIndex(0, 800, 4), 0);
  assert.equal(getNearestMediaIndex(430, 800, 4), 1);
  assert.equal(getNearestMediaIndex(399, 800, 4), 0);
  assert.equal(getNearestMediaIndex(9000, 800, 4), 3);
  assert.equal(getNearestMediaIndex(200, 0, 4), 0);
});
