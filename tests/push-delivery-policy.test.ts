import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { buildNotificationPushData, chunkPushTokens } from '../functions/src/pushDelivery';

describe('trusted notification push delivery policy', () => {
  it('creates bounded, string-only deep-link payload data', () => {
    const data = buildNotificationPushData({ type: 'message', targetId: 'chat/with?bad', username: 'harry', actorName: 'Harry', userId: 'user-1' }, 'notification-1');
    assert.deepEqual(data, {
      type: 'message',
      targetId: 'chat/with?bad',
      notificationId: 'notification-1',
      username: 'harry',
      actorName: 'Harry',
      userId: 'user-1',
      url: '/?nxPushType=message&nxPushNotification=notification-1&nxPushTarget=chat%2Fwith%3Fbad&nxPushUser=user-1#inbox',
    });
    assert.ok(Object.values(data).every((value) => typeof value === 'string'));
  });

  it('uses a safe default route for unknown notification types', () => {
    assert.equal(buildNotificationPushData({}, 'n1').url, '/#activity');
  });


  it('preserves the exact target for post and profile push deep links', () => {
    const mention = buildNotificationPushData({ type: 'mention', targetId: 'post-42', userId: 'actor-7' }, 'mention-9');
    const mentionUrl = new URL(mention.url, 'https://nexora.example');
    assert.equal(mentionUrl.searchParams.get('nxPushType'), 'mention');
    assert.equal(mentionUrl.searchParams.get('nxPushTarget'), 'post-42');
    assert.equal(mentionUrl.searchParams.get('nxPushUser'), 'actor-7');
    assert.equal(mentionUrl.searchParams.get('nxPushNotification'), 'mention-9');

    const follow = buildNotificationPushData({ type: 'follow', userId: 'follower-3' }, 'follow-4');
    assert.match(follow.url, /#profile$/);
    assert.equal(new URL(follow.url, 'https://nexora.example').searchParams.get('nxPushUser'), 'follower-3');
  });

  it('chunks device tokens into provider-safe batches', () => {
    const tokens = Array.from({ length: 1001 }, (_, index) => `token-${index}`);
    const chunks = chunkPushTokens(tokens);
    assert.deepEqual(chunks.map((chunk) => chunk.length), [500, 500, 1]);
    assert.throws(() => chunkPushTokens(tokens, 501));
  });
});
