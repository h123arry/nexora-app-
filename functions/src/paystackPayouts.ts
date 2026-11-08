import { createHmac, randomUUID } from 'node:crypto';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import { defineSecret } from 'firebase-functions/params';
import { HttpsError, onCall, onRequest } from 'firebase-functions/v2/https';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { getFirebaseAdminApp, resolveFirebaseProjectId, resolveFirestoreDatabaseId, PRODUCTION_FIREBASE_PROJECT_ID } from './runtimeConfig.js';
import { applyNexBalanceEntries, buildNexTransferEntries } from './nexLedgerPolicy.js';
import { calculateNgnPayoutKobo, livePayoutGatesPassed, verifyPaystackWebhookSignature } from './paystackPayoutPolicy.js';

const db = getFirestore(getFirebaseAdminApp(), resolveFirestoreDatabaseId());
const PAYSTACK_SECRET_KEY = defineSecret('PAYSTACK_SECRET_KEY');
const PAYSTACK_WEBHOOK_SECRET = defineSecret('PAYSTACK_WEBHOOK_SECRET');
const PAYSTACK_API = 'https://api.paystack.co';
class PaystackApiError extends Error {
  constructor(message: string, readonly statusCode: number) { super(message); }
}
type TransferStatus = 'processing' | 'submission_unknown' | 'awaiting_provider_approval' | 'success' | 'failed' | 'reversed';

function requireUser(request: { auth?: { uid: string; token?: Record<string, unknown> } | null }): string {
  if (!request.auth?.uid) throw new HttpsError('unauthenticated', 'Sign in to continue.');
  return request.auth.uid;
}
function recentlyAuthenticated(request: { auth?: { token?: Record<string, unknown> } | null }): boolean {
  const authTime = request.auth?.token?.auth_time;
  const now = Date.now() / 1000;
  return typeof authTime === 'number' && Number.isSafeInteger(authTime) && authTime <= now && now - authTime <= 300;
}
function isFinance(request: { auth?: { token?: Record<string, unknown> } | null }): boolean {
  const token = request.auth?.token || {};
  return token.finance_admin === true || token.admin === true || token.role === 'finance_admin' || token.role === 'founder';
}
function safeCounter(value: unknown): number {
  if (value === undefined) return 0;
  if (!Number.isSafeInteger(value) || (value as number) < 0) throw new Error('NEX wallet counters are invalid.');
  return value as number;
}
function safeText(value: unknown, max = 120): value is string {
  return typeof value === 'string' && value.trim().length > 0 && value.length <= max;
}
function isProductionRuntime(): boolean {
  const environment = process.env.NEXORA_ENV?.trim() || (process.env.FIRESTORE_EMULATOR_HOST ? 'local' : 'production');
  return environment === 'production' && resolveFirebaseProjectId() === PRODUCTION_FIREBASE_PROJECT_ID;
}
function providerMode(secret: string): 'test' | 'live' | 'unknown' {
  if (secret.startsWith('sk_test_')) return 'test';
  if (secret.startsWith('sk_live_')) return 'live';
  return 'unknown';
}
async function paystack(path: string, method: 'GET' | 'POST', body?: Record<string, unknown>) {
  const secret = PAYSTACK_SECRET_KEY.value();
  if (!secret || providerMode(secret) === 'unknown') throw new Error('Paystack secret is missing or invalid.');
  const response = await fetch(PAYSTACK_API + path, {
    method, headers: { Authorization: 'Bearer ' + secret, 'Content-Type': 'application/json' },
    ...(body ? { body: JSON.stringify(body) } : {}), signal: AbortSignal.timeout(15000),
  });
  const payload = await response.json() as { status?: boolean; message?: string; data?: any };
  if (!response.ok || payload.status !== true) throw new PaystackApiError(typeof payload.message === 'string' ? payload.message : 'Paystack request failed.', response.status);
  return payload.data;
}
async function payoutPolicy() {
  const snapshot = await db.collection('platformConfig').doc('ngnPayoutPolicy').get();
  return snapshot.data() || {};
}
function normalizeAccountName(value: string): string {
  return value.toLocaleUpperCase('en-NG').replace(/[^A-Z0-9]/g, '');
}

export const getNgnPayoutProviderStatus = onCall({ secrets: [PAYSTACK_SECRET_KEY] }, async request => {
  requireUser(request);
  const secret = PAYSTACK_SECRET_KEY.value();
  const mode = providerMode(secret);
  const policy = await payoutPolicy();
  let credentialsVerified = false;
  let ngnBalanceKobo: number | null = null;
  if (mode !== 'unknown') {
    try {
      const balances = await paystack('/balance', 'GET');
      credentialsVerified = true;
      const ngn = Array.isArray(balances) ? balances.find((entry: any) => entry.currency === 'NGN') : null;
      ngnBalanceKobo = Number.isSafeInteger(ngn?.balance) ? ngn.balance : null;
    } catch { credentialsVerified = false; }
  }
  return {
    provider: 'paystack', configured: mode !== 'unknown', credentialsVerified, ngnBalanceKobo, mode,
    corridor: 'NG-NGN', transferFeatureEnabled: policy.enabled === true && ((mode === 'test' && !isProductionRuntime()) || (mode === 'live' && isProductionRuntime() && livePayoutGatesPassed(policy))),
    liveSettlementApproved: policy.liveSettlementApproved === true,
    cashWithdrawalsEnabled: policy.enabled === true && mode === 'live' && isProductionRuntime() && livePayoutGatesPassed(policy),
    rateConfigured: Number.isSafeInteger(policy.koboPerNex) && policy.koboPerNex > 0 && Number.isSafeInteger(policy.providerFeeBufferKobo),
    blocker: !secret ? 'provider_secret_missing' : mode === 'unknown' ? 'provider_secret_invalid' : !credentialsVerified ? 'provider_credentials_unverified'
      : mode === 'test' && isProductionRuntime() ? 'test_transfers_blocked_in_production'
      : mode === 'live' && !isProductionRuntime() ? 'live_transfers_require_production'
      : !Number.isSafeInteger(policy.koboPerNex) ? 'ngn_rate_not_approved'
      : policy.enabled !== true ? 'withdrawals_not_enabled_by_finance'
      : mode === 'test' && isProductionRuntime() ? 'test_transfers_blocked_in_production'
      : mode === 'live' && !isProductionRuntime() ? 'live_transfers_require_production'
      : mode === 'live' && !livePayoutGatesPassed(policy) ? 'live_settlement_gates_incomplete' : null,
  };
});

export const getNgnPayoutPolicyForFinance = onCall({ secrets: [PAYSTACK_SECRET_KEY, PAYSTACK_WEBHOOK_SECRET], maxInstances: 3 }, async request => {
  requireUser(request);
  if (!isFinance(request)) throw new HttpsError('permission-denied', 'Finance administrator access is required.');
  const policy = await payoutPolicy();
  let credentialsVerified = false;
  let ngnBalanceKobo: number | null = null;
  try {
    const balances = await paystack('/balance', 'GET');
    credentialsVerified = true;
    const ngn = Array.isArray(balances) ? balances.find((entry: any) => entry.currency === 'NGN') : null;
    ngnBalanceKobo = Number.isSafeInteger(ngn?.balance) ? ngn.balance : null;
  } catch { credentialsVerified = false; }
  return {
    credentialsVerified, ngnBalanceKobo, webhookSecretConfigured: PAYSTACK_WEBHOOK_SECRET.value().startsWith('whsec_'),
    mode: providerMode(PAYSTACK_SECRET_KEY.value()), enabled: policy.enabled === true,
    koboPerNex: policy.koboPerNex ?? null, providerFeeBufferKobo: policy.providerFeeBufferKobo ?? null,
    minimumNex: policy.minimumNex ?? null, maximumNex: policy.maximumNex ?? null,
    liveSettlementApproved: policy.liveSettlementApproved === true,
    providerBusinessVerified: policy.providerBusinessVerified === true,
    settlementFundingVerified: policy.settlementFundingVerified === true,
    complianceApproved: policy.complianceApproved === true,
    webhookVerified: policy.webhookVerified === true,
    liveTestTransferVerified: policy.liveTestTransferVerified === true,
    liveEvidenceReference: policy.liveEvidenceReference || '',
  };
});

export const getNgnPayoutOtpQueue = onCall({ maxInstances: 3 }, async request => {
  requireUser(request);
  if (!isFinance(request)) throw new HttpsError('permission-denied', 'Finance administrator access is required.');
  const snapshot = await db.collection('creatorPayoutRequests').where('status', '==', 'awaiting_provider_approval')
    .orderBy('createdAt', 'asc').limit(50).get();
  return { records: snapshot.docs.map(doc => {
    const row = doc.data();
    return { reference: doc.id, creatorId: row.creatorId, amountNex: row.amountNex,
      amountKobo: row.amountKobo, transferCode: row.providerTransferCode || null,
      createdAt: row.createdAt?.toDate?.()?.toISOString?.() || null };
  }) };
});

export const finalizeNgnPayoutTransfer = onCall({ secrets: [PAYSTACK_SECRET_KEY], maxInstances: 3 }, async request => {
  const actorId = requireUser(request);
  if (!isFinance(request)) throw new HttpsError('permission-denied', 'Finance administrator access is required.');
  if (!recentlyAuthenticated(request)) throw new HttpsError('failed-precondition', 'Re-authenticate before approving a provider transfer.');
  const reference = request.data?.reference;
  const otp = request.data?.otp;
  if (!safeText(reference, 80) || typeof otp !== 'string' || !/^\d{4,8}$/.test(otp)) {
    throw new HttpsError('invalid-argument', 'A payout reference and valid provider OTP are required.');
  }
  const payoutRef = db.collection('creatorPayoutRequests').doc(reference);
  const payout = await payoutRef.get();
  if (!payout.exists || payout.data()?.status !== 'awaiting_provider_approval' || !safeText(payout.data()?.providerTransferCode, 120)) {
    throw new HttpsError('failed-precondition', 'This payout is not waiting for provider OTP approval.');
  }
  try {
    const result = await paystack('/transfer/finalize_transfer', 'POST', {
      transfer_code: payout.data()?.providerTransferCode, otp,
    });
    const providerStatus = String(result.status || 'pending');
    if (providerStatus === 'success' || providerStatus === 'failed' || providerStatus === 'reversed') {
      await applyProviderOutcome(reference, providerStatus, 'finalize_' + providerStatus + '_' + reference);
    } else {
      await updatePayoutUnlessTerminal(reference, 'processing', { providerStatus, finalizedBy: actorId,
        finalizedAt: FieldValue.serverTimestamp() });
    }
    await db.collection('creatorPayoutAuditEvents').add({
      creatorId: payout.data()?.creatorId, actorId, action: 'provider_transfer_otp_finalized',
      provider: 'paystack', reference, createdAt: FieldValue.serverTimestamp(),
    });
    const finalPayout = await payoutRef.get();
    return { reference, status: String(finalPayout.data()?.status || providerStatus) };
  } catch {
    throw new HttpsError('failed-precondition', 'Paystack did not accept the OTP. The payout remains reserved for retry or reconciliation.');
  }
});

export const getCreatorPayoutComplianceQueue = onCall({ maxInstances: 3 }, async request => {
  requireUser(request);
  if (!isFinance(request)) throw new HttpsError('permission-denied', 'Finance administrator access is required.');
  const snapshot = await db.collection('creatorPayoutBeneficiaries').where('status', '==', 'verified').orderBy('updatedAt', 'desc').limit(100).get();
  const rows = await Promise.all(snapshot.docs.map(async doc => {
    const beneficiary = doc.data();
    const compliance = await db.collection('creatorPayoutCompliance').doc(doc.id).get();
    const review = compliance.data() || {};
    const status = review.beneficiaryRef === beneficiary.providerBeneficiaryRef ? review.status : 'pending';
    return {
      creatorId: doc.id, beneficiaryRef: beneficiary.providerBeneficiaryRef,
      accountName: beneficiary.accountName || '', accountNumberLast4: beneficiary.accountNumberLast4 || '',
      bankName: beneficiary.bankName || '', complianceStatus: status,
    };
  }));
  return { records: rows.filter(row => row.complianceStatus !== 'approved') };
});

export const configureNgnPayoutPolicy = onCall({ secrets: [PAYSTACK_SECRET_KEY, PAYSTACK_WEBHOOK_SECRET], maxInstances: 2 }, async request => {
  const actorId = requireUser(request);
  if (!isFinance(request)) throw new HttpsError('permission-denied', 'Finance administrator access is required.');
  if (!recentlyAuthenticated(request)) throw new HttpsError('failed-precondition', 'Re-authenticate before changing payout controls.');
  const { enabled, koboPerNex, liveSettlementApproved, minimumNex, maximumNex, providerBusinessVerified, settlementFundingVerified, complianceApproved, webhookVerified, liveTestTransferVerified } = request.data || {};
  const providerFeeBufferKobo = request.data?.providerFeeBufferKobo ?? 0;
  const liveEvidenceReference = request.data?.liveEvidenceReference;
  if (typeof enabled !== 'boolean' || !Number.isSafeInteger(koboPerNex) || koboPerNex < 1 || koboPerNex > 100000000
    || !Number.isSafeInteger(minimumNex) || minimumNex < 1000 || !Number.isSafeInteger(maximumNex)
    || maximumNex < minimumNex || maximumNex > 10000000 || typeof liveSettlementApproved !== 'boolean'
    || !Number.isSafeInteger(providerFeeBufferKobo) || providerFeeBufferKobo < 0 || providerFeeBufferKobo > 10000000
   ) {
    throw new HttpsError('invalid-argument', 'A reviewed NEX/NGN rate, withdrawal limits and explicit enablement decision are required.');
  }
  const mode = providerMode(PAYSTACK_SECRET_KEY.value());
  if (mode === 'live' && !isProductionRuntime()) throw new HttpsError('failed-precondition', 'Live Paystack credentials may only be enabled in the production Firebase environment.');
  if (mode === 'test' && isProductionRuntime() && enabled) throw new HttpsError('failed-precondition', 'Test Paystack transfers are blocked in production. Use the isolated staging project.');
  if (enabled && mode !== 'unknown') {
    try { await paystack('/balance', 'GET'); }
    catch { throw new HttpsError('failed-precondition', 'Paystack credentials could not be authenticated. Verify the environment key before enabling payouts.'); }
  }
  if (enabled && mode === 'unknown') throw new HttpsError('failed-precondition', 'A valid Paystack secret is required before enabling transfers.');
  if (mode === 'live' && enabled && !PAYSTACK_WEBHOOK_SECRET.value().startsWith('whsec_')) {
    throw new HttpsError('failed-precondition', 'A production Paystack webhook signing secret is required before live withdrawals can be enabled.');
  }
  if (mode === 'live' && enabled && (liveSettlementApproved !== true || providerBusinessVerified !== true || settlementFundingVerified !== true || complianceApproved !== true || webhookVerified !== true || liveTestTransferVerified !== true || providerFeeBufferKobo <= 0 || !safeText(liveEvidenceReference, 160))) {
    throw new HttpsError('failed-precondition', 'Live transfers require verified registered-business status, funded settlement balance, compliance approval, verified webhooks and a successful controlled live test transfer.');
  }
  if (mode !== 'live' && liveSettlementApproved) throw new HttpsError('failed-precondition', 'Live settlement approval can only be recorded with live credentials.');
  await db.collection('platformConfig').doc('ngnPayoutPolicy').set({
    provider: 'paystack', corridor: 'NG-NGN', enabled, koboPerNex, minimumNex, maximumNex,
    liveSettlementApproved, providerFeeBufferKobo, liveEvidenceReference: safeText(liveEvidenceReference, 160) ? liveEvidenceReference : null, providerBusinessVerified: providerBusinessVerified === true, settlementFundingVerified: settlementFundingVerified === true, complianceApproved: complianceApproved === true, webhookVerified: webhookVerified === true, liveTestTransferVerified: liveTestTransferVerified === true, mode, configuredBy: actorId, updatedAt: FieldValue.serverTimestamp(),
  }, { merge: true });
  await db.collection('creatorPayoutAuditEvents').add({
    actorId, action: 'ngn_payout_policy_updated', mode, enabled, koboPerNex, minimumNex, maximumNex,
    liveSettlementApproved, providerFeeBufferKobo, liveEvidenceReference: safeText(liveEvidenceReference, 160) ? liveEvidenceReference : null, providerBusinessVerified: providerBusinessVerified === true, settlementFundingVerified: settlementFundingVerified === true, complianceApproved: complianceApproved === true, webhookVerified: webhookVerified === true, liveTestTransferVerified: liveTestTransferVerified === true, createdAt: FieldValue.serverTimestamp(),
  });
  return { saved: true, mode, enabled, liveSettlementApproved };
});

export const getNgnBanks = onCall({ secrets: [PAYSTACK_SECRET_KEY] }, async request => {
  requireUser(request);
  try {
    const data = await paystack('/bank?currency=NGN&perPage=100', 'GET');
    return { banks: (Array.isArray(data) ? data : []).filter((bank: any) => bank.active !== false)
      .map((bank: any) => ({ name: String(bank.name || ''), code: String(bank.code || ''), slug: String(bank.slug || '') }))
      .filter((bank: any) => bank.name && bank.code) };
  } catch {
    throw new HttpsError('unavailable', 'Nigerian bank directory is temporarily unavailable.');
  }
});

export const resolveNgnBankAccount = onCall({ secrets: [PAYSTACK_SECRET_KEY] }, async request => {
  requireUser(request);
  const accountNumber = request.data?.accountNumber;
  const bankCode = request.data?.bankCode;
  if (typeof accountNumber !== 'string' || !/^\d{10}$/.test(accountNumber) || typeof bankCode !== 'string' || !/^[A-Za-z0-9_-]{2,12}$/.test(bankCode)) {
    throw new HttpsError('invalid-argument', 'Enter a valid 10-digit Nigerian account number and select a bank.');
  }
  try {
    const result = await paystack('/bank/resolve?account_number=' + encodeURIComponent(accountNumber) + '&bank_code=' + encodeURIComponent(bankCode), 'GET');
    if (!safeText(result.account_name, 160) || String(result.account_number) !== accountNumber) throw new Error('Account details could not be verified.');
    return { verified: true, accountName: result.account_name, accountNumberLast4: accountNumber.slice(-4), bankCode };
  } catch {
    throw new HttpsError('failed-precondition', 'Paystack could not verify this bank account. Check the details and try again.');
  }
});

export const setCreatorPayoutBeneficiary = onCall({ secrets: [PAYSTACK_SECRET_KEY], maxInstances: 5 }, async request => {
  const creatorId = requireUser(request);
  if (request.auth?.token?.email_verified !== true) throw new HttpsError('failed-precondition', 'Verify your NEXORA email before adding a withdrawal account.');
  if (!recentlyAuthenticated(request)) throw new HttpsError('failed-precondition', 'Sign in again before changing your withdrawal account.');
  const accountNumber = request.data?.accountNumber;
  const bankCode = request.data?.bankCode;
  const expectedAccountName = request.data?.confirmedAccountName;
  if (typeof accountNumber !== 'string' || !/^\d{10}$/.test(accountNumber) || typeof bankCode !== 'string'
    || !/^[A-Za-z0-9_-]{2,12}$/.test(bankCode) || !safeText(expectedAccountName, 160)) {
    throw new HttpsError('invalid-argument', 'Verified account details and confirmation of the displayed account name are required.');
  }
  try {
    const resolved = await paystack('/bank/resolve?account_number=' + encodeURIComponent(accountNumber) + '&bank_code=' + encodeURIComponent(bankCode), 'GET');
    if (!safeText(resolved.account_name, 160) || normalizeAccountName(resolved.account_name) !== normalizeAccountName(expectedAccountName)
      || String(resolved.account_number) !== accountNumber) {
      throw new HttpsError('failed-precondition', 'The confirmed account name does not match Paystack verification.');
    }
    const profile = await db.collection('users').doc(creatorId).get();
    const email = profile.data()?.email || request.auth?.token?.email;
    if (!safeText(email, 254)) throw new HttpsError('failed-precondition', 'Add and verify an email address before registering a beneficiary.');
    const bank = await paystack('/bank?currency=NGN&perPage=100', 'GET');
    const bankName = (Array.isArray(bank) ? bank : []).find((item: any) => String(item.code) === bankCode)?.name || 'Nigerian bank';
    const recipient = await paystack('/transferrecipient', 'POST', {
      type: 'nuban', name: resolved.account_name, account_number: accountNumber, bank_code: bankCode,
      currency: 'NGN', email,
    });
    if (!safeText(recipient.recipient_code, 120) || recipient.active !== true || recipient.currency !== 'NGN'
      || String(recipient.details?.account_number || '') !== accountNumber) {
      throw new Error('Paystack did not return an active NGN beneficiary.');
    }
    const ref = db.collection('creatorPayoutBeneficiaries').doc(creatorId);
    await db.runTransaction(async tx => {
      const prior = await tx.get(ref);
      tx.set(ref, {
        creatorId, provider: 'paystack', currency: 'NGN', providerBeneficiaryRef: recipient.recipient_code,
        status: 'verified', accountName: resolved.account_name, accountNumberLast4: accountNumber.slice(-4),
        bankCode, bankName, verifiedAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp(),
        createdAt: prior.data()?.createdAt || FieldValue.serverTimestamp(), verifiedBy: 'paystack_account_resolution_and_recipient',
      });
      const audit = db.collection('creatorPayoutAuditEvents').doc();
      tx.create(audit, { creatorId, action: 'beneficiary_verified', provider: 'paystack', accountNumberLast4: accountNumber.slice(-4),
        bankCode, actorId: creatorId, createdAt: FieldValue.serverTimestamp() });
    });
    return { creatorId, status: 'verified', accountName: resolved.account_name, accountNumberLast4: accountNumber.slice(-4), bankName };
  } catch (error) {
    if (error instanceof HttpsError) throw error;
    throw new HttpsError('failed-precondition', 'The beneficiary could not be verified and registered with Paystack.');
  }
});

export const reviewCreatorPayoutCompliance = onCall({ maxInstances: 3 }, async request => {
  const actorId = requireUser(request);
  if (!isFinance(request)) throw new HttpsError('permission-denied', 'Finance administrator access is required.');
  if (!recentlyAuthenticated(request)) throw new HttpsError('failed-precondition', 'Re-authenticate before changing payout controls.');
  const creatorId = request.data?.creatorId;
  const beneficiaryRef = request.data?.beneficiaryRef;
  const decision = request.data?.decision;
  const evidenceReference = request.data?.evidenceReference;
  const bankAccountNameMatched = request.data?.bankAccountNameMatched;
  if (typeof creatorId !== 'string' || !/^[A-Za-z0-9._:-]{1,160}$/.test(creatorId)
    || !safeText(beneficiaryRef, 120) || !['approved','rejected'].includes(decision)
    || !safeText(evidenceReference, 160) || typeof bankAccountNameMatched !== 'boolean'
    || (decision === 'approved' && bankAccountNameMatched !== true)) {
    throw new HttpsError('invalid-argument', 'Creator, current beneficiary, evidence reference and verified account-name match are required.');
  }
  const beneficiary = await db.collection('creatorPayoutBeneficiaries').doc(creatorId).get();
  if (!beneficiary.exists || beneficiary.data()?.providerBeneficiaryRef !== beneficiaryRef || beneficiary.data()?.status !== 'verified') {
    throw new HttpsError('failed-precondition', 'Review the creator’s current verified beneficiary before approving compliance.');
  }
  await db.collection('creatorPayoutCompliance').doc(creatorId).set({
    creatorId, beneficiaryRef, status: decision, bankAccountNameMatched,
    evidenceReference, reviewedBy: actorId, reviewedAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });
  await db.collection('creatorPayoutAuditEvents').add({
    creatorId, actorId, action: 'creator_payout_compliance_' + decision,
    beneficiaryRef, evidenceReference, bankAccountNameMatched,
    createdAt: FieldValue.serverTimestamp(),
  });
  return { creatorId, status: decision, beneficiaryRef };
});

export const getCreatorPayoutReadiness = onCall({ secrets: [PAYSTACK_SECRET_KEY] }, async request => {
  const creatorId = requireUser(request);
  const [profile, beneficiary, compliance, policy] = await Promise.all([
    db.collection('users').doc(creatorId).get(), db.collection('creatorPayoutBeneficiaries').doc(creatorId).get(),
    db.collection('creatorPayoutCompliance').doc(creatorId).get(), payoutPolicy(),
  ]);
  const mode = providerMode(PAYSTACK_SECRET_KEY.value());
  let credentialsVerified = false;
  if (mode !== 'unknown') { try { await paystack('/balance', 'GET'); credentialsVerified = true; } catch { credentialsVerified = false; } }
  const b = beneficiary.data() || {};
  const complianceData = compliance.data() || {};
  const complianceStatus = complianceData.beneficiaryRef === b.providerBeneficiaryRef ? complianceData.status : 'pending';
  const enabled = credentialsVerified && policy.enabled === true && Number.isSafeInteger(policy.koboPerNex) && b.status === 'verified'
    && complianceStatus === 'approved' && complianceData.bankAccountNameMatched === true
    && safeText(b.providerBeneficiaryRef, 120) && (mode === 'test' || (mode === 'live' && livePayoutGatesPassed(policy)));
  return {
    providerConfigured: credentialsVerified, credentialsVerified, provider: 'paystack', providerMode: mode, payoutEnabled: enabled && mode === 'live' && isProductionRuntime() && livePayoutGatesPassed(policy), testModeAvailable: enabled && mode === 'test' && !isProductionRuntime(),
    corridor: 'NG-NGN', currency: 'NGN', beneficiaryStatus: b.status === 'verified' ? 'verified' : 'not_configured',
    beneficiary: b.status === 'verified' ? { accountName: b.accountName, accountNumberLast4: b.accountNumberLast4, bankName: b.bankName } : null,
    complianceStatus,
    displayCurrency: profile.data()?.creatorEconomyDisplayCurrency || 'NGN',
    koboPerNex: Number.isSafeInteger(policy.koboPerNex) ? policy.koboPerNex : null,
    providerFeeBufferKobo: Number.isSafeInteger(policy.providerFeeBufferKobo) ? policy.providerFeeBufferKobo : null,
    minimumNex: Number.isSafeInteger(policy.minimumNex) ? policy.minimumNex : null,
    maximumNex: Number.isSafeInteger(policy.maximumNex) ? policy.maximumNex : null,
    cashWithdrawalEnabled: enabled && mode === 'live' && isProductionRuntime() && livePayoutGatesPassed(policy),
    blocker: mode === 'unknown' ? 'provider_secret_missing' : !credentialsVerified ? 'provider_credentials_unverified' : !policy.enabled ? 'payout_policy_disabled'
      : !Number.isSafeInteger(policy.koboPerNex) ? 'ngn_rate_not_approved' : b.status !== 'verified' ? 'verified_beneficiary_required' : complianceStatus !== 'approved' ? 'creator_compliance_review_required'
      : mode === 'live' && policy.liveSettlementApproved !== true ? 'live_settlement_not_approved' : null,
  };
});

async function applyProviderOutcome(reference: string, outcome: 'success' | 'failed' | 'reversed', eventId: string) {
  const payoutRef = db.collection('creatorPayoutRequests').doc(reference);
  const eventRef = db.collection('paystackPayoutEvents').doc(eventId);
  await db.runTransaction(async tx => {
    const [payoutSnap, eventSnap] = await Promise.all([tx.get(payoutRef), tx.get(eventRef)]);
    if (eventSnap.exists || !payoutSnap.exists) return;
    const payout = payoutSnap.data() || {};
    const prior = payout.status as TransferStatus;
    const creatorId = String(payout.creatorId || '');
    const amount = Number(payout.amountNex);
    if (!/^[A-Za-z0-9._:-]{1,160}$/.test(creatorId) || !Number.isSafeInteger(amount) || amount <= 0) {
      throw new Error('Payout record is invalid.');
    }
    const creatorRef = db.collection('nexWallets').doc(creatorId);
    const clearingId = 'nex_redemption_clearing';
    const clearingRef = db.collection('nexWallets').doc(clearingId);
    const [creatorSnap, clearingSnap] = await Promise.all([tx.get(creatorRef), tx.get(clearingRef)]);
    const creator = creatorSnap.data() || {};
    const clearing = clearingSnap.data() || {};
    const creatorAvailable = safeCounter(creator.availableBalance);
    const creatorPending = safeCounter(creator.pendingPayoutBalance);
    const creatorLifetimeDebited = safeCounter(creator.lifetimeDebited);
    const creatorLifetimeCredited = safeCounter(creator.lifetimeCredited);
    const clearingBalance = safeCounter(clearing.availableBalance);
    const clearingLifetimeCredited = safeCounter(clearing.lifetimeCredited);
    const clearingLifetimeDebited = safeCounter(clearing.lifetimeDebited);
    const now = FieldValue.serverTimestamp();
    const writeLedger = (fromId: string, toId: string, transactionId: string, requestId: string, fromBalanceAfter: number, toBalanceAfter: number) => {
      const entries = buildNexTransferEntries({ fromAccountId: fromId, toAccountId: toId, units: amount, transactionId, idempotencyKey: requestId });
      const common = { transactionId, idempotencyKey: requestId, units: amount, currency: 'NEX',
        type: 'creator_ngn_payout', description: 'NEXORA NGN bank withdrawal', actorId: 'paystack',
        payoutReference: reference, status: 'posted', createdAt: now };
      tx.create(db.collection('nexLedgerEntries').doc(entries[0].entryId), { ...common, ...entries[0] });
      tx.create(db.collection('nexLedgerEntries').doc(entries[1].entryId), { ...common, ...entries[1] });
      tx.create(db.collection('nexLedgerTransactions').doc(transactionId), {
        ...common, fromAccountId: fromId, toAccountId: toId, entryIds: [entries[0].entryId, entries[1].entryId],
      });
      tx.create(db.collection('nexLedgerRequests').doc(requestId), {
        transactionId, fromAccountId: fromId, toAccountId: toId, units: amount,
        type: 'creator_ngn_payout', actorId: 'paystack', payoutReference: reference, createdAt: now,
      });
      tx.create(db.collection('nexWallets').doc(fromId).collection('transactions').doc(transactionId), {
        ...common, direction: 'debit', balanceAfter: fromBalanceAfter, counterpartyAccountId: toId,
      });
      tx.create(db.collection('nexWallets').doc(toId).collection('transactions').doc(transactionId), {
        ...common, direction: 'credit', balanceAfter: toBalanceAfter, counterpartyAccountId: fromId,
      });
    };
    if (outcome === 'success' && prior !== 'success' && prior !== 'failed' && prior !== 'reversed') {
      if (!creatorSnap.exists || creatorPending < amount) throw new Error('Payout reserve is inconsistent.');
      const entries = buildNexTransferEntries({ fromAccountId: creatorId, toAccountId: clearingId, units: amount,
        transactionId: 'payout_' + reference + '_settle', idempotencyKey: 'payout_' + reference + '_settle_req' });
      const nextClearing = applyNexBalanceEntries(clearingBalance, entries, clearingId);
      writeLedger(creatorId, clearingId, 'payout_' + reference + '_settle', 'payout_' + reference + '_settle_req', creatorAvailable, nextClearing);
      if (creatorLifetimeDebited > Number.MAX_SAFE_INTEGER - amount || clearingLifetimeCredited > Number.MAX_SAFE_INTEGER - amount) throw new Error('NEX payout totals exceed the safe integer range.');
      tx.set(creatorRef, { pendingPayoutBalance: creatorPending - amount,
        lifetimeDebited: creatorLifetimeDebited + amount, updatedAt: now }, { merge: true });
      tx.set(clearingRef, { currency: 'NEX', availableBalance: nextClearing,
        lifetimeCredited: clearingLifetimeCredited + amount,
        lifetimeDebited: clearingLifetimeDebited, schemaVersion: 1,
        createdAt: clearing.createdAt || now, updatedAt: now }, { merge: true });
      tx.update(payoutRef, { status: 'success', providerCompletedAt: now, updatedAt: now });
    } else if ((outcome === 'failed' || outcome === 'reversed') && prior !== 'failed' && prior !== 'reversed') {
      if (!creatorSnap.exists) throw new Error('Creator wallet is missing.');
      if (prior === 'success') {
        if (outcome === 'reversed') {
          if (clearingBalance < amount) throw new Error('NEX redemption clearing balance is insufficient for reversal.');
          if (creatorLifetimeCredited > Number.MAX_SAFE_INTEGER - amount || clearingLifetimeDebited > Number.MAX_SAFE_INTEGER - amount) throw new Error('NEX reversal totals exceed the safe integer range.');
          const entries = buildNexTransferEntries({ fromAccountId: clearingId, toAccountId: creatorId, units: amount,
            transactionId: 'payout_' + reference + '_reverse', idempotencyKey: 'payout_' + reference + '_reverse_req' });
          const nextCreator = applyNexBalanceEntries(creatorAvailable, entries, creatorId);
          const nextClearing = applyNexBalanceEntries(clearingBalance, entries, clearingId);
          writeLedger(clearingId, creatorId, 'payout_' + reference + '_reverse', 'payout_' + reference + '_reverse_req', nextClearing, nextCreator);
          tx.set(creatorRef, { availableBalance: nextCreator, lifetimeCredited: creatorLifetimeCredited + amount, updatedAt: now }, { merge: true });
          tx.set(clearingRef, { availableBalance: nextClearing, lifetimeDebited: clearingLifetimeDebited + amount, updatedAt: now }, { merge: true });
        }
      } else {
        if (creatorPending < amount || creatorAvailable > Number.MAX_SAFE_INTEGER - amount) throw new Error('Payout reserve is inconsistent.');
        tx.set(creatorRef, { availableBalance: creatorAvailable + amount, pendingPayoutBalance: creatorPending - amount,
          updatedAt: now }, { merge: true });
      }
      if (prior !== 'success' || outcome === 'reversed') {
        tx.update(payoutRef, { status: outcome, providerCompletedAt: now, updatedAt: now });
      }
    }
    tx.create(eventRef, { reference, outcome, createdAt: now });
    tx.create(db.collection('creatorPayoutAuditEvents').doc(), { creatorId, action: 'provider_' + outcome,
      provider: 'paystack', reference, createdAt: now });
  });
}

async function updatePayoutUnlessTerminal(reference: string, status: TransferStatus, fields: Record<string, unknown> = {}) {
  const ref = db.collection('creatorPayoutRequests').doc(reference);
  await db.runTransaction(async tx => {
    const snapshot = await tx.get(ref);
    if (!snapshot.exists) throw new Error('Payout request is missing.');
    const current = snapshot.data()?.status;
    if (current === 'success' || current === 'failed' || current === 'reversed') return;
    tx.update(ref, { ...fields, status, updatedAt: FieldValue.serverTimestamp() });
  });
}

export const paystackPayoutWebhook = onRequest({ secrets: [PAYSTACK_SECRET_KEY, PAYSTACK_WEBHOOK_SECRET], maxInstances: 10 }, async (request, response) => {
  if (request.method !== 'POST' || !request.rawBody || !verifyPaystackWebhookSignature(request.rawBody, request.headers, PAYSTACK_WEBHOOK_SECRET.value(), PAYSTACK_SECRET_KEY.value())) {
    response.status(401).send('Invalid webhook signature'); return;
  }
  const event = request.body as { event?: string; data?: { reference?: string; status?: string; amount?: number | string; currency?: string; domain?: string } };
  const eventType = event?.event;
  const reference = event?.data?.reference;
  if (!safeText(reference, 80) || !['transfer.success','transfer.failed','transfer.reversed'].includes(String(eventType))) {
    response.status(200).send('Ignored'); return;
  }
  const outcome = eventType === 'transfer.success' ? 'success' : eventType === 'transfer.failed' ? 'failed' : 'reversed';
  try {
    const payoutSnap = await db.collection('creatorPayoutRequests').doc(reference).get();
    if (!payoutSnap.exists) { response.status(200).send('Unknown reference ignored'); return; }
    const payout = payoutSnap.data() || {};
    if (Number(event.data?.amount) !== payout.amountKobo || event.data?.currency !== 'NGN' || event.data?.domain !== payout.mode || event.data?.status !== (outcome === 'success' ? 'success' : outcome)) { response.status(400).send('Transfer amount or currency mismatch'); return; }
    await applyProviderOutcome(reference, outcome, createHmac('sha256', 'nexora-paystack-event').update(eventType + ':' + reference + ':' + String(event.data?.status || '')).digest('hex'));
    response.status(200).send('OK');
  } catch {
    response.status(500).send('Retry');
  }
});

export const requestCreatorPayout = onCall({ secrets: [PAYSTACK_SECRET_KEY], maxInstances: 5 }, async request => {
  const creatorId = requireUser(request);
  const amountNex = request.data?.amountNex;
  const idempotencyKey = request.data?.idempotencyKey;
  if (!Number.isSafeInteger(amountNex) || !safeText(idempotencyKey, 120) || idempotencyKey.length < 12) {
    throw new HttpsError('invalid-argument', 'A valid NEX amount and unique withdrawal request key are required.');
  }
  const policy = await payoutPolicy();
  const mode = providerMode(PAYSTACK_SECRET_KEY.value());
  if (policy.enabled !== true || !Number.isSafeInteger(policy.koboPerNex) || mode === 'unknown'
    || (mode === 'live' && (!isProductionRuntime() || !livePayoutGatesPassed(policy)))
    || (mode === 'test' && isProductionRuntime())) {
    throw new HttpsError('failed-precondition', 'NGN withdrawals are not enabled for this provider environment.');
  }
  if (amountNex < policy.minimumNex || amountNex > policy.maximumNex) throw new HttpsError('invalid-argument', 'The withdrawal amount is outside the approved limits.');
  if (request.auth?.token?.email_verified !== true) throw new HttpsError('failed-precondition', 'Verify your email before withdrawing.');
  if (!recentlyAuthenticated(request)) throw new HttpsError('failed-precondition', 'Sign in again before requesting a withdrawal.');
  const [beneficiarySnap, complianceSnap] = await Promise.all([
    db.collection('creatorPayoutBeneficiaries').doc(creatorId).get(), db.collection('creatorPayoutCompliance').doc(creatorId).get(),
  ]);
  const beneficiary = beneficiarySnap.data() || {};
  const compliance = complianceSnap.data() || {};
  if (beneficiary.status !== 'verified' || !safeText(beneficiary.providerBeneficiaryRef, 120)) throw new HttpsError('failed-precondition', 'Add and verify a bank beneficiary first.');
  if (compliance.status !== 'approved' || compliance.beneficiaryRef !== beneficiary.providerBeneficiaryRef || compliance.bankAccountNameMatched !== true) {
    throw new HttpsError('failed-precondition', 'Finance compliance review of this exact bank beneficiary is required before withdrawal.');
  }
  let amountKobo: number;
  try { amountKobo = calculateNgnPayoutKobo(amountNex, policy.koboPerNex); }
  catch { throw new HttpsError('failed-precondition', 'The approved NGN conversion amount is invalid.'); }
  try {
    const balances = await paystack('/balance', 'GET');
    if (mode === 'live') {
      const ngnBalance = Array.isArray(balances) ? balances.find((entry: any) => entry.currency === 'NGN')?.balance : undefined;
      if (!Number.isSafeInteger(ngnBalance) || ngnBalance < amountKobo + Number(policy.providerFeeBufferKobo || 0)) {
        throw new HttpsError('failed-precondition', 'The Paystack NGN settlement balance is insufficient for this withdrawal.');
      }
    }
  } catch (error) {
    if (error instanceof HttpsError) throw error;
    throw new HttpsError('unavailable', 'Paystack credentials or settlement balance could not be verified. No NEX was reserved.');
  }
  const reference = 'nxp_' + randomUUID().replace(/-/g, '');
  const idempotencyId = createHmac('sha256', 'nexora-payout-idempotency').update(creatorId + ':' + idempotencyKey).digest('hex');
  const payoutRef = db.collection('creatorPayoutRequests').doc(reference);
  const idemRef = db.collection('creatorPayoutIdempotency').doc(idempotencyId);
  const walletRef = db.collection('nexWallets').doc(creatorId);
  const activePayoutsQuery = db.collection('creatorPayoutRequests').where('creatorId', '==', creatorId)
    .where('status', 'in', ['submitting','processing','submission_unknown','awaiting_provider_approval']).limit(1);
  await db.runTransaction(async tx => {
    const [idem, wallet, activePayouts] = await Promise.all([tx.get(idemRef), tx.get(walletRef), tx.get(activePayoutsQuery)]);
    if (idem.exists) throw new HttpsError('already-exists', 'This withdrawal request key has already been used.');
    if (!activePayouts.empty) throw new HttpsError('failed-precondition', 'A previous withdrawal is still being processed. Wait for its provider confirmation before requesting another.');
    const data = wallet.data() || {};
    if (!Number.isSafeInteger(data.availableBalance) || data.availableBalance < amountNex) throw new HttpsError('failed-precondition', 'Your available NEX balance is insufficient.');
    const pendingBalance = safeCounter(data.pendingPayoutBalance);
    if (pendingBalance > Number.MAX_SAFE_INTEGER - amountNex) throw new HttpsError('failed-precondition', 'Your pending withdrawal total is at its safe limit.');
    tx.update(walletRef, { availableBalance: data.availableBalance - amountNex,
      pendingPayoutBalance: pendingBalance + amountNex, updatedAt: FieldValue.serverTimestamp() });
    tx.create(idemRef, { creatorId, reference, createdAt: FieldValue.serverTimestamp() });
    tx.create(payoutRef, {
      creatorId, reference, provider: 'paystack', mode, currency: 'NGN', amountNex, amountKobo,
      koboPerNex: policy.koboPerNex, beneficiaryRef: beneficiary.providerBeneficiaryRef,
      status: 'submitting', createdAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp(),
    });
  });
  try {
    const transfer = await paystack('/transfer', 'POST', {
      source: 'balance', amount: amountKobo, recipient: beneficiary.providerBeneficiaryRef,
      reference, currency: 'NGN', reason: 'NEXORA creator withdrawal',
    });
    const providerStatus = String(transfer.status || 'pending');
    const status: TransferStatus = providerStatus === 'otp' ? 'awaiting_provider_approval'
      : providerStatus === 'success' || providerStatus === 'failed' || providerStatus === 'reversed' ? providerStatus : 'processing';
    await updatePayoutUnlessTerminal(reference, status === 'awaiting_provider_approval' ? 'awaiting_provider_approval' : 'processing', {
      providerTransferCode: transfer.transfer_code || null, providerStatus,
      providerSubmittedAt: FieldValue.serverTimestamp(),
    });
    if (status === 'success' || status === 'failed' || status === 'reversed') {
      await applyProviderOutcome(reference, status, 'initiate_' + status + '_' + reference);
    }
    const finalPayout = await payoutRef.get();
    const finalStatus = String(finalPayout.data()?.status || status);
    return { reference, status: finalStatus, amountNex, amountKobo, currency: 'NGN' };
  } catch {
    // A timeout is ambiguous: the provider may have accepted the transfer.
    // Keep the reserve until reconciliation proves whether a transfer exists.
    await updatePayoutUnlessTerminal(reference, 'submission_unknown');
    const finalPayout = await payoutRef.get();
    const finalStatus = String(finalPayout.data()?.status || 'submission_unknown');
    return { reference, status: finalStatus, amountNex, amountKobo, currency: 'NGN',
      message: finalStatus === 'submission_unknown' ? 'The provider response was inconclusive. Your NEX remains reserved while the transfer is reconciled.' : 'Paystack has already confirmed an outcome for this transfer.' };
  }
});

export const reconcilePaystackCreatorPayouts = onSchedule({
  schedule: 'every 15 minutes', timeZone: 'Africa/Lagos', secrets: [PAYSTACK_SECRET_KEY], maxInstances: 1,
}, async () => {
  if (providerMode(PAYSTACK_SECRET_KEY.value()) === 'unknown') return;
  for (const status of ['submitting','processing','submission_unknown','awaiting_provider_approval']) {
    const snapshot = await db.collection('creatorPayoutRequests').where('status', '==', status).orderBy('createdAt', 'asc').limit(100).get();
    for (const doc of snapshot.docs) {
      const reference = doc.id;
      try {
        const result = await paystack('/transfer/verify/' + encodeURIComponent(reference), 'GET');
        if (Number(result.amount) !== Number(doc.data().amountKobo) || result.currency !== 'NGN' || result.reference !== reference || result.domain !== doc.data().mode || result.recipient?.recipient_code !== doc.data().beneficiaryRef) {
          throw new Error('Provider transfer does not match the NEXORA payout record.');
        }
        const providerStatus = String(result.status || '');
        if (providerStatus === 'success' || providerStatus === 'failed' || providerStatus === 'reversed') {
          await applyProviderOutcome(reference, providerStatus, 'reconcile_' + providerStatus + '_' + reference);
        } else {
          await doc.ref.update({ lastReconciledAt: FieldValue.serverTimestamp(), providerStatus, updatedAt: FieldValue.serverTimestamp() });
        }
      } catch (error) {
        const createdAt = doc.data().createdAt?.toDate?.()?.getTime?.() || 0;
        if (error instanceof PaystackApiError && error.statusCode === 404 && createdAt > 0 && Date.now() - createdAt > 30 * 60 * 1000) {
          await applyProviderOutcome(reference, 'failed', 'reconcile_not_found_' + reference);
        } else {
          await doc.ref.update({ lastReconciledAt: FieldValue.serverTimestamp(), reconciliationError: true });
        }
      }
    }
  }
});
