export type Currency = 'USD' | 'EUR' | 'GBP' | 'NGN';

export type ProductId = 'nexora_plus' | 'creator_membership';
export type BillingInterval = 'month' | 'year' | 'one_time';
export type SubscriptionStatus = 'trialing' | 'active' | 'past_due' | 'canceled' | 'expired' | 'refunded' | 'disputed';
export type TransactionStatus = 'checkout_initiated' | 'payment_pending' | 'payment_confirmed' | 'payment_failed' | 'refund_requested' | 'refund_confirmed' | 'disputed' | 'reversed';

export interface CatalogProduct {
  id: ProductId;
  name: string;
  description: string;
  amountMinor: number;
  currency: Currency;
  interval: BillingInterval;
  entitlements: string[];
  available: boolean;
  providerPriceRef?: string;
  version: number;
}

// The catalog is deliberately empty until a merchant/provider is configured.
// Keeping product definitions here prevents clients from choosing arbitrary prices.
export const CATALOG: readonly CatalogProduct[] = [
  {
    id: 'nexora_plus',
    name: 'Nexora Plus',
    description: 'Premium access plan; activation is disabled until payment infrastructure is configured.',
    amountMinor: 0,
    currency: 'USD',
    interval: 'month',
    entitlements: [],
    available: false,
    version: 1,
  },
];

export function findProduct(productId: unknown): CatalogProduct | undefined {
  return typeof productId === 'string' ? CATALOG.find(product => product.id === productId) : undefined;
}

export function validateMoney(amountMinor: unknown, currency: unknown): { ok: true } | { ok: false; reason: string } {
  if (!Number.isSafeInteger(amountMinor) || (amountMinor as number) < 0) return { ok: false, reason: 'Amount must be a non-negative integer in minor units.' };
  if (!['USD', 'EUR', 'GBP', 'NGN'].includes(String(currency))) return { ok: false, reason: 'Unsupported currency.' };
  return { ok: true };
}

export function validateCheckoutRequest(productId: unknown): CatalogProduct {
  const product = findProduct(productId);
  if (!product) throw new Error('Unknown product.');
  if (!product.available || !product.providerPriceRef || product.amountMinor <= 0) throw new Error('This product is not available for checkout.');
  return product;
}

const allowedTransitions: Record<TransactionStatus, readonly TransactionStatus[]> = {
  checkout_initiated: ['payment_pending', 'payment_failed'],
  payment_pending: ['payment_confirmed', 'payment_failed', 'disputed'],
  payment_confirmed: ['refund_requested', 'disputed', 'reversed'],
  payment_failed: [],
  refund_requested: ['refund_confirmed', 'payment_confirmed'],
  refund_confirmed: ['reversed'],
  disputed: ['payment_confirmed', 'reversed'],
  reversed: [],
};

export function canTransitionTransaction(from: TransactionStatus, to: TransactionStatus): boolean {
  return allowedTransitions[from]?.includes(to) ?? false;
}

export function canRequestRefund(status: TransactionStatus, refundedMinor: number, amountMinor: number): boolean {
  return status === 'payment_confirmed' && Number.isSafeInteger(refundedMinor) && Number.isSafeInteger(amountMinor) && refundedMinor >= 0 && amountMinor > refundedMinor;
}

export interface RevenueShare {
  grossMinor: number;
  providerFeeMinor: number;
  taxMinor: number;
  platformCommissionMinor: number;
  creatorShareMinor: number;
  ruleVersion: string;
}

export function calculateRevenueShare(input: {
  grossMinor: number;
  providerFeeMinor: number;
  taxMinor: number;
  platformCommissionBps: number;
  ruleVersion: string;
}): RevenueShare {
  const values = [input.grossMinor, input.providerFeeMinor, input.taxMinor, input.platformCommissionBps];
  if (!values.every(Number.isSafeInteger) || input.grossMinor < 0 || input.providerFeeMinor < 0 || input.taxMinor < 0 || input.platformCommissionBps < 0 || input.platformCommissionBps > 10000) {
    throw new Error('Revenue inputs are invalid.');
  }
  const commissionBase = Math.max(0, input.grossMinor - input.providerFeeMinor - input.taxMinor);
  const platformCommissionMinor = Math.floor((commissionBase * input.platformCommissionBps) / 10000);
  return {
    grossMinor: input.grossMinor,
    providerFeeMinor: input.providerFeeMinor,
    taxMinor: input.taxMinor,
    platformCommissionMinor,
    creatorShareMinor: Math.max(0, commissionBase - platformCommissionMinor),
    ruleVersion: input.ruleVersion,
  };
}

export function assertCurrencyMatch(expected: Currency, actual: unknown): asserts actual is Currency {
  if (actual !== expected) throw new Error('Currency mismatch.');
}
