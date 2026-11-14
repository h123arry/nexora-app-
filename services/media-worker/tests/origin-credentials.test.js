import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { buildCredentialInspection, unsupportedCredentialInspection } from '../src/originCredentials.js';

describe('NEXORA Origin C2PA credential state mapping', () => {
  it('treats a missing manifest as absent, never as verified', () => {
    assert.equal(buildCredentialInspection(null).state, 'absent');
  });
  it('requires the SDK Trusted state before showing credential-verified', () => {
    assert.equal(buildCredentialInspection({ validation_state: 'Trusted' }).state, 'verified');
    assert.equal(buildCredentialInspection({ validation_state: 'Valid' }).state, 'untrusted');
    assert.equal(buildCredentialInspection({ validation_state: 'Invalid' }).state, 'invalid');
  });
  it('keeps missing or unknown validation states pending', () => {
    assert.equal(buildCredentialInspection({ manifests: {} }).state, 'pending');
    assert.equal(buildCredentialInspection({ validation_state: 'Unexpected' }).state, 'pending');
  });
  it('stores only bounded, allow-listed validation codes', () => {
    const result = buildCredentialInspection({
      validation_state: 'Invalid',
      validation_status: [{ code: 'claim.signature.mismatch' }, { code: 'unsafe code with private text' }, { code: 'claim.signature.mismatch' }],
      validation_results: { activeManifest: { failure: [{ code: 'assertion.hash.mismatch' }], success: [{ code: 'asset.hash.match' }] } },
    });
    assert.deepEqual(result.validationCodes, ['claim.signature.mismatch', 'assertion.hash.mismatch', 'asset.hash.match']);
    assert.equal(JSON.stringify(result).includes('unsafe code'), false);
  });
  it('uses unsupported rather than fabricating a cryptographic verdict when inspection fails', () => {
    assert.equal(unsupportedCredentialInspection().state, 'unsupported');
  });
});
