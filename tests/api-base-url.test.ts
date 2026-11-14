import assert from 'node:assert/strict';
import { test } from 'node:test';
import { resolveApiRequestUrl } from '../src/lib/apiBaseUrl';

test('keeps browser requests same-origin when no API base is configured', () => {
  assert.equal(resolveApiRequestUrl('/api/health', { nativeRuntime: false }), '/api/health');
});
test('requires an explicit API origin in native builds', () => {
  assert.throws(() => resolveApiRequestUrl('/api/health', { nativeRuntime: true }), /VITE_API_BASE_URL must be configured/);
});
test('resolves API requests against the configured HTTPS origin', () => {
  assert.equal(resolveApiRequestUrl('/api/private-chat-media/chat/123/audio', { baseUrl: 'https://api-staging.example.test', nativeRuntime: true }), 'https://api-staging.example.test/api/private-chat-media/chat/123/audio');
});
test('normalizes a base URL path without dropping it', () => {
  assert.equal(resolveApiRequestUrl('health', { baseUrl: 'https://api.example.test/nexora/', nativeRuntime: true }), 'https://api.example.test/nexora/health');
});
test('rejects insecure non-local API origins', () => {
  assert.throws(() => resolveApiRequestUrl('/api/health', { baseUrl: 'http://api.example.test', nativeRuntime: false }), /must use HTTPS/);
});
test('allows HTTP only for local browser development', () => {
  assert.equal(resolveApiRequestUrl('/api/health', { baseUrl: 'http://localhost:3000', nativeRuntime: false }), 'http://localhost:3000/api/health');
  assert.throws(() => resolveApiRequestUrl('/api/health', { baseUrl: 'http://localhost:3000', nativeRuntime: true }), /must use HTTPS/);
});
test('rejects credentials, query strings, and fragments in API origins', () => {
  for (const baseUrl of ['https://user:pass@api.example.test','https://api.example.test?token=secret','https://api.example.test#fragment']) {
    assert.throws(() => resolveApiRequestUrl('/api/health', { baseUrl, nativeRuntime: false }), /must not contain credentials/);
  }
});
