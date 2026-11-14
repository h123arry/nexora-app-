export interface ApiRuntimeConfig {
  baseUrl?: string;
  nativeRuntime: boolean;
}

export function resolveApiRequestUrl(path: string, config: ApiRuntimeConfig): string {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const rawBaseUrl = config.baseUrl?.trim() || '';
  if (!rawBaseUrl) {
    if (config.nativeRuntime) throw new Error('VITE_API_BASE_URL must be configured for native NEXORA builds.');
    return normalizedPath;
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
  return new URL(normalizedPath, base.toString().endsWith('/') ? base : `${base.toString()}/`).toString();
}

export function isNativeRuntime(): boolean {
  if (typeof window === 'undefined') return false;
  const { protocol, hostname, port } = window.location;
  return protocol === 'capacitor:' || (protocol === 'http:' && hostname === 'localhost' && port === '');
}

export function apiRequestUrl(path: string): string {
  return resolveApiRequestUrl(path, { baseUrl: import.meta.env.VITE_API_BASE_URL, nativeRuntime: isNativeRuntime() });
}
