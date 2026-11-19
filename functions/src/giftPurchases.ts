import { createHash } from 'node:crypto';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { getFirebaseAdminApp, resolveFirestoreDatabaseId } from './runtimeConfig.js';
import { assertCallableSessionActive } from './callableSession.js';
import { findNexoraGift } from './giftCatalogPolicy.js';
import { applyNexBalanceEntries, buildNexTransferEntries } from './nexLedgerPolicy.js';

const db = getFirestore(getFirebaseAdminApp(), resolveFirestoreDatabaseId());
const ESCROW = 'gift_escrow';
const validKey = (value: unknown): value is string =>
  typeof value === 'string' && /^[A-Za-z0-9_-]{16,128}$/.test(value);

export const purchaseNexGift = onCall({ maxInstances: 20 }, async request => {
  const uid = request.auth?.uid;
  if (!uid) throw new HttpsError('unauthenticated', 'Sign in to purchase a gift.');
  await assertCallableSessionActive(db, uid, request.auth?.token?.auth_time);
  const giftId = request.data?.giftId;
  const idempotencyKey = request.data?.idempotencyKey;
  if (typeof giftId !== 'string' || !validKey(idempotencyKey)) {
    throw new HttpsError('invalid-argument', 'Gift purchase details are invalid.');
  }
  const gift = findNexoraGift(giftId);
  if (!gift) throw new HttpsError('not-found', 'This gift is no longer available.');
  if (gift.subscriptionExclusive) {
    throw new HttpsError('failed-precondition', 'This gift requires an eligible creator subscription.');
  }

  const requestId = createHash('sha256').update(uid + ':' + idempotencyKey).digest('hex');
  const transactionId = 'gift_purchase_' + requestId.slice(0, 40);
  const units = gift.priceNex;
  const walletRef = db.collection('nexWallets').doc(uid);
  const escrowRef = db.collection('nexWallets').doc(ESCROW);
  const requestRef = db.collection('nexLedgerRequests').doc('purchase_' + requestId);
  const transactionRef = db.collection('nexLedgerTransactions').doc(transactionId);
  const debitRef = db.collection('nexLedgerEntries').doc(transactionId + ':debit');
  const creditRef = db.collection('nexLedgerEntries').doc(transactionId + ':credit');
  const historyRef = walletRef.collection('transactions').doc(transactionId);
  const inventoryRef = db.collection('users').doc(uid).collection('giftInventory').doc(gift.id);

  try {
    return await db.runTransaction(async tx => {
      const [prior, wallet, escrow, inventory] = await Promise.all([
        tx.get(requestRef), tx.get(walletRef), tx.get(escrowRef), tx.get(inventoryRef),
      ]);
      if (prior.exists) {
        const data = prior.data() || {};
        if (data.uid !== uid || data.giftId !== gift.id) {
          throw new HttpsError('already-exists', 'This purchase key was already used.');
        }
        return { giftId: gift.id, quantity: Number(inventory.data()?.quantity || 1), replayed: true, status: 'owned' as const };
      }
      const balance = wallet.data()?.availableBalance ?? 0;
      const escrowBalance = escrow.data()?.availableBalance ?? 0;
      if (!Number.isSafeInteger(balance) || balance < units) {
        throw new HttpsError('failed-precondition', 'Your NEX balance is too low for this gift.');
      }
      if (!Number.isSafeInteger(escrowBalance) || escrowBalance < 0) {
        throw new HttpsError('failed-precondition', 'The gift wallet is temporarily unavailable.');
      }
      const entries = buildNexTransferEntries({
        fromAccountId: uid, toAccountId: ESCROW, units, transactionId,
        idempotencyKey: 'purchase_' + requestId,
      });
      const nextBalance = applyNexBalanceEntries(balance, entries, uid);
      const nextEscrow = applyNexBalanceEntries(escrowBalance, entries, ESCROW);
      const oldQuantity = inventory.data()?.quantity ?? 0;
      if (!Number.isSafeInteger(oldQuantity) || oldQuantity < 0 || oldQuantity >= Number.MAX_SAFE_INTEGER) {
        throw new HttpsError('failed-precondition', 'Your gift collection needs support before it can be updated.');
      }
      const now = FieldValue.serverTimestamp();
      const common = {
        transactionId, idempotencyKey: 'purchase_' + requestId, units, currency: 'NEX',
        type: 'gift_purchase', description: 'GIFTVERSE collection: ' + gift.name,
        actorId: uid, status: 'posted', createdAt: now,
      };
      tx.set(walletRef, {
        currency: 'NEX', availableBalance: nextBalance,
        lifetimeCredited: wallet.data()?.lifetimeCredited ?? 0,
        lifetimeDebited: (wallet.data()?.lifetimeDebited ?? 0) + units,
        schemaVersion: 1, updatedAt: now,
      }, { merge: true });
      tx.set(escrowRef, {
        currency: 'NEX', availableBalance: nextEscrow,
        lifetimeCredited: (escrow.data()?.lifetimeCredited ?? 0) + units,
        lifetimeDebited: escrow.data()?.lifetimeDebited ?? 0,
        schemaVersion: 1, updatedAt: now,
      }, { merge: true });
      tx.create(debitRef, { ...common, ...entries[0] });
      tx.create(creditRef, { ...common, ...entries[1] });
      tx.create(transactionRef, {
        ...common, fromAccountId: uid, toAccountId: ESCROW,
        entryIds: [entries[0].entryId, entries[1].entryId],
      });
      tx.create(requestRef, { uid, giftId: gift.id, transactionId, units, createdAt: now });
      tx.create(historyRef, { ...common, direction: 'debit', balanceAfter: nextBalance, counterpartyAccountId: ESCROW });
      tx.set(inventoryRef, {
        giftId: gift.id, giftName: gift.name, image: gift.image, rarity: gift.rarity,
        animation: gift.animation, category: gift.category, priceNex: gift.priceNex,
        quantity: oldQuantity + 1, firstPurchasedAt: inventory.data()?.firstPurchasedAt || now,
        updatedAt: now, lastPurchaseTransactionId: transactionId,
      }, { merge: true });
      return { giftId: gift.id, quantity: oldQuantity + 1, replayed: false, status: 'owned' as const };
    });
  } catch (error) {
    if (error instanceof HttpsError) throw error;
    throw new HttpsError('internal', 'The gift could not be purchased. No successful purchase was recorded.');
  }
});

export const getMyGiftInventory = onCall({ maxInstances: 20 }, async request => {
  const uid = request.auth?.uid;
  if (!uid) throw new HttpsError('unauthenticated', 'Sign in to view your gift collection.');
  await assertCallableSessionActive(db, uid, request.auth?.token?.auth_time);
  const snapshot = await db.collection('users').doc(uid).collection('giftInventory').orderBy('updatedAt', 'desc').limit(500).get();
  return { items: snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) };
});
