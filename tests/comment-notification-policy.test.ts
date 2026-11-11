import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { buildCommentNotification } from '../functions/src/commentNotificationPolicy.js';

describe('trusted comment notification policy', () => {
  it('creates a post-targeted notification with the commenter identity and safe snippet', () => {
    const notification = buildCommentNotification({
      eventId: 'post-update-1',
      commentId: 'comment-1',
      postId: 'post-1',
      actorId: 'commenter-1',
      recipientId: 'author-1',
      username: '@harrison',
      avatar: 'https://cdn.example.com/avatar.webp',
      content: '  Great   post!  ',
      timestamp: '2026-11-11T00:00:00.000Z',
    });
    assert.ok(notification);
    assert.equal(notification.type, 'comment');
    assert.equal(notification.userId, 'commenter-1');
    assert.equal(notification.targetId, 'post-1');
    assert.equal(notification.username, 'harrison');
    assert.equal(notification.content, 'commented on your post: "Great post!"');
    assert.equal(notification.category, 'comments');
    assert.equal(notification.actionType, 'view_post');
    assert.equal(notification.isRead, false);
  });

  it('uses a stable event and comment ID so retries do not duplicate the inbox record', () => {
    const input = {
      eventId: 'same-event', commentId: 'comment-1', postId: 'post-1',
      actorId: 'commenter-1', recipientId: 'author-1', username: 'harrison',
      avatar: '', content: 'Nice', timestamp: '2026-11-11T00:00:00.000Z',
    };
    assert.equal(buildCommentNotification(input)?.id, buildCommentNotification(input)?.id);
    assert.notEqual(buildCommentNotification(input)?.id, buildCommentNotification({
      ...input, commentId: 'comment-2',
    })?.id);
  });

  it('rejects self-comments and invalid identifiers and sanitizes unsafe avatars', () => {
    const input = {
      eventId: 'event-1', commentId: 'comment-1', postId: 'post-1',
      actorId: 'author-1', recipientId: 'author-1', username: '', avatar: 'javascript:alert(1)',
      content: '', timestamp: '2026-11-11T00:00:00.000Z',
    };
    assert.equal(buildCommentNotification(input), null);
    const notification = buildCommentNotification({
      ...input, actorId: 'commenter-1', commentId: 'bad/comment',
    });
    assert.equal(notification, null);
    const safe = buildCommentNotification({ ...input, actorId: 'commenter-1' });
    assert.equal(safe?.avatar, '');
    assert.equal(safe?.content, 'commented on your post.');
  });
});
