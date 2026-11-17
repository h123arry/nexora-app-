import { HttpsError } from 'firebase-functions/v2/https';
import { onCallWithSession as onCall } from './callableSession.js';
import { getFirestore } from 'firebase-admin/firestore';
import { getFirebaseAdminApp, resolveFirestoreDatabaseId } from './runtimeConfig.js';
import { buildOriginCreatorInsights, type OriginRemixEvent } from './originCreatorInsightsPolicy.js';
const db = getFirestore(getFirebaseAdminApp(), resolveFirestoreDatabaseId());
const SAMPLE_LIMIT = 500;

/** Owner-only, bounded creator insights. Returns aggregates, never other users' identities. */
export const getMyOriginCreatorInsights = onCall({ maxInstances: 10 }, async request => {
  const uid = request.auth?.uid;
  if (!uid) throw new HttpsError('unauthenticated', 'Sign in to view your Origin insights.');
  try {
    const snapshot = await db.collectionGroup('events').where('eventType', '==', 'remix_created')
      .orderBy('createdAt', 'desc').limit(SAMPLE_LIMIT + 1).get();
    const events = snapshot.docs.map(item => item.data() as OriginRemixEvent);
    const sample = events.slice(0, SAMPLE_LIMIT);
    return {
      ...buildOriginCreatorInsights(uid, sample, SAMPLE_LIMIT),
      sampleCapped: events.length > SAMPLE_LIMIT,
      sampledAt: new Date().toISOString(),
      methodology: 'Aggregates from the latest 500 platform remix events. Counts are sample-based, not lifetime totals.',
    };
  } catch (error) {
    console.error('[NEXORA Origin] Creator insights unavailable.', error);
    throw new HttpsError('unavailable', 'Origin creator insights are temporarily unavailable.');
  }
});
