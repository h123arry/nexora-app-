/** Convert Firebase/callable failures into actionable, user-safe messages. */
export function getNexoraActionErrorMessage(error: unknown, fallback: string): string {
  const record = error && typeof error === 'object' ? error as Record<string, unknown> : {};
  const rawCode = typeof record.code === 'string' ? record.code.toLowerCase() : '';
  const code = rawCode.replace(/^functions\//, '');
  const rawMessage = error instanceof Error ? error.message.trim() : '';
  const genericInternal = /^(?:internal|internal\(\d+\)|functions\/internal)$/i.test(rawMessage);

  switch (code) {
    case 'unauthenticated':
      return 'Your session needs to be refreshed. Sign in again, then retry.';
    case 'permission-denied':
      return 'You do not have permission to complete this action.';
    case 'not-found':
      return 'This content is no longer available. Refresh and try again.';
    case 'resource-exhausted':
      return 'NEXORA is receiving too many requests right now. Wait a moment and retry.';
    case 'unavailable':
    case 'deadline-exceeded':
      return 'NEXORA could not reach the service. Check your connection and retry.';
    case 'internal':
      return fallback;
    default:
      if (genericInternal || /\bINTERNAL\s*\(\s*0\s*\)/i.test(rawMessage)) return fallback;
      return rawMessage || fallback;
  }
}
