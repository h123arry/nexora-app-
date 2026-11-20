import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { buildLiveStartNotification } from '../src/liveNotificationDelivery.js';

describe('live-start notification delivery policy', () => {
  it('creates a durable, attributed alert that points to the exact live session', () => {
    const notification = buildLiveStartNotification({
      sessionId: 'live-session-42',
      hostId: 'creator-7',
      username: 'creator',
      actorName: 'NEXORA Creator',
      avatar: 'https://cdn.example.test/avatar.webp',
      title: 'Late night studio',
      timestamp: '2026-11-20T20:00:00.000Z',
    });

    assert.deepEqual(notification, {
      id: 'live_live-session-42',
      type: 'pulse_alert',
      userId: 'creator-7',
      username: 'creator',
      actorName: 'NEXORA Creator',
      avatar: 'https://cdn.example.test/avatar.webp',
      targetId: 'live-session-42',
      content: 'NEXORA Creator is live now: Late night studio',
      timestamp: '2026-11-20T20:00:00.000Z',
      isRead: false,
      priority: 2,
      category: 'live',
      actionText: 'Join live',
      actionType: 'join_live',
    });
  });
});
