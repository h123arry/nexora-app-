import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { buildNotificationPushData, chunkPushTokens, notificationPreferenceKey, shouldSendNotificationPush } from '../functions/src/pushDelivery';

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
    assert.equal(new URL(buildNotificationPushData({}, 'n1').url, 'https://nexora.example').searchParams.get('nxPushType'), 'system');
    assert.match(buildNotificationPushData({}, 'n1').url, /#activity$/);
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

    const live = buildNotificationPushData({ type: 'pulse_alert', targetId: 'live-42', userId: 'creator-2' }, 'live-5');
    assert.match(live.url, /#live$/);
    assert.equal(new URL(live.url, 'https://nexora.example').searchParams.get('nxPushTarget'), 'live-42');
  });

  it('maps notification types to their matching preference categories', () => {
    assert.equal(notificationPreferenceKey('spark'), 'likes');
    assert.equal(notificationPreferenceKey('comment_reply'), 'comments');
    assert.equal(notificationPreferenceKey('follow'), 'followers');
    assert.equal(notificationPreferenceKey('repost'), 'reposts');
    assert.equal(notificationPreferenceKey('mention'), 'mentions');
    assert.equal(notificationPreferenceKey('community_invite'), 'communities');
    assert.equal(notificationPreferenceKey('event_reminder'), 'events');
    assert.equal(notificationPreferenceKey('verification_approved'), 'verification');
    assert.equal(notificationPreferenceKey('creator_upload'), 'creatorUploads');
    assert.equal(notificationPreferenceKey('friend_request'), 'friendRequests');
    assert.equal(notificationPreferenceKey('security_alert'), 'securityAlerts');
    assert.equal(notificationPreferenceKey('unknown_future_type'), null);
  });

  it('honors push master and per-category preferences without suppressing unknown types', () => {
    assert.equal(shouldSendNotificationPush({ push: false }, 'follow'), false);
    assert.equal(shouldSendNotificationPush({ push: true, followers: false }, 'follow'), false);
    assert.equal(shouldSendNotificationPush({ push: true, followers: true }, 'follow'), true);
    assert.equal(shouldSendNotificationPush({ comments: false }, 'comment_reply'), false);
    assert.equal(shouldSendNotificationPush({ likes: false }, 'spark'), false);
    assert.equal(shouldSendNotificationPush({ push: true }, 'unknown_future_type'), true);
    assert.equal(shouldSendNotificationPush(undefined, 'follow'), true);
  });

  it('chunks device tokens into provider-safe batches', () => {
    const tokens = Array.from({ length: 1001 }, (_, index) => `token-${index}`);
    const chunks = chunkPushTokens(tokens);
    assert.deepEqual(chunks.map((chunk) => chunk.length), [500, 500, 1]);
    assert.throws(() => chunkPushTokens(tokens, 501));
  });
});
