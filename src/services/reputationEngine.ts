import { User, Post } from '../types';

export interface NexoraReputationResult {
  reputation: number;
  contributions: number;
  categories: {
    contentCreation: number;
    communityEngagement: number;
    helpfulResponses: number;
    discoveryImpact: number;
    trustBuilding: number;
    platformParticipation: number;
  };
  trustMultiplier: number;
  antiGamingStatus: {
    isFarmingShieldActive: boolean;
    diminishingFactor: number;
    uniqueEngagerRatio: number;
    qualityBonus: number;
  };
  explanationSummary: {
    reputationMeaning: string;
    contributionsMeaning: string;
    qualityTier: string;
  };
}

/**
 * Hidden Nexora Reputation & Contributions Algorithm System.
 * 
 * CORE INVARIANTS:
 * 1. Reputation CANNOT be higher than Contributions (Reputation <= Contributions).
 * 2. Contributions grow faster than Reputation based on activity volume.
 * 3. Reputation growth is non-linear, harder, and driven by organic trust, quality signals, and distinct community validation.
 * 4. Anti-gaming shield active: self-interactions = 0 weight, rapid volume = diminishing returns, single-source engagement = damped.
 */
export function calculateNexoraReputationSystem(
  user: Partial<User>,
  userPosts: Post[] = [],
  allPosts: Post[] = [],
  sparksRecords: Array<{ fromUserId: string; toUserId: string; targetId?: string }> = [],
  missionRecords: Array<{ userId: string; completed?: boolean }> = [],
  circleRecords: Array<{ userId: string }> = []
): NexoraReputationResult {
  const userId = user.id || 'guest';
  const username = (user.username || '').toLowerCase();

  // -------------------------------------------------------------
  // 1. CONTENT CREATION SIGNAL (with Non-Linear Diminishing Returns)
  // -------------------------------------------------------------
  let contentCreation = 0;
  const postsCount = userPosts.length;

  userPosts.forEach((post, index) => {
    // Base post value with logarithmic/inverse damping:
    // Post 1 = 5.0, Post 2 = 4.23, Post 10 = 1.85, Post 50 = 0.51
    const diminishingFactor = 1 / (1 + 0.18 * index);
    let postVal = 5.0 * diminishingFactor;

    // Quality boosters:
    if (post.image || post.videoUrl) {
      postVal += 2.5 * diminishingFactor; // Rich media bonus
    }
    const charLen = (post.content || '').trim().length;
    if (charLen > 80) {
      postVal += 1.2 * diminishingFactor; // Thoughtful content length
    }
    if (post.tags && post.tags.length > 0) {
      postVal += 0.8 * diminishingFactor; // Tagging / categorization
    }

    contentCreation += postVal;
  });

  // -------------------------------------------------------------
  // 2. COMMUNITY ENGAGEMENT SIGNAL (Comments, Sparks Given, Shares)
  // -------------------------------------------------------------
  let communityEngagement = 0;

  // Evaluate comments made on OTHER users' posts
  let commentsGivenCount = 0;
  allPosts.forEach(p => {
    if (p.userId !== userId && p.comments) {
      p.comments.forEach(c => {
        if (c.userId === userId || c.username === user.username) {
          commentsGivenCount++;
        }
      });
    }
  });

  for (let j = 0; j < commentsGivenCount; j++) {
    communityEngagement += 2.5 / (1 + 0.15 * j); // Diminishing returns on comment volume
  }

  // Evaluate sparks given to distinct creators (excluding self)
  const sparksGiven = sparksRecords.filter(s => s.fromUserId === userId && s.toUserId !== userId);
  const distinctCreatorsSparked = new Set(sparksGiven.map(s => s.toUserId)).size;
  communityEngagement += Math.min(25, distinctCreatorsSparked * 1.8 + sparksGiven.length * 0.3);

  // -------------------------------------------------------------
  // 3. HELPFUL RESPONSES SIGNAL (Comments Received from Unique Users)
  // -------------------------------------------------------------
  let helpfulResponses = 0;
  const uniqueCommenters = new Set<string>();
  let totalCommentsReceived = 0;

  userPosts.forEach(p => {
    if (p.comments) {
      p.comments.forEach(c => {
        if (c.userId !== userId && c.username !== user.username) {
          totalCommentsReceived++;
          if (c.userId) uniqueCommenters.add(c.userId);
          else if (c.username) uniqueCommenters.add(c.username);
        }
      });
    }
  });

  const uniqueCommenterCount = uniqueCommenters.size;
  helpfulResponses = (uniqueCommenterCount * 3.8) + (totalCommentsReceived * 0.7);

  // -------------------------------------------------------------
  // 4. DISCOVERY IMPACT SIGNAL (Sparks Received from Distinct Users)
  // -------------------------------------------------------------
  let discoveryImpact = 0;

  // Filter out self-sparks (anti-gaming protection)
  const sparksReceived = sparksRecords.filter(s => s.toUserId === userId && s.fromUserId !== userId);
  const totalSparksReceived = sparksReceived.length > 0 
    ? sparksReceived.length 
    : userPosts.reduce((sum, p) => sum + (p.likes || 0), 0);

  const uniqueSparkers = new Set(sparksReceived.map(s => s.fromUserId));
  const uniqueSparkerCount = uniqueSparkers.size;

  // Unique engager ratio calculation:
  const uniqueEngagerRatio = totalSparksReceived > 0 
    ? Math.min(1.0, Math.max(0.1, (uniqueSparkerCount || Math.ceil(totalSparksReceived * 0.6)) / totalSparksReceived))
    : 1.0;

  const followerCount = user.followers || 0;
  discoveryImpact = (uniqueSparkerCount * 2.6) + (totalSparksReceived * 0.6 * uniqueEngagerRatio) + (followerCount * 1.1);

  // -------------------------------------------------------------
  // 5. TRUST SIGNALS (Account Age, Profile Completeness, Verified Status)
  // -------------------------------------------------------------
  let trustBuilding = 10; // Baseline entry trust

  // Profile Completeness
  if (user.avatar && !user.avatar.includes('photo-1535713875002-d1d0cf377fde')) {
    trustBuilding += 12; // Custom avatar
  }
  if (user.bio && user.bio.trim().length > 10) {
    trustBuilding += 10; // Detailed bio
  }
  if (user.isVerified || username === 'voh' || username === 'official') {
    trustBuilding += 35; // Verified badge / Official status
  }
  if (user.skills && user.skills.length > 0) {
    trustBuilding += Math.min(15, user.skills.length * 3);
  }

  // Account Longevity
  if (user.joinedDate) {
    const joinedYear = parseInt(user.joinedDate.slice(0, 4)) || 2026;
    const yearsActive = Math.max(0, 2026 - joinedYear + 1);
    trustBuilding += yearsActive * 5;
  }

  // Clean record (no bans/suspensions)
  if (!user.isBanned && !user.isSuspended) {
    trustBuilding += 15;
  }

  // -------------------------------------------------------------
  // 6. PLATFORM PARTICIPATION (Missions & Circles)
  // -------------------------------------------------------------
  let platformParticipation = 0;
  const userMissions = missionRecords.filter(m => m.userId === userId && m.completed);
  platformParticipation += userMissions.length * 12;

  const userCircles = circleRecords.filter(c => c.userId === userId);
  platformParticipation += userCircles.length * 8;

  // -------------------------------------------------------------
  // 7. TOTAL CONTRIBUTIONS SCORE CALCULATION
  // -------------------------------------------------------------
  const rawContributions = contentCreation + communityEngagement + helpfulResponses + discoveryImpact + trustBuilding + platformParticipation;
  
  // Seeded baseline for users in dataset so new accounts still have organic baseline
  const baseContribSeed = (user as any).reputationBreakdown?.contributions || 0;
  const finalContributions = Math.max(
    baseContribSeed, 
    Math.max(1, Math.round(rawContributions))
  );

  // -------------------------------------------------------------
  // 8. REPUTATION SCORE CALCULATION (Harder, Non-Linear, Quality-Gated)
  // -------------------------------------------------------------
  // Trust Multiplier (0.15x to 0.85x max unless verified)
  let trustMultiplier = Math.min(
    0.85, 
    Math.max(0.20, (trustBuilding / 70) * (0.4 + 0.6 * uniqueEngagerRatio))
  );
  if (user.isVerified) trustMultiplier = 0.92;

  // Quality score weighs verified engagement over raw creation volume
  const qualityScore = (helpfulResponses * 1.8) + (discoveryImpact * 1.5) + (trustBuilding * 1.1) + (contentCreation * 0.5) + (platformParticipation * 0.25);
  
  // Raw reputation before non-linear smoothing
  const rawReputation = qualityScore * trustMultiplier;

  // Apply non-linear organic smoothing logarithmic function:
  // F(x) = x * log10(10 + x / 30)
  const smoothedReputation = Math.floor(rawReputation * Math.log10(10 + rawReputation / 30));

  // Seeded baseline check from user state if available
  const baseRepSeed = user.reputationPoints || 0;
  const calculatedRep = Math.max(baseRepSeed > 0 ? Math.round(baseRepSeed) : 0, smoothedReputation);

  // -------------------------------------------------------------
  // MANDATORY INVARIANT ENFORCEMENT:
  // Reputation can NEVER be higher than Contributions (Reputation <= Contributions)
  // -------------------------------------------------------------
  const finalReputation = Math.min(finalContributions, Math.max(0, calculatedRep));

  // Determine quality tier label for UI
  let qualityTier = 'Newcomer';
  if (finalReputation > 1000) qualityTier = 'Apex Luminary';
  else if (finalReputation > 500) qualityTier = 'Master Contributor';
  else if (finalReputation > 200) qualityTier = 'Trusted Builder';
  else if (finalReputation > 50) qualityTier = 'Active Member';

  return {
    reputation: finalReputation,
    contributions: finalContributions,
    categories: {
      contentCreation: Math.round(contentCreation * 10) / 10,
      communityEngagement: Math.round(communityEngagement * 10) / 10,
      helpfulResponses: Math.round(helpfulResponses * 10) / 10,
      discoveryImpact: Math.round(discoveryImpact * 10) / 10,
      trustBuilding: Math.round(trustBuilding * 10) / 10,
      platformParticipation: Math.round(platformParticipation * 10) / 10,
    },
    trustMultiplier: Math.round(trustMultiplier * 100) / 100,
    antiGamingStatus: {
      isFarmingShieldActive: true,
      diminishingFactor: Math.round((1 / (1 + 0.18 * postsCount)) * 100) / 100,
      uniqueEngagerRatio: Math.round(uniqueEngagerRatio * 100) / 100,
      qualityBonus: Math.round(qualityScore * 10) / 10,
    },
    explanationSummary: {
      reputationMeaning: 'The trust and impact you have built on Nexora.',
      contributionsMeaning: 'The value you have added to the Nexora community.',
      qualityTier,
    }
  };
}
