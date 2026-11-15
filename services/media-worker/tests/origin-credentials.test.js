import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Reader, Context } from '@contentauth/c2pa-node';
import sharp from 'sharp';
import { buildCredentialInspection, unsupportedCredentialInspection, inspectSourceCredential } from '../src/originCredentials.js';

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


describe('NEXORA Origin native C2PA reader integration', () => {
  const context = new Context({
    verify: { verifyAfterReading: true, verifyTrust: true, ocspFetch: false, remoteManifestFetch: false },
    trust: { verifyTrustList: true },
  });

  it('reads a real CAI fixture and preserves the valid-but-untrusted distinction', async () => {
    const fixturePath = fileURLToPath(new URL('./fixtures/c2pa-untrusted-ca.jpg', import.meta.url));
    const reader = await Reader.fromAsset({ path: fixturePath, mimeType: 'image/jpeg' }, context);
    assert.ok(reader, 'expected the fixture to contain an embedded C2PA manifest');
    const manifestStore = reader.json();
    assert.equal(manifestStore.validation_state, 'Valid');
    const inspection = buildCredentialInspection(manifestStore);
    assert.equal(inspection.state, 'untrusted');
    assert.ok(inspection.validationCodes.includes('signingCredential.untrusted'));
  });

  it('returns absent for an ordinary image without an embedded credential', async () => {
    const image = await sharp({ create: { width: 24, height: 24, channels: 3, background: '#ffffff' } }).jpeg().toBuffer();
    const reader = await Reader.fromAsset({ buffer: image, mimeType: 'image/jpeg' }, context);
    assert.equal(reader, null);
    assert.equal(buildCredentialInspection(reader ? reader.json() : null).state, 'absent');
  });

  it('does not report verified after the original asset bytes are modified', async () => {
    const fixturePath = fileURLToPath(new URL('./fixtures/c2pa-untrusted-ca.jpg', import.meta.url));
    const bytes = await readFile(fixturePath);
    bytes[bytes.length - 3] ^= 0x01;
    const reader = await Reader.fromAsset({ buffer: bytes, mimeType: 'image/jpeg' }, context);
    assert.ok(reader, 'the altered image should still expose its embedded manifest for validation');
    const inspection = buildCredentialInspection(reader.json());
    assert.equal(inspection.state, 'invalid');
    assert.ok(inspection.validationCodes.some(code => /asset|hash|binding|ingredient/i.test(code)));
  });
});

describe('NEXORA Origin malformed media and rendition binding', () => {
  const context = new Context({
    verify: { verifyAfterReading: true, verifyTrust: true, ocspFetch: false, remoteManifestFetch: false },
    trust: { verifyTrustList: true },
  });

  it('maps malformed source media to unsupported instead of absent or verified', async () => {
    const directory = await mkdtemp(path.join(tmpdir(), 'nexora-origin-malformed-'));
    const malformedPath = path.join(directory, 'malformed.jpg');
    try {
      await writeFile(malformedPath, Buffer.from('not a jpeg or c2pa asset'));
      const inspection = await inspectSourceCredential(malformedPath, 'image/jpeg');
      assert.equal(inspection.state, 'unsupported');
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });

  it('keeps credential inspection bound to the original upload before image transcoding', async () => {
    const fixturePath = fileURLToPath(new URL('./fixtures/c2pa-untrusted-ca.jpg', import.meta.url));
    const originalReader = await Reader.fromAsset({ path: fixturePath, mimeType: 'image/jpeg' }, context);
    assert.ok(originalReader);
    assert.equal(buildCredentialInspection(originalReader.json()).state, 'untrusted');

    const transformed = await sharp(fixturePath).webp({ quality: 80 }).toBuffer();
    let transformedInspection;
    try {
      const transformedReader = await Reader.fromAsset({ buffer: transformed, mimeType: 'image/webp' }, context);
      transformedInspection = buildCredentialInspection(transformedReader ? transformedReader.json() : null);
    } catch {
      transformedInspection = unsupportedCredentialInspection();
    }
    assert.notEqual(transformedInspection.state, 'verified',
      'a transformed rendition must not inherit the original source credential verdict');
  });
});
