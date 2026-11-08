import { doc, getDoc } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db, functions } from '../../lib/firebase';
import type { Post } from '../../types';

interface RepostResponse {
  reposted: boolean;
  repostPostId: string;
  shares: number;
}

export async function createPostRepost(postId: string, quoteText?: string): Promise<{ post: Post; shares: number }> {
  if (!postId || postId.length > 150 || postId.includes('/')) throw new Error('A valid post is required.');
  const callable = httpsCallable<{ postId: string; quoteText?: string }, RepostResponse>(functions, 'repostPublicPost');
  const response = await callable({ postId, ...(quoteText ? { quoteText } : {}) });
  const snapshot = await getDoc(doc(db, 'posts', response.data.repostPostId));
  if (!snapshot.exists()) throw new Error('The repost was saved but could not be loaded. Refresh your feed.');
  return {
    post: { id: snapshot.id, ...snapshot.data() } as Post,
    shares: response.data.shares,
  };
}
