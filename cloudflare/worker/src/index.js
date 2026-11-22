const ALLOWED_ORIGINS = new Set([
  'https://nexoraapp.com.ng',
  'https://www.nexoraapp.com.ng',
  'capacitor://localhost',
  'https://localhost',
  'http://localhost:5173',
]);

const FIREBASE_JWKS_URL = 'https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com';
let jwksCache = { expiresAt: 0, keys: [] };

function base64UrlToBytes(value) {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const binary = atob(normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '='));
  return Uint8Array.from(binary, char => char.charCodeAt(0));
}

function decodePart(value) {
  return JSON.parse(new TextDecoder().decode(base64UrlToBytes(value)));
}

async function getFirebaseKey(kid) {
  if (Date.now() >= jwksCache.expiresAt || !jwksCache.keys.length) {
    const response = await fetch(FIREBASE_JWKS_URL, { headers: { Accept: 'application/json' } });
    if (!response.ok) throw new Error('identity_provider_unavailable');
    const data = await response.json();
    if (!Array.isArray(data.keys)) throw new Error('identity_provider_unavailable');
    jwksCache = { keys: data.keys, expiresAt: Date.now() + 60 * 60 * 1000 };
  }
  const key = jwksCache.keys.find(item => item.kid === kid && item.kty === 'RSA' && item.alg === 'RS256');
  if (!key) throw new Error('invalid_identity_token');
  return crypto.subtle.importKey('jwk', key, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['verify']);
}

async function verifyFirebaseToken(request, projectId) {
  const authorization = request.headers.get('Authorization') || '';
  const match = authorization.match(/^Bearer ([A-Za-z0-9._~-]+)$/);
  if (!match) return null;
  const parts = match[1].split('.');
  if (parts.length !== 3) return null;
  try {
    const header = decodePart(parts[0]);
    const claims = decodePart(parts[1]);
    if (header.alg !== 'RS256' || typeof header.kid !== 'string') return null;
    const key = await getFirebaseKey(header.kid);
    const signingInput = new TextEncoder().encode(parts[0] + '.' + parts[1]);
    const signature = base64UrlToBytes(parts[2]);
    const valid = await crypto.subtle.verify('RSASSA-PKCS1-v1_5', key, signature, signingInput);
    const now = Math.floor(Date.now() / 1000);
    if (!valid
      || claims.iss !== `https://securetoken.google.com/${projectId}`
      || claims.aud !== projectId
      || typeof claims.sub !== 'string' || !claims.sub
      || claims.sub.length > 128
      || typeof claims.exp !== 'number' || claims.exp <= now
      || typeof claims.iat !== 'number' || claims.iat > now + 60) return null;
    return { uid: claims.sub };
  } catch {
    return null;
  }
}

function corsHeaders(origin) {
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Authorization, Content-Type, X-Request-Id',
    'Access-Control-Max-Age': '600',
    'Vary': 'Origin',
  };
}

function json(body, status, cors, requestId) {
  const headers = new Headers(cors);
  headers.set('Content-Type', 'application/json; charset=utf-8');
  headers.set('Cache-Control', 'no-store');
  headers.set('X-Content-Type-Options', 'nosniff');
  headers.set('X-Request-Id', requestId);
  return new Response(JSON.stringify(body), { status, headers });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const origin = request.headers.get('Origin') || '';
    if (origin && !ALLOWED_ORIGINS.has(origin)) {
      return Response.json({ error: 'origin_not_allowed' }, { status: 403, headers: { 'Cache-Control': 'no-store' } });
    }
    const cors = origin ? corsHeaders(origin) : {};
    const requestId = request.headers.get('X-Request-Id') || crypto.randomUUID();
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
    if (request.method !== 'GET') return json({ error: 'method_not_allowed' }, 405, cors, requestId);

    if (url.pathname === '/healthz') {
      return json({ status: 'ok', service: 'nexora-api-staging' }, 200, cors, requestId);
    }
    if (url.pathname === '/readyz') {
      try {
        await env.DB.prepare('SELECT 1 AS ready').first();
        return json({ status: 'ready', database: 'connected' }, 200, cors, requestId);
      } catch {
        return json({ error: 'service_not_ready' }, 503, cors, requestId);
      }
    }
    if (url.pathname === '/api/v1/profile') {
      const identity = await verifyFirebaseToken(request, env.FIREBASE_PROJECT_ID);
      if (!identity) return json({ error: 'unauthenticated' }, 401, cors, requestId);
      try {
        const profile = await env.DB.prepare(
          'SELECT uid, username, display_name, avatar_url, bio, location, visibility, created_at, updated_at FROM nexora_profiles WHERE uid = ? LIMIT 1',
        ).bind(identity.uid).first();
        if (!profile) return json({ error: 'profile_not_migrated' }, 404, cors, requestId);
        return json({ profile }, 200, cors, requestId);
      } catch {
        return json({ error: 'service_unavailable' }, 503, cors, requestId);
      }
    }
    return json({ error: 'not_found' }, 404, cors, requestId);
  },
};
