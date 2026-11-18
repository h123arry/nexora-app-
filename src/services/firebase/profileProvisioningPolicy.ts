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
