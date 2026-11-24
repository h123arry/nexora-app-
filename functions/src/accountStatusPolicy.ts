export function asDate(value: unknown): Date {
  if (value instanceof Date) return value;
  if (value && typeof value === 'object' && 'toDate' in value && typeof (value as { toDate?: unknown }).toDate === 'function') {
    const date = (value as { toDate: () => Date }).toDate();
    if (Number.isFinite(date.getTime())) return date;
  }
  if (typeof value === 'string' || typeof value === 'number') {
    const date = new Date(value);
    if (Number.isFinite(date.getTime())) return date;
  }
  return new Date(0);
}

/** Resolve moderation restrictions from the authoritative accountStatus record, with legacy profile fallback. */
export function hasActiveAccountRestriction(
  profile: Record<string, unknown>,
  status: Record<string, unknown>,
  nowMs = Date.now(),
): boolean {
  if (profile.isSeedProfile === true) return true;
  const statusIsAuthoritative = Object.prototype.hasOwnProperty.call(status, 'banned')
    || Object.prototype.hasOwnProperty.call(status, 'suspended');
  if (!statusIsAuthoritative) return profile.isBanned === true || profile.isSuspended === true;
  if (status.banned !== true && status.suspended !== true) return false;
  const expiry = asDate(status.expiresAt);
  return expiry.getTime() === 0 || expiry.getTime() > nowMs;
}
