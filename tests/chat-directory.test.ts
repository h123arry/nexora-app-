import test from 'node:test';
import assert from 'node:assert/strict';
import { mapInboxChatRecord } from '../src/services/messaging/chatDirectory';
import type { User } from '../src/types';

const user = (id: string, name: string): User => ({
  id, name, username: name.toLowerCase(), avatar: id + '.png', bio: name + ' bio',
} as User);

test('maps a direct conversation for the recipient using the other participant profile', () => {
  const mapped = mapInboxChatRecord('chat-1', {
    participants: ['recipient', 'sender'],
    partnerId: 'recipient',
    partnerName: 'Recipient',
    lastMessage: 'Hello',
    lastTimestamp: '2026-11-04T19:00:00.000Z',
    unreadCount: 2,
  }, 'recipient', [user('sender', 'Sender')]);
  assert.ok(mapped);
  assert.equal(mapped.partnerId, 'sender');
  assert.equal(mapped.partnerName, 'Sender');
  assert.equal(mapped.partnerAvatar, 'sender.png');
  assert.equal(mapped.lastMessage, 'Hello');
  assert.equal(mapped.unreadCount, 2);
});

test('maps group conversations without exposing a participant as the group title', () => {
  const mapped = mapInboxChatRecord('group-1', {
    participants: ['a', 'b', 'c'],
    isGroup: true,
    name: 'Design Circle',
    groupBanner: 'banner.png',
    lastTimestamp: { toDate: () => new Date('2026-11-04T19:00:00.000Z') },
  }, 'a', [user('b', 'B'), user('c', 'C')]);
  assert.ok(mapped);
  assert.equal(mapped.isGroup, true);
  assert.equal(mapped.partnerName, 'Design Circle');
  assert.equal(mapped.partnerAvatar, 'banner.png');
  assert.equal(mapped.lastTimestamp, '2026-11-04T19:00:00.000Z');
});

test('rejects chat records that do not include the signed-in account', () => {
  assert.equal(mapInboxChatRecord('chat-2', { participants: ['a', 'b'] }, 'c', []), null);
});

test('bounds unread counts and tolerates malformed optional chat metadata', () => {
  const mapped = mapInboxChatRecord('chat-3', {
    participants: ['a', 'b'],
    unreadCount: -1,
    partnerName: { invalid: true },
  }, 'a', []);
  assert.ok(mapped);
  assert.equal(mapped.unreadCount, 0);
  assert.equal(mapped.partnerName, 'NEXORA member');
});
