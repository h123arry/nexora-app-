import { createHash } from 'node:crypto';

export type CommentNotificationInput = {
  eventId: string;
  commentId: string;
  postId: string;
  actorId: string;
  recipientId: string;
  username: string;
  avatar: string;
  content: string;
  timestamp: string;
};

const validId = (value: unknown): value is string =>
  typeof value === 'string' && value.length > 0 && value.length <= 150 && !value.includes('/');

export function buildCommentNotification(input: CommentNotificationInput) {
  if (!input || !validId(input.eventId) || !validId(input.commentId) || !validId(input.postId)
    || !validId(input.actorId) || !validId(input.recipientId) || input.actorId === input.recipientId) return null;
  const username = input.username.trim().replace(/^@+/, '').slice(0, 40) || 'nexora_member';
  const snippet = input.content.trim().replace(/\s+/g, ' ').slice(0, 100);
  const digest = createHash('sha256').update(`${input.eventId}:${input.commentId}`).digest('hex').slice(0, 40);
  return {
    id: `comment_${digest}`,
    type: 'comment' as const,
    userId: input.actorId,
    username,
    avatar: input.avatar.startsWith('https://') ? input.avatar.slice(0, 1200) : '',
    targetId: input.postId,
    content: snippet ? `commented on your post: "${snippet}"` : 'commented on your post.',
    timestamp: input.timestamp,
    isRead: false,
    priority: 1,
    actionText: 'View Post',
    actionType: 'view_post' as const,
    category: 'comments' as const,
  };
}
