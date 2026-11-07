import { httpsCallable } from 'firebase/functions';
import { functions } from '../lib/firebase';

export interface NexWalletTransaction {
  id: string;
  direction: 'credit' | 'debit';
  units: number;
  currency: 'NEX';
  type: string;
  description: string;
  status: 'posted';
  createdAt: string | null;
}

export interface NexWalletSnapshot {
  currency: 'NEX';
  availableBalance: number;
  lifetimeCredited: number;
  lifetimeDebited: number;
  transactions: NexWalletTransaction[];
}

export async function getNexWalletSnapshot(): Promise<NexWalletSnapshot> {
  const callable = httpsCallable<void, NexWalletSnapshot>(functions, 'getNexWalletSnapshot');
  return (await callable()).data;
}
