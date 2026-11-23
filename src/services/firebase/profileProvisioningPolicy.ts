/**
 * Persist the private account record first. A public directory projection is
 * secondary and must not prevent an authenticated member from entering NEXORA.
 */
export async function persistProfileWithBestEffortProjection(
  writePrivateProfile: () => Promise<void>,
  writePublicProjection: () => Promise<void>,
  onProjectionFailure: (error: unknown) => void,
): Promise<void> {
  await writePrivateProfile();
  try {
    await writePublicProjection();
  } catch (error) {
    onProjectionFailure(error);
  }
}

const RETRYABLE_PROFILE_CODES = new Set([
  'resource-exhausted',
  'unavailable',
  'deadline-exceeded',
  'aborted',
]);

/**
 * Firestore can temporarily reject reads/writes during quota pressure or
 * transient service/network contention. Retry only those failures, with a
 * bounded backoff; authorization and validation errors fail immediately.
 */
export async function withProfileProvisioningRetry<T>(
  operation: () => Promise<T>,
  delaysMs: readonly number[] = [400, 1_200, 2_800],
): Promise<T> {
  for (let attempt = 0; ; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      const rawCode = (error as { code?: string } | null)?.code || '';
      const code = String(rawCode).toLowerCase().split('/').pop() || '';
      if (!RETRYABLE_PROFILE_CODES.has(code) || attempt >= delaysMs.length) throw error;
      await new Promise<void>(resolve => setTimeout(resolve, delaysMs[attempt]));
    }
  }
}
