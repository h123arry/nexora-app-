import { collection, limit, onSnapshot, orderBy, query, where, type Unsubscribe } from 'firebase/firestore';
import type { Chat, User } from '../../types';
import { auth, db } from './config';
import { mapInboxChatRecord } from '../messaging/chatDirectory';

const MAX_INBOX_CHATS = 100;

/** Live, participant-filtered inbox directory. Firestore rules enforce membership on every result. */
export function watchInboxChats(
  uid: string,
  creators: User[],
  onChats: (chats: Chat[]) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  if (!uid || auth.currentUser?.uid !== uid) {
    throw new Error('Sign in to access your conversations.');
  }

  const inboxQuery = query(
    collection(db, 'chats'),
    where('participants', 'array-contains', uid),
    orderBy('lastTimestamp', 'desc'),
    limit(MAX_INBOX_CHATS),
  );

  return onSnapshot(inboxQuery, snapshot => {
    const chats = snapshot.docs
      .map(item => mapInboxChatRecord(item.id, item.data(), uid, creators))
      .filter((item): item is Chat => item !== null);
    onChats(chats);
  }, error => onError?.(error));
}
