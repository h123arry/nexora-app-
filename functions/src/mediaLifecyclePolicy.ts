export interface ExistingMediaAssetState {
  ownerId?: unknown;
  status?: unknown;
}

/**
 * Accept a finalization transition only for a new asset or the same owner's
 * pending upload. Duplicate events and terminal/later pipeline states are
 * ignored, and a colliding media ID can never transfer asset ownership.
 */
export function shouldAcceptFinalizedMediaTransition(
  existing: ExistingMediaAssetState | undefined,
  ownerId: string,
): boolean {
  if (!existing) return true;
  if (existing.ownerId !== ownerId) return false;
  return existing.status === 'pending_upload';
}
