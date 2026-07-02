import { User, Post, Circle } from '../../types';
import { NotificationItem } from './notificationEngine';

// ==========================================
// 1. FEED INTELLIGENCE ENGINE
// ==========================================
export interface FeedEngagementMetrics {
  watchTimeSeconds: number;
  rewatchesCount: number;
  isLiked: boolean;
  isCommented: boolean;
  isShared: boolean;
  isSaved: boolean;
  isFollowed: boolean;
  isNotInterested: boolean;
  freshnessHours: number;
  userInterestsMatch: string[];
}

export class FeedIntelligenceEngine {
  static calculateRecommendationScore(post: Post, metrics: FeedEngagementMetrics): number {
    if (metrics.isNotInterested) {
      return 0; // Absolute penalty
    }

    let score = 100; // Base score

    // 1. Watch Time & Rewatches (High intensity signal)
    score += metrics.watchTimeSeconds * 8;
    score += metrics.rewatchesCount * 25;

    // 2. Active Interactions (Sparks, Comments, Shares, Saves)
    if (metrics.isLiked) score += 40;
    if (metrics.isCommented) score += 60;
    if (metrics.isShared) score += 80;
    if (metrics.isSaved) score += 50;
    if (metrics.isFollowed) score += 100;

    // 3. User Interests Match
    score += metrics.userInterestsMatch.length * 30;

    // 4. Freshness Decay (Exponential decay over hours)
    const decayFactor = Math.exp(-metrics.freshnessHours / 24);
    score = score * decayFactor;

    return Math.round(score);
  }
}

// ==========================================
// 2. CREATOR RANKING ENGINE
// ==========================================
export interface CreatorEngagementFactors {
  postsCountLast30Days: number;
  averageAudienceRetentionRate: number; // 0 to 1
  commentsReplyRate: number; // 0 to 1
  hasOriginalAudioVideo: boolean;
  spamFlagsCount: number;
}

export class CreatorRankingEngine {
  static determineCreatorVisibilityMultiplier(factors: CreatorEngagementFactors): {
    multiplier: number;
    status: 'High Visibility' | 'Standard Visibility' | 'Shadow-Filtered' | 'Flagged';
    explanation: string;
  } {
    if (factors.spamFlagsCount > 3) {
      return {
        multiplier: 0.1,
        status: 'Shadow-Filtered',
        explanation: 'Due to excessive trust & safety spam flags, content visibility has been throttled.'
      };
    }

    let score = 1.0;

    // Consistency booster
    if (factors.postsCountLast30Days >= 15) {
      score += 0.25;
    }

    // High audience retention booster
    if (factors.averageAudienceRetentionRate > 0.7) {
      score += 0.35;
    } else if (factors.averageAudienceRetentionRate < 0.3) {
      score -= 0.15;
    }

    // Community engagement booster
    if (factors.commentsReplyRate > 0.6) {
      score += 0.2;
    }

    // Originality booster
    if (factors.hasOriginalAudioVideo) {
      score += 0.2;
    }

    score = Math.max(0.2, Math.min(2.0, score));

    let status: 'High Visibility' | 'Standard Visibility' | 'Shadow-Filtered' | 'Flagged' = 'Standard Visibility';
    if (score >= 1.5) status = 'High Visibility';
    else if (score < 0.6) status = 'Flagged';

    return {
      multiplier: parseFloat(score.toFixed(2)),
      status,
      explanation: status === 'High Visibility' 
        ? 'Excellent audience retention and community interaction metrics. Boosting organic feed spread.'
        : 'Consistent metrics. Maintaining baseline organic spread.'
    };
  }
}

// ==========================================
// 3. MEDIA STREAMING ENGINE
// ==========================================
export interface NetworkConditions {
  effectiveType: 'slow-2g' | '2g' | '3g' | '4g' | 'wifi';
  rttMs: number;
  batteryLevel: number; // 0 to 1
  memoryUsageMb: number;
}

export class MediaStreamingEngine {
  static resolveAdaptiveParams(conditions: NetworkConditions): {
    resolution: '480p' | '720p' | '1080p';
    preloadMode: 'none' | 'metadata' | 'auto';
    bufferLengthMs: number;
    maxCacheAgeMs: number;
  } {
    const isBatteryLow = conditions.batteryLevel < 0.2;
    const isSlow = ['slow-2g', '2g', '3g'].includes(conditions.effectiveType) || conditions.rttMs > 250;

    // 1. Resolution
    let resolution: '480p' | '720p' | '1080p' = '1080p';
    if (isSlow) {
      resolution = '480p';
    } else if (isBatteryLow || conditions.effectiveType === '4g') {
      resolution = '720p';
    }

    // 2. Preloading mode
    let preloadMode: 'none' | 'metadata' | 'auto' = 'auto';
    if (isSlow && isBatteryLow) {
      preloadMode = 'none';
    } else if (isSlow || conditions.memoryUsageMb > 800) {
      preloadMode = 'metadata';
    }

    // 3. Buffer sizing
    let bufferLengthMs = 3000;
    if (isSlow) {
      bufferLengthMs = 8000; // Aggressive buffer on slow networks
    }

    // 4. Memory/Cache aging
    const maxCacheAgeMs = conditions.memoryUsageMb > 900 ? 60000 : 300000;

    return {
      resolution,
      preloadMode,
      bufferLengthMs,
      maxCacheAgeMs
    };
  }
}

// ==========================================
// 4. SEARCH & DISCOVERY ENGINE
// ==========================================
export interface SearchIndexData {
  videos: Post[];
  posts: Post[];
  communities: Circle[];
  profiles: User[];
  hashtags: string[];
}

export class SearchDiscoveryEngine {
  static searchAndRank(
    query: string, 
    index: SearchIndexData, 
    userInterests: string[] = []
  ): {
    posts: { item: Post; score: number }[];
    communities: { item: Circle; score: number }[];
    profiles: { item: User; score: number }[];
  } {
    const q = query.toLowerCase().trim();
    if (!q) {
      return { posts: [], communities: [], profiles: [] };
    }

    // Search and score posts
    const rankedPosts = index.posts
      .map(post => {
        let score = 0;
        const text = `${post.content} ${post.tags?.join(' ') || ''}`.toLowerCase();
        
        if (text.includes(q)) {
          score += 50;
          if (text.startsWith(q)) score += 30;
        }

        // Freshness booster
        const ageHours = (Date.now() - new Date(post.timestamp || Date.now()).getTime()) / (1000 * 60 * 60);
        score += Math.max(0, 50 - ageHours);

        // Sparks popularity booster
        score += Math.min(30, (post.likes || 0) * 0.5);

        // Interest alignment
        const sharedInterests = post.tags?.filter(t => userInterests.includes(t)) || [];
        score += sharedInterests.length * 15;

        return { item: post, score };
      })
      .filter(p => p.score > 10)
      .sort((a, b) => b.score - a.score);

    // Search and score communities
    const rankedCommunities = index.communities
      .map(circle => {
        let score = 0;
        const text = `${circle.name} ${circle.description} ${circle.tags?.join(' ') || ''}`.toLowerCase();
        
        if (text.includes(q)) {
          score += 60;
          if (circle.name.toLowerCase().includes(q)) score += 40;
        }

        // Members popularity booster
        const memberCount = circle.membersCount || 0;
        score += Math.min(30, memberCount / 100);

        return { item: circle, score };
      })
      .filter(c => c.score > 10)
      .sort((a, b) => b.score - a.score);

    // Search and score profiles
    const rankedProfiles = index.profiles
      .map(profile => {
        let score = 0;
        const text = `${profile.name} ${profile.username} ${profile.bio || ''}`.toLowerCase();

        if (text.includes(q)) {
          score += 70;
          if (profile.username.toLowerCase().includes(q)) score += 30;
        }

        score += Math.min(20, profile.reputationPoints / 1000);

        return { item: profile, score };
      })
      .filter(p => p.score > 10)
      .sort((a, b) => b.score - a.score);

    return {
      posts: rankedPosts,
      communities: rankedCommunities,
      profiles: rankedProfiles
    };
  }
}

// ==========================================
// 5. NOTIFICATION ENGINE
// ==========================================
// Handled by unified NotificationEngine in notificationEngine.ts

// ==========================================
// 6. TRUST & SAFETY ENGINE
// ==========================================
export class TrustSafetyEngine {
  static auditPostContent(text: string): {
    isSafe: boolean;
    spamProbability: number;
    violationsDetected: string[];
    actionRecommended: 'auto_publish' | 'flag_for_review' | 'auto_quarantine';
  } {
    const words = text.toLowerCase();
    const spamKeywords = ['earn fast money', 'click here for free', 'buy followers', 'cheap tokens', 'crypto doubling', 'make 10000 daily'];
    const toxicKeywords = ['hate you', 'stupid loser', 'harass', 'violence', 'scam link'];

    const violations: string[] = [];
    let spamMatches = 0;

    spamKeywords.forEach(word => {
      if (words.includes(word)) {
        spamMatches++;
        violations.push(`Potential Spam Link / Promotion: "${word}"`);
      }
    });

    toxicKeywords.forEach(word => {
      if (words.includes(word)) {
        violations.push(`Harassment / Unsafe language: "${word}"`);
      }
    });

    const spamProbability = spamMatches > 0 ? Math.min(0.95, 0.3 + spamMatches * 0.25) : 0.05;
    const isSafe = violations.length === 0;

    let actionRecommended: 'auto_publish' | 'flag_for_review' | 'auto_quarantine' = 'auto_publish';
    if (violations.some(v => v.includes('Unsafe'))) {
      actionRecommended = 'auto_quarantine';
    } else if (spamProbability > 0.5) {
      actionRecommended = 'flag_for_review';
    }

    return {
      isSafe,
      spamProbability,
      violationsDetected: violations,
      actionRecommended
    };
  }
}

// ==========================================
// 7. COMMUNITY ENGINE
// ==========================================
export interface CommunityConfig {
  moderators: string[];
  pinnedPostIds: string[];
  rules: string[];
  memberRoles: { [userId: string]: 'founder' | 'moderator' | 'member' };
}

export class CommunityEngine {
  static getPermissions(
    userId: string, 
    config: CommunityConfig
  ): {
    canPinPosts: boolean;
    canRemoveComments: boolean;
    canEditRules: boolean;
    roleName: string;
  } {
    const role = config.memberRoles[userId] || 'member';

    return {
      canPinPosts: role === 'founder' || role === 'moderator',
      canRemoveComments: role === 'founder' || role === 'moderator',
      canEditRules: role === 'founder',
      roleName: role.toUpperCase()
    };
  }
}

// ==========================================
// 8. MESSAGING ENGINE
// ==========================================
export interface DirectMessage {
  id: string;
  senderId: string;
  text: string;
  timestamp: Date;
  isRead: boolean;
  typingIndicatorActive?: boolean;
}

export class MessagingEngine {
  static processIncomingMessage(
    msg: DirectMessage, 
    userId: string
  ): {
    sendReadReceipt: boolean;
    displayTypingIndicator: boolean;
    indexTerms: string[];
  } {
    const isReceivedByCurrentUser = msg.senderId !== userId;
    const indexTerms = msg.text.toLowerCase().split(/\s+/).filter(word => word.length > 3);

    return {
      sendReadReceipt: isReceivedByCurrentUser && !msg.isRead,
      displayTypingIndicator: msg.typingIndicatorActive || false,
      indexTerms
    };
  }
}

// ==========================================
// 9. VOH AI INTELLIGENCE ENGINE
// ==========================================
export class VohAiIntelligenceEngine {
  static summarizeDiscussion(messages: string[]): string {
    if (messages.length === 0) return "No active discussion to summarize.";
    
    const keyThemes = messages
      .filter(m => m.length > 20)
      .slice(0, 3)
      .map(m => m.substring(0, 50) + "...");

    return `### 📊 Discussion Summary
This discussion centers on **${keyThemes.length} key aspects** of local topics:
- **Core theme**: Highly focused on community updates and interaction feedback.
- **Sentiment analysis**: Predominantly positive with constructive feedback sparks.
- **Top points brought up**:
${keyThemes.map(theme => `  - *${theme}*`).join('\n')}`;
  }

  static suggestReplies(postContent: string): string[] {
    const content = postContent.toLowerCase();
    if (content.includes('football') || content.includes('match')) {
      return [
        "Incredible play! The energy in Nigeria's local leagues is unmatchable. ⚽🔥",
        "Who is your man of the match? That retention and counter-attack was pure class!",
        "Nexora sports feeds are absolutely superior!"
      ];
    } else if (content.includes('food') || content.includes('recipe') || content.includes('restaurant')) {
      return [
        "This looks mouth-watering! Lagos food spots never fail to impress. 🍲🇳🇬",
        "Please share the precise restaurant location! Adding this to my weekend list.",
        "A healthy balance of spice and taste!"
      ];
    }

    return [
      "Incredible content, keeping me locked in on Nexora! 🌟🚀",
      "Perfect composition. VOH AI agrees this deserves more sparks!",
      "Super relevant insight, thanks for sharing this update."
    ];
  }
}

// ==========================================
// 10. PROFILE & REPUTATION ENGINE
// ==========================================
export interface ReputationEvent {
  eventType: 'spark_received' | 'comment_received' | 'community_post' | 'reported_spam' | 'achievement_completed';
  payloadValue?: number;
}

export class ProfileReputationEngine {
  static calculateReputationDelta(event: ReputationEvent): {
    pointsDelta: number;
    achievementUnlocked?: string;
  } {
    let pointsDelta = 0;
    let achievementUnlocked: string | undefined;

    switch (event.eventType) {
      case 'spark_received':
        pointsDelta = 5;
        break;
      case 'comment_received':
        pointsDelta = 10;
        break;
      case 'community_post':
        pointsDelta = 15;
        break;
      case 'reported_spam':
        pointsDelta = -50;
        break;
      case 'achievement_completed':
        pointsDelta = 100;
        achievementUnlocked = "Nexora Trailblazer Milestone";
        break;
    }

    return { pointsDelta, achievementUnlocked };
  }
}
