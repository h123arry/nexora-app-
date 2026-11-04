import { httpsCallable } from 'firebase/functions';
import { auth } from './config';
import { functions } from '../../lib/firebase';

export async function createGroupChat(name: string, description: string, participantIds: string[]): Promise<{ chatId: string; participantCount: number }> {
  if (!auth.currentUser) throw new Error('Sign in to create a group conversation.');
  const callable = httpsCallable(functions, 'createGroupChat');
  return (await callable({ name, description, participantIds })).data as { chatId: string; participantCount: number };
}
