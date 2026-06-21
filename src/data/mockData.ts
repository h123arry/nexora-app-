import { User, Post, Chat, Message, Notification, SocialMission, Circle, PulseEvent } from '../types';
import { generateTestUsers, generateExtraMockPosts } from './generatedUsers';

export const INITIAL_USER: User = {
  id: 'user-0',
  username: 'voh',
  name: 'VOICE OF HARRISON',
  avatar: '/src/assets/images/voh_logo_avatar_1781774114050.jpg',
  bio: '🌍 Founder of NEXORA — The World\'s Living Social Network\n🧠 Creator of VOH AI\n⚽ Big Football Fan (Messi & Ronaldo discussions active!)\n🎵 Loving Afrobeat jams by Davido, Wizkid, and Burna Boy\n💡 Promoting relatable, down-to-earth content for everyone\n📍 Lagos, Nigeria',
  location: 'Lagos, Nigeria',
  website: 'nexora.ai/voh',
  followers: 7300000,
  following: 2,
  sparks: 1250000,
  isVerified: true,
  coverImage: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1000&auto=format&fit=crop&q=80',
  joinedDate: 'Joined June 2026',
  reputationPoints: 2450000,
  reputationBreakdown: {
    contributions: 95000,
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
    followers: 3000000,
    following: 2,
    isVerified: true,
    coverImage: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=1000&auto=format&fit=crop&q=80',
    joinedDate: 'Joined June 2026',
    reputationPoints: 3500000,
    reputationBreakdown: {
      contributions: 950000,
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
    followers: 2900000,
    following: 1,
    isVerified: true,
    coverImage: 'https://images.unsplash.com/photo-1614064641938-3bbee52942c7?w=1000&auto=format&fit=crop&q=80',
    joinedDate: 'Joined June 2026',
    reputationPoints: 3200000,
    reputationBreakdown: {
      contributions: 820000,
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

export const ADDITIONAL_TEST_ACCOUNTS: User[] = [];

export const INITIAL_MISSIONS: SocialMission[] = [
  {
    id: 'mission-1',
    title: 'Plant 1,000 Neon Trees',
    description: 'We are fundraising and co-organizing physical and virtual bio-luminescent plants to restore city microclimates.',
    targetCount: 1000,
    currentCount: 742,
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
    currentCount: 328,
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

export const INITIAL_PULSE_EVENTS: PulseEvent[] = [
  {
    id: 'pulse-1',
    title: 'Port Harcourt Fuel Refocus',
    description: 'A sudden, unusual spike in spatial technology discussions triggers localized meetup arrangements.',
    locationName: 'Port Harcourt, Nigeria',
    coordinates: { x: 55, y: 62 },
    intensity: 'critical',
    timestamp: '15 seconds ago',
    attendeesCount: 312
  },
  {
    id: 'pulse-2',
    title: 'Refraction Shader Expo',
    description: 'VOICE OF HARRISON is live streaming an interactive sandbox showing responsive glass material parameters.',
    locationName: 'Copenhagen, Denmark',
    coordinates: { x: 49, y: 31 },
    intensity: 'spawning',
    timestamp: '5 mins ago',
    attendeesCount: 890
  },
  {
    id: 'pulse-3',
    title: 'Rust Binary Optimization Marathon',
    description: 'Devs are debating best practices around Rust memory layouts and direct SIMD instructions.',
    locationName: 'Austin, Texas',
    coordinates: { x: 22, y: 44 },
    intensity: 'stable',
    timestamp: '2 hours ago',
    attendeesCount: 420
  }
];

const STATIC_POSTS: Post[] = [
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

export const INITIAL_POSTS: Post[] = [
  ...STATIC_POSTS,
  ...generateExtraMockPosts(generateTestUsers())
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

export const INITIAL_NOTIFICATIONS: Notification[] = [
  {
    id: 'n-system-1',
    type: 'reputation_milestone',
    userId: 'system',
    username: 'system',
    avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
    content: 'Welcome to NEXORA! Your profile credentials have been cryptographically secured.',
    timestamp: '5 mins ago',
    isRead: false,
    priority: 1,
    category: 'world_pulse'
  },
  {
    id: 'n-ai-recommendation-1',
    type: 'ai_recommendation',
    userId: 'voh_ai',
    username: 'voh_ai',
    avatar: 'https://images.unsplash.com/photo-1620712943543-bcc4688e7485?w=150&auto=format&fit=crop&q=80',
    content: 'VOH AI is ready to co-build. Drop me a chat message to start collaborating.',
    timestamp: '30 mins ago',
    isRead: false,
    priority: 2,
    category: 'voh_ai'
  }
];
