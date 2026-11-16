import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('transient rate-limit collections have Firestore TTL policies on expiresAt', async () => {
  const config = JSON.parse(await readFile(new URL('../firestore.indexes.json', import.meta.url), 'utf8'));
  const overrides = config.fieldOverrides || [];
  for (const collectionGroup of [
    'payoutOtpRateLimits',
    'ngnBankLookupRateLimits',
    'chatMediaRateLimits',
    'chatMediaPlaybackRateLimits',
  ]) {
    const policy = overrides.find(item => item.collectionGroup === collectionGroup && item.fieldPath === 'expiresAt');
    assert.ok(policy, `Missing expiresAt field override for ${collectionGroup}`);
    assert.equal(policy.ttl, true, `TTL must be enabled for ${collectionGroup}`);
    assert.deepEqual(policy.indexes, [], `TTL-only field should not retain unnecessary single-field indexes for ${collectionGroup}`);
  }
});
