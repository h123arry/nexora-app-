export type OriginViewerAccountSettings = {
  privacy?: { isPrivateAccount?: boolean };
  messaging?: { blockedUserIds?: unknown };
  feed?: { blockedCreatorIds?: unknown };
};
export type OriginViewerPost = {
  audience?: unknown; userId?: unknown; authorId?: unknown; status?: unknown;
  isDeleted?: unknown; deleted?: unknown; hidden?: unknown; isArchived?: unknown;
  isDraft?: unknown; moderationStatus?: unknown;
};
function containsId(value: unknown, id: string): boolean {
  return Array.isArray(value) && value.some(entry => entry === id);
}
function blocks(settings: OriginViewerAccountSettings | null, uid: string): boolean {
  return containsId(settings?.messaging?.blockedUserIds, uid)
    || containsId(settings?.feed?.blockedCreatorIds, uid);
}
export function isOriginPublicPost(post: OriginViewerPost | null, ownerUid: string): boolean {
  if (!post || !ownerUid || post.audience !== 'public') return false;
  if (post.userId !== ownerUid && post.authorId !== ownerUid) return false;
  if (post.isDeleted === true || post.deleted === true || post.hidden === true
    || post.isArchived === true || post.isDraft === true) return false;
  if (['deleted', 'hidden', 'removed', 'rejected', 'restricted'].includes(String(post.status || '').toLowerCase())) return false;
  if (['rejected', 'restricted', 'removed'].includes(String(post.moderationStatus || '').toLowerCase())) return false;
  return true;
}
export function isOriginAccountBlocked(input: {
  viewerUid: string; creatorUid: string;
  viewerSettings: OriginViewerAccountSettings | null;
  creatorSettings: OriginViewerAccountSettings | null;
}): boolean {
  if (!input.viewerUid || !input.creatorUid || input.viewerUid === input.creatorUid) return false;
  return blocks(input.viewerSettings, input.creatorUid) || blocks(input.creatorSettings, input.viewerUid);
}
/** A source is linked publicly only while its post, account and both block relationships remain safe. */
export function canExposeOriginSource(input: {
  viewerUid: string; derivativeOwnerUid: string; sourceOwnerUid: string;
  viewerSettings: OriginViewerAccountSettings | null;
  derivativeSettings: OriginViewerAccountSettings | null;
  sourceSettings: OriginViewerAccountSettings | null;
  sourcePost: OriginViewerPost | null;
}): boolean {
  const { viewerUid, derivativeOwnerUid, sourceOwnerUid, viewerSettings, derivativeSettings, sourceSettings, sourcePost } = input;
  if (!isOriginPublicPost(sourcePost, sourceOwnerUid)) return false;
  if (sourceSettings?.privacy?.isPrivateAccount === true) return false;
  if (isOriginAccountBlocked({ viewerUid, creatorUid: sourceOwnerUid, viewerSettings, creatorSettings: sourceSettings })) return false;
  if (isOriginAccountBlocked({ viewerUid, creatorUid: derivativeOwnerUid, viewerSettings, creatorSettings: derivativeSettings })) return false;
  if (derivativeOwnerUid !== sourceOwnerUid
    && (blocks(derivativeSettings, sourceOwnerUid) || blocks(sourceSettings, derivativeOwnerUid))) return false;
  return true;
}
