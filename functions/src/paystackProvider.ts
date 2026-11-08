import { createHmac, timingSafeEqual } from 'node:crypto';

export interface PaystackBank {
  name: string;
  code: string;
  active?: boolean;
}
export interface PaystackResolvedAccount {
  account_name: string;
  account_number: string;
}
export interface PaystackRecipient {
  recipient_code: string;
  active: boolean;
  type: string;
  currency: string;
  details?: { account_number?: string; bank_code?: string; bank_name?: string; account_name?: string | null };
}

interface PaystackEnvelope<T> { status: boolean; message?: string; data?: T }

export function validateNgnBankAccountInput(value: unknown): { accountNumber: string; bankCode: string } {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Bank account details are invalid.');
  const data = value as Record<string, unknown>;
  if (typeof data.accountNumber !== 'string' || !/^\d{10}$/.test(data.accountNumber)) {
    throw new Error('Enter a valid 10-digit Nigerian account number.');
  }
  if (typeof data.bankCode !== 'string' || !/^\d{3,10}$/.test(data.bankCode)) {
    throw new Error('Choose a valid Nigerian bank.');
  }
  return { accountNumber: data.accountNumber, bankCode: data.bankCode };
}

async function paystackRequest<T>(
  secretKey: string,
  path: string,
  method: 'GET' | 'POST',
  body?: Record<string, unknown>,
): Promise<T> {
  if (!secretKey.trim()) throw new Error('Paystack server credentials are not configured.');
  const response = await fetch(`https://api.paystack.co${path}`, {
    method,
    headers: { Authorization: `Bearer ${secretKey}`, 'Content-Type': 'application/json', Accept: 'application/json' },
    ...(body ? { body: JSON.stringify(body) } : {}),
    signal: AbortSignal.timeout(12_000),
  });
  const payload = await response.json().catch(() => null) as PaystackEnvelope<T> | null;
  if (!response.ok || !payload?.status || payload.data === undefined) {
    // Never pass provider response bodies or credentials into logs/client errors.
    throw new Error('Paystack could not complete the requested bank operation.');
  }
  return payload.data;
}

export async function listNgnBanks(secretKey: string): Promise<PaystackBank[]> {
  const result = await paystackRequest<PaystackBank[]>(secretKey, '/bank?currency=NGN&country=nigeria&perPage=200', 'GET');
  return result.filter(bank => bank && typeof bank.name === 'string' && typeof bank.code === 'string' && bank.active !== false)
    .map(bank => ({ name: bank.name.slice(0, 100), code: bank.code }));
}

export async function resolveNgnBankAccount(
  secretKey: string,
  accountNumber: string,
  bankCode: string,
): Promise<PaystackResolvedAccount> {
  const query = new URLSearchParams({ account_number: accountNumber, bank_code: bankCode });
  const result = await paystackRequest<PaystackResolvedAccount>(secretKey, `/bank/resolve?${query.toString()}`, 'GET');
  if (typeof result.account_name !== 'string' || !result.account_name.trim()
    || typeof result.account_number !== 'string' || result.account_number !== accountNumber) {
    throw new Error('The bank could not verify this account. Check the details and try again.');
  }
  return { account_name: result.account_name.trim().slice(0, 120), account_number: result.account_number };
}

export async function createNgnTransferRecipient(
  secretKey: string,
  accountName: string,
  accountNumber: string,
  bankCode: string,
): Promise<PaystackRecipient> {
  const result = await paystackRequest<PaystackRecipient>(secretKey, '/transferrecipient', 'POST', {
    type: 'nuban', name: accountName, account_number: accountNumber, bank_code: bankCode, currency: 'NGN',
  });
  if (typeof result.recipient_code !== 'string' || !/^RCP_[A-Za-z0-9]+$/.test(result.recipient_code)
    || result.active !== true || result.currency !== 'NGN') {
    throw new Error('Paystack did not return an active NGN beneficiary.');
  }
  return result;
}

/** Supports Paystack's timestamped whsec signature and the legacy secret-key signature. */
export function verifyPaystackWebhookSignature(
  rawBody: Buffer,
  timestampedHeader: string | undefined,
  legacyHeader: string | undefined,
  webhookSecret: string,
  secretKey: string,
  nowSeconds = Math.floor(Date.now() / 1000),
): boolean {
  if (!Buffer.isBuffer(rawBody)) return false;
  if (timestampedHeader && webhookSecret) {
    let timestamp: number | null = null;
    const signatures: string[] = [];
    for (const part of timestampedHeader.split(',')) {
      const separator = part.indexOf('=');
      if (separator < 0) continue;
      const key = part.slice(0, separator).trim();
      const value = part.slice(separator + 1).trim();
      if (key === 't') {
        if (timestamp !== null || !/^\d+$/.test(value)) return false;
        timestamp = Number(value);
      } else if (key === 'v1') {
        const colon = value.indexOf(':');
        if (colon > 0) signatures.push(value.slice(colon + 1));
      }
    }
    if (timestamp === null || Math.abs(nowSeconds - timestamp) > 300) return false;
    const expected = createHmac('sha512', webhookSecret).update(String(timestamp) + '.').update(rawBody).digest();
    for (const signature of signatures) {
      if (!/^[0-9a-f]{128}$/.test(signature)) continue;
      if (timingSafeEqual(expected, Buffer.from(signature, 'hex'))) return true;
    }
  }
  if (legacyHeader && secretKey && /^[0-9a-f]{128}$/.test(legacyHeader)) {
    const expected = createHmac('sha512', secretKey).update(rawBody).digest();
    return timingSafeEqual(expected, Buffer.from(legacyHeader, 'hex'));
  }
  return false;
}
