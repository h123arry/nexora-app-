import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createR2ObjectKey,
  createR2PresignedUrl,
  resolveR2Config,
  validateR2Upload,
} from '../server/r2Storage';

const env = {
  R2_ACCOUNT_ID: 'a169d97ea553f4ff19622a3e3932d0d7',
  R2_ACCESS_KEY_ID: 'test-access-key',
  R2_SECRET_ACCESS_KEY: 'test-secret-key',
  R2_BUCKET_NAME: 'nexora-media',
};

test('R2 configuration is optional when no credentials are supplied', () => {
  assert.equal(resolveR2Config({} as NodeJS.ProcessEnv), null);
});

test('R2 configuration rejects partial or unsafe credentials', () => {
  assert.throws(() => resolveR2Config({ R2_ACCOUNT_ID: env.R2_ACCOUNT_ID } as NodeJS.ProcessEnv), /Incomplete R2 configuration/);
  assert.throws(() => resolveR2Config({ ...env, R2_ENDPOINT: 'https://attacker.example' } as NodeJS.ProcessEnv), /Cloudflare R2 S3 endpoint/);
});

test('R2 configuration resolves the account endpoint', () => {
  const config = resolveR2Config(env as NodeJS.ProcessEnv);
  assert.ok(config);
  assert.equal(config.endpoint, 'https://a169d97ea553f4ff19622a3e3932d0d7.r2.cloudflarestorage.com');
  assert.equal(config.bucket, 'nexora-media');
});

test('R2 object keys are bound to validated owner and asset IDs', () => {
  assert.equal(createR2ObjectKey('user_123', 'asset-456'), 'users/user_123/media/asset-456');
  assert.throws(() => createR2ObjectKey('../other', 'asset-456'), /Invalid R2 media owner/);
});

test('R2 media policy enforces MIME allowlists and size limits', () => {
  assert.equal(validateR2Upload('image/webp', 1024).kind, 'image');
  assert.equal(validateR2Upload('video/mp4', 1000).kind, 'video');
  assert.throws(() => validateR2Upload('application/pdf', 1000), /unsupported/);
  assert.throws(() => validateR2Upload('image/jpeg', 13 * 1024 * 1024), /size limit/);
});

test('R2 presigned PUT binds the content type and has a bounded expiry', () => {
  const config = resolveR2Config(env as NodeJS.ProcessEnv)!;
  const url = new URL(createR2PresignedUrl(config, 'PUT', 'users/user_123/media/asset-456', 900, 'image/webp', new Date('2026-11-19T12:00:00.000Z'), true));
  assert.equal(url.hostname, 'a169d97ea553f4ff19622a3e3932d0d7.r2.cloudflarestorage.com');
  assert.equal(url.pathname, '/nexora-media/users/user_123/media/asset-456');
  assert.equal(url.searchParams.get('X-Amz-SignedHeaders'), 'content-type;host;if-none-match');
  assert.equal(url.searchParams.get('X-Amz-Expires'), '900');
  assert.match(url.searchParams.get('X-Amz-Signature') || '', /^[a-f0-9]{64}$/);
  assert.throws(() => createR2PresignedUrl(config, 'GET', 'users/user_123/media/asset-456', 604801), /between 1 second and 7 days/);
});
