import type { Firestore } from 'firebase-admin/firestore';
import { randomUUID } from 'node:crypto';

const ID_LIMIT = 150;
const TITLE_LIMIT = 120;
const BODY_LIMIT = 2000;

function validId(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0 && value.length <= ID_LIMIT && !value.includes('/');
}

async function requireCircleOwner(db: Firestore, communityId: string, uid: string): Promise<void> {
  const [community, member] = await Promise.all([
    db.collection('communities').doc(communityId).get(),
    db.collection('communities').doc(communityId).collection('members').doc(uid).get(),
  ]);
  if (!community.exists || community.get('ownerId') !== uid
    || !member.exists || member.get('status') !== 'active' || member.get('role') !== 'owner') {
    throw new Error('Only the active Circle owner can manage announcements.');
  }
}

export async function createCircleAnnouncement(
  db: Firestore,
  uid: string,
  communityId: string,
  title: string,
  body: string,
): Promise<{ announcementId: string }> {
  if (!uid || !validId(communityId)) throw new Error('A valid Circle is required.');
  const cleanTitle = typeof title === 'string' ? title.trim() : '';
  const cleanBody = typeof body === 'string' ? body.trim() : '';
  if (!cleanTitle || cleanTitle.length > TITLE_LIMIT || !cleanBody || cleanBody.length > BODY_LIMIT) {
    throw new Error('Add an announcement title and message within the character limits.');
  }
  await requireCircleOwner(db, communityId, uid);
  const announcementId = randomUUID();
  await db.collection('communities').doc(communityId).collection('announcements').doc(announcementId).create({
    id: announcementId,
    communityId,
    title: cleanTitle,
    body: cleanBody,
    createdBy: uid,
    createdAt: new Date(),
    updatedAt: new Date(),
    pinned: false,
  });
  return { announcementId };
}

export async function setCircleAnnouncementPinned(
  db: Firestore,
  uid: string,
  communityId: string,
  announcementId: string,
  pinned: boolean,
): Promise<{ pinned: boolean }> {
  if (!uid || !validId(communityId) || !validId(announcementId) || typeof pinned !== 'boolean') {
    throw new Error('A valid announcement and pin state are required.');
  }
  await requireCircleOwner(db, communityId, uid);
  const ref = db.collection('communities').doc(communityId).collection('announcements').doc(announcementId);
  const snapshot = await ref.get();
  if (!snapshot.exists) throw new Error('This announcement is unavailable.');
  await ref.update({ pinned, updatedAt: new Date() });
  return { pinned };
}
