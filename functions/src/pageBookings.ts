import { createHash } from 'node:crypto';
import { FieldValue, type Firestore } from 'firebase-admin/firestore';

const ID_LIMIT = 150;
const NOTE_LIMIT = 1000;
const KEY_PATTERN = /^[A-Za-z0-9_-]{16,100}$/;

function bookingDate(value: unknown): Date | null {
  if (value instanceof Date) return Number.isFinite(value.getTime()) ? value : null;
  if (typeof value === 'string') {
    const parsed = new Date(value);
    return Number.isFinite(parsed.getTime()) ? parsed : null;
  }
  if (value && typeof value === 'object' && 'toDate' in value && typeof (value as { toDate?: unknown }).toDate === 'function') {
    try {
      const parsed = (value as { toDate: () => Date }).toDate();
      return parsed instanceof Date && Number.isFinite(parsed.getTime()) ? parsed : null;
    } catch { return null; }
  }
  return null;
}

function bookingDuration(value: unknown): number {
  return Number.isInteger(value) && Number(value) >= 5 && Number(value) <= 1440 ? Number(value) : 30;
}

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
  // Scope retries to the customer, Page and service. Reusing a key for a different
  // service must never silently return an unrelated booking request.
  const bookingId = createHash('sha256').update(customerUid + ':' + pageId + ':' + serviceId + ':' + idempotencyKey).digest('hex');
  const bookingRef = db.collection('pageBookings').doc(bookingId);
  const rateRef = db.collection('pageBookingRateLimits').doc(customerUid);

  return db.runTransaction(async tx => {
    const [page, service, existing, rate] = await Promise.all([
      tx.get(pageRef), tx.get(serviceRef), tx.get(bookingRef), tx.get(rateRef),
    ]);
    if (existing.exists) {
      if (existing.get('customerId') !== customerUid || existing.get('pageId') !== pageId || existing.get('serviceId') !== serviceId) {
        throw new Error('This request key has already been used.');
      }
      const existingOwnerId = String(existing.get('ownerId') || '');
      const notificationRef = db.collection('users').doc(existingOwnerId).collection('notifications').doc('booking_request_' + bookingId);
      const notification = await tx.get(notificationRef);
      if (!notification.exists) {
        tx.create(notificationRef, {
          id: 'booking_request_' + bookingId, userId: existingOwnerId,
          type: 'community', category: 'communities', targetId: bookingId,
          content: 'received a booking request for ' + String(existing.get('serviceName') || 'a service'),
          actorName: 'NEXORA customer', username: '', avatar: '',
          timestamp: new Date().toISOString(), isRead: false, priority: 4,
        });
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
      || !page.get('ownerId') || page.get('ownerId') === customerUid || !service.exists
      || service.get('status') !== 'active' || service.get('bookable') !== true) {
      throw new Error('This business service is unavailable for booking.');
    }
    const serviceName = String(service.get('name') || '').trim();
    if (!serviceName || serviceName.length > 120) throw new Error('This business service is unavailable for booking.');
    const ownerUid = String(page.get('ownerId'));
    const notificationRef = db.collection('users').doc(ownerUid).collection('notifications').doc('booking_request_' + bookingId);
    const existingNotification = await tx.get(notificationRef);
    tx.set(rateRef, { windowStartedAt: withinWindow ? windowStart : now, requestCount: requestCount + 1, updatedAt: now });
    tx.create(bookingRef, {
      pageId, pageName: String(page.get('name') || 'Business'),
      pageUsername: String(page.get('username') || ''),
      pageAvatar: String(page.get('avatar') || ''),
      serviceId, serviceName, durationMinutes: bookingDuration(service.get('durationMinutes')), customerId: customerUid,
      ownerId: ownerUid, requestedAt: new Date(requestedAt),
      note: note.trim(), status: 'pending', createdAt: now, updatedAt: now,
    });
    if (!existingNotification.exists) {
      tx.create(notificationRef, {
        id: 'booking_request_' + bookingId, userId: ownerUid,
        type: 'community', category: 'communities', targetId: bookingId,
        content: 'received a booking request for ' + serviceName,
        actorName: 'NEXORA customer', username: '', avatar: '',
        timestamp: now.toISOString(), isRead: false, priority: 4,
      });
    }
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
    if (booking.get('status') !== 'pending' && booking.get('status') !== decision) {
      throw new Error('This booking request has already been resolved.');
    }
    const customerUid = String(booking.get('customerId') || '');
    let acceptedStartsAt: Date | null = null;
    if (booking.get('status') === 'pending' && decision === 'accepted') {
      const startsAt = bookingDate(booking.get('requestedAt'));
      acceptedStartsAt = startsAt;
      if (!startsAt || startsAt.getTime() <= Date.now()) {
        throw new Error('This booking time is no longer valid. Ask the customer to submit a new request.');
      }
      const durationMinutes = bookingDuration(booking.get('durationMinutes'));
      const endsAt = new Date(startsAt.getTime() + durationMinutes * 60_000);
      // Services are capped at 24 hours, so this window includes every earlier
      // confirmed booking that could overlap this requested interval.
      const earliestPossibleOverlap = new Date(startsAt.getTime() - 24 * 60 * 60_000);
      const overlapping = await tx.get(db.collection('pageBookings')
        .where('pageId', '==', String(booking.get('pageId') || ''))
        .where('status', '==', 'accepted')
        .where('requestedAt', '>=', earliestPossibleOverlap)
        .where('requestedAt', '<', endsAt));
      for (const existing of overlapping.docs) {
        if (existing.id === bookingId) continue;
        const existingStart = bookingDate(existing.get('requestedAt'));
        if (!existingStart) continue;
        const existingEnd = new Date(existingStart.getTime() + bookingDuration(existing.get('durationMinutes')) * 60_000);
        if (existingStart < endsAt && existingEnd > startsAt) {
          throw new Error('This time overlaps another confirmed booking. Choose a different time.');
        }
      }
    }
    const notificationId = 'booking_response_' + bookingId + '_' + decision;
    const notificationRef = db.collection('users').doc(customerUid).collection('notifications').doc(notificationId);
    const notification = await tx.get(notificationRef);
    const now = new Date();
    if (booking.get('status') === 'pending') {
      tx.update(ref, {
        status: decision, respondedAt: now, updatedAt: now,
        ...(decision === 'accepted' && acceptedStartsAt
          ? { reminderDueAt: new Date(Math.max(now.getTime(), acceptedStartsAt.getTime() - 24 * 60 * 60_000)) }
          : {}),
      });
    }
    if (!notification.exists) {
      const pageName = String(booking.get('pageName') || 'Business Page');
      const serviceName = String(booking.get('serviceName') || 'your service');
      tx.create(notificationRef, {
        id: notificationId, userId: customerUid,
        type: 'community', category: 'communities', targetId: bookingId,
        content: pageName + ' ' + decision + ' your booking request for ' + serviceName,
        actorName: pageName, username: String(booking.get('pageUsername') || ''),
        avatar: String(booking.get('pageAvatar') || ''),
        timestamp: now.toISOString(), isRead: false, priority: 4,
      });
    }
    return { status: decision };
  });
}


/** Either booking participant can cancel a pending request or future confirmed appointment. */
export async function cancelPageBookingRequest(
  db: Firestore,
  requesterUid: string,
  bookingId: string,
): Promise<{ status: 'cancelled' }> {
  if (!requesterUid || !validId(bookingId)) throw new Error('A valid booking request is required.');
  const ref = db.collection('pageBookings').doc(bookingId);
  return db.runTransaction(async tx => {
    const booking = await tx.get(ref);
    if (!booking.exists) throw new Error('This booking request is unavailable.');
    const ownerUid = String(booking.get('ownerId') || '');
    const customerUid = String(booking.get('customerId') || '');
    const isOwner = requesterUid === ownerUid;
    const isCustomer = requesterUid === customerUid;
    if (!isOwner && !isCustomer) throw new Error('Only the customer or business Page owner can cancel this booking.');
    const status = booking.get('status');
    if (status === 'cancelled') return { status: 'cancelled' };
    if (status !== 'pending' && status !== 'accepted') {
      throw new Error('Only pending or confirmed future bookings can be cancelled.');
    }
    const startsAt = bookingDate(booking.get('requestedAt'));
    if (!startsAt || startsAt.getTime() <= Date.now()) {
      throw new Error('This booking can no longer be cancelled because its appointment time has passed.');
    }
    const recipientUid = isOwner ? customerUid : ownerUid;
    if (!recipientUid) throw new Error('The other booking participant is unavailable.');
    const notificationId = 'booking_cancelled_' + bookingId;
    const notificationRef = db.collection('users').doc(recipientUid).collection('notifications').doc(notificationId);
    const notification = await tx.get(notificationRef);
    const now = new Date();
    const pageName = String(booking.get('pageName') || 'Business Page');
    const serviceName = String(booking.get('serviceName') || 'your service');
    tx.update(ref, { status: 'cancelled', cancelledBy: requesterUid, cancelledAt: now, reminderDueAt: FieldValue.delete(), updatedAt: now });
    if (!notification.exists) {
      tx.create(notificationRef, {
        id: notificationId,
        userId: recipientUid,
        type: 'community',
        category: 'communities',
        targetId: bookingId,
        content: isOwner
          ? pageName + ' cancelled your booking for ' + serviceName
          : 'A customer cancelled the booking request for ' + serviceName,
        actorName: isOwner ? pageName : 'NEXORA customer',
        username: isOwner ? String(booking.get('pageUsername') || '') : '',
        avatar: isOwner ? String(booking.get('pageAvatar') || '') : '',
        timestamp: now.toISOString(),
        isRead: false,
        priority: 4,
      });
    }
    return { status: 'cancelled' };
  });
}
