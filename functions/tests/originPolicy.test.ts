import assert from 'node:assert/strict';
import test from 'node:test';
import { buildOriginUploadRecords } from '../src/originPolicy.js';

const valid = {
  assetId: 'asset_123',
  ownerUid: 'creator_123',
  mediaGeneration: '1731000000000000',
  contentDigest: 'a'.repeat(64),
  contentType: 'video/webm',
  byteSize: 4096,
  studioExport: false,
};

test('builds a platform-observed upload record without claiming original authorship', () => {
  const records = buildOriginUploadRecords(valid);
  assert.equal(records.origin.originKind, 'upload_ingest');
  assert.equal(records.origin.digestAlgorithm, 'sha256');
  assert.equal(records.origin.credentialState, 'absent');
  assert.equal(records.origin.lineageState, 'unlinked');
  assert.equal(records.event.eventType, 'uploaded_to_nexora');
  assert.equal(records.event.contributionRole, 'uploader');
  assert.equal(records.event.disclosureSource, 'platform_observed');
});

test('distinguishes a NEXORA Studio export from a general upload', () => {
  assert.equal(buildOriginUploadRecords({ ...valid, studioExport: true }).origin.originKind, 'studio_export');
});

test('uses a stable generation-scoped event ID for idempotent retries', () => {
  const first = buildOriginUploadRecords(valid);
  const retry = buildOriginUploadRecords({ ...valid });
  assert.equal(first.event.eventId, retry.event.eventId);
});

test('rejects malformed identifiers, generations, hashes, sizes and content types', () => {
  for (const patch of [
    { assetId: '../private' },
    { ownerUid: '' },
    { mediaGeneration: 'latest' },
    { contentDigest: 'not-a-hash' },
    { byteSize: 0 },
    { byteSize: Number.MAX_SAFE_INTEGER + 1 },
    { contentType: '' },
  ]) {
    assert.throws(() => buildOriginUploadRecords({ ...valid, ...patch } as typeof valid));
  }
});
