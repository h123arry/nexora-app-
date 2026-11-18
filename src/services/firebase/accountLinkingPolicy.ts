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

/** Anonymous users cannot reauthenticate with a credential they have not linked yet.
 * Permit linking only while the same anonymous UID is the active Firebase session.
 */
export function canUpgradeAnonymousBetaSession(
  isAnonymous: boolean,
  publicAnonymousSession: boolean,
  activeSessionMatches: boolean,
): boolean {
  return isAnonymous && publicAnonymousSession && activeSessionMatches;
}
