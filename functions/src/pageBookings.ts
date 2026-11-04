import { createHash } from 'node:crypto';
import type { Firestore } from 'firebase-admin/firestore';

const ID_LIMIT = 150;
const NOTE_LIMIT = 1000;
const KEY_PATTERN = /^[A-Za-z0-9_-]{16,100}$/;

function validId(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0 && value.length <= ID_LIMIT && !value.includes('/');
}

/** Customer booking requests are requests only: no payment or confirmed reservation is implied. */
export async function createPageBookingRequest(
  db: Firestore,
  customerUid: string,
  pageId: string,
  serviceId: string,
  requestedAt: string,
  note: string,
  idempotencyKey: string,
): Promise<{ bookingId: string; created: boolean }> {
  if (!customerUid || !validId(pageId) || !validId(serviceId)
    || typeof requestedAt !== 'string' || !Number.isFinite(Date.parse(requestedAt))
    || Date.parse(requestedAt) <= Date.now() || Date.parse(requestedAt) > Date.now() + 180 * 86400000
    || typeof note !== 'string' || note.trim().length > NOTE_LIMIT
    || typeof idempotencyKey !== 'string' || !KEY_PATTERN.test(idempotencyKey)) {
    throw new Error('Provide a valid service, future requested time, note and request key.');
  }

  const pageRef = db.collection('pages').doc(pageId);
  const serviceRef = pageRef.collection('services').doc(serviceId);
  const bookingId = createHash('sha256').update(customerUid + ':' + idempotencyKey).digest('hex');
  const bookingRef = db.collection('pageBookings').doc(bookingId);
  const rateRef = db.collection('pageBookingRateLimits').doc(customerUid);

  return db.runTransaction(async tx => {
    const [page, service, existing, rate] = await Promise.all([
      tx.get(pageRef), tx.get(serviceRef), tx.get(bookingRef), tx.get(rateRef),
    ]);
    if (existing.exists) {
      if (existing.get('customerId') !== customerUid || existing.get('pageId') !== pageId) {
        throw new Error('This request key has already been used.');
      }
      return { bookingId, created: false };
    }
    const now = new Date();
    const rateData = rate.data() || {};
    const windowStart = rateData.windowStartedAt?.toDate?.() || rateData.windowStartedAt;
    const withinWindow = windowStart instanceof Date && now.getTime() - windowStart.getTime() < 3600000;
    const requestCount = withinWindow ? Math.max(0, Number(rateData.requestCount) || 0) : 0;
    if (requestCount >= 10) throw new Error('Too many booking requests. Try again later.');
    if (!page.exists || page.get('category') !== 'Business' || page.get('status') === 'suspended'
      || page.get('ownerId') === customerUid || !service.exists
      || service.get('status') !== 'active' || service.get('bookable') !== true) {
      throw new Error('This business service is unavailable for booking.');
    }
    const serviceName = String(service.get('name') || '').trim();
    if (!serviceName || serviceName.length > 120) throw new Error('This business service is unavailable for booking.');
    tx.set(rateRef, { windowStartedAt: withinWindow ? windowStart : now, requestCount: requestCount + 1, updatedAt: now });
    tx.create(bookingRef, {
      pageId, pageName: String(page.get('name') || 'Business'),
      serviceId, serviceName, customerId: customerUid,
      ownerId: String(page.get('ownerId')), requestedAt: new Date(requestedAt),
      note: note.trim(), status: 'pending', createdAt: new Date(), updatedAt: new Date(),
    });
    return { bookingId, created: true };
  });
}

export async function respondToPageBookingRequest(
  db: Firestore,
  ownerUid: string,
  bookingId: string,
  decision: 'accepted' | 'declined',
): Promise<{ status: 'accepted' | 'declined' }> {
  if (!ownerUid || !validId(bookingId) || !['accepted', 'declined'].includes(decision)) {
    throw new Error('A valid booking request and decision are required.');
  }
  const ref = db.collection('pageBookings').doc(bookingId);
  return db.runTransaction(async tx => {
    const booking = await tx.get(ref);
    if (!booking.exists) throw new Error('This booking request is unavailable.');
    if (booking.get('ownerId') !== ownerUid) throw new Error('Only the business Page owner can respond.');
    if (booking.get('status') !== 'pending') {
      if (booking.get('status') === decision) return { status: decision };
      throw new Error('This booking request has already been resolved.');
    }
    tx.update(ref, { status: decision, respondedAt: new Date(), updatedAt: new Date() });
    return { status: decision };
  });
}
