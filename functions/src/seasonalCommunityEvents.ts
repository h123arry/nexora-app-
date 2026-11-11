import { FieldValue, type Firestore } from 'firebase-admin/firestore';
import { randomUUID } from 'node:crypto';

const ID = /^[A-Za-z0-9_-]{1,150}$/;
const clean = (value: unknown, max: number) => typeof value === 'string' ? value.trim().replace(/\s+/g, ' ').slice(0, max) : '';

export interface SeasonalEventInput {
  title?: unknown; description?: unknown; category?: unknown; startsAt?: unknown; endsAt?: unknown; location?: unknown; capacity?: unknown;
}

export async function createSeasonalCommunityEvent(db: Firestore, creatorId: string, input: SeasonalEventInput) {
  if (!ID.test(creatorId)) throw new Error('A valid event manager is required.');
  const title = clean(input.title, 100);
  const description = clean(input.description, 800);
  const category = clean(input.category, 40);
  const location = clean(input.location, 160);
  const startsAt = typeof input.startsAt === 'string' ? new Date(input.startsAt) : new Date(NaN);
  const endsAt = typeof input.endsAt === 'string' ? new Date(input.endsAt) : new Date(NaN);
  const capacity = input.capacity === undefined || input.capacity === null || input.capacity === '' ? null : Number(input.capacity);
  if (title.length < 4 || description.length < 20 || category.length < 2
    || !Number.isFinite(startsAt.getTime()) || !Number.isFinite(endsAt.getTime())
    || startsAt.getTime() <= Date.now() || endsAt.getTime() <= startsAt.getTime()
    || endsAt.getTime() - startsAt.getTime() > 31 * 86400000
    || (capacity !== null && (!Number.isInteger(capacity) || capacity < 2 || capacity > 100000))) {
    throw new Error('Event details are invalid. Check the title, description, category, dates and capacity.');
  }
  const id = randomUUID();
  await db.collection('seasonalCommunityEvents').doc(id).create({
    id, title, description, category, location, startsAt, endsAt,
    capacity, attendeeCount: 0, status: 'scheduled', createdBy: creatorId,
    createdAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp(),
  });
  return { eventId: id };
}

export async function listSeasonalCommunityEvents(db: Firestore, uid: string) {
  if (!ID.test(uid)) throw new Error('A valid account is required.');
  const snapshot = await db.collection('seasonalCommunityEvents').limit(50).get();
  const now = Date.now();
  const events = await Promise.all(snapshot.docs.map(async doc => {
    const startsAt = doc.get('startsAt')?.toDate?.()?.getTime?.() || 0;
    const endsAt = doc.get('endsAt')?.toDate?.()?.getTime?.() || 0;
    if (endsAt <= now && doc.get('status') !== 'completed' && doc.get('status') !== 'cancelled') {
      await doc.ref.update({ status: 'completed', updatedAt: FieldValue.serverTimestamp() });
      return null;
    }
    if (!['scheduled', 'active'].includes(String(doc.get('status'))) || endsAt <= now) return null;
    const participant = await doc.ref.collection('participants').doc(uid).get();
    return {
      id: doc.id, title: doc.get('title'), description: doc.get('description'),
      category: doc.get('category'), location: doc.get('location') || '',
      startsAt: doc.get('startsAt')?.toDate?.()?.toISOString?.() || null,
      endsAt: doc.get('endsAt')?.toDate?.()?.toISOString?.() || null,
      capacity: doc.get('capacity') ?? null,
      attendeeCount: Number(doc.get('attendeeCount') || 0),
      attending: participant.exists,
      status: startsAt <= now ? 'active' : 'scheduled',
    };
  }));
  return { events: events.filter(Boolean).sort((a, b) => new Date(a!.startsAt || 0).getTime() - new Date(b!.startsAt || 0).getTime()) };
}

export async function setSeasonalCommunityEventRsvp(db: Firestore, uid: string, eventId: string, attending: boolean) {
  if (!ID.test(uid) || !ID.test(eventId) || typeof attending !== 'boolean') throw new Error('A valid event and RSVP choice are required.');
  const eventRef = db.collection('seasonalCommunityEvents').doc(eventId);
  const participantRef = eventRef.collection('participants').doc(uid);
  return db.runTransaction(async tx => {
    const event = await tx.get(eventRef);
    const participant = await tx.get(participantRef);
    if (!event.exists || !['scheduled', 'active'].includes(String(event.get('status')))) throw new Error('This seasonal event is unavailable.');
    const startsAt = event.get('startsAt')?.toDate?.()?.getTime?.() || 0;
    const endsAt = event.get('endsAt')?.toDate?.()?.getTime?.() || 0;
    const now = Date.now();
    if (startsAt <= now || endsAt <= now) throw new Error('RSVPs are closed for this event.');
    const count = Math.max(0, Number(event.get('attendeeCount')) || 0);
    const capacity = event.get('capacity');
    if (attending && !participant.exists) {
      if (Number.isInteger(capacity) && count >= capacity) throw new Error('This event has reached its attendance capacity.');
      tx.create(participantRef, { userId: uid, createdAt: FieldValue.serverTimestamp() });
      tx.update(eventRef, { attendeeCount: count + 1, updatedAt: FieldValue.serverTimestamp() });
      return { attending: true, attendeeCount: count + 1 };
    }
    if (!attending && participant.exists) {
      tx.delete(participantRef);
      tx.update(eventRef, { attendeeCount: Math.max(0, count - 1), updatedAt: FieldValue.serverTimestamp() });
      return { attending: false, attendeeCount: Math.max(0, count - 1) };
    }
    return { attending: participant.exists, attendeeCount: count };
  });
}
