import test from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { createLiveKitJwt, createLiveKitVideoGrant } from '../src/liveKitTokenPolicy.js';

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

test('LiveKit host grants allow video publishing but deny data-channel publishing', () => {
  assert.deepEqual(createLiveKitVideoGrant('nexora_room_123', true), {
    roomJoin: true,
    room: 'nexora_room_123',
    canPublish: true,
    canPublishData: false,
    canSubscribe: true,
    canUpdateOwnMetadata: false,
  });
});

test('LiveKit viewer grants are subscribe-only and cannot publish media or data', () => {
  assert.deepEqual(createLiveKitVideoGrant('nexora_room_123', false), {
    roomJoin: true,
    room: 'nexora_room_123',
    canPublish: false,
    canPublishData: false,
    canSubscribe: true,
    canUpdateOwnMetadata: false,
  });
});

test('LiveKit grants reject empty or oversized room names', () => {
  assert.throws(() => createLiveKitVideoGrant('', false), /valid LiveKit room/);
  assert.throws(() => createLiveKitVideoGrant('x'.repeat(136), false), /valid LiveKit room/);
});
