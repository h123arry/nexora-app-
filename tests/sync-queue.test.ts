import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { mergePendingActions, retainFailedAction, type PendingAction } from '../src/services/syncQueue';

const action = (id: string, retryCount = 0, timestamp = 1): PendingAction => ({
  id, action: 'savePost', payload: { id }, timestamp, retryCount,
});

describe('offline sync queue persistence', () => {
  it('keeps failed actions after more than five retries', () => {
    const failed = retainFailedAction(action('post-1', 5));
    assert.equal(failed.retryCount, 6);
    assert.equal(failed.id, 'post-1');
  });

  it('keeps retry counts safe and bounded at the numeric limit', () => {
    const failed = retainFailedAction(action('post-2', Number.MAX_SAFE_INTEGER));
    assert.equal(failed.retryCount, Number.MAX_SAFE_INTEGER);
  });

  it('preserves actions added while an earlier queue snapshot is syncing', () => {
    const original = action('old');
    const added = action('new');
    assert.deepEqual(mergePendingActions([original], [], [original, added]), [added]);
  });

  it('keeps failed work while removing successful work', () => {
    const failed = action('failed', 1);
    const successful = action('successful');
    assert.deepEqual(mergePendingActions([failed, successful], [failed], [failed, successful]), [failed]);
  });

  it('preserves the incremented retry count instead of restoring a stale queue snapshot', () => {
    const original = action('retry-me', 5);
    const retried = retainFailedAction(original);
    const [merged] = mergePendingActions([original], [retried], [original]);
    assert.equal(merged.retryCount, 6);
  });

  it('lets a newer action replace the failed snapshot for the same ID', () => {
    const original = action('edited', 2, 1);
    const newer = action('edited', 0, 2);
    const retried = retainFailedAction(original);
    const [merged] = mergePendingActions([original], [retried], [newer]);
    assert.equal(merged.timestamp, 2);
    assert.equal(merged.retryCount, 0);
  });
});
