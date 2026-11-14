export type OriginSourceAccountSettings = {
  privacy?: { isPrivateAccount?: boolean };
  messaging?: { blockedUserIds?: unknown };
  feed?: { blockedCreatorIds?: unknown };
};
export type OriginSourcePost = {
  audience?: unknown; status?: unknown; isDeleted?: unknown; deleted?: unknown;
  isArchived?: unknown; isDraft?: unknown; hidden?: unknown; moderationStatus?: unknown;
};
function containsId(value: unknown, id: string): boolean {
  return Array.isArray(value) && value.some(entry => entry === id);
}
/** Cross-account remix requires a public source post and no block in either direction. */
export function assertOriginSourceAccess(input: {
  derivativeOwnerUid: string; sourceOwnerUid: string;
  derivativeSettings: OriginSourceAccountSettings | null;
  sourceSettings: OriginSourceAccountSettings | null;
  sourcePost: OriginSourcePost | null;
}): void {
  const { derivativeOwnerUid, sourceOwnerUid, derivativeSettings, sourceSettings, sourcePost } = input;
  if (!derivativeOwnerUid || !sourceOwnerUid || derivativeOwnerUid === sourceOwnerUid)
    throw new Error('Cross-account source ownership could not be verified.');
  if (!sourcePost || sourcePost.audience !== 'public')
    throw new Error('Only an explicitly public source post can be remixed across accounts.');
  if (sourceSettings?.privacy?.isPrivateAccount === true)
    throw new Error('Private creator content is not available for cross-account remix.');
  if (sourcePost.deleted === true || sourcePost.isDeleted === true || sourcePost.hidden === true
    || sourcePost.isArchived === true || sourcePost.isDraft === true
    || ['deleted', 'hidden', 'removed', 'rejected', 'restricted'].includes(String(sourcePost.status || '').toLowerCase())
    || ['rejected', 'restricted', 'removed'].includes(String(sourcePost.moderationStatus || '').toLowerCase()))
    throw new Error('The source post is no longer available for remix.');
  if (containsId(derivativeSettings?.messaging?.blockedUserIds, sourceOwnerUid)
    || containsId(derivativeSettings?.feed?.blockedCreatorIds, sourceOwnerUid)
    || containsId(sourceSettings?.messaging?.blockedUserIds, derivativeOwnerUid)
    || containsId(sourceSettings?.feed?.blockedCreatorIds, derivativeOwnerUid))
    throw new Error('Remix is unavailable because one of these accounts has blocked the other.');
}
