export const MAX_BLOCKED_USERS = 500;

export interface BlockedUserLists {
  blockedUserIds: string[];
  blockedCreatorIds: string[];
  blocked: boolean;
}

function normalizeIds(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return [...new Set(value
    .filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
    .map(item => item.trim().slice(0, 160)))].slice(0, MAX_BLOCKED_USERS);
}

export function updateBlockedUserLists(input: {
  ownerId: string;
  targetId: string;
  blockedUserIds: unknown;
  blockedCreatorIds: unknown;
  blocked?: boolean;
}): BlockedUserLists {
  const ownerId = typeof input.ownerId === 'string' ? input.ownerId.trim() : '';
  const targetId = typeof input.targetId === 'string' ? input.targetId.trim() : '';
  if (!ownerId || !targetId || targetId.length > 160 || targetId.includes('/') || targetId.includes('\\')) {
    throw new Error('A valid account is required for this safety action.');
  }
  if (ownerId === targetId) throw new Error('You cannot block your own account.');

  const currentBlockedUserIds = normalizeIds(input.blockedUserIds);
  const currentBlockedCreatorIds = normalizeIds(input.blockedCreatorIds);
  const isCurrentlyBlocked = currentBlockedUserIds.includes(targetId) || currentBlockedCreatorIds.includes(targetId);
  const shouldBlock = typeof input.blocked === 'boolean' ? input.blocked : !isCurrentlyBlocked;

  if (shouldBlock) {
    if (!currentBlockedUserIds.includes(targetId) && currentBlockedUserIds.length >= MAX_BLOCKED_USERS) {
      throw new Error('You can block up to 500 accounts.');
    }
    if (!currentBlockedCreatorIds.includes(targetId) && currentBlockedCreatorIds.length >= MAX_BLOCKED_USERS) {
      throw new Error('You can block up to 500 accounts.');
    }
  }

  return {
    blocked: shouldBlock,
    blockedUserIds: shouldBlock
      ? [...new Set([...currentBlockedUserIds, targetId])]
      : currentBlockedUserIds.filter(id => id !== targetId),
    blockedCreatorIds: shouldBlock
      ? [...new Set([...currentBlockedCreatorIds, targetId])]
      : currentBlockedCreatorIds.filter(id => id !== targetId),
  };
}

export function clearBlockedUserLists(): Pick<BlockedUserLists, 'blockedUserIds' | 'blockedCreatorIds'> {
  return { blockedUserIds: [], blockedCreatorIds: [] };
}
