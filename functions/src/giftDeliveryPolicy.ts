import { createHash } from 'node:crypto';

export type GiftDeliveryContext = 'live' | 'profile';
export interface GiftDeliveryInput {
  recipientId: string;
  giftId: string;
  quantity: number;
  contextType: GiftDeliveryContext;
  contextId: string;
  idempotencyKey: string;
}
const ID = /^[A-Za-z0-9._:-]{1,160}$/;
export function validateGiftDeliveryInput(value: unknown): GiftDeliveryInput {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Gift details are invalid.');
  const data = value as Record<string, unknown>;
  if (typeof data.recipientId !== 'string' || !ID.test(data.recipientId)) throw new Error('A valid creator account is required.');
  if (typeof data.giftId !== 'string' || !/^[a-z0-9-]{1,80}$/.test(data.giftId)) throw new Error('A valid gift is required.');
  if (!Number.isSafeInteger(data.quantity) || (data.quantity as number) < 1 || (data.quantity as number) > 20) {
    throw new Error('Gift quantity must be between 1 and 20.');
  }
  if (data.contextType !== 'live' && data.contextType !== 'profile') throw new Error('Choose a supported gift destination.');
  if (typeof data.contextId !== 'string' || !ID.test(data.contextId)) throw new Error('A valid gift destination is required.');
  if (typeof data.idempotencyKey !== 'string' || !/^[A-Za-z0-9_-]{12,80}$/.test(data.idempotencyKey)) {
    throw new Error('A valid one-time gift request key is required.');
  }
  return {
    recipientId: data.recipientId,
    giftId: data.giftId,
    quantity: data.quantity as number,
    contextType: data.contextType,
    contextId: data.contextId,
    idempotencyKey: data.idempotencyKey,
  };
}
export function giftDeliveryReferences(senderId: string, key: string): { transactionId: string; requestId: string } {
  const digest = createHash('sha256').update(senderId + ':' + key).digest('hex');
  return { transactionId: 'gift_' + digest, requestId: 'gift_req_' + digest };
}


export function isLiveGiftDeliveryEnabled(session: { status?: unknown; giftsEnabled?: unknown } | null | undefined): boolean {
  return session?.status === 'live' && session.giftsEnabled === true;
}
