import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { mergePendingActions, retainFailedAction, type PendingAction } from '../src/services/syncQueue';

const action = (id: string, retryCount = 0): PendingAction => ({
  id, action: 'savePost', payload: { id }, timestamp: 1, retryCount,
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
});
