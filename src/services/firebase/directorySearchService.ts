import { httpsCallable } from 'firebase/functions';
import { auth } from './config';
import { functions } from '../../lib/firebase';

export interface PublicDirectoryResult {
  people: Array<{ id: string; username: string; name: string; avatar: string; bio: string; isVerified: boolean }>;
  pages: Array<{ id: string; username: string; name: string; avatar: string; category: string; description: string }>;
  circles: Array<{ id: string; name: string; description: string; bannerImage: string }>;
}

export async function searchPublicDirectory(query: string): Promise<PublicDirectoryResult> {
  if (!auth.currentUser) throw new Error('Sign in to search NEXORA.');
  const callable = httpsCallable<{ query: string }, PublicDirectoryResult>(functions, 'searchNexoraDirectory');
  const result = await callable({ query });
  return result.data;
}
