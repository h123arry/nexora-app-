export const NEX_REFERENCE_USD_CENTS_PER_UNIT = 2;
export interface NexWalletBundle { id: string; units: number; priceUsdCents: number; }
export const NEX_WALLET_BUNDLES: readonly NexWalletBundle[] = [
  { id: 'nex-15', units: 15, priceUsdCents: 30 },
  { id: 'nex-30', units: 30, priceUsdCents: 60 },
  { id: 'nex-50', units: 50, priceUsdCents: 100 },
  { id: 'nex-100', units: 100, priceUsdCents: 200 },
] as const;
export function getNexCurrencyInfo() {
  return { currency: 'NEX' as const, referenceUsdCentsPerUnit: NEX_REFERENCE_USD_CENTS_PER_UNIT, bundles: NEX_WALLET_BUNDLES, checkoutEnabled: false };
}
