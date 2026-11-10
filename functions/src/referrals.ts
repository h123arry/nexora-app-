import { createHash, randomBytes } from 'node:crypto';
import { FieldValue, type Firestore } from 'firebase-admin/firestore';
import { applyNexBalanceEntries, buildNexTransferEntries } from './nexLedgerPolicy.js';

const CODE_PATTERN = /^[A-Za-z0-9_-]{40,100}$/;
const MAX_REDEMPTIONS = 100;
const PROMO_ACCOUNT = 'referral_promo_pool';

function hashCode(code: string): string {
  return createHash('sha256').update(code).digest('hex');
}
function validUid(uid: unknown): uid is string {
  return typeof uid === 'string' && uid.length > 0 && uid.length <= 150 && !uid.includes('/');
}
function validBalance(value: unknown): number {
  if (value === undefined) return 0;
  if (!Number.isSafeInteger(value) || (value as number) < 0) throw new Error('A NEX wallet balance is invalid.');
  return value as number;
}

export interface ReferralProgramConfig {
  enabled: boolean;
  rewardNex: number;
  maxSuccessfulReferrals: number;
}

/** Creates an unguessable referral code. Only its SHA-256 digest is persisted. */
export async function createReferralCode(db: Firestore, uid: string): Promise<{ code: string }> {
  if (!validUid(uid)) throw new Error('A valid account is required.');
  const config = await db.collection('referralProgramConfig').doc('current').get();
  if (!config.exists || config.get('enabled') !== true) throw new Error('The referral programme is not currently available.');
  const rewardNex = config.get('rewardNex');
  const maxSuccessfulReferrals = config.get('maxSuccessfulReferrals');
  if (!Number.isSafeInteger(rewardNex) || rewardNex <= 0
    || !Number.isSafeInteger(maxSuccessfulReferrals) || maxSuccessfulReferrals <= 0) {
    throw new Error('The referral programme is not currently available.');
  }
  const treasury = await db.collection('nexWallets').doc(PROMO_ACCOUNT).get();
  if (validBalance(treasury.data()?.availableBalance) < rewardNex) {
    throw new Error('The referral programme is not currently available.');
  }
  const existingCodes = await db.collection('referralCodes').where('ownerId', '==', uid).limit(100).get();
  const activeCodeCount = existingCodes.docs.filter(doc => doc.get('status') === 'active'
    && (doc.get('expiresAt')?.toDate?.()?.getTime?.() || 0) > Date.now()).length;
  if (activeCodeCount >= 5) throw new Error('You have reached the referral-code limit.');
  const code = randomBytes(32).toString('base64url');
  await db.collection('referralCodes').doc(hashCode(code)).create({
    ownerId: uid,
    createdAt: FieldValue.serverTimestamp(),
    redemptionCount: 0,
    maxRedemptions: MAX_REDEMPTIONS,
    expiresAt: new Date(Date.now() + 30 * 86400000),
    status: 'active',
  });
  return { code };
}

/** Attach a newly authenticated account to a referral, with one attribution per account. */
export async function claimReferral(db: Firestore, inviteeUid: string, code: string): Promise<{ claimed: boolean }> {
  if (!validUid(inviteeUid) || typeof code !== 'string' || !CODE_PATTERN.test(code)) {
    throw new Error('A valid referral invitation is required.');
  }
  const codeRef = db.collection('referralCodes').doc(hashCode(code));
  const attributionRef = db.collection('referralAttributions').doc(inviteeUid);
  return db.runTransaction(async tx => {
    const [codeSnapshot, attribution] = await Promise.all([tx.get(codeRef), tx.get(attributionRef)]);
    if (attribution.exists) return { claimed: false };
    const expiresAt = codeSnapshot.get('expiresAt')?.toDate?.();
    if (!codeSnapshot.exists || codeSnapshot.get('status') !== 'active'
      || !(expiresAt instanceof Date) || expiresAt.getTime() <= Date.now()) throw new Error('This referral invitation is unavailable.');
    const ownerId = String(codeSnapshot.get('ownerId') || '');
    if (!validUid(ownerId) || ownerId === inviteeUid) throw new Error('You cannot refer your own account.');
    const count = Number(codeSnapshot.get('redemptionCount') || 0);
    const max = Number(codeSnapshot.get('maxRedemptions') || MAX_REDEMPTIONS);
    if (!Number.isSafeInteger(count) || count < 0 || count >= max) throw new Error('This referral invitation has reached its limit.');
    tx.create(attributionRef, {
      inviteeId: inviteeUid,
      referrerId: ownerId,
      codeHash: codeRef.id,
      status: 'pending',
      claimedAt: FieldValue.serverTimestamp(),
      qualifiedAt: null,
      rewardNex: 0,
    });
    tx.update(codeRef, { redemptionCount: count + 1, lastRedeemedAt: FieldValue.serverTimestamp() });
    return { claimed: true };
  });
}

/**
 * Qualifies only after the invitee has a verified account and a real public post.
 * Reward amount and funding are read from server-owned configuration and treasury.
 */
export async function qualifyReferral(
  db: Firestore,
  inviteeUid: string,
  verifiedEmail: boolean,
  qualifyingPostId: string,
): Promise<{ qualified: boolean; rewardNex: number }> {
  if (!validUid(inviteeUid) || !verifiedEmail) throw new Error('A verified account is required to qualify a referral.');
  if (typeof qualifyingPostId !== 'string' || !/^[A-Za-z0-9_-]{1,150}$/.test(qualifyingPostId)) {
    throw new Error('A valid public post is required to qualify a referral.');
  }
  const postRef = db.collection('posts').doc(qualifyingPostId);
  const attributionRef = db.collection('referralAttributions').doc(inviteeUid);
  const configRef = db.collection('referralProgramConfig').doc('current');
  const post = await postRef.get();
  if (!post.exists || post.get('userId') !== inviteeUid || post.get('audience') !== 'public') {
    throw new Error('A public post created by the invited account is required.');
  }

  return db.runTransaction(async tx => {
    const [attribution, config] = await Promise.all([tx.get(attributionRef), tx.get(configRef)]);
    if (!attribution.exists || attribution.get('status') !== 'pending') {
      return { qualified: false, rewardNex: 0 };
    }
    if (!config.exists || config.get('enabled') !== true) throw new Error('The referral programme is not currently available.');
    const rewardNex = config.get('rewardNex');
    const maxSuccessfulReferrals = config.get('maxSuccessfulReferrals');
    if (!Number.isSafeInteger(rewardNex) || rewardNex <= 0
      || !Number.isSafeInteger(maxSuccessfulReferrals) || maxSuccessfulReferrals <= 0) {
      throw new Error('Referral reward configuration is invalid.');
    }
    const referrerId = String(attribution.get('referrerId') || '');
    if (!validUid(referrerId) || referrerId === inviteeUid) throw new Error('Referral attribution is invalid.');
    const successful = await tx.get(db.collection('referralAttributions')
      .where('referrerId', '==', referrerId));
    if (successful.docs.filter(doc => doc.get('status') === 'qualified').length >= maxSuccessfulReferrals) {
      tx.update(attributionRef, { status: 'capped', qualifiedAt: FieldValue.serverTimestamp(), rewardNex: 0 });
      return { qualified: false, rewardNex: 0 };
    }
    const referrerWallet = db.collection('nexWallets').doc(referrerId);
    const promoWallet = db.collection('nexWallets').doc(PROMO_ACCOUNT);
    const [referrerSnapshot, promoSnapshot] = await Promise.all([tx.get(referrerWallet), tx.get(promoWallet)]);
    const referrerBalance = validBalance(referrerSnapshot.data()?.availableBalance);
    const promoBalance = validBalance(promoSnapshot.data()?.availableBalance);
    const transactionId = 'ref_' + createHash('sha256').update(inviteeUid).digest('hex').slice(0, 48);
    const requestId = transactionId + '_reward';
    const entries = buildNexTransferEntries({
      fromAccountId: PROMO_ACCOUNT, toAccountId: referrerId, units: rewardNex,
      transactionId, idempotencyKey: requestId,
    });
    const promoNext = applyNexBalanceEntries(promoBalance, entries, PROMO_ACCOUNT);
    const referrerNext = applyNexBalanceEntries(referrerBalance, entries, referrerId);
    const now = FieldValue.serverTimestamp();
    const common = {
      transactionId, idempotencyKey: requestId, units: rewardNex, currency: 'NEX',
      type: 'referral_reward', description: 'NEXORA verified referral reward',
      actorId: inviteeUid, status: 'posted', createdAt: now,
    };
    tx.create(db.collection('nexLedgerEntries').doc(entries[0].entryId), { ...common, ...entries[0] });
    tx.create(db.collection('nexLedgerEntries').doc(entries[1].entryId), { ...common, ...entries[1] });
    tx.create(db.collection('nexLedgerTransactions').doc(transactionId), {
      ...common, fromAccountId: PROMO_ACCOUNT, toAccountId: referrerId,
      entryIds: [entries[0].entryId, entries[1].entryId],
    });
    tx.create(db.collection('nexLedgerRequests').doc(requestId), {
      transactionId, fromAccountId: PROMO_ACCOUNT, toAccountId: referrerId,
      units: rewardNex, type: 'referral_reward', actorId: inviteeUid, createdAt: now,
    });
    tx.set(promoWallet, { availableBalance: promoNext, updatedAt: now }, { merge: true });
    tx.set(referrerWallet, { availableBalance: referrerNext, updatedAt: now }, { merge: true });
    tx.create(promoWallet.collection('transactions').doc(transactionId), {
      ...common, direction: 'debit', balanceAfter: promoNext, counterpartyAccountId: referrerId,
    });
    tx.create(referrerWallet.collection('transactions').doc(transactionId), {
      ...common, direction: 'credit', balanceAfter: referrerNext, counterpartyAccountId: PROMO_ACCOUNT,
    });
    tx.update(attributionRef, {
      status: 'qualified', rewardNex, qualifyingPostId, qualifiedAt: now,
    });
    return { qualified: true, rewardNex };
  });
}

/** Private server-side summary; clients never read attribution or code documents directly. */
export async function getReferralSummary(db: Firestore, uid: string) {
  if (!validUid(uid)) throw new Error('A valid account is required.');
  const [codes, attributions] = await Promise.all([
    db.collection('referralCodes').where('ownerId', '==', uid).limit(20).get(),
    db.collection('referralAttributions').where('referrerId', '==', uid).limit(500).get(),
  ]);
  return {
    codeCount: codes.size,
    totalInvites: attributions.size,
    pending: attributions.docs.filter(doc => doc.get('status') === 'pending').length,
    qualified: attributions.docs.filter(doc => doc.get('status') === 'qualified').length,
    rewardsNex: attributions.docs.reduce((total, doc) => total + (doc.get('status') === 'qualified' ? Number(doc.get('rewardNex') || 0) : 0), 0),
  };
}


/** Public, privacy-limited preview used by referral landing pages before sign-in. */
export async function getReferralInvitePreview(db: Firestore, code: string) {
  if (typeof code !== 'string' || !CODE_PATTERN.test(code)) return { valid: false as const };
  const [invite, config] = await Promise.all([
    db.collection('referralCodes').doc(hashCode(code)).get(),
    db.collection('referralProgramConfig').doc('current').get(),
  ]);
  const expiresAt = invite.get('expiresAt')?.toDate?.();
  const redemptionCount = Number(invite.get('redemptionCount') || 0);
  const maxRedemptions = Number(invite.get('maxRedemptions') || MAX_REDEMPTIONS);
  if (!invite.exists || invite.get('status') !== 'active' || config.get('enabled') !== true
    || !(expiresAt instanceof Date) || expiresAt.getTime() <= Date.now()
    || !Number.isSafeInteger(redemptionCount) || redemptionCount >= maxRedemptions) return { valid: false as const };
  const ownerId = String(invite.get('ownerId') || '');
  if (!validUid(ownerId)) return { valid: false as const };
  const profile = await db.collection('publicProfiles').doc(ownerId).get();
  if (!profile.exists) return { valid: true as const, inviterName: 'A NEXORA member', inviterUsername: '', inviterAvatar: '' };
  const data = profile.data() || {};
  return {
    valid: true as const,
    inviterName: typeof data.name === 'string' && data.name.trim() ? data.name.slice(0, 70) : 'A NEXORA member',
    inviterUsername: typeof data.username === 'string' ? data.username.slice(0, 40) : '',
    inviterAvatar: typeof data.avatar === 'string' ? data.avatar.slice(0, 1000) : '',
  };
}
