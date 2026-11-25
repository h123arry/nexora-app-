export interface TextPostViewEligibilityInput {
  viewerId: string;
  creatorId: string;
  audience: unknown;
  videoUrl?: unknown;
  image?: unknown;
  images?: unknown;
  mediaType?: unknown;
  voiceAudioUrl?: unknown;
  isVoice?: unknown;
  opportunityType?: unknown;
  isBroadcastPost?: unknown;
  isArchived?: unknown;
  isDraft?: unknown;
}

export function isEligiblePublicTextPostView(input: TextPostViewEligibilityInput): boolean {
  const hasImage = (typeof input.image === 'string' && input.image.length > 0)
    || (Array.isArray(input.images) && input.images.length > 0);
  const hasVideo = (typeof input.videoUrl === 'string' && input.videoUrl.length > 0)
    || input.mediaType === 'video';
  return Boolean(input.viewerId && input.creatorId && input.viewerId !== input.creatorId)
    && input.audience === 'public'
    && !hasImage
    && !hasVideo
    && input.mediaType !== 'image'
    && input.mediaType !== 'audio'
    && !(typeof input.voiceAudioUrl === 'string' && input.voiceAudioUrl.length > 0)
    && input.isVoice !== true
    && !input.opportunityType
    && input.isBroadcastPost !== true
    && input.isArchived !== true
    && input.isDraft !== true;
}

export function shouldCountTextPostView(input: {
  eligible: boolean;
  visibleSeconds: number;
  alreadyCountedToday: boolean;
}): boolean {
  return input.eligible
    && Number.isFinite(input.visibleSeconds)
    && input.visibleSeconds >= 3
    && !input.alreadyCountedToday;
}

export function validTextPostViewRequest(postId: unknown, visibleSeconds: unknown): boolean {
  return typeof postId === 'string'
    && postId.length > 0
    && postId.length <= 150
    && !postId.includes('/')
    && typeof visibleSeconds === 'number'
    && Number.isFinite(visibleSeconds)
    && visibleSeconds >= 3
    && visibleSeconds <= 60;
}

export function canReadPostViewAnalytics(viewerId: string, ownerId: unknown, authorId: unknown): boolean {
  return Boolean(viewerId) && (ownerId === viewerId || authorId === viewerId);
}
