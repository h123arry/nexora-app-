import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createR2ObjectKey,
  createR2PresignedUrl,
  buildR2OriginUploadRecords,
  resolveR2Config,
  validateR2Upload,
  isCurrentPublicProfileMedia,
  r2MediaGatewayUrl,
  selectR2VideoPlaybackPath,
  selectR2MediaDeliveryPath,
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
  assert.equal(validateR2Upload('audio/3gpp', 1000).kind, 'audio');
  assert.equal(validateR2Upload('application/zip', 1000).kind, 'document');
  assert.equal(validateR2Upload('application/vnd.oasis.opendocument.text', 1000).kind, 'document');
  assert.equal(validateR2Upload('application/json', 1000).kind, 'document');
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



test('R2 image delivery selects only a generation-matched optimized WebP rendition', () => {
  const original = 'users/user_123/media/image-456';
  const asset = {
    storagePath: original, kind: 'image', status: 'ready', generation: '1795090000000',
    imageVariants: [
      { width: 480, path: 'processed/user_123/image-456/1795090000000/image-480.webp' },
      { width: 1280, path: 'processed/user_123/image-456/1795090000000/image-1280.webp' },
      { width: 1920, path: 'processed/user_123/image-456/1795090000000/image-1920.webp' },
      { width: 2048, path: 'processed/other/image-456/1795090000000/image-2048.webp' },
    ],
  };
  assert.equal(selectR2MediaDeliveryPath(asset, 'user_123', 'image-456'),
    'processed/user_123/image-456/1795090000000/image-1280.webp');
  assert.equal(selectR2MediaDeliveryPath({ ...asset, imageVariants: [] }, 'user_123', 'image-456'), original);
  assert.equal(selectR2MediaDeliveryPath({ ...asset, generation: 'bad' }, 'user_123', 'image-456'), original);
  assert.equal(selectR2MediaDeliveryPath(asset, 'other-user', 'image-456'), null);
});


test('R2 playback prefers a valid 720p rendition and falls back to the immutable original', () => {
  const original = 'users/user_123/media/asset-456';
  assert.equal(selectR2VideoPlaybackPath({ storagePath: original, kind: 'video', status: 'uploaded' }, 'user_123', 'asset-456'), original);
  assert.equal(selectR2VideoPlaybackPath({ storagePath: original, kind: 'video', status: 'processing' }, 'user_123', 'asset-456'), original);
  assert.equal(selectR2VideoPlaybackPath({
    storagePath: original, kind: 'video', status: 'ready',
    renditions: [
      { height: 360, mp4Path: 'processed/user_123/asset-456/1795090000000/360p/video.mp4' },
      { height: 720, mp4Path: 'processed/user_123/asset-456/1795090000000/720p/video.mp4' },
      { height: 1080, mp4Path: 'processed/other/asset-456/1795090000000/1080p/video.mp4' },
    ],
  }, 'user_123', 'asset-456'), 'processed/user_123/asset-456/1795090000000/720p/video.mp4');
  assert.equal(selectR2VideoPlaybackPath({
    storagePath: original, kind: 'video', status: 'ready',
    renditions: [{ height: 720, mp4Path: 'processed/user_123/asset-456/1795090000000/../../private.mp4' }],
  }, 'user_123', 'asset-456'), original);
  assert.equal(selectR2VideoPlaybackPath({
    storagePath: original, kind: 'video', status: 'ready',
    renditions: [{ height: 720, mp4Path: 'processed/user_123/asset-456/not-a-generation/720p/video.mp4' }],
  }, 'user_123', 'asset-456'), original);
  assert.equal(selectR2VideoPlaybackPath({ storagePath: 'users/other/media/asset-456', kind: 'video', status: 'ready' }, 'user_123', 'asset-456'), null);
});
