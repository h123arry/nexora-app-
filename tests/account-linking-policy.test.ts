import assert from 'node:assert/strict';
import test from 'node:test';
import { hasLinkedProvider, isRecentAuthentication } from '../src/services/firebase/accountLinkingPolicy.ts';

test('sensitive provider linking requires a recent, valid authentication timestamp', () => {
  assert.equal(isRecentAuthentication(900, 1000), true);
  assert.equal(isRecentAuthentication(699, 1000), false);
  assert.equal(isRecentAuthentication(1001, 1000), false);
  assert.equal(isRecentAuthentication(undefined, 1000), false);
  assert.equal(isRecentAuthentication(Number.NaN, 1000), false);
});

test('provider linking does not duplicate an already-linked identity provider', () => {
  assert.equal(hasLinkedProvider(['password', 'google.com'], 'google.com'), true);
  assert.equal(hasLinkedProvider(['password'], 'google.com'), false);
});
