import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { initializeApp, deleteApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { createCircleEvent, setCircleEventRsvp } from '../src/communityEvents.js';

const projectId = process.env.GCLOUD_PROJECT || 'demo-nexora-engagement';
const app = initializeApp({ projectId }, 'community-event-tests');
const db = getFirestore(app);

before(async () => {
  assert.ok(process.env.FIRESTORE_EMULATOR_HOST, 'Circle event tests require the Firestore Emulator.');
  await db.recursiveDelete(db.doc('communities/event-circle'));
  await db.doc('communities/event-circle').set({ id: 'event-circle', ownerId: 'alice', type: 'public' });
  await db.doc('communities/event-circle/members/alice').set({ userId: 'alice', role: 'owner', status: 'active' });
  await db.doc('communities/event-circle/members/bob').set({ userId: 'bob', role: 'member', status: 'active' });
  await db.doc('communities/event-circle/members/muted-event-user').set({ userId: 'muted-event-user', role: 'member', status: 'active' });
});

after(async () => {
  await db.recursiveDelete(db.doc('communities/event-circle'));
  await deleteApp(app);
});

describe('trusted Circle events and RSVPs', () => {
  it('creates future events for active members and rejects non-members or invalid dates', async () => {
    const created = await createCircleEvent(db, 'alice', 'event-circle', 'Community meetup', new Date(Date.now() + 86400000).toISOString(), 'Main hall');
    const event = await db.doc(`communities/event-circle/events/${created.eventId}`).get();
    assert.equal(event.get('title'), 'Community meetup');
    assert.equal(event.get('attendeeCount'), 0);
    await assert.rejects(createCircleEvent(db, 'mallory', 'event-circle', 'No access', new Date(Date.now() + 86400000).toISOString()), /Join this Circle/);
    await assert.rejects(createCircleEvent(db, 'alice', 'event-circle', 'Past event', new Date(Date.now() - 1000).toISOString()), /future date/);
  });

  it('blocks event creation during an active mute and restores it after expiry', async () => {
    const muteRef = db.doc('communities/event-circle/mutes/muted-event-user');
    await muteRef.set({ userId: 'muted-event-user', reason: 'Temporary event mute', createdAt: new Date(), expiresAt: new Date(Date.now() + 60 * 60 * 1000) });
    await assert.rejects(
      createCircleEvent(db, 'muted-event-user', 'event-circle', 'Muted event', new Date(Date.now() + 86400000).toISOString()),
      /temporarily muted/,
    );
    await muteRef.update({ expiresAt: new Date(Date.now() - 1000) });
    const created = await createCircleEvent(db, 'muted-event-user', 'event-circle', 'After expiry', new Date(Date.now() + 86400000).toISOString());
    assert.equal((await db.doc(`communities/event-circle/events/${created.eventId}`).get()).exists, true);
  });

  it('adds and removes each member RSVP exactly once with transactional counts', async () => {
    const created = await createCircleEvent(db, 'alice', 'event-circle', 'Town hall', new Date(Date.now() + 86400000).toISOString());
    assert.deepEqual(await setCircleEventRsvp(db, 'bob', 'event-circle', created.eventId, true), { attending: true, attendeeCount: 1 });
    assert.deepEqual(await setCircleEventRsvp(db, 'bob', 'event-circle', created.eventId, true), { attending: true, attendeeCount: 1 });
    assert.deepEqual(await setCircleEventRsvp(db, 'bob', 'event-circle', created.eventId, false), { attending: false, attendeeCount: 0 });
    assert.deepEqual(await setCircleEventRsvp(db, 'bob', 'event-circle', created.eventId, false), { attending: false, attendeeCount: 0 });
    await assert.rejects(setCircleEventRsvp(db, 'mallory', 'event-circle', created.eventId, true), /Join this Circle/);
    const event = await db.doc(`communities/event-circle/events/${created.eventId}`).get();
    assert.equal(event.get('attendeeCount'), 0);
    assert.equal((await db.doc(`communities/event-circle/events/${created.eventId}/rsvps/bob`).get()).exists, false);
  });
});
