import { createHash } from 'node:crypto';
import { FieldValue, getFirestore, Timestamp } from 'firebase-admin/firestore';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { getFirebaseAdminApp, resolveFirestoreDatabaseId } from './runtimeConfig.js';
import { shouldOpenImpersonationCase } from './identityVerificationPolicy.js';

const app = getFirebaseAdminApp();
const db = getFirestore(app, resolveFirestoreDatabaseId());

const targetTypes = new Set(['post', 'comment', 'user', 'community', 'message']);
const categories = new Set(['spam', 'harassment', 'threats', 'impersonation', 'hate', 'sexual_safety', 'violence', 'privacy', 'fraud', 'copyright', 'misinformation', 'other']);
const reviewRoles = new Set(['moderator', 'senior_moderator', 'admin', 'founder']);
const actions = new Set(['dismiss', 'warn', 'restrict_posting', 'restrict_messaging', 'suspend', 'ban']);

type CallableRequest = { auth?: { uid: string; token: Record<string, unknown> }; data?: Record<string, unknown> };

function requireAuth(request: CallableRequest): string {
  if (!request.auth?.uid) throw new HttpsError('unauthenticated', 'Sign in to continue.');
  return request.auth.uid;
}

function requireReviewer(request: CallableRequest): string {
  const uid = requireAuth(request);
  const token = request.auth?.token || {};
  const role = typeof token.role === 'string' ? token.role : '';
  const isReviewer = token.moderator === true || token.admin === true || reviewRoles.has(role);
  if (!isReviewer) throw new HttpsError('permission-denied', 'Moderation access is required.');
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
  const duplicate = await db.runTransaction(async (transaction) => {
    const existing = await transaction.get(reportRef);
    // One report per reporter/target pair, even after closure. This keeps retries
    // idempotent and prevents concurrent submissions from creating duplicate work.
    if (existing.exists) return true;

    const now = FieldValue.serverTimestamp();
    transaction.create(reportRef, {
      reporterId,
      targetType,
      targetId: normalizedTargetId,
      category,
      explanation: typeof explanation === 'string' ? explanation.trim() : '',
      status: 'pending',
      policyVersion: '2026-10',
      createdAt: now,
      updatedAt: now,
    });
    const auditRef = db.collection('moderationAuditEvents').doc();
    transaction.create(auditRef, {
      type: 'report_created', reportId, actorId: reporterId, targetType, targetId: normalizedTargetId,
      createdAt: now,
    });
    return false;
  });
  // Three independent accounts reporting impersonation of the same user within
  // 24 hours open a reviewer case. This is a triage signal only, never enforcement.
  if (!duplicate && targetType === 'user' && category === 'impersonation' && normalizedTargetId !== reporterId) {
    const reporterKey = createHash('sha256').update(reporterId).digest('hex').slice(0, 40);
    const signalRef = db.collection('identityImpersonationSignals').doc(normalizedTargetId)
      .collection('reporters').doc(reporterKey);
    await db.runTransaction(async transaction => {
      const existingSignal = await transaction.get(signalRef);
      if (!existingSignal.exists) transaction.create(signalRef, {
        reporterId,
        reportId,
        createdAt: FieldValue.serverTimestamp(),
      });
    });
    const recentSignals = await db.collection('identityImpersonationSignals').doc(normalizedTargetId)
      .collection('reporters')
      .where('createdAt', '>=', Timestamp.fromMillis(Date.now() - 24 * 60 * 60 * 1000))
      .limit(4)
      .get();
    if (shouldOpenImpersonationCase(recentSignals.size)) {
      const caseRef = db.collection('identityImpersonationCases').doc(normalizedTargetId);
      await db.runTransaction(async transaction => {
        const existingCase = await transaction.get(caseRef);
        const verified = await transaction.get(db.collection('verifiedIdentities').doc(normalizedTargetId));
        if (existingCase.exists) {
          if (existingCase.get('status') === 'open') transaction.update(caseRef, {
            independentReportCount: recentSignals.size,
            reportIds: recentSignals.docs.map(signal => signal.get('reportId')).filter((id): id is string => typeof id === 'string'),
            updatedAt: FieldValue.serverTimestamp(),
          });
          else if (existingCase.get('status') === 'dismissed') transaction.update(caseRef, {
            status: 'open',
            independentReportCount: recentSignals.size,
            reportIds: recentSignals.docs.map(signal => signal.get('reportId')).filter((id): id is string => typeof id === 'string'),
            reopenedAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
            reviewerId: FieldValue.delete(),
            reviewNote: FieldValue.delete(),
            reviewedAt: FieldValue.delete(),
          });
          return;
        }
        transaction.create(caseRef, {
          userId: normalizedTargetId,
          status: 'open',
          category: 'impersonation',
          independentReportCount: recentSignals.size,
          reportIds: recentSignals.docs.map(signal => signal.get('reportId')).filter((id): id is string => typeof id === 'string'),
          hasVerifiedIdentity: verified.exists && verified.get('status') === 'verified',
          verifiedDisplayName: verified.exists ? verified.get('displayName') || null : null,
          openedAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        });
        transaction.create(db.collection('identityVerificationAuditEvents').doc(), {
          userId: normalizedTargetId,
          event: 'impersonation_case_opened',
          independentReportCount: recentSignals.size,
          createdAt: FieldValue.serverTimestamp(),
        });
      });
    }
  }
  return { accepted: true, duplicate, reportId };
});

export const reviewModerationReport = onCall({ maxInstances: 10 }, async (request) => {
  const reviewerId = requireReviewer(request);
  const data = request.data || {};
  const reportId = data.reportId;
  const action = data.action;
  const decisionNote = data.decisionNote;
  if (!validText(reportId, 100) || reportId.includes('/')) throw new HttpsError('invalid-argument', 'A valid report ID is required.');
  if (typeof action !== 'string' || !actions.has(action)) throw new HttpsError('invalid-argument', 'A supported moderation action is required.');
  if (decisionNote !== undefined && (typeof decisionNote !== 'string' || decisionNote.trim().length > 1000)) throw new HttpsError('invalid-argument', 'The decision note is too long.');

  const reportRef = db.collection('moderationReports').doc(reportId);
  const reportSnap = await reportRef.get();
  if (!reportSnap.exists) throw new HttpsError('not-found', 'Report not found.');
  const report = reportSnap.data() || {};
  if (!['pending', 'under_review', 'escalated'].includes(String(report.status))) throw new HttpsError('failed-precondition', 'This report is already closed.');

  const accountId = action === 'dismiss' ? null : await resolveAccountId(report);
  if (action !== 'dismiss' && !accountId) throw new HttpsError('failed-precondition', 'The reported account could not be resolved safely.');
  const batch = db.batch();
  const now = FieldValue.serverTimestamp();
  batch.update(reportRef, {
    status: action === 'dismiss' ? 'dismissed' : 'resolved',
    action,
    decisionNote: typeof decisionNote === 'string' ? decisionNote.trim() : '',
    reviewerId,
    reviewedAt: now,
    updatedAt: now,
  });
  if (action !== 'dismiss') {
    const enforcementId = `enforcement_${reportId}`;
    const expiresAt = action === 'warn' ? null : Timestamp.fromMillis(Date.now() + (action === 'ban' ? 3650 : 7) * 24 * 60 * 60 * 1000);
    batch.set(db.collection('accountEnforcements').doc(enforcementId), {
      id: enforcementId,
      accountId,
      targetId: report.targetId,
      action,
      reportId,
      status: 'active',
      policyVersion: '2026-10',
      issuedBy: reviewerId,
      createdAt: now,
      expiresAt,
    }, { merge: true });
    batch.set(db.collection('accountStatus').doc(accountId as string), {
      accountId,
      postingRestricted: action === 'restrict_posting' || action === 'suspend' || action === 'ban',
      messagingRestricted: action === 'restrict_messaging' || action === 'suspend' || action === 'ban',
      suspended: action === 'suspend' || action === 'ban',
      expiresAt,
      updatedAt: now,
      sourceEnforcementId: enforcementId,
    }, { merge: true });
  }
  batch.create(db.collection('moderationAuditEvents').doc(), {
    type: 'report_reviewed', reportId, action, actorId: reviewerId, createdAt: now,
  });
  await batch.commit();
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
