export interface AuthSessionIdentity {
  uid: string;
  isAnonymous: boolean;
}

/**
 * Identifies the authorization-relevant Firebase session state.
 * Token refreshes for the same identity/provider claim do not require a
 * second profile hydration; a newly granted beta claim does.
 */
export function getAuthSessionIdentityKey(
  user: AuthSessionIdentity | null,
  isApprovedBetaMember: boolean,
): string | null {
  if (!user) return null;
  return [user.uid, user.isAnonymous ? 'anonymous' : 'member', isApprovedBetaMember ? 'beta-approved' : 'standard'].join(':');
}

export function shouldHydrateAuthSession(previousKey: string | null, nextKey: string | null): boolean {
  return nextKey !== null && nextKey !== previousKey;
}
