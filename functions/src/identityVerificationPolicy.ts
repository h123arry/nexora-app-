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
