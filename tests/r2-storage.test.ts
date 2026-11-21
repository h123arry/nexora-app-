import test from 'node:test';
import assert from 'node:assert/strict';
import { generateKeyPairSync, sign } from 'node:crypto';
import { isAllowedR2WorkerObject, resetGitHubActionsOidcJwksCacheForTests, verifyGitHubActionsOidcToken } from '../server/githubActionsOidc';
import {
  createR2ObjectKey,
  createR2PresignedUrl,
  buildR2OriginUploadRecords,
  resolveR2Config,
  validateR2Upload,
  isCurrentPublicProfileMedia,
  r2MediaGatewayUrl,
  selectR2VideoPlaybackPath,
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
  assert.equal(validateR2Upload('application/pdf', 1000).kind, 'document');
  assert.equal(validateR2Upload('application/vnd.openxmlformats-officedocument.wordprocessingml.document', 1000).kind, 'document');
  assert.equal(validateR2Upload('audio/mpeg', 1000).kind, 'audio');
  assert.throws(() => validateR2Upload('application/x-msdownload', 1000), /unsupported/);
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

test('R2 completion produces the same verified Origin record shape as Firebase ingestion', () => {
  const records = buildR2OriginUploadRecords({
    assetId: 'asset-456',
    ownerUid: 'user_123',
    mediaGeneration: '1795090000000',
    contentDigest: 'a'.repeat(64),
    contentType: 'image/webp',
    byteSize: 2048,
    studioExport: false,
  });
  assert.equal(records.origin.ownerUid, 'user_123');
  assert.equal(records.origin.digestAlgorithm, 'sha256');
  assert.equal(records.origin.lineageState, 'unlinked');
  assert.equal(records.event.eventType, 'uploaded_to_nexora');
  assert.equal(records.event.eventId, 'generation_1795090000000');
  assert.throws(() => buildR2OriginUploadRecords({
    assetId: 'asset-456', ownerUid: 'user_123', mediaGeneration: 'not-a-generation',
    contentDigest: 'a'.repeat(64), contentType: 'image/webp', byteSize: 2048, studioExport: false,
  }), /immutable media generation/);
});


test('public profile media is delivered only while the profile points to the exact current asset', () => {
  const avatarUrl = r2MediaGatewayUrl('avatar-123');
  const coverUrl = r2MediaGatewayUrl('cover-456');

  assert.equal(isCurrentPublicProfileMedia('profile-avatar', 'avatar-123', { avatar: avatarUrl }), true);
  assert.equal(isCurrentPublicProfileMedia('profile-cover', 'cover-456', { coverImage: coverUrl }), true);

  // Replaced assets, mismatched purposes, absent projections and post media
  // must not gain public access through the profile-media exception.
  assert.equal(isCurrentPublicProfileMedia('profile-avatar', 'avatar-123', { avatar: r2MediaGatewayUrl('new-avatar') }), false);
  assert.equal(isCurrentPublicProfileMedia('profile-cover', 'cover-456', { coverImage: avatarUrl }), false);
  assert.equal(isCurrentPublicProfileMedia('post', 'avatar-123', { avatar: avatarUrl }), false);
  assert.equal(isCurrentPublicProfileMedia('profile-avatar', 'avatar-123', null), false);
});


test('R2 playback prefers a valid 720p rendition and falls back to the immutable original', () => {
  const original = 'users/user_123/media/asset-456';
  assert.equal(selectR2VideoPlaybackPath({ storagePath: original, kind: 'video', status: 'uploaded' }, 'user_123', 'asset-456'), original);
  assert.equal(selectR2VideoPlaybackPath({ storagePath: original, kind: 'video', status: 'processing' }, 'user_123', 'asset-456'), original);
  assert.equal(selectR2VideoPlaybackPath({
    storagePath: original, kind: 'video', status: 'ready',
    renditions: [
      { height: 360, mp4Path: 'processed/user_123/asset-456/360p/video.mp4' },
      { height: 720, mp4Path: 'processed/user_123/asset-456/720p/video.mp4' },
      { height: 1080, mp4Path: 'processed/other/asset-456/1080p/video.mp4' },
    ],
  }, 'user_123', 'asset-456'), 'processed/user_123/asset-456/720p/video.mp4');
  assert.equal(selectR2VideoPlaybackPath({
    storagePath: original, kind: 'video', status: 'ready',
    renditions: [{ height: 720, mp4Path: 'processed/user_123/asset-456/../../private.mp4' }],
  }, 'user_123', 'asset-456'), original);
  assert.equal(selectR2VideoPlaybackPath({ storagePath: 'users/other/media/asset-456', kind: 'video', status: 'ready' }, 'user_123', 'asset-456'), null);
});


test('GitHub Actions OIDC signer accepts only the NEXORA production restoration workflow', async () => {
  const nowMs = Date.now();
  const nowSeconds = Math.floor(nowMs / 1000);
  const { privateKey, publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
  const jwk = { ...publicKey.export({ format: 'jwk' }), kid: 'nexora-oidc-test-key', use: 'sig' };
  const fetchImpl: typeof fetch = async () => new Response(JSON.stringify({ keys: [jwk] }), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  });
  const claims = {
    iss: 'https://token.actions.githubusercontent.com',
    aud: 'nexora-r2-media-worker',
    sub: 'repo:h123arry/nexora-app-:environment:nexora-production',
    repository: 'h123arry/nexora-app-',
    ref: 'refs/heads/main',
    workflow_ref: 'h123arry/nexora-app-/.github/workflows/restore-r2-videos-no-cloud-run.yml@refs/heads/main',
    environment: 'nexora-production',
    event_name: 'push',
    iat: nowSeconds,
    nbf: nowSeconds - 1,
    exp: nowSeconds + 300,
  };
  const makeToken = (payload: Record<string, unknown>, corruptSignature = false) => {
    const header = Buffer.from(JSON.stringify({ alg: 'RS256', kid: 'nexora-oidc-test-key' })).toString('base64url');
    const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
    const signingInput = `${header}.${body}`;
    const signature = sign('RSA-SHA256', Buffer.from(signingInput), privateKey).toString('base64url');
    return `${signingInput}.${corruptSignature ? Buffer.alloc(256).toString('base64url') : signature}`;
  };

  resetGitHubActionsOidcJwksCacheForTests();
  const verified = await verifyGitHubActionsOidcToken(makeToken(claims), { fetchImpl, nowMs });
  assert.equal(verified.repository, 'h123arry/nexora-app-');

  await assert.rejects(
    verifyGitHubActionsOidcToken(makeToken({ ...claims, repository: 'attacker/other-repo' }), { fetchImpl, nowMs }),
    /not authorized/,
  );
  await assert.rejects(
    verifyGitHubActionsOidcToken(makeToken({ ...claims, ref: 'refs/heads/feature' }), { fetchImpl, nowMs }),
    /not authorized/,
  );
  await assert.rejects(
    verifyGitHubActionsOidcToken(makeToken(claims, true), { fetchImpl, nowMs }),
    /signature is invalid/,
  );
});

test('R2 worker signer allows only owner-scoped user source reads and processed rendition writes', () => {
  assert.equal(isAllowedR2WorkerObject('GET', 'users/user_1/media/asset_1'), true);
  assert.equal(isAllowedR2WorkerObject('GET', 'chats/dm/media/user_1/asset_1'), false);
  assert.equal(isAllowedR2WorkerObject('GET', 'processed/user_1/asset_1/123/720p/video.mp4'), false);
  assert.equal(isAllowedR2WorkerObject('PUT', 'processed/user_1/asset_1/123/720p/video.mp4', 'video/mp4'), true);
  assert.equal(isAllowedR2WorkerObject('PUT', 'processed/user_1/asset_1/123/720p/index.m3u8', 'application/vnd.apple.mpegurl'), true);
  assert.equal(isAllowedR2WorkerObject('PUT', 'processed/user_1/asset_1/123/720p/video.mp4', 'text/plain'), false);
  assert.equal(isAllowedR2WorkerObject('PUT', 'users/user_1/media/asset_1', 'video/mp4'), false);
  assert.equal(isAllowedR2WorkerObject('PUT', 'processed/user_1/asset_1/123/../../private.mp4', 'video/mp4'), false);
});
