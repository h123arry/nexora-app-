import { User, Post } from '../types';

const FIRST_NAMES = [
  'Sarah', 'Chioma', 'David', 'Yuki', 'Elena', 'Kofi', 'Alex', 'Amara', 'Marcus', 
  'Chloe', 'Tariq', 'Sofia', 'Raj', 'Aisha', 'Hiroshi', 'Luka', 'Zoe', 'Liam',
  'Fatima', 'Bisi', 'Emeka', 'Ngozi', 'Babajide', 'Femi', 'Tunde', 'Ade', 'Funmi'
];

const LAST_NAMES = [
  'Codes', 'Sterling', 'Vance', 'Diallo', 'Chen', 'Hassan', 'Smith', 'Santos', 
  'Murakami', 'Okonjo', 'Patel', 'Silva', 'Petrov', 'Okafor', 'Adeleke', 'Balogun',
  'Alabi', 'Faro', 'Adebayo', 'Sanni', 'Nwosu', 'Damilola', 'Olatunji', 'Suleiman'
];

const BIOS = [
  'Building responsive UI frameworks and music synthesizers',
  'Premier league tactical reviews and football analytics ⚽',
  'Discovering local food spots, lagos grills, and everyday stories',
  'Co-building design systems with high-contrast ambient layers',
  'Afrobeat DJ enthusiast. Synthesizer designer and prompt engineer',
  'Web developer building clean, lightweight, future-proof interfaces',
  'Always sharing movie trends, tech tips, and design ideas',
  'Exploring local communities and joining tactical sports matches',
  'Offline-first and database integrity are the absolute vibe!',
  'Co-shaping future living systems and digital ecosystems'
];

const LOCATIONS = [
  'Lagos, Nigeria', 'Port Harcourt, Nigeria', 'Abuja, Nigeria', 
  'Copenhagen, Denmark', 'Austin, Texas', 'London, UK', 
  'Tokyo, Japan', 'Berlin, Germany', 'Nairobi, Kenya', 'Accra, Ghana'
];

// Seeded/deterministic avatar photos of people to keep the design highly premium and lively
const AVATAR_PICS = [
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80', // Female
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80', // Male
  'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&auto=format&fit=crop&q=80', // Female
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80', // Male
  'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80', // Female
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80', // Female
  'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150&auto=format&fit=crop&q=80', // Male
  'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80', // Female
  'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=150&auto=format&fit=crop&q=80', // Male
  'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150&auto=format&fit=crop&q=80'  // Male
];

export function generateTestUsers(): User[] {
  const users: User[] = [];

  for (let i = 1; i <= 1000; i++) {
    const fn = FIRST_NAMES[i % FIRST_NAMES.length];
    const ln = LAST_NAMES[(i * 3) % LAST_NAMES.length];
    const name = `${fn} ${ln}`;
    const username = `${fn.toLowerCase()}_${ln.toLowerCase()}_${i}`;
    const avatar = AVATAR_PICS[i % AVATAR_PICS.length];
    const bio = BIOS[(i * 7) % BIOS.length];
    const location = LOCATIONS[i % LOCATIONS.length];
    const website = `nexora.ai/member/${username}`;

    const followers = Math.floor((1003 * i + 4821) % 9500);
    const following = Math.floor((31 * i + 83) % 250);
    const reputationPoints = followers * 10 + following * 2 + (i % 50) * 1000;

    users.push({
      id: `test-${i}`,
      username,
      name,
      avatar,
      bio,
      location,
      website,
      followers,
      following,
      reputationPoints,
      isVerified: i % 25 === 0, // 4% verification speed
      coverImage: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1000&auto=format&fit=crop&q=80',
      joinedDate: 'Joined June 2026',
      email: `${username}@nexora.com`,
      role: 'user',
      reputationBreakdown: {
        contributions: Math.floor(reputationPoints * 0.35),
        helpfulness: Math.floor(reputationPoints * 0.40),
        missionsCompleted: Math.floor((i * 13) % 45),
        skillsVerified: Math.floor(reputationPoints * 0.25)
      },
      interestDNA: {
        'Football': 50 + (i % 45),
        'Music Jams': 60 + ((i * 3) % 35),
        'Local Stories': 40 + ((i * 5) % 55)
      },
      skills: ['Co-building', 'Community Support', 'Interactive Feedback']
    });
  }

  return users;
}

export function generateExtraMockPosts(users: User[]): Post[] {
  const posts: Post[] = [];
  const topics = [
    "Just checked the Premier League schedule. Let's co-build a match day analysis widget!",
    "Lekki design circles are looking so beautiful today. Who is around?",
    "Enjoying a massive bowl of jollof rice while tuning my new audio synthesis model. Pure bliss. 🥣⚡🎧",
    "Offline sync performance in this app is so quick. Love how snappy custom UI feels.",
    "Wizkid or Davido for morning drive inspiration? I'm leaning heavily towards wizzy today!",
    "Can someone recommend a great helper script for CSS responsive mesh layouts?"
  ];

  // Generate 12 premium posts deterministically from our first 12 test users
  for (let i = 0; i < 12; i++) {
    const user = users[i];
    if (!user) continue;

    const content = topics[i % topics.length];
    posts.push({
      id: `generated-post-${i + 1}`,
      userId: user.id,
      username: user.username,
      name: user.name,
      avatar: user.avatar,
      isVerified: user.isVerified,
      content,
      likes: Math.floor((i * 342 + 918) % 1500),
      commentsCount: 0,
      shares: Math.floor((i * 47 + 52) % 350),
      timestamp: `${i + 1} hours ago`,
      comments: [],
      tags: ['NEXORA', 'Community', 'Discussion']
    });
  }

  return posts;
}
