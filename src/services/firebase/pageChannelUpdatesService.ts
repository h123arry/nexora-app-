import { httpsCallable } from 'firebase/functions';
import { collection, limit, onSnapshot, orderBy, query, type Unsubscribe } from 'firebase/firestore';
import { auth, db } from './config';
import { functions } from '../../lib/firebase';

export interface PageChannelUpdate {
  id: string;
  pageId: string;
  content: string;
  createdAt?: unknown;
}

export function watchPageChannelUpdates(
  pageId: string,
  onUpdates: (items: PageChannelUpdate[]) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  if (!pageId || pageId.length > 150 || pageId.includes('/')) throw new Error('A valid Page is required.');
  return onSnapshot(query(
    collection(db, 'pages', pageId, 'channelUpdates'),
    orderBy('createdAt', 'desc'),
    limit(50),
  ), snapshot => onUpdates(snapshot.docs.map(item => ({ id: item.id, ...item.data() } as PageChannelUpdate))),
  error => onError?.(error));
}

export async function publishPageChannelUpdate(pageId: string, content: string): Promise<string> {
  if (!auth.currentUser) throw new Error('Sign in to publish a channel update.');
  const callable = httpsCallable(functions, 'publishPageChannelUpdate');
  const result = await callable({ pageId, content });
  return (result.data as { updateId: string }).updateId;
}

export async function deletePageChannelUpdate(pageId: string, updateId: string): Promise<void> {
  if (!auth.currentUser) throw new Error('Sign in to manage channel updates.');
  const callable = httpsCallable(functions, 'deletePageChannelUpdate');
  await callable({ pageId, updateId });
}
