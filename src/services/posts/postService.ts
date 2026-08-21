import { db } from '../firebase/config';
import { handleFirestoreError, OperationType } from '../firebase/errors';
import { auth } from '../firebase/config';
import { 
  doc, 
  setDoc,
  collection, orderBy, limit, 
  getDocs, 
  query, 
  onSnapshot,
  serverTimestamp
} from 'firebase/firestore';
import { Post } from '../../types';
import { cacheManager } from '../cache/cacheService';

const path = 'posts';

export async function savePostToDbDirect(post: any) {
  const sanitizedPost = JSON.parse(JSON.stringify(post));
  cacheManager.setPost(post.id, sanitizedPost);
  try {
    return await setDoc(doc(db, path, post.id), sanitizedPost);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path, auth);
  }
}

export async function getGlobalPosts() {
  try {
    const q = query(collection(db, path), orderBy('timestamp', 'desc'), limit(150));
    const snapshot = await getDocs(q);
    const posts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Post[];
    posts.forEach(p => cacheManager.setPost(p.id, p));
    return posts;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path, auth);
  }
}

export function subscribeToPosts(callback: (posts: Post[]) => void) {
  const q = query(collection(db, path), orderBy('timestamp', 'desc'), limit(150));
  return onSnapshot(q, (snapshot) => {
    const posts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Post[];
    posts.forEach(p => cacheManager.setPost(p.id, p));
    callback(posts);
  }, (error) => {
    handleFirestoreError(error, OperationType.LIST, path, auth);
  });
}

