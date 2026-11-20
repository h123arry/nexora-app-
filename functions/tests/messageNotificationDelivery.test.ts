import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { buildDirectMessageNotification } from '../src/messageNotificationDelivery.js';

describe('direct-message notification delivery policy', () => {
  it('creates an attributed notification addressed to the exact chat', () => {
    const notification = buildDirectMessageNotification({
      messageId: 'msg-123',
      chatId: 'dm-user-a-user-b',
      senderId: 'user-a',
      username: 'harrison',
      actorName: 'Harrison',
      avatar: 'https://cdn.example.test/harrison.webp',
      preview: 'Hey, are you free?',
      timestamp: '2026-11-20T20:00:00.000Z',
    });
    assert.equal(notification.id, 'message_msg-123');
    assert.equal(notification.type, 'message');
    assert.equal(notification.userId, 'user-a');
    assert.equal(notification.targetId, 'dm-user-a-user-b');
    assert.equal(notification.content, 'Hey, are you free?');
    assert.equal(notification.isRead, false);
    assert.equal(notification.actionType, 'open_chat');
  });
});
