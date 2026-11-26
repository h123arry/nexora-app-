import assert from 'node:assert/strict';
import { test } from 'node:test';
import { parseFirebaseServiceAccountJson } from '../server/firebaseAdminCredentials.ts';

const validAccount = {
  type: 'service_account',
  project_id: 'nexora-prod-voiceharrison',
  private_key: '-----BEGIN PRIVATE KEY-----\\nprivate-key\\n-----END PRIVATE KEY-----',
  client_email: 'firebase-adminsdk@nexora-prod-voiceharrison.iam.gserviceaccount.com',
};

test('service-account credentials are optional when application default credentials are available', () => {
  assert.equal(parseFirebaseServiceAccountJson(undefined, 'nexora-prod-voiceharrison'), null);
});

test('parses a valid service account and restores escaped private-key newlines', () => {
  const result = parseFirebaseServiceAccountJson(JSON.stringify(validAccount), 'nexora-prod-voiceharrison');
  assert.equal(result?.projectId, 'nexora-prod-voiceharrison');
  assert.equal(result?.clientEmail, validAccount.client_email);
  assert.equal(result?.privateKey.includes('\\n'), false);
  assert.equal(result?.privateKey.includes('\n'), true);
});

test('rejects malformed JSON and incomplete service accounts', () => {
  assert.throws(() => parseFirebaseServiceAccountJson('{', 'nexora-prod-voiceharrison'), /valid service-account JSON/);
  assert.throws(() => parseFirebaseServiceAccountJson(JSON.stringify({ type: 'service_account' }), 'nexora-prod-voiceharrison'), /missing required/);
});

test('rejects credentials belonging to a different Firebase project', () => {
  assert.throws(
    () => parseFirebaseServiceAccountJson(JSON.stringify({ ...validAccount, project_id: 'another-project' }), 'nexora-prod-voiceharrison'),
    /does not match/,
  );
});
