export type GiftRiskTier = 'low' | 'review' | 'high';
export interface GiftRiskInput {
  senderGiftCount10m: number;
  senderGrossNex10m: number;
  giftGrossNex: number;
  senderAccountAgeDays: number | null;
  senderRestricted: boolean;
  recipientRestricted: boolean;
}
export interface GiftRiskAssessment {
  score: number;
  tier: GiftRiskTier;
  reasons: string[];
}
export function assessGiftRisk(input: GiftRiskInput): GiftRiskAssessment {
  const values = [input.senderGiftCount10m, input.senderGrossNex10m, input.giftGrossNex];
  if (values.some(value => !Number.isSafeInteger(value) || value < 0)
    || (input.senderAccountAgeDays !== null && (!Number.isFinite(input.senderAccountAgeDays) || input.senderAccountAgeDays < 0))) {
    throw new Error('Gift risk inputs are invalid.');
  }
  let score = 0;
  const reasons: string[] = [];
  if (input.senderGiftCount10m >= 3) { score += 20; reasons.push('sender_velocity_elevated'); }
  if (input.senderGiftCount10m >= 6) { score += 20; reasons.push('sender_velocity_high'); }
  if (input.senderGrossNex10m >= 10000) { score += 15; reasons.push('sender_spend_elevated'); }
  if (input.giftGrossNex >= 25000) { score += 15; reasons.push('high_value_gift'); }
  if (input.senderAccountAgeDays !== null && input.senderAccountAgeDays < 7) { score += 15; reasons.push('new_sender_account'); }
  if (input.senderRestricted) { score += 60; reasons.push('sender_restricted'); }
  if (input.recipientRestricted) { score += 60; reasons.push('recipient_restricted'); }
  score = Math.min(100, score);
  return { score, tier: score >= 60 ? 'high' : score >= 30 ? 'review' : 'low', reasons };
}

export const SUPPORTED_DISPLAY_CURRENCIES = ['NGN','USD','GBP','EUR','GHS','KES','ZAR','CAD','AUD'] as const;
export type SupportedDisplayCurrency = typeof SUPPORTED_DISPLAY_CURRENCIES[number];
export function isSupportedDisplayCurrency(value: unknown): value is SupportedDisplayCurrency {
  return typeof value === 'string' && (SUPPORTED_DISPLAY_CURRENCIES as readonly string[]).includes(value);
}
export function validatePayoutRequest(value: unknown): { amountNex: number; currency: 'NGN' } {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Payout request is invalid.');
  const data = value as Record<string, unknown>;
  if (!Number.isSafeInteger(data.amountNex) || (data.amountNex as number) < 1000 || (data.amountNex as number) > 10000000) {
    throw new Error('Payout amount must be between 1,000 and 10,000,000 NEX.');
  }
  if (data.currency !== 'NGN') throw new Error('Only the configured Nigerian payout corridor can be requested.');
  return { amountNex: data.amountNex as number, currency: 'NGN' };
}
