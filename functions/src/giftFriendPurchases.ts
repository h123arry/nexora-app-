import { createHash } from 'node:crypto';
import { FieldValue, getFirestore, type DocumentSnapshot } from 'firebase-admin/firestore';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { getFirebaseAdminApp, resolveFirestoreDatabaseId } from './runtimeConfig.js';
import { assertCallableSessionActive } from './callableSession.js';
import { findNexoraGift } from './giftCatalogPolicy.js';
import { applyNexBalanceEntries, buildNexTransferEntries } from './nexLedgerPolicy.js';

const db = getFirestore(getFirebaseAdminApp(), resolveFirestoreDatabaseId());
const TREASURY = 'platform_treasury';

function safeUnits(value: unknown, label: string): number {
  if (value === undefined) return 0;
  if (!Number.isSafeInteger(value) || (value as number) < 0) {
    throw new HttpsError('failed-precondition', label + ' is invalid.');
  }
  return value as number;
}

/** Buy a catalogue gift for another member's collection. This is not creator gifting/earnings. */
export const buyNexGiftForFriend = onCall({ maxInstances: 20 }, async request => {
  const senderId = request.auth?.uid;
  if (!senderId) throw new HttpsError('unauthenticated', 'Sign in to buy a gift for a friend.');
  await assertCallableSessionActive(db, senderId, request.auth?.token?.auth_time);

  const recipientId = request.data?.recipientId;
  const giftId = request.data?.giftId;
  const idempotencyKey = request.data?.idempotencyKey;
  if (typeof recipientId !== 'string' || !/^[A-Za-z0-9_-]{1,150}$/.test(recipientId)
    || typeof giftId !== 'string'
    || typeof idempotencyKey !== 'string' || !/^[A-Za-z0-9_-]{16,128}$/.test(idempotencyKey)) {
    throw new HttpsError('invalid-argument', 'Friend and gift details are invalid.');
  }
  if (recipientId === senderId) {
    throw new HttpsError('failed-precondition', 'Use Buy for my collection to purchase a gift for yourself.');
  }

  const gift = findNexoraGift(giftId);
  if (!gift) throw new HttpsError('not-found', 'This gift is no longer available.');
  if (gift.subscriptionExclusive) {
    throw new HttpsError('failed-precondition', 'This gift requires an eligible creator subscription.');
  }
  const units = gift.priceNex;
  const requestId = createHash('sha256').update(senderId + ':friend:' + idempotencyKey).digest('hex');
  const transactionId = 'friend_gift_' + requestId.slice(0, 40);

  const senderWalletRef = db.collection('nexWallets').doc(senderId);
  const treasuryWalletRef = db.collection('nexWallets').doc(TREASURY);
  const requestRef = db.collection('nexLedgerRequests').doc('friend_purchase_' + requestId);
  const transactionRef = db.collection('nexLedgerTransactions').doc(transactionId);
  const debitRef = db.collection('nexLedgerEntries').doc(transactionId + ':debit');
  const creditRef = db.collection('nexLedgerEntries').doc(transactionId + ':credit');
  const senderHistoryRef = senderWalletRef.collection('transactions').doc(transactionId);
  const inventoryRef = db.collection('users').doc(recipientId).collection('giftInventory').doc(gift.id);
  const receivedEventRef = db.collection('users').doc(recipientId).collection('giftCollectionEvents').doc(transactionId);
  const sentEventRef = db.collection('users').doc(senderId).collection('giftPurchasesSent').doc(transactionId);

  try {
    return await db.runTransaction(async tx => {
      const [prior, senderWallet, treasuryWallet, senderProfile, recipientProfile,
        senderStatus, recipientStatus, inventory] = await Promise.all([
        tx.get(requestRef), tx.get(senderWalletRef), tx.get(treasuryWalletRef),
        tx.get(db.collection('users').doc(senderId)), tx.get(db.collection('users').doc(recipientId)),
        tx.get(db.collection('accountStatus').doc(senderId)), tx.get(db.collection('accountStatus').doc(recipientId)),
        tx.get(inventoryRef),
      ]);

      if (prior.exists) {
        const previous = prior.data() || {};
        if (previous.senderId !== senderId || previous.recipientId !== recipientId || previous.giftId !== gift.id) {
          throw new HttpsError('already-exists', 'This purchase key was already used for another gift.');
        }
        return { transactionId, giftId: gift.id, quantity: safeUnits(inventory.data()?.quantity, 'Gift quantity'), replayed: true, status: 'added_to_friend_collection' as const };
      }
      if (!senderProfile.exists || !recipientProfile.exists) {
        throw new HttpsError('not-found', 'We could not find that NEXORA member.');
      }
      const restricted = (snapshot: DocumentSnapshot) => {
        const state = snapshot.data() || {};
        return state.suspended === true || state.giftingRestricted === true;
      };
      if (restricted(senderStatus) || restricted(recipientStatus)) {
        throw new HttpsError('permission-denied', 'Buying a gift for this account is unavailable.');
      }

      const sender = senderWallet.data() || {};
      const treasury = treasuryWallet.data() || {};
      const senderBalance = safeUnits(sender.availableBalance, 'Your NEX balance');
      const treasuryBalance = safeUnits(treasury.availableBalance, 'Platform wallet balance');
      if (senderBalance < units) throw new HttpsError('failed-precondition', 'Your NEX balance is too low for this gift.');
      const senderCredited = safeUnits(sender.lifetimeCredited, 'Wallet lifetime credits');
      const senderDebited = safeUnits(sender.lifetimeDebited, 'Wallet lifetime debits');
      const treasuryCredited = safeUnits(treasury.lifetimeCredited, 'Platform lifetime credits');
      const treasuryDebited = safeUnits(treasury.lifetimeDebited, 'Platform lifetime debits');
      if (senderDebited > Number.MAX_SAFE_INTEGER - units || treasuryCredited > Number.MAX_SAFE_INTEGER - units) {
        throw new HttpsError('failed-precondition', 'Wallet totals are at their safe limit.');
      }

      const entries = buildNexTransferEntries({
        fromAccountId: senderId, toAccountId: TREASURY, units, transactionId,
        idempotencyKey: 'friend_purchase_' + requestId,
      });
      const nextSender = applyNexBalanceEntries(senderBalance, entries, senderId);
      const nextTreasury = applyNexBalanceEntries(treasuryBalance, entries, TREASURY);
      const oldQuantity = safeUnits(inventory.data()?.quantity, 'Friend gift quantity');
      if (oldQuantity >= Number.MAX_SAFE_INTEGER) throw new HttpsError('failed-precondition', 'The recipient collection has reached its safe limit.');
      const now = FieldValue.serverTimestamp();
      const senderName = String(senderProfile.data()?.name || senderProfile.data()?.username || 'NEXORA member').slice(0, 80);
      const recipientName = String(recipientProfile.data()?.name || recipientProfile.data()?.username || 'NEXORA member').slice(0, 80);
      const common = {
        transactionId, units, currency: 'NEX', type: 'gift_purchase_for_friend',
        description: 'GIFTVERSE gift for ' + recipientName + ': ' + gift.name,
        actorId: senderId, status: 'posted', createdAt: now,
      };

      tx.set(senderWalletRef, {
        currency: 'NEX', availableBalance: nextSender,
        lifetimeCredited: senderCredited, lifetimeDebited: senderDebited + units,
        schemaVersion: 1, updatedAt: now,
      }, { merge: true });
      tx.set(treasuryWalletRef, {
        currency: 'NEX', availableBalance: nextTreasury,
        lifetimeCredited: treasuryCredited + units, lifetimeDebited: treasuryDebited,
        schemaVersion: 1, updatedAt: now,
      }, { merge: true });
      tx.create(debitRef, { ...common, ...entries[0] });
      tx.create(creditRef, { ...common, ...entries[1] });
      tx.create(transactionRef, {
        ...common, fromAccountId: senderId, toAccountId: TREASURY,
        recipientId, giftId: gift.id, entryIds: [entries[0].entryId, entries[1].entryId],
      });
      tx.create(requestRef, { senderId, recipientId, giftId: gift.id, transactionId, units, createdAt: now });
      tx.create(senderHistoryRef, { ...common, direction: 'debit', balanceAfter: nextSender, counterpartyAccountId: TREASURY });
      tx.set(inventoryRef, {
        giftId: gift.id, giftName: gift.name, image: gift.image, rarity: gift.rarity,
        animation: gift.animation, category: gift.category, priceNex: gift.priceNex,
        quantity: oldQuantity + 1, firstPurchasedAt: inventory.data()?.firstPurchasedAt || now,
        updatedAt: now, lastPurchaseTransactionId: transactionId,
      }, { merge: true });
      tx.create(receivedEventRef, {
        transactionId, type: 'gift_purchased_for_you', giftId: gift.id, giftName: gift.name,
        image: gift.image, rarity: gift.rarity, quantity: 1,
        senderId, senderName, createdAt: now, status: 'added_to_collection',
      });
      tx.create(sentEventRef, {
        transactionId, type: 'gift_purchased_for_friend', giftId: gift.id, giftName: gift.name,
        image: gift.image, rarity: gift.rarity, quantity: 1,
        recipientId, recipientName, createdAt: now, units, currency: 'NEX',
      });
      return { transactionId, giftId: gift.id, quantity: oldQuantity + 1, replayed: false, status: 'added_to_friend_collection' as const };
    });
  } catch (error) {
    if (error instanceof HttpsError) throw error;
    throw new HttpsError('internal', 'The gift could not be added to your friend’s collection. No successful purchase was recorded.');
  }
});
