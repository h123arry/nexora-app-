import type { NexoraSettings } from '../firebase/settingsService';

export type PersistedFeedTab = 'posts' | 'following' | 'friends' | 'trending' | 'reels';

export interface RecommendationSignals {
  tags: Record<string, number>;
  creators: Record<string, number>;
  communities: Record<string, number>;
}

export interface FeedPreferences {
  tab: PersistedFeedTab;
  notInterestedTags: string[];
  blockedCreatorIds: string[];
  mutedCreatorIds: string[];
  hiddenPostIds: string[];
  seenPostIds: string[];
  recommendationSignals: RecommendationSignals;
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

function cleanSignalMap(value: unknown): Record<string, number> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return Object.fromEntries(Object.entries(value as Record<string, unknown>)
    .filter(([key, score]) => key.trim().length > 0 && key.length <= 120 && typeof score === 'number' && Number.isFinite(score))
    .slice(-200)
    .map(([key, score]) => [key.trim(), Math.max(-100, Math.min(100, score as number))]));
}

export function normalizeRecommendationSignals(value?: Partial<RecommendationSignals> | null): RecommendationSignals {
  return {
    tags: cleanSignalMap(value?.tags),
    creators: cleanSignalMap(value?.creators),
    communities: cleanSignalMap(value?.communities),
  };
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
    recommendationSignals: normalizeRecommendationSignals(input?.recommendationSignals),
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
    recommendationSignals: normalizeRecommendationSignals(),
    recommendationResetAt: at,
  };
}

export function mergeFeedPreferencePatch(
  current: FeedPreferences,
  patch: Partial<FeedPreferences>,
): FeedPreferences {
  return normalizeFeedPreferences({ ...current, ...patch });
}


/** Build a narrow Firestore merge so feed changes cannot overwrite other settings namespaces. */
export function buildFeedSettingsPatch(feed: FeedPreferences, updatedAt: unknown) {
  return { feed, updatedAt };
}
