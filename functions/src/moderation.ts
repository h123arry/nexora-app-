import { createHash } from 'node:crypto';
import { getAuth } from 'firebase-admin/auth';
import { FieldValue, getFirestore, Timestamp } from 'firebase-admin/firestore';
import { HttpsError } from 'firebase-functions/v2/https';
import { onCallWithSession as onCall } from './callableSession.js';
import { getFirebaseAdminApp, resolveFirestoreDatabaseId } from './runtimeConfig.js';
import { consumeModerationReportQuota, resolveCommunityOwnerId } from './moderationPolicy.js';
import { shouldOpenImpersonationCase } from './identityVerificationPolicy.js';

const app = getFirebaseAdminApp();
const auth = getAuth(app);
const db = getFirestore(app, resolveFirestoreDatabaseId());

const targetTypes = new Set(['post', 'comment', 'user', 'community', 'message']);
const categories = new Set(['spam', 'harassment', 'threats', 'impersonation', 'hate', 'sexual_safety', 'violence', 'privacy', 'fraud', 'copyright', 'misinformation', 'other']);
const reviewRoles = new Set(['moderator', 'senior_moderator', 'admin', 'founder']);
const actions = new Set(['dismiss', 'warn', 'restrict_posting', 'restrict_messaging', 'suspend', 'ban']);

type CallableRequest = { auth?: { uid: string; token: Record<string, unknown> }; data?: Record<string, unknown>; rawRequest: { headers: { authorization?: string } } };

function requireAuth(request: CallableRequest): string {
  if (!request.auth?.uid) throw new HttpsError('unauthenticated', 'Sign in to continue.');
  return request.auth.uid;
}

async function requireReviewer(request: CallableRequest): Promise<string> {
  const uid = requireAuth(request);
  const authorization = request.rawRequest.headers.authorization || '';
  const token = authorization.startsWith('Bearer ') ? authorization.slice(7) : '';
  if (!token) throw new HttpsError('unauthenticated', 'A current authenticated session is required.');
  let claims;
  try {
    claims = await auth.verifyIdToken(token, true);
  } catch {
    throw new HttpsError('unauthenticated', 'Your session is expired or has been revoked. Sign in again.');
  }
  const role = typeof claims.role === 'string' ? claims.role : '';
  const isReviewer = claims.moderator === true || claims.admin === true || reviewRoles.has(role);
  if (claims.uid !== uid || !isReviewer) throw new HttpsError('permission-denied', 'Moderation access is required.');
  return uid;
}

function stableReportId(reporterId: string, targetType: string, targetId: string): string {
  return `report_${createHash('sha256').update(`${reporterId}:${targetType}:${targetId}`).digest('hex').slice(0, 40)}`;
}

function validText(value: unknown, max: number): value is string {
  return typeof value === 'string' && value.trim().length > 0 && value.trim().length <= max;
}

async function resolveAccountId(report: Record<string, any>): Promise<string | null> {
  if (report.targetType === 'user') return typeof report.targetId === 'string' ? report.targetId : null;
  if (report.targetType === 'post') {
    const post = await db.collection('posts').doc(String(report.targetId)).get();
    const data = post.data();
    return typeof data?.userId === 'string' ? data.userId : typeof data?.authorId === 'string' ? data.authorId : null;
  }
  if (report.targetType === 'community') {
    const community = await db.collection('communities').doc(String(report.targetId)).get();
    return resolveCommunityOwnerId(community.exists ? community.data() : null);
  }
  if (report.targetType === 'message') {
    const messageTarget = typeof report.targetId === 'string' ? report.targetId.split(':') : [];
    if (messageTarget.length === 2) {
      const message = await db.collection('chats').doc(messageTarget[0]).collection('messages').doc(messageTarget[1]).get();
      const senderId = message.data()?.senderId;
      return typeof senderId === 'string' ? senderId : null;
    }
  }
  return null;
}

export const submitModerationReport = onCall({ maxInstances: 10 }, async (request) => {
  const reporterId = requireAuth(request);
  const data = request.data || {};
  const targetType = data.targetType;
  const targetId = data.targetId;
  const category = data.category;
  const explanation = data.explanation;
  if (typeof targetType !== 'string' || !targetTypes.has(targetType)) throw new HttpsError('invalid-argument', 'A supported report target is required.');
  if (!validText(targetId, 200) || targetId.includes('/')) throw new HttpsError('invalid-argument', 'A valid target is required.');
  if (typeof category !== 'string' || !categories.has(category)) throw new HttpsError('invalid-argument', 'A supported report category is required.');
  if (explanation !== undefined && (typeof explanation !== 'string' || explanation.trim().length > 1000)) throw new HttpsError('invalid-argument', 'The explanation is too long.');

  const normalizedTargetId = targetId.trim();
  const reportId = stableReportId(reporterId, targetType, normalizedTargetId);
  const reportRef = db.collection('moderationReports').doc(reportId);
  const quotaRef = db.collection('moderationReportQuotas').doc(reporterId);
  const isImpersonationReport = targetType === 'user' && category === 'impersonation' && normalizedTargetId !== reporterId;
  const reporterKey = isImpersonationReport ? createHash('sha256').update(reporterId).digest('hex').slice(0, 40) : '';
  const signalRef = isImpersonationReport
    ? db.collection('identityImpersonationSignals').doc(normalizedTargetId).collection('reporters').doc(reporterKey)
    : null;
  const duplicate = await db.runTransaction(async (transaction) => {
    const existing = await transaction.get(reportRef);
    const quotaSnapshot = await transaction.get(quotaRef);
    const existingSignal = signalRef ? await transaction.get(signalRef) : null;
    // Duplicate retries remain idempotent and do not consume quota. Repair a missing
    // private signal for a legacy impersonation report without charging quota again.
    if (existing.exists) {
      if (signalRef && existingSignal && !existingSignal.exists) transaction.create(signalRef, {
        reporterId, reportId, createdAt: FieldValue.serverTimestamp(),
      });
      return true;
    }

    const quota = consumeModerationReportQuota(
      quotaSnapshot.exists ? quotaSnapshot.data() : null,
      Date.now(),
    );
    if (!quota.allowed) {
      throw new HttpsError('resource-exhausted', 'You have reached the report limit. Try again after the current one-hour window.');
    }

    const now = FieldValue.serverTimestamp();
    transaction.create(reportRef, {
      reporterId, targetType, targetId: normalizedTargetId, category,
      explanation: typeof explanation === 'string' ? explanation.trim() : '',
      status: 'pending', policyVersion: '2026-10', createdAt: now, updatedAt: now,
    });
    transaction.set(quotaRef, {
      windowStartedAtMs: quota.windowStartedAtMs, attempts: quota.attempts, updatedAt: now,
    });
    if (signalRef && existingSignal && !existingSignal.exists) transaction.create(signalRef, {
      reporterId, reportId, createdAt: now,
    });
    const auditRef = db.collection('moderationAuditEvents').doc();
    transaction.create(auditRef, {
      type: 'report_created', reportId, actorId: reporterId, targetType, targetId: normalizedTargetId,
      createdAt: now,
    });
    return false;
  });
  // Independent impersonation reports open a private reviewer case; reports never auto-enforce.
  if (isImpersonationReport) {
    const reporterSignals = db.collection('identityImpersonationSignals').doc(normalizedTargetId).collection('reporters');
    const caseRef = db.collection('identityImpersonationCases').doc(normalizedTargetId);
    const verifiedRef = db.collection('verifiedIdentities').doc(normalizedTargetId);
    await db.runTransaction(async transaction => {
      // Read the live threshold query inside the transaction so concurrent third-party reports
      // cannot all observe a sub-threshold snapshot and leave the case unopened.
      const [recentSignals, existingCase, verified] = await Promise.all([
        transaction.get(reporterSignals
          .where('createdAt', '>=', Timestamp.fromMillis(Date.now() - 24 * 60 * 60 * 1000))
          .limit(4)),
        transaction.get(caseRef),
        transaction.get(verifiedRef),
      ]);
      if (!shouldOpenImpersonationCase(recentSignals.size)) return;
      const reportIds = recentSignals.docs.map(signal => signal.get('reportId')).filter((id): id is string => typeof id === 'string');
      if (existingCase.exists) {
        if (existingCase.get('status') === 'open') transaction.update(caseRef, {
          independentReportCount: recentSignals.size, reportIds, updatedAt: FieldValue.serverTimestamp(),
        });
        else if (existingCase.get('status') === 'dismissed') transaction.update(caseRef, {
          status: 'open', independentReportCount: recentSignals.size, reportIds,
          reopenedAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp(),
          reviewerId: FieldValue.delete(), reviewNote: FieldValue.delete(), reviewedAt: FieldValue.delete(),
        });
        return;
      }
      transaction.create(caseRef, {
        userId: normalizedTargetId, status: 'open', category: 'impersonation',
        independentReportCount: recentSignals.size, reportIds,
        hasVerifiedIdentity: verified.exists && verified.get('status') === 'verified',
        verifiedDisplayName: verified.exists ? verified.get('displayName') || null : null,
        openedAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp(),
      });
      transaction.create(db.collection('identityVerificationAuditEvents').doc(), {
        userId: normalizedTargetId, event: 'impersonation_case_opened',
        independentReportCount: recentSignals.size, createdAt: FieldValue.serverTimestamp(),
      });
    });
  }
  return { accepted: true, duplicate, reportId };
});

export const reviewModerationReport = onCall({ maxInstances: 10 }, async (request) => {
  const reviewerId = await requireReviewer(request);
  const data = request.data || {};
  const reportId = data.reportId;
  const action = data.action;
  const decisionNote = data.decisionNote;
  if (!validText(reportId, 100) || reportId.includes('/')) throw new HttpsError('invalid-argument', 'A valid report ID is required.');
  if (typeof action !== 'string' || !actions.has(action)) throw new HttpsError('invalid-argument', 'A supported moderation action is required.');
  if (decisionNote !== undefined && (typeof decisionNote !== 'string' || decisionNote.trim().length > 1000)) throw new HttpsError('invalid-argument', 'The decision note is too long.');

  const reportRef = db.collection('moderationReports').doc(reportId);
  const initialSnapshot = await reportRef.get();
  if (!initialSnapshot.exists) throw new HttpsError('not-found', 'Report not found.');
  const initialReport = initialSnapshot.data() || {};
  if (!['pending', 'under_review', 'escalated'].includes(String(initialReport.status))) {
    throw new HttpsError('failed-precondition', 'This report is already closed.');
  }

  const accountId = action === 'dismiss' ? null : await resolveAccountId(initialReport);
  if (action !== 'dismiss' && !accountId) throw new HttpsError('failed-precondition', 'The reported account could not be resolved safely.');
  const enforcementId = `enforcement_${reportId}`;
  const enforcementRef = db.collection('accountEnforcements').doc(enforcementId);
  const accountStatusRef = accountId ? db.collection('accountStatus').doc(accountId) : null;
  const auditRef = db.collection('moderationAuditEvents').doc();
  const nowMs = Date.now();
  const now = FieldValue.serverTimestamp();
  const expiresAt = action === 'warn' ? null : Timestamp.fromMillis(
    nowMs + (action === 'ban' ? 3650 : 7) * 24 * 60 * 60 * 1000,
  );

  await db.runTransaction(async (transaction) => {
    const currentSnapshot = await transaction.get(reportRef);
    if (!currentSnapshot.exists) throw new HttpsError('not-found', 'Report not found.');
    const currentReport = currentSnapshot.data() || {};
    if (!['pending', 'under_review', 'escalated'].includes(String(currentReport.status))) {
      throw new HttpsError('failed-precondition', 'This report has already been reviewed.');
    }
    if (currentReport.targetType !== initialReport.targetType || currentReport.targetId !== initialReport.targetId) {
      throw new HttpsError('aborted', 'The report target changed during review. Reload and try again.');
    }

    transaction.update(reportRef, {
      status: action === 'dismiss' ? 'dismissed' : 'resolved',
      action,
      decisionNote: typeof decisionNote === 'string' ? decisionNote.trim() : '',
      reviewerId,
      reviewedAt: now,
      updatedAt: now,
    });
    if (accountId && accountStatusRef) {
      transaction.set(enforcementRef, {
        id: enforcementId,
        accountId,
        targetId: currentReport.targetId,
        action,
        reportId,
        status: 'active',
        policyVersion: '2026-10',
        issuedBy: reviewerId,
        createdAt: now,
        expiresAt,
      }, { merge: true });
      transaction.set(accountStatusRef, {
        accountId,
        postingRestricted: action === 'restrict_posting' || action === 'suspend' || action === 'ban',
        messagingRestricted: action === 'restrict_messaging' || action === 'suspend' || action === 'ban',
        suspended: action === 'suspend' || action === 'ban',
        expiresAt,
        updatedAt: now,
        sourceEnforcementId: enforcementId,
      }, { merge: true });
    }
    transaction.create(auditRef, {
      type: 'report_reviewed', reportId, action, actorId: reviewerId, createdAt: now,
    });
  });
  return { accepted: true, reportId, action };
});

export const submitModerationAppeal = onCall({ maxInstances: 10 }, async (request) => {
  const userId = requireAuth(request);
  const data = request.data || {};
  const targetType = data.targetType;
  const targetId = data.targetId;
  const reason = data.reason;
  if (typeof targetType !== 'string' || !['post', 'account', 'comment'].includes(targetType)) throw new HttpsError('invalid-argument', 'A supported appeal target is required.');
  if (!validText(targetId, 200) || targetId.includes('/')) throw new HttpsError('invalid-argument', 'A valid enforcement target is required.');
  if (!validText(reason, 1000)) throw new HttpsError('invalid-argument', 'An appeal explanation is required.');

  const enforcementSnap = await db.collection('accountEnforcements')
    .where('accountId', '==', userId)
    .where('status', '==', 'active')
    .limit(10)
    .get();
  const enforcement = enforcementSnap.docs.find(doc => doc.data().targetId === targetId || doc.id === targetId);
  if (!enforcement) throw new HttpsError('failed-precondition', 'This account has no eligible active enforcement for that appeal.');

  const appealId = `appeal_${createHash('sha256').update(`${userId}:${enforcement.id}`).digest('hex').slice(0, 40)}`;
  const appealRef = db.collection('moderationAppeals').doc(appealId);
  const existing = await appealRef.get();
  if (existing.exists && ['pending', 'under_review'].includes(String(existing.data()?.status))) return { accepted: true, duplicate: true, appealId };
  await appealRef.create({
    id: appealId,
    userId,
    enforcementId: enforcement.id,
    targetType,
    targetId: targetId.trim(),
    reason: reason.trim(),
    status: 'pending',
    policyVersion: '2026-10',
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });
  await db.collection('moderationAuditEvents').add({ type: 'appeal_submitted', appealId, enforcementId: enforcement.id, actorId: userId, createdAt: FieldValue.serverTimestamp() });
  return { accepted: true, duplicate: false, appealId };
});
