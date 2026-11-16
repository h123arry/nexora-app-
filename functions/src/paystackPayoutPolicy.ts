import { createHmac, timingSafeEqual } from 'node:crypto';

export interface LivePayoutApprovals {
  liveSettlementApproved?: unknown;
  providerBusinessVerified?: unknown;
  settlementFundingVerified?: unknown;
  complianceApproved?: unknown;
  webhookVerified?: unknown;
  liveTestTransferVerified?: unknown;
}
export function livePayoutGatesPassed(policy: LivePayoutApprovals): boolean {
  return policy.liveSettlementApproved === true
    && policy.providerBusinessVerified === true
    && policy.settlementFundingVerified === true
    && policy.complianceApproved === true
    && policy.webhookVerified === true
    && policy.liveTestTransferVerified === true;
}
export function calculateNgnPayoutKobo(amountNex: unknown, koboPerNex: unknown): number {
  if (!Number.isSafeInteger(amountNex) || (amountNex as number) <= 0
    || !Number.isSafeInteger(koboPerNex) || (koboPerNex as number) <= 0) {
    throw new Error('NEX amount and approved kobo-per-NEX rate must be positive safe integers.');
  }
  const amount = (amountNex as number) * (koboPerNex as number);
  if (!Number.isSafeInteger(amount) || amount <= 0) throw new Error('NGN payout amount exceeds the safe integer range.');
  return amount;
}
export function verifyPaystackWebhookSignature(
  rawBody: Buffer,
  headers: Record<string, string | string[] | undefined>,
  webhookSecret: string,
  secretKey: string,
  nowMs = Date.now(),
): boolean {
  const modern = headers['paystack-signature'];
  const legacy = headers['x-paystack-signature'];
  if (typeof modern === 'string' && webhookSecret) {
    const parts = modern.split(',').map(part => part.trim());
    const timestamp = Number(parts.find(part => part.startsWith('t='))?.slice(2));
    if (!Number.isSafeInteger(timestamp) || Math.abs(nowMs / 1000 - timestamp) > 300) return false;
    const expected = createHmac('sha512', webhookSecret).update(String(timestamp) + '.').update(rawBody).digest('hex');
    return parts.filter(part => part.startsWith('v1=')).some(part => {
      const signature = part.slice(3).split(':').at(-1) || '';
      return /^[a-f0-9]{128}$/.test(signature)
        && timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(signature, 'hex'));
    });
  }
  if (typeof legacy === 'string' && secretKey) {
    const expected = createHmac('sha512', secretKey).update(rawBody).digest('hex');
    return /^[a-f0-9]{128}$/i.test(legacy)
      && timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(legacy, 'hex'));
  }
  return false;
}


export interface BankLookupQuotaDecision {
  allowed: boolean;
  windowStartedAt: number;
  attempts: number;
  retryAfterMs: number;
}

export function advanceBankLookupQuota(
  state: { windowStartedAt?: unknown; attempts?: unknown } | null | undefined,
  nowMs: number,
  maxAttempts = 10,
  windowMs = 15 * 60 * 1000,
): BankLookupQuotaDecision {
  const denied = (retryAfterMs: number): BankLookupQuotaDecision => ({
    allowed: false,
    windowStartedAt: Number.isSafeInteger(state?.windowStartedAt) ? state!.windowStartedAt as number : nowMs,
    attempts: Number.isSafeInteger(state?.attempts) ? state!.attempts as number : maxAttempts,
    retryAfterMs,
  });
  if (!Number.isSafeInteger(nowMs) || nowMs < 0 || !Number.isSafeInteger(maxAttempts)
    || maxAttempts < 1 || !Number.isSafeInteger(windowMs) || windowMs < 1) {
    return denied(windowMs > 0 ? windowMs : 15 * 60 * 1000);
  }
  if (!state || (state.windowStartedAt === undefined && state.attempts === undefined)) {
    return { allowed: true, windowStartedAt: nowMs, attempts: 1, retryAfterMs: 0 };
  }
  const startedAt = state.windowStartedAt;
  const attempts = state.attempts;
  if (!Number.isSafeInteger(startedAt) || !Number.isSafeInteger(attempts)
    || (startedAt as number) < 0 || (attempts as number) < 1
    || (attempts as number) > maxAttempts || (startedAt as number) > nowMs) {
    return denied(windowMs);
  }
  const elapsed = nowMs - (startedAt as number);
  if (elapsed >= windowMs) {
    return { allowed: true, windowStartedAt: nowMs, attempts: 1, retryAfterMs: 0 };
  }
  if ((attempts as number) >= maxAttempts) {
    return { allowed: false, windowStartedAt: startedAt as number, attempts: attempts as number,
      retryAfterMs: windowMs - elapsed };
  }
  return { allowed: true, windowStartedAt: startedAt as number, attempts: (attempts as number) + 1, retryAfterMs: 0 };
}


/** Fixed-window quota for sensitive provider operations such as payout OTP finalization. */
export function advancePayoutOtpQuota(
  state: { windowStartedAt?: unknown; attempts?: unknown } | null | undefined,
  nowMs: number,
  maxAttempts = 5,
  windowMs = 15 * 60 * 1000,
): BankLookupQuotaDecision {
  return advanceBankLookupQuota(state, nowMs, maxAttempts, windowMs);
}
