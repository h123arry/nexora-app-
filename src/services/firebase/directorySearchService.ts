import { httpsCallable } from 'firebase/functions';
import { auth } from './config';
import { functions } from '../../lib/firebase';
import { getSafeAvatar } from '../../data/database';

export interface PublicDirectoryResult {
  people: Array<{ id: string; username: string; name: string; avatar: string; bio: string; isVerified: boolean }>;
  pages: Array<{ id: string; username: string; name: string; avatar: string; category: string; description: string }>;
  circles: Array<{ id: string; name: string; description: string; bannerImage: string }>;
  nextCursor: string | null;
}

export async function searchPublicDirectory(query: string, cursor?: string | null): Promise<PublicDirectoryResult> {
  if (!auth.currentUser) throw new Error('Sign in to search NEXORA.');
  const callable = httpsCallable<{ query: string; cursor?: string | null }, PublicDirectoryResult>(functions, 'searchNexoraDirectory');
  const result = await callable({ query, cursor });
  const data = result.data;
  return {
    ...data,
    people: data.people.map(person => ({
      ...person,
      avatar: getSafeAvatar(person.avatar, person.name || person.username),
    })),
    pages: data.pages.map(page => ({
      ...page,
      avatar: getSafeAvatar(page.avatar, page.name || page.username),
    })),
  };
}
