import { db } from '../firebase/config';
import { handleFirestoreError, OperationType } from '../firebase/errors';
import { auth } from '../firebase/config';
import {
  doc,
  setDoc,
  collection, orderBy, limit, where,
  startAfter,
  getDocs,
  query,
  onSnapshot,
  QueryDocumentSnapshot,
  DocumentData
} from 'firebase/firestore';
import { Post } from '../../types';
import { cacheManager } from '../cache/cacheService';

const path = 'posts';
export const DEFAULT_FEED_PAGE_SIZE = 50;
export const MAX_FEED_PAGE_SIZE = 100;

function normalizePosts(snapshot: { docs: Array<{ id: string; data: () => DocumentData }> }): Post[] {
  const seen = new Set<string>();
  return snapshot.docs.reduce<Post[]>((posts, snapshotDoc) => {
    if (seen.has(snapshotDoc.id)) return posts;
    seen.add(snapshotDoc.id);
    const post = { id: snapshotDoc.id, ...snapshotDoc.data() } as Post;
    cacheManager.setPost(post.id, post);
    posts.push(post);
    return posts;
  }, []);
}

export async function savePostToDbDirect(post: any) {
  const sanitizedPost = JSON.parse(JSON.stringify(post));
  if (sanitizedPost.audience && sanitizedPost.audience !== 'public') {
    throw new Error('Only public posts can be published until secure private-audience access is implemented.');
  }
  sanitizedPost.audience = 'public';
  cacheManager.setPost(post.id, sanitizedPost);
  try {
    return await setDoc(doc(db, path, post.id), sanitizedPost);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path, auth);
  }
}

export async function getGlobalPosts() {
  try {
    const q = query(collection(db, path), where('audience', '==', 'public'), orderBy('timestamp', 'desc'), limit(DEFAULT_FEED_PAGE_SIZE));
    const snapshot = await getDocs(q);
    return normalizePosts(snapshot);
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path, auth);
  }
}

export interface FeedPage {
  posts: Post[];
  nextCursor: QueryDocumentSnapshot<DocumentData> | null;
  hasMore: boolean;
}

/**
 * Fetch one bounded feed page. The cursor is the last snapshot returned by
 * the previous page; callers should retain it rather than re-querying from 0.
 */
export async function getGlobalPostsPage(
  cursor: QueryDocumentSnapshot<DocumentData> | null = null,
  pageSize = DEFAULT_FEED_PAGE_SIZE,
): Promise<FeedPage> {
  const safePageSize = Math.min(Math.max(1, Math.floor(pageSize)), MAX_FEED_PAGE_SIZE);
  try {
    const constraints = [where('audience', '==', 'public'), orderBy('timestamp', 'desc'), limit(safePageSize)];
    const q = cursor
      ? query(collection(db, path), where('audience', '==', 'public'), orderBy('timestamp', 'desc'), startAfter(cursor), limit(safePageSize))
      : query(collection(db, path), ...constraints);
    const snapshot = await getDocs(q);
    return {
      posts: normalizePosts(snapshot),
      nextCursor: snapshot.docs.length > 0 ? snapshot.docs[snapshot.docs.length - 1] : null,
      hasMore: snapshot.docs.length === safePageSize,
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path, auth);
    return { posts: [], nextCursor: null, hasMore: false };
  }
}

export function subscribeToPosts(callback: (posts: Post[], page?: FeedPage) => void) {
  const q = query(collection(db, path), where('audience', '==', 'public'), orderBy('timestamp', 'desc'), limit(DEFAULT_FEED_PAGE_SIZE));
  return onSnapshot(q, (snapshot) => {
    const posts = normalizePosts(snapshot);
    callback(posts, {
      posts,
      nextCursor: snapshot.docs.length > 0 ? snapshot.docs[snapshot.docs.length - 1] : null,
      hasMore: snapshot.docs.length === DEFAULT_FEED_PAGE_SIZE,
    });
  }, (error) => {
    handleFirestoreError(error, OperationType.LIST, path, auth);
  });
}
