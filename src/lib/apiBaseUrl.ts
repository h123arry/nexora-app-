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
