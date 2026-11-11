export type StudioExportAssetRecord = {
  ownerId?: unknown;
  sourcePurpose?: unknown;
  storagePath?: unknown;
  status?: unknown;
  studioExportExpiresAt?: { toMillis?: () => number } | null;
};

export type StudioMp4Rendition = { height: number; path: string };

export function isOwnedStudioExportAsset(
  asset: StudioExportAssetRecord | null | undefined,
  userId: string,
  mediaAssetId: string,
): boolean {
  return Boolean(
    asset && userId && mediaAssetId &&
    asset.ownerId === userId &&
    asset.sourcePurpose === 'studio-export' &&
    asset.storagePath === `users/${userId}/media/${mediaAssetId}`,
  );
}

export function chooseStudioMp4Rendition<T extends StudioMp4Rendition>(renditions: T[]): T | null {
  return [...renditions].sort((a, b) => b.height - a.height)[0] || null;
}

export function isStudioExportExpired(asset: StudioExportAssetRecord, now: number): boolean {
  const expiresAt = typeof asset.studioExportExpiresAt?.toMillis === 'function'
    ? asset.studioExportExpiresAt.toMillis()
    : 0;
  return Number.isFinite(expiresAt) && expiresAt > 0 && expiresAt <= now && asset.status !== 'processing';
}
