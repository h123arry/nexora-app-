export const PROFILE_IDENTITY_GRACE_START = Date.parse('2026-11-21T23:00:00.000Z');
export const PROFILE_IDENTITY_GRACE_END = Date.parse('2026-11-22T23:00:00.000Z');

export interface ProfileIdentityCooldownInput {
  lastChangedAt: unknown;
  graceUsedAt: unknown;
  now: number;
  cooldownMs: number;
}

export interface ProfileIdentityCooldownDecision {
  allowed: boolean;
  graceUsed: boolean;
  remainingMs: number;
}

/** One grace use per identity field; legacy timestamps written during the window count as that use. */
export function evaluateProfileIdentityCooldown(input: ProfileIdentityCooldownInput): ProfileIdentityCooldownDecision {
  const lastChanged = typeof input.lastChangedAt === 'string' ? Date.parse(input.lastChangedAt) : NaN;
  const changedDuringGraceWindow = Number.isFinite(lastChanged) && lastChanged >= PROFILE_IDENTITY_GRACE_START;
  const graceAvailable = input.now < PROFILE_IDENTITY_GRACE_END && !input.graceUsedAt && !changedDuringGraceWindow;
  const remainingMs = Number.isFinite(lastChanged)
    ? Math.max(0, input.cooldownMs - (input.now - lastChanged))
    : 0;
  if (!graceAvailable && remainingMs > 0) {
    return { allowed: false, graceUsed: false, remainingMs };
  }
  return { allowed: true, graceUsed: graceAvailable, remainingMs: 0 };
}
