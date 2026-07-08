const fs = require('fs');

const content = fs.readFileSync('src/data/database.ts', 'utf8');

const lines = content.split('\n');

const startIdx = lines.findIndex(l => l.includes('export const INITIAL_POSTS'));
const endIdx = lines.findIndex(l => l.includes('export const INITIAL_CHATS'));

if (startIdx !== -1 && endIdx !== -1) {
  const cleanPosts = `export const INITIAL_POSTS: Post[] = [
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

  const newContent = [
    ...lines.slice(0, startIdx),
    cleanPosts,
    ...lines.slice(endIdx)
  ].join('\\n');

  fs.writeFileSync('src/data/database.ts', newContent);
  console.log('Success');
}
