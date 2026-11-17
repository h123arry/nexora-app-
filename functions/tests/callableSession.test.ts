import test from 'node:test';
import assert from 'node:assert/strict';
import { callableSessionStatusAllows } from '../src/callableSession.js';

const timestamp = (seconds: number) => ({ toMillis: () => seconds * 1000 });

test('allows sessions when no server revocation state exists', () => {
  assert.equal(callableSessionStatusAllows(null, undefined), true);
  assert.equal(callableSessionStatusAllows({}, undefined), true);
});

test('denies every session while revocation handoff is pending', () => {
  assert.equal(callableSessionStatusAllows({ sessionRevocationPending: true }, 9999999999), false);
  assert.equal(callableSessionStatusAllows({ sessionRevocationPending: true, sessionsRevokedAfter: timestamp(100) }, 101), false);
});

test('denies old and malformed auth times after the server cutoff but permits fresh authentication', () => {
  const status = { sessionRevocationPending: false, sessionsRevokedAfter: timestamp(200) };
  assert.equal(callableSessionStatusAllows(status, 199), false);
  assert.equal(callableSessionStatusAllows(status, undefined), false);
  assert.equal(callableSessionStatusAllows(status, '200'), false);
  assert.equal(callableSessionStatusAllows(status, 200), false);
  assert.equal(callableSessionStatusAllows(status, 201), true);
  assert.equal(callableSessionStatusAllows(status, 201), true);
});

test('fails closed when the stored revocation cutoff is malformed', () => {
  assert.equal(callableSessionStatusAllows({ sessionsRevokedAfter: 'not-a-timestamp' }, 9999999999), false);
});
