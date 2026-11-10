import type { Firestore } from 'firebase-admin/firestore';

export interface OwnModerationReport {
  id: string;
  targetType: string;
  category: string;
  status: 'pending' | 'under_review' | 'escalated' | 'resolved' | 'dismissed';
  action: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  reviewedAt: string | null;
}

function iso(value: unknown): string | null {
  if (value && typeof (value as { toDate?: unknown }).toDate === 'function') {
    const date = (value as { toDate: () => Date }).toDate();
    return Number.isFinite(date.getTime()) ? date.toISOString() : null;
  }
  return null;
}

/** Return only the caller's own safe status projection, never reviewer notes or evidence. */
export async function listOwnModerationReports(db: Firestore, userId: string): Promise<OwnModerationReport[]> {
  if (!userId || userId.includes('/')) throw new Error('A valid account is required.');
  const snapshot = await db.collection('moderationReports')
    .where('reporterId', '==', userId)
    .limit(100)
    .get();
  const reports = snapshot.docs.map(doc => {
    const data = doc.data();
    const candidate = String(data.status || 'pending');
    const status: OwnModerationReport['status'] =
      ['pending', 'under_review', 'escalated', 'resolved', 'dismissed'].includes(candidate)
        ? candidate as OwnModerationReport['status'] : 'pending';
    return {
      id: doc.id,
      targetType: String(data.targetType || 'content'),
      category: String(data.category || 'other'),
      status,
      action: status === 'resolved' && typeof data.action === 'string' ? data.action : null,
      createdAt: iso(data.createdAt),
      updatedAt: iso(data.updatedAt),
      reviewedAt: iso(data.reviewedAt),
    };
  });
  reports.sort((a, b) => Date.parse(b.createdAt || '') - Date.parse(a.createdAt || ''));
  return reports.slice(0, 50);
}
