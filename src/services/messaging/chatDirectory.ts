import type { Chat, User } from '../../types';

const MAX_INBOX_CHATS = 100;

function asText(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value.slice(0, 1000) : fallback;
}

function timestampText(value: unknown): string {
  if (typeof value === 'string') return value;
  if (value && typeof value === 'object' && 'toDate' in value
    && typeof (value as { toDate?: unknown }).toDate === 'function') {
    const date = (value as { toDate: () => Date }).toDate();
    return Number.isFinite(date.getTime()) ? date.toISOString() : '';
  }
  return '';
}

export function mapInboxChatRecord(id: string, raw: Record<string, unknown>, uid: string, creators: User[]): Chat | null {
  const participants = Array.isArray(raw.participants)
    ? raw.participants.filter((item): item is string => typeof item === 'string' && item.length > 0)
    : [];
  if (!participants.includes(uid)) return null;

  const storedPartnerId = asText(raw.partnerId);
  const partnerId = storedPartnerId && storedPartnerId !== uid
    ? storedPartnerId
    : participants.find(participantId => participantId !== uid) || '';
  const partner = creators.find(creator => creator.id === partnerId);
  const isGroup = raw.isGroup === true || participants.length > 2;

  return {
    id,
    partnerId,
    partnerName: isGroup
      ? asText(raw.partnerName, asText(raw.name, asText(raw.groupName, 'Group conversation')))
      : asText(partner?.name, asText(raw.partnerName, 'NEXORA member')),
    partnerAvatar: isGroup
      ? asText(raw.partnerAvatar, asText(raw.groupBanner))
      : asText(partner?.avatar, asText(raw.partnerAvatar)),
    partnerBio: isGroup ? asText(raw.partnerBio, 'NEXORA group conversation') : asText(partner?.bio, asText(raw.partnerBio)),
    isPartnerOnline: false,
    lastMessage: asText(raw.lastMessage),
    lastTimestamp: timestampText(raw.lastTimestamp),
    unreadCount: Number.isSafeInteger(raw.unreadCount) && Number(raw.unreadCount) >= 0
      ? Number(raw.unreadCount) : 0,
    isGroup,
    ...(typeof raw.groupBanner === 'string' ? { groupBanner: raw.groupBanner } : {}),
    ...(typeof raw.groupCategory === 'string' ? { groupCategory: raw.groupCategory } : {}),
    ...(raw.groupPrivacy === 'public' || raw.groupPrivacy === 'private' || raw.groupPrivacy === 'invite'
      ? { groupPrivacy: raw.groupPrivacy } : {}),
    ...(typeof raw.groupTheme === 'string' ? { groupTheme: raw.groupTheme } : {}),
    ...(Array.isArray(raw.groupRules) ? { groupRules: raw.groupRules.filter((item): item is string => typeof item === 'string').slice(0, 20) } : {}),
    ...(typeof raw.creatorId === 'string' ? { creatorId: raw.creatorId } : {}),
    ...(typeof raw.membersCount === 'number' ? { membersCount: raw.membersCount } : {}),
    ...(typeof raw.username === 'string' ? { username: raw.username } : partner?.username ? { username: partner.username } : {}),
    ...(partner?.isVerified === true ? { isVerified: true } : {}),
  };
}

