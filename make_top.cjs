const fs = require('fs');

const str = `import { User, Post, SocialMission, Circle, Chat, Message, Notification } from '../types';

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
  bio: '🌍 Founder of NEXORA — The World\\'s Living Social Network\\n🧠 Creator of VOH AI\\n⚽ Big Football Fan (Messi & Ronaldo discussions active!)\\n🎵 Loving Afrobeat jams by Davido, Wizkid, and Burna Boy\\n💡 Promoting relatable, down-to-earth content for everyone\\n📍 Lagos, Nigeria',
  location: 'Lagos, Nigeria',
  website: 'nexora.ai/voh',
  followers: 15300000,
  following: 2,
  nexBalance: 0,
  thisWeekEarnedNex: 0,
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
    bio: 'Official Nexora page. Platform announcements, community news, and safety updates.',
    location: 'Lagos, Nigeria',
    website: 'nexora.ai/agent',
    followers: 6400000,
    following: 2,
    sparks: 12000000,
    isVerified: true,
    coverImage: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=1000&auto=format&fit=crop&q=80',
    joinedDate: 'Joined June 2026',
    reputationPoints: 4100000,
    reputationBreakdown: {
      contributions: 5000000,
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
    following: 2,
    sparks: 18000000,
    isVerified: true,
    coverImage: 'https://images.unsplash.com/photo-1614064641938-3bbee52942c7?w=1000&auto=format&fit=crop&q=80',
    joinedDate: 'Joined June 2026',
    reputationPoints: 5200000,
    reputationBreakdown: {
      contributions: 7000000,
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
    content: 'Welcome to NEXORA — The World\\'s Living Social Network! Built with zero simulated trackers and 100% genuine database values. Drop a comment, share your latest music jams, or search for active local communities around you.',
    image: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop&q=80',
    tags: ['NEXORA', 'Welcome', 'Community', 'Authentic'],
    searchSuggestion: 'Welcome to Nexora',
    likes: 843,
    commentsCount: 2,
    shares: 124,
    timestamp: '2 hours ago',
    comments: [
      {
        id: 'c-1',
        postId: 'post-1',
        userId: 'creator-4',
        username: 'nexora_official',
        name: 'Nexora Official ✓',
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
  },
  {
    id: 'post-5',
    userId: 'voh_ai',
    username: 'voh_ai',
    name: 'VOH AI',
    avatar: 'https://images.unsplash.com/photo-1620712943543-bcc4688e7485?w=150&auto=format&fit=crop&q=80',
    isVerified: true,
    content: 'NEXORA Platform update. All system services are operating with peak performance, 1.8ms response latency, and secure data encryption. Listen to our latest system sound design log: 📡🎙️',
    voiceTranscript: 'System active. Diagnostic scans healthy. High-fidelity audio system stream initiated.',
    voiceAudioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
    isVoice: true,
    voiceDuration: 45,
    tags: ['SystemStatus', 'AI', 'SystemReport', 'Aesthetic'],
    likes: 89,
    commentsCount: 0,
    shares: 15,
    timestamp: '45 mins ago',
    comments: []
  },
  {
    id: 'post-6',
    userId: 'user-0',
    username: 'voh',
    name: 'VOICE OF HARRISON',
    avatar: '/src/assets/images/voh_logo_avatar_1781774114050.jpg',
    isVerified: true,
    content: 'Quick tactical review before the final. Who takes home the trophy this season? Vote below and drop your match breakdown! 🏟️🏆⚽',
    interactivePoll: {
      question: 'Champions League winner prediction:',
      options: [
        { id: 'opt-1', text: 'Real Madrid', votes: 782 },
        { id: 'opt-2', text: 'Manchester City', votes: 614 },
        { id: 'opt-3', text: 'Arsenal', votes: 245 },
        { id: 'opt-4', text: 'Dark Horse', votes: 98 }
      ]
    },
    tags: ['ChampionsLeague', 'Football', 'Tactics', 'MatchReview'],
    likes: 512,
    commentsCount: 1,
    shares: 84,
    timestamp: '3 hours ago',
    comments: [
      {
        id: 'c-6',
        postId: 'post-6',
        userId: 'creator-4',
        username: 'nexora_official',
        name: 'Nexora Official ✓',
        avatar: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150&auto=format&fit=crop&q=80',
        content: 'Man City is looking strong, but Real Madrid in the Champions League has custom European magic.',
        timestamp: '2 hours ago',
        likes: 122
      }
    ]
  }
];
`;
fs.writeFileSync('top_db.ts', str);
