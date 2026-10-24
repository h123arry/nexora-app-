import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { spawn, type ChildProcess } from 'node:child_process';
import { initializeApp as initializeAdminApp, deleteApp } from 'firebase-admin/app';
import { getFirestore as getAdminFirestore } from 'firebase-admin/firestore';
import { getStorage as getAdminStorage } from 'firebase-admin/storage';

const port = 33771;
const baseUrl = `http://127.0.0.1:${port}`;
let server: ChildProcess;
let idToken = '';
let uid = '';
let nonMemberToken = '';
let nonMemberUid = '';
const testAdminApp = initializeAdminApp({ projectId: 'demo-nexora-voh' }, 'voh-security-test-seed');
const testDb = getAdminFirestore(testAdminApp, '(default)');

async function waitForServer(): Promise<void> {
  const deadline = Date.now() + 20_000;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`${baseUrl}/api/voh-ai/summarize-post`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' });
      if (response.status === 401) return;
    } catch {
      // Wait for Express startup.
    }
    await new Promise(resolve => setTimeout(resolve, 200));
  }
  throw new Error('Server did not become ready.');
}

async function signedRequest(path: string, body: unknown): Promise<Response> {
  return fetch(`${baseUrl}/api/voh-ai/${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${idToken}` },
    body: JSON.stringify(body),
  });
}

before(async () => {
  const emulatorHost = process.env.FIREBASE_AUTH_EMULATOR_HOST;
  assert.ok(emulatorHost, 'VOH API security test requires Firebase Auth Emulator.');
  assert.ok(process.env.FIRESTORE_EMULATOR_HOST, 'Private media tests require Firestore Emulator.');
  process.env.STORAGE_EMULATOR_HOST ||= '127.0.0.1:9199';
  server = spawn('node', ['--import', 'tsx', 'server.ts'], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      NODE_ENV: 'production',
      PORT: String(port),
      FIRESTORE_DATABASE_ID: '(default)',
      GCLOUD_PROJECT: 'demo-nexora-voh',
      FIREBASE_STORAGE_BUCKET: 'demo-nexora-voh.firebasestorage.app',
      STORAGE_EMULATOR_HOST: process.env.STORAGE_EMULATOR_HOST || '127.0.0.1:9199',
      GEMINI_API_KEY: '',
    },
    stdio: 'ignore',
  });
  await waitForServer();
  const email = `voh-${Date.now()}@example.test`;
  const signup = await fetch(`http://${emulatorHost}/identitytoolkit.googleapis.com/v1/accounts:signUp?key=fake-api-key`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email, password: 'not-a-real-secret-Password123!', returnSecureToken: true }),
  });
  assert.equal(signup.status, 200, 'Auth Emulator must create the test user.');
  const credentials = await signup.json() as { idToken: string; localId: string };
  idToken = credentials.idToken;
  uid = credentials.localId;
  const secondSignup = await fetch(`http://${emulatorHost}/identitytoolkit.googleapis.com/v1/accounts:signUp?key=fake-api-key`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email: `nonmember-${Date.now()}@example.test`, password: 'not-a-real-secret-Password123!', returnSecureToken: true }),
  });
  assert.equal(secondSignup.status, 200);
  const secondCredentials = await secondSignup.json() as { idToken: string; localId: string };
  nonMemberToken = secondCredentials.idToken;
  nonMemberUid = secondCredentials.localId;
  await testDb.doc('chats/private-media-test').set({ participants: [uid, 'other-member'] });
});

after(async () => {
  if (server && server.exitCode === null) server.kill('SIGTERM');
  await testDb.recursiveDelete(testDb.collection('chats'));
  await getAdminStorage(testAdminApp).bucket('demo-nexora-voh.firebasestorage.app').deleteFiles({ prefix: 'chats/' }).catch(() => undefined);
  await deleteApp(testAdminApp);
});

describe('VOH API security boundary', () => {
  it('rejects absent and malformed Firebase identity tokens', async () => {
    const missing = await fetch(`${baseUrl}/api/voh-ai/summarize-post`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ content: 'short text' }) });
    assert.equal(missing.status, 401);
    const invalid = await fetch(`${baseUrl}/api/voh-ai/summarize-post`, { method: 'POST', headers: { 'content-type': 'application/json', authorization: 'Bearer forged-token' }, body: JSON.stringify({ content: 'short text' }) });
    assert.equal(invalid.status, 401);
  });

  it('rejects malformed or oversized audio before any model call', async () => {
    const wrongMime = await signedRequest('voice-transcribe', { audioBase64: 'AAAA', mimeType: 'image/png' });
    assert.equal(wrongMime.status, 400);
    const browserCodecMime = await signedRequest('voice-transcribe', { audioBase64: 'AAAA', mimeType: 'audio/webm;codecs=opus' });
    assert.equal(browserCodecMime.status, 503);
    const wrongEncoding = await signedRequest('voice-transcribe', { audioBase64: '<script>', mimeType: 'audio/webm' });
    assert.equal(wrongEncoding.status, 400);
    const badText = await signedRequest('improve-post', { content: 'x'.repeat(4001) });
    assert.equal(badText.status, 400);
  });

  it('does not pretend Gemini succeeded when the server key is not configured', async () => {
    const response = await signedRequest('summarize-post', { content: 'A genuinely short post.' });
    assert.equal(response.status, 503);
    const result = await response.json() as { error: string; text?: string };
    assert.equal(result.text, undefined);
    assert.match(result.error, /not configured/);
  });

  it('shares a per-UID quota across route requests and rejects the excess', async () => {
    const replies = await Promise.all(Array.from({ length: 24 }, () => signedRequest('summarize-post', { content: 'A short post.' })));
    assert.ok(replies.some(response => response.status === 429));
    assert.ok(replies.every(response => [400, 429, 503].includes(response.status)));
    assert.ok(uid.length > 0);
  });
});

describe('private chat media boundary', () => {
  const audioBytes = Buffer.from([0x1a, 0x45, 0xdf, 0xa3, 0x00, 0x01, 0x02, 0x03]);
  it('requires a valid participant, stores no download URL, and streams only media linked to a message', async () => {
    const upload = (token: string) => fetch(`${baseUrl}/api/private-chat-media/chat/private-media-test/audio`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
      body: JSON.stringify({ audioBase64: audioBytes.toString('base64'), mimeType: 'audio/webm' }),
    });
    const rejectedUpload = await upload(nonMemberToken);
    assert.equal(rejectedUpload.status, 403);
    const uploaded = await upload(idToken);
    assert.equal(uploaded.status, 201);
    const result = await uploaded.json() as { storagePath: string; downloadUrl?: string };
    assert.match(result.storagePath, /^chats\/private-media-test\/audio\//);
    assert.equal(result.downloadUrl, undefined);
    const segments = result.storagePath.split('/');
    const mediaId = segments[4];
    const playbackPath = `/api/private-chat-media/chat/private-media-test/audio/${uid}/${mediaId}`;
    const withoutMessage = await fetch(`${baseUrl}${playbackPath}`, { headers: { authorization: `Bearer ${idToken}` } });
    assert.equal(withoutMessage.status, 404);
    await testDb.doc('chats/private-media-test/messages/voice-1').set({ senderId: uid, voiceAudioUrl: result.storagePath });
    const playback = await fetch(`${baseUrl}${playbackPath}`, { headers: { authorization: `Bearer ${idToken}` } });
    assert.equal(playback.status, 200);
    assert.equal(playback.headers.get('cache-control'), 'private, no-store, max-age=0');
    assert.deepEqual(Buffer.from(await playback.arrayBuffer()), audioBytes);
    const denied = await fetch(`${baseUrl}${playbackPath}`, { headers: { authorization: `Bearer ${nonMemberToken}` } });
    assert.equal(denied.status, 404);
  });
});
