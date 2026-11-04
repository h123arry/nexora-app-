import { collection, doc, onSnapshot, runTransaction, serverTimestamp, type Unsubscribe } from 'firebase/firestore';
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
  await runTransaction(db, async transaction => {
    const current = await transaction.get(ref);
    transaction.set(ref, {
      chatId,
      pinned: typeof patch.pinned === 'boolean' ? patch.pinned : current.data()?.pinned === true,
      archived: typeof patch.archived === 'boolean' ? patch.archived : current.data()?.archived === true,
      updatedAt: serverTimestamp(),
    });
  });
}
