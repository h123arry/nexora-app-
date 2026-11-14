import { createHash } from 'node:crypto';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { getFirebaseAdminApp, resolveFirestoreDatabaseId } from './runtimeConfig.js';
import {
  canReviewIdentityApplication,
  canSubmitIdentityApplication,
  normalizeIdentityEvidenceUrl,
  normalizeIdentityName,
  validateIdentityApplicationInput,
} from './identityVerificationPolicy.js';

const db = getFirestore(getFirebaseAdminApp(), resolveFirestoreDatabaseId());
type Request = { auth?: { uid: string; token?: Record<string, unknown> } | null; data?: Record<string, unknown> };

function requireUid(request: Request): string {
  if (!request.auth?.uid) throw new HttpsError('unauthenticated', 'Sign in to continue.');
  return request.auth.uid;
}

function requireIdentityReviewer(request: Request): string {
  const uid = requireUid(request);
  const token = request.auth?.token || {};
  const role = typeof token.role === 'string' ? token.role : '';
  if (token.moderator !== true && token.admin !== true && !['moderator', 'senior_moderator', 'admin', 'founder'].includes(role)) {
    throw new HttpsError('permission-denied', 'Identity review access is required.');
  }
  return uid;
}

function requireIdentityApprover(request: Request): string {
  const uid = requireUid(request);
  const token = request.auth?.token || {};
  const role = typeof token.role === 'string' ? token.role : '';
  if (token.admin !== true && token.founder !== true && !['senior_moderator', 'admin', 'founder'].includes(role)) {
    throw new HttpsError('permission-denied', 'Senior identity review access is required to approve or reject identity claims.');
  }
  return uid;
}

export const submitIdentityVerificationApplication = onCall({ maxInstances: 10 }, async request => {
  const uid = requireUid(request as Request);
  let input;
  try { input = validateIdentityApplicationInput(request.data || {}); }
  catch (error) { throw new HttpsError('invalid-argument', error instanceof Error ? error.message : 'Invalid identity application.'); }

  // Duplicate-name and shared-evidence matches are advisory reviewer signals only.
  // They never auto-reject an applicant because organizations and public figures can share official sources.
  const identityNameKey = normalizeIdentityName(input.displayName);
  const evidenceUrlHashes = Array.from(new Set(input.evidenceUrls.map(url =>
    createHash('sha256').update(normalizeIdentityEvidenceUrl(url)).digest('hex')
  )));
  const nameMatches = await db.collection('identityVerificationPrivateSignals')
    .where('identityNameKey', '==', identityNameKey)
    .limit(100)
    .get();
  const evidenceMatches = await Promise.all(evidenceUrlHashes.map(hash =>
    db.collection('identityVerificationPrivateSignals')
      .where('evidenceUrlHashes', 'array-contains', hash)
      .limit(100)
      .get()
  ));
  const activeApplication = (status: unknown) => status === 'approved' || status === 'pending_review';
  const nameCollisionCount = nameMatches.docs.filter(document =>
    document.id !== uid && activeApplication(document.get('status'))
  ).length;
  const duplicateEvidenceLinkCount = evidenceUrlHashes.filter((hash, index) =>
    evidenceMatches[index].docs.some(document => document.id !== uid && activeApplication(document.get('status')))
  ).length;
  const reviewSignals = {
    possibleNameCollision: nameCollisionCount > 0,
    nameCollisionCount,
    duplicateEvidenceLinkCount,
    evidenceScanMayBeIncomplete: evidenceMatches.some(snapshot => snapshot.size === 100) || nameMatches.size === 100,
  };

  const applicationRef = db.collection('identityVerificationApplications').doc(uid);
  const auditRef = db.collection('identityVerificationAuditEvents').doc();
  const version = await db.runTransaction(async transaction => {
    const existing = await transaction.get(applicationRef);
    const status = existing.exists ? existing.get('status') : undefined;
    if (!canSubmitIdentityApplication(status)) {
      throw new HttpsError('failed-precondition', 'An application is already awaiting review or this identity is already verified.');
    }
    const nextVersion = Number(existing.get('version') || 0) + 1;
    const now = FieldValue.serverTimestamp();
    transaction.set(applicationRef, {
      id: uid,
      userId: uid,
      ...input,
      status: 'pending_review',
      version: nextVersion,
      reviewNote: '',
      submittedAt: now,
      updatedAt: now,
      createdAt: existing.exists ? existing.get('createdAt') : now,
    });
    transaction.set(db.collection('identityVerificationPrivateSignals').doc(uid), {
      userId: uid,
      identityNameKey,
      evidenceUrlHashes,
      reviewSignals,
      status: 'pending_review',
      updatedAt: now,
    });
    transaction.create(auditRef, {
      userId: uid, event: 'application_submitted', version: nextVersion, actorId: uid, createdAt: now,
    });
    return nextVersion;
  });
  return { accepted: true, status: 'pending_review', version };
});

export const getMyIdentityVerificationApplication = onCall({ maxInstances: 10 }, async request => {
  const uid = requireUid(request as Request);
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
  requireIdentityReviewer(request as Request);
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

export const reviewIdentityVerificationApplication = onCall({ maxInstances: 10 }, async request => {
  const reviewerId = requireIdentityApprover(request as Request);
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
