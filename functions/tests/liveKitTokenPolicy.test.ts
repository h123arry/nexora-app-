import test from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { createLiveKitJwt } from '../src/liveKitTokenPolicy.js';

test('LiveKit JWT signs room-scoped claims with HS256', () => {
  const secret = 'test-only-secret';
  const claims = { iss: 'test-key', sub: 'member-1', exp: 2_000_000_000, video: { roomJoin: true, room: 'nexora_room', canPublish: false, canSubscribe: true } };
  const token = createLiveKitJwt(claims, secret);
  const [header, payload, signature] = token.split('.');
  assert.deepEqual(JSON.parse(Buffer.from(header, 'base64url').toString()), { alg: 'HS256', typ: 'JWT' });
  assert.deepEqual(JSON.parse(Buffer.from(payload, 'base64url').toString()), claims);
  assert.equal(signature, createHmac('sha256', secret).update(header + '.' + payload).digest('base64url'));
});

test('LiveKit JWT refuses an empty signing secret', () => {
  assert.throws(() => createLiveKitJwt({ sub: 'member-1' }, ''), /secret is required/);
});
