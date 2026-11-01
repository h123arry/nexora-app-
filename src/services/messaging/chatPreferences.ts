export interface ChatPreferences {
  mutedChatIds: string[];
  blockedUserIds: string[];
}

const MAX_CHAT_PREFERENCES = 500;

function boundedIds(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.filter((item): item is string =>
    typeof item === 'string' && item.trim().length > 0
  ).map(item => item.trim().slice(0, 160)))].slice(0, MAX_CHAT_PREFERENCES);
}

export function normalizeChatPreferences(value: Partial<ChatPreferences> | null | undefined): ChatPreferences {
  return {
    mutedChatIds: boundedIds(value?.mutedChatIds),
    blockedUserIds: boundedIds(value?.blockedUserIds),
  };
}
