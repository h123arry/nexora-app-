#!/usr/bin/env node

const DEFAULT_ATTEMPTS = 12;
const RETRY_DELAY_MS = 5_000;
const REQUEST_TIMEOUT_MS = 10_000;

export function validateHealthResponse(path, response, payload, expectedVersion) {
  if (!response.ok) throw new Error(`${path} returned HTTP ${response.status}`);
  const requestId = response.headers?.get?.('x-request-id');
  if (typeof requestId !== 'string' || !/^[A-Za-z0-9._:-]{8,120}$/.test(requestId)) {
    throw new Error(`${path} did not return a valid X-Request-Id`);
  }
  if (response.headers?.get?.('x-content-type-options') !== 'nosniff') {
    throw new Error(`${path} is missing the nosniff security header`);
  }
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    throw new Error(`${path} returned an invalid JSON response`);
  }
  if (path === '/healthz') {
    if (payload.status !== 'ok' || payload.service !== 'nexora-api') {
      throw new Error('/healthz did not report the expected service health contract');
    }
    if (expectedVersion && payload.version !== expectedVersion) {
      throw new Error(`/healthz release mismatch: expected ${expectedVersion}, received ${String(payload.version)}`);
    }
    return;
  }
  if (payload.status !== 'ready') throw new Error('/readyz did not report ready');
  for (const dependency of ['firebase', 'firestore', 'storage']) {
    if (payload.dependencies?.[dependency] !== 'available') {
      throw new Error(`/readyz dependency is not available: ${dependency}`);
    }
  }
}

export async function probeEndpoint(baseUrl, path, expectedVersion, fetchImpl = fetch) {
  const response = await fetchImpl(new URL(path, baseUrl), {
    method: 'GET',
    headers: { accept: 'application/json', 'cache-control': 'no-cache' },
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    redirect: 'error',
  });
  let payload;
  try {
    payload = await response.json();
  } catch {
    throw new Error(`${path} did not return JSON`);
  }
  validateHealthResponse(path, response, payload, expectedVersion);
  return { path, status: response.status };
}

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

export async function verifyStaging({
  baseUrl,
  expectedVersion,
  fetchImpl = fetch,
  attempts = DEFAULT_ATTEMPTS,
  retryDelayMs = RETRY_DELAY_MS,
  wait = sleep,
}) {
  const parsed = new URL(baseUrl);
  if (parsed.protocol !== 'https:' || parsed.username || parsed.password) {
    throw new Error('Staging smoke checks require a credential-free HTTPS URL.');
  }
  if (!expectedVersion?.trim()) throw new Error('RELEASE_VERSION is required for release identity verification.');
  const failures = [];
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const health = await probeEndpoint(parsed, '/healthz', expectedVersion, fetchImpl);
      const readiness = await probeEndpoint(parsed, '/readyz', expectedVersion, fetchImpl);
      return { ok: true, version: expectedVersion, checks: [health, readiness], attempts: attempt };
    } catch (error) {
      failures.push(error instanceof Error ? error.message : 'Unknown staging probe failure');
      if (attempt < attempts) await wait(retryDelayMs);
    }
  }
  throw new Error(`Staging smoke verification failed after ${attempts} attempts: ${failures.at(-1)}`);
}

async function main() {
  const baseUrl = process.env.STAGING_APP_URL;
  const expectedVersion = process.env.RELEASE_VERSION;
  if (!baseUrl) throw new Error('STAGING_APP_URL is required.');
  const result = await verifyStaging({ baseUrl, expectedVersion });
  console.log(JSON.stringify({
    event: 'staging_smoke_verification_passed',
    version: result.version,
    attempts: result.attempts,
    checks: result.checks,
  }));
}

if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href) {
  main().catch(error => {
    console.error(`Staging smoke verification failed: ${error instanceof Error ? error.message : 'unknown error'}`);
    process.exitCode = 1;
  });
}
