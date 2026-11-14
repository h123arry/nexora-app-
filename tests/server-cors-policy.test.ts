import assert from 'node:assert/strict';
import { test } from 'node:test';
import { isAllowedApiOrigin, parseAllowedApiOrigins } from '../server/corsPolicy';

test('allows same-origin browser requests', () => {
  assert.equal(isAllowedApiOrigin('https://nexora.example', 'https://nexora.example', new Set()), true);
});

test('allows Capacitor iOS and Android WebView origins', () => {
  assert.equal(isAllowedApiOrigin('capacitor://localhost', 'https://api.nexora.example', new Set()), true);
  assert.equal(isAllowedApiOrigin('https://localhost', 'https://api.nexora.example', new Set()), true);
});

test('allows explicitly configured HTTPS app origins', () => {
  const allowed = parseAllowedApiOrigins('https://staging.nexora.example, https://preview.nexora.example');
  assert.equal(isAllowedApiOrigin('https://staging.nexora.example', 'https://api.nexora.example', allowed), true);
});

test('rejects unrelated and empty origins', () => {
  const allowed = parseAllowedApiOrigins('https://staging.nexora.example');
  assert.equal(isAllowedApiOrigin('https://attacker.example', 'https://api.nexora.example', allowed), false);
  assert.equal(isAllowedApiOrigin('', 'https://api.nexora.example', allowed), false);
});

test('normalizes configured origins and rejects unsafe entries', () => {
  assert.deepEqual([...parseAllowedApiOrigins(' https://staging.nexora.example/ ')], ['https://staging.nexora.example']);
  for (const value of [
    'http://staging.nexora.example',
    'https://user:pass@staging.nexora.example',
    'https://staging.nexora.example/path',
    'https://staging.nexora.example?token=x',
  ]) {
    assert.throws(() => parseAllowedApiOrigins(value), /must be HTTPS origins/);
  }
});

test('allows HTTP configured origins only for local development', () => {
  assert.deepEqual([...parseAllowedApiOrigins('http://localhost:5173,http://127.0.0.1:3000')], [
    'http://localhost:5173',
    'http://127.0.0.1:3000',
  ]);
});
