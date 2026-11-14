export const IDENTITY_EVIDENCE_URL_LIMIT = 5;

export type IdentityType = 'individual' | 'creator' | 'public_figure' | 'organization';
export type IdentityApplicationInput = {
  identityType: IdentityType;
  displayName: string;
  evidenceSummary: string;
  evidenceUrls: string[];
};

export function validateIdentityApplicationInput(data: Record<string, unknown>): IdentityApplicationInput {
  const identityTypes = new Set<IdentityType>(['individual', 'creator', 'public_figure', 'organization']);
  if (typeof data.identityType !== 'string' || !identityTypes.has(data.identityType as IdentityType)) {
    throw new Error('Choose a supported identity category.');
  }
  if (typeof data.displayName !== 'string' || data.displayName.trim().length < 2 || data.displayName.trim().length > 120) {
    throw new Error('The public identity name must be between 2 and 120 characters.');
  }
  if (typeof data.evidenceSummary !== 'string' || data.evidenceSummary.trim().length < 20 || data.evidenceSummary.trim().length > 1000) {
    throw new Error('Explain the identity claim in 20 to 1,000 characters.');
  }
  if (!Array.isArray(data.evidenceUrls) || data.evidenceUrls.length < 1 || data.evidenceUrls.length > IDENTITY_EVIDENCE_URL_LIMIT) {
    throw new Error('Provide between 1 and 5 public evidence links.');
  }
  const evidenceUrls = data.evidenceUrls.map(value => {
    if (typeof value !== 'string' || value.length > 500) throw new Error('Each evidence link must be a valid HTTPS URL.');
    let url: URL;
    try { url = new URL(value); } catch { throw new Error('Each evidence link must be a valid HTTPS URL.'); }
    if (url.protocol !== 'https:' || !url.hostname || url.username || url.password) {
      throw new Error('Evidence links must use HTTPS and cannot contain embedded credentials.');
    }
    return url.toString();
  });
  if (new Set(evidenceUrls).size !== evidenceUrls.length) throw new Error('Remove duplicate evidence links.');
  return {
    identityType: data.identityType as IdentityType,
    displayName: data.displayName.trim(),
    evidenceSummary: data.evidenceSummary.trim(),
    evidenceUrls,
  };
}

export function canSubmitIdentityApplication(status: unknown): boolean {
  return status === undefined || status === null || ['rejected', 'needs_more_info', 'revoked'].includes(String(status));
}

export function canReviewIdentityApplication(status: unknown): boolean {
  return status === 'pending_review';
}

export function normalizeIdentityName(value: string): string {
  return value.normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim().replace(/\s+/g, ' ');
}

export function normalizeIdentityEvidenceUrl(value: string): string {
  const url = new URL(value);
  url.hash = '';
  url.searchParams.sort();
  return url.toString();
}

export function shouldOpenImpersonationCase(independentReporterCount: number): boolean {
  return Number.isInteger(independentReporterCount) && independentReporterCount >= 3;
}

export type IdentityImpersonationDecision = 'dismiss' | 'place_on_hold' | 'clear_hold' | 'confirm_impersonation';

export function isSeniorIdentityImpersonationDecision(decision: IdentityImpersonationDecision): boolean {
  return decision !== 'dismiss';
}

export function canApplyIdentityImpersonationDecision(
  decision: IdentityImpersonationDecision,
  caseStatus: unknown,
): boolean {
  if (decision === 'dismiss' || decision === 'place_on_hold') return caseStatus === 'open';
  if (decision === 'clear_hold') return caseStatus === 'on_hold';
  return caseStatus === 'open' || caseStatus === 'on_hold';
}

export type IdentityApplicationDecision = 'approved' | 'rejected' | 'needs_more_info' | 'revoked';

export function buildIdentityReviewNotification(
  userId: string,
  decision: IdentityApplicationDecision,
  version: number,
  timestamp: string,
) {
  if (!userId || userId.length > 128 || userId.includes('/') || !Number.isInteger(version) || version < 1) {
    throw new Error('A valid identity review notification target is required.');
  }
  const contentByDecision: Record<IdentityApplicationDecision, string> = {
    approved: 'Your identity verification application was approved. Your public identity badge is now active.',
    rejected: 'Your identity verification application was not approved. Review the decision note in your identity settings.',
    needs_more_info: 'NEXORA needs more information to continue reviewing your identity application. Check the note in your identity settings.',
    revoked: 'Your public identity verification was revoked after review. Check the decision note in your identity settings.',
  };
  return {
    id: `identity_review_${version}_${decision}`,
    type: 'system' as const,
    userId: 'nexora-system',
    username: 'nexora',
    actorName: 'NEXORA',
    avatar: '',
    targetId: userId,
    content: contentByDecision[decision],
    timestamp,
    isRead: false,
    priority: 8,
  };
}

export type IdentityCaseDecision = 'dismiss' | 'place_on_hold' | 'clear_hold' | 'confirm_impersonation';

export function buildIdentityCaseNotification(
  userId: string,
  decision: IdentityCaseDecision,
  eventId: string,
  timestamp: string,
) {
  if (!userId || userId.length > 128 || userId.includes('/') || !eventId || eventId.length > 128 || eventId.includes('/')) {
    throw new Error('A valid identity case notification target is required.');
  }
  const contentByDecision: Record<IdentityCaseDecision, string> = {
    dismiss: 'NEXORA reviewed an impersonation report involving your account and dismissed the case. Your identity verification was not changed.',
    place_on_hold: 'A senior NEXORA reviewer has temporarily placed your public identity badge on hold while an impersonation concern is investigated. Your account is not suspended.',
    clear_hold: 'NEXORA completed its review and restored your public identity badge.',
    confirm_impersonation: 'NEXORA completed an identity review and revoked the public identity verification associated with this account. See your identity settings for the review outcome.',
  };
  return {
    id: `identity_case_${eventId}`,
    type: 'system' as const,
    userId: 'nexora-system',
    username: 'nexora',
    actorName: 'NEXORA',
    avatar: '',
    targetId: userId,
    content: contentByDecision[decision],
    timestamp,
    isRead: false,
    priority: 8,
  };
}
