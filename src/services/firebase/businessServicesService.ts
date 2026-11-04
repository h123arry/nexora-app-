import { httpsCallable } from 'firebase/functions';
import { collection, getDocs, limit, orderBy, query, where } from 'firebase/firestore';
import { auth, db } from './config';
import { functions } from '../../lib/firebase';

export interface BusinessServiceListing {
  id: string;
  pageId: string;
  name: string;
  description: string;
  durationMinutes: number;
  priceMinor: number | null;
  currency: string;
  bookable: boolean;
  status: 'active' | 'paused';
}

function requireOwner(uid: string): void {
  if (!uid || auth.currentUser?.uid !== uid) throw new Error('Sign in to manage business services.');
}

export async function listBusinessServices(pageId: string, includePaused = false): Promise<BusinessServiceListing[]> {
  if (!pageId || pageId.length > 150 || pageId.includes('/')) throw new Error('A valid business Page is required.');
  if (includePaused && !auth.currentUser) throw new Error('Sign in to manage business services.');
  const base = collection(db, 'pages', pageId, 'services');
  const snapshot = await getDocs(includePaused
    ? query(base, orderBy('name'), limit(50))
    : query(base, where('status', '==', 'active'), where('bookable', '==', true), orderBy('name'), limit(50)));
  return snapshot.docs.map(item => ({ id: item.id, ...item.data() } as BusinessServiceListing));
}

export async function publishBusinessServiceListing(
  uid: string,
  pageId: string,
  input: { name: string; description: string; durationMinutes: number; priceMinor?: number; currency?: string },
): Promise<string> {
  requireOwner(uid);
  const callable = httpsCallable(functions, 'publishBusinessServiceListing');
  const result = await callable({ pageId, ...input });
  return (result.data as { serviceId: string }).serviceId;
}

export async function setBusinessServiceListingStatus(
  uid: string,
  pageId: string,
  serviceId: string,
  status: 'active' | 'paused',
): Promise<void> {
  requireOwner(uid);
  const callable = httpsCallable(functions, 'setBusinessServiceListingStatus');
  await callable({ pageId, serviceId, status });
}
