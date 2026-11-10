export function omitUndefinedFields<T extends object>(value: T): T {
  return Object.fromEntries(
    Object.entries(value).filter(([, fieldValue]) => fieldValue !== undefined),
  ) as T;
}

export function serializeOutgoingMessage<T extends { status: string }>(value: T): T {
  return omitUndefinedFields({ ...value, status: 'sent' } as T);
}

export function isSupportedOutgoingMediaType(type: string): type is 'voice' {
  return type === 'voice';
}


export type MessageReactionUsers = Record<string, string[]>;
export type AggregatedMessageReaction = { emoji: string; userIds: string[] };

export function normalizeMessageReactionUsers(
  reactionUsers: MessageReactionUsers | undefined,
  legacyReactions: AggregatedMessageReaction[] | undefined,
): MessageReactionUsers {
  const normalized: MessageReactionUsers = {};
  // Legacy records remain visible for members who have not yet written a
  // user-owned record. Once a member has a key in reactionUsers, that entry
  // becomes authoritative for that member (including an empty list).
  for (const reaction of legacyReactions || []) {
    if (!reaction || typeof reaction.emoji !== 'string' || !Array.isArray(reaction.userIds)) continue;
    for (const uid of reaction.userIds) {
      if (typeof uid !== 'string' || !uid || Object.prototype.hasOwnProperty.call(reactionUsers || {}, uid)) continue;
      normalized[uid] ||= [];
      if (!normalized[uid].includes(reaction.emoji)) normalized[uid].push(reaction.emoji);
    }
  }
  for (const [uid, emojis] of Object.entries(reactionUsers || {})) {
    normalized[uid] = Array.isArray(emojis) ? [...new Set(emojis)] : [];
  }
  return normalized;
}

export function aggregateMessageReactions(
  reactionUsers: MessageReactionUsers | undefined,
  legacyReactions: AggregatedMessageReaction[] | undefined,
): AggregatedMessageReaction[] {
  const users = normalizeMessageReactionUsers(reactionUsers, legacyReactions);
  const grouped = new Map<string, string[]>();
  for (const [uid, emojis] of Object.entries(users)) {
    for (const emoji of emojis) {
      if (!emoji) continue;
      const userIds = grouped.get(emoji) || [];
      if (!userIds.includes(uid)) userIds.push(uid);
      grouped.set(emoji, userIds);
    }
  }
  return [...grouped.entries()].map(([emoji, userIds]) => ({ emoji, userIds }));
}

export function toggleMessageReaction(
  reactionUsers: MessageReactionUsers | undefined,
  legacyReactions: AggregatedMessageReaction[] | undefined,
  userId: string,
  emoji: string,
): MessageReactionUsers {
  const next: MessageReactionUsers = { ...(reactionUsers || {}) };
  const current = Object.prototype.hasOwnProperty.call(next, userId)
    ? (Array.isArray(next[userId]) ? next[userId] : [])
    : (legacyReactions || [])
      .filter(reaction => reaction?.emoji && Array.isArray(reaction.userIds) && reaction.userIds.includes(userId))
      .map(reaction => reaction.emoji);
  next[userId] = current.includes(emoji)
    ? current.filter(value => value !== emoji)
    : [...current, emoji].slice(-12);
  return next;
}
