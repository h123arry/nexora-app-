export const GIFT_REVENUE_POLICY_VERSION = 'gift-revenue-v1';
export const CREATOR_REVENUE_SHARE_BPS = 7000;
export const PLATFORM_REVENUE_SHARE_BPS = 3000;
export const REVENUE_SHARE_DENOMINATOR = 10000;

export interface GiftRevenueSplit {
  grossNex: number;
  creatorShareNex: number;
  platformShareNex: number;
  policyVersion: typeof GIFT_REVENUE_POLICY_VERSION;
}

export function calculateGiftRevenueSplit(grossNex: unknown): GiftRevenueSplit {
  if (!Number.isSafeInteger(grossNex) || (grossNex as number) <= 0) {
    throw new Error('Gift gross must be a positive safe integer.');
  }
  const gross = grossNex as number;
  const creatorShareNex = Number((BigInt(gross) * BigInt(CREATOR_REVENUE_SHARE_BPS) + BigInt(REVENUE_SHARE_DENOMINATOR / 2)) / BigInt(REVENUE_SHARE_DENOMINATOR));
  const platformShareNex = gross - creatorShareNex;
  if (!Number.isSafeInteger(creatorShareNex) || creatorShareNex <= 0
    || !Number.isSafeInteger(platformShareNex) || platformShareNex < 0
    || creatorShareNex + platformShareNex !== gross) {
    throw new Error('Gift revenue split is outside the supported safe range.');
  }
  return { grossNex: gross, creatorShareNex, platformShareNex, policyVersion: GIFT_REVENUE_POLICY_VERSION };
}
