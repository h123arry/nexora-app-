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
  earningsWindow: 'latest_100';
  hasMoreEarnings: boolean;
  pendingReviewGrossNex: number;
  recentAvailableCreatorShareNex: number;
  recentGrossNex: number;
  recentCreatorShareNex: number;
  recentPlatformShareNex: number;
  walletAvailableNex: number;
  earnings: CreatorGiftEarning[];
}
export async function getCreatorEarningsSnapshot(): Promise<CreatorEarningsSnapshot> {
  const call = httpsCallable<void, CreatorEarningsSnapshot>(functions, 'getCreatorEarningsSnapshot');
  return (await call()).data;
}

export interface PendingGiftEarningForFinance {
  transactionId: string;
  creatorId: string;
  senderId: string;
  giftName: string;
  quantity: number;
  grossNex: number;
  createdAt: string | null;
}
export async function getPendingGiftEarningsForFinance(): Promise<{ records: PendingGiftEarningForFinance[]; hasMore: boolean }> {
  const call = httpsCallable<void, { records: PendingGiftEarningForFinance[]; hasMore: boolean }>(functions, 'getPendingGiftEarningsForFinance');
  return (await call()).data;
}
export async function settleGiftCreatorEarning(transactionId: string): Promise<{ settlementId: string; replayed: boolean; status: 'available'; creatorShareNex?: number; platformShareNex?: number; currency?: 'NEX' }> {
  const call = httpsCallable<{ transactionId: string }, { settlementId: string; replayed: boolean; status: 'available'; creatorShareNex?: number; platformShareNex?: number; currency?: 'NEX' }>(functions, 'settleGiftCreatorEarning');
  return (await call({ transactionId })).data;
}
