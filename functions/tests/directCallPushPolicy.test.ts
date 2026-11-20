import assert from 'node:assert/strict';
import test from 'node:test';
import { createIncomingDirectCallPush } from '../src/directCallPushPolicy.js';

test('incoming voice call push displays an urgent visible alert across supported transports', () => {
  const message = createIncomingDirectCallPush({
    callId: 'call_123456789012',
    chatId: 'chat_123456789012',
    callerId: 'caller-1',
    callerName: 'Harrison',
    callType: 'voice',
  });
  assert.equal(message.notification.title, 'Harrison is calling');
  assert.match(message.notification.body, /voice call/);
  assert.equal(message.android.priority, 'high');
  assert.equal(message.android.notification.channelId, 'nexora_calls');
  assert.equal(message.android.notification.sound, 'default');
  assert.equal(message.apns.headers['apns-push-type'], 'alert');
  assert.equal(message.apns.payload.aps.sound, 'default');
  assert.equal(message.data.type, 'incoming_call');
  assert.equal(message.data.callId, 'call_123456789012');
  assert.equal(message.webpush.notification.requireInteraction, true);
});

test('incoming video call push uses video wording and bounds caller names', () => {
  const message = createIncomingDirectCallPush({
    callId: 'call_123456789012',
    chatId: 'chat_123456789012',
    callerId: 'caller-1',
    callerName: 'A'.repeat(200),
    callType: 'video',
  });
  assert.equal(message.notification.body, 'Incoming video call on NEXORA');
  assert.equal(message.notification.title.length, 91);
});
