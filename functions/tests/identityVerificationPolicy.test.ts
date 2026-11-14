import test from 'node:test';
import assert from 'node:assert/strict';
import {
  IDENTITY_EVIDENCE_URL_LIMIT,
  canReviewIdentityApplication,
  canSubmitIdentityApplication,
  validateIdentityApplicationInput,
} from '../src/identityVerificationPolicy.ts';

test('identity application validates category, name, explanation and public HTTPS evidence', () => {
  const input = validateIdentityApplicationInput({
    identityType: 'creator',
    displayName: 'Nexora Creator',
    evidenceSummary: 'This account represents the creator brand and its official public channels.',
    evidenceUrls: ['https://example.com/about', 'https://social.example/official'],
  });
  assert.equal(input.identityType, 'creator');
  assert.equal(input.displayName, 'Nexora Creator');
  assert.equal(input.evidenceUrls.length, 2);
  assert.equal(IDENTITY_EVIDENCE_URL_LIMIT, 5);
});

test('identity evidence rejects insecure, credentialed, duplicate and malformed links', () => {
  const base = { identityType: 'individual', displayName: 'Harrison', evidenceSummary: 'Official public sources supporting this identity claim.' };
  assert.throws(() => validateIdentityApplicationInput({ ...base, evidenceUrls: ['http://example.com'] }));
  assert.throws(() => validateIdentityApplicationInput({ ...base, evidenceUrls: ['https://user:pass@example.com'] }));
  assert.throws(() => validateIdentityApplicationInput({ ...base, evidenceUrls: ['not-a-url'] }));
  assert.throws(() => validateIdentityApplicationInput({ ...base, evidenceUrls: ['https://example.com', 'https://example.com'] }));
  assert.throws(() => validateIdentityApplicationInput({ ...base, evidenceUrls: [] }));
  assert.throws(() => validateIdentityApplicationInput({ ...base, evidenceUrls: ['https://example.com/1', 'https://example.com/2', 'https://example.com/3', 'https://example.com/4', 'https://example.com/5', 'https://example.com/6'] }));
});

test('identity applications cannot bypass active review or already-approved status', () => {
  assert.equal(canSubmitIdentityApplication(undefined), true);
  assert.equal(canSubmitIdentityApplication('rejected'), true);
  assert.equal(canSubmitIdentityApplication('needs_more_info'), true);
  assert.equal(canSubmitIdentityApplication('revoked'), true);
  assert.equal(canSubmitIdentityApplication('pending_review'), false);
  assert.equal(canSubmitIdentityApplication('approved'), false);
  assert.equal(canReviewIdentityApplication('pending_review'), true);
  assert.equal(canReviewIdentityApplication('approved'), false);
});

test('identity collision keys normalize names and equivalent HTTPS evidence URLs', async () => {
  const { normalizeIdentityName, normalizeIdentityEvidenceUrl } = await import('../src/identityVerificationPolicy.ts');
  assert.equal(normalizeIdentityName('  NEXORA   Creator '), normalizeIdentityName('nexora-creator'));
  assert.equal(
    normalizeIdentityEvidenceUrl('https://Example.com/official?b=2&a=1#about'),
    normalizeIdentityEvidenceUrl('https://example.com/official?a=1&b=2'),
  );
});

test('impersonation escalation requires three independent reporters', async () => {
  const { shouldOpenImpersonationCase } = await import('../src/identityVerificationPolicy.ts');
  assert.equal(shouldOpenImpersonationCase(0), false);
  assert.equal(shouldOpenImpersonationCase(1), false);
  assert.equal(shouldOpenImpersonationCase(2), false);
  assert.equal(shouldOpenImpersonationCase(3), true);
  assert.equal(shouldOpenImpersonationCase(4), true);
  assert.equal(shouldOpenImpersonationCase(2.5), false);
});

test('impersonation case holds and resolution require the correct case state', async () => {
  const { canApplyIdentityImpersonationDecision, isSeniorIdentityImpersonationDecision } = await import('../src/identityVerificationPolicy.ts');
  assert.equal(canApplyIdentityImpersonationDecision('dismiss', 'open'), true);
  assert.equal(canApplyIdentityImpersonationDecision('dismiss', 'on_hold'), false);
  assert.equal(canApplyIdentityImpersonationDecision('place_on_hold', 'open'), true);
  assert.equal(canApplyIdentityImpersonationDecision('place_on_hold', 'dismissed'), false);
  assert.equal(canApplyIdentityImpersonationDecision('clear_hold', 'on_hold'), true);
  assert.equal(canApplyIdentityImpersonationDecision('clear_hold', 'open'), false);
  assert.equal(canApplyIdentityImpersonationDecision('confirm_impersonation', 'open'), true);
  assert.equal(canApplyIdentityImpersonationDecision('confirm_impersonation', 'on_hold'), true);
  assert.equal(canApplyIdentityImpersonationDecision('confirm_impersonation', 'cleared'), false);
  assert.equal(isSeniorIdentityImpersonationDecision('dismiss'), false);
  assert.equal(isSeniorIdentityImpersonationDecision('place_on_hold'), true);
  assert.equal(isSeniorIdentityImpersonationDecision('clear_hold'), true);
  assert.equal(isSeniorIdentityImpersonationDecision('confirm_impersonation'), true);
});

test('identity review notifications give applicants clear decision-specific next steps', async () => {
  const { buildIdentityReviewNotification } = await import('../src/identityVerificationPolicy.ts');
  const approved = buildIdentityReviewNotification('creator-1', 'approved', 2, '2026-11-14T00:00:00.000Z');
  assert.equal(approved.id, 'identity_review_2');
  assert.equal(approved.type, 'system');
  assert.equal(approved.targetId, 'creator-1');
  assert.equal(approved.isRead, false);
  assert.match(approved.content, /badge is now active/);
  assert.match(buildIdentityReviewNotification('creator-1', 'needs_more_info', 3, '2026-11-14T00:00:00.000Z').content, /needs more information/);
  assert.match(buildIdentityReviewNotification('creator-1', 'rejected', 4, '2026-11-14T00:00:00.000Z').content, /not approved/);
  assert.match(buildIdentityReviewNotification('creator-1', 'revoked', 5, '2026-11-14T00:00:00.000Z').content, /revoked/);
  assert.throws(() => buildIdentityReviewNotification('../bad', 'approved', 1, 'now'), /valid identity review/);
});

test('identity case notifications accurately distinguish holds, restoration, and revocation', async () => {
  const { buildIdentityCaseNotification } = await import('../src/identityVerificationPolicy.ts');
  const hold = buildIdentityCaseNotification('creator-2', 'place_on_hold', 'event-1', '2026-11-14T00:00:00.000Z');
  assert.equal(hold.id, 'identity_case_event-1');
  assert.match(hold.content, /account is not suspended/);
  assert.match(buildIdentityCaseNotification('creator-2', 'clear_hold', 'event-2', 'now').content, /restored/);
  assert.match(buildIdentityCaseNotification('creator-2', 'confirm_impersonation', 'event-3', 'now').content, /revoked/);
  assert.match(buildIdentityCaseNotification('creator-2', 'dismiss', 'event-4', 'now').content, /dismissed the case/);
  assert.throws(() => buildIdentityCaseNotification('creator-2', 'dismiss', 'bad/id', 'now'), /valid identity case/);
});
