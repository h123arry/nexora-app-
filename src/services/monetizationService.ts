import { httpsCallable } from 'firebase/functions';
import { functions } from '../lib/firebase';

export interface MonetizationCatalog {
  providerConfigured: boolean;
  checkoutEnabled: boolean;
  currencyPolicy: 'minor_units';
  products: Array<{
    id: string;
    name: string;
    description: string;
    amountMinor: number;
    currency: string;
    interval: string;
    entitlements: string[];
    version: number;
  }>;
}

export interface BillingSummary {
  providerConfigured: boolean;
  transactions: Array<{ id: string; productId?: string; amountMinor?: number; currency?: string; status?: string; createdAt?: string | null; safeReference?: string }>;
  subscriptions: Array<{ id: string; productId?: string; status?: string; interval?: string; currentPeriodEnd?: string | null; cancelAtPeriodEnd?: boolean }>;
  entitlements: Array<{ id: string; key?: string; status?: string; expiresAt?: string | null }>;
}

export async function getMonetizationCatalog(): Promise<MonetizationCatalog> {
  const callable = httpsCallable<void, MonetizationCatalog>(functions, 'getMonetizationCatalog');
  return (await callable()).data;
}

export async function createCheckoutSession(productId: string): Promise<{ checkoutUrl?: string; status: string }> {
  const callable = httpsCallable<{ productId: string }, { checkoutUrl?: string; status: string }>(functions, 'createCheckoutSession');
  return (await callable({ productId })).data;
}

export async function getBillingSummary(): Promise<BillingSummary> {
  const callable = httpsCallable<void, BillingSummary>(functions, 'getBillingSummary');
  return (await callable()).data;
}
