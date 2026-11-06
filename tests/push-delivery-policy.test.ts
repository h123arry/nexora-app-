import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { buildNotificationPushData, chunkPushTokens } from '../functions/src/pushDelivery';

describe('trusted notification push delivery policy', () => {
  it('creates bounded, string-only deep-link payload data', () => {
    const data = buildNotificationPushData({ type: 'message', targetId: 'chat/with?bad' }, 'notification-1');
    assert.deepEqual(data, {
      type: 'message',
      targetId: 'chat/with?bad',
      notificationId: 'notification-1',
      url: '/inbox?chatId=chat%2Fwith%3Fbad',
    });
    assert.ok(Object.values(data).every((value) => typeof value === 'string'));
  });

  it('uses a safe default route for unknown notification types', () => {
    assert.equal(buildNotificationPushData({}, 'n1').url, '/pulse');
  });

  it('chunks device tokens into provider-safe batches', () => {
    const tokens = Array.from({ length: 1001 }, (_, index) => `token-${index}`);
    const chunks = chunkPushTokens(tokens);
    assert.deepEqual(chunks.map((chunk) => chunk.length), [500, 500, 1]);
    assert.throws(() => chunkPushTokens(tokens, 501));
  });
});
