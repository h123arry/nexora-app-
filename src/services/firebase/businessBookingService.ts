import { httpsCallable } from 'firebase/functions';
import { collection, limit, onSnapshot, orderBy, query, where, type Unsubscribe } from 'firebase/firestore';
import { auth, db } from './config';
import { functions } from '../../lib/firebase';

export interface BusinessBookingRequest {
  id: string;
  pageId: string;
  pageName: string;
  serviceId: string;
  serviceName: string;
  customerId: string;
  ownerId: string;
  requestedAt: Date | { toDate(): Date };
  note: string;
  status: 'pending' | 'accepted' | 'declined';
  createdAt?: unknown;
}

function requireSignedIn(uid: string): void {
  if (!uid || auth.currentUser?.uid !== uid) throw new Error('Sign in to access business bookings.');
}

export async function requestBusinessBooking(input: {
  pageId: string;
  serviceId: string;
  requestedAt: Date;
  note?: string;
  idempotencyKey?: string;
}): Promise<{ bookingId: string; created: boolean }> {
  if (!auth.currentUser) throw new Error('Sign in to request a booking.');
  if (!(input.requestedAt instanceof Date) || !Number.isFinite(input.requestedAt.getTime())) {
    throw new Error('Choose a valid requested date and time.');
  }
  const callable = httpsCallable(functions, 'createBusinessBookingRequest');
  const result = await callable({
    ...input,
    requestedAt: input.requestedAt.toISOString(),
    note: input.note || '',
    idempotencyKey: input.idempotencyKey || crypto.randomUUID(),
  });
  return result.data as { bookingId: string; created: boolean };
}

export async function respondToBusinessBooking(
  bookingId: string,
  decision: 'accepted' | 'declined',
): Promise<void> {
  if (!auth.currentUser) throw new Error('Sign in to manage bookings.');
  const callable = httpsCallable(functions, 'respondToBusinessBookingRequest');
  await callable({ bookingId, decision });
}

export function watchCustomerBookings(
  uid: string,
  onBookings: (items: BusinessBookingRequest[]) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  requireSignedIn(uid);
  return onSnapshot(query(
    collection(db, 'pageBookings'),
    where('customerId', '==', uid),
    orderBy('createdAt', 'desc'),
    limit(50),
  ), snapshot => onBookings(snapshot.docs.map(item => ({ id: item.id, ...item.data() } as BusinessBookingRequest))),
  error => onError?.(error));
}

export function watchPageBookingRequests(
  ownerUid: string,
  pageId: string,
  onBookings: (items: BusinessBookingRequest[]) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  requireSignedIn(ownerUid);
  if (!pageId || pageId.length > 150 || pageId.includes('/')) throw new Error('A valid business Page is required.');
  return onSnapshot(query(
    collection(db, 'pageBookings'),
    where('pageId', '==', pageId),
    where('ownerId', '==', ownerUid),
    orderBy('createdAt', 'desc'),
    limit(50),
  ), snapshot => onBookings(snapshot.docs.map(item => ({ id: item.id, ...item.data() } as BusinessBookingRequest))),
  error => onError?.(error));
}
