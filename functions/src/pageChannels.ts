import { createHash } from 'node:crypto';
import type { Firestore } from 'firebase-admin/firestore';

const ID_LIMIT = 150;
const CONTENT_LIMIT = 2000;
const KEY_PATTERN = /^[A-Za-z0-9_-]{16,100}$/;
function validId(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0 && value.length <= ID_LIMIT && !value.includes('/');
}

export async function publishPageChannelUpdate(
  db: Firestore, ownerUid: string, pageId: string, rawContent: string, idempotencyKey: string,
): Promise<{ updateId: string }> {
  const content = typeof rawContent === 'string' ? rawContent.trim() : '';
  if (!ownerUid || !validId(pageId) || !content || content.length > CONTENT_LIMIT
    || typeof idempotencyKey !== 'string' || !KEY_PATTERN.test(idempotencyKey)) {
    throw new Error('Write a channel update of 1 to 2,000 characters.');
  }
  const pageRef = db.collection('pages').doc(pageId);
  const page = await pageRef.get();
  if (!page.exists || page.get('ownerId') !== ownerUid) {
    throw new Error('Only the owning Page account can publish channel updates.');
  }
  // The same owner/Page/key always resolves to one update. A retry can safely
  // resume notification fanout without publishing a second channel post.
  const updateId = createHash('sha256').update(ownerUid + ':' + pageId + ':' + idempotencyKey).digest('hex');
  const updateRef = pageRef.collection('channelUpdates').doc(updateId);
  const now = new Date();
  await db.runTransaction(async tx => {
    const existing = await tx.get(updateRef);
    if (existing.exists) {
      if (existing.get('ownerId') !== ownerUid || existing.get('pageId') !== pageId || existing.get('content') !== content) {
        throw new Error('This channel request key has already been used.');
      }
      return;
    }
    tx.create(updateRef, { id: updateId, pageId, ownerId: ownerUid, content, createdAt: now, status: 'published' });
  });

  // Notify every follower in bounded batches without loading the full audience.
  const followerQuery = db.collection('follows').where('followingId', '==', pageId).limit(450);
  let cursor: FirebaseFirestore.QueryDocumentSnapshot | undefined;
  while (true) {
    const followers = cursor ? await followerQuery.startAfter(cursor).get() : await followerQuery.get();
    if (followers.empty) break;
    const recipients = followers.docs
      .map(follower => String(follower.get('followerId') || ''))
      .filter(recipientId => validId(recipientId) && recipientId !== ownerUid);
    const notificationRefs = recipients.map(recipientId =>
      db.collection('users').doc(recipientId).collection('notifications').doc(`page_${updateId}`));
    const existingNotifications = await Promise.all(notificationRefs.map(ref => ref.get()));
    const batch = db.batch();
    let writes = 0;
    notificationRefs.forEach((ref, index) => {
      // Preserve read state on retries and only create missing delivery records.
      if (existingNotifications[index].exists) return;
      const recipientId = recipients[index];
      batch.create(ref, {
        id: `page_${updateId}`, userId: recipientId, type: 'community',
        username: String(page.get('username') || ''), avatar: String(page.get('avatar') || ''),
        targetId: pageId, content: 'published a new official channel update',
        timestamp: now.toISOString(), isRead: false, priority: 4,
        category: 'communities', actorName: String(page.get('name') || 'NEXORA Page').slice(0, 120),
      });
      writes += 1;
    });
    if (writes > 0) await batch.commit();
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
