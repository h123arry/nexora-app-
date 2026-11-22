import test from 'node:test';
import assert from 'node:assert/strict';
import worker from '../src/index.js';

test('staging worker exposes a non-sensitive health response', async () => {
  const response = await worker.fetch(new Request('https://staging.example/healthz'), {
    FIREBASE_PROJECT_ID: 'nexora-prod-voiceharrison',
  });
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { status: 'ok', service: 'nexora-api-staging' });
  assert.equal(response.headers.get('cache-control'), 'no-store');
});

test('staging worker readiness checks D1 without exposing internal errors', async () => {
  const env = {
    DB: { prepare: (sql) => ({ first: async () => ({ ready: 1, sql }) }) },
  };
  const response = await worker.fetch(new Request('https://staging.example/readyz'), env);
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { status: 'ready', database: 'connected' });
});

test('staging worker fails closed when D1 is unavailable', async () => {
  const env = { DB: { prepare: () => ({ first: async () => { throw new Error('private diagnostic'); } }) } };
  const response = await worker.fetch(new Request('https://staging.example/readyz'), env);
  assert.equal(response.status, 503);
  const body = await response.text();
  assert.deepEqual(JSON.parse(body), { error: 'service_not_ready' });
  assert.equal(body.includes('private diagnostic'), false);
});

test('staging worker rejects unapproved browser origins', async () => {
  const response = await worker.fetch(new Request('https://staging.example/healthz', {
    headers: { Origin: 'https://attacker.example' },
  }), {});
  assert.equal(response.status, 403);
  assert.deepEqual(await response.json(), { error: 'origin_not_allowed' });
});
