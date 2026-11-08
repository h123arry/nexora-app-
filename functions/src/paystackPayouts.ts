import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import { defineSecret } from 'firebase-functions/params';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { getFirebaseAdminApp, resolveFirestoreDatabaseId } from './runtimeConfig.js';
import { createNgnTransferRecipient, listNgnBanks, resolveNgnBankAccount, validateNgnBankAccountInput } from './paystackProvider.js';

const PAYSTACK_SECRET_KEY = defineSecret('PAYSTACK_SECRET_KEY');
const db = getFirestore(getFirebaseAdminApp(), resolveFirestoreDatabaseId());

function requireVerifiedCreator(request: { auth?: { uid: string; token?: Record<string, unknown> } | null }): string {
  if (!request.auth?.uid) throw new HttpsError('unauthenticated', 'Sign in to continue.');
  if (request.auth.token?.email_verified !== true && request.auth.token?.phone_number_verified !== true) {
    throw new HttpsError('failed-precondition', 'Verify your email address or phone number before adding a payout account.');
  }
  return request.auth.uid;
}

export const listCreatorPayoutBanks = onCall({ maxInstances: 5, secrets: [PAYSTACK_SECRET_KEY] }, async request => {
  requireVerifiedCreator(request);
  const secret = PAYSTACK_SECRET_KEY.value();
  if (!secret) throw new HttpsError('failed-precondition', 'NEXORA bank verification is not configured yet.');
  try {
    return { currency: 'NGN' as const, banks: await listNgnBanks(secret) };
  } catch {
    throw new HttpsError('unavailable', 'The Nigerian bank directory is temporarily unavailable.');
  }
});

export const verifyCreatorPayoutBankAccount = onCall({ maxInstances: 3, secrets: [PAYSTACK_SECRET_KEY] }, async request => {
  const creatorId = requireVerifiedCreator(request);
  const secret = PAYSTACK_SECRET_KEY.value();
  if (!secret) throw new HttpsError('failed-precondition', 'NEXORA bank verification is not configured yet.');
  let input: { accountNumber: string; bankCode: string };
  try { input = validateNgnBankAccountInput(request.data); }
  catch (error) { throw new HttpsError('invalid-argument', error instanceof Error ? error.message : 'Bank details are invalid.'); }

  const beneficiaryRef = db.collection('creatorPayoutBeneficiaries').doc(creatorId);
  try {
    const existing = await beneficiaryRef.get();
    if (existing.data()?.status === 'verified') {
      throw new HttpsError('failed-precondition', 'A verified payout account is already on file. Contact finance support to change it securely.');
    }
    const resolved = await resolveNgnBankAccount(secret, input.accountNumber, input.bankCode);
    const recipient = await createNgnTransferRecipient(secret, resolved.account_name, input.accountNumber, input.bankCode);
    const now = FieldValue.serverTimestamp();
    await db.runTransaction(async tx => {
      const current = await tx.get(beneficiaryRef);
      if (current.data()?.status === 'verified') {
        throw new HttpsError('failed-precondition', 'A verified payout account is already on file.');
      }
      tx.set(beneficiaryRef, {
        creatorId, provider: 'paystack', providerBeneficiaryRef: recipient.recipient_code,
        currency: 'NGN', status: 'pending', accountName: resolved.account_name,
        accountNumberLast4: input.accountNumber.slice(-4), bankCode: input.bankCode,
        bankName: recipient.details?.bank_name || null, accountResolvedAt: now,
        providerRecipientActive: recipient.active, updatedAt: now,
        createdAt: current.data()?.createdAt || now,
      });
      const auditRef = db.collection('creatorPayoutAuditEvents').doc();
      tx.create(auditRef, { creatorId, actorId: creatorId, action: 'paystack_bank_account_resolved',
        provider: 'paystack', currency: 'NGN', accountNumberLast4: input.accountNumber.slice(-4),
        bankCode: input.bankCode, createdAt: now, source: 'creator_self_service' });
    });
    return { status: 'pending' as const, currency: 'NGN' as const,
      accountName: resolved.account_name, accountNumberLast4: input.accountNumber.slice(-4),
      bankName: recipient.details?.bank_name || null,
      note: 'Paystack resolved this bank account. Finance and identity checks are still required before withdrawals can be enabled.' };
  } catch (error) {
    if (error instanceof HttpsError) throw error;
    throw new HttpsError('unavailable', 'NEXORA could not verify this bank account. No payout was created.');
  }
});
