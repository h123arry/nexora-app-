import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveLiveTransportRole } from '../src/liveTransportPolicy.ts';

const base = {
  status: 'live', hostId: 'host-1', userId: 'host-1', connectionId: 'connection_123',
  viewerConnectionIds: [], viewerExpiresAtMs: null, hostExpiresAtMs: 2_000, nowMs: 1_000,
};

test('live host receives host transport role only while host presence is active', () => {
  assert.equal(resolveLiveTransportRole(base), 'host');
  assert.throws(() => resolveLiveTransportRole({ ...base, hostExpiresAtMs: 900 }));
});

test('viewer transport access requires the exact active connection and an unexpired edge', () => {
  assert.equal(resolveLiveTransportRole({
    ...base, userId: 'viewer-1', viewerConnectionIds: ['connection_123'], viewerExpiresAtMs: 2_000,
  }), 'viewer');
  assert.throws(() => resolveLiveTransportRole({
    ...base, userId: 'viewer-1', viewerConnectionIds: ['another_tab'], viewerExpiresAtMs: 2_000,
  }));
  assert.throws(() => resolveLiveTransportRole({
    ...base, userId: 'viewer-1', viewerConnectionIds: ['connection_123'], viewerExpiresAtMs: 900,
  }));
});

test('ended rooms never issue video transport access', () => {
  assert.throws(() => resolveLiveTransportRole({ ...base, status: 'ended' }));
});
