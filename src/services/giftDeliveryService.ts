import { httpsCallable } from 'firebase/functions';
import { collection, limit, onSnapshot, query, where, type Unsubscribe } from 'firebase/firestore';
import { db, functions } from '../lib/firebase';

export type GiftAnimationClass = 'sparkle' | 'reveal' | 'cinematic' | 'legendary';
export interface LiveGiftEvent {
  transactionId: string;
  targetId: string;
  senderId: string;
  senderName: string;
  creatorName: string;
  giftId: string;
  giftName: string;
  giftImage: string;
  animation: GiftAnimationClass;
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
  quantity: number;
  totalNex: number;
  createdAt?: { toMillis?: () => number } | null;
}
export interface SendGiftInput {
  recipientId: string;
  giftId: string;
  quantity?: number;
  contextType: 'live' | 'profile';
  contextId: string;
  idempotencyKey: string;
}
export interface SendGiftResult { giftId: string; replayed: boolean; status: 'delivered'; units?: number; currency?: 'NEX'; }
export async function sendNexGift(input: SendGiftInput): Promise<SendGiftResult> {
  const call = httpsCallable<SendGiftInput, SendGiftResult>(functions, 'sendNexGift');
  return (await call({ ...input, quantity: input.quantity ?? 1 })).data;
}
export function subscribeToLiveGiftEvents(
  streamId: string,
  onEvents: (events: LiveGiftEvent[]) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  const eventsQuery = query(
    collection(db, 'giftDeliveryEvents'),
    where('targetType', '==', 'live'),
    where('targetId', '==', streamId),
    limit(40),
  );
  return onSnapshot(eventsQuery, snapshot => {
    onEvents(snapshot.docs.map(item => ({ transactionId: item.id, ...item.data() } as LiveGiftEvent)));
  }, error => onError?.(error));
}
