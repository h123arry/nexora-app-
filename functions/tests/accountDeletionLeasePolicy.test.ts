import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { canClaimDeletionLease, ownsDeletionLease } from '../src/accountDeletionLeasePolicy.ts';

describe('account deletion lease policy', () => {
  it('allows pending, failed and expired processing requests to be claimed', () => {
    assert.equal(canClaimDeletionLease('pending', undefined, 1000), true);
    assert.equal(canClaimDeletionLease('failed', undefined, 1000), true);
    assert.equal(canClaimDeletionLease('processing', 999, 1000), true);
    assert.equal(canClaimDeletionLease('processing', undefined, 1000), true);
  });
  it('does not reclaim active, completed or cancelled requests', () => {
    assert.equal(canClaimDeletionLease('processing', 1001, 1000), false);
    assert.equal(canClaimDeletionLease('completed', undefined, 1000), false);
    assert.equal(canClaimDeletionLease('cancelled', undefined, 1000), false);
  });
  it('allows only the current processing lease holder to update progress', () => {
    assert.equal(ownsDeletionLease('processing', 'lease-current', 'lease-current'), true);
    assert.equal(ownsDeletionLease('processing', 'lease-new', 'lease-old'), false);
    assert.equal(ownsDeletionLease('completed', 'lease-current', 'lease-current'), false);
    assert.equal(ownsDeletionLease('processing', null, 'lease-current'), false);
    assert.equal(ownsDeletionLease('processing', 'lease-current', ''), false);
  });
});
