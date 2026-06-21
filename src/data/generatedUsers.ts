import { User, Post } from '../types';

const FIRST_NAMES = [
  'David', 'Chioma', 'Liam', 'Marcus', 'Sofia', 'Fatima', 'Yuki', 'Sarah', 'Elena', 'Kofi',
  'Arjun', 'Nora', 'Dimitri', 'Zara', 'Chloe', 'Kwame', 'Diego', 'Nadia', 'Hannah', 'Alex',
  'Aisha', 'Carlos', 'Kenji', 'Grace', 'Omar', 'Priya', 'Sven', 'Amara', 'Malik', 'Claire',
  'John', 'Emily', 'Tariq', 'Faisal', 'Olumide', 'Adebayo', 'Chinelo', 'Emeka', 'Amadi', 'Ngozi'
];

const LAST_NAMES = [
  'Sterling', 'Vance', 'Rostova', 'Ahmed', 'Nkem', 'Bello', 'Dubois', 'Jenkins', 'Tanaka', 'Mendes',
  'Torres', 'Petrova', 'Boateng', 'Al-Mansoor', 'Mensah', 'Zahra', 'Cooper', 'Patel', 'Silva', 'Okafor',
  'Eze', 'Adebayo', 'Johnson', 'Smith', 'Olayinka', 'Martinez', 'Wang', 'Novak', 'Sato', 'Becker',
  'Thomas', 'Garcia', 'Ali', 'Gomez', 'Müller', 'Russo', 'Kahn', 'Nakamura', 'Adeoye', 'Onyekwere'
];

const BIOS = [
  "Passionate about building clean web apps and learning new frontend libraries. ☕️",
  "Huge football fan. Dedicated to supporting the Super Eagles and discussing tactical games.",
  "Visual storyteller. Love taking morning street photos and sharing urban aesthetics. 📸",
  "Self-taught software engineer. I write about React, TypeScript, and the developer journey.",
  "Just a music lover who enjoys exploring ambient pop and soundscapes.",
  "Product designer focused on simplicity, typography, and clean user experiences. 🎨",
  "Passionate about running, healthy meal preps, and building healthy daily habits.",
  "Building a small creator agency in public. Sharing the highs and lows.",
  "Content writer and avid reader. I love discussing books, psychology, and productivity.",
  "Just trying out new food recipes and documenting my breakfast experiments! 🍳"
];

const LOCATIONS = [
  "Lagos, Nigeria", "Berlin, Germany", "Tokyo, Japan", "London, UK", "New York, USA",
  "Dakar, Senegal", "Mumbai, India", "Paris, France", "Cape Town, South Africa", "Sydney, Australia",
  "Singapore", "Accra, Ghana", "Doha, Qatar", "Bogota, Colombia", "Prague, Czech Republic"
];

const AVATARS = [
  "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=150&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1554151228-14d9def656e4?w=150&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80"
];

const COVERS = [
  "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1000&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=1000&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1547394765-185e1e68f34e?w=1000&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=1000&auto=format&fit=crop&q=80"
];

const SKILL_POOLS = [
  ['UI Design', 'Figma', 'Typography'],
  ['Rust', 'WebAssembly', 'Go', 'Systems Tuning'],
  ['Data Science', 'Pandas', 'Python', 'Machine Learning'],
  ['IoT', 'Solidity', 'Hardware engineering', 'Smart Contracts'],
  ['Three.js', 'WebGL Shaders', 'Volumetric rendering'],
  ['Community Strategy', 'Content Writing', 'Football Tactics']
];

export function generateTestUsers(): User[] {
  const users: User[] = [];

  for (let i = 1; i <= 1000; i++) {
    const fnIndex = (i - 1) % FIRST_NAMES.length;
    const lnIndex = (i * 7 + 3) % LAST_NAMES.length;
    const bioIndex = (i * 13) % BIOS.length;
    const locIndex = (i * i + 17) % LOCATIONS.length;
    const avatarIndex = (i * 3) % AVATARS.length;
    const coverIndex = (i * 11) % COVERS.length;
    const skillIndex = i % SKILL_POOLS.length;

    const firstName = FIRST_NAMES[fnIndex];
    const lastName = LAST_NAMES[lnIndex];
    const name = `${firstName} ${lastName}`;
    
    // Suffix with i to ensure username is absolutely unique, meeting the primary constraint
    const username = `${firstName.toLowerCase()}_${lastName.toLowerCase()}_${i}`;

    users.push({
      id: `generated-user-${i}`,
      username,
      name,
      avatar: AVATARS[avatarIndex],
      bio: BIOS[bioIndex],
      location: LOCATIONS[locIndex],
      website: `nexora.ai/${username}`,
      followers: 0,
      following: 1, // Follows VOH by default
      isVerified: false, // all generated accounts start as standard unverified users
      coverImage: COVERS[coverIndex],
      joinedDate: 'Joined June 2026',
      reputationPoints: 100 + (i % 400),
      reputationBreakdown: {
        contributions: 20 + (i % 40),
        helpfulness: 40 + (i % 60),
        missionsCompleted: i % 4,
        skillsVerified: 40 + (i % 290)
      },
      interestDNA: {
        'Technology': 50 + (i % 45),
        'AI topics': 40 + (i % 55),
        'Community building': 40 + (i % 50)
      },
      skills: SKILL_POOLS[skillIndex]
    });
  }

  return users;
}

// Generates 50 highly organic, human-feeling posts with balanced, realistic engagement numbers.
export function generateExtraMockPosts(users: User[]): Post[] {
  const posts: Post[] = [];
  
  const POST_TEMPLATES: Array<{ content: string; image?: string; videoUrl?: string; tags: string[] }> = [
    {
      content: "Watching the highlights of yesterday's football match. Messi is just pure genius on the ball! Ronaldo fans are still debating but let's just appreciate greatness! ⚽🏆",
      image: "https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=800&auto=format&fit=crop&q=80",
      tags: ["Football", "Messi", "Ronaldo", "Gossip"]
    },
    {
      content: "Prepared some hot Nigerian Jollof rice with some sweet fried plantain (dodo) and grilled chicken this afternoon. No food in this world beats this! 😋🌶️🍗",
      image: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800&auto=format&fit=crop&q=80",
      tags: ["NaijaFood", "JollofRice", "SundayVibes", "Culinary"]
    },
    {
      content: "Wizkid’s new single has been on repeat all morning! The vibe is so calm and smooth, perfect for the weekend. Afrobeat to the world! 🦅👑🎶",
      image: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=800&auto=format&fit=crop&q=80",
      tags: ["Afrobeat", "WizkidFC", "GoodVibes", "MusicJams"]
    },
    {
      content: "Davido fans are celebrating today! His new album is breaking records everywhere. Unbelievable energy from the 30BG squad! 😈🔥🕺",
      image: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=800&auto=format&fit=crop&q=80",
      tags: ["Davido", "30BG", "NewAlbum", "NaijaMusic"]
    },
    {
      content: "Lagos traffic is something else today! But thank God for air conditioner and good playlist in the car. Staying positive no matter what! 🚗🚙☀️",
      image: "https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=800&auto=format&fit=crop&q=80",
      tags: ["LagosLife", "DailyHustle", "RoadTrip", "Vibes"]
    },
    {
      content: "Taking a nice evening stroll around the neighborhood. The sunset is so peaceful and beautiful. Grateful for simple days and good health. 🌅🚶‍♂️❤️",
      image: "https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=800&auto=format&fit=crop&q=80",
      tags: ["Sunset", "PeacefulMind", "Grateful", "Dailystroll"]
    },
    {
      content: "Who is watching the Champions League match tonight? My money is on Real Madrid but anything can happen in football. Let's discuss! ⚽🎧",
      image: "https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=800&auto=format&fit=crop&q=80",
      tags: ["ChampionsLeague", "Matchday", "FootballFans", "RealMadrid"]
    },
    {
      content: "Felt like eating something local today, so I got solid pounded yam with hot Egusi soup! The taste is heavenly. What are you guys having for lunch? 🥣😋",
      image: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800&auto=format&fit=crop&q=80",
      tags: ["LocalKitchen", "Egusi", "PoundedYam", "Foodie"]
    },
    {
      content: "Heading down to Port Harcourt this weekend to visit family. Can't wait to eat some fresh bole and fish! PH city, I am coming! ✈️🐟🌶️",
      image: "https://images.unsplash.com/photo-1542281286-9e0a16bb7366?w=800&auto=format&fit=crop&q=80",
      tags: ["TravelPH", "BoleAndFish", "FamilyTime", "Wanderlust"]
    },
    {
      content: "Burna Boy's performance yesterday was pure fire! He is truly the Giant of Africa. The stage presence is completely on another level! 🦍👑🔥",
      image: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600&auto=format&fit=crop&q=80",
      tags: ["BurnaBoy", "Odogwu", "LiveConcert", "Afrobeat"]
    }
  ];

  const COMMENT_POOL = [
    "This looks exceptionally high quality! Love the clean vibes.",
    "Completely agree! The performance optimizations must be massive.",
    "Stunning content here, thanks for sharing!",
    "Where did you get these parameters? Exceptional work.",
    "This is exactly what the social feed needed. Clear and readable.",
    "Incredible! I am trying this out with my local group tonight.",
    "The spacing and layout here is top-notch. Love it.",
    "This is beautiful. Simple, polished, and real!"
  ];

  const TIMES = [
    "3 hours ago", "5 hours ago", "Yesterday", "1 day ago", "2 days ago", "3 days ago", "4 days ago"
  ];

  // We loop to generate exactly 50 realistic posts
  for (let i = 1; i <= 50; i++) {
    // Select user deterministically to keep it reproducible but varied
    const user = users[i % users.length];
    const template = POST_TEMPLATES[i % POST_TEMPLATES.length];
    const time = TIMES[i % TIMES.length];
    
    // Sparks/likes: strictly realistic social numbers (no fake Millions)
    const sparksCount = 12 + ((i * 17) % 184); // 12 to 196 sparks
    const commentsCount = (i * 3) % 7; // 0 to 6 comments
    const sharesCount = (i * 2) % 35; // 0 to 34 shares
    
    // Generate actual comments
    const comments: any[] = [];
    for (let c = 0; c < commentsCount; c++) {
      const commenter = users[(i + c * 3 + 2) % users.length];
      comments.push({
        id: `gen-cmt-${i}-${c}`,
        postId: `gen-post-${i}`,
        userId: commenter.id,
        username: commenter.username,
        name: commenter.name,
        avatar: commenter.avatar,
        content: COMMENT_POOL[(i + c * 2) % COMMENT_POOL.length],
        timestamp: "30 mins ago",
        likes: (i + c * 11) % 45
      });
    }

    posts.push({
      id: `gen-post-${i}`,
      userId: user.id,
      username: user.username,
      name: user.name,
      avatar: user.avatar,
      isVerified: false, // only founder is true
      content: template.content,
      image: template.image,
      videoUrl: template.videoUrl,
      tags: template.tags,
      likes: sparksCount,
      commentsCount,
      shares: sharesCount,
      timestamp: time,
      comments
    });
  }

  return posts;
}
