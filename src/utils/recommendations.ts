export interface RecommendationProfile {
  tags: Record<string, number>; // tags/keywords -> weight
  creators: Record<string, number>; // userId/username -> weight
  communities: Record<string, number>; // communityName -> weight
}

export function getRecommendationProfile(): RecommendationProfile {
  try {
    const saved = localStorage.getItem('nexora_recommendation_profile_v2');
    if (saved) return JSON.parse(saved);
  } catch (e) {
    console.error(e);
  }
  // Provide some high quality default weights so the feed has rich seed content for new users
  return { 
    tags: { 'football': 10, 'tech': 5, 'afrobeats': 8, 'nigeria': 4, 'creative': 6 }, 
    creators: { 'voh': 15, 'nexora_ai': 10 }, 
    communities: { 'Afrobeats Central': 5, 'Developer Synergy': 5 } 
  };
}

export function saveRecommendationProfile(profile: RecommendationProfile) {
  try {
    localStorage.setItem('nexora_recommendation_profile_v2', JSON.stringify(profile));
  } catch (e) {
    console.error(e);
  }
}

export function recordRecommendationEvent(
  type: 'watch_complete' | 'skip_quick' | 'spark' | 'comment' | 'share' | 'save' | 'join_community' | 'follow' | 'search' | 'visit_profile',
  payload: { tags?: string[]; creatorId?: string; creatorUsername?: string; communityName?: string; keyword?: string }
) {
  const profile = getRecommendationProfile();
  
  // Tag score modifiers
  const modifiers = {
    watch_complete: 12,
    skip_quick: -15, // strong skip penalty to adjust quickly!
    spark: 10,
    comment: 15,
    share: 18,
    save: 15,
    join_community: 25,
    follow: 25,
    search: 8,
    visit_profile: 12
  };
  
  const score = modifiers[type] || 0;

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
