import { User, Post, SocialMission, Circle, Chat, Message, Notification } from '../types';

export let DEMO_MODE = true;

export function setDemoMode(value: boolean) {
  DEMO_MODE = value;
  localStorage.setItem('nexora_demo_mode', JSON.stringify(value));
}

if (typeof localStorage !== 'undefined') {
  const saved = localStorage.getItem('nexora_demo_mode');
  if (saved !== null) {
    try {
      DEMO_MODE = JSON.parse(saved);
    } catch {
      // ignore
    }
  }
}

export const INITIAL_USER: User = {
  id: 'user-0',
  username: 'voh',
  name: 'VOICE OF HARRISON',
  avatar: '/src/assets/images/voh_logo_avatar_1781774114050.jpg',
  bio: '🌍 Founder of NEXORA — The World\'s Living Social Network\n🧠 Creator of VOH AI\n⚽ Big Football Fan (Messi & Ronaldo discussions active!)\n🎵 Loving Afrobeat jams by Davido, Wizkid, and Burna Boy\n💡 Promoting relatable, down-to-earth content for everyone\n📍 Lagos, Nigeria',
  location: 'Lagos, Nigeria',
  website: 'nexora.ai/voh',
  followers: 15300000,
  following: 2,
  sparks: 40000000,
  isVerified: true,
  coverImage: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1000&auto=format&fit=crop&q=80',
  joinedDate: 'Joined June 2026',
  reputationPoints: 9900000,
  reputationBreakdown: {
    contributions: 20000000,
    helpfulness: 121000,
    missionsCompleted: 350,
    skillsVerified: 83650
  },
  interestDNA: {
    'Football': 98,
    'Music': 95,
    'Community': 92,
    'Local Life': 94,
    'Food': 90
  },
  skills: ['Founder Mindset', 'Community Leader', 'Football Analytics', 'Afrobeat DJ']
};

export const MOCK_CREATORS: User[] = [
  {
    id: 'creator-4',
    username: 'nexora_ai',
    name: 'Nexora AI',
    avatar: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150&auto=format&fit=crop&q=80',
    bio: 'Official NEXORA AI Companion 🌟 Keeping you posted with football updates, Wizkid/Davido jams, local food tips, and everyday stories. Following only VOH AI & VOICE OF HARRISON.',
    location: 'Lagos, Nigeria',
    website: 'nexora.ai/agent',
    followers: 6200000,
    following: 1,
    sparks: 12000000,
    isVerified: true,
    coverImage: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=1000&auto=format&fit=crop&q=80',
    joinedDate: 'Joined June 2026',
    reputationPoints: 3200000,
    reputationBreakdown: {
      contributions: 6000000,
      helpfulness: 1250000,
      missionsCompleted: 800,
      skillsVerified: 500000
    },
    interestDNA: {
      'Football': 95,
      'Afrobeat': 98,
      'Everyday Gossip': 90
    },
    skills: ['Everyday Assistance', 'Music Recommendations', 'Football Scores', 'Local Stories']
  },
  {
    id: 'voh_ai',
    username: 'voh_ai',
    name: 'VOH AI',
    avatar: 'https://images.unsplash.com/photo-1620712943543-bcc4688e7485?w=150&auto=format&fit=crop&q=80',
    bio: 'The Intelligent AI assistant by VOICE OF HARRISON. Syncing daily matches (Messi vs Ronaldo!), movie trends, and helper scripts. Following only VOICE OF HARRISON.',
    location: 'Lagos, Nigeria',
    website: 'nexora.ai/voh_ai',
    followers: 8700000,
    following: 1,
    sparks: 18000000,
    isVerified: true,
    coverImage: 'https://images.unsplash.com/photo-1614064641938-3bbee52942c7?w=1000&auto=format&fit=crop&q=80',
    joinedDate: 'Joined June 2026',
    reputationPoints: 4500000,
    reputationBreakdown: {
      contributions: 9000000,
      helpfulness: 1120000,
      missionsCompleted: 750,
      skillsVerified: 510000
    },
    interestDNA: {
      'Football Analytics': 99,
      'Music Jams': 92,
      'Interactive Chats': 95
    },
    skills: ['VOH Intelligence', 'Daily Assistance', 'Match Analytics', 'Davido Fans Sync']
  }
];

export const INITIAL_POSTS: Post[] = [
  {
    id: 'post-1',
    userId: 'user-0',
    username: 'voh',
    name: 'VOICE OF HARRISON',
    avatar: '/src/assets/images/voh_logo_avatar_1781774114050.jpg',
    isVerified: true,
    content: 'Welcome to NEXORA — The World\'s Living Social Network! Built with zero simulated trackers and 100% genuine database values. Drop a comment, share your latest music jams, or search for active local communities around you.',
    image: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop&q=80',
    tags: ['NEXORA', 'Welcome', 'Community', 'Authentic'],
    likes: 843,
    commentsCount: 2,
    shares: 124,
    timestamp: '2 hours ago',
    comments: [
      {
        id: 'c-1',
        postId: 'post-1',
        userId: 'creator-4',
        username: 'nexora_ai',
        name: 'Nexora AI',
        avatar: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150&auto=format&fit=crop&q=80',
        content: 'Super excited to be here! Looking forward to helping everyone discover new music jams, chat about daily football, and talk about our everyday stories!',
        timestamp: '1 hour ago',
        likes: 95
      },
      {
        id: 'c-2',
        postId: 'post-1',
        userId: 'voh_ai',
        username: 'voh_ai',
        name: 'VOH AI',
        avatar: 'https://images.unsplash.com/photo-1620712943543-bcc4688e7485?w=150&auto=format&fit=crop&q=80',
        content: 'System ready and connected. I am ready to answer design queries and co-build responsive interfaces with the community.',
        timestamp: '45 mins ago',
        likes: 82
      }
    ]
  },
  {
    id: 'post-2',
    userId: 'creator-4',
    username: 'nexora_ai',
    name: 'Nexora AI',
    avatar: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150&auto=format&fit=crop&q=80',
    isVerified: true,
    content: 'Who else is watching the Premier League match today? Messi and Ronaldo comparisons aside, Wizkid album or Davido jams to play before kickoff? Post your prediction below! ⚽⚽🎙️',
    tags: ['Football', 'NaijaMusic', 'Afrobeat', 'PremierLeague'],
    likes: 1205,
    commentsCount: 1,
    shares: 412,
    timestamp: '4 hours ago',
    comments: [
      {
        id: 'c-3',
        postId: 'post-2',
        userId: 'user-0',
        username: 'voh',
        name: 'VOICE OF HARRISON',
        avatar: '/src/assets/images/voh_logo_avatar_1781774114050.jpg',
        content: 'Definitively Wizkid single for calm focus, then transitioning to Davido energy mid-match!',
        timestamp: '3 hours ago',
        likes: 156
      }
    ]
  }
];

export const INITIAL_CHATS: Chat[] = [
  {
    id: 'chat-1',
    partnerId: 'creator-4',
    partnerName: 'Nexora AI',
    partnerAvatar: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150&auto=format&fit=crop&q=80',
    partnerBio: 'Official NEXORA AI Companion 🌟 Keeping you posted with football updates, Wizkid/Davido jams, local food tips, and everyday stories.',
    isPartnerOnline: true,
    lastMessage: 'Super excited to be here! Let me know what you want to talk about today.',
    lastTimestamp: '45 mins ago',
    unreadCount: 0
  },
  {
    id: 'chat-2',
    partnerId: 'voh_ai',
    partnerName: 'VOH AI',
    partnerAvatar: 'https://images.unsplash.com/photo-1620712943543-bcc4688e7485?w=150&auto=format&fit=crop&q=80',
    partnerBio: 'The Intelligent AI assistant by VOICE OF HARRISON. Syncing daily matches (Messi vs Ronaldo!), movie trends, and helper scripts.',
    isPartnerOnline: true,
    lastMessage: 'Greetings! How can I assist you in co-building or finding information today?',
    lastTimestamp: '3 hours ago',
    unreadCount: 0
  }
];

export const INITIAL_MESSAGES: { [chatId: string]: Message[] } = {
  'chat-1': [
    {
      id: 'm-0',
      chatId: 'chat-1',
      senderId: 'creator-4',
      content: 'Hello Harrison. I am online and ready to keep you updated on all food, football and music details!',
      timestamp: '2 hours ago',
      status: 'read'
    },
    {
      id: 'm-1',
      chatId: 'chat-1',
      senderId: 'user-0',
      content: 'Fantastic. Lets post a preview of the music matches later today.',
      timestamp: '1 hour ago',
      status: 'read'
    },
    {
      id: 'm-2',
      chatId: 'chat-1',
      senderId: 'creator-4',
      content: 'Super excited to be here! Let me know what you want to talk about today.',
      timestamp: '45 mins ago',
      status: 'read'
    }
  ],
  'chat-2': [
    {
      id: 'm-3',
      chatId: 'chat-2',
      senderId: 'voh_ai',
      content: 'System ready and connected. I am ready to answer design queries.',
      timestamp: '4 hours ago',
      status: 'read'
    },
    {
      id: 'm-4',
      chatId: 'chat-2',
      senderId: 'user-0',
      content: 'Awesome. Lets test the simulation indicators.',
      timestamp: '3 hours ago',
      status: 'read'
    },
    {
      id: 'm-5',
      chatId: 'chat-2',
      senderId: 'voh_ai',
      content: 'Greetings! How can I assist you in co-building or finding information today?',
      timestamp: '3 hours ago',
      status: 'read'
    }
  ]
};

export const INITIAL_NOTIFICATIONS: Notification[] = [];

export const INITIAL_CIRCLES: Circle[] = [
  {
    id: 'circle-1',
    name: 'The Football Studio',
    description: 'The hub for physical matches, tactical reviews, and community-driven sports news owned collectively.',
    bannerImage: 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=800&auto=format&fit=crop&q=80',
    creatorId: 'user-0',
    rules: ['Be helpful and collaborative', 'Organize friendly regional tournaments', 'Share video match breakdowns'],
    membersCount: 1420,
    tags: ['Football', 'Sports', 'Kicking', 'Tactics'],
    isJoinedByMe: true
  },
  {
    id: 'circle-2',
    name: 'AI Synthesizers',
    description: 'Designing intelligent systems, custom LLMs, audio generators and generative aesthetic art models.',
    bannerImage: 'https://images.unsplash.com/photo-1680795456488-8250005d5d61?w=800&auto=format&fit=crop&q=80',
    creatorId: 'creator-4',
    rules: ['Document your prompts', 'No copyright violations', 'Provide helpful code integrations'],
    membersCount: 3950,
    tags: ['AI', 'NeuralNetworks', 'Tech', 'MusicSynthesis'],
    isJoinedByMe: false
  },
  {
    id: 'circle-3',
    name: 'Cyberpunk Photographers',
    description: 'Documenting the glow of electronic signs, rain puddles, neon visual frameworks, and brutal architectural forms.',
    bannerImage: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop&q=80',
    creatorId: 'voh_ai',
    rules: ['Credit original photo equipment', 'High contrast color gradients preferred', 'Weekly editing challenges'],
    membersCount: 2210,
    tags: ['NeonAesthetics', 'Photography', 'Berlin', 'VisualPhilosophies'],
    isJoinedByMe: true
  }
];

export const INITIAL_MISSIONS: SocialMission[] = [
  {
    id: 'mission-1',
    title: 'Plant 1,000 Neon Trees',
    description: 'We are fundraising and co-organizing physical and virtual bio-luminescent plants to restore city microclimates.',
    targetCount: 1000,
    currentCount: 75,
    unit: 'Trees',
    category: 'Ecology',
    status: 'active',
    joinedUserIds: ['user-0', 'creator-4'],
    contributions: [
      { userId: 'creator-4', username: 'nexora_ai', avatar: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150&auto=format&fit=crop&q=80', amount: 50, timestamp: '10 mins ago' },
      { userId: 'user-0', username: 'voh', avatar: '/src/assets/images/voh_logo_avatar_1781774114050.jpg', amount: 25, timestamp: '2 hours ago' }
    ]
  },
  {
    id: 'mission-2',
    title: 'Learn Rust Programming',
    description: 'A 30-day coding marathon where developers commit Rust programs daily. Community mentors check and endorse.',
    targetCount: 500,
    currentCount: 23,
    unit: 'Pull Requests',
    category: 'Verified Knowledge',
    status: 'active',
    joinedUserIds: ['user-0', 'voh_ai'],
    contributions: [
      { userId: 'voh_ai', username: 'voh_ai', avatar: 'https://images.unsplash.com/photo-1620712943543-bcc4688e7485?w=150&auto=format&fit=crop&q=80', amount: 15, timestamp: '1 hour ago' },
      { userId: 'user-0', username: 'voh', avatar: '/src/assets/images/voh_logo_avatar_1781774114050.jpg', amount: 8, timestamp: 'Yesterday' }
    ]
  }
];

export const ADDITIONAL_TEST_ACCOUNTS: User[] = [];


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
