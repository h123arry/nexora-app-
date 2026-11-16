import test from 'node:test';
import assert from 'node:assert/strict';
import { probeEndpoint, validateHealthResponse, verifyStaging } from '../scripts/smoke-staging.mjs';

test('health response must identify the expected API and release', () => {
  validateHealthResponse('/healthz', { ok: true, status: 200 }, {
    status: 'ok', service: 'nexora-api', version: 'release-123',
  }, 'release-123');
  assert.throws(() => validateHealthResponse('/healthz', { ok: true, status: 200 }, {
    status: 'ok', service: 'nexora-api', version: 'old-release',
  }, 'release-123'), /release mismatch/);
});

test('readiness requires Firebase, Firestore and Storage to be available', () => {
  validateHealthResponse('/readyz', { ok: true, status: 200 }, {
    status: 'ready',
    dependencies: { firebase: 'available', firestore: 'available', storage: 'available' },
  });
  assert.throws(() => validateHealthResponse('/readyz', { ok: true, status: 200 }, {
    status: 'ready',
    dependencies: { firebase: 'available', firestore: 'available', storage: 'missing_configuration' },
  }), /storage/);
});

test('probe rejects redirects and non-JSON responses', async () => {
  await assert.rejects(probeEndpoint('https://staging.example', '/healthz', 'v1', async () => ({
    ok: true, status: 200, json: async () => { throw new Error('invalid'); },
  })), /did not return JSON/);
});

test('staging smoke verifies both endpoints and exact deployed release', async () => {
  const calls = [];
  const result = await verifyStaging({
    baseUrl: 'https://staging.example',
    expectedVersion: 'abc123',
    attempts: 1,
    fetchImpl: async (url) => {
      const path = new URL(url).pathname;
      calls.push(path);
      return path === '/healthz'
        ? { ok: true, status: 200, json: async () => ({ status: 'ok', service: 'nexora-api', version: 'abc123' }) }
        : { ok: true, status: 200, json: async () => ({ status: 'ready', dependencies: { firebase: 'available', firestore: 'available', storage: 'available' } }) };
    },
  });
  assert.deepEqual(calls, ['/healthz', '/readyz']);
  assert.equal(result.ok, true);
  assert.equal(result.version, 'abc123');
});

test('staging smoke fails closed when the release is not the deployed release', async () => {
  await assert.rejects(verifyStaging({
    baseUrl: 'https://staging.example',
    expectedVersion: 'new',
    attempts: 1,
    fetchImpl: async () => ({
      ok: true, status: 200,
      json: async () => ({ status: 'ok', service: 'nexora-api', version: 'old' }),
    }),
  }), /release mismatch/);
});

test('staging smoke rejects insecure and credential-bearing URLs', async () => {
  await assert.rejects(verifyStaging({
    baseUrl: 'http://staging.example', expectedVersion: 'v1', attempts: 1,
  }), /HTTPS/);
  await assert.rejects(verifyStaging({
    baseUrl: 'https://user:pass@staging.example', expectedVersion: 'v1', attempts: 1,
  }), /HTTPS/);
});
