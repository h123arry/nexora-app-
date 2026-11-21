import { createPublicKey, verify as verifySignature } from 'node:crypto';

type GitHubJwk = JsonWebKey & { kid?: string; use?: string };
type GitHubOidcClaims = Record<string, unknown> & {
  iss?: string;
  aud?: string | string[];
  sub?: string;
  exp?: number;
  iat?: number;
  nbf?: number;
  repository?: string;
  ref?: string;
  workflow_ref?: string;
  environment?: string;
  event_name?: string;
};

let jwksCache: { keys: GitHubJwk[]; expiresAt: number } | null = null;

async function loadGitHubSigningKeys(fetchImpl: typeof fetch, nowMs: number): Promise<GitHubJwk[]> {
  if (jwksCache && jwksCache.expiresAt > nowMs) return jwksCache.keys;
  const response = await fetchImpl('https://token.actions.githubusercontent.com/.well-known/jwks', {
    headers: { accept: 'application/json' },
  });
  if (!response.ok) throw new Error('GitHub Actions signing keys are unavailable.');
  const body = await response.json() as { keys?: GitHubJwk[] };
  if (!Array.isArray(body.keys) || body.keys.length === 0) throw new Error('GitHub Actions signing keys are invalid.');
  jwksCache = { keys: body.keys, expiresAt: nowMs + 30 * 60 * 1000 };
  return body.keys;
}

/** Verify that the caller is the production R2 restoration workflow on NEXORA main. */
export async function verifyGitHubActionsOidcToken(
  token: string,
  options: { fetchImpl?: typeof fetch; nowMs?: number } = {},
): Promise<GitHubOidcClaims> {
  if (typeof token !== 'string' || token.length > 16_384) throw new Error('A valid GitHub Actions identity token is required.');
  const parts = token.split('.');
  if (parts.length !== 3 || parts.some(part => !part)) throw new Error('GitHub Actions identity token is malformed.');

  let header: { alg?: string; kid?: string };
  let claims: GitHubOidcClaims;
  try {
    header = JSON.parse(Buffer.from(parts[0], 'base64url').toString('utf8'));
    claims = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
  } catch {
    throw new Error('GitHub Actions identity token is malformed.');
  }
  if (header.alg !== 'RS256' || typeof header.kid !== 'string') throw new Error('GitHub Actions token signing algorithm is not allowed.');

  const nowMs = options.nowMs ?? Date.now();
  const keys = await loadGitHubSigningKeys(options.fetchImpl ?? fetch, nowMs);
  const jwk = keys.find(key => key.kid === header.kid && key.kty === 'RSA' && key.use === 'sig');
  if (!jwk) throw new Error('GitHub Actions token signing key is unknown.');
  const publicKey = createPublicKey({ key: jwk, format: 'jwk' });
  const validSignature = verifySignature(
    'RSA-SHA256',
    Buffer.from(`${parts[0]}.${parts[1]}`),
    publicKey,
    Buffer.from(parts[2], 'base64url'),
  );
  if (!validSignature) throw new Error('GitHub Actions identity token signature is invalid.');

  const nowSeconds = Math.floor(nowMs / 1000);
  const audience = Array.isArray(claims.aud) ? claims.aud : [claims.aud];
  const expectedWorkflow = 'h123arry/nexora-app-/.github/workflows/restore-r2-videos-no-cloud-run.yml@refs/heads/main';
  if (claims.iss !== 'https://token.actions.githubusercontent.com'
    || !audience.includes('nexora-r2-media-worker')
    || claims.sub !== 'repo:h123arry/nexora-app-:environment:nexora-production'
    || claims.repository !== 'h123arry/nexora-app-'
    || claims.ref !== 'refs/heads/main'
    || claims.workflow_ref !== expectedWorkflow
    || claims.environment !== 'nexora-production'
    || !['push', 'schedule', 'workflow_dispatch'].includes(String(claims.event_name))
    || !Number.isFinite(claims.exp) || Number(claims.exp) <= nowSeconds
    || !Number.isFinite(claims.iat) || Number(claims.iat) < nowSeconds - 600
    || Number(claims.iat) > nowSeconds + 60
    || (claims.nbf !== undefined && Number(claims.nbf) > nowSeconds + 30)) {
    throw new Error('GitHub Actions identity is not authorized for NEXORA production R2 processing.');
  }
  return claims;
}

/** Permit source reads only from public-user media keys and output writes only below processed/. */
export function isAllowedR2WorkerObject(
  method: unknown,
  objectKey: unknown,
  contentType?: unknown,
): objectKey is string {
  if (typeof objectKey !== 'string' || objectKey.length > 1024 || objectKey.startsWith('/')) return false;
  const parts = objectKey.split('/');
  if (parts.some(part => !part || part === '.' || part === '..' || part.includes(String.fromCharCode(92)))) return false;
  if (method === 'GET') return /^users\/[A-Za-z0-9_-]{1,128}\/media\/[A-Za-z0-9_-]{1,128}$/.test(objectKey);
  if (method !== 'PUT') return false;
  const outputPath = /^processed\/[A-Za-z0-9_-]{1,128}\/[A-Za-z0-9_-]{1,128}\/\d{1,32}\/.+$/.test(objectKey);
  const extension = /\.(?:mp4|m3u8|ts|jpg|webp)$/i.test(parts.at(-1) || '');
  const allowedContentType = new Set([
    'video/mp4',
    'application/vnd.apple.mpegurl',
    'video/mp2t',
    'image/jpeg',
    'image/webp',
  ]).has(String(contentType || '').toLowerCase());
  return outputPath && extension && allowedContentType;
}

export function resetGitHubActionsOidcJwksCacheForTests(): void {
  jwksCache = null;
}
