export interface RecommendationProfile {
  tags: Record<string, number>; // tags/keywords -> weight
  creators: Record<string, number>; // userId/username -> weight
  communities: Record<string, number>; // communityName -> weight
}

export function getRecommendationProfile(): RecommendationProfile {
  try {
    const saved = localStorage.getItem('nexora_recommendation_profile_v2');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed && typeof parsed === 'object') {
        return {
          tags: parsed.tags && typeof parsed.tags === 'object' ? parsed.tags : {},
          creators: parsed.creators && typeof parsed.creators === 'object' ? parsed.creators : {},
          communities: parsed.communities && typeof parsed.communities === 'object' ? parsed.communities : {},
        };
      }
    }
  } catch (e) {
    console.error(e);
  }
  // New users start with no inferred interests. The feed falls back to
  // eligible relationship and freshness signals until real feedback exists.
  return { tags: {}, creators: {}, communities: {} };
}

export function saveRecommendationProfile(profile: RecommendationProfile) {
  try {
    const bounded = (values: Record<string, number>) => Object.fromEntries(
      Object.entries(values)
        .filter(([key, value]) => key.length <= 120 && Number.isFinite(value))
        .slice(-200)
        .map(([key, value]) => [key, Math.max(-100, Math.min(100, value))]),
    );
    localStorage.setItem('nexora_recommendation_profile_v2', JSON.stringify({
      tags: bounded(profile.tags),
      creators: bounded(profile.creators),
      communities: bounded(profile.communities),
    }));
  } catch (e) {
    console.error(e);
  }
}

export function resetRecommendationProfile(): void {
  localStorage.removeItem('nexora_recommendation_profile_v2');
  window.dispatchEvent(new CustomEvent('nexora-recommendations-updated'));
}

export function recordRecommendationEvent(
  type: 'watch_complete' | 'watch_partial' | 'skip_quick' | 'spark' | 'comment' | 'share' | 'save' | 'join_community' | 'follow' | 'search' | 'visit_profile' | 'not_interested',
  payload: { tags?: string[]; creatorId?: string; creatorUsername?: string; communityName?: string; keyword?: string; watchTimeRatio?: number }
) {
  const profile = getRecommendationProfile();
  
  // Tag score modifiers
  const modifiers = {
    watch_complete: 20,
    watch_partial: 5,
    skip_quick: -20, // strong skip penalty to adjust quickly!
    spark: 12,
    comment: 18,
    share: 22,
    save: 18,
    join_community: 30,
    follow: 30,
    search: 10,
    visit_profile: 15,
    not_interested: -35 // strong negative signal
  };
  
  let score = modifiers[type] || 0;
  
  // Apply watch time ratio for partial watches
  if (type === 'watch_partial' && payload.watchTimeRatio) {
    score = Math.floor(score * payload.watchTimeRatio);
  }

  // Process tags
  if (payload.tags) {
    payload.tags.forEach(tag => {
      const cleanTag = tag.toLowerCase().replace('#', '').trim();
      if (cleanTag) {
        profile.tags[cleanTag] = (profile.tags[cleanTag] || 0) + score;
      }
    });
  }

  // Process creator
  if (payload.creatorId || payload.creatorUsername) {
    const creatorKey = payload.creatorId || payload.creatorUsername || '';
    if (creatorKey) {
      profile.creators[creatorKey] = (profile.creators[creatorKey] || 0) + score;
    }
  }

  // Process community
  if (payload.communityName) {
    profile.communities[payload.communityName] = (profile.communities[payload.communityName] || 0) + score;
  }

  // Process search keywords
  if (payload.keyword) {
    const words = payload.keyword.toLowerCase().split(/\s+/);
    words.forEach(word => {
      const cleanWord = word.replace(/[^a-z0-9]/g, '').trim();
      if (cleanWord.length > 2) {
        profile.tags[cleanWord] = (profile.tags[cleanWord] || 0) + score;
      }
    });
  }

  saveRecommendationProfile(profile);

  // Dispatch global event for responsive updating of recommendations feed
  window.dispatchEvent(new CustomEvent('nexora-recommendations-updated'));
}

export function getRecommendationScore(post: any): number {
  const profile = getRecommendationProfile();
  let score = 0;

  // Boost by tags
  if (post.tags) {
    post.tags.forEach((tag: string) => {
      const cleanTag = tag.toLowerCase().replace('#', '').trim();
      score += (profile.tags[cleanTag] || 0);
    });
  }

  // Content keywords match (e.g. if post description matches preferred topics)
  const contentLower = (post.content || '').toLowerCase();
  Object.keys(profile.tags).forEach(word => {
    if (word.length > 2 && contentLower.includes(word)) {
      score += (profile.tags[word] || 0) * 0.3; // slight boost for keyword matches
    }
  });

  // Boost by creator
  if (post.userId && profile.creators[post.userId]) {
    score += profile.creators[post.userId];
  }
  if (post.username && profile.creators[post.username]) {
    score += profile.creators[post.username];
  }

  // Boost by community
  if (post.communityName && profile.communities[post.communityName]) {
    score += profile.communities[post.communityName];
  }

  return score;
}
