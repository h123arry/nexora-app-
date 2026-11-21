const ALLOWED_ORIGINS = new Set([
  'https://nexora-o3od.onrender.com',
  'capacitor://localhost',
  'https://localhost',
  'http://localhost',
]);

function corsHeaders(origin) {
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Authorization, Content-Type, X-Request-Id',
    'Access-Control-Max-Age': '600',
    'Vary': 'Origin',
  };
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const origin = request.headers.get('Origin') || '';
    if (!ALLOWED_ORIGINS.has(origin)) {
      return Response.json({ error: 'origin_not_allowed' }, { status: 403, headers: { 'Cache-Control': 'no-store' } });
    }
    const cors = corsHeaders(origin);
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
    if (request.method !== 'POST' || url.pathname !== '/follow-state') {
      return Response.json({ error: 'not_found' }, { status: 404, headers: { ...cors, 'Cache-Control': 'no-store' } });
    }
    if (!env.NEXORA_API_ORIGIN) {
      return Response.json({ error: 'follow_origin_not_configured' }, { status: 503, headers: { ...cors, 'Cache-Control': 'no-store' } });
    }
    const authorization = request.headers.get('Authorization') || '';
    if (!/^Bearer \\S+$/.test(authorization)) {
      return Response.json({ error: 'unauthenticated' }, { status: 401, headers: { ...cors, 'Cache-Control': 'no-store' } });
    }
    const contentLength = Number(request.headers.get('Content-Length') || 0);
    if (contentLength > 2048) {
      return Response.json({ error: 'payload_too_large' }, { status: 413, headers: { ...cors, 'Cache-Control': 'no-store' } });
    }
    const requestId = request.headers.get('X-Request-Id') || crypto.randomUUID();
    let body;
    try {
      body = await request.json();
    } catch {
      return Response.json({ error: 'invalid_json' }, { status: 400, headers: { ...cors, 'Cache-Control': 'no-store' } });
    }
    if (!body || typeof body.creatorId !== 'string' || typeof body.following !== 'boolean') {
      return Response.json({ error: 'invalid_follow_request' }, { status: 400, headers: { ...cors, 'Cache-Control': 'no-store' } });
    }
    let upstream;
    try {
      const base = new URL(env.NEXORA_API_ORIGIN);
      if (base.protocol !== 'https:' || base.username || base.password || base.search || base.hash) {
        throw new Error('Invalid upstream origin.');
      }
      upstream = await fetch(new URL('/api/social/follow-state', base), {
        method: 'POST',
        headers: {
          Authorization: authorization,
          'Content-Type': 'application/json',
          Origin: origin,
          'X-Request-Id': requestId,
        },
        body: JSON.stringify({ creatorId: body.creatorId, following: body.following }),
        redirect: 'manual',
      });
    } catch {
      return Response.json({ error: 'follow_service_unavailable' }, { status: 503, headers: { ...cors, 'Cache-Control': 'no-store', 'X-Request-Id': requestId } });
    }
    const headers = new Headers(cors);
    headers.set('Cache-Control', 'no-store');
    headers.set('X-Request-Id', requestId);
    headers.set('Content-Type', upstream.headers.get('Content-Type') || 'application/json');
    return new Response(upstream.body, { status: upstream.status, headers });
  },
};
