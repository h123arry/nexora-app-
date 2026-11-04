import { randomUUID } from 'node:crypto';
import type { Firestore } from 'firebase-admin/firestore';

const ID_LIMIT = 150;
const CONTENT_LIMIT = 2000;
function validId(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0 && value.length <= ID_LIMIT && !value.includes('/');
}

export async function publishPageChannelUpdate(
  db: Firestore, ownerUid: string, pageId: string, rawContent: string,
): Promise<{ updateId: string }> {
  const content = typeof rawContent === 'string' ? rawContent.trim() : '';
  if (!ownerUid || !validId(pageId) || !content || content.length > CONTENT_LIMIT) {
    throw new Error('Write a channel update of 1 to 2,000 characters.');
  }
  const pageRef = db.collection('pages').doc(pageId);
  const page = await pageRef.get();
  if (!page.exists || page.get('ownerId') !== ownerUid) {
    throw new Error('Only the owning Page account can publish channel updates.');
  }
  const updateId = randomUUID();
  const now = new Date();
  await pageRef.collection('channelUpdates').doc(updateId).create({
    id: updateId, pageId, ownerId: ownerUid, content,
    createdAt: now, status: 'published',
  });

  // Notify every follower in bounded batches without loading the full audience.
  const followerQuery = db.collection('follows').where('followingId', '==', pageId).limit(450);
  let cursor: FirebaseFirestore.QueryDocumentSnapshot | undefined;
  while (true) {
    const followers = cursor ? await followerQuery.startAfter(cursor).get() : await followerQuery.get();
    if (followers.empty) break;
    const batch = db.batch();
    for (const follower of followers.docs) {
      const recipientId = String(follower.get('followerId') || '');
      if (!recipientId || recipientId === ownerUid) continue;
      batch.set(db.collection('users').doc(recipientId).collection('notifications').doc(`page_${updateId}`), {
        id: `page_${updateId}`, userId: recipientId, type: 'community',
        username: String(page.get('username') || ''), avatar: String(page.get('avatar') || ''),
        targetId: pageId, content: 'published a new official channel update',
        timestamp: now.toISOString(), isRead: false, priority: 4,
        category: 'communities', actorName: String(page.get('name') || 'NEXORA Page').slice(0, 120),
      });
    }
    await batch.commit();
    cursor = followers.docs[followers.docs.length - 1];
    if (followers.size < 450) break;
  }
  return { updateId };
}

export async function deletePageChannelUpdate(
  db: Firestore, ownerUid: string, pageId: string, updateId: string,
): Promise<void> {
  if (!ownerUid || !validId(pageId) || !validId(updateId)) throw new Error('A valid Page update is required.');
  const pageRef = db.collection('pages').doc(pageId);
  const updateRef = pageRef.collection('channelUpdates').doc(updateId);
  await db.runTransaction(async tx => {
    const [page, update] = await Promise.all([tx.get(pageRef), tx.get(updateRef)]);
    if (!page.exists || page.get('ownerId') !== ownerUid) {
      throw new Error('Only the owning Page account can manage channel updates.');
    }
    if (!update.exists) throw new Error('This channel update is unavailable.');
    tx.delete(updateRef);
  });
}
