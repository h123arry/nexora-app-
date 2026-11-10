import { FieldValue, Timestamp, getFirestore, type DocumentSnapshot } from 'firebase-admin/firestore';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { getFirebaseAdminApp, resolveFirestoreDatabaseId } from './runtimeConfig.js';
import { findNexoraGift } from './giftCatalogPolicy.js';
import { validateGiftDeliveryInput, giftDeliveryReferences, isLiveGiftDeliveryEnabled } from './giftDeliveryPolicy.js';
import { applyNexBalanceEntries, buildNexTransferEntries } from './nexLedgerPolicy.js';
import { assessGiftRisk } from './giftEconomyPolicy.js';

const db = getFirestore(getFirebaseAdminApp(), resolveFirestoreDatabaseId());
const ESCROW_ACCOUNT = 'gift_escrow';

function counter(value: unknown): number {
  if (value === undefined) return 0;
  if (!Number.isSafeInteger(value) || (value as number) < 0) throw new Error('Wallet totals are invalid.');
  return value as number;
}

export const sendNexGift = onCall({ maxInstances: 20 }, async (request) => {
  if (!request.auth?.uid) throw new HttpsError('unauthenticated', 'Sign in before sending a gift.');
  const senderId = request.auth.uid;
  let input;
  try { input = validateGiftDeliveryInput(request.data); }
  catch (error) { throw new HttpsError('invalid-argument', error instanceof Error ? error.message : 'Gift details are invalid.'); }
  if (input.recipientId === senderId) throw new HttpsError('failed-precondition', 'You cannot send a gift to your own account.');
  if (input.contextType === 'profile' && input.contextId !== input.recipientId) {
    throw new HttpsError('invalid-argument', 'Profile gifts must target the creator profile receiving the gift.');
  }
  const gift = findNexoraGift(input.giftId);
  if (!gift) throw new HttpsError('not-found', 'This gift is no longer available.');
  if (gift.subscriptionExclusive) throw new HttpsError('failed-precondition', 'This gift requires an eligible creator subscription.');
  const units = gift.priceNex * input.quantity;
  if (!Number.isSafeInteger(units) || units <= 0) throw new HttpsError('invalid-argument', 'Gift total is invalid.');
  const { transactionId, requestId } = giftDeliveryReferences(senderId, input.idempotencyKey);
  const senderWalletRef = db.collection('nexWallets').doc(senderId);
  const escrowWalletRef = db.collection('nexWallets').doc(ESCROW_ACCOUNT);
  const requestRef = db.collection('nexLedgerRequests').doc(requestId);
  const ledgerTransactionRef = db.collection('nexLedgerTransactions').doc(transactionId);
  const debitRef = db.collection('nexLedgerEntries').doc(transactionId + ':debit');
  const creditRef = db.collection('nexLedgerEntries').doc(transactionId + ':credit');
  const senderHistoryRef = senderWalletRef.collection('transactions').doc(transactionId);
  const escrowHistoryRef = escrowWalletRef.collection('transactions').doc(transactionId);
  const eventRef = db.collection('giftDeliveryEvents').doc(transactionId);
  const galleryRef = db.collection('users').doc(input.recipientId).collection('giftGallery').doc(transactionId);
  const earningRef = db.collection('creatorEarnings').doc(transactionId);

  try {
    return await db.runTransaction(async (tx) => {
      const recentSenderGiftsQuery = db.collection('creatorEarnings').where('senderId', '==', senderId).where('createdAt', '>=', Timestamp.fromMillis(Date.now() - 10 * 60 * 1000)).orderBy('createdAt', 'desc').limit(20);
      const activeCompetitionQuery = input.contextType === 'live'
        ? db.collection('giftCompetitions').where('liveSessionId', '==', input.contextId).where('status', 'in', ['scheduled', 'active']).where('startsAt', '<=', Timestamp.now()).where('endsAt', '>', Timestamp.now()).limit(1)
        : null;
      const [prior, senderWallet, escrowWallet, senderProfile, recipientProfile, senderStatus, recipientStatus, liveSession, recentSenderGifts, competitions] = await Promise.all([
        tx.get(requestRef), tx.get(senderWalletRef), tx.get(escrowWalletRef),
        tx.get(db.collection('users').doc(senderId)), tx.get(db.collection('users').doc(input.recipientId)),
        tx.get(db.collection('accountStatus').doc(senderId)), tx.get(db.collection('accountStatus').doc(input.recipientId)),
        input.contextType === 'live' ? tx.get(db.collection('liveSessions').doc(input.contextId)) : Promise.resolve(null),
        tx.get(recentSenderGiftsQuery),
        activeCompetitionQuery ? tx.get(activeCompetitionQuery) : Promise.resolve(null),
      ]);
      if (prior.exists) {
        const previous = prior.data() || {};
        if (previous.senderId !== senderId || previous.recipientId !== input.recipientId
          || previous.giftId !== gift.id || previous.quantity !== input.quantity
          || previous.contextType !== input.contextType || previous.contextId !== input.contextId) {
          throw new HttpsError('already-exists', 'This request key was already used for a different gift.');
        }
        return { giftId: transactionId, replayed: true, status: 'delivered' as const };
      }
      if (!senderProfile.exists || !recipientProfile.exists) throw new HttpsError('not-found', 'The sender or creator account could not be found.');
      const blocked = (snapshot: DocumentSnapshot) => {
        const status = snapshot.data() || {};
        return status.suspended === true || status.giftingRestricted === true;
      };
      if (blocked(senderStatus) || blocked(recipientStatus)) throw new HttpsError('permission-denied', 'Gifting is unavailable for this account.');
      if (input.contextType === 'live') {
        const session = liveSession?.data() || {};
        const ownerId = session.creatorId || session.hostId;
        if (!liveSession?.exists || ownerId !== input.recipientId || session.status !== 'live') {
          throw new HttpsError('failed-precondition', 'This creator is not currently live in that session.');
        }
        if (!isLiveGiftDeliveryEnabled(session)) throw new HttpsError('failed-precondition', 'Gifting is disabled for this live room.');
      }
      const senderData = senderWallet.data() || {};
      const escrowData = escrowWallet.data() || {};
      const senderBalance = counter(senderData.availableBalance);
      const escrowBalance = counter(escrowData.availableBalance);
      if (senderBalance < units) throw new HttpsError('failed-precondition', 'Your NEX balance is too low for this gift.');
      const entries = buildNexTransferEntries({
        fromAccountId: senderId, toAccountId: ESCROW_ACCOUNT, units,
        transactionId, idempotencyKey: requestId,
      });
      const nextSenderBalance = applyNexBalanceEntries(senderBalance, entries, senderId);
      const nextEscrowBalance = applyNexBalanceEntries(escrowBalance, entries, ESCROW_ACCOUNT);
      const senderCredited = counter(senderData.lifetimeCredited);
      const senderDebited = counter(senderData.lifetimeDebited);
      const escrowCredited = counter(escrowData.lifetimeCredited);
      const escrowDebited = counter(escrowData.lifetimeDebited);
      if (senderDebited > Number.MAX_SAFE_INTEGER - units || escrowCredited > Number.MAX_SAFE_INTEGER - units) {
        throw new HttpsError('failed-precondition', 'Wallet lifetime totals are at their safe limit.');
      }
      const now = FieldValue.serverTimestamp();
      const senderName = String(senderProfile.data()?.username || senderProfile.data()?.name || 'NEXORA creator').slice(0, 80);
      const creatorName = String(recipientProfile.data()?.username || recipientProfile.data()?.name || 'Creator').slice(0, 80);
      const common = {
        transactionId, idempotencyKey: requestId, units, currency: 'NEX', type: 'gift_send',
        description: 'GIFTVERSE: ' + gift.name, actorId: senderId, status: 'posted', createdAt: now,
      };
      tx.set(senderWalletRef, {
        currency: 'NEX', availableBalance: nextSenderBalance, lifetimeCredited: senderCredited,
        lifetimeDebited: senderDebited + units, schemaVersion: 1,
        createdAt: senderData.createdAt || now, updatedAt: now,
      }, { merge: true });
      tx.set(escrowWalletRef, {
        currency: 'NEX', availableBalance: nextEscrowBalance, lifetimeCredited: escrowCredited + units,
        lifetimeDebited: escrowDebited, schemaVersion: 1,
        createdAt: escrowData.createdAt || now, updatedAt: now,
      }, { merge: true });
      tx.create(debitRef, { ...common, ...entries[0] });
      tx.create(creditRef, { ...common, ...entries[1] });
      tx.create(ledgerTransactionRef, { ...common, fromAccountId: senderId, toAccountId: ESCROW_ACCOUNT, entryIds: [entries[0].entryId, entries[1].entryId] });
      tx.create(requestRef, {
        transactionId, senderId, recipientId: input.recipientId, giftId: gift.id,
        quantity: input.quantity, contextType: input.contextType, contextId: input.contextId, units, createdAt: now,
      });
      tx.create(senderHistoryRef, { ...common, direction: 'debit', balanceAfter: nextSenderBalance, counterpartyAccountId: ESCROW_ACCOUNT });
      tx.create(escrowHistoryRef, { ...common, direction: 'credit', balanceAfter: nextEscrowBalance, counterpartyAccountId: senderId });
      const recentRows = recentSenderGifts.docs.map(item => item.data());
      const accountCreatedAt = senderProfile.data()?.createdAt?.toDate?.()?.getTime?.();
      const senderAccountAgeDays = Number.isFinite(accountCreatedAt) ? Math.max(0, (Date.now() - accountCreatedAt) / 86400000) : null;
      const risk = assessGiftRisk({
        senderGiftCount10m: recentRows.length,
        senderGrossNex10m: recentRows.reduce((sum, row) => sum + (Number.isSafeInteger(row.grossNex) ? row.grossNex : 0), 0),
        giftGrossNex: units, senderAccountAgeDays,
        senderRestricted: blocked(senderStatus), recipientRestricted: blocked(recipientStatus),
      });
      const activeCompetition = competitions && !competitions.empty ? competitions.docs[0] : null;
      tx.create(earningRef, {
        creatorId: input.recipientId, senderId, giftId: gift.id, giftName: gift.name,
        quantity: input.quantity, grossNex: units, status: 'pending_review',
        riskScore: risk.score, riskTier: risk.tier, riskReasons: risk.reasons,
        ...(activeCompetition ? { competitionId: activeCompetition.id } : {}),
        source: 'giftverse', createdAt: now, updatedAt: now,
      });
      tx.create(db.collection('giftRiskSignals').doc(transactionId), {
        transactionId, senderId, creatorId: input.recipientId, grossNex: units,
        score: risk.score, tier: risk.tier, reasons: risk.reasons,
        disposition: risk.tier === 'low' ? 'auto_cleared' : 'review_only', createdAt: now,
      });
      if (activeCompetition) tx.create(db.collection('giftCompetitionContributions').doc(transactionId), {
        competitionId: activeCompetition.id, transactionId, creatorId: input.recipientId,
        senderId, grossNex: units, createdAt: now,
      });
      tx.create(galleryRef, {
        giftId: gift.id, giftName: gift.name, image: gift.image, rarity: gift.rarity,
        animation: gift.animation, quantity: input.quantity, senderId, senderName,
        creatorId: input.recipientId, contextType: input.contextType,
        contextId: input.contextId, transactionId, receivedAt: now,
      });
      if (input.contextType === 'live') {
        tx.create(eventRef, {
          transactionId, targetType: 'live', targetId: input.contextId,
          recipientId: input.recipientId, senderId, senderName, creatorName,
          giftId: gift.id, giftName: gift.name, giftImage: gift.image,
          animation: gift.animation, rarity: gift.rarity, quantity: input.quantity,
          totalNex: units, createdAt: now, status: 'queued',
        });
      }
      return { giftId: transactionId, replayed: false, status: 'delivered' as const, units, currency: 'NEX' as const };
    });
  } catch (error) {
    if (error instanceof HttpsError) throw error;
    throw new HttpsError('internal', 'The gift could not be delivered. No successful delivery was recorded.');
  }
});
