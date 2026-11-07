import { createHash } from 'node:crypto';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { getFirebaseAdminApp, resolveFirestoreDatabaseId } from './runtimeConfig.js';
import { applyNexBalanceEntries, buildNexTransferEntries } from './nexLedgerPolicy.js';
import { calculateGiftRevenueSplit, CREATOR_REVENUE_SHARE_BPS, PLATFORM_REVENUE_SHARE_BPS, GIFT_REVENUE_POLICY_VERSION } from './giftEarningsPolicy.js';

const db = getFirestore(getFirebaseAdminApp(), resolveFirestoreDatabaseId());
const ESCROW_ACCOUNT = 'gift_escrow';
const PLATFORM_ACCOUNT = 'platform_treasury';

function requireUid(request: { auth?: { uid: string } | null }): string {
  if (!request.auth?.uid) throw new HttpsError('unauthenticated', 'Sign in to view creator earnings.');
  return request.auth.uid;
}
function isFinanceAdmin(request: { auth?: { token?: Record<string, unknown> } | null }): boolean {
  const token = request.auth?.token || {};
  return token.finance_admin === true || token.admin === true
    || token.role === 'finance_admin' || token.role === 'founder';
}
function safeBalance(value: unknown): number {
  if (value === undefined) return 0;
  if (!Number.isSafeInteger(value) || (value as number) < 0) throw new Error('A NEX wallet balance is invalid.');
  return value as number;
}
function safeTotal(value: unknown): number {
  if (value === undefined) return 0;
  if (!Number.isSafeInteger(value) || (value as number) < 0) throw new Error('A NEX wallet lifetime total is invalid.');
  return value as number;
}
function iso(value: any): string | null {
  return value?.toDate?.()?.toISOString?.() || null;
}

export const getCreatorEarningsSnapshot = onCall({ maxInstances: 10 }, async (request) => {
  const uid = requireUid(request);
  try {
    const [earnings, wallet] = await Promise.all([
      db.collection('creatorEarnings').where('creatorId', '==', uid).limit(100).get(),
      db.collection('nexWallets').doc(uid).get(),
    ]);
    const records = earnings.docs.map(snapshot => {
      const data = snapshot.data();
      return {
        id: snapshot.id,
        giftId: data.giftId,
        giftName: data.giftName,
        quantity: data.quantity,
        grossNex: data.grossNex,
        creatorShareNex: Number.isSafeInteger(data.creatorShareNex) ? data.creatorShareNex : null,
        platformShareNex: Number.isSafeInteger(data.platformShareNex) ? data.platformShareNex : null,
        status: data.status,
        createdAt: iso(data.createdAt),
        settledAt: iso(data.settledAt),
      };
    }).sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
    const pendingReviewGrossNex = records.filter(x => x.status === 'pending_review').reduce((sum, x) => sum + x.grossNex, 0);
    const recentAvailableCreatorShareNex = records.filter(x => x.status === 'available').reduce((sum, x) => sum + (x.creatorShareNex || 0), 0);
    const recentGrossNex = records.reduce((sum, x) => sum + x.grossNex, 0);
    const recentCreatorShareNex = records.reduce((sum, x) => sum + (x.creatorShareNex || 0), 0);
    const recentPlatformShareNex = records.reduce((sum, x) => sum + (x.platformShareNex || 0), 0);
    return {
      currency: 'NEX' as const,
      policyVersion: GIFT_REVENUE_POLICY_VERSION,
      creatorShareBps: CREATOR_REVENUE_SHARE_BPS,
      platformShareBps: PLATFORM_REVENUE_SHARE_BPS,
      earningsWindow: 'latest_100' as const,
      hasMoreEarnings: earnings.size === 100,
      pendingReviewGrossNex,
      recentAvailableCreatorShareNex,
      recentGrossNex,
      recentCreatorShareNex,
      recentPlatformShareNex,
      walletAvailableNex: safeBalance(wallet.data()?.availableBalance),
      earnings: records,
    };
  } catch (error) {
    if (error instanceof HttpsError) throw error;
    throw new HttpsError('unavailable', 'Creator earnings are temporarily unavailable. Please retry.');
  }
});

export const settleGiftCreatorEarning = onCall({ maxInstances: 5 }, async (request) => {
  requireUid(request);
  if (!isFinanceAdmin(request)) throw new HttpsError('permission-denied', 'Finance administrator access is required.');
  const transactionId = request.data?.transactionId;
  if (typeof transactionId !== 'string' || !/^gift_[a-f0-9]{64}$/.test(transactionId)) {
    throw new HttpsError('invalid-argument', 'A valid gift transaction reference is required.');
  }
  const digest = createHash('sha256').update(transactionId).digest('hex');
  const settlementId = 'gift_settlement_' + digest;
  const creatorTransactionId = settlementId + '_creator';
  const platformTransactionId = settlementId + '_platform';
  const creatorRequestId = settlementId + '_creator_req';
  const platformRequestId = settlementId + '_platform_req';
  const earningRef = db.collection('creatorEarnings').doc(transactionId);
  const settlementRef = db.collection('giftEarningSettlements').doc(settlementId);
  const escrowRef = db.collection('nexWallets').doc(ESCROW_ACCOUNT);
  const platformWalletRef = db.collection('nexWallets').doc(PLATFORM_ACCOUNT);

  try {
    return await db.runTransaction(async (tx) => {
      const earningSnapshot = await tx.get(earningRef);
      if (!earningSnapshot.exists) throw new HttpsError('not-found', 'This gift earning record does not exist.');
      const earning = earningSnapshot.data() || {};
      const creatorId = earning.creatorId;
      if (typeof creatorId !== 'string' || !/^[A-Za-z0-9._:-]{1,160}$/.test(creatorId)) {
        throw new HttpsError('failed-precondition', 'The creator earning record is invalid.');
      }
      const creatorRef = db.collection('nexWallets').doc(creatorId);
      const [priorSettlement, escrowSnapshot, creatorSnapshot, platformSnapshot] = await Promise.all([
        tx.get(settlementRef), tx.get(escrowRef), tx.get(creatorRef), tx.get(platformWalletRef),
      ]);
      if (priorSettlement.exists || earning.status === 'available') {
        return { settlementId, replayed: true, status: 'available' as const };
      }
      if (earning.status !== 'pending_review') {
        throw new HttpsError('failed-precondition', 'Only pending-review gift earnings can be settled.');
      }
      const split = calculateGiftRevenueSplit(earning.grossNex);
      const escrowBalance = safeBalance(escrowSnapshot.data()?.availableBalance);
      const creatorBalance = safeBalance(creatorSnapshot.data()?.availableBalance);
      const platformBalance = safeBalance(platformSnapshot.data()?.availableBalance);
      if (escrowBalance < split.grossNex) {
        throw new HttpsError('failed-precondition', 'Gift escrow does not contain enough NEX to settle this earning.');
      }
      const creatorEntries = buildNexTransferEntries({
        fromAccountId: ESCROW_ACCOUNT, toAccountId: creatorId, units: split.creatorShareNex,
        transactionId: creatorTransactionId, idempotencyKey: creatorRequestId,
      });
      const creatorNextEscrow = applyNexBalanceEntries(escrowBalance, creatorEntries, ESCROW_ACCOUNT);
      const creatorNextBalance = applyNexBalanceEntries(creatorBalance, creatorEntries, creatorId);
      const platformEntries = split.platformShareNex > 0 ? buildNexTransferEntries({
        fromAccountId: ESCROW_ACCOUNT, toAccountId: PLATFORM_ACCOUNT, units: split.platformShareNex,
        transactionId: platformTransactionId, idempotencyKey: platformRequestId,
      }) : null;
      const finalEscrowBalance = platformEntries
        ? applyNexBalanceEntries(creatorNextEscrow, platformEntries, ESCROW_ACCOUNT)
        : creatorNextEscrow;
      const finalPlatformBalance = platformEntries
        ? applyNexBalanceEntries(platformBalance, platformEntries, PLATFORM_ACCOUNT)
        : platformBalance;
      const now = FieldValue.serverTimestamp();
      const escrowData = escrowSnapshot.data() || {};
      const creatorData = creatorSnapshot.data() || {};
      const platformData = platformSnapshot.data() || {};
      const escrowDebited = safeTotal(escrowData.lifetimeDebited);
      const creatorCredited = safeTotal(creatorData.lifetimeCredited);
      const platformCredited = safeTotal(platformData.lifetimeCredited);
      if (escrowDebited > Number.MAX_SAFE_INTEGER - split.grossNex
        || creatorCredited > Number.MAX_SAFE_INTEGER - split.creatorShareNex
        || platformCredited > Number.MAX_SAFE_INTEGER - split.platformShareNex) {
        throw new HttpsError('failed-precondition', 'NEX wallet lifetime totals are at their safe limit.');
      }
      tx.set(escrowRef, { currency: 'NEX', availableBalance: finalEscrowBalance,
        lifetimeCredited: safeTotal(escrowData.lifetimeCredited), lifetimeDebited: escrowDebited + split.grossNex,
        schemaVersion: 1, createdAt: escrowData.createdAt || now, updatedAt: now }, { merge: true });
      tx.set(creatorRef, { currency: 'NEX', availableBalance: creatorNextBalance,
        lifetimeCredited: creatorCredited + split.creatorShareNex,
        lifetimeDebited: safeTotal(creatorData.lifetimeDebited), schemaVersion: 1,
        createdAt: creatorData.createdAt || now, updatedAt: now }, { merge: true });
      tx.set(platformWalletRef, { currency: 'NEX', availableBalance: finalPlatformBalance,
        lifetimeCredited: platformCredited + split.platformShareNex,
        lifetimeDebited: safeTotal(platformData.lifetimeDebited), schemaVersion: 1,
        createdAt: platformData.createdAt || now, updatedAt: now }, { merge: true });

      const writeTransfer = (entries: ReturnType<typeof buildNexTransferEntries>, fromBalance: number, toBalance: number, fromAccount: string, toAccount: string, units: number, txId: string, requestId: string) => {
        const common = { transactionId: txId, idempotencyKey: requestId, units, currency: 'NEX',
          type: 'gift_revenue_settlement', description: 'GIFTVERSE creator revenue settlement',
          actorId: request.auth!.uid, status: 'posted', createdAt: now };
        tx.create(db.collection('nexLedgerEntries').doc(entries[0].entryId), { ...common, ...entries[0] });
        tx.create(db.collection('nexLedgerEntries').doc(entries[1].entryId), { ...common, ...entries[1] });
        tx.create(db.collection('nexLedgerTransactions').doc(txId), { ...common, fromAccountId: fromAccount,
          toAccountId: toAccount, entryIds: [entries[0].entryId, entries[1].entryId] });
        tx.create(db.collection('nexLedgerRequests').doc(requestId), { transactionId: txId, fromAccountId: fromAccount,
          toAccountId: toAccount, units, type: 'gift_revenue_settlement', actorId: request.auth!.uid, createdAt: now });
        tx.create(db.collection('nexWallets').doc(fromAccount).collection('transactions').doc(txId), {
          ...common, direction: 'debit', balanceAfter: fromBalance, counterpartyAccountId: toAccount });
        tx.create(db.collection('nexWallets').doc(toAccount).collection('transactions').doc(txId), {
          ...common, direction: 'credit', balanceAfter: toBalance, counterpartyAccountId: fromAccount });
      };
      writeTransfer(creatorEntries, creatorNextEscrow, creatorNextBalance, ESCROW_ACCOUNT, creatorId,
        split.creatorShareNex, creatorTransactionId, creatorRequestId);
      if (platformEntries) writeTransfer(platformEntries, finalEscrowBalance, finalPlatformBalance,
        ESCROW_ACCOUNT, PLATFORM_ACCOUNT, split.platformShareNex, platformTransactionId, platformRequestId);

      tx.create(settlementRef, { settlementId, transactionId, creatorId, senderId: earning.senderId,
        grossNex: split.grossNex, creatorShareNex: split.creatorShareNex, platformShareNex: split.platformShareNex,
        creatorShareBps: CREATOR_REVENUE_SHARE_BPS, platformShareBps: PLATFORM_REVENUE_SHARE_BPS,
        policyVersion: split.policyVersion, currency: 'NEX', status: 'settled', settledBy: request.auth!.uid,
        settledAt: now, createdAt: now });
      tx.update(earningRef, { creatorShareNex: split.creatorShareNex, platformShareNex: split.platformShareNex,
        creatorShareBps: CREATOR_REVENUE_SHARE_BPS, platformShareBps: PLATFORM_REVENUE_SHARE_BPS,
        policyVersion: split.policyVersion, settlementId, status: 'available', settledAt: now, updatedAt: now });
      return { settlementId, replayed: false, status: 'available' as const,
        creatorShareNex: split.creatorShareNex, platformShareNex: split.platformShareNex, currency: 'NEX' as const };
    });
  } catch (error) {
    if (error instanceof HttpsError) throw error;
    throw new HttpsError('internal', 'The creator earning could not be settled. No settlement was confirmed.');
  }
});
