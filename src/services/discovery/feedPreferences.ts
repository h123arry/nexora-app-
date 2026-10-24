import type { NexoraSettings } from '../firebase/settingsService';

export type PersistedFeedTab = 'posts' | 'following' | 'friends' | 'trending' | 'reels';

export interface FeedPreferences {
  tab: PersistedFeedTab;
  notInterestedTags: string[];
  blockedCreatorIds: string[];
  mutedCreatorIds: string[];
  hiddenPostIds: string[];
  seenPostIds: string[];
  recommendationResetAt?: string;
}

export const MAX_FEED_PREFERENCE_ITEMS = 500;

function cleanIds(values: unknown, normalize = false): string[] {
  if (!Array.isArray(values)) return [];
  const unique = new Set<string>();
  for (const value of values) {
    if (typeof value !== 'string') continue;
    const cleaned = normalize ? value.trim().replace(/^#/, '').toLowerCase() : value.trim();
    if (!cleaned || cleaned.length > 160) continue;
    unique.add(cleaned);
    if (unique.size >= MAX_FEED_PREFERENCE_ITEMS) break;
  }
  return [...unique];
}

export function normalizeFeedPreferences(input?: Partial<FeedPreferences> | null): FeedPreferences {
  const tab = input?.tab;
  return {
    tab: tab === 'following' || tab === 'friends' || tab === 'trending' || tab === 'reels' ? tab : 'posts',
    notInterestedTags: cleanIds(input?.notInterestedTags, true),
    blockedCreatorIds: cleanIds(input?.blockedCreatorIds),
    mutedCreatorIds: cleanIds(input?.mutedCreatorIds),
    hiddenPostIds: cleanIds(input?.hiddenPostIds),
    seenPostIds: cleanIds(input?.seenPostIds),
    ...(typeof input?.recommendationResetAt === 'string' && input.recommendationResetAt.length <= 40
      ? { recommendationResetAt: input.recommendationResetAt }
      : {}),
  };
}

export function readFeedPreferences(settings?: NexoraSettings | null): FeedPreferences {
  return normalizeFeedPreferences(settings?.feed);
}

export function resetFeedPreferences(current: FeedPreferences, at = new Date().toISOString()): FeedPreferences {
  return {
    ...normalizeFeedPreferences(current),
    notInterestedTags: [],
    blockedCreatorIds: [],
    mutedCreatorIds: [],
    hiddenPostIds: [],
    seenPostIds: [],
    recommendationResetAt: at,
  };
}

export function mergeFeedPreferencePatch(
  current: FeedPreferences,
  patch: Partial<FeedPreferences>,
): FeedPreferences {
  return normalizeFeedPreferences({ ...current, ...patch });
}
