import { createHash } from 'node:crypto';
import { FieldValue, Timestamp, getFirestore } from 'firebase-admin/firestore';
import { getApps, initializeApp } from 'firebase-admin/app';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { onSchedule } from 'firebase-functions/v2/scheduler';

const app = getApps().find(candidate => candidate.name === '[DEFAULT]') || initializeApp();
const db = getFirestore(app, process.env.FIRESTORE_DATABASE_ID || 'ai-studio-nexora-29627584-4036-4cc0-b743-61fab6f219f8');

export const CLIENT_EVENT_TYPES = [
  'feed_request_completed', 'feed_request_failed', 'content_impression', 'post_open',
  'meaningful_interaction', 'save', 'share_attempt', 'not_interested', 'feed_mode_selected',
  'search_started', 'search_completed', 'search_result_selected', 'conversation_opened',
  'message_submission_attempt', 'message_send_failure', 'creator_profile_visit',
  'creator_analytics_opened', 'feature_used', 'onboarding_milestone', 'reconnect',
] as const;
const eventTypes = new Set<string>(CLIENT_EVENT_TYPES);
const sensitiveKeys = new Set(['password', 'code', 'otp', 'token', 'secret', 'message', 'transcript', 'attachment', 'location', 'voice']);
const reviewerRoles = new Set(['admin', 'founder', 'analytics_admin']);

function requireAuth(request: { auth?: { uid: string; token: Record<string, unknown> } }): { uid: string; token: Record<string, unknown> } {
  if (!request.auth?.uid) throw new HttpsError('unauthenticated', 'Sign in to submit analytics observations.');
  return request.auth;
}

function isAnalyticsReviewer(token: Record<string, unknown>): boolean {
  const role = typeof token.role === 'string' ? token.role : '';
  return token.admin === true || token.analyticsAdmin === true || reviewerRoles.has(role);
}

function validId(value: unknown, max = 160): value is string {
  return typeof value === 'string' && value.length > 0 && value.length <= max && !value.includes('/');
}

function validProperties(value: unknown): value is Record<string, string | number | boolean | string[]> {
  if (value === undefined) return true;
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const entries = Object.entries(value as Record<string, unknown>);
  if (entries.length > 12) return false;
  return entries.every(([key, item]) => {
    if (!/^[a-zA-Z][a-zA-Z0-9_]{0,40}$/.test(key) || sensitiveKeys.has(key.toLowerCase())) return false;
    if (typeof item === 'string') return item.length <= 160;
    if (typeof item === 'number') return Number.isFinite(item) && Math.abs(item) <= 1_000_000_000;
    if (typeof item === 'boolean') return true;
    return Array.isArray(item) && item.length <= 20 && item.every(entry => typeof entry === 'string' && entry.length <= 80);
  });
}

function eventId(uid: string, supplied: string): string {
  return `evt_${createHash('sha256').update(`${uid}:${supplied}`).digest('hex').slice(0, 48)}`;
}

export const ingestClientAnalytics = onCall({ maxInstances: 10 }, async (request) => {
  const { uid } = requireAuth(request);
  const data = request.data || {};
  if (!validId(data.eventId, 120)) throw new HttpsError('invalid-argument', 'A stable event ID is required.');
  if (typeof data.eventType !== 'string' || !eventTypes.has(data.eventType)) throw new HttpsError('invalid-argument', 'Unsupported analytics event.');
  if (data.entityType !== undefined && !validId(data.entityType, 40)) throw new HttpsError('invalid-argument', 'Invalid entity type.');
  if (data.entityId !== undefined && !validId(data.entityId, 160)) throw new HttpsError('invalid-argument', 'Invalid entity ID.');
  if (data.sessionRef !== undefined && !validId(data.sessionRef, 100)) throw new HttpsError('invalid-argument', 'Invalid session reference.');
  if (!validProperties(data.properties)) throw new HttpsError('invalid-argument', 'Analytics properties are invalid or contain restricted data.');

  const id = eventId(uid, data.eventId);
  const ref = db.collection('analyticsEvents').doc(id);
  if ((await ref.get()).exists) return { accepted: true, duplicate: true, eventId: id };
  await ref.create({
    eventId: id,
    eventType: data.eventType,
    schemaVersion: 1,
    source: 'client_observation',
    actorId: uid,
    sessionRef: typeof data.sessionRef === 'string' ? data.sessionRef : null,
    entityType: typeof data.entityType === 'string' ? data.entityType : null,
    entityId: typeof data.entityId === 'string' ? data.entityId : null,
    properties: data.properties || {},
    processingStatus: 'accepted_observation',
    createdAt: FieldValue.serverTimestamp(),
    retentionClass: 'analytics_observation_90d',
  });
  return { accepted: true, duplicate: false, eventId: id };
});

function dayKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export const aggregateAnalyticsDaily = onSchedule({ schedule: 'every 1 hours', timeZone: 'UTC', maxInstances: 1 }, async () => {
  const since = Timestamp.fromMillis(Date.now() - 31 * 24 * 60 * 60 * 1000);
  const snapshot = await db.collection('analyticsEvents').where('createdAt', '>=', since).orderBy('createdAt', 'asc').limit(5000).get();
  const buckets = new Map<string, { total: number; byType: Record<string, number>; actors: Set<string>; partial: boolean }>();
  for (const doc of snapshot.docs) {
    const data = doc.data();
    const createdAt = data.createdAt instanceof Timestamp ? data.createdAt.toDate() : null;
    if (!createdAt || typeof data.eventType !== 'string') continue;
    const key = dayKey(createdAt);
    const bucket = buckets.get(key) || { total: 0, byType: {}, actors: new Set<string>(), partial: false };
    bucket.total += 1;
    bucket.byType[data.eventType] = (bucket.byType[data.eventType] || 0) + 1;
    if (typeof data.actorId === 'string') bucket.actors.add(data.actorId);
    buckets.set(key, bucket);
  }
  const batch = db.batch();
  for (const [day, bucket] of buckets) {
    batch.set(db.collection('analyticsDaily').doc(day), {
      day,
      schemaVersion: 1,
      source: 'bounded_client_observations',
      totalEvents: bucket.total,
      uniqueActorsObserved: bucket.actors.size,
      byType: bucket.byType,
      partial: snapshot.size >= 5000,
      aggregatedAt: FieldValue.serverTimestamp(),
    }, { merge: true });
  }
  if (buckets.size > 0) await batch.commit();
});

export const getPlatformAnalytics = onCall({ maxInstances: 5 }, async (request) => {
  const { token } = requireAuth(request);
  if (!isAnalyticsReviewer(token)) throw new HttpsError('permission-denied', 'Platform analytics access is restricted.');
  const requestedDays = typeof request.data?.days === 'number' ? Math.floor(request.data.days) : 7;
  const days = Math.max(1, Math.min(31, requestedDays));
  const start = new Date();
  start.setUTCHours(0, 0, 0, 0);
  start.setUTCDate(start.getUTCDate() - (days - 1));
  const keys = Array.from({ length: days }, (_, index) => {
    const date = new Date(start);
    date.setUTCDate(start.getUTCDate() + index);
    return dayKey(date);
  });
  const refs = keys.map(key => db.collection('analyticsDaily').doc(key));
  const docs = await db.getAll(...refs);
  return {
    days,
    source: 'bounded_client_observations',
    freshness: docs.reduce<Date | null>((latest, snap) => {
      const value = snap.data()?.aggregatedAt;
      const date = value instanceof Timestamp ? value.toDate() : null;
      return date && (!latest || date > latest) ? date : latest;
    }, null)?.toISOString() || null,
    points: docs.map((snap, index) => ({
      day: keys[index],
      available: snap.exists,
      ...(snap.exists ? snap.data() : { totalEvents: null, uniqueActorsObserved: null, byType: null, partial: null }),
    })),
  };
});
