import { User, Post, SocialMission, Circle } from '../types';

const KEYS = {
  FOLLOWS: 'nexora_db_follows',
  REPUTATION: 'nexora_db_reputation_events',
  CIRCLES: 'nexora_db_joined_circles',
  COMMUNITIES: 'nexora_db_joined_communities',
  MISSIONS: 'nexora_db_joined_missions',
  SPARKS: 'nexora_db_sparks',
  POSTS: 'nexora_posts',
  ACCOUNTS: 'nexora_registered_accounts',
};

export interface FollowRecord {
  followerId: string;
  followingId: string;
}

export interface ReputationRecord {
  id: string;
  userId: string;
  change: number;
  reason: 'Create post' | 'Receive Spark' | 'Helpful comment' | 'Complete mission' | 'Community contribution' | 'Community leadership action';
  timestamp: string;
}

export interface JoinedCircleRecord {
  userId: string;
  circleId: string;
}

export interface JoinedCommunityRecord {
  userId: string;
  communityId: string;
}

export interface JoinedMissionRecord {
  userId: string;
  missionId: string;
  completed: boolean;
}

export interface SparkRecord {
  id: string;
  fromUserId: string;
  toUserId: string;
  targetType: 'post' | 'user' | 'comment';
  targetId: string;
}

// Ensure database tables exist in LocalStorage
export function initDb() {
  if (!localStorage.getItem(KEYS.FOLLOWS)) {
    const initialFollows = [
      { followerId: 'user-0', followingId: 'creator-4' }, // VOH follows Nexora AI
      { followerId: 'user-0', followingId: 'voh_ai' },    // VOH follows VOH AI
      { followerId: 'creator-4', followingId: 'user-0' }, // Nexora AI follows VOH
      { followerId: 'creator-4', followingId: 'voh_ai' }, // Nexora AI follows VOH AI
      { followerId: 'voh_ai', followingId: 'user-0' }     // VOH AI follows VOH
    ];
    localStorage.setItem(KEYS.FOLLOWS, JSON.stringify(initialFollows));
  }

  if (!localStorage.getItem(KEYS.REPUTATION)) {
    localStorage.setItem(KEYS.REPUTATION, JSON.stringify([]));
  }
  if (!localStorage.getItem(KEYS.CIRCLES)) {
    localStorage.setItem(KEYS.CIRCLES, JSON.stringify([]));
  }
  if (!localStorage.getItem(KEYS.COMMUNITIES)) {
    localStorage.setItem(KEYS.COMMUNITIES, JSON.stringify([]));
  }
  if (!localStorage.getItem(KEYS.MISSIONS)) {
    localStorage.setItem(KEYS.MISSIONS, JSON.stringify([]));
  }
  if (!localStorage.getItem(KEYS.SPARKS)) {
    localStorage.setItem(KEYS.SPARKS, JSON.stringify([]));
  }
}

// Relational queries
export function getFollowersCount(userId: string): number {
  initDb();
  const follows: FollowRecord[] = JSON.parse(localStorage.getItem(KEYS.FOLLOWS) || '[]');
  return follows.filter(f => f.followingId === userId).length;
}

export function getFollowingCount(userId: string): number {
  initDb();
  const follows: FollowRecord[] = JSON.parse(localStorage.getItem(KEYS.FOLLOWS) || '[]');
  return follows.filter(f => f.followerId === userId).length;
}

export function isFollowingDb(followerId: string, followingId: string): boolean {
  initDb();
  const follows: FollowRecord[] = JSON.parse(localStorage.getItem(KEYS.FOLLOWS) || '[]');
  return follows.some(f => f.followerId === followerId && f.followingId === followingId);
}

export function getReputationPoints(userId: string): number {
  initDb();
  const events: ReputationRecord[] = JSON.parse(localStorage.getItem(KEYS.REPUTATION) || '[]');
  return events.filter(e => e.userId === userId).reduce((sum, e) => sum + e.change, 0);
}

export function getReputationBreakdown(userId: string) {
  initDb();
  const events: ReputationRecord[] = JSON.parse(localStorage.getItem(KEYS.REPUTATION) || '[]');
  const userEvents = events.filter(e => e.userId === userId);
  
  return {
    contributions: userEvents.filter(e => e.reason === 'Create post' || e.reason === 'Community contribution').reduce((sum, e) => sum + e.change, 0),
    helpfulness: userEvents.filter(e => e.reason === 'Helpful comment').reduce((sum, e) => sum + e.change, 0),
    missionsCompleted: userEvents.filter(e => e.reason === 'Complete mission').reduce((sum, e) => sum + e.change, 0),
    skillsVerified: userEvents.filter(e => e.reason === 'Receive Spark' || e.reason === 'Community leadership action').reduce((sum, e) => sum + e.change, 0),
  };
}

export function getContributionsCount(userId: string): number {
  const posts: Post[] = JSON.parse(localStorage.getItem(KEYS.POSTS) || '[]');
  return posts.filter(p => p.userId === userId).length;
}

export function getJoinedCirclesCount(userId: string): number {
  initDb();
  const circles: JoinedCircleRecord[] = JSON.parse(localStorage.getItem(KEYS.CIRCLES) || '[]');
  return circles.filter(c => c.userId === userId).length;
}

export function isCircleJoinedDb(userId: string, circleId: string): boolean {
  initDb();
  const circles: JoinedCircleRecord[] = JSON.parse(localStorage.getItem(KEYS.CIRCLES) || '[]');
  return circles.some(c => c.userId === userId && c.circleId === circleId);
}

export function getJoinedCommunitiesCount(userId: string): number {
  initDb();
  const communities: JoinedCommunityRecord[] = JSON.parse(localStorage.getItem(KEYS.COMMUNITIES) || '[]');
  return communities.filter(c => c.userId === userId).length;
}

export function getCompletedMissionsCount(userId: string): number {
  initDb();
  const missions: JoinedMissionRecord[] = JSON.parse(localStorage.getItem(KEYS.MISSIONS) || '[]');
  return missions.filter(m => m.userId === userId && m.completed).length;
}

export function isMissionCompletedDb(userId: string, missionId: string): boolean {
  initDb();
  const missions: JoinedMissionRecord[] = JSON.parse(localStorage.getItem(KEYS.MISSIONS) || '[]');
  return missions.some(m => m.userId === userId && m.missionId === missionId && m.completed);
}

export function getSparksReceived(userId: string): number {
  initDb();
  const sparks: SparkRecord[] = JSON.parse(localStorage.getItem(KEYS.SPARKS) || '[]');
  return sparks.filter(s => s.toUserId === userId).length;
}

export function getSparksGiven(userId: string): number {
  initDb();
  const sparks: SparkRecord[] = JSON.parse(localStorage.getItem(KEYS.SPARKS) || '[]');
  return sparks.filter(s => s.fromUserId === userId).length;
}

// Modify state / record relations
export function followUserDb(followerId: string, followingId: string) {
  initDb();
  const follows: FollowRecord[] = JSON.parse(localStorage.getItem(KEYS.FOLLOWS) || '[]');
  if (!follows.some(f => f.followerId === followerId && f.followingId === followingId)) {
    follows.push({ followerId, followingId });
    localStorage.setItem(KEYS.FOLLOWS, JSON.stringify(follows));
  }
}

export function unfollowUserDb(followerId: string, followingId: string) {
  initDb();
  let follows: FollowRecord[] = JSON.parse(localStorage.getItem(KEYS.FOLLOWS) || '[]');
  follows = follows.filter(f => !(f.followerId === followerId && f.followingId === followingId));
  localStorage.setItem(KEYS.FOLLOWS, JSON.stringify(follows));
}

export function addReputationDb(userId: string, change: number, reason: ReputationRecord['reason']) {
  initDb();
  const events: ReputationRecord[] = JSON.parse(localStorage.getItem(KEYS.REPUTATION) || '[]');
  events.push({
    id: `rep-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    userId,
    change,
    reason,
    timestamp: new Date().toISOString(),
  });
  localStorage.setItem(KEYS.REPUTATION, JSON.stringify(events));
}

export function createPostDb(userId: string) {
  // +5 reputation for creating a post
  addReputationDb(userId, 5, 'Create post');
}

export function addSparkDb(fromUserId: string, toUserId: string, targetType: SparkRecord['targetType'], targetId: string) {
  initDb();
  const sparks: SparkRecord[] = JSON.parse(localStorage.getItem(KEYS.SPARKS) || '[]');
  // Check if already sparked to prevent double sparking
  if (!sparks.some(s => s.fromUserId === fromUserId && s.targetType === targetType && s.targetId === targetId)) {
    sparks.push({
      id: `spark-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      fromUserId,
      toUserId,
      targetType,
      targetId,
    });
    localStorage.setItem(KEYS.SPARKS, JSON.stringify(sparks));
    // +1 reputation for receiver
    addReputationDb(toUserId, 1, 'Receive Spark');
  }
}

export function addHelpfulCommentDb(userId: string) {
  // +2 reputation for helpful comments
  addReputationDb(userId, 2, 'Helpful comment');
}

export function completeMissionDb(userId: string, missionId: string) {
  initDb();
  const list: JoinedMissionRecord[] = JSON.parse(localStorage.getItem(KEYS.MISSIONS) || '[]');
  const index = list.findIndex(m => m.userId === userId && m.missionId === missionId);
  if (index >= 0) {
    list[index].completed = true;
  } else {
    list.push({ userId, missionId, completed: true });
  }
  localStorage.setItem(KEYS.MISSIONS, JSON.stringify(list));
  // +10 reputation for completed mission
  addReputationDb(userId, 10, 'Complete mission');
}

export function joinCircleDb(userId: string, circleId: string) {
  initDb();
  const list: JoinedCircleRecord[] = JSON.parse(localStorage.getItem(KEYS.CIRCLES) || '[]');
  if (!list.some(c => c.userId === userId && c.circleId === circleId)) {
    list.push({ userId, circleId });
    localStorage.setItem(KEYS.CIRCLES, JSON.stringify(list));
    // +15 reputation for community contribution / joining circle
    addReputationDb(userId, 15, 'Community contribution');
  }
}

export function leaveCircleDb(userId: string, circleId: string) {
  initDb();
  let list: JoinedCircleRecord[] = JSON.parse(localStorage.getItem(KEYS.CIRCLES) || '[]');
  list = list.filter(c => !(c.userId === userId && c.circleId === circleId));
  localStorage.setItem(KEYS.CIRCLES, JSON.stringify(list));
}

// Compute dynamically calculated profile with absolute integrity
export function getRichUser(user: User): User {
  if (!user) return user;
  
  const isFounder = user.id === 'user-0' || user.username.toLowerCase() === 'voh' || (user.email && user.email.toLowerCase() === 'ogoulu131@gmail.com');
  const isNexoraAi = user.username === 'nexora_ai';
  const isVohAi = user.username === 'voh_ai';

  const followersCount = getFollowersCount(user.id);
  const followingCount = getFollowingCount(user.id);
  const reputationVal = getReputationPoints(user.id);
  const breakdown = getReputationBreakdown(user.id);
  const contributionsCount = getContributionsCount(user.id);
  const completedMissionsCount = getCompletedMissionsCount(user.id);

  if (isFounder) {
    // Founder Exception: manually assigned metrics (7.3 Million Followers) + local changes
    return {
      ...user,
      name: 'VOICE OF HARRISON',
      username: 'voh',
      isVerified: true,
      followers: 7300000 + followersCount,
      following: 2 + followingCount,
      reputationPoints: 5450000 + reputationVal,
      sparks: 2500000 + getSparksReceived(user.id),
      reputationBreakdown: {
        contributions: 450000 + contributionsCount,
        helpfulness: 121000 + breakdown.helpfulness,
        missionsCompleted: 350 + completedMissionsCount,
        skillsVerified: 83650 + breakdown.skillsVerified,
      },
    };
  }

  if (isNexoraAi) {
    // Nexora AI details requested (3.0M Followers, following only voh_ai & VOH)
    return {
      ...user,
      name: 'Nexora AI',
      username: 'nexora_ai',
      isVerified: true,
      followers: 3000000 + followersCount,
      following: 2, // only voh_ai and VOH
      reputationPoints: 4500000 + reputationVal,
      sparks: 1200000 + getSparksReceived(user.id),
      reputationBreakdown: {
        contributions: 950000 + contributionsCount,
        helpfulness: 1250000 + breakdown.helpfulness,
        missionsCompleted: 800 + completedMissionsCount,
        skillsVerified: 500000 + breakdown.skillsVerified,
      }
    };
  }

  if (isVohAi) {
    // VOH AI details requested (2.9M Followers, following only VOICE OF HARRISON)
    return {
      ...user,
      name: 'VOH AI',
      username: 'voh_ai',
      isVerified: true,
      followers: 2900000 + followersCount,
      following: 1, // only VOICE OF HARRISON (voh)
      reputationPoints: 4200000 + reputationVal,
      sparks: 1100000 + getSparksReceived(user.id),
      reputationBreakdown: {
        contributions: 820000 + contributionsCount,
        helpfulness: 1120000 + breakdown.helpfulness,
        missionsCompleted: 750 + completedMissionsCount,
        skillsVerified: 510000 + breakdown.skillsVerified,
      }
    };
  }

  // Normal users
  return {
    ...user,
    isVerified: user.isVerified || false,
    followers: followersCount,
    following: followingCount,
    reputationPoints: reputationVal,
    sparks: getSparksReceived(user.id),
    reputationBreakdown: {
      contributions: contributionsCount,
      helpfulness: breakdown.helpfulness,
      missionsCompleted: completedMissionsCount,
      skillsVerified: breakdown.skillsVerified,
    },
  };
}
