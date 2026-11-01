import assert from 'node:assert/strict';
import test from 'node:test';
import { normalizeChatPreferences } from '../src/services/messaging/chatPreferences';

test('normalizes chat preference lists, removes duplicates and bounds their size', () => {
  const result = normalizeChatPreferences({
    mutedChatIds: [' chat-1 ', 'chat-1', '', 42 as any],
    blockedUserIds: ['user-1', 'user-1', ' user-2 '],
  });
  assert.deepEqual(result, {
    mutedChatIds: ['chat-1'],
    blockedUserIds: ['user-1', 'user-2'],
  });
  assert.equal(normalizeChatPreferences({
    blockedUserIds: Array.from({ length: 600 }, (_, index) => `u-${index}`),
  }).blockedUserIds.length, 500);
});

test('ignores malformed preference payloads', () => {
  assert.deepEqual(normalizeChatPreferences(null), { mutedChatIds: [], blockedUserIds: [] });
  assert.deepEqual(normalizeChatPreferences({ mutedChatIds: 'not-a-list' as any }), {
    mutedChatIds: [], blockedUserIds: [],
  });
});
