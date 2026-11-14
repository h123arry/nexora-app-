const NATIVE_WEBVIEW_ORIGINS = new Set([
  'capacitor://localhost',
  'https://localhost',
]);

export function parseAllowedApiOrigins(raw: string | undefined): Set<string> {
  const allowed = new Set<string>();
  for (const entry of (raw || '').split(',')) {
    const candidate = entry.trim();
    if (!candidate) continue;
    let parsed: URL;
    try {
      parsed = new URL(candidate);
    } catch {
      throw new Error('CORS_ALLOWED_ORIGINS must contain valid absolute origins.');
    }
    const localHttp = parsed.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(parsed.hostname);
    if ((!localHttp && parsed.protocol !== 'https:') || parsed.username || parsed.password
      || parsed.pathname !== '/' || parsed.search || parsed.hash) {
      throw new Error('CORS_ALLOWED_ORIGINS entries must be HTTPS origins (or local HTTP origins for development), without paths or credentials.');
    }
    allowed.add(parsed.origin);
  }
  return allowed;
}

export function isAllowedApiOrigin(
  origin: string,
  requestOrigin: string,
  configuredOrigins: ReadonlySet<string>,
): boolean {
  if (!origin) return false;
  if (origin === requestOrigin) return true;
  if (NATIVE_WEBVIEW_ORIGINS.has(origin)) return true;
  return configuredOrigins.has(origin);
}
