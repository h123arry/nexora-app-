import { collection, doc, onSnapshot, serverTimestamp, setDoc, type Unsubscribe } from 'firebase/firestore';
import { auth, db } from './config';

export interface InboxChatPreference {
  chatId: string;
  pinned: boolean;
  archived: boolean;
}

function requireOwner(uid: string): void {
  if (!uid || auth.currentUser?.uid !== uid) throw new Error('Sign in to update inbox preferences.');
}

function validChatId(chatId: string): void {
  if (!chatId || chatId.length > 150 || chatId.includes('/')) throw new Error('A valid conversation is required.');
}

/** Real-time account-owned preferences. These follow the user across signed-in devices. */
export function watchInboxPreferences(
  uid: string,
  onPreferences: (preferences: InboxChatPreference[]) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  requireOwner(uid);
  return onSnapshot(collection(db, 'users', uid, 'inboxPreferences'), snapshot => {
    onPreferences(snapshot.docs.map(item => ({
      chatId: item.id,
      pinned: item.data().pinned === true,
      archived: item.data().archived === true,
    })).filter(item => item.pinned || item.archived));
  }, error => onError?.(error));
}

export async function setInboxChatPreference(
  uid: string,
  chatId: string,
  patch: Partial<Pick<InboxChatPreference, 'pinned' | 'archived'>>,
): Promise<void> {
  requireOwner(uid);
  validChatId(chatId);
  if (typeof patch.pinned !== 'boolean' && typeof patch.archived !== 'boolean') {
    throw new Error('Choose an inbox preference to update.');
  }
  const ref = doc(db, 'users', uid, 'inboxPreferences', chatId);
  const update: Record<string, unknown> = { chatId, updatedAt: serverTimestamp() };
  if (typeof patch.pinned === 'boolean') update.pinned = patch.pinned;
  if (typeof patch.archived === 'boolean') update.archived = patch.archived;
  await setDoc(ref, update, { merge: true });
}
