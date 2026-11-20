import test from 'node:test';
import assert from 'node:assert/strict';
import {
  canEndDirectCall,
  canRespondToDirectCall,
  createDirectCallVideoGrant,
  directCallRoomName,
  isDirectCallParticipant,
  validateDirectCallRequest,
} from '../src/directCallPolicy.js';

const ringing = { callerId: 'caller_123', recipientId: 'recipient_123', status: 'ringing' as const, expiresAt: 10_000 };

test('valid direct voice and video call requests require two distinct authenticated accounts', () => {
  assert.equal(validateDirectCallRequest({ callId: 'call_identifier_123', chatId: 'chat_123', callerId: 'caller_123', recipientId: 'recipient_123', type: 'voice' }).type, 'voice');
  assert.equal(validateDirectCallRequest({ callId: 'call_identifier_123', chatId: 'chat_123', callerId: 'caller_123', recipientId: 'recipient_123', type: 'video' }).type, 'video');
  assert.throws(() => validateDirectCallRequest({ callId: 'short', chatId: 'chat_123', callerId: 'caller_123', recipientId: 'recipient_123', type: 'voice' }));
  assert.throws(() => validateDirectCallRequest({ callId: 'call_identifier_123', chatId: 'chat_123', callerId: 'same_user', recipientId: 'same_user', type: 'voice' }));
  assert.throws(() => validateDirectCallRequest({ callId: 'call_identifier_123', chatId: 'chat_123', callerId: 'caller_123', recipientId: 'recipient_123', type: 'group' }));
});

test('only the intended recipient can accept a ringing unexpired call', () => {
  assert.equal(canRespondToDirectCall(ringing, 'recipient_123', 9_999), true);
  assert.equal(canRespondToDirectCall(ringing, 'caller_123', 9_999), false);
  assert.equal(canRespondToDirectCall(ringing, 'recipient_123', 10_000), false);
  assert.equal(canRespondToDirectCall({ ...ringing, status: 'accepted' }, 'recipient_123', 1), false);
});

test('only either participant can end an active call', () => {
  assert.equal(canEndDirectCall(ringing, 'caller_123'), true);
  assert.equal(canEndDirectCall(ringing, 'recipient_123'), true);
  assert.equal(canEndDirectCall(ringing, 'stranger_123'), false);
  assert.equal(canEndDirectCall({ ...ringing, status: 'declined' }, 'caller_123'), false);
});

test('call room grants are scoped and never permit data-channel publishing', () => {
  const room = directCallRoomName('call_identifier_123');
  assert.equal(room, 'nexora_call_call_identifier_123');
  assert.deepEqual(createDirectCallVideoGrant(room), {
    roomJoin: true, room, canPublish: true, canPublishData: false, canSubscribe: true, canUpdateOwnMetadata: false,
  });
  assert.throws(() => directCallRoomName('bad'));
  assert.throws(() => createDirectCallVideoGrant('nexora_other_room'));
});

test('call participant checks reject unrelated accounts and malformed participant lists', () => {
  const call = { callerId: 'caller_123', recipientId: 'recipient_123', participants: ['caller_123', 'recipient_123'] };
  assert.equal(isDirectCallParticipant(call, 'caller_123'), true);
  assert.equal(isDirectCallParticipant(call, 'recipient_123'), true);
  assert.equal(isDirectCallParticipant(call, 'stranger_123'), false);
  assert.equal(isDirectCallParticipant({ ...call, participants: ['caller_123'] }, 'caller_123'), false);
});
