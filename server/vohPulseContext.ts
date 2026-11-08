export interface WorldPulseAiTopic {
  tag: string;
  currentPosts: number;
  creatorCount: number;
  status: 'new' | 'rising';
}

export interface WorldPulseAiContext {
  postCount: number;
  creatorCount: number;
  topicCount: number;
  interactionCount: number;
  recentPostCount: number;
  risingTopics: WorldPulseAiTopic[];
}

function boundedCount(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value)
    ? Math.max(0, Math.min(1_000_000, Math.floor(value)))
    : 0;
}

function clippedTag(value: unknown): string {
  if (typeof value !== 'string') return '';
  return value.trim().replace(/^#+/, '').slice(0, 60).replace(/[^\p{L}\p{N}_-]/gu, '');
}

/** Whitelists and bounds untrusted client-supplied World Pulse metrics before they enter an AI prompt. */
export function shapeWorldPulseAiContext(value: unknown): WorldPulseAiContext | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const input = value as Record<string, unknown>;
  const risingTopics = Array.isArray(input.risingTopics)
    ? input.risingTopics.slice(0, 5).flatMap((item): WorldPulseAiTopic[] => {
      if (!item || typeof item !== 'object' || Array.isArray(item)) return [];
      const topic = item as Record<string, unknown>;
      const tag = clippedTag(topic.tag);
      if (!tag) return [];
      return [{
        tag,
        currentPosts: boundedCount(topic.currentPosts),
        creatorCount: boundedCount(topic.creatorCount),
        status: topic.status === 'new' ? 'new' : 'rising',
      }];
    })
    : [];
  return {
    postCount: boundedCount(input.postCount),
    creatorCount: boundedCount(input.creatorCount),
    topicCount: boundedCount(input.topicCount),
    interactionCount: boundedCount(input.interactionCount),
    recentPostCount: boundedCount(input.recentPostCount),
    risingTopics,
  };
}
