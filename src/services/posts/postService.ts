import { db } from '../firebase/config';
import { handleFirestoreError, OperationType } from '../firebase/errors';
import { auth } from '../firebase/config';
import { 
  doc, 
  setDoc,
  collection, 
  getDocs, 
  query, 
  onSnapshot,
  serverTimestamp
} from 'firebase/firestore';
import { Post } from '../../types';
import { cacheManager } from '../cache/cacheService';

const path = 'posts';

export const DEFAULT_SEED_POSTS: Post[] = [
  {
    id: 'seed-post-1',
    userId: 'user_sophia',
    username: 'sophia_quantum',
    name: 'Sophia Chen',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80',
    isVerified: true,
    content: 'Just deployed our new multi-region consensus protocol on Nexora orbit network. Latency metrics dropped by 42%! ✨ Excited to see how builders utilize this for decentralized sync.',
    image: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop&q=80',
    likes: 34,
    commentsCount: 5,
    shares: 4,
    tags: ['Technology', 'AI', 'Architecture'],
    timestamp: new Date(Date.now() - 3600000 * 3).toISOString(),
    comments: []
  },
  {
    id: 'seed-post-2',
    userId: 'user_marcus',
    username: 'marcus_ai',
    name: 'Marcus Thorne',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop&q=80',
    isVerified: true,
    content: 'Exploring the intersection of neural reasoning and real-time state streams. The future of creative collaboration is zero-latency persistence. What are your thoughts on agentic memory models?',
    likes: 58,
    commentsCount: 9,
    shares: 11,
    tags: ['Science', 'AI', 'Philosophy'],
    timestamp: new Date(Date.now() - 3600000 * 8).toISOString(),
    comments: []
  },
  {
    id: 'seed-post-3',
    userId: 'user_amina',
    username: 'amina_bello',
    name: 'Amina Bello',
    avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=200&auto=format&fit=crop&q=80',
    isVerified: false,
    content: 'Hosting a community roundtable on sustainable digital ecosystems this Friday in Lagos! Drop your questions below or join our live audio orbit. 🌿🚀',
    image: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=800&auto=format&fit=crop&q=80',
    likes: 42,
    commentsCount: 7,
    shares: 6,
    tags: ['Startups', 'Community', 'Nature'],
    timestamp: new Date(Date.now() - 3600000 * 14).toISOString(),
    comments: []
  },
  {
    id: 'seed-post-4',
    userId: 'user_voh',
    username: 'voh',
    name: 'VOH Founder',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&auto=format&fit=crop&q=80',
    isVerified: true,
    content: 'Welcome to Nexora unified global feed persistence! Every thought, spark, and media story shared here is securely synchronized across the distributed network. Keep building extraordinary things! ⚡',
    likes: 120,
    commentsCount: 18,
    shares: 32,
    tags: ['Nexora', 'Announcement', 'Vision'],
    timestamp: new Date(Date.now() - 3600000 * 24).toISOString(),
    comments: []
  }
];

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
    const q = query(collection(db, path));
    const snapshot = await getDocs(q);
    let posts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Post[];
    if (posts.length === 0) {
      for (const p of DEFAULT_SEED_POSTS) {
        try {
          await setDoc(doc(db, path, p.id), p);
          posts.push(p);
        } catch (e) {}
      }
    }
    posts.forEach(p => cacheManager.setPost(p.id, p));
    return posts;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path, auth);
  }
}

export function subscribeToPosts(callback: (posts: Post[]) => void) {
  const q = query(collection(db, path));
  return onSnapshot(q, async (snapshot) => {
    let posts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Post[];
    if (posts.length === 0) {
      for (const p of DEFAULT_SEED_POSTS) {
        try {
          await setDoc(doc(db, path, p.id), p);
          posts.push(p);
        } catch (e) {}
      }
    }
    posts.forEach(p => cacheManager.setPost(p.id, p));
    callback(posts);
  }, (error) => {
    handleFirestoreError(error, OperationType.LIST, path, auth);
  });
}
