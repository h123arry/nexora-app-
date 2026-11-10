import type { User } from '../../types';

/** Build the public profile projection. Location is private unless explicitly opted into public visibility. */
export function createPublicProfileProjection(
  user: User,
  options: { includeLocation?: boolean } = {},
): Partial<User> {
  const {
    id, username, name, avatar, bio, website, followers, following,
    sparks, isVerified, hasStory, coverImage, profileFrameId, profileBadgeId, joinedDate, reputationPoints,
    reputationBreakdown, skills, statusText, statusEmoji,
    pinnedMusicSong, pinnedMusicArtist, pinnedMusicUrl, pinnedPosts,
    location,
  } = user;
  const projection: Partial<User> = Object.fromEntries(Object.entries({
    id, username, name, avatar, bio, website, followers, following,
    sparks, isVerified, hasStory, coverImage, profileFrameId, profileBadgeId, joinedDate, reputationPoints,
    reputationBreakdown, skills, statusText, statusEmoji,
    pinnedMusicSong, pinnedMusicArtist, pinnedMusicUrl, pinnedPosts,
  }).filter(([, value]) => value !== undefined));
  if (options.includeLocation && typeof location === 'string' && location.trim()) {
    projection.location = location.trim();
  }
  return projection;
}
