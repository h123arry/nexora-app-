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

/** Anonymous beta members cannot reauthenticate with a password/provider they do not have yet.
 * Permit linking only while the same approved anonymous UID is the active Firebase session.
 */
export function canUpgradeAnonymousBetaSession(
  isAnonymous: boolean,
  betaMember: boolean,
  activeSessionMatches: boolean,
): boolean {
  return isAnonymous && betaMember && activeSessionMatches;
}
