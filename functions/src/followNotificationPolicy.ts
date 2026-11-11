import { createHash } from 'node:crypto';

export type FollowNotificationInput = {
  eventId: string;
  followerId: string;
  followingId: string;
  username: string;
  actorName: string;
  avatar: string;
  timestamp: string;
};

const validId = (value: unknown): value is string =>
  typeof value === 'string' && value.length > 0 && value.length <= 128 && !value.includes('/');

export function buildFollowNotification(input: FollowNotificationInput) {
  if (!input || !validId(input.eventId) || !validId(input.followerId)
    || !validId(input.followingId) || input.followerId === input.followingId) return null;
  const username = input.username.trim().replace(/^@+/, '').slice(0, 40) || 'nexora_member';
  const actorName = input.actorName.trim().slice(0, 80) || username;
  const avatar = input.avatar.startsWith('https://') ? input.avatar.slice(0, 1200) : '';
  const id = 'follow_' + createHash('sha256').update(input.eventId).digest('hex').slice(0, 40);
  return {
    id,
    type: 'follow' as const,
    userId: input.followerId,
    username,
    actorName,
    avatar,
    targetId: input.followerId,
    content: 'started following you.',
    timestamp: input.timestamp,
    isRead: false,
    priority: 1,
    actionText: 'View Profile',
    actionType: 'view_profile' as const,
    category: 'followers' as const,
  };
}
