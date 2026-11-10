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
  if (reactionUsers && Object.keys(reactionUsers).length > 0) {
    return Object.fromEntries(Object.entries(reactionUsers).map(([uid, emojis]) => [
      uid,
      Array.isArray(emojis) ? [...new Set(emojis)] : [],
    ]));
  }
  const normalized: MessageReactionUsers = {};
  for (const reaction of legacyReactions || []) {
    if (!reaction || typeof reaction.emoji !== 'string' || !Array.isArray(reaction.userIds)) continue;
    for (const uid of reaction.userIds) {
      if (typeof uid !== 'string' || !uid) continue;
      normalized[uid] ||= [];
      if (!normalized[uid].includes(reaction.emoji)) normalized[uid].push(reaction.emoji);
    }
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
  const next = normalizeMessageReactionUsers(reactionUsers, legacyReactions);
  const current = next[userId] || [];
  next[userId] = current.includes(emoji)
    ? current.filter(value => value !== emoji)
    : [...current, emoji].slice(-12);
  return next;
}
