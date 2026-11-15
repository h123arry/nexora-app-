export type OriginCaseStatus = 'open' | 'accepted' | 'rejected' | 'disputed' | 'resolved';
export type OriginReviewOutcome = 'upheld' | 'overturned';

export function isOriginReviewer(token: Record<string, unknown> | undefined): boolean {
  if (!token) return false;
  const role = typeof token.role === 'string' ? token.role : '';
  return token.moderator === true || token.admin === true
    || ['moderator', 'senior_moderator', 'admin', 'founder'].includes(role);
}

export function canResolveOriginDispute(status: unknown, outcome: unknown): boolean {
  return status === 'disputed' && (outcome === 'upheld' || outcome === 'overturned');
}

export function originCaseNotificationRecipients(record: {
  requesterUid?: unknown; sourceCreatorUid?: unknown; status?: unknown;
}): Array<{ uid: string; kind: 'request' | 'response' | 'dispute' | 'resolution' }> {
  const requesterUid = typeof record.requesterUid === 'string' ? record.requesterUid : '';
  const sourceCreatorUid = typeof record.sourceCreatorUid === 'string' ? record.sourceCreatorUid : '';
  if (!requesterUid || !sourceCreatorUid || requesterUid === sourceCreatorUid) return [];
  if (record.status === 'open') return [{ uid: sourceCreatorUid, kind: 'request' }];
  if (record.status === 'accepted' || record.status === 'rejected') return [{ uid: requesterUid, kind: 'response' }];
  if (record.status === 'disputed') return [{ uid: sourceCreatorUid, kind: 'dispute' }];
  if (record.status === 'resolved') return [
    { uid: requesterUid, kind: 'resolution' }, { uid: sourceCreatorUid, kind: 'resolution' },
  ];
  return [];
}

/** A case participant must never adjudicate their own attribution dispute. */
export function canReviewerResolveOriginDispute(input: {
  status: unknown;
  outcome: unknown;
  reviewerUid: unknown;
  requesterUid: unknown;
  sourceCreatorUid: unknown;
}): boolean {
  return canResolveOriginDispute(input.status, input.outcome)
    && typeof input.reviewerUid === 'string' && input.reviewerUid.length > 0
    && input.reviewerUid !== input.requesterUid
    && input.reviewerUid !== input.sourceCreatorUid;
}
