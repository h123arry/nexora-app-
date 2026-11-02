import type { Firestore } from 'firebase-admin/firestore';
import { randomUUID } from 'node:crypto';

const ID_LIMIT = 150;
const TITLE_LIMIT = 120;
const BODY_LIMIT = 2000;

function validId(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0 && value.length <= ID_LIMIT && !value.includes('/');
}

function requireAnnouncementManager(
  community: FirebaseFirestore.DocumentSnapshot,
  member: FirebaseFirestore.DocumentSnapshot,
  uid: string,
): void {
  const role = member.exists ? member.get('role') : null;
  const isOwner = community.exists && community.get('ownerId') === uid && role === 'owner';
  const isDelegate = role === 'admin' || role === 'moderator';
  if (!community.exists || !member.exists || member.get('status') !== 'active' || (!isOwner && !isDelegate)) {
    throw new Error('Only active Circle owners, admins, or moderators can manage announcements.');
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
  const communityRef = db.collection('communities').doc(communityId);
  const memberRef = communityRef.collection('members').doc(uid);
  const announcementId = randomUUID();
  const announcementRef = communityRef.collection('announcements').doc(announcementId);
  await db.runTransaction(async transaction => {
    const [community, member] = await Promise.all([
      transaction.get(communityRef),
      transaction.get(memberRef),
    ]);
    requireAnnouncementManager(community, member, uid);
    transaction.create(announcementRef, {
      id: announcementId,
      communityId,
      title: cleanTitle,
      body: cleanBody,
      createdBy: uid,
      createdAt: new Date(),
      updatedAt: new Date(),
      pinned: false,
    });
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
  const communityRef = db.collection('communities').doc(communityId);
  const memberRef = communityRef.collection('members').doc(uid);
  const ref = communityRef.collection('announcements').doc(announcementId);
  await db.runTransaction(async transaction => {
    const [community, member, announcement] = await Promise.all([
      transaction.get(communityRef),
      transaction.get(memberRef),
      transaction.get(ref),
    ]);
    requireAnnouncementManager(community, member, uid);
    if (!announcement.exists) throw new Error('This announcement is unavailable.');
    transaction.update(ref, { pinned, updatedAt: new Date() });
  });
  return { pinned };
}
