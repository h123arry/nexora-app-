import test from 'node:test';
import assert from 'node:assert/strict';
import { createR2WorkerUrl, resolveR2WorkerConfig } from '../src/r2Storage.js';

const env = {
  R2_ACCOUNT_ID: 'a'.repeat(32),
  R2_ACCESS_KEY_ID: 'test-access-key',
  R2_SECRET_ACCESS_KEY: 'test-secret-key',
  R2_BUCKET_NAME: 'nexora-media',
};

test('R2 worker configuration is optional until R2 processing is selected', () => {
  assert.equal(resolveR2WorkerConfig({}), null);
  assert.equal(resolveR2WorkerConfig(env).bucket, 'nexora-media');
  assert.throws(() => resolveR2WorkerConfig({ ...env, R2_ACCOUNT_ID: 'bad' }), /configuration/);
  assert.throws(() => resolveR2WorkerConfig({ R2_ACCOUNT_ID: env.R2_ACCOUNT_ID }), /Incomplete/);
});

test('R2 worker signs immutable object GET and PUT URLs for the account bucket', () => {
  const config = resolveR2WorkerConfig(env);
  const now = new Date('2026-11-21T12:00:00.000Z');
  const get = new URL(createR2WorkerUrl(config, 'GET', 'users/user_1/media/asset_1', 900, now));
  const put = new URL(createR2WorkerUrl(config, 'PUT', 'processed/user_1/asset_1/720p/video.mp4', 900, now));
  assert.equal(get.hostname, `${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`);
  assert.equal(get.pathname, '/nexora-media/users/user_1/media/asset_1');
  assert.equal(get.searchParams.get('X-Amz-Expires'), '900');
  assert.match(get.searchParams.get('X-Amz-Signature') || '', /^[a-f0-9]{64}$/);
  assert.equal(put.pathname, '/nexora-media/processed/user_1/asset_1/720p/video.mp4');
  assert.match(put.searchParams.get('X-Amz-Signature') || '', /^[a-f0-9]{64}$/);
});

test('R2 worker rejects traversal and invalid expiry before signing', () => {
  const config = resolveR2WorkerConfig(env);
  assert.throws(() => createR2WorkerUrl(config, 'GET', '../private'), /Invalid R2 worker request/);
  assert.throws(() => createR2WorkerUrl(config, 'DELETE', 'users/user_1/media/asset_1'), /Invalid R2 worker request/);
  assert.throws(() => createR2WorkerUrl(config, 'GET', 'users/user_1/media/asset_1', 0), /expiry/);
});
