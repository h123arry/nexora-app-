import assert from 'node:assert/strict';
import test from 'node:test';
import { isRecentAccountAuthentication } from '../src/accountSecurityPolicy.ts';

test('session revocation requires a valid recent authentication timestamp', () => {
  assert.equal(isRecentAccountAuthentication(900, 1000), true);
  assert.equal(isRecentAccountAuthentication(699, 1000), false);
  assert.equal(isRecentAccountAuthentication(1001, 1000), false);
  assert.equal(isRecentAccountAuthentication(undefined, 1000), false);
  assert.equal(isRecentAccountAuthentication(Number.NaN, 1000), false);
});
