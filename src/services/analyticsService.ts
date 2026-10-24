import { getFunctions, httpsCallable } from 'firebase/functions';
import { app } from './firebase/config';

export const CLIENT_ANALYTICS_EVENTS = [
  'feed_request_completed', 'feed_request_failed', 'content_impression', 'post_open',
  'meaningful_interaction', 'save', 'share_attempt', 'not_interested', 'feed_mode_selected',
  'search_started', 'search_completed', 'search_result_selected', 'conversation_opened',
  'message_submission_attempt', 'message_send_failure', 'creator_profile_visit',
  'creator_analytics_opened', 'feature_used', 'onboarding_milestone', 'reconnect',
] as const;

export type ClientAnalyticsEvent = typeof CLIENT_ANALYTICS_EVENTS[number];
export type AnalyticsValue = string | number | boolean | string[];

interface AnalyticsInput {
  eventType: ClientAnalyticsEvent;
  eventId?: string;
  entityType?: string;
  entityId?: string;
  properties?: Record<string, AnalyticsValue>;
}

const SESSION_KEY = 'nexora_analytics_session_v1';
const CONSENT_KEY = 'nexora_analytics_observations_enabled';
const MAX_PROPERTIES = 12;
const sentEventIds = new Set<string>();
let sessionRef: string | null = null;

function getSessionRef(): string {
  if (sessionRef) return sessionRef;
  try {
    const existing = window.localStorage.getItem(SESSION_KEY);
    if (existing && existing.length <= 100) sessionRef = existing;
    if (!sessionRef) {
      sessionRef = `s_${crypto.randomUUID()}`;
      window.localStorage.setItem(SESSION_KEY, sessionRef);
    }
  } catch {
    sessionRef = `s_${Date.now().toString(36)}`;
  }
  return sessionRef;
}

function isEnabled(): boolean {
  try {
    return window.localStorage.getItem(CONSENT_KEY) === 'true';
  } catch {
    return false;
  }
}

export function setAnalyticsObservationConsent(enabled: boolean): void {
  try {
    window.localStorage.setItem(CONSENT_KEY, String(enabled));
  } catch {
    // Analytics is optional and must never block product behavior.
  }
}

function boundedProperties(properties: Record<string, AnalyticsValue> | undefined): Record<string, AnalyticsValue> | undefined {
  if (!properties) return undefined;
  return Object.fromEntries(Object.entries(properties)
    .filter(([key, value]) => /^[a-zA-Z][a-zA-Z0-9_]{0,40}$/.test(key)
      && !/password|token|secret|message|transcript|attachment|location|voice|otp|code/i.test(key)
      && (typeof value === 'string' ? value.length <= 160 : typeof value === 'number' ? Number.isFinite(value) : typeof value === 'boolean' || (Array.isArray(value) && value.length <= 20)))
    .slice(0, MAX_PROPERTIES));
}

export function trackClientObservation(input: AnalyticsInput): void {
  if (!isEnabled() || sentEventIds.size >= 200) return;
  const eventId = input.eventId || `${input.eventType}:${input.entityType || ''}:${input.entityId || ''}:${Date.now()}`;
  if (sentEventIds.has(eventId)) return;
  sentEventIds.add(eventId);
  const callable = httpsCallable(getFunctions(app), 'ingestClientAnalytics');
  void callable({
    eventId,
    eventType: input.eventType,
    entityType: input.entityType,
    entityId: input.entityId,
    sessionRef: getSessionRef(),
    properties: boundedProperties(input.properties),
  }).catch(() => {
    // Observations are best effort. A telemetry outage must not block the product action.
  });
}
