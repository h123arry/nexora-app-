import test from 'node:test';
import assert from 'node:assert/strict';
import {
  applyNexBalanceEntries,
  assertBalancedNexEntries,
  buildNexTransferEntries,
  validateNexUnits,
} from '../functions/src/nexLedgerPolicy.ts';

test('NEX transfers produce equal debit and credit entries with stable idempotency references', () => {
  const entries = buildNexTransferEntries({
    fromAccountId: 'alice',
    toAccountId: 'bob',
    units: 250,
    transactionId: 'tx_001',
    idempotencyKey: 'request_001',
  });
  assert.equal(entries[0].direction, 'debit');
  assert.equal(entries[1].direction, 'credit');
  assert.equal(entries[0].units, entries[1].units);
  assert.equal(entries[0].idempotencyKey, entries[1].idempotencyKey);
  assert.doesNotThrow(() => assertBalancedNexEntries(entries));
});

test('NEX transfers reject zero, fractional, unsafe, identical or malformed inputs', () => {
  for (const value of [0, -1, 1.5, Number.MAX_SAFE_INTEGER + 1, NaN]) {
    assert.throws(() => validateNexUnits(value), /positive safe integer/);
  }
  assert.throws(() => buildNexTransferEntries({
    fromAccountId: 'alice', toAccountId: 'alice', units: 10,
    transactionId: 'tx_1', idempotencyKey: 'req_1',
  }), /invalid or identical/);
  assert.throws(() => buildNexTransferEntries({
    fromAccountId: 'alice/other', toAccountId: 'bob', units: 10,
    transactionId: 'tx_1', idempotencyKey: 'req_1',
  }), /invalid or identical/);
});

test('ledger rejects unbalanced, mixed-transaction and non-NEX entries', () => {
  const [debit, credit] = buildNexTransferEntries({
    fromAccountId: 'alice', toAccountId: 'bob', units: 20,
    transactionId: 'tx_2', idempotencyKey: 'req_2',
  });
  assert.throws(() => assertBalancedNexEntries([{ ...debit, units: 19 }, credit]), /not balanced/);
  assert.throws(() => assertBalancedNexEntries([debit, { ...credit, transactionId: 'tx_other' }]), /share one valid/);
  assert.throws(() => assertBalancedNexEntries([debit, { ...credit, currency: 'USD' as 'NEX' }]), /share one valid/);
});

test('balance projection prevents overdrafts and unsafe integer overflow', () => {
  const entries = buildNexTransferEntries({
    fromAccountId: 'alice', toAccountId: 'bob', units: 30,
    transactionId: 'tx_3', idempotencyKey: 'req_3',
  });
  assert.equal(applyNexBalanceEntries(100, entries, 'alice'), 70);
  assert.equal(applyNexBalanceEntries(100, entries, 'bob'), 130);
  assert.throws(() => applyNexBalanceEntries(20, entries, 'alice'), /Insufficient/);
  assert.throws(() => applyNexBalanceEntries(Number.MAX_SAFE_INTEGER, entries, 'bob'), /safe integer/);
});
