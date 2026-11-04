import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { initializeApp, deleteApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { createPageBookingRequest, respondToPageBookingRequest } from '../src/pageBookings.js';

const projectId = process.env.GCLOUD_PROJECT || 'demo-nexora-engagement';
const app = initializeApp({ projectId }, 'page-booking-tests');
const db = getFirestore(app);
const page = db.doc('pages/booking-test-page');

before(async () => {
  assert.ok(process.env.FIRESTORE_EMULATOR_HOST, 'Business booking tests require the Firestore Emulator.');
  await db.recursiveDelete(page);
  await page.set({ id: 'booking-test-page', ownerId: 'business-owner', category: 'Business', name: 'Test Business' });
  await page.collection('services').doc('consultation').set({
    name: 'Consultation', status: 'active', bookable: true,
  });
  await page.collection('services').doc('follow-up').set({
    name: 'Follow-up', status: 'active', bookable: true,
  });
});

after(async () => {
  await db.recursiveDelete(page);
  const bookings = await db.collection('pageBookings').where('pageId', '==', 'booking-test-page').get();
  await Promise.all(bookings.docs.map(item => item.ref.delete()));
  await deleteApp(app);
});

describe('trusted business booking requests', () => {
  it('creates a private pending request and makes retries idempotent', async () => {
    const input = ['customer-1', 'booking-test-page', 'consultation', new Date(Date.now() + 86400000).toISOString(), 'Please confirm availability.', 'request-key-0000001'] as const;
    const first = await createPageBookingRequest(db, ...input);
    const retry = await createPageBookingRequest(db, ...input);
    assert.equal(first.created, true);
    assert.equal(retry.created, false);
    const booking = await db.collection('pageBookings').doc(first.bookingId).get();
    assert.equal(booking.get('status'), 'pending');
    assert.equal(booking.get('ownerId'), 'business-owner');
  });

  it('scopes idempotency keys to the selected service', async () => {
    const key = 'same-service-key-0001';
    const requestedAt = new Date(Date.now() + 259200000).toISOString();
    const first = await createPageBookingRequest(
      db, 'customer-service-scope', 'booking-test-page', 'consultation', requestedAt, '', key,
    );
    const second = await createPageBookingRequest(
      db, 'customer-service-scope', 'booking-test-page', 'follow-up', requestedAt, '', key,
    );
    assert.notEqual(first.bookingId, second.bookingId);
    assert.equal(second.created, true);
    assert.equal((await db.collection('pageBookings').doc(second.bookingId).get()).get('serviceId'), 'follow-up');
  });

  it('allows only the Page owner to resolve a pending request', async () => {
    const created = await createPageBookingRequest(
      db, 'customer-2', 'booking-test-page', 'consultation',
      new Date(Date.now() + 172800000).toISOString(), '', 'request-key-0000002',
    );
    await assert.rejects(respondToPageBookingRequest(db, 'intruder', created.bookingId, 'accepted'), /Only the business Page owner/);
    assert.deepEqual(await respondToPageBookingRequest(db, 'business-owner', created.bookingId, 'accepted'), { status: 'accepted' });
    await assert.rejects(respondToPageBookingRequest(db, 'business-owner', created.bookingId, 'declined'), /already been resolved/);
  });

  it('rate-limits repeated booking requests per customer', async () => {
    for (let index = 0; index < 10; index += 1) {
      await createPageBookingRequest(
        db, 'customer-rate-test', 'booking-test-page', 'consultation',
        new Date(Date.now() + (index + 1) * 86400000).toISOString(), '',
        'rate-limit-key-' + String(index).padStart(4, '0'),
      );
    }
    await assert.rejects(createPageBookingRequest(
      db, 'customer-rate-test', 'booking-test-page', 'consultation',
      new Date(Date.now() + 86400000).toISOString(), '', 'rate-limit-key-over',
    ), /Too many booking requests/);
  });

  it('rejects owners booking their own Page and unavailable services', async () => {
    await assert.rejects(createPageBookingRequest(
      db, 'business-owner', 'booking-test-page', 'consultation',
      new Date(Date.now() + 86400000).toISOString(), '', 'request-key-0000003',
    ), /unavailable/);
    await assert.rejects(createPageBookingRequest(
      db, 'customer-3', 'booking-test-page', 'missing',
      new Date(Date.now() + 86400000).toISOString(), '', 'request-key-0000004',
    ), /unavailable/);
  });
});
