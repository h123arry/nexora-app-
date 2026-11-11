import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { buildFollowNotification } from '../functions/src/followNotificationPolicy.js';

describe('trusted follow notification policy', () => {
  it('builds a durable inbox record that points back to the follower profile', () => {
    const notification = buildFollowNotification({
      eventId: 'follow-event-1',
      followerId: 'follower-1',
      followingId: 'creator-1',
      username: '@harrison',
      actorName: 'Harrison',
      avatar: 'https://cdn.example.com/avatar.webp',
      timestamp: '2026-11-11T00:00:00.000Z',
    });
    assert.ok(notification);
    assert.equal(notification.type, 'follow');
    assert.equal(notification.userId, 'follower-1');
    assert.equal(notification.targetId, 'follower-1');
    assert.equal(notification.username, 'harrison');
    assert.equal(notification.actorName, 'Harrison');
    assert.equal(notification.category, 'followers');
    assert.equal(notification.isRead, false);
    assert.equal(notification.actionType, 'view_profile');
  });

  it('uses a stable event-derived ID so retries cannot create duplicate inbox records', () => {
    const input = {
      eventId: 'same-event',
      followerId: 'follower-1',
      followingId: 'creator-1',
      username: 'harrison',
      actorName: 'Harrison',
      avatar: '',
      timestamp: '2026-11-11T00:00:00.000Z',
    };
    assert.equal(buildFollowNotification(input)?.id, buildFollowNotification(input)?.id);
    assert.notEqual(
      buildFollowNotification(input)?.id,
      buildFollowNotification({ ...input, eventId: 'another-event' })?.id,
    );
  });

  it('rejects invalid or self-follow edges and sanitizes optional profile fields', () => {
    const base = {
      eventId: 'event-1', followerId: 'user-1', followingId: 'user-2',
      username: '', actorName: '', avatar: 'javascript:alert(1)', timestamp: '2026-11-11T00:00:00.000Z',
    };
    assert.equal(buildFollowNotification({ ...base, followingId: 'user-1' }), null);
    assert.equal(buildFollowNotification({ ...base, followerId: 'bad/user' }), null);
    const notification = buildFollowNotification(base);
    assert.equal(notification?.username, 'nexora_member');
    assert.equal(notification?.actorName, 'nexora_member');
    assert.equal(notification?.avatar, '');
  });
});
