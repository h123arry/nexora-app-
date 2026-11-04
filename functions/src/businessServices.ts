import { randomUUID } from 'node:crypto';
import type { Firestore } from 'firebase-admin/firestore';

const ID_LIMIT = 150;
const NAME_LIMIT = 120;
const DESCRIPTION_LIMIT = 1200;

function validId(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0 && value.length <= ID_LIMIT && !value.includes('/');
}

export async function publishBusinessService(
  db: Firestore,
  ownerUid: string,
  pageId: string,
  input: { name: string; description: string; durationMinutes: number; priceMinor?: number; currency?: string },
): Promise<{ serviceId: string }> {
  const name = typeof input?.name === 'string' ? input.name.trim() : '';
  const description = typeof input?.description === 'string' ? input.description.trim() : '';
  const duration = input?.durationMinutes;
  const price = input?.priceMinor;
  const currency = typeof input?.currency === 'string' ? input.currency.toUpperCase() : 'NGN';
  if (!ownerUid || !validId(pageId) || !name || name.length > NAME_LIMIT
    || description.length > DESCRIPTION_LIMIT || !Number.isInteger(duration) || duration < 5 || duration > 1440
    || (price !== undefined && (!Number.isSafeInteger(price) || price < 0 || price > 100000000))
    || !/^[A-Z]{3}$/.test(currency)) {
    throw new Error('Provide a valid service name, description, duration and price.');
  }
  const pageRef = db.collection('pages').doc(pageId);
  const page = await pageRef.get();
  if (!page.exists || page.get('ownerId') !== ownerUid || page.get('category') !== 'Business') {
    throw new Error('Only the owning Business Page can publish services.');
  }
  const serviceId = randomUUID();
  await pageRef.collection('services').doc(serviceId).create({
    id: serviceId, pageId, name, description, durationMinutes: duration,
    priceMinor: price ?? null, currency, bookable: true, status: 'active',
    createdAt: new Date(), updatedAt: new Date(),
  });
  return { serviceId };
}

export async function setBusinessServiceStatus(
  db: Firestore, ownerUid: string, pageId: string, serviceId: string, status: 'active' | 'paused',
): Promise<{ status: 'active' | 'paused' }> {
  if (!ownerUid || !validId(pageId) || !validId(serviceId) || !['active', 'paused'].includes(status)) {
    throw new Error('A valid business service and status are required.');
  }
  const pageRef = db.collection('pages').doc(pageId);
  const serviceRef = pageRef.collection('services').doc(serviceId);
  return db.runTransaction(async tx => {
    const [page, service] = await Promise.all([tx.get(pageRef), tx.get(serviceRef)]);
    if (!page.exists || page.get('ownerId') !== ownerUid || page.get('category') !== 'Business') {
      throw new Error('Only the owning Business Page can manage services.');
    }
    if (!service.exists) throw new Error('This business service is unavailable.');
    tx.update(serviceRef, { status, bookable: status === 'active', updatedAt: new Date() });
    return { status };
  });
}
