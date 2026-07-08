const fs = require('fs');
const content = fs.readFileSync('src/data/database.ts', 'utf8');

const prefix = `import { User, Post, SocialMission, Circle, Chat, Message, Notification } from '../types';

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

`;

fs.writeFileSync('src/data/database.ts', prefix + content);
console.log('Restored');
