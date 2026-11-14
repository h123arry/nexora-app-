import type { Firestore } from 'firebase-admin/firestore';
import { randomUUID } from 'node:crypto';
import { isCircleMuteActive } from './communityGovernance.js';

const ID_LIMIT = 150;
const TITLE_LIMIT = 120;
const LOCATION_LIMIT = 180;

function validId(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0 && value.length <= ID_LIMIT && !value.includes('/');
}



export async function createCircleEvent(
  db: Firestore, uid: string, communityId: string, title: string, startsAt: string, location = '',
): Promise<{ eventId: string }> {
  if (!uid || !validId(communityId)) throw new Error('A valid Circle is required.');
  const cleanTitle = typeof title === 'string' ? title.trim() : '';
  const cleanLocation = typeof location === 'string' ? location.trim() : '';
  const startDate = typeof startsAt === 'string' ? new Date(startsAt) : new Date(NaN);
  if (!cleanTitle || cleanTitle.length > TITLE_LIMIT || !Number.isFinite(startDate.getTime())
    || startDate.getTime() <= Date.now() || cleanLocation.length > LOCATION_LIMIT) {
    throw new Error('Add an event title, a future date and a valid location.');
  }
  const communityRef = db.collection('communities').doc(communityId);
  const memberRef = communityRef.collection('members').doc(uid);
  const muteRef = communityRef.collection('mutes').doc(uid);
  const eventId = randomUUID();
  const eventRef = communityRef.collection('events').doc(eventId);
  await db.runTransaction(async transaction => {
    const [community, member, mute] = await Promise.all([
      transaction.get(communityRef), transaction.get(memberRef), transaction.get(muteRef),
    ]);
    if (!community.exists || !member.exists || member.get('status') !== 'active') {
      throw new Error('Join this Circle to participate in events.');
    }
    if (isCircleMuteActive(mute.data())) throw new Error('Your Circle posting access is temporarily muted.');
    transaction.create(eventRef, {
      id: eventId, communityId, title: cleanTitle, startsAt: startDate,
      location: cleanLocation, createdBy: uid, attendeeCount: 0, status: 'scheduled',
      createdAt: new Date(),
    });
  });
  return { eventId };
}

export async function setCircleEventRsvp(
  db: Firestore, uid: string, communityId: string, eventId: string, attending: boolean,
): Promise<{ attending: boolean; attendeeCount: number }> {
  if (!uid || !validId(communityId) || !validId(eventId) || typeof attending !== 'boolean') {
    throw new Error('A valid event and RSVP choice are required.');
  }
  const community = db.collection('communities').doc(communityId);
  const memberRef = community.collection('members').doc(uid);
  const eventRef = community.collection('events').doc(eventId);
  const rsvpRef = eventRef.collection('rsvps').doc(uid);
  return db.runTransaction(async transaction => {
    const [member, event, rsvp] = await Promise.all([
      transaction.get(memberRef), transaction.get(eventRef), transaction.get(rsvpRef),
    ]);
    if (!member.exists || member.get('status') !== 'active') throw new Error('Join this Circle to RSVP.');
    if (!event.exists || event.get('status') !== 'scheduled') throw new Error('This event is unavailable.');
    const count = Math.max(0, Number(event.get('attendeeCount')) || 0);
    if (attending && !rsvp.exists) {
      transaction.create(rsvpRef, { userId: uid, attending: true, createdAt: new Date() });
      transaction.update(eventRef, { attendeeCount: count + 1 });
      return { attending: true, attendeeCount: count + 1 };
    }
    if (!attending && rsvp.exists) {
      transaction.delete(rsvpRef);
      transaction.update(eventRef, { attendeeCount: Math.max(0, count - 1) });
      return { attending: false, attendeeCount: Math.max(0, count - 1) };
    }
    return { attending: rsvp.exists, attendeeCount: count };
  });
}
