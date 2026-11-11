export function isStudioCloudDraftNewer(localUpdatedAt: number, cloudUpdatedAt: number): boolean {
  return Number.isFinite(cloudUpdatedAt) && cloudUpdatedAt > (Number.isFinite(localUpdatedAt) ? localUpdatedAt : 0);
}

export function isStudioCloudRevisionCurrent(expectedRevision: number, actualRevision: number): boolean {
  return Number.isInteger(expectedRevision) && expectedRevision >= 0 &&
    Number.isInteger(actualRevision) && actualRevision === expectedRevision;
}

export function isStudioCloudAssetPathOwnedByUser(storagePath: string, userId: string): boolean {
  return Boolean(userId) && storagePath.startsWith(`users/${userId}/studio-drafts/active/assets/`) &&
    !storagePath.split('/').some(segment => segment === '.' || segment === '..');
}
