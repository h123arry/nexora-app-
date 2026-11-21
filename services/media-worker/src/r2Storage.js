import { createHash, createHmac } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';

export function resolveR2WorkerConfig(env = process.env) {
  const accountId = env.R2_ACCOUNT_ID?.trim() || '';
  const accessKeyId = env.R2_ACCESS_KEY_ID?.trim() || '';
  const secretAccessKey = env.R2_SECRET_ACCESS_KEY?.trim() || '';
  const bucket = env.R2_BUCKET_NAME?.trim() || '';
  const signingEndpoint = env.R2_SIGNING_API_URL?.trim() || '';
  if (![accountId, accessKeyId, secretAccessKey, bucket, signingEndpoint].some(Boolean)) return null;

  if (signingEndpoint && !accessKeyId && !secretAccessKey) {
    if (!accountId || !bucket || !/^[a-f0-9]{32}$/i.test(accountId) || !/^[A-Za-z0-9_-]{3,63}$/.test(bucket)) {
      throw new Error('Incomplete Cloudflare R2 signing broker configuration');
    }
    let parsed;
    try { parsed = new URL(signingEndpoint); } catch { throw new Error('Invalid R2 signing broker URL'); }
    if (parsed.protocol !== 'https:' || parsed.hostname !== 'nexora-o3od.onrender.com'
      || parsed.pathname !== '/api/internal/r2-worker/sign' || parsed.search || parsed.hash) {
      throw new Error('R2 signing broker must use the NEXORA production HTTPS endpoint');
    }
    return { accountId, bucket, signingEndpoint };
  }

  if (![accountId, accessKeyId, secretAccessKey, bucket].every(Boolean)) {
    throw new Error('Incomplete Cloudflare R2 worker credentials');
  }
  if (!/^[a-f0-9]{32}$/i.test(accountId) || !/^[A-Za-z0-9_-]{3,63}$/.test(bucket)) {
    throw new Error('Invalid Cloudflare R2 worker configuration');
  }
  return { accountId, accessKeyId, secretAccessKey, bucket, endpoint: `https://${accountId}.r2.cloudflarestorage.com` };
}

function hmac(key, value) {
  return createHmac('sha256', key).update(value, 'utf8').digest();
}
function sha256(value) {
  return createHash('sha256').update(value, 'utf8').digest('hex');
}
function encodePath(value) {
  return value.split('/').map(part => encodeURIComponent(part).replace(/[!'()*]/g, c => `%${c.charCodeAt(0).toString(16).toUpperCase()}`)).join('/');
}
function canonicalQuery(params) {
  return [...params.entries()]
    .map(([key, value]) => [encodeURIComponent(key), encodeURIComponent(value)])
    .sort(([ak, av], [bk, bv]) => ak.localeCompare(bk) || av.localeCompare(bv))
    .map(([key, value]) => `${key}=${value}`).join('&');
}

export function createR2WorkerUrl(config, method, objectKey, expiresSeconds = 900, now = new Date()) {
  if (!config || !['GET', 'PUT'].includes(method) || typeof objectKey !== 'string'
    || !objectKey || objectKey.startsWith('/') || objectKey.split('/').some(part => !part || part === '.' || part === '..' || part.includes(String.fromCharCode(92)))) {
    throw new Error('Invalid R2 worker request');
  }
  if (!Number.isInteger(expiresSeconds) || expiresSeconds < 1 || expiresSeconds > 604800) {
    throw new Error('Invalid R2 worker URL expiry');
  }
  const host = new URL(config.endpoint).host;
  const uri = `/${encodePath(config.bucket)}/${encodePath(objectKey)}`;
  const dateStamp = now.toISOString().slice(0, 10).replace(/-/g, '');
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '');
  const scope = `${dateStamp}/auto/s3/aws4_request`;
  const params = new URLSearchParams({
    'X-Amz-Algorithm': 'AWS4-HMAC-SHA256',
    'X-Amz-Credential': `${config.accessKeyId}/${scope}`,
    'X-Amz-Date': amzDate,
    'X-Amz-Expires': String(expiresSeconds),
    'X-Amz-SignedHeaders': 'host',
  });
  const query = canonicalQuery(params);
  const canonicalRequest = [method, uri, query, `host:${host}\n`, 'host', 'UNSIGNED-PAYLOAD'].join('\n');
  const stringToSign = ['AWS4-HMAC-SHA256', amzDate, scope, sha256(canonicalRequest)].join('\n');
  const dateKey = hmac(`AWS4${config.secretAccessKey}`, dateStamp);
  const regionKey = hmac(dateKey, 'auto');
  const serviceKey = hmac(regionKey, 's3');
  const signingKey = hmac(serviceKey, 'aws4_request');
  params.set('X-Amz-Signature', hmac(signingKey, stringToSign).toString('hex'));
  return `${config.endpoint}${uri}?${canonicalQuery(params)}`;
}


async function createR2WorkerSignedUrl(config, method, objectKey, expiresSeconds = 900, contentType) {
  if (config.signingEndpoint) {
    const requestUrl = process.env.ACTIONS_ID_TOKEN_REQUEST_URL;
    const requestToken = process.env.ACTIONS_ID_TOKEN_REQUEST_TOKEN;
    if (!requestUrl || !requestToken) throw new Error('GitHub Actions OIDC token exchange is unavailable.');
    const oidcUrl = new URL(requestUrl);
    oidcUrl.searchParams.set('audience', 'nexora-r2-media-worker');
    const identityResponse = await fetch(oidcUrl, {
      headers: { authorization: `Bearer ${requestToken}` },
    });
    if (!identityResponse.ok) throw new Error(`GitHub Actions OIDC token request failed (${identityResponse.status})`);
    const identity = await identityResponse.json();
    if (typeof identity?.value !== 'string' || !identity.value) throw new Error('GitHub Actions did not return an OIDC identity token.');

    const response = await fetch(config.signingEndpoint, {
      method: 'POST',
      headers: { authorization: `Bearer ${identity.value}`, 'content-type': 'application/json' },
      body: JSON.stringify({ method, objectKey, expiresSeconds, contentType }),
    });
    if (!response.ok) throw new Error(`NEXORA R2 signing broker rejected the request (${response.status})`);
    const signed = await response.json();
    if (typeof signed?.url !== 'string' || !signed.url.startsWith('https://')) {
      throw new Error('NEXORA R2 signing broker returned an invalid URL.');
    }
    return signed.url;
  }
  return createR2WorkerUrl(config, method, objectKey, expiresSeconds);
}

export async function downloadR2Object(config, objectKey, destination) {
  const response = await fetch(await createR2WorkerSignedUrl(config, 'GET', objectKey));
  if (!response.ok || !response.body) throw new Error(`R2 source download failed (${response.status})`);
  await pipeline(Readable.fromWeb(response.body), (await import('node:fs')).createWriteStream(destination));
}
export async function uploadR2Object(config, sourcePath, objectKey, contentType, cacheControl) {
  const response = await fetch(await createR2WorkerSignedUrl(config, 'PUT', objectKey, 900, contentType), {
    method: 'PUT',
    headers: { 'content-type': contentType, 'cache-control': cacheControl },
    body: createReadStream(sourcePath),
    duplex: 'half',
  });
  if (!response.ok) throw new Error(`R2 rendition upload failed (${response.status})`);
}
