import test from 'node:test';
import assert from 'node:assert/strict';
import { after, before } from 'node:test';
import { initializeApp, deleteApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { createSeasonalCommunityEvent, listSeasonalCommunityEvents, setSeasonalCommunityEventRsvp } from '../src/seasonalCommunityEvents.js';

const app = initializeApp({ projectId: process.env.GCLOUD_PROJECT || 'demo-nexora-seasonal-events' }, 'seasonal-events-tests');
const db = getFirestore(app);
let eventId = '';

before(() => assert.ok(process.env.FIRESTORE_EMULATOR_HOST, 'Seasonal event tests require the Firestore Emulator.'));
after(async () => {
  if (eventId) {
    await db.recursiveDelete(db.doc(`seasonalCommunityEvents/${eventId}`));
  }
  await deleteApp(app);
});

test('platform seasonal events are scheduled, listed and RSVP-counted idempotently', async () => {
  const startsAt = new Date(Date.now() + 86400000).toISOString();
  const endsAt = new Date(Date.now() + 2 * 86400000).toISOString();
  const created = await createSeasonalCommunityEvent(db, 'platform-admin', {
    title: 'NEXORA Community Week', description: 'A week of shared learning, creativity and community building.',
    category: 'Community', startsAt, endsAt, capacity: 25,
  });
  eventId = created.eventId;
  assert.deepEqual(await setSeasonalCommunityEventRsvp(db, 'member-a', eventId, true), { attending: true, attendeeCount: 1 });
  assert.deepEqual(await setSeasonalCommunityEventRsvp(db, 'member-a', eventId, true), { attending: true, attendeeCount: 1 });
  const listed = await listSeasonalCommunityEvents(db, 'member-a');
  assert.equal(listed.events.find(event => event.id === eventId)?.attending, true);
  assert.deepEqual(await setSeasonalCommunityEventRsvp(db, 'member-a', eventId, false), { attending: false, attendeeCount: 0 });
});

test('rejects invalid event windows and enforces capacity', async () => {
  await assert.rejects(createSeasonalCommunityEvent(db, 'platform-admin', {
    title: 'Bad', description: 'Too short', category: 'x',
    startsAt: new Date(Date.now() + 1000).toISOString(), endsAt: new Date(Date.now() + 500).toISOString(),
  }), /details are invalid/);
  const created = await createSeasonalCommunityEvent(db, 'platform-admin', {
    title: 'Limited Event', description: 'A small event with a strict participant capacity.',
    category: 'Community', startsAt: new Date(Date.now() + 86400000).toISOString(),
    endsAt: new Date(Date.now() + 2 * 86400000).toISOString(), capacity: 2,
  });
  await setSeasonalCommunityEventRsvp(db, 'member-b', created.eventId, true);
  await setSeasonalCommunityEventRsvp(db, 'member-c', created.eventId, true);
  await assert.rejects(setSeasonalCommunityEventRsvp(db, 'member-d', created.eventId, true), /attendance capacity/);
  await db.recursiveDelete(db.doc(`seasonalCommunityEvents/${created.eventId}`));
});
