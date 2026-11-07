import { FieldValue, Timestamp, getFirestore } from 'firebase-admin/firestore';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { getFirebaseAdminApp, resolveFirestoreDatabaseId } from './runtimeConfig.js';
import { assessGiftRisk, isSupportedDisplayCurrency, validatePayoutRequest } from './giftEconomyPolicy.js';

const db = getFirestore(getFirebaseAdminApp(), resolveFirestoreDatabaseId());
const PAYOUT_PROVIDER_CONFIGURED = false; // Fail closed until provider credentials, NGN pricing and verified beneficiary operations are provisioned.
function uid(request: { auth?: { uid: string } | null }): string {
  if (!request.auth?.uid) throw new HttpsError('unauthenticated', 'Sign in to continue.');
  return request.auth.uid;
}
function finance(request: { auth?: { token?: Record<string, unknown> } | null }): boolean {
  const token = request.auth?.token || {};
  return token.finance_admin === true || token.admin === true || token.role === 'finance_admin' || token.role === 'founder';
}
function safeId(value: unknown): value is string {
  return typeof value === 'string' && /^[A-Za-z0-9._:-]{1,140}$/.test(value);
}

export const getCreatorPayoutReadiness = onCall({ maxInstances: 10 }, async request => {
  const creatorId = uid(request);
  const [profile, beneficiary] = await Promise.all([
    db.collection('users').doc(creatorId).get(),
    db.collection('creatorPayoutBeneficiaries').doc(creatorId).get(),
  ]);
  const b = beneficiary.data() || {};
  return {
    providerConfigured: PAYOUT_PROVIDER_CONFIGURED,
    payoutEnabled: PAYOUT_PROVIDER_CONFIGURED && b.status === 'verified' && typeof b.providerBeneficiaryRef === 'string',
    corridor: 'NG-NGN',
    currency: 'NGN',
    beneficiaryStatus: b.status === 'verified' ? 'verified' : b.status === 'pending' ? 'pending' : 'not_configured',
    displayCurrency: profile.data()?.creatorEconomyDisplayCurrency || 'NGN',
    blocker: !PAYOUT_PROVIDER_CONFIGURED ? 'provider_not_configured' : b.status !== 'verified' ? 'verified_beneficiary_required' : null,
    cashWithdrawalEnabled: false,
  };
});

export const requestCreatorPayout = onCall({ maxInstances: 5 }, async request => {
  const creatorId = uid(request);
  let input;
  try { input = validatePayoutRequest(request.data); }
  catch (error) { throw new HttpsError('invalid-argument', error instanceof Error ? error.message : 'Payout request is invalid.'); }
  const [wallet, beneficiary] = await Promise.all([
    db.collection('nexWallets').doc(creatorId).get(),
    db.collection('creatorPayoutBeneficiaries').doc(creatorId).get(),
  ]);
  if ((wallet.data()?.availableBalance || 0) < input.amountNex) throw new HttpsError('failed-precondition', 'Your available NEX balance is insufficient.');
  if (beneficiary.data()?.status !== 'verified' || typeof beneficiary.data()?.providerBeneficiaryRef !== 'string') {
    throw new HttpsError('failed-precondition', 'Complete verified bank-beneficiary setup before requesting a payout.');
  }
  if (!PAYOUT_PROVIDER_CONFIGURED) {
    throw new HttpsError('failed-precondition', 'NGN withdrawals are not enabled yet. The payment provider, approved NEX-to-NGN rate and settlement funding must be configured first. No funds were debited.');
  }
  throw new HttpsError('unavailable', 'The payout provider has not confirmed availability. No funds were debited.');
});

export const setCreatorEconomyDisplayCurrency = onCall({ maxInstances: 10 }, async request => {
  const creatorId = uid(request);
  const currency = request.data?.currency;
  if (!isSupportedDisplayCurrency(currency)) throw new HttpsError('invalid-argument', 'Choose a supported display currency.');
  await db.collection('users').doc(creatorId).set({ creatorEconomyDisplayCurrency: currency, creatorEconomyDisplayCurrencyUpdatedAt: FieldValue.serverTimestamp() }, { merge: true });
  return { currency, conversionApplied: false, note: 'Display preference only. No FX conversion or payout has been performed.' };
});

export const getCreatorGiftAnalytics = onCall({ maxInstances: 10 }, async request => {
  const creatorId = uid(request);
  const days = request.data?.days ?? 30;
  if (!Number.isInteger(days) || days < 7 || days > 90) throw new HttpsError('invalid-argument', 'Choose an analytics window between 7 and 90 days.');
  const start = Timestamp.fromMillis(Date.now() - days * 86400000);
  try {
    const snapshot = await db.collection('creatorEarnings').where('creatorId', '==', creatorId).where('createdAt', '>=', start).orderBy('createdAt', 'asc').limit(1000).get();
    const daily = new Map<string, { grossNex: number; creatorShareNex: number; gifts: number; settledGifts: number }>();
    let grossNex = 0, creatorShareNex = 0, gifts = 0, settledGifts = 0;
    for (const doc of snapshot.docs) {
      const row = doc.data();
      const day = row.createdAt?.toDate?.()?.toISOString?.().slice(0, 10);
      if (!day || !Number.isSafeInteger(row.grossNex) || row.grossNex < 0) continue;
      const current = daily.get(day) || { grossNex: 0, creatorShareNex: 0, gifts: 0, settledGifts: 0 };
      current.grossNex += row.grossNex;
      current.creatorShareNex += row.status === 'available' && Number.isSafeInteger(row.creatorShareNex) ? row.creatorShareNex : 0;
      current.gifts += Number.isSafeInteger(row.quantity) ? row.quantity : 1;
      if (row.status === 'available') current.settledGifts += 1;
      daily.set(day, current);
      grossNex += row.grossNex;
      creatorShareNex += row.status === 'available' && Number.isSafeInteger(row.creatorShareNex) ? row.creatorShareNex : 0;
      gifts += Number.isSafeInteger(row.quantity) ? row.quantity : 1;
      if (row.status === 'available') settledGifts += 1;
    }
    return { currency: 'NEX' as const, windowDays: days, source: 'verified_creatorEarnings', truncated: snapshot.size === 1000,
      totals: { grossNex, creatorShareNex, gifts, settledGifts }, daily: [...daily.entries()].sort(([a],[b]) => a.localeCompare(b)).map(([day, value]) => ({ day, ...value })) };
  } catch {
    throw new HttpsError('unavailable', 'Verified gift analytics are temporarily unavailable.');
  }
});

export const createGiftCompetition = onCall({ maxInstances: 5 }, async request => {
  const actorId = uid(request);
  if (!finance(request)) throw new HttpsError('permission-denied', 'Finance administrator access is required to publish a GIFTVERSE competition.');
  const { title, liveSessionId, startsAt, endsAt } = request.data || {};
  if (typeof title !== 'string' || title.trim().length < 4 || title.trim().length > 80 || !safeId(liveSessionId)
    || typeof startsAt !== 'string' || typeof endsAt !== 'string') throw new HttpsError('invalid-argument', 'Competition title, live session and ISO start/end times are required.');
  const start = new Date(startsAt), end = new Date(endsAt);
  if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime()) || end <= start || end.getTime() - start.getTime() > 7 * 86400000) {
    throw new HttpsError('invalid-argument', 'Competition duration must be positive and no longer than seven days.');
  }
  const session = await db.collection('liveSessions').doc(liveSessionId).get();
  if (!session.exists) throw new HttpsError('not-found', 'The live session does not exist.');
  const ref = db.collection('giftCompetitions').doc();
  await ref.create({ title: title.trim(), liveSessionId, startsAt: Timestamp.fromDate(start), endsAt: Timestamp.fromDate(end),
    status: 'scheduled', currency: 'NEX', prizePoolNex: 0, createdBy: actorId, createdAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp() });
  return { competitionId: ref.id, status: 'scheduled' as const };
});

export const getActiveGiftCompetitions = onCall({ maxInstances: 10 }, async request => {
  uid(request);
  const now = Timestamp.now();
  const snapshot = await db.collection('giftCompetitions').where('status', 'in', ['scheduled','active']).orderBy('startsAt', 'asc').limit(30).get();
  return { competitions: snapshot.docs.map(doc => {
    const row = doc.data();
    const start = row.startsAt?.toDate?.();
    const end = row.endsAt?.toDate?.();
    const status = end && end <= now.toDate() ? 'ended' : start && start <= now.toDate() ? 'active' : 'scheduled';
    return { id: doc.id, title: row.title, liveSessionId: row.liveSessionId, startsAt: start?.toISOString() || null,
      endsAt: end?.toISOString() || null, status, currency: 'NEX' };
  }) };
});

export const getGiftCompetitionLeaderboard = onCall({ maxInstances: 10 }, async request => {
  uid(request);
  const competitionId = request.data?.competitionId;
  if (!safeId(competitionId)) throw new HttpsError('invalid-argument', 'A valid competition is required.');
  const competition = await db.collection('giftCompetitions').doc(competitionId).get();
  if (!competition.exists) throw new HttpsError('not-found', 'This competition is unavailable.');
  const snapshot = await db.collection('creatorEarnings').where('competitionId', '==', competitionId).orderBy('grossNex', 'desc').limit(100).get();
  const totals = new Map<string, number>();
  for (const item of snapshot.docs) {
    const row = item.data();
    if (typeof row.creatorId === 'string' && Number.isSafeInteger(row.grossNex) && row.grossNex > 0) totals.set(row.creatorId, (totals.get(row.creatorId) || 0) + row.grossNex);
  }
  return { competitionId, currency: 'NEX' as const, leaderboard: [...totals.entries()].sort((a,b) => b[1]-a[1]).slice(0,50).map(([creatorId,grossNex], index) => ({ rank:index+1, creatorId, grossNex })) };
});

export const getGiftRiskReviewQueue = onCall({ maxInstances: 5 }, async request => {
  uid(request);
  if (!finance(request)) throw new HttpsError('permission-denied', 'Finance administrator access is required.');
  const snapshot = await db.collection('giftRiskSignals').where('disposition', '==', 'review_only').where('tier', 'in', ['review','high']).orderBy('createdAt', 'desc').limit(100).get();
  return { records: snapshot.docs.map(doc => ({ id: doc.id, ...doc.data(), createdAt: doc.data().createdAt?.toDate?.()?.toISOString?.() || null })) };
});

export const setCreatorPayoutBeneficiary = onCall({ maxInstances: 5 }, async request => {
  const actorId = uid(request);
  if (!finance(request)) throw new HttpsError('permission-denied', 'Finance administrator access is required.');
  const creatorId = request.data?.creatorId;
  const providerBeneficiaryRef = request.data?.providerBeneficiaryRef;
  if (!safeId(creatorId) || typeof providerBeneficiaryRef !== 'string' || !/^[A-Za-z0-9_-]{8,120}$/.test(providerBeneficiaryRef)) {
    throw new HttpsError('invalid-argument', 'A creator ID and provider-issued beneficiary token are required. Raw bank details are not accepted.');
  }
  const ref = db.collection('creatorPayoutBeneficiaries').doc(creatorId);
  await db.runTransaction(async tx => {
    const existing = await tx.get(ref);
    tx.set(ref, { creatorId, providerBeneficiaryRef, provider: 'paystack', currency: 'NGN',
      status: 'verified', verifiedBy: actorId, verifiedAt: FieldValue.serverTimestamp(),
      createdAt: existing.data()?.createdAt || FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp() });
    const audit = db.collection('creatorPayoutAuditEvents').doc();
    tx.create(audit, { creatorId, actorId, action: 'beneficiary_verified', provider: 'paystack',
      createdAt: FieldValue.serverTimestamp(), source: 'trusted_finance_admin' });
  });
  return { creatorId, status: 'verified' as const, provider: 'paystack', currency: 'NGN' as const };
});

export const resolveGiftRiskSignal = onCall({ maxInstances: 5 }, async request => {
  const actorId = uid(request);
  if (!finance(request)) throw new HttpsError('permission-denied', 'Finance administrator access is required.');
  const signalId = request.data?.signalId;
  const outcome = request.data?.outcome;
  const note = request.data?.note;
  if (!safeId(signalId) || !['cleared','escalated'].includes(outcome)
    || typeof note !== 'string' || note.trim().length < 8 || note.trim().length > 500) {
    throw new HttpsError('invalid-argument', 'A risk signal, supported outcome and review note are required.');
  }
  const ref = db.collection('giftRiskSignals').doc(signalId);
  await db.runTransaction(async tx => {
    const snapshot = await tx.get(ref);
    if (!snapshot.exists) throw new HttpsError('not-found', 'This risk signal does not exist.');
    const current = snapshot.data() || {};
    if (current.disposition === 'cleared' || current.disposition === 'escalated') {
      throw new HttpsError('failed-precondition', 'This risk signal has already been reviewed.');
    }
    tx.update(ref, { disposition: outcome, reviewedBy: actorId, reviewedAt: FieldValue.serverTimestamp() });
    const audit = db.collection('giftRiskReviewAudit').doc();
    tx.create(audit, { signalId, senderId: current.senderId, creatorId: current.creatorId,
      actorId, outcome, note: note.trim(), score: current.score, tier: current.tier,
      createdAt: FieldValue.serverTimestamp() });
  });
  return { signalId, disposition: outcome as 'cleared'|'escalated' };
});
