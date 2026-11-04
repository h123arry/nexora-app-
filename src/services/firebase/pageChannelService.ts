import { httpsCallable } from 'firebase/functions';
import { functions } from '../../lib/firebase';

type PageFollowerCountResponse = { pageId: string; followerCount: number };

export async function getPageFollowerCount(pageId: string): Promise<number> {
  if (!pageId || pageId.length > 150 || pageId.includes('/')) throw new Error('A valid Page is required.');
  const callable = httpsCallable<{ pageId: string }, PageFollowerCountResponse>(functions, 'getPageFollowerCount');
  const response = await callable({ pageId });
  const count = response.data?.followerCount;
  if (!Number.isSafeInteger(count) || count < 0) throw new Error('Page audience metrics are unavailable.');
  return count;
}
