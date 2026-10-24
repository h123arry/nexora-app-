import assert from 'node:assert/strict';
import test from 'node:test';
import { cacheManager } from '../src/services/cache/cacheService';
import { mergePendingActions, PendingAction } from '../src/services/syncQueue';

function action(id: string, timestamp: number, retryCount = 0): PendingAction {
  return {
    id,
    action: 'savePost',
    payload: { id },
    timestamp,
    retryCount,
  };
}

test('offline queue merge preserves work added during a flush', () => {
  const initial = [action('success', 1), action('failed', 1)];
  const failed = [action('failed', 1, 1)];
  const latest = [
    action('success', 1),
    action('failed', 2, 1),
    action('new', 3),
  ];

  assert.deepEqual(
    mergePendingActions(initial, failed, latest).map(item => item.id),
    ['failed', 'new'],
  );
});

test('entity cache evicts the least recently used entries', () => {
  cacheManager.clearAll();
  for (let index = 0; index < 301; index += 1) {
    cacheManager.setPost(`post-${index}`, { id: `post-${index}` } as any);
  }

  assert.equal(cacheManager.getPost('post-0'), null);
  assert.equal(cacheManager.getPost('post-300')?.id, 'post-300');
  cacheManager.clearAll();
});
