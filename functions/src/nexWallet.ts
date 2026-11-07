import { FieldValue, getFirestore, type Firestore } from 'firebase-admin/firestore';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { getFirebaseAdminApp, resolveFirestoreDatabaseId } from './runtimeConfig.js';
import {
  applyNexBalanceEntries,
  buildNexTransferEntries,
  validateNexUnits,
} from './nexLedgerPolicy.js';

const app = getFirebaseAdminApp();
const db = getFirestore(app, resolveFirestoreDatabaseId());

type LedgerTransferInput = {
  fromAccountId: string;
  toAccountId: string;
  units: number;
  transactionId: string;
  idempotencyKey: string;
  type: 'system_credit' | 'system_debit' | 'internal_transfer';
  description: string;
  actorId: string;
};

/**
 * Trusted-server-only posting primitive. Every movement is a balanced pair of
 * immutable entries and both wallet projections are updated in one Firestore
 * transaction. No callable exposes arbitrary credits or debits to clients.
 */
export async function postNexLedgerTransfer(
  firestore: Firestore,
  input: LedgerTransferInput,
): Promise<{ transactionId: string; replayed: boolean }> {
  const description = input.description.trim();
  if (!description || description.length > 240) throw new Error('A valid ledger description is required.');
  if (!['system_credit', 'system_debit', 'internal_transfer'].includes(input.type)) {
    throw new Error('Ledger transaction type is invalid.');
  }
  if (!input.actorId || input.actorId.length > 160 || input.actorId.includes('/')) {
    throw new Error('Ledger actor is invalid.');
  }

  const entries = buildNexTransferEntries(input);
  const fromRef = firestore.collection('nexWallets').doc(input.fromAccountId);
  const toRef = firestore.collection('nexWallets').doc(input.toAccountId);
  const requestRef = firestore.collection('nexLedgerRequests').doc(input.idempotencyKey);
  const transactionRef = firestore.collection('nexLedgerTransactions').doc(input.transactionId);
  const fromEntryRef = fromRef.collection('transactions').doc(input.transactionId);
  const toEntryRef = toRef.collection('transactions').doc(input.transactionId);
  const debitRef = firestore.collection('nexLedgerEntries').doc(entries[0].entryId);
  const creditRef = firestore.collection('nexLedgerEntries').doc(entries[1].entryId);

  return firestore.runTransaction(async (transaction) => {
    const requestSnapshot = await transaction.get(requestRef);
    if (requestSnapshot.exists) {
      const prior = requestSnapshot.data() || {};
      if (prior.transactionId !== input.transactionId) {
        throw new Error('Idempotency key was already used for another transaction.');
      }
      return { transactionId: input.transactionId, replayed: true };
    }

    const [fromSnapshot, toSnapshot] = await Promise.all([
      transaction.get(fromRef),
      transaction.get(toRef),
    ]);
    const fromData = fromSnapshot.data() || {};
    const toData = toSnapshot.data() || {};
    const fromBalance = fromSnapshot.exists ? fromData.availableBalance : 0;
    const toBalance = toSnapshot.exists ? toData.availableBalance : 0;
    const nextFromBalance = applyNexBalanceEntries(fromBalance, entries, input.fromAccountId);
    const nextToBalance = applyNexBalanceEntries(toBalance, entries, input.toAccountId);
    const now = FieldValue.serverTimestamp();

    transaction.set(fromRef, {
      currency: 'NEX',
      availableBalance: nextFromBalance,
      lifetimeCredited: (fromData.lifetimeCredited || 0) + 0,
      lifetimeDebited: (fromData.lifetimeDebited || 0) + input.units,
      schemaVersion: 1,
      createdAt: fromData.createdAt || now,
      updatedAt: now,
    }, { merge: true });
    transaction.set(toRef, {
      currency: 'NEX',
      availableBalance: nextToBalance,
      lifetimeCredited: (toData.lifetimeCredited || 0) + input.units,
      lifetimeDebited: (toData.lifetimeDebited || 0) + 0,
      schemaVersion: 1,
      createdAt: toData.createdAt || now,
      updatedAt: now,
    }, { merge: true });

    const common = {
      transactionId: input.transactionId,
      idempotencyKey: input.idempotencyKey,
      units: input.units,
      currency: 'NEX',
      type: input.type,
      description,
      actorId: input.actorId,
      status: 'posted',
      createdAt: now,
    };
    transaction.create(debitRef, { ...common, ...entries[0] });
    transaction.create(creditRef, { ...common, ...entries[1] });
    transaction.create(transactionRef, {
      ...common,
      fromAccountId: input.fromAccountId,
      toAccountId: input.toAccountId,
      entryIds: [entries[0].entryId, entries[1].entryId],
    });
    transaction.create(requestRef, {
      transactionId: input.transactionId,
      createdAt: now,
    });
    transaction.create(fromEntryRef, {
      ...common,
      direction: 'debit',
      balanceAfter: nextFromBalance,
      counterpartyAccountId: input.toAccountId,
    });
    transaction.create(toEntryRef, {
      ...common,
      direction: 'credit',
      balanceAfter: nextToBalance,
      counterpartyAccountId: input.fromAccountId,
    });
    return { transactionId: input.transactionId, replayed: false };
  });
}

export const getNexWalletSnapshot = onCall({ maxInstances: 10 }, async (request) => {
  if (!request.auth?.uid) {
    throw new HttpsError('unauthenticated', 'Sign in to view your Nex Coin wallet.');
  }
  const uid = request.auth.uid;
  const walletRef = db.collection('nexWallets').doc(uid);

  try {
    await db.runTransaction(async (transaction) => {
      const snapshot = await transaction.get(walletRef);
      if (!snapshot.exists) {
        transaction.create(walletRef, {
          currency: 'NEX',
          availableBalance: 0,
          lifetimeCredited: 0,
          lifetimeDebited: 0,
          schemaVersion: 1,
          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        });
      }
    });

    const [walletSnapshot, historySnapshot] = await Promise.all([
      walletRef.get(),
      walletRef.collection('transactions').orderBy('createdAt', 'desc').limit(25).get(),
    ]);
    const wallet = walletSnapshot.data() || {};
    return {
      currency: 'NEX',
      availableBalance: Number.isSafeInteger(wallet.availableBalance) && wallet.availableBalance >= 0
        ? wallet.availableBalance : 0,
      lifetimeCredited: Number.isSafeInteger(wallet.lifetimeCredited) && wallet.lifetimeCredited >= 0
        ? wallet.lifetimeCredited : 0,
      lifetimeDebited: Number.isSafeInteger(wallet.lifetimeDebited) && wallet.lifetimeDebited >= 0
        ? wallet.lifetimeDebited : 0,
      transactions: historySnapshot.docs.map((snapshot) => {
        const data = snapshot.data();
        return {
          id: snapshot.id,
          direction: data.direction,
          units: data.units,
          currency: data.currency,
          type: data.type,
          description: data.description,
          status: data.status,
          createdAt: data.createdAt?.toDate?.()?.toISOString?.() || null,
        };
      }),
    };
  } catch {
    throw new HttpsError('unavailable', 'Your Nex Coin wallet is temporarily unavailable. Please try again.');
  }
});
