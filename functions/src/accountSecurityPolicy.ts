export function isRecentAccountAuthentication(authTime: unknown, nowSeconds: number, maxAgeSeconds = 300): boolean {
  return typeof authTime === 'number'
    && Number.isFinite(authTime)
    && authTime > 0
    && authTime <= nowSeconds
    && nowSeconds - authTime <= maxAgeSeconds;
}
