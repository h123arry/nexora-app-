import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import { defineSecret } from 'firebase-functions/params';
import { HttpsError, onCall, onRequest } from 'firebase-functions/v2/https';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { getFirebaseAdminApp, resolveFirestoreDatabaseId } from './runtimeConfig.js';

const db = getFirestore(getFirebaseAdminApp(), resolveFirestoreDatabaseId());
const PAYSTACK_SECRET_KEY = defineSecret('PAYSTACK_SECRET_KEY');
const PAYSTACK_WEBHOOK_SECRET = defineSecret('PAYSTACK_WEBHOOK_SECRET');
const PAYSTACK_API = 'https://api.paystack.co';
type TransferStatus = 'processing' | 'submission_unknown' | 'awaiting_provider_approval' | 'success' | 'failed' | 'reversed';

function requireUser(request: { auth?: { uid: string; token?: Record<string, unknown> } | null }): string {
  if (!request.auth?.uid) throw new HttpsError('unauthenticated', 'Sign in to continue.');
  return request.auth.uid;
}
function isFinance(request: { auth?: { token?: Record<string, unknown> } | null }): boolean {
  const token = request.auth?.token || {};
  return token.finance_admin === true || token.admin === true || token.role === 'finance_admin' || token.role === 'founder';
}
function safeText(value: unknown, max = 120): value is string {
  return typeof value === 'string' && value.trim().length > 0 && value.length <= max;
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
  if (!response.ok || payload.status !== true) throw new Error(typeof payload.message === 'string' ? payload.message : 'Paystack request failed.');
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
  return {
    provider: 'paystack', configured: mode !== 'unknown', mode,
    corridor: 'NG-NGN', transferFeatureEnabled: policy.enabled === true,
    liveSettlementApproved: policy.liveSettlementApproved === true,
    cashWithdrawalsEnabled: policy.enabled === true && mode === 'live' && policy.liveSettlementApproved === true,
    rateConfigured: Number.isSafeInteger(policy.koboPerNex) && policy.koboPerNex > 0,
    blocker: !secret ? 'provider_secret_missing' : mode === 'unknown' ? 'provider_secret_invalid'
      : !Number.isSafeInteger(policy.koboPerNex) ? 'ngn_rate_not_approved'
      : policy.enabled !== true ? 'withdrawals_not_enabled_by_finance'
      : mode === 'live' && policy.liveSettlementApproved !== true ? 'live_settlement_not_approved' : null,
  };
});

export const configureNgnPayoutPolicy = onCall({ secrets: [PAYSTACK_SECRET_KEY], maxInstances: 2 }, async request => {
  const actorId = requireUser(request);
  if (!isFinance(request)) throw new HttpsError('permission-denied', 'Finance administrator access is required.');
  const { enabled, koboPerNex, liveSettlementApproved, minimumNex, maximumNex, providerBusinessVerified, settlementFundingVerified, complianceApproved, webhookVerified, liveTestTransferVerified } = request.data || {};
  if (typeof enabled !== 'boolean' || !Number.isSafeInteger(koboPerNex) || koboPerNex < 1 || koboPerNex > 100000000
    || !Number.isSafeInteger(minimumNex) || minimumNex < 1000 || !Number.isSafeInteger(maximumNex)
    || maximumNex < minimumNex || maximumNex > 10000000 || typeof liveSettlementApproved !== 'boolean') {
    throw new HttpsError('invalid-argument', 'A reviewed NEX/NGN rate, withdrawal limits and explicit enablement decision are required.');
  }
  const mode = providerMode(PAYSTACK_SECRET_KEY.value());
  if (enabled && mode === 'unknown') throw new HttpsError('failed-precondition', 'A valid Paystack secret is required before enabling transfers.');
  if (mode === 'live' && enabled && liveSettlementApproved !== true) {
    throw new HttpsError('failed-precondition', 'Live transfers require explicit operational and compliance approval.');
  }
  if (mode !== 'live' && liveSettlementApproved) throw new HttpsError('failed-precondition', 'Live settlement approval can only be recorded with live credentials.');
  await db.collection('platformConfig').doc('ngnPayoutPolicy').set({
    provider: 'paystack', corridor: 'NG-NGN', enabled, koboPerNex, minimumNex, maximumNex,
    liveSettlementApproved, providerBusinessVerified: providerBusinessVerified === true, settlementFundingVerified: settlementFundingVerified === true, complianceApproved: complianceApproved === true, webhookVerified: webhookVerified === true, liveTestTransferVerified: liveTestTransferVerified === true, mode, configuredBy: actorId, updatedAt: FieldValue.serverTimestamp(),
  }, { merge: true });
  await db.collection('creatorPayoutAuditEvents').add({
    actorId, action: 'ngn_payout_policy_updated', mode, enabled, koboPerNex, minimumNex, maximumNex,
    liveSettlementApproved, providerBusinessVerified: providerBusinessVerified === true, settlementFundingVerified: settlementFundingVerified === true, complianceApproved: complianceApproved === true, webhookVerified: webhookVerified === true, liveTestTransferVerified: liveTestTransferVerified === true, createdAt: FieldValue.serverTimestamp(),
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

export const getCreatorPayoutReadiness = onCall({ secrets: [PAYSTACK_SECRET_KEY] }, async request => {
  const creatorId = requireUser(request);
  const [profile, beneficiary, policy] = await Promise.all([
    db.collection('users').doc(creatorId).get(), db.collection('creatorPayoutBeneficiaries').doc(creatorId).get(), payoutPolicy(),
  ]);
  const mode = providerMode(PAYSTACK_SECRET_KEY.value());
  const b = beneficiary.data() || {};
  const enabled = policy.enabled === true && Number.isSafeInteger(policy.koboPerNex) && b.status === 'verified'
    && safeText(b.providerBeneficiaryRef, 120) && (mode === 'test' || (mode === 'live' && policy.liveSettlementApproved === true));
  return {
    providerConfigured: mode !== 'unknown', provider: 'paystack', providerMode: mode, payoutEnabled: enabled && mode === 'live' && policy.liveSettlementApproved === true,
    corridor: 'NG-NGN', currency: 'NGN', beneficiaryStatus: b.status === 'verified' ? 'verified' : 'not_configured',
    beneficiary: b.status === 'verified' ? { accountName: b.accountName, accountNumberLast4: b.accountNumberLast4, bankName: b.bankName } : null,
    displayCurrency: profile.data()?.creatorEconomyDisplayCurrency || 'NGN',
    cashWithdrawalEnabled: enabled && mode === 'live' && policy.liveSettlementApproved === true,
    blocker: mode === 'unknown' ? 'provider_secret_missing' : !policy.enabled ? 'payout_policy_disabled'
      : !Number.isSafeInteger(policy.koboPerNex) ? 'ngn_rate_not_approved' : b.status !== 'verified' ? 'verified_beneficiary_required'
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
    if (outcome === 'success' && prior !== 'success' && prior !== 'failed' && prior !== 'reversed') {
      const walletRef = db.collection('nexWallets').doc(payout.creatorId);
      const wallet = await tx.get(walletRef);
      const data = wallet.data() || {};
      const pending = Number(data.pendingPayoutBalance || 0);
      if (pending < payout.amountNex) throw new Error('Payout reserve is inconsistent.');
      tx.set(walletRef, { pendingPayoutBalance: pending - payout.amountNex,
        lifetimeDebited: Number(data.lifetimeDebited || 0) + payout.amountNex, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
      tx.update(payoutRef, { status: 'success', providerCompletedAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp() });
    } else if ((outcome === 'failed' || outcome === 'reversed') && prior !== 'failed' && prior !== 'reversed') {
      const walletRef = db.collection('nexWallets').doc(payout.creatorId);
      const wallet = await tx.get(walletRef);
      const data = wallet.data() || {};
      const pending = Number(data.pendingPayoutBalance || 0);
      if (pending < payout.amountNex) throw new Error('Payout reserve is inconsistent.');
      const alreadyDebited = prior === 'success';
      tx.set(walletRef, {
        availableBalance: Number(data.availableBalance || 0) + (alreadyDebited ? 0 : payout.amountNex),
        pendingPayoutBalance: pending - (alreadyDebited ? 0 : payout.amountNex),
        lifetimeDebited: Math.max(0, Number(data.lifetimeDebited || 0) - (alreadyDebited ? payout.amountNex : 0)),
        updatedAt: FieldValue.serverTimestamp(),
      }, { merge: true });
      if (alreadyDebited) tx.set(walletRef, { availableBalance: FieldValue.increment(payout.amountNex), updatedAt: FieldValue.serverTimestamp() }, { merge: true });
      tx.update(payoutRef, { status: outcome, providerCompletedAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp() });
    }
    tx.create(eventRef, { reference, outcome, createdAt: FieldValue.serverTimestamp() });
    tx.create(db.collection('creatorPayoutAuditEvents').doc(), { creatorId: payout.creatorId, action: 'provider_' + outcome,
      provider: 'paystack', reference, createdAt: FieldValue.serverTimestamp() });
  });
}

function validPaystackSignature(raw: Buffer, headers: Record<string, string | string[] | undefined>): boolean {
  const modern = headers['paystack-signature'];
  const legacy = headers['x-paystack-signature'];
  const webhookSecret = PAYSTACK_WEBHOOK_SECRET.value();
  const secretKey = PAYSTACK_SECRET_KEY.value();
  if (typeof modern === 'string' && webhookSecret) {
    const parts = modern.split(',');
    const timestamp = Number(parts.find(part => part.startsWith('t='))?.slice(2));
    if (!Number.isFinite(timestamp) || Math.abs(Date.now() / 1000 - timestamp) > 300) return false;
    const signed = String(timestamp) + '.' + raw.toString('utf8');
    const expected = createHmac('sha512', webhookSecret).update(signed).digest('hex');
    return parts.filter(part => part.startsWith('v1=')).some(part => {
      const signature = part.slice(3).split(':').at(-1) || '';
      return /^[a-f0-9]{128}$/.test(signature) && timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(signature, 'hex'));
    });
  }
  if (typeof legacy === 'string' && secretKey) {
    const expected = createHmac('sha512', secretKey).update(raw).digest('hex');
    return /^[a-f0-9]{128}$/i.test(legacy) && timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(legacy, 'hex'));
  }
  return false;
}

export const paystackPayoutWebhook = onRequest({ secrets: [PAYSTACK_SECRET_KEY, PAYSTACK_WEBHOOK_SECRET], maxInstances: 10 }, async (request, response) => {
  if (request.method !== 'POST' || !request.rawBody || !validPaystackSignature(request.rawBody, request.headers)) {
    response.status(401).send('Invalid webhook signature'); return;
  }
  const event = request.body as { event?: string; data?: { reference?: string; status?: string } };
  const eventType = event?.event;
  const reference = event?.data?.reference;
  if (!safeText(reference, 80) || !['transfer.success','transfer.failed','transfer.reversed'].includes(String(eventType))) {
    response.status(200).send('Ignored'); return;
  }
  const outcome = eventType === 'transfer.success' ? 'success' : eventType === 'transfer.failed' ? 'failed' : 'reversed';
  try {
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
    || (mode === 'live' && policy.liveSettlementApproved !== true)) {
    throw new HttpsError('failed-precondition', 'NGN withdrawals are not enabled for this provider environment.');
  }
  if (amountNex < policy.minimumNex || amountNex > policy.maximumNex) throw new HttpsError('invalid-argument', 'The withdrawal amount is outside the approved limits.');
  if (request.auth?.token?.email_verified !== true) throw new HttpsError('failed-precondition', 'Verify your email before withdrawing.');
  const beneficiarySnap = await db.collection('creatorPayoutBeneficiaries').doc(creatorId).get();
  const beneficiary = beneficiarySnap.data() || {};
  if (beneficiary.status !== 'verified' || !safeText(beneficiary.providerBeneficiaryRef, 120)) throw new HttpsError('failed-precondition', 'Add and verify a bank beneficiary first.');
  const amountKobo = amountNex * policy.koboPerNex;
  if (!Number.isSafeInteger(amountKobo) || amountKobo <= 0) throw new HttpsError('failed-precondition', 'The approved NGN conversion amount is invalid.');
  if (mode === 'live') {\n    try {\n      const balances = await paystack('/balance?currency=NGN', 'GET');\n      const ngnBalance = Array.isArray(balances) ? balances.find((entry: any) => entry.currency === 'NGN')?.balance : undefined;\n      if (!Number.isSafeInteger(ngnBalance) || ngnBalance < amountKobo) throw new HttpsError('failed-precondition', 'The Paystack NGN settlement balance is insufficient for this withdrawal.');\n    } catch (error) {\n      if (error instanceof HttpsError) throw error;\n      throw new HttpsError('unavailable', 'Paystack settlement balance could not be verified. No NEX was reserved.');\n    }\n  }\n  const reference = 'nxp_' + randomUUID().replace(/-/g, '');
  const idempotencyId = createHmac('sha256', 'nexora-payout-idempotency').update(creatorId + ':' + idempotencyKey).digest('hex');
  const payoutRef = db.collection('creatorPayoutRequests').doc(reference);
  const idemRef = db.collection('creatorPayoutIdempotency').doc(idempotencyId);
  const walletRef = db.collection('nexWallets').doc(creatorId);
  await db.runTransaction(async tx => {
    const [idem, wallet] = await Promise.all([tx.get(idemRef), tx.get(walletRef)]);
    if (idem.exists) throw new HttpsError('already-exists', 'This withdrawal request key has already been used.');
    const data = wallet.data() || {};
    if (!Number.isSafeInteger(data.availableBalance) || data.availableBalance < amountNex) throw new HttpsError('failed-precondition', 'Your available NEX balance is insufficient.');
    tx.update(walletRef, { availableBalance: data.availableBalance - amountNex,
      pendingPayoutBalance: Number(data.pendingPayoutBalance || 0) + amountNex, updatedAt: FieldValue.serverTimestamp() });
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
    const status: TransferStatus = providerStatus === 'otp' ? 'awaiting_provider_approval' : 'processing';
    await payoutRef.update({ status, providerTransferCode: transfer.transfer_code || null, providerStatus,
      providerSubmittedAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp() });
    return { reference, status, amountNex, amountKobo, currency: 'NGN' };
  } catch {
    // A timeout is ambiguous: the provider may have accepted the transfer.
    // Keep the reserve until reconciliation proves whether a transfer exists.
    await payoutRef.update({ status: 'submission_unknown', updatedAt: FieldValue.serverTimestamp() });
    return { reference, status: 'submission_unknown', amountNex, amountKobo, currency: 'NGN',
      message: 'The provider response was inconclusive. Your NEX remains reserved while the transfer is reconciled.' };
  }
});

export const reconcilePaystackCreatorPayouts = onSchedule({
  schedule: 'every 15 minutes', timeZone: 'Africa/Lagos', secrets: [PAYSTACK_SECRET_KEY], maxInstances: 1,
}, async () => {
  if (providerMode(PAYSTACK_SECRET_KEY.value()) === 'unknown') return;
  for (const status of ['processing','submission_unknown','awaiting_provider_approval']) {
    const snapshot = await db.collection('creatorPayoutRequests').where('status', '==', status).limit(100).get();
    for (const doc of snapshot.docs) {
      const reference = doc.id;
      try {
        const result = await paystack('/transfer/verify/' + encodeURIComponent(reference), 'GET');
        const providerStatus = String(result.status || '');
        if (providerStatus === 'success' || providerStatus === 'failed' || providerStatus === 'reversed') {
          await applyProviderOutcome(reference, providerStatus, 'reconcile_' + providerStatus + '_' + reference);
        } else {
          await doc.ref.update({ lastReconciledAt: FieldValue.serverTimestamp(), providerStatus, updatedAt: FieldValue.serverTimestamp() });
        }
      } catch {
        await doc.ref.update({ lastReconciledAt: FieldValue.serverTimestamp(), reconciliationError: true });
      }
    }
  }
});
