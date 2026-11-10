import { createHash, randomUUID } from 'node:crypto';
import type { Firestore } from 'firebase-admin/firestore';
import { moderateCircleMember } from './communityGovernance.js';

const ID_LIMIT = 150;
const REPORT_REASON_LIMIT = 1000;
const REVIEW_REASON_LIMIT = 500;
const MANAGER_ROLES = new Set(['owner', 'admin', 'moderator']);

type CircleReportTarget = 'member' | 'post' | 'message';
type CircleReportAction = 'dismiss' | 'remove_content' | 'ban_member';

function validId(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0 && value.length <= ID_LIMIT && !value.includes('/');
}

function reportDocumentId(communityId: string, reporterUid: string, targetType: string, targetId: string): string {
  return createHash('sha256')
    .update([communityId, reporterUid, targetType, targetId].join(':'))
    .digest('hex');
}

async function requireActiveManager(db: Firestore, communityId: string, actorUid: string): Promise<void> {
  const membership = await db.collection('communities').doc(communityId).collection('members').doc(actorUid).get();
  if (!membership.exists || membership.get('status') !== 'active' || !MANAGER_ROLES.has(String(membership.get('role') || ''))) {
    throw new Error('Only active Circle managers can review reports.');
  }
}

export async function submitCircleReport(
  db: Firestore,
  reporterUid: string,
  communityId: string,
  targetType: CircleReportTarget,
  targetId: string,
  reason: string,
): Promise<{ reportId: string; submitted: true }> {
  const cleanReason = typeof reason === 'string' ? reason.trim() : '';
  if (!reporterUid || !validId(communityId) || !validId(targetId)
    || !['member', 'post', 'message'].includes(targetType)
    || cleanReason.length < 10 || cleanReason.length > REPORT_REASON_LIMIT
    || (targetType === 'member' && targetId === reporterUid)) {
    throw new Error('Choose valid Circle content and provide a report reason of 10 to 1,000 characters.');
  }

  const communityRef = db.collection('communities').doc(communityId);
  const reporterRef = communityRef.collection('members').doc(reporterUid);
  const targetRef = targetType === 'member'
    ? communityRef.collection('members').doc(targetId)
    : communityRef.collection(targetType === 'post' ? 'posts' : 'messages').doc(targetId);
  const reportId = reportDocumentId(communityId, reporterUid, targetType, targetId);
  const reportRef = communityRef.collection('reports').doc(reportId);

  await db.runTransaction(async transaction => {
    const [community, reporter, target, existing] = await Promise.all([
      transaction.get(communityRef),
      transaction.get(reporterRef),
      transaction.get(targetRef),
      transaction.get(reportRef),
    ]);
    if (!community.exists || !reporter.exists || reporter.get('status') !== 'active') {
      throw new Error('Join this Circle to report content.');
    }
    if (!target.exists || (targetType === 'member' && target.get('status') !== 'active')) {
      throw new Error('The reported Circle content is unavailable.');
    }
    if (existing.exists) throw new Error('You have already reported this item.');
    transaction.create(reportRef, {
      id: reportId,
      communityId,
      reporterUid,
      targetType,
      targetId,
      reason: cleanReason,
      status: 'open',
      createdAt: new Date(),
      schemaVersion: 1,
    });
  });
  return { reportId, submitted: true };
}

export async function listCircleReports(
  db: Firestore,
  actorUid: string,
  communityId: string,
): Promise<Array<{
  id: string;
  reporterUid: string;
  reporterName: string;
  targetType: CircleReportTarget;
  targetId: string;
  targetSummary: string;
  reason: string;
  createdAt: string;
}>> {
  if (!actorUid || !validId(communityId)) throw new Error('A valid Circle is required.');
  await requireActiveManager(db, communityId, actorUid);
  const snapshots = await db.collection('communities').doc(communityId)
    .collection('reports').orderBy('createdAt', 'desc').limit(100).get();
  const openReports = snapshots.docs.filter(report => report.get('status') === 'open').slice(0, 50);
  return Promise.all(openReports.map(async report => {
    const reporterUid = String(report.get('reporterUid') || '');
    const targetType = String(report.get('targetType') || 'post') as CircleReportTarget;
    const targetId = String(report.get('targetId') || '');
    const targetRef = targetType === 'member'
      ? db.collection('publicProfiles').doc(targetId)
      : db.collection('communities').doc(communityId)
        .collection(targetType === 'post' ? 'posts' : 'messages').doc(targetId);
    const [reporter, target] = await Promise.all([
      db.collection('publicProfiles').doc(reporterUid).get(),
      targetRef.get(),
    ]);
    const profile = reporter.data() || {};
    const targetData = target.data() || {};
    const summary = targetType === 'member'
      ? String(targetData.name || targetData.username || 'Circle member')
      : String(targetData.content || targetData.title || '').slice(0, 180);
    const createdAt = report.get('createdAt')?.toDate?.();
    return {
      id: report.id,
      reporterUid,
      reporterName: String(profile.name || profile.username || 'Circle member').slice(0, 80),
      targetType,
      targetId,
      targetSummary: summary,
      reason: String(report.get('reason') || '').slice(0, REPORT_REASON_LIMIT),
      createdAt: createdAt instanceof Date ? createdAt.toISOString() : '',
    };
  }));
}

export async function resolveCircleReport(
  db: Firestore,
  actorUid: string,
  communityId: string,
  reportId: string,
  action: CircleReportAction,
  reviewReason: string,
): Promise<{ reportId: string; status: 'dismissed' | 'resolved' }> {
  const note = typeof reviewReason === 'string' ? reviewReason.trim() : '';
  if (!actorUid || !validId(communityId) || !validId(reportId)
    || !['dismiss', 'remove_content', 'ban_member'].includes(action)
    || note.length < 3 || note.length > REVIEW_REASON_LIMIT) {
    throw new Error('A valid report action and review reason are required.');
  }
  await requireActiveManager(db, communityId, actorUid);
  const reportRef = db.collection('communities').doc(communityId).collection('reports').doc(reportId);
  const report = await reportRef.get();
  if (!report.exists || report.get('status') !== 'open') throw new Error('This Circle report is no longer open.');
  const targetType = String(report.get('targetType') || '') as CircleReportTarget;
  const targetId = String(report.get('targetId') || '');

  if (action === 'dismiss') {
    await db.runTransaction(async transaction => {
      const [current, actor] = await Promise.all([
        transaction.get(reportRef),
        transaction.get(db.collection('communities').doc(communityId).collection('members').doc(actorUid)),
      ]);
      if (!actor.exists || actor.get('status') !== 'active' || !MANAGER_ROLES.has(String(actor.get('role') || ''))) {
        throw new Error('Only active Circle managers can review reports.');
      }
      if (!current.exists || current.get('status') !== 'open') throw new Error('This Circle report is no longer open.');
      transaction.update(reportRef, {
        status: 'dismissed', reviewedBy: actorUid, reviewReason: note, reviewedAt: new Date(),
      });
    });
    return { reportId, status: 'dismissed' };
  }

  if (action === 'ban_member') {
    if (targetType !== 'member') throw new Error('Only member reports can result in a member ban.');
    await moderateCircleMember(db, actorUid, communityId, targetId, 'ban', note);
    await db.runTransaction(async transaction => {
      const current = await transaction.get(reportRef);
      if (!current.exists || current.get('status') !== 'open') throw new Error('This Circle report is no longer open.');
      transaction.update(reportRef, {
        status: 'resolved', resolution: action, reviewedBy: actorUid, reviewReason: note, reviewedAt: new Date(),
      });
    });
    return { reportId, status: 'resolved' };
  }

  if (targetType === 'member') throw new Error('Member reports must be resolved through a member action.');
  const collectionName = targetType === 'post' ? 'posts' : 'messages';
  const targetRef = db.collection('communities').doc(communityId).collection(collectionName).doc(targetId);
  const auditRef = db.collection('communities').doc(communityId).collection('auditEvents').doc(randomUUID());
  await db.runTransaction(async transaction => {
    const [current, target, actor] = await Promise.all([
      transaction.get(reportRef), transaction.get(targetRef),
      transaction.get(db.collection('communities').doc(communityId).collection('members').doc(actorUid)),
    ]);
    if (!actor.exists || actor.get('status') !== 'active' || !MANAGER_ROLES.has(String(actor.get('role') || ''))) {
      throw new Error('Only active Circle managers can review reports.');
    }
    if (!current.exists || current.get('status') !== 'open') throw new Error('This Circle report is no longer open.');
    if (target.exists) transaction.delete(targetRef);
    transaction.update(reportRef, {
      status: 'resolved', resolution: action, reviewedBy: actorUid, reviewReason: note, reviewedAt: new Date(),
    });
    transaction.create(auditRef, {
      id: auditRef.id, actorUid, action: 'reported_circle_content_removed',
      targetType, targetId, reportId, reason: note, createdAt: new Date(),
    });
  });
  return { reportId, status: 'resolved' };
}
