import { httpsCallable } from 'firebase/functions';
import { functions } from '../lib/firebase';

export interface GiftFriendResult {
  transactionId: string;
  giftId: string;
  quantity: number;
  replayed: boolean;
  status: 'added_to_friend_collection';
}

export interface GiftFriendPerson {
  id: string;
  username: string;
  name: string;
  avatar: string;
  bio: string;
  isVerified: boolean;
}

export async function searchGiftFriends(query: string): Promise<GiftFriendPerson[]> {
  const call = httpsCallable<{ query: string }, { people: GiftFriendPerson[] }>(functions, 'searchNexoraDirectory');
  return (await call({ query })).data.people;
}

export async function buyGiftForFriend(giftId: string, recipientId: string, idempotencyKey: string): Promise<GiftFriendResult> {
  const call = httpsCallable<{ giftId: string; recipientId: string; idempotencyKey: string }, GiftFriendResult>(functions, 'buyNexGiftForFriend');
  return (await call({ giftId, recipientId, idempotencyKey })).data;
}
