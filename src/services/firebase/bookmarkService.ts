import { collection, doc, getDocs, limit, query, runTransaction, serverTimestamp } from 'firebase/firestore';
import { auth, db } from './config';

const MAX_BOOKMARKS = 500;
const BOOKMARK_BATCH_SIZE = 10;

function requireOwner(uid: string): void {
  if (!uid || auth.currentUser?.uid !== uid) {
    throw new Error('You must be signed in to manage your saved posts.');
  }
}

function normalizeIds(postIds: unknown): string[] {
  if (!Array.isArray(postIds)) return [];
  return [...new Set(postIds.filter((id): id is string =>
    typeof id === 'string' && id.length > 0 && id.length <= 150 && !id.includes('/')
  ))].slice(0, MAX_BOOKMARKS);
}

/** Read the authenticated user's canonical saved-post list from Firestore. */
export async function getPostBookmarks(uid: string): Promise<string[]> {
  requireOwner(uid);
  const snapshot = await getDocs(query(
    collection(db, 'users', uid, 'postBookmarks'),
    limit(MAX_BOOKMARKS),
  ));
  return snapshot.docs.map(bookmark => bookmark.id);
}

/** Persist one desired bookmark state; repeated calls are safe and idempotent. */
export async function setPostBookmark(uid: string, postId: string, bookmarked: boolean): Promise<void> {
  requireOwner(uid);
  if (!postId || postId.length > 150 || postId.includes('/')) {
    throw new Error('Invalid post ID.');
  }
  if (typeof bookmarked !== 'boolean') throw new Error('A bookmark state is required.');

  const postRef = doc(db, 'posts', postId);
  const bookmarkRef = doc(db, 'users', uid, 'postBookmarks', postId);
  await runTransaction(db, async transaction => {
    const [postSnapshot, bookmarkSnapshot] = await Promise.all([
      transaction.get(postRef),
      transaction.get(bookmarkRef),
    ]);

    if (bookmarked) {
      if (!postSnapshot.exists() || postSnapshot.data().audience !== 'public') {
        throw new Error('This public post is unavailable.');
      }
      if (!bookmarkSnapshot.exists()) {
        transaction.set(bookmarkRef, {
          postId,
          createdAt: serverTimestamp(),
        });
      }
    } else if (bookmarkSnapshot.exists()) {
      transaction.delete(bookmarkRef);
    }
  });
}

/**
 * Import device-local bookmarks created by older Nexora versions. Invalid or
 * no-longer-public posts are skipped; the canonical Firestore list is returned.
 */
export async function migrateLegacyPostBookmarks(uid: string, legacyIds: unknown): Promise<string[]> {
  requireOwner(uid);
  const existing = new Set(await getPostBookmarks(uid));
  const pending = normalizeIds(legacyIds).filter(id => !existing.has(id));

  for (let index = 0; index < pending.length; index += BOOKMARK_BATCH_SIZE) {
    const batch = pending.slice(index, index + BOOKMARK_BATCH_SIZE);
    await Promise.allSettled(batch.map(postId => setPostBookmark(uid, postId, true)));
  }

  return getPostBookmarks(uid);
}
