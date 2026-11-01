export type NexLedgerDirection = 'debit' | 'credit';

export interface NexLedgerEntryInput {
  accountId: string;
  direction: NexLedgerDirection;
  units: number;
  currency: 'NEX';
  transactionId: string;
  idempotencyKey: string;
}

export interface NexLedgerEntry extends NexLedgerEntryInput {
  entryId: string;
}

function validIdentifier(value: unknown): value is string {
  return typeof value === 'string'
    && value.length > 0
    && value.length <= 160
    && /^[A-Za-z0-9._:-]+$/.test(value);
}

export function validateNexUnits(units: unknown): asserts units is number {
  if (!Number.isSafeInteger(units) || (units as number) <= 0) {
    throw new Error('NEX units must be a positive safe integer.');
  }
}

/**
 * Build a balanced internal transfer. This is accounting policy only: callers
 * must still persist both entries atomically in a trusted server transaction.
 */
export function buildNexTransferEntries(input: {
  fromAccountId: string;
  toAccountId: string;
  units: number;
  transactionId: string;
  idempotencyKey: string;
}): [NexLedgerEntry, NexLedgerEntry] {
  validateNexUnits(input.units);
  if (!validIdentifier(input.fromAccountId) || !validIdentifier(input.toAccountId)
    || input.fromAccountId === input.toAccountId) {
    throw new Error('Transfer accounts are invalid or identical.');
  }
  if (!validIdentifier(input.transactionId) || !validIdentifier(input.idempotencyKey)) {
    throw new Error('Transaction and idempotency references are required.');
  }

  return [
    {
      entryId: `${input.transactionId}:debit`,
      accountId: input.fromAccountId,
      direction: 'debit',
      units: input.units,
      currency: 'NEX',
      transactionId: input.transactionId,
      idempotencyKey: input.idempotencyKey,
    },
    {
      entryId: `${input.transactionId}:credit`,
      accountId: input.toAccountId,
      direction: 'credit',
      units: input.units,
      currency: 'NEX',
      transactionId: input.transactionId,
      idempotencyKey: input.idempotencyKey,
    },
  ];
}

export function assertBalancedNexEntries(entries: readonly NexLedgerEntryInput[]): void {
  if (entries.length < 2) throw new Error('A ledger transaction requires at least two entries.');
  let debits = 0n;
  let credits = 0n;
  const transactionId = entries[0].transactionId;
  const idempotencyKey = entries[0].idempotencyKey;

  for (const entry of entries) {
    validateNexUnits(entry.units);
    if (entry.currency !== 'NEX' || !validIdentifier(entry.accountId)
      || !validIdentifier(entry.transactionId) || entry.transactionId !== transactionId
      || !validIdentifier(entry.idempotencyKey) || entry.idempotencyKey !== idempotencyKey) {
      throw new Error('Ledger entries must share one valid NEX transaction and idempotency key.');
    }
    if (entry.direction === 'debit') debits += BigInt(entry.units);
    else if (entry.direction === 'credit') credits += BigInt(entry.units);
    else throw new Error('Ledger direction is invalid.');
  }
  if (debits !== credits) throw new Error('NEX ledger transaction is not balanced.');
}

export function applyNexBalanceEntries(openingBalance: number, entries: readonly NexLedgerEntryInput[], accountId: string): number {
  if (!Number.isSafeInteger(openingBalance) || openingBalance < 0) {
    throw new Error('Opening NEX balance is invalid.');
  }
  if (!validIdentifier(accountId)) throw new Error('NEX account ID is invalid.');
  assertBalancedNexEntries(entries);
  const delta = entries.reduce((total, entry) => {
    if (entry.accountId !== accountId) return total;
    return total + (entry.direction === 'credit' ? BigInt(entry.units) : -BigInt(entry.units));
  }, 0n);
  const next = BigInt(openingBalance) + delta;
  if (next < 0n) throw new Error('Insufficient NEX balance.');
  if (next > BigInt(Number.MAX_SAFE_INTEGER)) throw new Error('NEX balance exceeds the safe integer range.');
  return Number(next);
}
