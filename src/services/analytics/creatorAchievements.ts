import type { Post } from '../../types';

export interface CreatorAchievement {
  id: string;
  title: string;
  desc: string;
  icon: string;
  unlocked: boolean;
  progress: number;
  label?: string;
}

function count(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value)
    ? Math.max(0, Math.floor(value))
    : 0;
}

/**
 * Creator milestones are calculated from published posts and persisted counters.
 * This deliberately does not infer a 24-hour trend from lifetime view totals.
 */
export function buildCreatorAchievements(
  posts: Array<Pick<Post, 'isArchived' | 'videoUrl' | 'views' | 'likes'>>,
  reputationPoints: unknown,
  isVerified: boolean,
): CreatorAchievement[] {
  const published = posts.filter(post => post.isArchived !== true);
  const withRecordedViews = published.filter(post =>
    typeof post.views === 'number' && Number.isFinite(post.views) && post.views >= 0
  );
  const totalViews = withRecordedViews.reduce((sum, post) => sum + count(post.views), 0);
  const totalLikes = published.reduce((sum, post) => sum + count(post.likes), 0);
  const highestPostViews = withRecordedViews.reduce((highest, post) => Math.max(highest, count(post.views)), 0);
  const reputation = count(reputationPoints);
  const hasVideo = published.some(post => typeof post.videoUrl === 'string' && post.videoUrl.trim().length > 0);

  return [
    { id: 'first_vid', title: 'First Video', desc: 'Publish your first video post', icon: '🎥', unlocked: hasVideo, progress: hasVideo ? 100 : 0 },
    { id: '100_sparks', title: '100 Sparks Milestone', desc: 'Earn 100 likes across your published posts', icon: '⚡', unlocked: totalLikes >= 100, progress: Math.min(100, Math.round(totalLikes / 100 * 100)), label: `${totalLikes}/100 Sparks` },
    { id: '1k_views', title: '1,000 Recorded Views', desc: 'Accumulate 1,000 views recorded on your published posts', icon: '👁️', unlocked: withRecordedViews.length > 0 && totalViews >= 1000, progress: Math.min(100, Math.round(totalViews / 1000 * 100)), label: `${totalViews.toLocaleString()}/1,000 Views` },
    { id: '10k_views', title: '10,000 Recorded Views', desc: 'Accumulate 10,000 views recorded on your published posts', icon: '🔥', unlocked: withRecordedViews.length > 0 && totalViews >= 10000, progress: Math.min(100, Math.round(totalViews / 10000 * 100)), label: `${totalViews.toLocaleString()}/10,000 Views` },
    { id: 'trending_creator', title: '500 Views on One Post', desc: 'Reach 500 recorded lifetime views on a single published post', icon: '📈', unlocked: highestPostViews >= 500, progress: Math.min(100, Math.round(highestPostViews / 500 * 100)), label: `${highestPostViews.toLocaleString()}/500 Views` },
    { id: 'comm_leader', title: 'Community Leader', desc: 'Reach 400 reputation points or receive creator verification', icon: '🏆', unlocked: isVerified === true || reputation >= 400, progress: Math.min(100, Math.round(reputation / 400 * 100)), label: `${reputation.toLocaleString()}/400 Rep` },
    { id: 'consistent_creator', title: 'Consistent Creator', desc: 'Publish at least three posts', icon: '📅', unlocked: published.length >= 3, progress: Math.min(100, Math.round(published.length / 3 * 100)), label: `${published.length}/3 Posts` },
    { id: 'top_contrib', title: 'Top Contributor', desc: 'Reach 500 reputation points', icon: '⭐', unlocked: reputation >= 500, progress: Math.min(100, Math.round(reputation / 500 * 100)), label: `${reputation.toLocaleString()}/500 Rep` },
  ];
}

export interface CreatorProgressionLevel {
  id: string;
  title: string;
  reputationRequired: number;
  currentReputation: number;
  unlocked: boolean;
  progress: number;
  nextLevel: string | null;
  pointsToNext: number;
}

/** Levels are presentation milestones only; they never mint currency or grant permissions. */
export function buildCreatorProgressionLevel(reputationPoints: unknown): CreatorProgressionLevel {
  const reputation = count(reputationPoints);
  const levels = [
    { id: 'newcomer', title: 'Newcomer', reputationRequired: 0 },
    { id: 'contributor', title: 'Contributor', reputationRequired: 100 },
    { id: 'community_voice', title: 'Community Voice', reputationRequired: 250 },
    { id: 'community_leader', title: 'Community Leader', reputationRequired: 400 },
    { id: 'nexora_ambassador', title: 'NEXORA Ambassador', reputationRequired: 750 },
    { id: 'legacy_builder', title: 'Legacy Builder', reputationRequired: 1200 },
  ];
  let current = levels[0];
  for (const level of levels) if (reputation >= level.reputationRequired) current = level;
  const next = levels[levels.indexOf(current) + 1] || null;
  const span = next ? next.reputationRequired - current.reputationRequired : 0;
  return {
    ...current,
    currentReputation: reputation,
    unlocked: true,
    progress: next && span > 0 ? Math.min(100, Math.round((reputation - current.reputationRequired) / span * 100)) : 100,
    nextLevel: next?.title || null,
    pointsToNext: next ? Math.max(0, next.reputationRequired - reputation) : 0,
  };
}
