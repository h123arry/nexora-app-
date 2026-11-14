export type VideoRendition = { height?: unknown; mp4Path?: unknown };

export function safeVideoRenditions(value: unknown, ownerId: string, mediaAssetId: string): Array<{ height: number; path: string }> {
  if (!Array.isArray(value)) return [];
  const prefix = `processed/${ownerId}/${mediaAssetId}/`;
  return value.flatMap((item: VideoRendition) => {
    if (!item || !Number.isSafeInteger(item.height) || (item.height as number) < 144 || (item.height as number) > 4320
      || typeof item.mp4Path !== 'string' || !item.mp4Path.startsWith(prefix)
      || item.mp4Path.split('/').some(segment => !segment || segment === '.' || segment === '..')
      || item.mp4Path.includes(String.fromCharCode(92))) return [];
    return [{ height: item.height as number, path: item.mp4Path }];
  }).sort((a, b) => a.height - b.height);
}

export function chooseVideoRendition(renditions: Array<{ height: number; path: string }>) {
  return renditions.find(item => item.height === 720)
    || renditions.filter(item => item.height <= 720).at(-1)
    || renditions[0]
    || null;
}

export function canResolvePublicPostMedia(
  post: Record<string, unknown> | undefined,
  asset: Record<string, unknown> | undefined,
  mediaAssetId: string,
): boolean {
  return post?.audience === 'public'
    && post.mediaAssetId === mediaAssetId
    && typeof post.userId === 'string'
    && post.userId.length > 0
    && asset?.ownerId === post.userId
    && asset.kind === 'video';
}

export type PublicMediaAccessPolicyInput = {
  viewerUid: string;
  ownerUid: string;
  viewerSettings?: Record<string, unknown> | null;
  ownerSettings?: Record<string, unknown> | null;
  viewerProfile?: Record<string, unknown> | null;
  ownerProfile?: Record<string, unknown> | null;
  viewerStatus?: Record<string, unknown> | null;
  ownerStatus?: Record<string, unknown> | null;
  followsOwner?: boolean;
  post?: Record<string, unknown> | null;
};

function stringIds(...values: unknown[]): Set<string> {
  return new Set(values.flatMap(value => Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : []));
}

function hasActiveRestriction(profile: Record<string, unknown> | null | undefined, status: Record<string, unknown> | null | undefined): boolean {
  if (profile?.isSeedProfile === true) return true;
  // The accountStatus document is the current authority when present. Legacy profile
  // flags must not turn an expired temporary suspension into a permanent restriction.
  const hasAuthoritativeStatus = !!status
    && (Object.prototype.hasOwnProperty.call(status, 'banned')
      || Object.prototype.hasOwnProperty.call(status, 'suspended'));
  if (!hasAuthoritativeStatus) return profile?.isBanned === true || profile?.isSuspended === true;
  if (status?.banned !== true && status?.suspended !== true) return false;
  const rawExpiry = status.expiresAt as { toDate?: () => Date } | Date | number | string | null | undefined;
  const expiry = rawExpiry instanceof Date ? rawExpiry
    : typeof rawExpiry === 'number' || typeof rawExpiry === 'string' ? new Date(rawExpiry)
      : rawExpiry && typeof rawExpiry === 'object' && 'toDate' in rawExpiry && typeof rawExpiry.toDate === 'function'
        ? rawExpiry.toDate() : null;
  return !expiry || !Number.isFinite(expiry.getTime()) || expiry.getTime() > Date.now();
}

/** Public video playback must still honor current account privacy, blocks and post availability. */
export function canViewPublicPostMedia(input: PublicMediaAccessPolicyInput): boolean {
  const {
    viewerUid, ownerUid, viewerSettings = null, ownerSettings = null,
    viewerProfile = null, ownerProfile = null, viewerStatus = null, ownerStatus = null,
    followsOwner = false, post = null,
  } = input;
  if (!viewerUid || !ownerUid || !post || post.audience !== 'public') return false;
  if (post.deleted === true || post.isDeleted === true || post.hidden === true
    || post.isArchived === true || post.isDraft === true
    || ['deleted', 'hidden', 'removed', 'rejected', 'restricted', 'draft', 'private', 'suspended'].includes(String(post.status || '').toLowerCase())
    || ['deleted', 'hidden', 'rejected', 'restricted', 'removed', 'suspended'].includes(String(post.moderationStatus || '').toLowerCase())
    || ['private', 'hidden', 'deleted', 'unavailable'].includes(String(post.visibility || '').toLowerCase())) return false;
  const ownerPrivacy = (ownerSettings?.privacy || {}) as Record<string, unknown>;
  const privateAccount = ownerPrivacy.isPrivate === true || ownerPrivacy.isPrivateAccount === true;
  if (privateAccount && viewerUid !== ownerUid && !followsOwner) return false;
  if (hasActiveRestriction(viewerProfile, viewerStatus) || hasActiveRestriction(ownerProfile, ownerStatus)) return false;

  const viewerPrivacy = (viewerSettings?.privacy || {}) as Record<string, unknown>;
  const viewerMessaging = (viewerSettings?.messaging || {}) as Record<string, unknown>;
  const viewerFeed = (viewerSettings?.feed || {}) as Record<string, unknown>;
  const ownerMessaging = (ownerSettings?.messaging || {}) as Record<string, unknown>;
  const ownerFeed = (ownerSettings?.feed || {}) as Record<string, unknown>;
  const viewerBlocks = stringIds(viewerPrivacy.blockedUserIds, viewerMessaging.blockedUserIds, viewerFeed.blockedCreatorIds);
  const ownerBlocks = stringIds(ownerPrivacy.blockedUserIds, ownerMessaging.blockedUserIds, ownerFeed.blockedCreatorIds);
  if (viewerUid !== ownerUid && (viewerBlocks.has(ownerUid) || ownerBlocks.has(viewerUid))) return false;
  return true;
}
