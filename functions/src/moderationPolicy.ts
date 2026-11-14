export const MODERATION_REPORT_WINDOW_MS = 60 * 60 * 1000;
export const MODERATION_REPORT_WINDOW_LIMIT = 10;

export interface ModerationReportQuotaState {
  windowStartedAtMs?: unknown;
  attempts?: unknown;
}

export interface ModerationReportQuotaDecision {
  allowed: boolean;
  attempts: number;
  windowStartedAtMs: number;
  retryAfterMs: number;
}

export function consumeModerationReportQuota(
  state: ModerationReportQuotaState | null | undefined,
  nowMs: number,
): ModerationReportQuotaDecision {
  if (!Number.isSafeInteger(nowMs) || nowMs < 0) {
    return { allowed: false, attempts: 0, windowStartedAtMs: 0, retryAfterMs: MODERATION_REPORT_WINDOW_MS };
  }

  if (!state || (state.windowStartedAtMs === undefined && state.attempts === undefined)) {
    return { allowed: true, attempts: 1, windowStartedAtMs: nowMs, retryAfterMs: MODERATION_REPORT_WINDOW_MS };
  }

  const startedAt = state.windowStartedAtMs;
  const attempts = state.attempts;
  if (!Number.isSafeInteger(startedAt) || !Number.isSafeInteger(attempts)
    || (startedAt as number) < 0 || (attempts as number) < 1
    || (attempts as number) > MODERATION_REPORT_WINDOW_LIMIT
    || (startedAt as number) > nowMs) {
    return { allowed: false, attempts: MODERATION_REPORT_WINDOW_LIMIT, windowStartedAtMs: nowMs, retryAfterMs: MODERATION_REPORT_WINDOW_MS };
  }

  const elapsed = nowMs - (startedAt as number);
  if (elapsed >= MODERATION_REPORT_WINDOW_MS) {
    return { allowed: true, attempts: 1, windowStartedAtMs: nowMs, retryAfterMs: MODERATION_REPORT_WINDOW_MS };
  }

  if ((attempts as number) >= MODERATION_REPORT_WINDOW_LIMIT) {
    return {
      allowed: false,
      attempts: attempts as number,
      windowStartedAtMs: startedAt as number,
      retryAfterMs: MODERATION_REPORT_WINDOW_MS - elapsed,
    };
  }

  return {
    allowed: true,
    attempts: (attempts as number) + 1,
    windowStartedAtMs: startedAt as number,
    retryAfterMs: MODERATION_REPORT_WINDOW_MS - elapsed,
  };
}
