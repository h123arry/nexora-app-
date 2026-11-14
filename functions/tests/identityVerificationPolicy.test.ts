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
