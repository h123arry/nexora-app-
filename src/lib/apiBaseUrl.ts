export interface ApiRuntimeConfig {
  baseUrl?: string;
  nativeRuntime: boolean;
}

export function resolveApiRequestUrl(path: string, config: ApiRuntimeConfig): string {
  if (/^[a-z][a-z0-9+.-]*:/i.test(path) || path.startsWith('//')) {
    throw new Error('NEXORA API paths must be relative paths, not external URLs.');
  }
  const relativePath = path.replace(/^\/+/, '');
  const rawBaseUrl = config.baseUrl?.trim() || '';
  if (!rawBaseUrl) {
    if (config.nativeRuntime) throw new Error('VITE_API_BASE_URL must be configured for native NEXORA builds.');
    return `/${relativePath}`;
  }
  let base: URL;
  try { base = new URL(rawBaseUrl); } catch { throw new Error('VITE_API_BASE_URL must be an absolute URL.'); }
  const localDevelopmentHost = ['localhost', '127.0.0.1'].includes(base.hostname);
  if (base.protocol !== 'https:' && !(base.protocol === 'http:' && localDevelopmentHost && !config.nativeRuntime)) {
    throw new Error('NEXORA API requests must use HTTPS outside local web development.');
  }
  if (base.username || base.password || base.search || base.hash) {
    throw new Error('VITE_API_BASE_URL must not contain credentials, query parameters, or fragments.');
  }
  const baseWithSlash = base.toString().endsWith('/') ? base : new URL(`${base.toString()}/`);
  return new URL(relativePath, baseWithSlash).toString();
}

export function isNativeRuntime(): boolean {
  if (typeof window === 'undefined') return false;
  const { protocol, hostname, port } = window.location;
  if (protocol === 'capacitor:') return true;
  return (protocol === 'https:' || protocol === 'http:') && hostname === 'localhost' && port === '';
}

export function apiRequestUrl(path: string): string {
  return resolveApiRequestUrl(path, {
    baseUrl: import.meta.env.VITE_API_BASE_URL,
    nativeRuntime: isNativeRuntime(),
  });
}


/**
 * Resolve persisted NEXORA media gateway paths against the configured API
 * origin. Browser builds remain same-origin; Capacitor builds must use the
 * explicit API base URL instead of the WebView's local origin.
 */
/**
 * Accept only browser-safe media URLs before they reach DOM media attributes.
 * Persisted media URLs are untrusted input; javascript:, data:, and credentialed
 * URLs must never be attached to image/video elements.
 */
export function safeMediaDeliveryUrl(value: string | undefined | null): string {
  if (!value || typeof window === 'undefined') return '';
  try {
    const url = new URL(value, window.location.origin);
    if (url.username || url.password) return '';
    if (url.protocol === 'https:') return url.href;
    if (url.protocol === 'blob:' && url.origin === window.location.origin) return url.href;
    if (url.protocol === 'http:' && url.origin === window.location.origin
      && ['localhost', '127.0.0.1'].includes(window.location.hostname)) return url.href;
    return '';
  } catch {
    return '';
  }
}

export function normalizeMediaDeliveryUrl(value: string | undefined | null): string {
  if (!value) return '';
  const path = value.split(/[?#]/, 1)[0];
  const mediaPrefix = '/api/media/';
  if (path.startsWith(mediaPrefix)
    && /^[A-Za-z0-9_-]{1,128}$/.test(path.slice(mediaPrefix.length))) {
    return apiRequestUrl(value);
  }
  return value;
}
