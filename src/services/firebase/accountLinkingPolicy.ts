export function isRecentAuthentication(authTime: unknown, nowSeconds: number, maxAgeSeconds = 300): boolean {
  return typeof authTime === 'number'
    && Number.isFinite(authTime)
    && authTime > 0
    && authTime <= nowSeconds
    && nowSeconds - authTime <= maxAgeSeconds;
}

export function hasLinkedProvider(providerIds: readonly string[], providerId: string): boolean {
  return providerIds.includes(providerId);
}
