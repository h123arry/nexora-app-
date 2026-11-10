import test from 'node:test';
import assert from 'node:assert/strict';
import { appendHistorySnapshot, reorderById } from '../src/utils/studioHistoryPolicy';

test('history snapshots remain bounded and preserve the newest edits', () => {
  const history = appendHistorySnapshot([1, 2, 3], 4, 3);
  assert.deepEqual(history, [2, 3, 4]);
});

test('history limit is safely clamped', () => {
  assert.deepEqual(appendHistorySnapshot([1], 2, 0), [2]);
  assert.equal(appendHistorySnapshot([], 1, 999).length, 1);
});

test('clip reordering moves a clip to the dropped position', () => {
  const clips = [{ id: 'a' }, { id: 'b' }, { id: 'c' }, { id: 'd' }];
  assert.deepEqual(reorderById(clips, 'a', 'c').map(item => item.id), ['b', 'c', 'a', 'd']);
  assert.deepEqual(reorderById(clips, 'd', 'b').map(item => item.id), ['a', 'd', 'b', 'c']);
});

test('clip reordering safely ignores missing or identical ids', () => {
  const clips = [{ id: 'a' }, { id: 'b' }];
  assert.equal(reorderById(clips, 'a', 'a'), clips);
  assert.equal(reorderById(clips, 'x', 'b'), clips);
});
