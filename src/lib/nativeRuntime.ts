export function isNativeRuntime(): boolean {
  if (typeof window === 'undefined') return false;
  const { protocol, hostname, port } = window.location;
  if (protocol === 'capacitor:') return true;
  // Capacitor Android's default secure WebView origin is https://localhost.
  return (protocol === 'https:' || protocol === 'http:') && hostname === 'localhost' && port === '';
}
