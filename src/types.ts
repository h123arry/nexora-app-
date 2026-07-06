export interface User {
  id: string;
  username: string;
  name: string;
  avatar: string;
  bio: string;
  location: string;
  website: string;
  followers: number;
  following: number;
  sparks?: number;
  isVerified: boolean;
  coverImage: string;
  joinedDate: string;
  email?: string;
  phone?: string;
  role?: 'founder' | 'admin' | 'user';
  isBanned?: boolean;
  isSuspended?: boolean;
  preferredLanguage?: string;
  savedCollections?: { [folderName: string]: string[] };
  // Innovative Living Reputation
  reputationPoints: number;
  reputationBreakdown: {
    contributions: number;
    helpfulness: number;
    missionsCompleted: number;
    skillsVerified: number;
  };
  // Interest DNA matrix
  interestDNA: {
    [key: string]: number; // e.g. 'Football': 95, 'AI': 88
  };
  skills: string[];
  // Creator & Monetization Systems
  nexBalance?: number;
  totalEarnedNex?: number;
  pendingNex?: number;
  thisWeekEarnedNex?: number;
  thisMonthEarnedNex?: number;
  thisYearEarnedNex?: number;
  creatorModeEnabled?: boolean;
  statusText?: string;
  statusEmoji?: string;
  pinnedMusicSong?: string;
  pinnedMusicArtist?: string;
  pinnedMusicUrl?: string;
  pinnedPosts?: string[];
  achievements?: { id: string; title: string; description: string; icon: string; date: string }[];
  lastUsernameChangeTime?: string;
  lastDisplayNameChangeTime?: string;
}

export interface SocialMission {
  id: string;
  title: string;
  description: string;
  targetCount: number;
  currentCount: number;
  unit: string;
  category: string;
  status: 'active' | 'completed';
  joinedUserIds: string[];
  contributions: {
    userId: string;
    username: string;
    avatar: string;
    amount: number;
    timestamp: string;
  }[];
}

export interface Circle {
  id: string;
  name: string;
  description: string;
  bannerImage: string;
  creatorId: string;
  rules: string[];
  membersCount: number;
  tags: string[];
  isJoinedByMe?: boolean;
}

export interface PulseEvent {
  id: string;
  title: string;
  description: string;
  locationName: string;
  coordinates: { x: number; y: number }; // Percentage coordinate for modern CSS visual positioning
  intensity: 'critical' | 'spawning' | 'stable';
  timestamp: string;
  attendeesCount: number;
}

export interface Comment {
  id: string;
  postId: string;
  userId: string;
  username: string;
  name: string;
  avatar: string;
  content: string;
  timestamp: string;
  likes: number;
  isLikedByUser?: boolean;
}

export interface Post {
  id: string;
  userId: string;
  username: string;
  name: string;
  avatar: string;
  isVerified: boolean;
  content: string;
  image?: string;
  imageFilter?: string;
  images?: string[];
  imageFilters?: string[];
  videoUrl?: string;
  voiceTranscript?: string;
  voiceAudioUrl?: string;
  audience?: 'public' | 'circle' | 'community' | 'followers' | 'onlyme';
  communityName?: string;
  tags: string[];
  likes: number;
  commentsCount: number;
  shares: number;
  views?: number;
  saves?: number;
  searchSuggestion?: string;
  timestamp: string;
  isLikedByUser?: boolean;
  isBookmarkedByUser?: boolean;
  location?: string;
  comments: Comment[];
  isVoice?: boolean;
  voiceDuration?: number;
  media?: string;
  opportunityType?: string;
  // Collaboration Post extension
  coAuthors?: {
    id: string;
    name: string;
    username: string;
    avatar: string;
  }[];
  // Interactive poll or mini-tool option
  interactivePoll?: {
    question: string;
    options: {
      id: string;
      text: string;
      votes: number;
    }[];
    votedOptionId?: string;
  };
  editHistory?: { content: string; timestamp: string }[];
  scheduledTime?: string;
  isDraft?: boolean;
  isBroadcastPost?: boolean;
  broadcastReactions?: { [emoji: string]: number };
  discussionModeEnabled?: boolean;
  discussionSideA?: string;
  discussionSideB?: string;
  discussionVotesA?: string[];
  discussionVotesB?: string[];
}

export interface Message {
  id: string;
  chatId: string;
  senderId: string;
  content: string;
  timestamp: string;
  status: 'sent' | 'delivered' | 'read';
}

export interface Chat {
  id: string;
  partnerId: string;
  partnerName: string;
  partnerAvatar: string;
  partnerBio: string;
  isPartnerOnline: boolean;
  lastMessage?: string;
  lastTimestamp?: string;
  unreadCount: number;
}

export interface Notification {
  id: string;
  type: 'like' | 'comment' | 'follow' | 'mention' | 'system' | 'mission_milestone' | 'pulse_alert' | 'message' | 'community' | 'spark' | 'ai_recommendation' | 'reputation_milestone';
  userId: string;
  username: string;
  avatar: string;
  targetId?: string; // e.g. postId, chatId, circleId, communityId, etc.
  content: string;
  timestamp: string;
  isRead: boolean;
  priority?: number; // 1 to 8 priority for sorting
  actionText?: string; // e.g. 'Follow Back', 'Reply', 'Join'
  actionType?: 'follow_back' | 'reply' | 'join_community' | 'view_post' | 'save' | 'open_chat';
  category?: 'messages' | 'mentions' | 'followers' | 'communities' | 'world_pulse' | 'voh_ai' | 'comments' | 'sparks';
}

export type ThemeMood = 'neon-cyber' | 'stealth-dark' | 'platinum-light' | 'emerald-glass';

export interface AppState {
  currentUser: User;
  posts: Post[];
  chats: Chat[];
  messages: { [chatId: string]: Message[] };
  notifications: Notification[];
  activeTab: 'feed' | 'explore' | 'inbox' | 'pulse' | 'matrix' | 'activity' | 'profile' | 'admin';
  theme: ThemeMood;
  searchQuery: string;
  selectedTag: string | null;
}

export interface Report {
  id: string;
  reporterUsername: string;
  targetType: 'post' | 'comment' | 'user' | 'community';
  targetId: string;
  targetContent: string;
  reason: 'Spam' | 'Harassment' | 'Violence' | 'Hate Speech' | 'Sexual Content' | 'Misinformation' | 'Other';
  comment: string;
  timestamp: string;
  status: 'pending' | 'resolved';
}

export interface CrashLog {
  id: string;
  timestamp: string;
  errorName: string;
  errorMessage: string;
  stack?: string;
  url: string;
  status: 'logged' | 'investigated' | 'resolved';
  severity: 'low' | 'medium' | 'high';
}
