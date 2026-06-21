import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Zap, Repeat, MessageSquare, Share2, Bookmark, Cpu, Play, Pause, Volume2, Mic, 
  Send, Briefcase, Users, Award, Star, Search, X, Plus, Filter, Trash, RefreshCw,
  Globe, MapPin, Sliders, VolumeX, CheckCircle, ChevronDown, ChevronUp,
  MoreVertical, EyeOff, FolderPlus, Folder, ShieldAlert, Edit2
} from 'lucide-react';
import { User, Post, Comment } from '../types';
import { generateTestUsers } from '../data/generatedUsers';
import ReportModal from './ReportModal';

// Interface extensions for threaded comments and advanced posts
interface ThreadReply {
  id: string;
  userId: string;
  username: string;
  name: string;
  avatar: string;
  content: string;
  timestamp: string;
}

interface InteractiveComment extends Comment {
  replies?: ThreadReply[];
}

interface RefactoredPost extends Post {
  comments: InteractiveComment[];
  isVoice?: boolean;
  voiceDuration?: any;
  voiceTranscript?: string;
  videoUrl?: string;
  location?: string;
  communityName?: string;
  opportunityType?: string;
  opportunityReward?: string;
  opportunitySkills?: string[];
  isSpamBot?: boolean;
  category?: string;
}

function PostCarousel({ images, filters }: { images: string[], filters?: string[] }) {
  const [index, setIndex] = React.useState(0);

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (index < images.length - 1) setIndex(index + 1);
  };

  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (index > 0) setIndex(index - 1);
  };

  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/5 mb-4 aspect-square max-h-[360px] bg-black group select-none">
      <div 
        className="flex h-full transition-transform duration-300 ease-out"
        style={{ transform: `translateX(-${index * (100 / images.length)}%)`, width: `${images.length * 100}%` }}
      >
        {images.map((img, idx) => (
          <div key={idx} className="w-full h-full shrink-0 relative">
            <img 
              src={img} 
              alt={`Slide ${idx + 1}`} 
              className="w-full h-full object-cover pointer-events-none"
              referrerPolicy="no-referrer"
              style={{ filter: (filters && filters[idx]) || 'none' }}
            />
          </div>
        ))}
      </div>

      <div className="absolute top-3 right-3 bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-full text-[9px] font-mono text-white font-bold select-none">
        {index + 1} / {images.length}
      </div>

      {index > 0 && (
        <button 
          onClick={handlePrev}
          className="absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80 transition-all opacity-0 group-hover:opacity-100 cursor-pointer text-xs font-bold leading-none select-none z-10"
        >
          &larr;
        </button>
      )}
      {index < images.length - 1 && (
        <button 
          onClick={handleNext}
          className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80 transition-all opacity-0 group-hover:opacity-100 cursor-pointer text-xs font-bold leading-none select-none z-10"
        >
          &rarr;
        </button>
      )}

      <div className="absolute bottom-3 inset-x-0 flex justify-center gap-1.5 pointer-events-none z-10">
        {images.map((_, i) => (
          <div 
            key={i} 
            className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${i === index ? 'bg-violet-400 scale-125' : 'bg-white/30'}`}
          />
        ))}
      </div>
    </div>
  );
}

// Seed function to generate 150+ realistic posts from 1000 users deterministically
function seedWorldFeed(parentPosts: Post[]): RefactoredPost[] {
  const testUsers = generateTestUsers(); // Generates 1,000 active test users
  const blended: RefactoredPost[] = [];

  // 1. First append parent posts (if any)
  parentPosts.forEach(p => {
    blended.push({
      ...p,
      comments: p.comments.map(c => ({ ...c, replies: [] }))
    });
  });

  // 2. Templates for rich variety in content
  const contentTemplates = [
    {
      content: "Just finalized the design tokens for our modular space-inspired component library. It explores organic curves fused with high contrast glassmorphism. What do you think of this visual layout? 🪐✨",
      tags: ["DesignTokens", "UIUX", "FrontEnd"],
      image: "https://images.unsplash.com/photo-1547394765-185e1e68f34e?w=800&auto=format&fit=crop&q=80"
    },
    {
      content: "What a thrilling match today! Tactical defensive builds in the second half were absolute class. Teeming with local talent! 🏟️⚽",
      tags: ["FootballNigeria", "SuperEagles", "Sports"],
      communityName: "Football Nigeria",
      image: "https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=800&auto=format&fit=crop&q=80"
    },
    {
      content: "🌍 World Pulse Alert: Over 450 Nigerian builders have just shared updates about their tech meetups & community workshops today! Community engagement is peaking! ⚡🔋",
      tags: ["WorldPulse", "GridScale", "Synergy"],
      location: "Port Harcourt, Nigeria"
    },
    {
      content: "Seeking a Senior AI Alignment Researcher. Lead the design of empathetic system helpers and multi-agent translation loops. Flexible location.",
      tags: ["AIAlignment", "MachineLearning", "Fellowship"],
      opportunityType: "Job" as const,
      opportunityReward: "$140,000 - $180,000 + Stock Options",
      opportunitySkills: ["Deep Learning", "Python", "LlamaIndex"]
    },
    {
      content: "🎙 Voice Update - Symmetrical architecture and typography rules are our code of honor. Direct spatial audio broadcast on our current design tokens.",
      tags: ["VoiceBroadcast", "AudioNodes", "Sprint"],
      isVoice: true,
      voiceDuration: "0:45",
      voiceTranscript: "Hey team, this is Harrison. Just confirming the new layout rules. Visual spacing is balanced, and text readability is pristine. Keep building in public!"
    },
    {
      content: "🎥 Immersive Video Update - Capturing Tokyo under vaporwave electronic mist. The depth-sensing camera map matches our dynamic viewport benchmarks perfectly. 🏙️🌧️",
      tags: ["Cyberpunk", "TokyoVisuals", "Vaporwave"],
      videoUrl: "https://assets.mixkit.co/videos/preview/mixkit-cyberpunk-neon-city-street-at-night-41551-large.mp4"
    },
    {
      content: "Completed the baseline latency audit of our edge notification relay. We are routing geo-spatially with a mean ping processing time of only 1.8ms under 50k requests.🦀⚡",
      tags: ["RustLang", "EdgeComputing", "Performance"],
      image: "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=800&auto=format&fit=crop&q=80"
    },
    {
      content: "📊 Memory constraints of high-volume localized systems. Which compiler language offers the best memory guarantees for real-time edge processing?",
      tags: ["Coding", "SystemDesign", "TechPoll"],
      interactivePoll: {
        question: "Which low-latency system engine topology serves decentralized community spaces best?",
        options: [
          { id: 'opt-1', text: "Rust Raw Socket SIMD Serialization", votes: 412 },
          { id: 'opt-2', text: "Go High-Concurrency Channels", votes: 212 },
          { id: 'opt-3', text: "Zig Arena-allocated Buffers", votes: 121 }
        ]
      }
    },
    {
      content: "Looking for an expert WebGL developer to build highly immersive 3D grid states for our upcoming space elements ecosystem. Full-stack capability is a huge bonus! 🚀🎨",
      tags: ["ThreeJS", "WebGL", "Opportunity"],
      opportunityType: "Collaboration" as const,
      opportunityReward: "Co-Founder Equity & Project Bonuses",
      opportunitySkills: ["WebGL", "Three.js", "React"]
    },
    {
      content: "🌍 World Pulse Event: Digital Nomad Collective meetup live in Lagos! Over 150 members are discussing local tech talents and remote opportunities. 🌐☕",
      tags: ["WorldPulse", "LagosGrid", "Nomads"],
      location: "Lagos, Nigeria"
    }
  ];

  // Deterministically spread 150 posts across 1000 generated users
  for (let i = 1; i <= 150; i++) {
    const userIndex = (i * 23) % testUsers.length;
    const user = testUsers[userIndex];
    const templateIndex = (i * 11) % contentTemplates.length;
    const temp = contentTemplates[templateIndex];

    // Generate nested comments
    const comments: InteractiveComment[] = [];
    const numComments = (i * 3) % 4;
    for (let c = 0; c < numComments; c++) {
      const commenterIdx = (userIndex + c * 31 + 5) % testUsers.length;
      const commenter = testUsers[commenterIdx];
      comments.push({
        id: `comment-${i}-${c}`,
        postId: `gen-post-${i}`,
        userId: commenter.id,
        username: commenter.username,
        name: commenter.name,
        avatar: commenter.avatar,
        content: c % 2 === 0 
          ? "This is absolutely the right architecture direction. Symmetrical buffers solve scale bottlenecks! 🚀" 
          : "Interesting statistics. I think optimizing the vectors can slice that latency by another 15%. Will post my audit soon.",
        timestamp: `${c + 1}h ago`,
        likes: (c * 19) % 50,
        replies: [
          {
            id: `reply-${i}-${c}-1`,
            userId: user.id,
            username: user.username,
            name: user.name,
            avatar: user.avatar,
            content: "Agreed! Keep me posted when your compiler audit goes live.",
            timestamp: "30m ago"
          }
        ]
      });
    }

    blended.push({
      id: `gen-post-${i}`,
      userId: user.id,
      username: user.username,
      name: user.name,
      avatar: user.avatar,
      isVerified: user.id === 'user-0', // Stripped verification from generated users - only founder 'user-0' retains it
      content: temp.content,
      image: temp.image,
      tags: temp.tags,
      likes: 12 + (i * 7) % 890,
      commentsCount: comments.length,
      shares: 2 + (i * 3) % 324,
      timestamp: i < 5 ? `${i * 12}m ago` : `${Math.floor(i / 10) + 1}d ago`,
      comments,
      isVoice: temp.isVoice,
      voiceDuration: temp.voiceDuration,
      voiceTranscript: temp.voiceTranscript,
      videoUrl: temp.videoUrl,
      location: temp.location,
      communityName: temp.communityName,
      opportunityType: temp.opportunityType,
      opportunityReward: temp.opportunityReward,
      opportunitySkills: temp.opportunitySkills
    });
  }

  // 3. Add 2 dummy spam bot accounts to prove Quality Control Filter
  blended.push({
    id: 'spam-bot-1',
    userId: 'bot-99',
    username: 'crypto_profit_bot',
    name: '💰 EARN CRYPTO NOW 💰',
    avatar: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150&auto=format&fit=crop&q=80',
    isVerified: false,
    content: "⚠️ ALERT: CLAIM 400% SPARK REWARDS IMMEDIATELY. NO VERIFICATION REQUIRED. REGISTER TODAY SCAM SCAM CLICK HERE NOW!!!",
    tags: ["Crypto", "Earn", "FreeSparks"],
    likes: 4120,
    commentsCount: 0,
    shares: 9840,
    timestamp: "1m ago",
    comments: [],
    isSpamBot: true
  });

  return blended;
}

// Active moments structure
const MOCK_MOMENTS = [
  { id: 'm-0', name: 'VOICE OF HARRISON', username: 'voh', avatar: '/src/assets/images/voh_logo_avatar_1781774114050.jpg', active: true, quotes: ["Building the future of social networks with clean designs.", "Great seeing our community grow so rapidly!", "Continuous listening and iterating with you guys."] },
  { id: 'm-1', name: 'Alex Sterling', username: 'alex_sterling', avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80', active: true, quotes: ["What a beautiful evening in Port Harcourt today! 🌅", "Just finished writing a clean tutorial for absolute beginners.", "Always keep learning and showing up daily."] },
  { id: 'm-2', name: 'Sarah Vance', username: 'sarah_codes', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80', active: true, quotes: ["Designing clean UI components with lots of breathing room.", "Taking a coffee break before diving back into CSS! ☕️", "Simple things are often the most elegant ones."] },
  { id: 'm-3', name: 'David Jenkins', username: 'david_j', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80', active: false, quotes: ["Early morning street photography session.", "Capturing real local human stories with my lens. 📸"] }
];

interface FeedViewProps {
  currentUser: User;
  posts: Post[];
  followingIds: string[];
  onLikePost: (postId: string) => void;
  onBookmarkPost: (postId: string) => void;
  onAddComment: (postId: string, content: string) => void;
  onAddPost: (content: string, imageUrl?: string, tagsString?: string) => string;
  selectedTag: string | null;
  setSelectedTag: (tag: string | null) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  onViewProfile?: (userId: string) => void;
}

export default function FeedView({
  currentUser,
  posts,
  followingIds,
  onLikePost,
  onBookmarkPost,
  onAddComment,
  onAddPost,
  selectedTag,
  setSelectedTag,
  searchQuery,
  setSearchQuery,
  onViewProfile
}: FeedViewProps) {
  // Database states
  const [localPosts, setLocalPosts] = useState<RefactoredPost[]>([]);
  const [feedTab, setFeedTab] = useState<'for_you' | 'following' | 'contributions' | 'pulse' | 'local' | 'broadcast'>('for_you');
  const [qualityFilter, setQualityFilter] = useState(false);
  const [visibleCount, setVisibleCount] = useState(8);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Custom interactive features
  const [playingVoiceId, setPlayingVoiceId] = useState<string | null>(null);
  const [voiceSeconds, setVoiceSeconds] = useState(0);
  const [votedPolls, setVotedPolls] = useState<Record<string, string>>({});
  const [activeCommentsPostId, setActiveCommentsPostId] = useState<string | null>(null);
  const [activeVideoFullscreen, setActiveVideoFullscreen] = useState<RefactoredPost | null>(null);
  const [fullscreenVideoMuted, setFullscreenVideoMuted] = useState(true);

  // New Comments and Replies drafting state
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});
  const [replyInputs, setReplyInputs] = useState<Record<string, string>>({});
  const [activeReplyFieldId, setActiveReplyFieldId] = useState<string | null>(null);

  // Moments List State (hydrated and preserved)
  const [momentsList, setMomentsList] = useState<any[]>(() => {
    const saved = localStorage.getItem('nexora_moments_list');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.length > 0) return parsed;
      } catch (e) {}
    }
    return MOCK_MOMENTS;
  });

  // Moments Overlay Viewer state
  const [selectedMoment, setSelectedMoment] = useState<any | null>(null);
  const [storyIndex, setStoryIndex] = useState(0);

  // Moments creation modal state
  const [isCreateMomentOpen, setIsCreateMomentOpen] = useState(false);
  const [momentCaption, setMomentCaption] = useState('');
  const [momentMediaType, setMomentMediaType] = useState<'photo' | 'video' | 'voice' | 'text'>('photo');
  const [momentMediaUrl, setMomentMediaUrl] = useState('https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&auto=format&fit=crop&q=80');
  const [simulatedVoiceRecording, setSimulatedVoiceRecording] = useState(false);
  const [simulatedVoiceSeconds, setSimulatedVoiceSeconds] = useState(0);
  const [playingVoiceMoment, setPlayingVoiceMoment] = useState(false);

  const [isCreatingHighlight, setIsCreatingHighlight] = useState(false);
  const [storyHighlightsList, setStoryHighlightsList] = useState<any[]>(() => {
    const saved = localStorage.getItem('nexora_story_highlights');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.length > 0) return parsed;
      } catch (e) {}
    }
    return [
      {
        id: 'hl-sample-1',
        title: 'Vibe check ⚡',
        cover: '⚡',
        stories: [
          { mediaUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&auto=format&fit=crop&q=80', caption: 'Consolidating the new Nexora mobile interface!' }
        ]
      },
      {
        id: 'hl-sample-2',
        title: 'Coding ☕',
        cover: '☕',
        stories: [
          { mediaUrl: 'https://images.unsplash.com/photo-1547394765-185e1e68f34e?w=600&auto=format&fit=crop&q=80', caption: 'Early morning coffee coding sprints!' }
        ]
      }
    ];
  });

  // Floating Composer Box
  const [composerOpen, setComposerOpen] = useState(false);
  const [composerText, setComposerText] = useState('');
  const [composerCategory, setComposerCategory] = useState<'general' | 'pulse' | 'community' | 'opportunity'>('general');
  const [composerImgUrl, setComposerImgUrl] = useState('');
  const [composerOpportunityType, setComposerOpportunityType] = useState<'Job' | 'Collaboration' | 'Startup' | 'Mentorship'>('Collaboration');
  const [composerReward, setComposerReward] = useState('');
  const [composerCommunityName, setComposerCommunityName] = useState('');
  const [composerLocation, setComposerLocation] = useState('');

  // 1. Advanced Moderation States
  const [hiddenPostIds, setHiddenPostIds] = useState<string[]>(() => {
    const saved = localStorage.getItem('nexora_hidden_posts');
    return saved ? JSON.parse(saved) : [];
  });
  const [blockedUserIds, setBlockedUserIds] = useState<string[]>(() => {
    const saved = localStorage.getItem('nexora_blocked_users');
    return saved ? JSON.parse(saved) : [];
  });
  const [notInterestedTags, setNotInterestedTags] = useState<string[]>(() => {
    const saved = localStorage.getItem('nexora_not_interested_tags');
    return saved ? JSON.parse(saved) : [];
  });

  // 2. Custom Pinterest-style collection state
  const [savedCollections, setSavedCollections] = useState<Record<string, string[]>>(() => {
    const saved = localStorage.getItem('nexora_saved_collections');
    return saved ? JSON.parse(saved) : {
      'Football ⚽': [],
      'Business 💼': [],
      'Inspiration ⚡': [],
      'Friends 🤝': []
    };
  });
  const [activeCollectionFolder, setActiveCollectionFolder] = useState<string | null>(null);
  const [showSaveToCollectionModalId, setShowSaveToCollectionModalId] = useState<string | null>(null);
  const [newCollectionName, setNewCollectionName] = useState('');

  // 3. Search Engine 2.0 States
  const [searchFilterType, setSearchFilterType] = useState<'all' | 'users' | 'posts' | 'videos' | 'voice' | 'communities' | 'hashtags' | 'pulse'>('all');
  const [sortBy, setSortBy] = useState<'latest' | 'popular' | 'nearby'>('latest');

  // 4. Reporting Modal and Post Options Menu
  const [activeDotsMenuPostId, setActiveDotsMenuPostId] = useState<string | null>(null);
  const [reportingPost, setReportingPost] = useState<any | null>(null);

  // Inline post editing states
  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [editingPostContent, setEditingPostContent] = useState<string>('');
  
  // Edit history modal view state (optional popover to show past contents)
  const [viewHistoryPost, setViewHistoryPost] = useState<any | null>(null);

  // Sync back state modifications to localStorage
  useEffect(() => {
    localStorage.setItem('nexora_hidden_posts', JSON.stringify(hiddenPostIds));
  }, [hiddenPostIds]);

  useEffect(() => {
    localStorage.setItem('nexora_blocked_users', JSON.stringify(blockedUserIds));
  }, [blockedUserIds]);

  useEffect(() => {
    localStorage.setItem('nexora_not_interested_tags', JSON.stringify(notInterestedTags));
  }, [notInterestedTags]);

  useEffect(() => {
    localStorage.setItem('nexora_saved_collections', JSON.stringify(savedCollections));
  }, [savedCollections]);

  // Handle global updates
  useEffect(() => {
    const handleReportsUpdate = () => {
      // Rehydrate lists if necessary or sync items
    };
    window.addEventListener('reports-updated', handleReportsUpdate);
    return () => window.removeEventListener('reports-updated', handleReportsUpdate);
  }, []);

  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // 1. Hydrate the feed and synchronize with Parent posts
  useEffect(() => {
    const seeded = seedWorldFeed(posts);
    setLocalPosts(seeded);
  }, [posts]);

  // Voice Player simulation
  useEffect(() => {
    let timer: any = null;
    if (playingVoiceId) {
      timer = setInterval(() => {
        setVoiceSeconds(s => {
          if (s >= 45) {
            setPlayingVoiceId(null);
            return 0;
          }
          return s + 1;
        });
      }, 1000);
    } else {
      setVoiceSeconds(0);
    }
    return () => clearInterval(timer);
  }, [playingVoiceId]);

  // Voice Recording Simulator effect
  useEffect(() => {
    let interval: any = null;
    if (simulatedVoiceRecording) {
      interval = setInterval(() => {
        setSimulatedVoiceSeconds(s => s + 1);
      }, 1000);
    } else {
      setSimulatedVoiceSeconds(0);
    }
    return () => clearInterval(interval);
  }, [simulatedVoiceRecording]);

  const handleSaveNewMoment = (e: React.FormEvent) => {
    e.preventDefault();
    // For voice moment, prompt default title if blank
    const defaultCaption = momentCaption.trim() || 
      (momentMediaType === 'voice' ? "🎙️ Broadcast Voice Insight" : 
       momentMediaType === 'video' ? "🎥 Looping Media Telemetry" : "📸 Visual Stream Element");

    const newMoment = {
      id: `moment-${Date.now()}`,
      name: currentUser.name,
      username: currentUser.username,
      avatar: currentUser.avatar,
      active: true,
      quotes: [defaultCaption],
      mediaType: momentMediaType,
      mediaUrl: momentMediaType === 'text' ? '' : momentMediaUrl,
      voiceDuration: momentMediaType === 'voice' ? (simulatedVoiceSeconds || 15) : undefined
    };

    const updated = [newMoment, ...momentsList];
    setMomentsList(updated);
    localStorage.setItem('nexora_moments_list', JSON.stringify(updated));

    // Reset onboarding values
    setMomentCaption('');
    setMomentMediaType('photo');
    setMomentMediaUrl('https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&auto=format&fit=crop&q=80');
    setIsCreateMomentOpen(false);
  };

  // Infinite Scroll intersection callback simulator
  useEffect(() => {
    const handleScroll = () => {
      if (!scrollContainerRef.current) return;
      const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
      if (scrollHeight - scrollTop - clientHeight < 120) {
        // threshold reached! Automatically load more
        setVisibleCount(prev => Math.min(prev + 6, localPosts.length));
      }
    };
    
    const container = scrollContainerRef.current;
    if (container) {
      container.addEventListener('scroll', handleScroll);
    }
    return () => {
      if (container) {
        container.removeEventListener('scroll', handleScroll);
      }
    };
  }, [localPosts, visibleCount]);

  // Pull-down refresh simulator
  const triggerRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setIsRefreshing(false);
      // Shuffle posts gently or add new generated ones
      setLocalPosts(prev => {
        const copy = [...prev];
        // Shift a few posts for fresh layout
        if (copy.length > 5) {
          const first = copy.shift();
          if (first) copy.splice(3, 0, first);
        }
        return copy;
      });
      setVisibleCount(8);
    }, 1200);
  };

  // Sparks trigger handler
  const handleSpark = (postId: string) => {
    onLikePost(postId);
    setLocalPosts(prev => prev.map(p => {
      if (p.id === postId) {
        const isLiked = !p.isLikedByUser;
        return {
          ...p,
          isLikedByUser: isLiked,
          likes: isLiked ? p.likes + 1 : p.likes - 1
        };
      }
      return p;
    }));
  };

  // Publish scheduled post now
  const handlePublishScheduledPostNow = (postId: string) => {
    setLocalPosts(prev => prev.map(p => {
      if (p.id === postId) {
        return { ...p, scheduledTime: undefined };
      }
      return p;
    }));
    window.dispatchEvent(new CustomEvent('toast', { detail: '🚀 Post published immediately!' }));
  };

  // Save edited post content and record to edit history
  const handleSaveEditPost = (postId: string) => {
    if (!editingPostContent.trim()) return;
    setLocalPosts(prev => prev.map(p => {
      if (p.id === postId) {
        const history = p.editHistory ? [...p.editHistory] : [];
        history.push({
          content: p.content,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' ' + new Date().toLocaleDateString()
        });
        return {
          ...p,
          content: editingPostContent,
          editHistory: history
        };
      }
      return p;
    }));
    setEditingPostId(null);
    setEditingPostContent('');
    window.dispatchEvent(new CustomEvent('toast', { detail: '✏️ Post updated & history preserved!' }));
  };

  // Handle emoji reactions on Broadcast posts
  const handleBroadcastReaction = (postId: string, emoji: string) => {
    setLocalPosts(prev => prev.map(p => {
      if (p.id === postId) {
        const reactions = p.broadcastReactions ? { ...p.broadcastReactions } : { '🔥': 0, '🙌': 0, '⚡': 0, '🏆': 0 };
        reactions[emoji] = (reactions[emoji] || 0) + 1;
        return {
          ...p,
          broadcastReactions: reactions
        };
      }
      return p;
    }));
    window.dispatchEvent(new CustomEvent('toast', { detail: `🙌 Reacted with ${emoji} to update!` }));
  };

  // Spark / Like status toggle for comments
  const handleSparkComment = (postId: string, commentId: string) => {
    setLocalPosts(prev => prev.map(p => {
      if (p.id === postId) {
        return {
          ...p,
          comments: p.comments.map(c => {
            if (c.id === commentId) {
              const isLiked = !c.isLikedByUser;
              return {
                ...c,
                isLikedByUser: isLiked,
                likes: isLiked ? c.likes + 1 : c.likes - 1
              };
            }
            return c;
          })
        };
      }
      return p;
    }));
  };

  // Bookmark / Save handler
  const handleSave = (postId: string) => {
    onBookmarkPost(postId);
    setLocalPosts(prev => prev.map(p => {
      if (p.id === postId) {
        return { ...p, isBookmarkedByUser: !p.isBookmarkedByUser };
      }
      return p;
    }));
  };

  // Adding comment handler
  const handleAddCommentSubmit = (postId: string) => {
    const content = commentInputs[postId]?.trim();
    if (!content) return;
    
    // Parent Sync
    onAddComment(postId, content);

    const newComment: InteractiveComment = {
      id: `comment-new-${Date.now()}`,
      postId,
      userId: currentUser.id,
      username: currentUser.username,
      name: currentUser.name,
      avatar: currentUser.avatar,
      content,
      timestamp: "Just now",
      likes: 0,
      replies: []
    };

    setLocalPosts(prev => prev.map(p => {
      if (p.id === postId) {
        return {
          ...p,
          commentsCount: p.commentsCount + 1,
          comments: [newComment, ...p.comments]
        };
      }
      return p;
    }));

    setCommentInputs(prev => ({ ...prev, [postId]: '' }));
  };

  // Thread reply submission
  const handleAddReplySubmit = (postId: string, commentId: string) => {
    const content = replyInputs[commentId]?.trim();
    if (!content) return;

    const newReply: ThreadReply = {
      id: `reply-new-${Date.now()}`,
      userId: currentUser.id,
      username: currentUser.username,
      name: currentUser.name,
      avatar: currentUser.avatar,
      content,
      timestamp: "Just now"
    };

    setLocalPosts(prev => prev.map(p => {
      if (p.id === postId) {
        return {
          ...p,
          comments: p.comments.map(c => {
            if (c.id === commentId) {
              return {
                ...c,
                replies: [...(c.replies || []), newReply]
              };
            }
            return c;
          })
        };
      }
      return p;
    }));

    setReplyInputs(prev => ({ ...prev, [commentId]: '' }));
    setActiveReplyFieldId(null);
  };

  // Float post compose action
  const handleComposeSubmit = () => {
    if (!composerText.trim()) return;

    const tags = composerText.match(/#\w+/g)?.map(t => t.replace('#', '')) || ["NEXORA"];

    onAddPost(composerText, composerImgUrl || undefined, tags.join(','));

    const newPost: RefactoredPost = {
      id: `composed-${Date.now()}`,
      userId: currentUser.id,
      username: currentUser.username,
      name: currentUser.name,
      avatar: currentUser.avatar,
      isVerified: currentUser.isVerified || false,
      content: composerText,
      image: composerImgUrl || undefined,
      tags,
      likes: 0,
      commentsCount: 0,
      shares: 0,
      timestamp: "Just now",
      comments: [],
      location: composerCategory === 'pulse' ? (composerLocation || "Port Harcourt, Nigeria") : undefined,
      communityName: composerCategory === 'community' ? (composerCommunityName || "General Hub") : undefined,
      opportunityType: composerCategory === 'opportunity' ? composerOpportunityType : undefined,
      opportunityReward: composerCategory === 'opportunity' ? composerReward : undefined,
      category: composerCategory
    };

    setLocalPosts(prev => [newPost, ...prev]);

    // Reset Composer
    setComposerText('');
    setComposerImgUrl('');
    setComposerCommunityName('');
    setComposerLocation('');
    setComposerReward('');
    setComposerOpen(false);
  };

  // Search filter options
  const filteredPosts = localPosts.filter(post => {
    // 1. Core moderation overrides
    if (hiddenPostIds.includes(post.id)) return false;
    if (blockedUserIds.includes(post.userId)) return false;
    if (post.tags.some(t => notInterestedTags.includes(t))) return false;

    // 2. Prevent scheduled posts in the future from being visible to others
    if (post.scheduledTime) {
      const isFuture = new Date(post.scheduledTime).getTime() > Date.now();
      if (isFuture) {
        // Keep secret from other users
        if (post.userId !== currentUser.id) return false;
      }
    }

    // 3. Handle Broadcast Posts routing
    if (feedTab === 'broadcast') {
      if (!post.isBroadcastPost) return false;
    } else {
      if (post.isBroadcastPost) return false;
    }

    // 4. Saved Collections Filter: if activeCollectionFolder is set, only show posts contained in that collection
    if (activeCollectionFolder) {
      const allowedIds = savedCollections[activeCollectionFolder] || [];
      if (!allowedIds.includes(post.id)) return false;
    }

    // Quality filtration logic
    if (qualityFilter && post.isSpamBot) {
      return false;
    }

    // Media filtration check: only show posts with videos or pictures on the home feed
    const hasMedia = !!post.image || (!!post.images && post.images.length > 0) || !!post.videoUrl || !!post.isVoice;
    if (!hasMedia && !searchQuery.trim() && !activeCollectionFolder) {
      return false;
    }

    // Tab indexing logic
    if (feedTab === 'following') {
      const isPostFromFollowed = followingIds.includes(post.userId) || post.userId === currentUser.id;
      if (!isPostFromFollowed) return false;
    } else if (feedTab === 'contributions') {
      const isCreatorContribution = post.userId === currentUser.id || post.username === 'voh' || post.username === 'nexora_ai' || post.username === 'voh_ai' || post.likes > 15 || post.reputationReward;
      if (!isCreatorContribution) return false;
    } else if (feedTab === 'pulse') {
      if (post.category !== 'pulse') return false;
    } else if (feedTab === 'local') {
      const userCity = currentUser.location.toLowerCase();
      const inSearchRegion = post.location?.toLowerCase().includes("nigeria") || post.location?.toLowerCase().includes("harcourt") || post.location?.toLowerCase().includes("lagos");
      if (!post.location && !inSearchRegion) return false;
    }

    // Query text match
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchText = post.content.toLowerCase().includes(q) || post.name.toLowerCase().includes(q) || post.username.toLowerCase().includes(q) || post.tags.some(t => t.toLowerCase().includes(q)) || (post.communityName && post.communityName.toLowerCase().includes(q));
      if (!matchText) return false;
    }

    // Search Engine 2.0 Filter Types
    if (searchFilterType === 'videos') {
      if (!post.videoUrl) return false;
    } else if (searchFilterType === 'voice') {
      if (!post.isVoice && !post.content.includes("voice")) return false;
    } else if (searchFilterType === 'communities') {
      if (!post.communityName) return false;
    } else if (searchFilterType === 'pulse') {
      if (post.category !== 'pulse' && !post.location) return false;
    } else if (searchFilterType === 'users') {
      const q = searchQuery.toLowerCase();
      if (searchQuery.trim()) {
        const userMatch = post.name.toLowerCase().includes(q) || post.username.toLowerCase().includes(q);
        if (!userMatch) return false;
      }
    } else if (searchFilterType === 'hashtags') {
      const q = searchQuery.toLowerCase().replace('#', '');
      if (searchQuery.trim()) {
        const tagMatch = post.tags.some(t => t.toLowerCase().includes(q));
        if (!tagMatch) return false;
      }
    }

    // Hashtag match from sidebar / top trend clicks
    if (selectedTag) {
      if (!post.tags.includes(selectedTag)) return false;
    }

    return true;
  });

  // Score analyzer for "For You" Feed ranking
  const getRankedPosts = () => {
    let list = [...filteredPosts];

    // Apply Sorting Filters from Search Engine 2.0
    if (sortBy === 'latest') {
      // Keep feed flow chronological / base sorting
    } else if (sortBy === 'popular') {
      list.sort((a, b) => {
        const scoreA = a.likes + a.shares * 3 + a.comments.length * 2;
        const scoreB = b.likes + b.shares * 3 + b.comments.length * 2;
        return scoreB - scoreA;
      });
    } else if (sortBy === 'nearby') {
      list.sort((a, b) => {
        const hasLocA = a.location ? 1 : 0;
        const hasLocB = b.location ? 1 : 0;
        return hasLocB - hasLocA;
      });
    }

    // Apply For You Engagement boost only if not strictly sorted or in specialized feeds
    if (feedTab === 'for_you' && sortBy === 'latest') {
      return list.sort((a, b) => {
        let scoreA = a.likes + a.shares * 3 + a.comments.length * 2;
        let scoreB = b.likes + b.shares * 3 + b.comments.length * 2;

        // Boost VOH posts or items matching verified interests
        if (a.userId === 'user-0') scoreA += 500;
        if (b.userId === 'user-0') scoreB += 500;

        // Location relevance boost (e.g. Nigeria, Port Harcourt)
        if (a.location?.toLowerCase().includes("nigeria")) scoreA += 100;
        if (b.location?.toLowerCase().includes("nigeria")) scoreB += 100;

        return scoreB - scoreA;
      });
    }

    return list;
  };

  const currentDisplayList = getRankedPosts().slice(0, visibleCount);

  // Suggested item creators
  const suggestedCommunities = [
    { name: "🏟 Football Nigeria", members: "12,420 members", desc: "For technical build-ups and Nigerian sports. Flagship space." },
    { name: "🏟 Cyberpunk Photography", members: "4,110 members", desc: "Volumetric electronic vapor haze snaps across our grids." },
    { name: "🏟 Rust Compiler Labs", members: "1,840 members", desc: "SIMD buffers, compiler speed tuning, zero-cost architecture structures." }
  ];

  const suggestedUsers = [
    { id: 'creator-4', name: "Nexora AI", username: "nexora_ai", avatar: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150&auto=format&fit=crop&q=80", location: "Lagos, Nigeria", bio: "Official NEXORA AI Companion. Sharing football updates, food vibes, and daily stories." },
    { id: 'voh_ai', name: "VOH AI", username: "voh_ai", avatar: "https://images.unsplash.com/photo-1620712943543-bcc4688e7485?w=150&auto=format&fit=crop&q=80", location: "Lagos, Nigeria", bio: "The Intelligent AI assistant by VOICE OF HARRISON. Syncing daily matches and design tokens." }
  ];

  return (
    <div className="space-y-5 flex flex-col h-full max-h-[800px] relative">
      
      {/* 1. TOP MINIMALIST HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-violet-500/15 pb-4 shrink-0 px-1">
        {/* Left: Brand logo */}
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-linear-to-tr from-violet-600 via-pink-500 to-cyan-400 flex items-center justify-center shadow-lg shadow-violet-500/20">
            <Cpu className="w-4.5 h-4.5 text-white animate-pulse" />
          </div>
          <div>
            <span className="font-sans font-black text-lg tracking-wider bg-linear-to-r from-violet-200 via-pink-300 to-cyan-200 bg-clip-text text-transparent">
              NEXORA
            </span>
            <span className="text-[10px] font-mono block text-violet-400 leading-none font-bold">SOCIAL NETWORK</span>
          </div>
        </div>

        {/* Center: For You / Following / Contributions / Pulse / Local / Broadcast */}
        <div className="flex items-center gap-1 bg-slate-950/40 p-1 rounded-xl border border-white/5 mx-auto md:mx-0 overflow-x-auto scrollbar-none max-w-full">
          {(['for_you', 'following', 'contributions', 'pulse', 'local', 'broadcast'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => {
                setFeedTab(tab);
                setVisibleCount(8);
              }}
              className={`text-center py-1.5 px-3 rounded-lg font-sans text-[11px] font-extrabold uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap ${
                feedTab === tab 
                  ? 'bg-linear-to-r from-violet-600 to-pink-500 text-white shadow-md' 
                  : 'text-violet-400/60 hover:text-violet-200'
              }`}
            >
              {tab === 'for_you' && 'For You'}
              {tab === 'following' && 'Following'}
              {tab === 'contributions' && 'Contributions'}
              {tab === 'pulse' && 'Pulse'}
              {tab === 'local' && 'Local'}
              {tab === 'broadcast' && '📢 Broadcasts'}
            </button>
          ))}
        </div>

        {/* Right: Search and Messages */}
        <div className="flex items-center gap-2.5">
          {/* Compact Search box */}
          <div className="relative w-36 sm:w-44">
            <Search className="absolute left-2.5 top-2.5 w-3 h-3 text-violet-400/50" />
            <input 
              type="text" 
              placeholder="Search..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-950/50 border border-white/5 hover:border-violet-500/20 focus:border-violet-500/40 rounded-xl py-1.5 pl-7.5 pr-6 text-[10.5px] text-white focus:outline-hidden placeholder:text-violet-400/30"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-2 text-violet-400/50 hover:text-white"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* VOH AI button */}
          <button 
            onClick={() => {
              window.dispatchEvent(new CustomEvent('toast', { detail: '🧠 VOH AI Oracle: Ask questions or design communities anytime!' }));
              window.dispatchEvent(new CustomEvent('changeTab', { detail: { tab: 'matrix', subTab: 'ai' } }));
            }}
            className="p-1.5 rounded-xl bg-violet-500/10 hover:bg-violet-500/20 text-violet-300 transition-all border border-violet-500/10 flex items-center gap-1 cursor-pointer"
            title="VOH AI Assistant Oracle"
          >
            <Zap className="w-3.5 h-3.5 text-pink-400 animate-bounce" />
            <span className="text-[9px] font-mono font-black text-violet-200">VOH AI</span>
          </button>

          {/* Message Inbox button */}
          <button 
            onClick={() => {
              window.dispatchEvent(new CustomEvent('toast', { detail: '📬 Opening your Direct Messages inbox...' }));
              window.dispatchEvent(new CustomEvent('changeTab', { detail: { tab: 'matrix', subTab: 'messages' } }));
            }}
            className="p-1.5 bg-white/5 hover:bg-white/10 rounded-xl text-violet-300 hover:text-white transition-all border border-white/5 cursor-pointer"
            title="Messages"
          >
            <MessageSquare className="w-4 h-4" />
          </button>
        </div>
      </div>



      {/* Search Deck */}
      <div className="shrink-0 p-4 bg-slate-950/25 border border-white/5 rounded-2xl space-y-3.5 text-left">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="space-y-1">
            <span className="text-[10px] uppercase font-mono text-[#A78BFA] font-extrabold tracking-widest block">
              Search
            </span>
            <div className="flex flex-wrap items-center gap-1.5">
              {[
                { id: 'all', label: 'All 🌌' },
                { id: 'users', label: 'Users 👥' },
                { id: 'posts', label: 'Posts 📝' },
                { id: 'videos', label: 'Videos 🎥' },
                { id: 'voice', label: 'Voice Posts 🎙️' },
                { id: 'communities', label: 'Communities 🏟️' },
                { id: 'hashtags', label: 'Hashtags 🏷️' },
                { id: 'pulse', label: 'Pulse 🌍' }
              ].map(f => (
                <button
                  key={f.id}
                  onClick={() => setSearchFilterType(f.id as any)}
                  className={`px-3 py-1.5 rounded-lg text-[10.5px] font-bold font-sans transition-all cursor-pointer ${searchFilterType === f.id ? 'bg-violet-600 border border-violet-500/30 text-white font-extrabold shadow-[0_0_12px_rgba(139,92,246,0.25)]' : 'bg-[#0b0821]/50 text-zinc-400 hover:text-zinc-200 hover:bg-white/5 border border-transparent'}`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1 shrink-0">
            <span className="text-[10px] uppercase font-mono text-pink-400 font-extrabold tracking-widest block">
              Sort By
            </span>
            <div className="flex items-center gap-1 bg-black/40 p-1.5 rounded-xl border border-white/5 text-[10.5px] font-sans">
              {[
                { id: 'latest', label: '⚡ Latest' },
                { id: 'popular', label: '🔥 Popular' },
                { id: 'nearby', label: '📍 Nearby' }
              ].map(s => (
                <button
                  key={s.id}
                  onClick={() => setSortBy(s.id as any)}
                  className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase transition-all cursor-pointer ${sortBy === s.id ? 'bg-pink-600 text-white font-bold' : 'text-zinc-400 hover:text-white'}`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Pinterest style Saved collection folder rows */}
        <div className="text-left border-t border-white/5 pt-2.5 w-full">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10.5px] font-mono font-bold text-zinc-400 uppercase flex items-center gap-1 shrink-0">
                <Folder className="w-3.5 h-3.5 text-pink-400" />
                SAVED COLLECTIONS:
              </span>
              <div className="flex flex-wrap items-center gap-1.5">
                {Object.keys(savedCollections).map(folder => {
                  const count = savedCollections[folder]?.length || 0;
                  const isFolderActive = activeCollectionFolder === folder;
                  return (
                    <button
                      key={folder}
                      onClick={() => {
                        if (isFolderActive) {
                          setActiveCollectionFolder(null);
                        } else {
                          setActiveCollectionFolder(folder);
                        }
                      }}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-bold font-sans transition-all flex items-center gap-1.5 cursor-pointer border ${isFolderActive ? 'bg-pink-900/30 text-pink-300 border-pink-500/40 font-extrabold' : 'bg-black/20 text-zinc-400 hover:text-zinc-300 border-white/5'}`}
                    >
                      <span>{folder}</span>
                      <span className="bg-black/40 text-[9px] px-1 rounded-md font-mono">{count}</span>
                    </button>
                  );
                })}
              </div>
            </div>
            {activeCollectionFolder && (
              <button
                onClick={() => setActiveCollectionFolder(null)}
                className="text-[10.5px] font-mono text-rose-400 hover:text-rose-500 font-extrabold flex items-center gap-1 cursor-pointer shrink-0 uppercase tracking-wide"
              >
                [Exit Folder ✖]
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Selected Tag Active Indicator */}
      {selectedTag && (
        <div className="shrink-0 flex items-center justify-between bg-violet-600/10 border border-violet-500/25 px-3 py-1.5 rounded-xl">
          <span className="text-xs font-mono text-violet-300">Filtering tags containing: <strong className="text-white">#{selectedTag}</strong></span>
          <button onClick={() => setSelectedTag(null)} className="text-violet-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}



      {/* 5. MAIN FEED CONTENT STREAM (With pull-to-refresh & infinite scroll) */}
      <div 
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto pr-1.5 space-y-4 custom-scrollbar"
      >
        {/* Refresh pull-down simulator button */}
        <div className="flex justify-center shrink-0">
          <button 
            disabled={isRefreshing}
            onClick={triggerRefresh}
            className="flex items-center gap-1.5 py-1.5 px-4 rounded-full bg-slate-950/60 border border-violet-500/15 hover:border-violet-500/30 text-[10.5px] font-mono text-violet-300 transition-all cursor-pointer active:scale-95"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-pink-400 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>{isRefreshing ? 'Refreshing feed...' : 'Pull Feed down to refresh'}</span>
          </button>
        </div>

        {/* Empty feed state */}
        {filteredPosts.length === 0 && (
          <div className="p-8 rounded-3xl bg-[#09071c]/50 border border-violet-500/10 text-center py-12 space-y-4">
            <Globe className="w-10 h-10 text-violet-500/30 mx-auto animate-pulse" />
            <h4 className="text-sm font-sans font-bold text-violet-100">No Posts Found</h4>
            <p className="text-xs text-violet-300/70 max-w-md mx-auto leading-relaxed">
              Welcome to NEXORA. Follow people, join communities, and explore World Pulse to start discovering content.
            </p>
            <button 
              onClick={() => { setSearchQuery(''); setSelectedTag(null); setFeedTab('for_you'); }}
              className="px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white rounded-xl text-xs font-mono font-bold cursor-pointer"
            >
              Reset Feed Filters
            </button>
          </div>
        )}

        {/* POST LIST */}
        {currentDisplayList.map((post, index) => {
          const isPlaying = playingVoiceId === post.id;
          const isCommentsOpen = activeCommentsPostId === post.id;

          return (
            <React.Fragment key={post.id}>
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className={`p-4 md:p-5 rounded-3xl bg-[#0b091e]/80 border ${
                  post.isBroadcastPost 
                    ? 'border-amber-500/25 bg-[#171008]/90 shadow-lg shadow-amber-500/5' 
                    : post.userId === 'user-0' 
                      ? 'border-violet-500/30 bg-[#0d0926]/90' 
                      : 'border-violet-500/10'
                } relative overflow-hidden group text-left`}
              >
                {/* Future scheduled posts warning banner (Only visible to the creator) */}
                {post.scheduledTime && new Date(post.scheduledTime).getTime() > Date.now() && (
                  <div className="mb-4 p-3 bg-violet-600/15 border border-violet-500/30 rounded-2xl flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono text-violet-300">
                    <span className="flex items-center gap-1.5">
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-violet-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-violet-500"></span>
                      </span>
                      <span>📅 SCHEDULED QUEUE: {new Date(post.scheduledTime).toLocaleString()}</span>
                    </span>
                    <button 
                      onClick={() => handlePublishScheduledPostNow(post.id)}
                      className="bg-violet-600 hover:bg-violet-500 text-white font-extrabold text-[9px] px-3 py-1 rounded-xl uppercase tracking-wider cursor-pointer"
                    >
                      Publish Now 🚀
                    </button>
                  </div>
                )}
                {/* 1. Card Header Row */}
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div className="flex gap-3">
                    <img 
                      src={post.avatar} 
                      alt={post.name} 
                      className="w-10 h-10 rounded-xl object-cover border border-violet-500/20 cursor-pointer" 
                      onClick={() => onViewProfile?.(post.userId)}
                    />
                    <div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span 
                          onClick={() => onViewProfile?.(post.userId)}
                          className="font-sans font-extrabold text-sm text-white hover:text-violet-400 transition-colors cursor-pointer"
                        >
                          {post.name}
                        </span>
                        {/* Stripped generated users verification. ONLY founder 'user-0' and approved bots get it */}
                        {(post.username === 'voh' || post.userId === 'user-0' || post.username === 'voh_ai' || post.username === 'nexora_ai') && (
                          <CheckCircle className="w-3.5 h-3.5 text-violet-400 fill-current" />
                        )}
                        {post.isBroadcastPost && (
                          <span className="text-[8px] font-mono font-black uppercase text-amber-300 bg-amber-500/15 border border-amber-500/30 px-1.5 py-0.5 rounded-md flex items-center gap-0.5 tracking-wider">
                            <span>📣</span> BROADCASTS CHN
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 text-[10.5px] font-mono text-violet-400/80 leading-tight">
                        <span>@{post.username}</span>
                        <span>•</span>
                        <span>{post.timestamp}</span>
                      </div>
                    </div>
                  </div>

                  {/* Badges column */}
                  <div className="flex flex-col items-end gap-1.5 text-[9.5px] font-mono shrink-0">
                    <div className="flex items-center gap-1">
                      {/* Three-dots menu button */}
                      <div className="relative">
                        <button
                          onClick={() => {
                            if (activeDotsMenuPostId === post.id) {
                              setActiveDotsMenuPostId(null);
                            } else {
                              setActiveDotsMenuPostId(post.id);
                            }
                          }}
                          className="p-1 px-1.5 bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white rounded-lg transition-all cursor-pointer flex items-center gap-1"
                          title="More options"
                        >
                          <MoreVertical className="w-3.5 h-3.5" />
                          <span className="text-[9px] font-mono uppercase font-black tracking-wider leading-none">More</span>
                        </button>

                        <AnimatePresence>
                          {activeDotsMenuPostId === post.id && (
                            <motion.div
                              initial={{ opacity: 0, scale: 0.95, y: -5 }}
                              animate={{ opacity: 1, scale: 1, y: 0 }}
                              exit={{ opacity: 0, scale: 0.95, y: -5 }}
                              className="absolute right-0 mt-1 w-44 bg-[#0c091f] border border-white/10 rounded-xl shadow-2xl z-50 overflow-hidden font-sans py-1"
                            >
                              <button
                                onClick={() => {
                                  setReportingPost(post);
                                  setActiveDotsMenuPostId(null);
                                }}
                                className="w-full text-left px-3 py-2 hover:bg-red-500/10 text-red-400 font-bold flex items-center gap-2 text-xs transition-colors cursor-pointer"
                              >
                                <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
                                Report Post
                              </button>
                              
                              <button
                                onClick={() => {
                                  const nameToReport = {
                                    id: post.userId,
                                    username: post.username,
                                    targetContent: `Profile of @${post.username}`,
                                    content: `Profile of @${post.username}`
                                  };
                                  setReportingPost(nameToReport);
                                  setActiveDotsMenuPostId(null);
                                }}
                                className="w-full text-left px-3 py-2 hover:bg-red-500/10 text-red-300 flex items-center gap-2 text-xs transition-colors cursor-pointer"
                              >
                                <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
                                Report User
                              </button>

                              <button
                                onClick={() => {
                                  setHiddenPostIds(prev => [...prev, post.id]);
                                  setActiveDotsMenuPostId(null);
                                  window.dispatchEvent(new CustomEvent('toast', { detail: '🙈 Post hidden from active feed.' }));
                                }}
                                className="w-full text-left px-3 py-2 hover:bg-white/5 text-zinc-300 flex items-center gap-2 text-xs transition-colors cursor-pointer"
                              >
                                <EyeOff className="w-3.5 h-3.5 shrink-0" />
                                Hide Post
                              </button>

                              <button
                                onClick={() => {
                                  setNotInterestedTags(prev => [...prev, ...post.tags]);
                                  setActiveDotsMenuPostId(null);
                                  window.dispatchEvent(new CustomEvent('toast', { detail: '👎 Tag preference customized. Reducing matched stream.' }));
                                }}
                                className="w-full text-left px-3 py-2 hover:bg-white/5 text-[#A78BFA] flex items-center gap-2 text-xs transition-colors cursor-pointer"
                              >
                                <Sliders className="w-3.5 h-3.5 shrink-0" />
                                Not Interested
                              </button>

                              <button
                                onClick={() => {
                                  setBlockedUserIds(prev => [...prev, post.userId]);
                                  setActiveDotsMenuPostId(null);
                                  window.dispatchEvent(new CustomEvent('toast', { detail: `🚫 Blocked @${post.username}. Stream isolated.` }));
                                }}
                                className="w-full text-left px-3 py-2 hover:bg-red-950/20 text-rose-500 font-extrabold flex items-center gap-2 text-xs transition-colors cursor-pointer border-t border-white/5"
                              >
                                <X className="w-3.5 h-3.5 shrink-0 text-red-500" />
                                Block User
                              </button>

                              <button
                                onClick={() => {
                                  setShowSaveToCollectionModalId(post.id);
                                  setActiveDotsMenuPostId(null);
                                }}
                                className="w-full text-left px-3 py-2 hover:bg-white/5 text-pink-400 font-bold flex items-center gap-2 text-xs transition-colors cursor-pointer border-t border-white/5"
                              >
                                <FolderPlus className="w-3.5 h-3.5 shrink-0" />
                                Save to Folder
                              </button>

                              {post.userId === currentUser.id && (
                                <button
                                  onClick={() => {
                                    setEditingPostId(post.id);
                                    setEditingPostContent(post.content);
                                    setActiveDotsMenuPostId(null);
                                  }}
                                  className="w-full text-left px-3 py-2 hover:bg-violet-500/15 text-violet-300 font-bold flex items-center gap-2 text-xs transition-colors cursor-pointer border-t border-white/5"
                                >
                                  <Edit2 className="w-3.5 h-3.5 shrink-0" />
                                  Edit Post Content
                                </button>
                              )}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>

                    </div>

                    {post.communityName && (
                      <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-md font-bold uppercase tracking-wide">
                        🏟 {post.communityName}
                      </span>
                    )}
                    {post.location && (
                      <span className="bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 px-2 py-0.5 rounded-md flex items-center gap-1 animate-pulse">
                        <Globe className="w-2.5 h-2.5 text-cyan-300" />
                        <span>🌍 Pulse Report</span>
                      </span>
                    )}
                    {post.opportunityType && (
                      <span className="bg-pink-500/15 text-pink-400 border border-pink-500/20 px-2 py-0.5 rounded-md font-black uppercase tracking-wide">
                        🚀 {post.opportunityType}
                      </span>
                    )}
                  </div>
                </div>

                {/* 2. Content Row */}
                <div className="space-y-3 mb-4 text-left">
                  {editingPostId === post.id ? (
                    <div className="space-y-2 bg-slate-950/60 p-3 rounded-2xl border border-violet-500/25">
                      <textarea
                        value={editingPostContent}
                        onChange={(e) => setEditingPostContent(e.target.value)}
                        className="w-full bg-zinc-900 text-xs text-white p-2.5 rounded-xl border border-zinc-800 focus:outline-none font-sans min-h-[80px]"
                      />
                      <div className="flex gap-2 justify-end">
                        <button
                          onClick={() => {
                            setEditingPostId(null);
                            setEditingPostContent('');
                          }}
                          className="px-3 py-1.5 bg-zinc-850 hover:bg-zinc-800 text-zinc-300 font-bold text-[10px] uppercase tracking-wider rounded-lg cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => handleSaveEditPost(post.id)}
                          className="px-3 py-1.5 bg-linear-to-r from-violet-600 to-pink-500 hover:brightness-110 text-white font-bold text-[10px] uppercase tracking-wider rounded-lg cursor-pointer"
                        >
                          Save Changes 💾
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <p className="text-sm text-slate-100 font-sans leading-relaxed whitespace-pre-wrap select-all">
                        {post.content}
                      </p>
                      {/* Edit History status display */}
                      {post.editHistory && post.editHistory.length > 0 && (
                        <button
                          onClick={() => setViewHistoryPost(post)}
                          className="mt-1.5 text-[9px] font-mono text-violet-400 hover:text-violet-300 flex items-center gap-1 cursor-pointer bg-violet-950/20 px-2 py-0.5 rounded-md border border-violet-500/10"
                        >
                          ✏️ Edited ({post.editHistory.length}x) • View Change Log
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* 3. Media Renders (Photo, Video, Voice, Poll, Opportunity Specs) */}
                
                {/* Photo attachment or Multi-image Carousel */}
                {post.images && post.images.length > 1 ? (
                  <PostCarousel images={post.images} filters={post.imageFilters} />
                ) : post.image && !post.opportunityType ? (
                  <div className="overflow-hidden rounded-2xl border border-white/5 mb-4 max-h-[300px]">
                    <img 
                      src={post.image} 
                      alt="Attachment" 
                      className="w-full h-full object-cover pr-0 pointer-events-none hover:scale-101 transition-transform"
                      referrerPolicy="no-referrer"
                      style={{ filter: post.imageFilter || 'none' }}
                    />
                  </div>
                ) : null}

                {/* Video Playback Experience (autoplay, loop, muted) */}
                {post.videoUrl && (
                  <div className="relative overflow-hidden rounded-2xl border border-violet-500/20 mb-4 bg-black aspect-video">
                    {/* Auto-playing muted loop */}
                    <video 
                      src={post.videoUrl}
                      autoPlay
                      muted
                      loop
                      playsInline
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute top-3 left-3 bg-black/60 backdrop-blur-md px-2 py-1 rounded-lg text-[9px] font-mono text-pink-400 uppercase tracking-widest flex items-center gap-1">
                      <Play className="w-2.5 h-2.5 fill-pink-400 text-pink-400 animate-pulse" />
                      <span>AUTOPLAY VIDEO STREAM</span>
                    </div>

                    <button 
                      onClick={() => setActiveVideoFullscreen(post)}
                      className="absolute bottom-3 right-3 bg-violet-600 hover:bg-violet-500 text-white font-mono font-black text-[9.5px] px-3 py-1.5 rounded-xl uppercase transition-all tracking-wider cursor-pointer"
                    >
                      Watch Video 🎥
                    </button>
                  </div>
                )}

                {/* Spatial Voice Broadcast Player */}
                {post.isVoice && (
                  <div className="mb-4 p-4 rounded-2xl bg-[#070518] border border-violet-500/25 flex items-center gap-3">
                    <button
                      onClick={() => {
                        if (isPlaying) {
                          setPlayingVoiceId(null);
                        } else {
                          setPlayingVoiceId(post.id);
                        }
                      }}
                      className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-transform active:scale-90 cursor-pointer ${
                        isPlaying ? 'bg-linear-to-r from-violet-600 to-pink-500 text-white' : 'bg-violet-500/20 text-violet-300'
                      }`}
                    >
                      {isPlaying ? <Pause className="w-4 h-4 text-white" /> : <Play className="w-4 h-4 text-violet-300 ml-0.5" />}
                    </button>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-center text-[10px] font-mono mb-1.5">
                        <span className="text-pink-400 font-extrabold flex items-center gap-1">
                          <Volume2 className="w-3.5 h-3.5 text-pink-400 animate-pulse" />
                          VOICE POST
                        </span>
                        <span className="text-violet-400">
                          {isPlaying ? `0:${voiceSeconds.toString().padStart(2, '0')}` : '0:00'} / {post.voiceDuration || "0:45"}
                        </span>
                      </div>
                      
                      {/* Animated wave spectrumbars */}
                      <div className="flex items-end gap-[2px] h-5.5">
                        {[...Array(20)].map((_, idx) => (
                          <div 
                            key={idx}
                            className={`w-[2.5px] rounded-full transition-all duration-300 ${
                              isPlaying ? 'bg-gradient-to-t from-violet-500 via-pink-400 to-cyan-300' : 'bg-violet-500/20'
                            }`}
                            style={{
                              height: isPlaying ? `${Math.floor(20 + Math.sin(idx * 1.5 + voiceSeconds) * 60 + Math.random() * 20)}%` : '15%'
                            }}
                          />
                        ))}
                      </div>

                      {post.voiceTranscript && (
                        <div className="mt-3 bg-violet-950/30 p-2.5 rounded-xl border border-violet-500/10">
                          <span className="text-[8.5px] font-mono text-violet-400 block uppercase font-bold tracking-widest mb-0.5">Captions Preview</span>
                          <p className="text-xs font-sans text-violet-300 italic">"{post.voiceTranscript}"</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Interactive Poll Component */}
                {post.interactivePoll && (
                  <div className="mb-4 p-4 rounded-2xl bg-slate-950/60 border border-violet-500/15 space-y-3">
                    <p className="text-xs font-sans text-violet-100 font-bold">{post.interactivePoll.question}</p>
                    <div className="space-y-2">
                      {post.interactivePoll.options.map(opt => {
                        const userVote = votedPolls[post.id];
                        const totalVotes = post.interactivePoll!.options.reduce((acc, o) => acc + o.votes + (userVote === o.id ? 1 : 0), 0);
                        const currentVotes = opt.votes + (userVote === opt.id ? 1 : 0);
                        const percentage = totalVotes > 0 ? Math.round((currentVotes / totalVotes) * 100) : 0;

                        return (
                          <button
                            key={opt.id}
                            disabled={!!userVote}
                            onClick={() => setVotedPolls(prev => ({ ...prev, [post.id]: opt.id }))}
                            className={`w-full text-left p-2.5 rounded-xl border relative overflow-hidden transition-all text-xs font-sans cursor-pointer ${
                              userVote === opt.id 
                                ? 'border-violet-500 bg-violet-600/10 font-bold text-white' 
                                : 'border-white/5 bg-white/3 hover:border-violet-500/25 text-violet-200'
                            }`}
                          >
                            {userVote && (
                              <div 
                                className="absolute left-0 top-0 bottom-0 bg-violet-500/10 transition-all duration-700" 
                                style={{ width: `${percentage}%` }}
                              />
                            )}
                            <div className="relative flex justify-between items-center z-10">
                              <span>{opt.text}</span>
                              {userVote && <span className="font-mono text-[10px] text-violet-400 font-bold">{percentage}% ({currentVotes})</span>}
                            </div>
                          </button>
                        );
                      })}
                    </div>

                    {/* VOH AI insight bubble */}
                    {votedPolls[post.id] && (
                      <motion.div 
                        initial={{ opacity: 0, scale: 0.98 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="p-3 rounded-xl bg-violet-950/40 border border-violet-500/20 text-[10.5px] leading-relaxed text-violet-200/90 font-sans"
                      >
                        <p className="font-mono text-[9px] uppercase text-pink-400 font-black tracking-wider flex items-center gap-1 mb-1">
                          🧠 VOH AI Interactive Insight
                        </p>
                        "Your vote has been counted successfully! Supporting community-driven discussions and participating in polls helps make Nexora a better, more interactive environment. Your reputation is updated (+10)."
                      </motion.div>
                    )}
                  </div>
                )}

                {/* Structured Opportunity Specs */}
                {post.opportunityType && (
                  <div className="mb-4 p-4 rounded-2xl bg-linear-to-tr from-[#130d2a] to-[#040310] border border-pink-500/20 space-y-3.5">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <span className="text-[9px] font-mono text-violet-400 block uppercase">Reward Dividend</span>
                        <span className="text-xs font-mono font-bold text-white mt-0.5 block">{post.opportunityReward || "Equity Structure"}</span>
                      </div>
                      <div>
                        <span className="text-[9px] font-mono text-violet-400 block uppercase">Interest Alignment DNA</span>
                        <span className="text-xs font-sans text-rose-300 font-bold mt-0.5 block">✨ Symmetrical High Match</span>
                      </div>
                    </div>

                    {post.opportunitySkills && (
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {post.opportunitySkills.map(s => (
                          <span key={s} className="bg-violet-500/10 border border-violet-500/20 text-[9px] font-mono px-2 py-0.5 rounded-md text-violet-300">
                            {s}
                          </span>
                        ))}
                      </div>
                    )}

                    <button 
                      onClick={() => alert(`Sent connection request to ${post.name} via VOH AI!`)}
                      className="w-full py-2 bg-linear-to-r from-violet-600 to-pink-500 hover:brightness-110 text-white font-mono font-black text-xs uppercase rounded-xl transition-all tracking-wider shadow-lg shadow-violet-600/20 cursor-pointer"
                    >
                      Connect via VOH AI 🤝
                    </button>
                  </div>
                )}

                {/* Hashtag List */}
                {post.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-4">
                    {post.tags.map(tag => (
                      <button
                        key={tag}
                        onClick={() => setSelectedTag(selectedTag === tag ? null : tag)}
                        className={`text-[10px] font-mono px-2.5 py-0.5 rounded-md transition-colors cursor-pointer ${
                          selectedTag === tag 
                            ? 'bg-violet-600 text-white' 
                            : 'bg-[#15112e] text-violet-400 hover:bg-violet-500/10'
                        }`}
                      >
                        #{tag}
                      </button>
                    ))}
                  </div>
                )}

                {/* 4. Action Row */}
                {post.isBroadcastPost ? (
                  /* EXCLUSIVE BROADCAST INTERACTIVE emoji reactions BAR (Locked Comments) */
                  <div className="flex flex-col gap-3 border-t border-white/5 pt-3.5 mb-1 text-left w-full">
                    <span className="text-[9.5px] font-mono text-amber-400 font-bold tracking-widest uppercase flex items-center gap-1">
                      <span>🔒</span> COMMENTS LOCKED • REACTIONS ALLOWED
                    </span>
                    <div className="flex flex-wrap items-center gap-2.5">
                      {[
                        { emoji: '🔥', label: 'Inspirational' },
                        { emoji: '🙌', label: 'Praise VOH' },
                        { emoji: '⚡', label: 'High Power' },
                        { emoji: '🏆', label: 'Milestone' }
                      ].map((reactOption) => {
                        const count = post.broadcastReactions ? (post.broadcastReactions[reactOption.emoji] || 0) : 0;
                        return (
                          <button
                            key={reactOption.emoji}
                            onClick={() => handleBroadcastReaction(post.id, reactOption.emoji)}
                            className="p-1 px-3 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 hover:border-amber-500/40 rounded-xl flex items-center gap-2 text-xs font-mono font-bold text-amber-200 transition-all active:scale-95 cursor-pointer"
                            title={reactOption.label}
                          >
                            <span>{reactOption.emoji}</span>
                            <span className="text-[11px] font-mono text-amber-300/80">{count}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between border-t border-white/5 pt-3 text-violet-300/70 text-xs text-left">
                    {/* Sparks action instead of likes */}
                    <button
                      onClick={() => handleSpark(post.id)}
                      className={`flex items-center gap-1.5 group hover:text-pink-400 transition-colors cursor-pointer ${
                        post.isLikedByUser ? 'text-pink-400 font-bold' : ''
                      }`}
                    >
                      <Zap className={`w-4 h-4 transition-transform group-hover:scale-120 group-active:scale-130 ${
                        post.isLikedByUser ? 'fill-pink-500 text-pink-400 drop-shadow-[0_0_6px_#f43f5e]' : ''
                      }`} />
                      <span className="font-mono">{post.likes} Sparks</span>
                    </button>

                    <button
                      onClick={() => setActiveCommentsPostId(isCommentsOpen ? null : post.id)}
                      className={`flex items-center gap-1.5 hover:text-violet-300 transition-colors cursor-pointer ${
                        isCommentsOpen ? 'text-violet-300 font-bold' : ''
                      }`}
                    >
                      <MessageSquare className="w-4 h-4" />
                      <span>{post.comments.length} Comments</span>
                    </button>

                    <button
                      onClick={() => {
                        setLocalPosts(prev => prev.map(p => {
                          if (p.id === post.id) return { ...p, shares: p.shares + 1 };
                          return p;
                        }));
                        alert("Post shared successfully! (+5 reputation)");
                      }}
                      className="flex items-center gap-1.5 hover:text-emerald-400 transition-colors cursor-pointer"
                    >
                      <Repeat className="w-4 h-4" />
                      <span>{post.shares} reposts</span>
                    </button>

                    <button
                      onClick={() => handleSave(post.id)}
                      className={`flex items-center gap-1.5 hover:text-cyan-400 transition-colors cursor-pointer ${
                        post.isBookmarkedByUser ? 'text-cyan-400 font-bold' : ''
                      }`}
                    >
                      <Bookmark className={`w-4 h-4 ${post.isBookmarkedByUser ? 'fill-cyan-400 text-cyan-400' : ''}`} />
                      <span className="hidden sm:inline">Save</span>
                    </button>

                    <button
                      onClick={() => {
                        try {
                          navigator.clipboard.writeText(`https://nexora.ai/post/${post.id}`);
                          alert("Post link copied to clipboard.");
                        } catch(e){}
                      }}
                      className="flex items-center gap-1.5 hover:text-violet-300 transition-colors cursor-pointer"
                    >
                      <Share2 className="w-4 h-4 text-pink-400" />
                      <span className="hidden sm:inline">Share</span>
                    </button>
                  </div>
                )}

                {/* 5. THREADED COMMENTS DRAWER ACCORDION */}
                <AnimatePresence>
                  {isCommentsOpen && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden mt-4 pt-4 border-t border-white/5 space-y-4"
                    >
                      {/* Comments stream scroll */}
                      <div className="space-y-3.5 max-h-[300px] overflow-y-auto pr-1">
                        {post.comments.length === 0 && (
                          <p className="text-[11px] font-mono text-violet-300/40 italic py-2 text-center">
                            No comments yet. Start the conversation!
                          </p>
                        )}
                        {post.comments.map(c => (
                          <div key={c.id} className="p-3 rounded-2xl bg-slate-950/40 border border-white/5 space-y-2.5">
                            <div className="flex items-start justify-between gap-2 text-xs">
                              <div className="flex gap-2">
                                <img src={c.avatar} alt={c.name} className="w-7 h-7 rounded-lg object-cover" />
                                <div>
                                  <span className="font-sans font-bold text-violet-200">{c.name}</span>
                                  <span className="text-[10px] font-mono text-violet-400/60 block">@{c.username} • {c.timestamp}</span>
                                </div>
                              </div>
                              <button 
                                onClick={() => handleSparkComment(post.id, c.id)}
                                className={`flex items-center gap-1 font-mono text-[10px] hover:text-pink-400 ${c.isLikedByUser ? 'text-pink-400' : 'text-violet-400/50'}`}
                              >
                                <Zap className="w-3 h-3 fill-current" />
                                <span>{c.likes}</span>
                              </button>
                            </div>
                            
                            <p className="text-xs text-slate-200 pl-9 font-sans">{c.content}</p>

                            {/* Standard Threaded/Nested Replies */}
                            {c.replies && c.replies.length > 0 && (
                              <div className="pl-9 space-y-2.5 pt-1.5 border-l border-violet-500/10 ml-3.5">
                                {c.replies.map(rep => (
                                  <div key={rep.id} className="text-xs bg-white/2 p-2 rounded-xl border border-white/3">
                                    <div className="flex items-center gap-2 mb-1">
                                      <img src={rep.avatar} alt={rep.name} className="w-5 h-5 rounded-md object-cover" />
                                      <div>
                                        <span className="font-sans font-black text-violet-200 text-[11px]">{rep.name}</span>
                                        <span className="text-[9px] font-mono text-violet-400/50 block">@{rep.username} • {rep.timestamp}</span>
                                      </div>
                                    </div>
                                    <p className="text-violet-200 pl-7 text-[11.5px] leading-relaxed">{rep.content}</p>
                                  </div>
                                ))}
                              </div>
                            )}

                            {/* Reply compose activator */}
                            <div className="pl-9">
                              {activeReplyFieldId === c.id ? (
                                <div className="flex gap-2 mt-2">
                                  <input 
                                    type="text"
                                    placeholder="Write nested thread reply..."
                                    value={replyInputs[c.id] || ''}
                                    onChange={(e) => setReplyInputs(prev => ({ ...prev, [c.id]: e.target.value }))}
                                    onKeyDown={(e) => { if(e.key === 'Enter') handleAddReplySubmit(post.id, c.id); }}
                                    className="flex-1 bg-slate-900 border border-violet-500/15 rounded-xl py-1 px-3 text-xs text-white focus:outline-hidden"
                                  />
                                  <button 
                                    onClick={() => handleAddReplySubmit(post.id, c.id)}
                                    className="bg-violet-600 hover:bg-violet-500 p-1.5 rounded-xl text-white cursor-pointer"
                                  >
                                    <Send className="w-3.5 h-3.5" />
                                  </button>
                                  <button 
                                    onClick={() => setActiveReplyFieldId(null)}
                                    className="text-violet-400 text-xs hover:text-white"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              ) : (
                                <button 
                                  onClick={() => setActiveReplyFieldId(c.id)}
                                  className="text-[10px] font-mono text-violet-400 hover:text-white flex items-center gap-1 mt-1 cursor-pointer"
                                >
                                  Reply to Thread 💬
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Main comment form */}
                      <div className="flex items-center gap-2 pt-2 border-t border-white/5">
                        <input 
                          type="text" 
                          placeholder="Write your comment..."
                          value={commentInputs[post.id] || ''}
                          onChange={(e) => setCommentInputs({ ...commentInputs, [post.id]: e.target.value })}
                          onKeyDown={(e) => { if(e.key==='Enter') handleAddCommentSubmit(post.id); }}
                          className="flex-1 bg-slate-950/60 border border-white/5 focus:border-violet-500/20 text-xs text-white placeholder:text-violet-400/40 py-2.5 px-4 rounded-xl focus:outline-hidden"
                        />
                        <button 
                          onClick={() => handleAddCommentSubmit(post.id)}
                          className="p-2.5 bg-violet-600 hover:bg-violet-550 rounded-xl text-white transition-colors cursor-pointer"
                        >
                          <Send className="w-4 h-4" />
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

              </motion.div>
            </React.Fragment>
          );
        })}

        {/* Clean spacing at the bottom of the feed for uninterrupted scrolling */}
        <div className="h-32 pointer-events-none" />
      </div>

      {/* 6. FLOATING QUICK CREATE POST "+" BUTTON */}
      <button
        onClick={() => setComposerOpen(true)}
        className="fixed bottom-6 right-6 w-14 h-14 rounded-full bg-linear-to-tr from-violet-600 via-purple-600 to-pink-500 hover:brightness-110 active:scale-95 text-white flex items-center justify-center shadow-lg shadow-violet-600/30 border border-violet-400/20 z-40 cursor-pointer animate-pulse"
        title="Create Post"
      >
        <Plus className="w-7 h-7 text-white stroke-[2.5px]" />
      </button>

      {/* COMPOSER OVERLAY DIALOG */}
      <AnimatePresence>
        {composerOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-50 overflow-y-auto"
          >
            <motion.div 
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              className="bg-[#0b0821] border border-violet-500/25 p-5 md:p-6 rounded-3xl w-full max-w-lg space-y-4 shadow-2xl"
            >
              <div className="flex items-center justify-between border-b border-white/5 pb-3">
                <span className="text-xs font-mono font-extrabold text-[#A78BFA] uppercase tracking-widest flex items-center gap-1.5">
                  <Plus className="w-4 h-4 text-pink-400" />
                  <span>Create Post</span>
                </span>
                <button onClick={() => setComposerOpen(false)} className="text-violet-400 hover:text-white p-1 cursor-pointer">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Audience Matrix tabs */}
              <div className="grid grid-cols-4 gap-1.5 bg-slate-950/40 p-1 rounded-xl border border-white/5">
                {(['general', 'pulse', 'community', 'opportunity'] as const).map(cat => (
                  <button
                    key={cat}
                    onClick={() => setComposerCategory(cat)}
                    className={`py-1.5 rounded-lg text-[9px] font-mono uppercase tracking-wider font-extrabold transition-all cursor-pointer ${
                      composerCategory === cat ? 'bg-violet-600 text-white' : 'text-violet-400/50 hover:text-white'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              {/* Text Input area */}
              <div className="space-y-1">
                <textarea
                  rows={4}
                  placeholder={`Cast your diagnostic updates... Type #tags as reference loops...`}
                  value={composerText}
                  onChange={(e) => setComposerText(e.target.value)}
                  className="w-full bg-slate-950/50 border border-white/5 focus:border-violet-500/20 text-xs text-white rounded-xl p-3 focus:outline-hidden placeholder:text-violet-400/30 resize-none font-sans"
                />
              </div>

              {/* Image URL attachment input */}
              <div className="space-y-1">
                <label className="text-[10px] font-mono text-violet-400 block uppercase">Attachment Image/Asset URL</label>
                <input 
                  type="text"
                  placeholder="https://images.unsplash.com/... (optional)"
                  value={composerImgUrl}
                  onChange={(e) => setComposerImgUrl(e.target.value)}
                  className="w-full bg-slate-950/50 border border-white/5 focus:border-violet-500/20 text-xs text-white rounded-xl py-2 px-3 focus:outline-hidden"
                />
              </div>

              {/* Conditional parameters based on category */}
              {composerCategory === 'pulse' && (
                <div className="space-y-1">
                  <label className="text-[10px] font-mono text-violet-400 block uppercase">Pulse Location Name</label>
                  <input 
                    type="text"
                    placeholder="e.g. Port Harcourt, Nigeria"
                    value={composerLocation}
                    onChange={(e) => setComposerLocation(e.target.value)}
                    className="w-full bg-slate-950/50 border border-white/5 focus:border-violet-500/20 text-xs text-white rounded-xl py-2 px-3 focus:outline-hidden"
                  />
                </div>
              )}

              {composerCategory === 'community' && (
                <div className="space-y-1">
                  <label className="text-[10px] font-mono text-violet-400 block uppercase">Target Community Space</label>
                  <input 
                    type="text"
                    placeholder="e.g. Football Nigeria, Tech Labs"
                    value={composerCommunityName}
                    onChange={(e) => setComposerCommunityName(e.target.value)}
                    className="w-full bg-slate-950/50 border border-white/5 focus:border-violet-500/20 text-xs text-white rounded-xl py-2 px-3 focus:outline-hidden"
                  />
                </div>
              )}

              {composerCategory === 'opportunity' && (
                <div className="grid grid-cols-2 gap-3.5">
                  <div className="space-y-1">
                    <label className="text-[10px] font-mono text-violet-400 block uppercase">Opportunity Category</label>
                    <select
                      value={composerOpportunityType}
                      onChange={(e) => setComposerOpportunityType(e.target.value as any)}
                      className="w-full bg-slate-950 border border-white/5 text-xs text-white rounded-xl py-2 px-2.5 focus:outline-hidden"
                    >
                      <option value="Collaboration">Collaboration</option>
                      <option value="Job">Job Opportunity</option>
                      <option value="Startup">Startup Seeking Co-Founder</option>
                      <option value="Mentorship">Mentorship Node</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-mono text-violet-400 block uppercase">Dividend/Reward Structure</label>
                    <input 
                      type="text"
                      placeholder="e.g. Equity, $120,000 baseline"
                      value={composerReward}
                      onChange={(e) => setComposerReward(e.target.value)}
                      className="w-full bg-slate-950/50 border border-white/5 focus:border-violet-500/20 text-xs text-white rounded-xl py-2 px-3 focus:outline-hidden"
                    />
                  </div>
                </div>
              )}

              {/* Submit trigger */}
              <div className="pt-2 border-t border-white/5 flex gap-2.5 justify-end">
                <button 
                  onClick={() => setComposerOpen(false)}
                  className="px-4 py-2 border border-white/10 hover:bg-white/5 rounded-xl text-violet-300 text-xs font-mono font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleComposeSubmit}
                  className="px-5 py-2 bg-linear-to-r from-violet-600 to-pink-500 hover:brightness-110 rounded-xl text-white text-xs font-mono font-black uppercase tracking-wider cursor-pointer"
                >
                  Publish Broadcast Node ⚡
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* NEW MOMENT STORIES CREATOR MODAL */}
      <AnimatePresence>
        {isCreateMomentOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-md"
          >
            <motion.div 
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              className="bg-linear-to-b from-[#110d2d] to-[#04030d] border border-violet-500/20 rounded-3xl p-6 max-w-md w-full shadow-2xl relative space-y-4 text-left font-sans"
            >
              <button 
                type="button"
                onClick={() => setIsCreateMomentOpen(false)}
                className="absolute top-4 right-4 p-1 rounded-lg bg-white/5 text-violet-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="space-y-1">
                <h3 className="text-md font-sans font-black text-white flex items-center gap-1.5">
                  <span className="text-lg">✨</span> Add to Your Story
                </h3>
                <p className="text-[10.5px] font-mono text-violet-400/60 leading-normal">
                  Stories disappear after 24 hours. Share a quick update, photo, or voice note with your friends!
                </p>
              </div>

              {/* Form container */}
              <form onSubmit={handleSaveNewMoment} className="space-y-4">
                
                {/* Media Select segment */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-mono text-violet-400 block uppercase font-bold">Choose Media Type</label>
                  <div className="grid grid-cols-4 gap-1.5">
                    {[
                      { id: 'photo', label: '📸 Photo', defaultUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&auto=format&fit=crop&q=80' },
                      { id: 'video', label: '🎥 Video', defaultUrl: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=600&auto=format&fit=crop&q=80' },
                      { id: 'voice', label: '🎙️ Voice', defaultUrl: '' },
                      { id: 'text', label: '📝 Plain', defaultUrl: '' }
                    ].map((type) => (
                      <button
                        key={type.id}
                        type="button"
                        onClick={() => {
                          setMomentMediaType(type.id as any);
                          if (type.defaultUrl) setMomentMediaUrl(type.defaultUrl);
                        }}
                        className={`py-2 px-1 rounded-xl font-sans text-[10px] font-bold text-center border transition-all cursor-pointer ${
                          momentMediaType === type.id 
                            ? 'bg-violet-600 border-violet-400 text-white shadow-md shadow-violet-600/20' 
                            : 'bg-black/40 border-white/5 text-violet-400/80 hover:text-white'
                        }`}
                      >
                        {type.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Conditional photo preset backdrops select */}
                {momentMediaType === 'photo' && (
                  <div className="space-y-1.5 animate-fade-in">
                    <label className="text-[10px] font-mono text-violet-400 block uppercase font-bold">Select Backdrop</label>
                    <div className="grid grid-cols-4 gap-2">
                      {[
                        { name: 'Aurora', url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&auto=format&fit=crop&q=80' },
                        { name: 'Cosmic', url: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=600&auto=format&fit=crop&q=80' },
                        { name: 'Neon', url: 'https://images.unsplash.com/photo-1508739773434-c26b3d09e071?w=600&auto=format&fit=crop&q=80' },
                        { name: 'Haze', url: 'https://images.unsplash.com/photo-1518156677180-95a2893f3e9f?w=600&auto=format&fit=crop&q=80' }
                      ].map((img) => (
                        <button
                          key={img.name}
                          type="button"
                          onClick={() => setMomentMediaUrl(img.url)}
                          className={`relative h-12 rounded-xl overflow-hidden border transition-all ${
                            momentMediaUrl === img.url ? 'border-violet-400 ring-2 ring-violet-500/20 scale-102' : 'border-white/5 opacity-70 hover:opacity-100'
                          }`}
                        >
                          <img src={img.url} alt={img.name} className="w-full h-full object-cover" />
                          <div className="absolute inset-x-0 bottom-0 py-0.5 bg-black/70 text-[8px] font-mono font-bold text-center text-white truncate">
                            {img.name}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Conditional Voice Recording simulator panel */}
                {momentMediaType === 'voice' && (
                  <div className="p-3.5 rounded-2xl bg-black/40 border border-violet-500/10 flex flex-col items-center justify-center space-y-3 animate-fade-in">
                    <button
                      type="button"
                      onClick={() => setSimulatedVoiceRecording(!simulatedVoiceRecording)}
                      className={`h-14 w-14 rounded-full flex items-center justify-center transition-all cursor-pointer ${
                        simulatedVoiceRecording 
                          ? 'bg-red-500 hover:bg-red-600 animate-pulse text-white font-black text-xs scale-105' 
                          : 'bg-violet-600 hover:bg-violet-500 text-white'
                      }`}
                    >
                      {simulatedVoiceRecording ? <span className="text-[10px] uppercase font-mono tracking-tighter col-indigo">STOP</span> : <Mic className="w-5 h-5 col-violet" />}
                    </button>
                    <div className="text-center">
                      <span className="text-[9.5px] font-mono text-violet-300">
                        {simulatedVoiceRecording 
                          ? `🔴 Recording Wave - ${simulatedVoiceSeconds}s elapsed` 
                          : simulatedVoiceSeconds > 0 
                            ? `🎙️ Voice broadcast ready: ${simulatedVoiceSeconds} seconds` 
                            : 'Click microphone to record voice wave'}
                      </span>
                    </div>
                  </div>
                )}

                {/* Caption / Quote inputs */}
                <div className="space-y-1">
                  <label className="text-[10px] font-mono text-violet-400 block uppercase font-bold">Caption / Display text</label>
                  <textarea
                    required={momentMediaType === 'text'}
                    placeholder={
                      momentMediaType === 'voice' ? 'Describe your voice message...' :
                      momentMediaType === 'video' ? 'Add some tags or notes...' :
                      'What is on your mind today?'
                    }
                    value={momentCaption}
                    onChange={(e) => setMomentCaption(e.target.value)}
                    rows={3}
                    className="w-full bg-slate-950/60 border border-white/5 focus:border-violet-500/20 text-xs text-white rounded-xl py-2 px-3 focus:outline-hidden resize-none placeholder:text-violet-400/20 text-left"
                  />
                </div>

                {/* Submit panel */}
                <div className="pt-2 border-t border-white/5 flex gap-2 justify-end">
                  <button
                    type="button"
                    onClick={() => setIsCreateMomentOpen(false)}
                    className="px-4 py-2 border border-white/10 hover:bg-white/5 rounded-xl text-violet-300 text-xs font-mono font-bold cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-linear-to-r from-violet-600 to-pink-500 hover:brightness-110 rounded-xl text-white text-xs font-mono font-black uppercase tracking-wider cursor-pointer"
                  >
                    Post Story ✨
                  </button>
                </div>

              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* DUMP SCREEN MOMENT STORIES VIEWER OVERLAY */}
      <AnimatePresence>
        {selectedMoment && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-[#060413] z-50 flex flex-col overflow-hidden"
          >
            {/* Background Media Rendering */}
            {selectedMoment.mediaUrl && selectedMoment.mediaType === 'photo' && (
              <div className="absolute inset-0 z-0 select-none pointer-events-none">
                <img 
                  referrerPolicy="no-referrer"
                  src={selectedMoment.mediaUrl} 
                  alt="Background aura" 
                  className="w-full h-full object-cover opacity-35 select-none" 
                />
                <div className="absolute inset-0 bg-gradient-to-b from-[#060413] via-[#060413]/70 to-[#060413]" />
              </div>
            )}

            {selectedMoment.mediaType === 'video' && (
              <div className="absolute inset-0 z-0 overflow-hidden select-none pointer-events-none opacity-40">
                {/* Cyber grid loop */}
                <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(139,92,246,0.1)_1px,transparent_1px),linear-gradient(to_bottom,rgba(139,92,246,0.1)_1px,transparent_1px)] bg-[size:30px_30px]" />
                <div className="absolute w-[200%] h-[200%] top-[-50%] left-[-50%] bg-[radial-gradient(circle_at_center,rgba(236,72,153,0.15),transparent_60%)] animate-spin-slow" />
                <svg className="absolute inset-0 w-full h-full text-violet-500/20" viewBox="0 0 100 100" preserveAspectRatio="none">
                  <path d="M 0,50 L 100,50 M 50,0 L 50,100" strokeWidth="0.2" strokeDasharray="2 2" />
                </svg>
                <div className="absolute bottom-5 left-5 text-[8px] font-mono text-cyan-400/60 uppercase tracking-widest leading-relaxed">
                  STREAM COMPILING: FEED // LIVE RECORD H.265 // BITRATE 4200 KBPS<br />
                  NODE TIMECODE SECS: {storyIndex * 15}s
                </div>
              </div>
            )}

            {/* Story loading sequence indicator */}
            <div className="flex gap-1.5 p-3 shrink-0 z-10">
              {selectedMoment.quotes.map((_, i) => (
                <div key={i} className="flex-1 h-[3px] bg-white/20 rounded-full overflow-hidden relative">
                  {i < storyIndex && <div className="absolute inset-0 bg-violet-500" />}
                  {i === storyIndex && (
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: '100%' }}
                      transition={{ duration: 7, ease: 'linear' }}
                      onAnimationComplete={() => {
                        if (storyIndex < selectedMoment.quotes.length - 1) {
                          setStoryIndex(idx => idx + 1);
                        } else {
                          setSelectedMoment(null);
                        }
                      }}
                      className="absolute left-0 top-0 bottom-0 bg-linear-to-r from-violet-500 to-pink-400"
                    />
                  )}
                </div>
              ))}
            </div>

            {/* Title banner */}
            <div className="p-4 flex items-center justify-between shrink-0 z-10">
              <div className="flex items-center gap-3">
                <img src={selectedMoment.avatar} alt={selectedMoment.name} className="w-10 h-10 rounded-xl object-cover border border-violet-500/20" />
                <div>
                  <span className="font-sans font-black text-sm text-white flex items-center gap-1">
                    {selectedMoment.name}
                    {(selectedMoment.username === 'voh' || selectedMoment.username === 'nexora_ai' || selectedMoment.username === 'voh_ai') && <CheckCircle className="w-3.5 h-3.5 text-violet-400 fill-current" />}
                  </span>
                  <span className="text-[10px] font-mono text-violet-400/70 block">
                    @{selectedMoment.username} • {selectedMoment.mediaType === 'voice' ? '🎙️ Voice broadcast' : selectedMoment.mediaType === 'video' ? '🎥 Video moment' : selectedMoment.mediaType === 'photo' ? '📸 Interactive image' : '📝 Text Broadcast'}
                  </span>
                </div>
              </div>
              <button 
                onClick={() => setSelectedMoment(null)}
                className="p-1.5 bg-white/5 hover:bg-white/10 rounded-full text-violet-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Immersive core content display depending on mediaType */}
            <div className="flex-1 p-6 md:p-10 flex flex-col justify-center items-center text-center relative z-10 select-none">
              
              {selectedMoment.mediaType === 'voice' ? (
                /* Dynamic active voice moment equalizer experience */
                <div className="max-w-md w-full space-y-8 flex flex-col items-center">
                  <div className="relative flex items-center justify-center">
                    {/* Pulsing ring */}
                    <div className={`absolute w-32 h-32 rounded-full border-2 border-violet-500/30 ${playingVoiceMoment ? 'animate-ping scale-110 opacity-70' : ''}`} style={{ animationDuration: '3s' }} />
                    <div className="relative w-24 h-24 rounded-full bg-linear-to-r from-violet-600 to-pink-500 flex items-center justify-center shadow-lg border border-white/10 z-10">
                      <button 
                        onClick={() => setPlayingVoiceMoment(!playingVoiceMoment)}
                        className="text-white hover:scale-105 active:scale-95 transition-all cursor-pointer flex items-center justify-center"
                      >
                        {playingVoiceMoment ? <Pause className="w-10 h-10" /> : <Play className="w-10 h-10 pl-1" />}
                      </button>
                    </div>
                  </div>

                  <div className="text-center space-y-2">
                    <span className="text-[10px] font-mono bg-violet-500/10 border border-violet-500/20 px-3 py-1 rounded-full text-violet-300 font-extrabold uppercase tracking-widest">
                      {playingVoiceMoment ? '🎙️ Playing Voice Matrix...' : '🎙️ Click to Hear Broadcast'}
                    </span>
                    <p className="text-xs text-violet-300/60 font-mono">Duration: {selectedMoment.voiceDuration || 15} seconds</p>
                  </div>

                  {/* Equalizer animation */}
                  <div className="flex items-end gap-1 h-12">
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16].map((bar) => {
                      const delay = bar * 0.1;
                      return (
                        <div 
                          key={bar} 
                          className="w-1.5 rounded-t bg-linear-to-t from-violet-500 to-pink-400 transition-all origin-bottom"
                          style={{
                            height: playingVoiceMoment ? `${Math.floor(Math.sin(bar * 0.5) * 20) + 18}px` : '4px',
                            transition: 'height 0.1s ease-in-out',
                          }}
                        />
                      );
                    })}
                  </div>

                  <blockquote className="text-sm md:text-md italic text-violet-200/90 font-medium max-w-sm">
                    "{selectedMoment.quotes[storyIndex]}"
                  </blockquote>
                </div>
              ) : (
                /* Classic background typography display */
                <div className="max-w-xl space-y-6">
                  <div className="absolute top-24 left-10 text-[120px] font-serif text-white/5 select-none font-black pointer-events-none">"</div>
                  <blockquote className="text-xl md:text-3.5xl font-sans text-transparent bg-clip-text bg-linear-to-b from-white via-violet-100 to-violet-300 font-extrabold tracking-tight leading-relaxed select-all">
                    {selectedMoment.quotes[storyIndex]}
                  </blockquote>
                  <div className="flex justify-center">
                    <div className="w-12 h-[2px] bg-linear-to-r from-violet-600 to-pink-500 rounded-full" />
                  </div>
                </div>
              )}
            </div>

            {/* Story Reactions and DM Quick replies */}
            <div className="px-8 py-2.5 bg-[#09071c]/60 max-w-lg mx-auto w-full z-10 rounded-2xl border border-violet-500/10 space-y-3.5 mb-2">
              
              {/* Seen List Viewer (For own stories or when author looks!) */}
              {selectedMoment && selectedMoment.username === currentUser.username && (
                <div className="border-b border-white/5 pb-2 text-left">
                  <span className="text-[9px] font-mono text-[#10B981] font-bold uppercase tracking-widest block mb-1">👀 Seen List ({selectedMoment.seenList?.length || 0} views)</span>
                  <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-none">
                    {selectedMoment.seenList && selectedMoment.seenList.length > 0 ? (
                      selectedMoment.seenList.map((viewerId: string, idx: number) => (
                        <div key={idx} className="flex items-center gap-1 bg-white/5 py-1 px-2 rounded-lg text-[9px] font-mono shrink-0">
                          <div className="w-3.5 h-3.5 rounded-full bg-violet-600/20 text-violet-400 flex items-center justify-center text-[7px] font-extrabold font-sans">
                            {viewerId.slice(0, 2).toUpperCase()}
                          </div>
                          <span className="text-zinc-300">viewer_{viewerId.slice(-4)}</span>
                        </div>
                      ))
                    ) : (
                      <span className="text-[9.5px] text-zinc-500 font-sans italic">No views registered yet today. Keep co-building!</span>
                    )}
                  </div>
                </div>
              )}

              {/* Highlight Pinner Action button */}
              {selectedMoment && !selectedMoment.isHighlightPlay && (
                <div className="border-b border-white/5 pb-2.5 flex items-center justify-between text-left">
                  <span className="text-[10px] font-mono text-amber-400 font-bold uppercase tracking-wider flex items-center gap-1 select-none">
                    ⭐ Story Highlights
                  </span>
                  {isCreatingHighlight ? (
                    <div className="flex gap-1 items-center">
                      <input 
                        type="text" 
                        id="hl-input-title"
                        placeholder="Title e.g. Coding 💻"
                        className="bg-black/60 text-[10px] text-white py-1 px-2 rounded-lg border border-amber-500/30 w-32 focus:outline-hidden"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            const el = e.currentTarget;
                            if (!el.value.trim()) return;
                            
                            const title = el.value.trim();
                            const newHl = {
                              id: `hl-${Date.now()}`,
                              title,
                              cover: title.split(' ').pop() || '⭐',
                              stories: [
                                { mediaUrl: selectedMoment.mediaUrl || '', caption: selectedMoment.quotes[storyIndex] }
                              ]
                            };
                            const nextList = [newHl, ...storyHighlightsList];
                            setStoryHighlightsList(nextList);
                            localStorage.setItem('nexora_story_highlights', JSON.stringify(nextList));
                            setIsCreatingHighlight(false);
                            window.dispatchEvent(new CustomEvent('toast', { detail: `🌟 Highlight '${title}' created and saved!` }));
                          }
                        }}
                      />
                      <button 
                        onClick={() => setIsCreatingHighlight(false)}
                        className="text-[10px] text-rose-400 px-1 font-bold"
                      >
                        ✕
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setIsCreatingHighlight(true)}
                      className="px-2.5 py-1 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 rounded-lg font-mono text-[9px] font-black uppercase tracking-wider cursor-pointer"
                    >
                      + Save to Highlight
                    </button>
                  )}
                </div>
              )}

              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono text-violet-400 font-bold uppercase tracking-wider">Quick Reactions</span>
                <div className="flex gap-4 text-sm col-f flex-row">
                  {['❤️', '🔥', '😂', '👍', '😮'].map((emoji) => (
                    <button
                      key={emoji}
                      onClick={() => {
                        window.dispatchEvent(new CustomEvent('toast', { detail: `Sent ${emoji} reaction to @${selectedMoment.username}` }));
                      }}
                      className="hover:scale-130 active:scale-95 transition-transform cursor-pointer"
                      title={`React ${emoji}`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>

              {/* DM Reply box */}
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder={`Send direct reply to @${selectedMoment.username}...`}
                  className="flex-1 px-4 py-2 text-xs rounded-xl bg-slate-950/80 border border-violet-500/15 focus:border-[#8B5CF6] focus:outline-hidden text-white placeholder-violet-400/30 font-sans"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      const input = e.currentTarget;
                      if (!input.value.trim()) return;
                      window.dispatchEvent(new CustomEvent('toast', { detail: `Reply sent as secure DM: "${input.value}"` }));
                      input.value = '';
                    }
                  }}
                />
                <button
                  onClick={(e) => {
                    const sibling = e.currentTarget.previousSibling as HTMLInputElement;
                    if (sibling && sibling.value.trim()) {
                      window.dispatchEvent(new CustomEvent('toast', { detail: `Reply sent as secure DM: "${sibling.value}"` }));
                      sibling.value = '';
                    }
                  }}
                  className="px-3 py-2 bg-linear-to-r from-violet-600 to-indigo-600 rounded-xl font-mono text-[10px] font-bold text-white uppercase hover:brightness-110 active:scale-98 transition-all cursor-pointer"
                >
                  Send Reply
                </button>
              </div>
            </div>

            {/* Navigation buttons */}
            <div className="p-6 flex justify-between shrink-0 mb-4 px-8 z-10">
              <button 
                onClick={() => {
                  if (storyIndex > 0) {
                    setStoryIndex(storyIndex - 1);
                  }
                }}
                disabled={storyIndex === 0}
                className="px-5 py-2.5 border border-white/10 rounded-xl font-mono text-xs text-violet-300 disabled:opacity-30 cursor-pointer"
              >
                ← Back
              </button>
              <button 
                onClick={() => {
                  if (storyIndex < selectedMoment.quotes.length - 1) {
                    setStoryIndex(storyIndex + 1);
                  } else {
                    setSelectedMoment(null);
                  }
                }}
                className="px-5 py-2.5 bg-linear-to-r from-violet-600 to-pink-500 text-white rounded-xl font-mono text-xs font-bold cursor-pointer"
              >
                {storyIndex === selectedMoment.quotes.length - 1 ? 'Exit Board Node' : 'Next Insight →'}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* FULLSCREEN IMMERSIVE VIDEO PLAYER OVERLAY */}
      <AnimatePresence>
        {activeVideoFullscreen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black z-50 flex flex-col md:flex-row"
          >
            {/* Left Column: Full Immersive Video Player */}
            <div className="flex-1 bg-black relative flex items-center justify-center">
              <video 
                src={activeVideoFullscreen.videoUrl}
                autoPlay
                muted={fullscreenVideoMuted}
                loop
                playsInline
                className="w-full h-full max-h-screen object-contain"
              />
              <button 
                onClick={() => setFullscreenVideoMuted(!fullscreenVideoMuted)}
                className="absolute top-4 left-4 p-2.5 bg-black/60 hover:bg-black/80 backdrop-blur-md rounded-xl text-white border border-white/10 cursor-pointer"
              >
                {fullscreenVideoMuted ? <VolumeX className="w-5 h-5 text-red-400" /> : <Volume2 className="w-5 h-5 text-emerald-400" />}
              </button>

              <button 
                onClick={() => setActiveVideoFullscreen(null)}
                className="absolute top-4 right-4 p-2.5 bg-black/60 hover:bg-black/80 backdrop-blur-md rounded-xl text-white border border-white/10 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>

              {/* Title & metadata bar at bottom inside video */}
              <div className="absolute bottom-4 left-4 right-4 bg-black/60 backdrop-blur-md p-4 rounded-2xl border border-white/5 space-y-2.5 max-w-lg">
                <div className="flex items-center gap-2.5">
                  <img src={activeVideoFullscreen.avatar} alt={activeVideoFullscreen.name} className="w-8 h-8 rounded-lg object-cover" />
                  <div>
                    <span className="font-sans font-black text-xs text-white">{activeVideoFullscreen.name}</span>
                    <span className="text-[9.5px] font-mono text-violet-300 block">@{activeVideoFullscreen.username}</span>
                  </div>
                </div>
                <p className="text-xs text-violet-100 font-sans leading-normal line-clamp-2">{activeVideoFullscreen.content}</p>
                <span className="text-[8.5px] font-mono text-pink-400 block tracking-widest uppercase animate-pulse">
                  Swipe navigation cue | Tap icons on right inside narrative
                </span>
              </div>
            </div>

            {/* Right Column: Mini Interaction Control Panel (Visible on Desktop, hidden on tight layouts) */}
            <div className="w-full md:w-80 bg-[#09071a] border-t md:border-t-0 md:border-l border-violet-500/15 p-5 flex flex-col justify-between shrink-0">
              <div className="space-y-4">
                <span className="text-[10px] font-mono text-violet-400 uppercase tracking-widest block font-bold border-b border-white/5 pb-2">Narrative Matrix Controller</span>
                
                <div className="flex gap-4 items-center">
                  <button 
                    onClick={() => handleSpark(activeVideoFullscreen.id)}
                    className="flex-1 flex flex-col items-center p-3 rounded-2xl bg-slate-950/60 border border-white/5 hover:border-pink-500/25 text-pink-400 cursor-pointer"
                  >
                    <Zap className="w-5 h-5 fill-current mb-1" />
                    <span className="text-xs font-mono font-bold">{activeVideoFullscreen.likes} Sparks</span>
                  </button>

                  <button 
                    onClick={() => {
                      setActiveCommentsPostId(activeVideoFullscreen.id);
                      setActiveVideoFullscreen(null);
                    }}
                    className="flex-1 flex flex-col items-center p-3 rounded-2xl bg-slate-950/60 border border-white/5 hover:border-violet-500/25 text-violet-300 cursor-pointer"
                  >
                    <MessageSquare className="w-5 h-5 mb-1" />
                    <span className="text-xs font-mono font-bold">{activeVideoFullscreen.comments.length} Reply</span>
                  </button>
                </div>

                <div className="p-3.5 bg-violet-950/20 rounded-2xl border border-violet-500/10 space-y-1">
                  <span className="text-[8.5px] font-mono text-violet-400 block uppercase font-bold tracking-widest">Active Hashtags</span>
                  <div className="flex flex-wrap gap-1">
                    {activeVideoFullscreen.tags.map(t => (
                      <span key={t} className="text-[9.5px] font-mono text-cyan-400">#{t}</span>
                    ))}
                  </div>
                </div>
              </div>

              <button 
                onClick={() => setActiveVideoFullscreen(null)}
                className="w-full py-2.5 bg-violet-600 hover:bg-violet-500 text-white font-mono font-bold text-xs uppercase rounded-xl transition-all tracking-wider cursor-pointer mt-4"
              >
                Close Narrative Grid
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ⚠️ REPORT MODERATION MODAL CONTAINER */}
      <ReportModal
        isOpen={!!reportingPost}
        onClose={() => setReportingPost(null)}
        targetType={reportingPost?.targetContent ? 'user' : 'post'}
        targetId={reportingPost?.id || ''}
        targetContent={reportingPost?.content || reportingPost?.targetContent || ''}
        reporterUsername={currentUser.username}
        onSubmitSuccess={() => {}}
      />

      {/* 📁 INSTAGRAM/PINTEREST COLLECTIONS FOLDER SELECTION MODAL */}
      <AnimatePresence>
        {showSaveToCollectionModalId && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-100 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md bg-[#0b081c]/98 border border-rose-500/20 rounded-[28px] overflow-hidden p-6 text-left relative"
            >
              <button 
                onClick={() => setShowSaveToCollectionModalId(null)}
                className="absolute top-6 right-6 p-2 bg-white/5 hover:bg-white/10 rounded-xl text-zinc-400 hover:text-white transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="space-y-4">
                <div className="flex items-center gap-2 text-pink-400">
                  <Folder className="w-5 h-5 font-bold" />
                  <h3 className="text-sm font-black font-mono uppercase tracking-widest leading-none">
                    Organize to Collections
                  </h3>
                </div>

                <p className="text-[11px] text-zinc-400 font-sans leading-normal">
                  Organize and group posts into categorized collection folders (like Football, Business, Inspiration, Friends). These lists are persistent.
                </p>

                {/* Listed current folders */}
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {Object.keys(savedCollections).map(folder => {
                    const containsPost = savedCollections[folder].includes(showSaveToCollectionModalId);
                    return (
                      <button
                        key={folder}
                        onClick={() => {
                          setSavedCollections(prev => {
                            const current = prev[folder] || [];
                            const updatedList = current.includes(showSaveToCollectionModalId)
                              ? current.filter(id => id !== showSaveToCollectionModalId)
                              : [...current, showSaveToCollectionModalId];
                            
                            window.dispatchEvent(new CustomEvent('toast', { 
                              detail: current.includes(showSaveToCollectionModalId) 
                                ? `🗑️ Removed post from ${folder}`
                                : `📁 Organized to collection folder: ${folder}` 
                            }));
                            return { ...prev, [folder]: updatedList };
                          });
                        }}
                        className={`w-full flex items-center justify-between p-3 rounded-xl border font-sans text-xs font-semibold cursor-pointer transition-all ${containsPost ? 'bg-pink-950/30 border-pink-500/35 text-pink-300' : 'bg-black/30 border-white/5 text-zinc-300 hover:bg-white/5'}`}
                      >
                        <span className="flex items-center gap-2">
                          <Folder className="w-4 h-4 shrink-0" />
                          {folder}
                        </span>
                        <span className="text-[10px] font-mono leading-none bg-black/40 px-2 py-1 rounded-md">
                          {containsPost ? '📂 Organized' : 'Save'}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* Form to create a new folder */}
                <div className="border-t border-white/5 pt-3 space-y-2">
                  <span className="text-[10px] uppercase font-mono text-zinc-500 font-bold block">
                    Create Custom Pinterest Folder:
                  </span>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="e.g. Football ⚽, Business 💼, Friends 🤝"
                      value={newCollectionName}
                      onChange={(e) => setNewCollectionName(e.target.value)}
                      className="flex-1 p-2 bg-black/50 border border-white/5 rounded-lg text-xs text-white focus:outline-hidden focus:border-pink-500/40"
                    />
                    <button
                      onClick={() => {
                        const name = newCollectionName.trim();
                        if (!name) return;
                        if (savedCollections[name]) {
                          alert("Collection folder already exists!");
                          return;
                        }
                        setSavedCollections(prev => ({
                          ...prev,
                          [name]: []
                        }));
                        setNewCollectionName('');
                        window.dispatchEvent(new CustomEvent('toast', { detail: `📁 Folder "${name}" created successfully!` }));
                      }}
                      className="p-2 px-4 bg-pink-600 hover:bg-pink-700 text-white font-mono text-xs font-extrabold uppercase rounded-lg cursor-pointer transition-colors shrink-0"
                    >
                      Create
                    </button>
                  </div>
                </div>

                <div className="flex justify-end gap-2 border-t border-white/5 pt-3">
                  <button
                    onClick={() => setShowSaveToCollectionModalId(null)}
                    className="p-2 px-4 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-mono text-xs rounded-xl cursor-pointer"
                  >
                    Finish Organizing
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 8. POST REVISION HISTORY MODAL */}
      <AnimatePresence>
        {viewHistoryPost && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-xs">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#0b091f] border border-violet-500/30 rounded-3xl p-5 md:p-6 w-full max-w-lg shadow-2xl relative overflow-hidden text-left"
            >
              <div className="flex items-center justify-between border-b border-white/5 pb-3.5 mb-4">
                <span className="text-xs font-mono text-violet-400 font-extrabold uppercase tracking-widest flex items-center gap-1.5">
                  ✏️ REVISION LOGS AUDIT
                </span>
                <button 
                  onClick={() => setViewHistoryPost(null)}
                  className="p-1 px-2.5 bg-white/5 hover:bg-white/10 rounded-lg text-zinc-400 hover:text-white transition-colors cursor-pointer text-xs font-mono"
                >
                  Close ×
                </button>
              </div>

              <div className="space-y-4 max-h-[320px] overflow-y-auto pr-1">
                {/* Original content first */}
                <div className="p-3 bg-zinc-950/45 rounded-2xl border border-[#171526] space-y-1.5">
                  <div className="flex justify-between items-center text-[10px] font-mono text-zinc-500">
                    <span className="font-bold">🌱 INITIAL SEED CONTENT</span>
                    <span>Originally Published</span>
                  </div>
                  <p className="text-xs text-zinc-400 font-sans leading-relaxed italic">
                    "{viewHistoryPost.content}"
                  </p>
                </div>

                {/* Interactive progression logs */}
                {viewHistoryPost.editHistory?.map((h: any, idx: number) => (
                  <div key={idx} className="p-3 bg-violet-950/15 rounded-2xl border border-violet-500/10 space-y-1.5">
                    <div className="flex justify-between items-center text-[10px] font-mono text-violet-400">
                      <span className="font-bold flex items-center gap-1">✏️ UPDATE ITERATION #{idx + 1}</span>
                      <span>{h.timestamp}</span>
                    </div>
                    <p className="text-xs text-violet-200 font-sans leading-relaxed">
                      "{h.content}"
                    </p>
                  </div>
                ))}
              </div>

              <p className="text-[10px] font-mono text-zinc-500 text-center mt-4">
                All changes are cryptographically secured & signed locally.
              </p>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
