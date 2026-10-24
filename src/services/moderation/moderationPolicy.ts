export const REPORT_CATEGORIES = [
  'spam', 'harassment', 'threats', 'impersonation', 'hate', 'sexual_safety',
  'violence', 'privacy', 'fraud', 'copyright', 'misinformation', 'other',
] as const;

export const MODERATION_ACTIONS = [
  'dismiss', 'warn', 'restrict_posting', 'restrict_messaging', 'suspend', 'ban',
] as const;

export type ModerationAction = typeof MODERATION_ACTIONS[number];

export function isValidReportInput(input: { targetType?: unknown; targetId?: unknown; category?: unknown; explanation?: unknown }): boolean {
  return typeof input.targetType === 'string'
    && ['post', 'comment', 'user', 'community', 'message'].includes(input.targetType)
    && typeof input.targetId === 'string'
    && input.targetId.trim().length > 0
    && input.targetId.length <= 200
    && !input.targetId.includes('/')
    && typeof input.category === 'string'
    && (REPORT_CATEGORIES as readonly string[]).includes(input.category)
    && (input.explanation === undefined || (typeof input.explanation === 'string' && input.explanation.length <= 1000));
}

export function hasReviewerRole(claims: Record<string, unknown>): boolean {
  const role = typeof claims.role === 'string' ? claims.role : '';
  return claims.moderator === true || claims.admin === true
    || ['moderator', 'senior_moderator', 'admin', 'founder'].includes(role);
}

export function restrictionProjection(action: ModerationAction) {
  return {
    postingRestricted: ['restrict_posting', 'suspend', 'ban'].includes(action),
    messagingRestricted: ['restrict_messaging', 'suspend', 'ban'].includes(action),
    suspended: ['suspend', 'ban'].includes(action),
  };
}

export function canSubmitAppeal(hasActiveEnforcement: boolean, hasOpenAppeal: boolean): boolean {
  return hasActiveEnforcement && !hasOpenAppeal;
}
