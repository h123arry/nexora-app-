export const ANALYTICS_EVENT_TYPES = [
  'feed_request_completed', 'feed_request_failed', 'content_impression', 'post_open',
  'meaningful_interaction', 'save', 'share_attempt', 'not_interested', 'feed_mode_selected',
  'search_started', 'search_completed', 'search_result_selected', 'conversation_opened',
  'message_submission_attempt', 'message_send_failure', 'creator_profile_visit',
  'creator_analytics_opened', 'feature_used', 'onboarding_milestone', 'reconnect',
] as const;

export type AnalyticsEventType = typeof ANALYTICS_EVENT_TYPES[number];
export interface AnalyticsRow { day: string; eventType: AnalyticsEventType; actorId: string; }

export function isValidAnalyticsProperties(properties: unknown): boolean {
  if (properties === undefined) return true;
  if (!properties || typeof properties !== 'object' || Array.isArray(properties)) return false;
  return Object.entries(properties as Record<string, unknown>).length <= 12
    && Object.entries(properties as Record<string, unknown>).every(([key, value]) =>
      /^[a-zA-Z][a-zA-Z0-9_]{0,40}$/.test(key)
      && !/password|token|secret|message|transcript|attachment|location|voice|otp|code/i.test(key)
      && (typeof value === 'string' ? value.length <= 160 : typeof value === 'number' ? Number.isFinite(value) : typeof value === 'boolean' || (Array.isArray(value) && value.length <= 20 && value.every(item => typeof item === 'string' && item.length <= 80))),
    );
}

export function aggregateAnalyticsRows(rows: AnalyticsRow[]) {
  const unique = new Set<string>();
  const byType: Record<string, number> = {};
  for (const row of rows) {
    unique.add(`${row.day}:${row.actorId}`);
    byType[row.eventType] = (byType[row.eventType] || 0) + 1;
  }
  return { totalEvents: rows.length, uniqueActorDays: unique.size, byType };
}

export function engagementRate(meaningfulEngagements: number, qualifiedImpressions: number): number | null {
  if (!Number.isFinite(qualifiedImpressions) || qualifiedImpressions <= 0) return null;
  return Number((Math.max(0, meaningfulEngagements) / qualifiedImpressions * 100).toFixed(2));
}
