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
    name: 'Consultation', durationMinutes: 30, status: 'active', bookable: true,
  });
  await page.collection('services').doc('follow-up').set({
    name: 'Follow-up', durationMinutes: 15, status: 'active', bookable: true,
  });
});

after(async () => {
  await db.recursiveDelete(page);
  const bookings = await db.collection('pageBookings').where('pageId', '==', 'booking-test-page').get();
  await Promise.all(bookings.docs.map(async item => {
    const booking = item.data();
    const ownerId = String(booking.ownerId || '');
    const customerId = String(booking.customerId || '');
    await Promise.all([
      db.collection('users').doc(ownerId).collection('notifications').doc('booking_request_' + item.id).delete(),
      db.collection('users').doc(customerId).collection('notifications').doc('booking_response_' + item.id + '_accepted').delete(),
      db.collection('users').doc(customerId).collection('notifications').doc('booking_response_' + item.id + '_declined').delete(),
      item.ref.delete(),
    ]);
  }));
  await Promise.all(['customer-1', 'customer-2', 'customer-3', 'customer-rate-test', 'customer-service-scope', 'customer-booking-conflict-1', 'customer-booking-conflict-2', 'customer-booking-clear'].map(id => db.collection('pageBookingRateLimits').doc(id).delete()));
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
    const ownerNotification = await db.collection('users').doc('business-owner').collection('notifications').doc('booking_request_' + first.bookingId).get();
    assert.equal(ownerNotification.exists, true);
    assert.equal(ownerNotification.get('targetId'), first.bookingId);
    assert.equal(ownerNotification.get('isRead'), false);
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
    const customerNotificationRef = db.collection('users').doc('customer-2').collection('notifications').doc('booking_response_' + created.bookingId + '_accepted');
    const customerNotification = await customerNotificationRef.get();
    assert.equal(customerNotification.exists, true);
    assert.match(customerNotification.get('content'), /accepted your booking request/);
    assert.deepEqual(await respondToPageBookingRequest(db, 'business-owner', created.bookingId, 'accepted'), { status: 'accepted' });
    assert.equal((await customerNotificationRef.get()).exists, true);
    await assert.rejects(respondToPageBookingRequest(db, 'business-owner', created.bookingId, 'declined'), /already been resolved/);
  });

  it('prevents a business from accepting overlapping confirmed appointments', async () => {
    const start = Date.now() + 10 * 86400000;
    const first = await createPageBookingRequest(
      db, 'customer-booking-conflict-1', 'booking-test-page', 'consultation',
      new Date(start).toISOString(), '', 'conflict-booking-key-0001',
    );
    await respondToPageBookingRequest(db, 'business-owner', first.bookingId, 'accepted');

    const overlap = await createPageBookingRequest(
      db, 'customer-booking-conflict-2', 'booking-test-page', 'follow-up',
      new Date(start + 15 * 60000).toISOString(), '', 'conflict-booking-key-0002',
    );
    await assert.rejects(
      respondToPageBookingRequest(db, 'business-owner', overlap.bookingId, 'accepted'),
      /overlaps another confirmed booking/,
    );
    assert.equal((await db.collection('pageBookings').doc(overlap.bookingId).get()).get('status'), 'pending');

    const clear = await createPageBookingRequest(
      db, 'customer-booking-clear', 'booking-test-page', 'consultation',
      new Date(start + 30 * 60000).toISOString(), '', 'conflict-booking-key-0003',
    );
    await respondToPageBookingRequest(db, 'business-owner', clear.bookingId, 'accepted');
    assert.equal((await db.collection('pageBookings').doc(clear.bookingId).get()).get('status'), 'accepted');
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
