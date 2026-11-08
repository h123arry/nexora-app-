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

export interface GiftRiskSettlementSignal {
  tier?: unknown;
  disposition?: unknown;
}

/**
 * Low-risk gifts may settle automatically after deterministic risk scoring.
 * Review/high-risk gifts require an explicit finance clearance. Escalated
 * gifts remain blocked. Missing signals are legacy records and retain the
 * existing finance-only manual settlement path.
 */
export function isGiftRiskClearedForSettlement(signal: GiftRiskSettlementSignal | null): boolean {
  if (!signal) return true;
  if (signal.disposition === 'escalated') return false;
  if (signal.tier === 'low' && signal.disposition === 'auto_cleared') return true;
  return signal.disposition === 'cleared';
}
