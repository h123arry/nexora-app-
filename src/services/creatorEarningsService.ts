import { httpsCallable } from 'firebase/functions';
import { functions } from '../lib/firebase';

export interface CreatorGiftEarning {
  id: string;
  giftId: string;
  giftName: string;
  quantity: number;
  grossNex: number;
  creatorShareNex: number | null;
  platformShareNex: number | null;
  status: 'pending_review' | 'available' | 'reversed' | 'refunded' | string;
  createdAt: string | null;
  settledAt: string | null;
}
export interface CreatorEarningsSnapshot {
  currency: 'NEX';
  policyVersion: string;
  creatorShareBps: number;
  platformShareBps: number;
  pendingReviewNex: number;
  availableNex: number;
  lifetimeGrossNex: number;
  lifetimeCreatorShareNex: number;
  lifetimePlatformShareNex: number;
  earnings: CreatorGiftEarning[];
}
export async function getCreatorEarningsSnapshot(): Promise<CreatorEarningsSnapshot> {
  const call = httpsCallable<void, CreatorEarningsSnapshot>(functions, 'getCreatorEarningsSnapshot');
  return (await call()).data;
}
