import { createHash } from 'node:crypto';
import { FieldValue, Timestamp, getFirestore, type QueryDocumentSnapshot } from 'firebase-admin/firestore';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { getFirebaseAdminApp, resolveFirestoreDatabaseId } from './runtimeConfig.js';

const app = getFirebaseAdminApp();
const db = getFirestore(app, resolveFirestoreDatabaseId());

export const CLIENT_EVENT_TYPES = [
  'feed_request_completed', 'feed_request_failed', 'content_impression', 'post_open',
  'meaningful_interaction', 'save', 'share_attempt', 'not_interested', 'feed_mode_selected',
  'search_started', 'search_completed', 'search_result_selected', 'conversation_opened',
  'message_submission_attempt', 'message_send_failure', 'creator_profile_visit',
  'creator_analytics_opened', 'feature_used', 'onboarding_milestone', 'reconnect',
  'video_watch_progress', 'video_completed',
] as const;
const eventTypes = new Set<string>(CLIENT_EVENT_TYPES);
const sensitiveKeys = new Set(['password', 'code', 'otp', 'token', 'secret', 'message', 'transcript', 'attachment', 'location', 'voice']);
const reviewerRoles = new Set(['admin', 'founder', 'analytics_admin']);
const AGGREGATION_PAGE_SIZE = 5000;

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
  const duplicate = await db.runTransaction(async (transaction) => {
    const existing = await transaction.get(ref);
    if (existing.exists) return true;
    transaction.create(ref, {
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
    return false;
  });
  return { accepted: true, duplicate, eventId: id };
});

function dayKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export const aggregateAnalyticsDaily = onSchedule({ schedule: 'every 1 hours', timeZone: 'UTC', maxInstances: 1 }, async () => {
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const firstDay = new Date(today);
  firstDay.setUTCDate(firstDay.getUTCDate() - 30);
  const batch = db.batch();

  // Aggregate one UTC day at a time and paginate every page. A single global
  // limit silently discarded older events once the 5,000-document cap was hit.
  for (let offset = 0; offset < 31; offset += 1) {
    const dayStart = new Date(firstDay);
    dayStart.setUTCDate(firstDay.getUTCDate() + offset);
    const dayEnd = new Date(dayStart);
    dayEnd.setUTCDate(dayStart.getUTCDate() + 1);
    const bucket = { total: 0, byType: {} as Record<string, number>, actors: new Set<string>() };
    let cursor: QueryDocumentSnapshot | undefined;

    while (true) {
      let query = db.collection('analyticsEvents')
        .where('createdAt', '>=', Timestamp.fromDate(dayStart))
        .where('createdAt', '<', Timestamp.fromDate(dayEnd))
        .orderBy('createdAt', 'asc')
        .limit(AGGREGATION_PAGE_SIZE);
      if (cursor) query = query.startAfter(cursor);
      const page = await query.get();
      for (const doc of page.docs) {
        const data = doc.data();
        if (typeof data.eventType !== 'string') continue;
        bucket.total += 1;
        bucket.byType[data.eventType] = (bucket.byType[data.eventType] || 0) + 1;
        if (typeof data.actorId === 'string') bucket.actors.add(data.actorId);
      }
      if (page.size < AGGREGATION_PAGE_SIZE) break;
      cursor = page.docs[page.docs.length - 1];
    }

    const day = dayKey(dayStart);
    batch.set(db.collection('analyticsDaily').doc(day), {
      day,
      schemaVersion: 1,
      source: 'bounded_client_observations',
      totalEvents: bucket.total,
      uniqueActorsObserved: bucket.actors.size,
      byType: bucket.byType,
      partial: false,
      aggregatedAt: FieldValue.serverTimestamp(),
    }, { merge: true });
  }
  await batch.commit();
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
