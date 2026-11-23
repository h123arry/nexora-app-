import { createHash } from 'node:crypto';
import { getAuth } from 'firebase-admin/auth';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { getFirebaseAdminApp, resolveFirestoreDatabaseId } from './runtimeConfig.js';
import { assertCallableSessionActive } from './callableSession.js';
import {
  canReviewIdentityApplication,
  canSubmitIdentityApplication,
  normalizeIdentityEvidenceUrl,
  normalizeIdentityName,
  validateIdentityApplicationInput,
  canApplyIdentityImpersonationDecision,
  isSeniorIdentityImpersonationDecision,
  buildIdentityReviewNotification,
  buildIdentityCaseNotification,
} from './identityVerificationPolicy.js';

const app = getFirebaseAdminApp();
const auth = getAuth(app);
const db = getFirestore(app, resolveFirestoreDatabaseId());
type Request = { auth?: { uid: string; token?: Record<string, unknown> } | null; data?: Record<string, unknown>; rawRequest?: { headers?: { authorization?: string } } };

async function requireUid(request: Request): Promise<string> {
  if (!request.auth?.uid) throw new HttpsError('unauthenticated', 'Sign in to continue.');
  await assertCallableSessionActive(db, request.auth.uid, request.auth.token?.auth_time);
  return request.auth.uid;
}

async function currentIdentityReviewerClaims(request: Request): Promise<{ uid: string; claims: Record<string, unknown> }> {
  const uid = await requireUid(request);
  const authorization = request.rawRequest?.headers?.authorization || '';
  const token = authorization.startsWith('Bearer ') ? authorization.slice(7) : '';
  if (!token) throw new HttpsError('unauthenticated', 'A current authenticated session is required.');
  try {
    const decoded = await auth.verifyIdToken(token, true);
    if (decoded.uid !== uid) throw new HttpsError('unauthenticated', 'The authenticated session no longer matches this account.');
    await assertCallableSessionActive(db, uid, decoded.auth_time);
    return { uid, claims: decoded as Record<string, unknown> };
  } catch {
    throw new HttpsError('unauthenticated', 'Your session is expired or has been revoked. Sign in again.');
  }
}

async function requireIdentityReviewer(request: Request): Promise<string> {
  const { uid, claims } = await currentIdentityReviewerClaims(request);
  const role = typeof claims.role === 'string' ? claims.role : '';
  if (claims.moderator !== true && claims.admin !== true && !['moderator', 'senior_moderator', 'admin', 'founder'].includes(role)) {
    throw new HttpsError('permission-denied', 'Identity review access is required.');
  }
  return uid;
}

async function requireIdentityApprover(request: Request): Promise<string> {
  const { uid, claims } = await currentIdentityReviewerClaims(request);
  const role = typeof claims.role === 'string' ? claims.role : '';
  if (claims.admin !== true && claims.founder !== true && !['senior_moderator', 'admin', 'founder'].includes(role)) {
    throw new HttpsError('permission-denied', 'Senior identity review access is required to approve or reject identity claims.');
  }
  return uid;
}

async function requireFounderIdentityApprover(request: Request): Promise<string> {
  const { uid, claims } = await currentIdentityReviewerClaims(request);
  if (claims.founder !== true && claims.role !== 'founder') {
    throw new HttpsError('permission-denied', 'Only the NEXORA founder can manually grant an identity badge.');
  }
  return uid;
}

export const submitIdentityVerificationApplication = onCall({ maxInstances: 2 }, async request => {
  await requireUid(request as Request);
  throw new HttpsError(
    'failed-precondition',
    'NEXORA identity verification requests are currently closed. Please check back for future announcements.',
  );
});


// One-time, founder/admin-controlled recognition for the five selected early community members.
// The allowlist lives server-side; clients cannot choose arbitrary recipients or self-award.
const EARLY_COMMUNITY_MEMBER_UIDS = [
  'qHrq7408mKVpmkYOtzFt0jSvcfp1',
  '0zmHY588PYcSbi0TP2p1TpWUwY83',
  'bACXNpO12uRzavlSIBMpl4TJobi1',
  'HvmFq9NAboZwTninQgIRZGwjmXy1',
  '3gJsZA5KjIY0y4uMHXARqJrU1F12',
] as const;

export const grantEarlyCommunityRecognition = onCall({ maxInstances: 2 }, async request => {
  const actorId = await requireIdentityApprover(request as Request);
  const eligibleUsers = await Promise.all(EARLY_COMMUNITY_MEMBER_UIDS.map(async userId => {
    try {
      const account = await auth.getUser(userId);
      return account.disabled ? null : userId;
    } catch {
      return null;
    }
  }));
  const recipients = eligibleUsers.filter((userId): userId is (typeof EARLY_COMMUNITY_MEMBER_UIDS)[number] => userId !== null);
  const now = FieldValue.serverTimestamp();

  for (const userId of recipients) {
    const publicProfileRef = db.collection('publicProfiles').doc(userId);
    const privateProfileRef = db.collection('users').doc(userId);
    const notificationRef = db.collection('users').doc(userId).collection('notifications').doc('early_community_recognition_v1');
    const auditRef = db.collection('identityVerificationAuditEvents').doc();
    await db.runTransaction(async transaction => {
      transaction.set(publicProfileRef, { id: userId, earlyCommunityMember: true, updatedAt: now }, { merge: true });
      transaction.set(privateProfileRef, { earlyCommunityMember: true, updatedAt: now }, { merge: true });
      transaction.set(notificationRef, {
        id: 'early_community_recognition_v1',
        type: 'system',
        userId: 'system',
        username: 'nexora',
        actorName: 'NEXORA',
        avatar: '',
        targetId: userId,
        content: 'NEXORA has recognised you as an early community member. Your purple community badge is now active. No action is needed.',
        timestamp: new Date().toISOString(),
        isRead: false,
        priority: 8,
        createdAt: now,
      }, { merge: true });
      transaction.create(auditRef, {
        userId,
        actorId,
        event: 'early_community_recognition_granted',
        recognitionType: 'early_community_member',
        createdAt: now,
      });
    });
  }

  return { granted: recipients.length, skipped: EARLY_COMMUNITY_MEMBER_UIDS.length - recipients.length };
});

// Founder-only manual verification for a specifically reviewed account. The same
// verifiedIdentities record powers the public badge; evidence stays in the private
// application/audit records and every grant is attributable to the founder.
export const grantManualIdentityVerification = onCall({ maxInstances: 5 }, async request => {
  const reviewerId = await requireFounderIdentityApprover(request as Request);
  const data = request.data || {};
  const userId = typeof data.userId === 'string' ? data.userId.trim() : '';
  if (!userId || userId.length > 128 || userId.includes('/')) {
    throw new HttpsError('invalid-argument', 'Choose a valid NEXORA account to verify.');
  }
  if (userId === reviewerId) {
    throw new HttpsError('failed-precondition', 'You cannot use manual verification to award your own account.');
  }

  let identity: ReturnType<typeof validateIdentityApplicationInput>;
  try {
    identity = validateIdentityApplicationInput(data);
  } catch (error) {
    throw new HttpsError('invalid-argument', error instanceof Error ? error.message : 'Provide valid identity evidence.');
  }

  let targetAccount;
  try {
    targetAccount = await auth.getUser(userId);
  } catch {
    throw new HttpsError('not-found', 'The selected NEXORA account could not be found.');
  }
  if (targetAccount.disabled) throw new HttpsError('failed-precondition', 'This account is disabled and cannot be verified.');

  const profileRef = db.collection('users').doc(userId);
  const applicationRef = db.collection('identityVerificationApplications').doc(userId);
  const verifiedRef = db.collection('verifiedIdentities').doc(userId);
  const auditRef = db.collection('identityVerificationAuditEvents').doc();
  const notificationRef = db.collection('users').doc(userId).collection('notifications').doc('identity_manual_verification_granted_v1');
  const now = FieldValue.serverTimestamp();

  const version = await db.runTransaction(async transaction => {
    const [profile, application, existingVerified] = await Promise.all([
      transaction.get(profileRef),
      transaction.get(applicationRef),
      transaction.get(verifiedRef),
    ]);
    if (!profile.exists) throw new HttpsError('not-found', 'The selected account profile could not be found.');
    if (existingVerified.exists && existingVerified.get('status') === 'verified') {
      throw new HttpsError('already-exists', 'This account already has an active NEXORA identity badge.');
    }

    const nextVersion = Math.max(1, Number(application.get('version') || 0) + 1);
    transaction.set(applicationRef, {
      userId,
      ...identity,
      status: 'approved',
      version: nextVersion,
      submittedAt: application.exists ? application.get('submittedAt') || now : now,
      reviewNote: 'Founder-authorized manual verification after independent evidence review.',
      reviewerId,
      reviewedAt: now,
      updatedAt: now,
    }, { merge: true });
    transaction.set(verifiedRef, {
      userId,
      status: 'verified',
      identityType: identity.identityType,
      displayName: identity.displayName,
      verifiedAt: now,
      updatedAt: now,
    });
    const notification = buildIdentityReviewNotification(userId, 'approved', nextVersion, new Date().toISOString());
    transaction.set(notificationRef, { ...notification, id: 'identity_manual_verification_granted_v1', createdAt: now }, { merge: true });
    transaction.create(auditRef, {
      userId,
      reviewerId,
      event: 'manual_identity_verification_granted',
      decision: 'approved',
      identityType: identity.identityType,
      displayName: identity.displayName,
      evidenceSummary: identity.evidenceSummary,
      evidenceUrls: identity.evidenceUrls,
      createdAt: now,
    });
    return nextVersion;
  });

  return { accepted: true, userId, status: 'verified', version };
});

export const getMyIdentityVerificationApplication = onCall({ maxInstances: 10 }, async request => {
  const uid = await requireUid(request as Request);
  const snapshot = await db.collection('identityVerificationApplications').doc(uid).get();
  if (!snapshot.exists) return { application: null };
  const data = snapshot.data() || {};
  return { application: {
    status: data.status,
    identityType: data.identityType,
    displayName: data.displayName,
    evidenceSummary: data.evidenceSummary,
    evidenceUrls: data.evidenceUrls,
    reviewNote: data.reviewNote || '',
    version: data.version,
    submittedAt: data.submittedAt?.toDate?.()?.toISOString?.() || null,
    reviewedAt: data.reviewedAt?.toDate?.()?.toISOString?.() || null,
  } };
});

export const listIdentityVerificationApplications = onCall({ maxInstances: 10 }, async request => {
  await requireIdentityReviewer(request as Request);
  const snapshot = await db.collection('identityVerificationApplications')
    .where('status', '==', 'pending_review')
    .limit(50)
    .get();
  const applications = await Promise.all(snapshot.docs.map(async document => {
    const data = document.data();
    const signals = await db.collection('identityVerificationPrivateSignals').doc(document.id).get();
    return {
      userId: document.id,
      identityType: data.identityType,
      displayName: data.displayName,
      evidenceSummary: data.evidenceSummary,
      evidenceUrls: data.evidenceUrls,
      reviewSignals: signals.data()?.reviewSignals || null,
      version: data.version,
      submittedAt: data.submittedAt?.toDate?.()?.toISOString?.() || null,
    };
  }));
  return { applications };
});

export const listIdentityImpersonationCases = onCall({ maxInstances: 10 }, async request => {
  await requireIdentityReviewer(request as Request);
  const snapshot = await db.collection('identityImpersonationCases')
    .where('status', 'in', ['open', 'on_hold'])
    .limit(50)
    .get();
  const cases = await Promise.all(snapshot.docs.map(async document => {
    const data = document.data();
    const reportIds = Array.isArray(data.reportIds) ? data.reportIds.filter((id: unknown): id is string => typeof id === 'string').slice(0, 4) : [];
    const reports = await Promise.all(reportIds.map(async (reportId: string) => {
      const report = await db.collection('moderationReports').doc(reportId).get();
      if (!report.exists) return null;
      const reportData = report.data() || {};
      return {
        category: typeof reportData.category === 'string' ? reportData.category : 'other',
        explanation: typeof reportData.explanation === 'string' ? reportData.explanation : '',
        createdAt: reportData.createdAt?.toDate?.()?.toISOString?.() || null,
      };
    }));
    return {
      userId: document.id,
      status: data.status,
      category: data.category,
      independentReportCount: data.independentReportCount || 0,
      hasVerifiedIdentity: data.hasVerifiedIdentity === true,
      verifiedDisplayName: data.verifiedDisplayName || null,
      openedAt: data.openedAt?.toDate?.()?.toISOString?.() || null,
      reports: reports.filter((report): report is NonNullable<typeof report> => report !== null),
    };
  }));
  return { cases };
});

export const reviewIdentityImpersonationCase = onCall({ maxInstances: 10 }, async request => {
  const data = request.data || {};
  const userId = typeof data.userId === 'string' ? data.userId.trim() : '';
  const decision = String(data.decision || '');
  const reviewNote = typeof data.reviewNote === 'string' ? data.reviewNote.trim() : '';
  const allowedDecisions = ['dismiss', 'place_on_hold', 'clear_hold', 'confirm_impersonation'];
  if (!userId || userId.length > 128 || userId.includes('/')) throw new HttpsError('invalid-argument', 'A valid account is required.');
  if (!allowedDecisions.includes(decision)) throw new HttpsError('invalid-argument', 'Choose a supported case decision.');
  if (reviewNote.length < 5 || reviewNote.length > 1000) throw new HttpsError('invalid-argument', 'A review note between 5 and 1000 characters is required.');
  const requiresSeniorApproval = isSeniorIdentityImpersonationDecision(decision as 'dismiss' | 'place_on_hold' | 'clear_hold' | 'confirm_impersonation');
  const reviewerId = requiresSeniorApproval
    ? await requireIdentityApprover(request as Request)
    : await requireIdentityReviewer(request as Request);
  if (reviewerId === userId) throw new HttpsError('permission-denied', 'Reviewers cannot decide cases involving their own account.');
  const caseRef = db.collection('identityImpersonationCases').doc(userId);
  const publicRef = db.collection('verifiedIdentities').doc(userId);
  const applicationRef = db.collection('identityVerificationApplications').doc(userId);
  const auditRef = db.collection('identityVerificationAuditEvents').doc();
  await db.runTransaction(async transaction => {
    const caseSnapshot = await transaction.get(caseRef);
    const verifiedSnapshot = await transaction.get(publicRef);
    const applicationSnapshot = await transaction.get(applicationRef);
    if (!caseSnapshot.exists) throw new HttpsError('not-found', 'Impersonation case not found.');
    const currentCaseStatus = String(caseSnapshot.get('status') || '');
    if (!canApplyIdentityImpersonationDecision(decision as 'dismiss' | 'place_on_hold' | 'clear_hold' | 'confirm_impersonation', currentCaseStatus)) {
      throw new HttpsError('failed-precondition', 'This case is not in a state that allows this decision.');
    }
    const now = FieldValue.serverTimestamp();

    if (decision === 'dismiss') {
      if (currentCaseStatus !== 'open') throw new HttpsError('failed-precondition', 'Only an open case can be dismissed.');
      transaction.update(caseRef, { status: 'dismissed', decision, reviewerId, reviewNote, reviewedAt: now, updatedAt: now });
    } else if (decision === 'place_on_hold') {
      if (currentCaseStatus !== 'open') throw new HttpsError('failed-precondition', 'Only an open case can be placed on hold.');
      transaction.update(caseRef, { status: 'on_hold', decision, reviewerId, reviewNote, heldAt: now, updatedAt: now });
      if (verifiedSnapshot.exists && verifiedSnapshot.get('status') === 'verified') {
        transaction.update(publicRef, { status: 'under_review', updatedAt: now });
      }
      if (applicationSnapshot.exists && applicationSnapshot.get('status') === 'approved') {
        transaction.update(applicationRef, { status: 'under_review', reviewNote, reviewerId, reviewedAt: now, updatedAt: now });
      }
    } else if (decision === 'clear_hold') {
      if (currentCaseStatus !== 'on_hold') throw new HttpsError('failed-precondition', 'This case does not have an active identity hold.');
      transaction.update(caseRef, { status: 'cleared', decision, reviewerId, reviewNote, reviewedAt: now, updatedAt: now });
      if (verifiedSnapshot.exists && verifiedSnapshot.get('status') === 'under_review') {
        transaction.update(publicRef, { status: 'verified', updatedAt: now });
      }
      if (applicationSnapshot.exists && applicationSnapshot.get('status') === 'under_review') {
        transaction.update(applicationRef, { status: 'approved', reviewNote, reviewerId, reviewedAt: now, updatedAt: now });
      }
    } else {
      if (!['open', 'on_hold'].includes(currentCaseStatus)) {
        throw new HttpsError('failed-precondition', 'This impersonation case is no longer actionable.');
      }
      transaction.update(caseRef, { status: 'confirmed', decision, reviewerId, reviewNote, reviewedAt: now, updatedAt: now });
      if (verifiedSnapshot.exists) transaction.delete(publicRef);
      if (applicationSnapshot.exists && ['approved', 'under_review'].includes(String(applicationSnapshot.get('status')))) {
        transaction.update(applicationRef, { status: 'revoked', reviewNote, reviewerId, reviewedAt: now, updatedAt: now });
      }
    }
    const notification = buildIdentityCaseNotification(userId, decision as 'dismiss' | 'place_on_hold' | 'clear_hold' | 'confirm_impersonation', auditRef.id, new Date().toISOString());
    transaction.create(db.collection('users').doc(userId).collection('notifications').doc(notification.id), {
      ...notification,
      createdAt: now,
    });
    transaction.create(auditRef, {
      userId,
      reviewerId,
      event: decision === 'dismiss' ? 'impersonation_case_dismissed'
        : decision === 'place_on_hold' ? 'identity_review_hold_placed'
        : decision === 'clear_hold' ? 'identity_review_hold_cleared'
        : 'impersonation_confirmed',
      reviewNote,
      createdAt: now,
    });
  });
  return { accepted: true, userId, decision };
});

export const reviewIdentityVerificationApplication = onCall({ maxInstances: 10 }, async request => {
  const reviewerId = await requireIdentityApprover(request as Request);
  const data = request.data || {};
  const userId = typeof data.userId === 'string' ? data.userId.trim() : '';
  const rawDecision = data.decision;
  const decision = String(rawDecision || '') as 'approved' | 'rejected' | 'needs_more_info' | 'revoked';
  const reviewNote = typeof data.reviewNote === 'string' ? data.reviewNote.trim() : '';
  if (!userId || userId.length > 128 || userId.includes('/')) throw new HttpsError('invalid-argument', 'A valid applicant account is required.');
  if (!['approved', 'rejected', 'needs_more_info', 'revoked'].includes(String(decision))) throw new HttpsError('invalid-argument', 'Choose a supported identity review decision.');
  if (reviewNote.length > 1000) throw new HttpsError('invalid-argument', 'The review note is too long.');
  if (['rejected', 'needs_more_info', 'revoked'].includes(String(decision)) && reviewNote.length < 5) throw new HttpsError('invalid-argument', 'A review note is required for this decision.');

  const applicationRef = db.collection('identityVerificationApplications').doc(userId);
  const privateSignalsRef = db.collection('identityVerificationPrivateSignals').doc(userId);
  const publicRef = db.collection('verifiedIdentities').doc(userId);
  const auditRef = db.collection('identityVerificationAuditEvents').doc();
  const result = await db.runTransaction(async transaction => {
    const application = await transaction.get(applicationRef);
    const privateSignals = await transaction.get(privateSignalsRef);
    if (!application.exists) throw new HttpsError('not-found', 'Identity application not found.');
    if (reviewerId === userId) throw new HttpsError('permission-denied', 'Reviewers cannot approve or reject their own identity application.');
    const currentStatus = String(application.get('status') || '');
    const isRevocation = decision === 'revoked';
    if (isRevocation ? currentStatus !== 'approved' : !canReviewIdentityApplication(currentStatus)) {
      throw new HttpsError('failed-precondition', 'This identity application is not in a reviewable state.');
    }
    const now = FieldValue.serverTimestamp();
    transaction.update(applicationRef, {
      status: decision,
      reviewNote,
      reviewerId,
      reviewedAt: now,
      updatedAt: now,
    });
    if (privateSignals.exists) transaction.update(privateSignalsRef, { status: decision, updatedAt: now });
    if (decision === 'approved') {
      transaction.set(publicRef, {
        userId,
        status: 'verified',
        identityType: application.get('identityType'),
        displayName: application.get('displayName'),
        verifiedAt: now,
        updatedAt: now,
      });
    } else if (isRevocation) {
      transaction.delete(publicRef);
    }
    const notification = buildIdentityReviewNotification(
      userId,
      decision,
      Number(application.get('version') || 1),
      new Date().toISOString(),
    );
    transaction.create(db.collection('users').doc(userId).collection('notifications').doc(notification.id), {
      ...notification,
      createdAt: now,
    });
    transaction.create(auditRef, {
      userId,
      reviewerId,
      event: decision === 'revoked' ? 'verification_revoked' : 'application_reviewed',
      decision,
      applicationVersion: application.get('version'),
      reviewNote,
      createdAt: now,
    });
    return { status: String(decision) };
  });
  return { accepted: true, userId, status: result.status };
});
