import { createHmac, createHash } from 'node:crypto';

export type R2Config = {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
  endpoint: string;
};

export type R2UploadPolicy = {
  kind: 'image' | 'video' | 'audio' | 'document';
  maxBytes: number;
};

const MEDIA_POLICIES: Record<string, R2UploadPolicy> = {
  'image/jpeg': { kind: 'image', maxBytes: 12 * 1024 * 1024 },
  'image/png': { kind: 'image', maxBytes: 12 * 1024 * 1024 },
  'image/webp': { kind: 'image', maxBytes: 12 * 1024 * 1024 },
  'image/gif': { kind: 'image', maxBytes: 12 * 1024 * 1024 },
  'image/avif': { kind: 'image', maxBytes: 12 * 1024 * 1024 },
  'image/heic': { kind: 'image', maxBytes: 12 * 1024 * 1024 },
  'image/heif': { kind: 'image', maxBytes: 12 * 1024 * 1024 },
  'video/mp4': { kind: 'video', maxBytes: 250 * 1024 * 1024 },
  'video/webm': { kind: 'video', maxBytes: 250 * 1024 * 1024 },
  'video/quicktime': { kind: 'video', maxBytes: 250 * 1024 * 1024 },
  'video/ogg': { kind: 'video', maxBytes: 250 * 1024 * 1024 },
  'audio/mpeg': { kind: 'audio', maxBytes: 50 * 1024 * 1024 },
  'audio/mp4': { kind: 'audio', maxBytes: 50 * 1024 * 1024 },
  'audio/wav': { kind: 'audio', maxBytes: 50 * 1024 * 1024 },
  'audio/webm': { kind: 'audio', maxBytes: 50 * 1024 * 1024 },
  'audio/ogg': { kind: 'audio', maxBytes: 50 * 1024 * 1024 },
  'audio/aac': { kind: 'audio', maxBytes: 50 * 1024 * 1024 },
  'audio/opus': { kind: 'audio', maxBytes: 50 * 1024 * 1024 },
  'audio/flac': { kind: 'audio', maxBytes: 50 * 1024 * 1024 },
  'audio/x-flac': { kind: 'audio', maxBytes: 50 * 1024 * 1024 },
  'audio/x-m4a': { kind: 'audio', maxBytes: 50 * 1024 * 1024 },
  'audio/3gpp': { kind: 'audio', maxBytes: 50 * 1024 * 1024 },
  'application/pdf': { kind: 'document', maxBytes: 50 * 1024 * 1024 },
  'application/msword': { kind: 'document', maxBytes: 50 * 1024 * 1024 },
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': { kind: 'document', maxBytes: 50 * 1024 * 1024 },
  'application/vnd.ms-excel': { kind: 'document', maxBytes: 50 * 1024 * 1024 },
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': { kind: 'document', maxBytes: 50 * 1024 * 1024 },
  'application/vnd.ms-powerpoint': { kind: 'document', maxBytes: 50 * 1024 * 1024 },
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': { kind: 'document', maxBytes: 50 * 1024 * 1024 },
  'text/plain': { kind: 'document', maxBytes: 10 * 1024 * 1024 },
  'text/csv': { kind: 'document', maxBytes: 20 * 1024 * 1024 },
  'application/rtf': { kind: 'document', maxBytes: 20 * 1024 * 1024 },
};

export function resolveR2Config(env: NodeJS.ProcessEnv = process.env): R2Config | null {
  const names = ['R2_ACCOUNT_ID', 'R2_ACCESS_KEY_ID', 'R2_SECRET_ACCESS_KEY', 'R2_BUCKET_NAME'];
  const values = names.map(name => env[name]?.trim() || '');
  if (values.every(value => !value)) return null;
  const missing = names.filter(name => !env[name]?.trim());
  if (missing.length) throw new Error(`Incomplete R2 configuration: ${missing.join(', ')}`);
  const [accountId, accessKeyId, secretAccessKey, bucket] = values;
  if (!/^[a-f0-9]{32}$/i.test(accountId)) throw new Error('R2_ACCOUNT_ID must be a 32-character Cloudflare account ID.');
  if (!/^[A-Za-z0-9_-]{3,63}$/.test(bucket)) throw new Error('R2_BUCKET_NAME is invalid.');
  const endpoint = (env.R2_ENDPOINT?.trim() || `https://${accountId}.r2.cloudflarestorage.com`).replace(/\/$/, '');
  let parsed: URL;
  try { parsed = new URL(endpoint); } catch { throw new Error('R2_ENDPOINT must be a valid HTTPS endpoint.'); }
  if (parsed.protocol !== 'https:' || parsed.username || parsed.password || parsed.pathname !== '/' || parsed.search || parsed.hash
    || parsed.hostname !== `${accountId}.r2.cloudflarestorage.com`) {
    throw new Error('R2_ENDPOINT must use this account’s Cloudflare R2 S3 endpoint.');
  }
  return { accountId, accessKeyId, secretAccessKey, bucket, endpoint };
}

export function validateR2Upload(contentType: unknown, size: unknown): R2UploadPolicy {
  if (typeof contentType !== 'string' || typeof size !== 'number' || !Number.isSafeInteger(size) || size <= 0) {
    throw new Error('A valid media type and positive file size are required.');
  }
  const policy = MEDIA_POLICIES[contentType.split(';')[0].trim().toLowerCase()];
  if (!policy || size > policy.maxBytes) throw new Error('The file type is unsupported or exceeds the upload size limit.');
  return policy;
}

export function createR2ObjectKey(ownerId: string, mediaId: string): string {
  if (!/^[A-Za-z0-9_-]{1,128}$/.test(ownerId) || !/^[A-Za-z0-9_-]{1,128}$/.test(mediaId)) {
    throw new Error('Invalid R2 media owner or asset identifier.');
  }
  return `users/${ownerId}/media/${mediaId}`;
}

function hmac(key: Buffer | string, value: string, encoding?: 'hex'): Buffer | string {
  const digest = createHmac('sha256', key).update(value, 'utf8');
  return encoding ? digest.digest(encoding) : digest.digest();
}

function sha256(value: string): string {
  return createHash('sha256').update(value, 'utf8').digest('hex');
}

function encodePath(path: string): string {
  return path.split('/').map(segment => encodeURIComponent(segment).replace(/[!'()*]/g, char => `%${char.charCodeAt(0).toString(16).toUpperCase()}`)).join('/');
}

function canonicalQuery(params: URLSearchParams): string {
  return [...params.entries()]
    .map(([key, value]) => [encodeURIComponent(key), encodeURIComponent(value)] as const)
    .sort(([aKey, aValue], [bKey, bValue]) => aKey.localeCompare(bKey) || aValue.localeCompare(bValue))
    .map(([key, value]) => `${key}=${value}`)
    .join('&');
}

export function createR2PresignedUrl(
  config: R2Config,
  method: 'PUT' | 'GET' | 'HEAD' | 'DELETE',
  objectKey: string,
  expiresSeconds = 900,
  contentType?: string,
  now = new Date(),
  createOnly = false,
): string {
  if (!objectKey || objectKey.startsWith('/') || objectKey.split('/').some(part => !part || part === '.' || part === '..' || part.includes('\\'))) {
    throw new Error('Invalid R2 object key.');
  }
  if (!Number.isInteger(expiresSeconds) || expiresSeconds < 1 || expiresSeconds > 604800) {
    throw new Error('R2 URL expiry must be between 1 second and 7 days.');
  }
  const host = new URL(config.endpoint).host;
  const canonicalUri = `/${encodePath(config.bucket)}/${encodePath(objectKey)}`;
  const dateStamp = now.toISOString().slice(0, 10).replace(/-/g, '');
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '');
  const scope = `${dateStamp}/auto/s3/aws4_request`;
  if (createOnly && method !== 'PUT') throw new Error('Create-only conditions are supported only for R2 uploads.');
  const signedHeaders = contentType && method === 'PUT'
    ? (createOnly ? 'content-type;host;if-none-match' : 'content-type;host') : 'host';
  const params = new URLSearchParams({
    'X-Amz-Algorithm': 'AWS4-HMAC-SHA256',
    'X-Amz-Credential': `${config.accessKeyId}/${scope}`,
    'X-Amz-Date': amzDate,
    'X-Amz-Expires': String(expiresSeconds),
    'X-Amz-SignedHeaders': signedHeaders,
  });
  const headers = contentType && method === 'PUT'
    ? `content-type:${contentType.trim().toLowerCase()}\nhost:${host}\n${createOnly ? 'if-none-match:*\n' : ''}`
    : `host:${host}\n`;
  const query = canonicalQuery(params);
  const canonicalRequest = [method, canonicalUri, query, headers, signedHeaders, 'UNSIGNED-PAYLOAD'].join('\n');
  const stringToSign = ['AWS4-HMAC-SHA256', amzDate, scope, sha256(canonicalRequest)].join('\n');
  const dateKey = hmac(`AWS4${config.secretAccessKey}`, dateStamp) as Buffer;
  const regionKey = hmac(dateKey, 'auto') as Buffer;
  const serviceKey = hmac(regionKey, 's3') as Buffer;
  const signingKey = hmac(serviceKey, 'aws4_request') as Buffer;
  const signature = hmac(signingKey, stringToSign, 'hex') as string;
  params.set('X-Amz-Signature', signature);
  return `${config.endpoint}${canonicalUri}?${canonicalQuery(params)}`;
}


export type R2OriginUploadInput = {
  assetId: string;
  ownerUid: string;
  mediaGeneration: string;
  contentDigest: string;
  contentType: string;
  byteSize: number;
  studioExport: boolean;
};

/** Keep the server-side R2 ingest record shape aligned with functions/src/originPolicy.ts. */
export function buildR2OriginUploadRecords(input: R2OriginUploadInput) {
  if (!/^[A-Za-z0-9_-]{1,128}$/.test(input.assetId) || !/^[A-Za-z0-9_-]{1,128}$/.test(input.ownerUid)) {
    throw new Error('Origin asset and owner identifiers must be valid.');
  }
  if (!/^\d{1,32}$/.test(input.mediaGeneration)) throw new Error('A valid immutable media generation is required.');
  if (!/^[a-f0-9]{64}$/.test(input.contentDigest)) throw new Error('A server-computed SHA-256 content digest is required.');
  if (!Number.isSafeInteger(input.byteSize) || input.byteSize <= 0) throw new Error('Origin media size must be a positive safe integer.');
  if (typeof input.contentType !== 'string' || input.contentType.length < 3 || input.contentType.length > 128) {
    throw new Error('A valid media content type is required.');
  }
  const originKind = input.studioExport ? 'studio_export' : 'upload_ingest';
  return {
    origin: {
      assetId: input.assetId, ownerUid: input.ownerUid, originKind,
      contentDigest: input.contentDigest, digestAlgorithm: 'sha256',
      mediaGeneration: input.mediaGeneration, contentType: input.contentType,
      byteSize: input.byteSize, credentialState: 'absent',
      lineageState: 'unlinked', disclosureState: 'unknown', schemaVersion: 1,
    },
    event: {
      eventId: `generation_${input.mediaGeneration}`, assetId: input.assetId,
      actorUid: input.ownerUid, eventType: 'uploaded_to_nexora',
      contributionRole: 'uploader', disclosureSource: 'platform_observed',
      mediaGeneration: input.mediaGeneration, contentDigest: input.contentDigest,
      digestAlgorithm: 'sha256', schemaVersion: 1,
    },
  };
}

/** Public profile media is exposed only while the public projection points at this exact asset. */
export function isCurrentPublicProfileMedia(
  purpose: unknown,
  mediaId: string,
  publicProfile: Record<string, unknown> | null | undefined,
): boolean {
  if (!publicProfile || (purpose !== 'profile-avatar' && purpose !== 'profile-cover')) return false;
  const gatewayUrl = r2MediaGatewayUrl(mediaId);
  return purpose === 'profile-avatar'
    ? publicProfile.avatar === gatewayUrl
    : publicProfile.coverImage === gatewayUrl;
}

export function r2MediaGatewayUrl(mediaId: string): string {
  if (!/^[A-Za-z0-9_-]{1,128}$/.test(mediaId)) throw new Error('Invalid media asset identifier.');
  return `/api/media/${encodeURIComponent(mediaId)}`;
}
