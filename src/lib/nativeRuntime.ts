export function isNativeRuntime(): boolean {
  if (typeof window === 'undefined') return false;
  const { protocol, hostname, port } = window.location;
  return protocol === 'capacitor:' || (protocol === 'http:' && hostname === 'localhost' && port === '');
}
