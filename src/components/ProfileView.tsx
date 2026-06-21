import React, { useState } from 'react';
import { 
  MapPin, 
  Link as LinkIcon, 
  Calendar, 
  Edit3, 
  Check, 
  Heart,
  MessageSquare,
  Award,
  Zap,
  Play,
  Pause,
  Volume2,
  Users,
  Compass,
  FileText,
  Share2,
  UserPlus,
  MessageCircle,
  Download,
  Terminal,
  Pin,
  Flame,
  UserCheck,
  Search,
  X,
  ArrowLeft,
  Settings,
  Shield,
  Lock,
  Eye,
  Bell,
  Sliders,
  Globe,
  Trash2,
  HelpCircle,
  Info,
  Activity
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { User, Post } from '../types';
import PurpleVerifiedBadge from './VohVerifiedBadge';
import RelativeTimestamp from './RelativeTimestamp';
import { MOCK_CREATORS, ADDITIONAL_TEST_ACCOUNTS } from '../data/mockData';
import CreatorDashboardView from './CreatorDashboardView';

interface ProfileViewProps {
  currentUser: User;
  posts: Post[];
  onUpdateProfile: (updatedData: Partial<User>) => void;
  onLikePost: (postId: string) => void;
  isOwnProfile?: boolean;
  onCloseProfile?: () => void;
  onToggleFollow?: (creatorId: string) => void;
  isFollowingField?: boolean;
  onStartChat?: (userId: string) => void;
  onViewProfile?: (userId: string) => void;
  theme?: string;
  setTheme?: (t: any) => void;
  onLogout?: () => void;
}

export default function ProfileView({
  currentUser,
  posts,
  onUpdateProfile,
  onLikePost,
  isOwnProfile = true,
  onCloseProfile,
  onToggleFollow,
  isFollowingField = false,
  onStartChat,
  onViewProfile,
  theme,
  setTheme,
  onLogout
}: ProfileViewProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [profileTab, setProfileTab] = useState<'posts' | 'reels' | 'media' | 'voice' | 'saved' | 'communities' | 'tagged' | 'analytics'>('posts');
  const [isCreatorDashboardOpen, setIsCreatorDashboardOpen] = useState(false);
  const [activeDashboardTab, setActiveDashboardTab] = useState<'overview' | 'content' | 'earnings' | 'insights'>('overview');
  
  // Follower actions state
  const [isFollowing, setIsFollowing] = useState(isFollowingField);
  const [isConnected, setIsConnected] = useState(false);
  const [showShareAlert, setShowShareAlert] = useState(false);
  const [currentPlayingVoice, setCurrentPlayingVoice] = useState<string | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Local state for editing form
  const [editName, setEditName] = useState(currentUser.name);
  const [editBio, setEditBio] = useState(currentUser.bio);
  const [editLocation, setEditLocation] = useState(currentUser.location);
  const [editWebsite, setEditWebsite] = useState(currentUser.website);
  const [editCover, setEditCover] = useState(currentUser.coverImage);
  const [editAvatar, setEditAvatar] = useState(currentUser.avatar);

  const [isWebcamActive, setIsWebcamActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const videoRef = React.useRef<HTMLVideoElement | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);

  // Custom status system states
  const [statusText, setStatusText] = useState<string>(() => {
    return localStorage.getItem(`nexora_status_text_${currentUser.id}`) || currentUser.statusText || 'Online';
  });
  const [statusEmoji, setStatusEmoji] = useState<string>(() => {
    return localStorage.getItem(`nexora_status_emoji_${currentUser.id}`) || currentUser.statusEmoji || '🟢';
  });

  // Pinned showpiece song states
  const [pinnedSong, setPinnedSong] = useState<string>(() => {
    return localStorage.getItem(`nexora_pinned_song_${currentUser.id}`) || currentUser.pinnedMusicSong || 'Unavailable';
  });
  const [pinnedArtist, setPinnedArtist] = useState<string>(() => {
    return localStorage.getItem(`nexora_pinned_artist_${currentUser.id}`) || currentUser.pinnedMusicArtist || 'Davido';
  });
  const [isSongPlaying, setIsSongPlaying] = useState(false);
  const audioCtxRef = React.useRef<AudioContext | null>(null);

  // Edit form synchronization states
  const [editStatusText, setEditStatusText] = useState(statusText);
  const [editStatusEmoji, setEditStatusEmoji] = useState(statusEmoji);
  const [editSong, setEditSong] = useState(pinnedSong);
  const [editArtist, setEditArtist] = useState(pinnedArtist);

  // Pinned post IDs (holds up to 3)
  const [pinnedPostIds, setPinnedPostIds] = useState<string[]>(() => {
    const saved = localStorage.getItem(`nexora_pinned_posts_${currentUser.id}`);
    return saved ? JSON.parse(saved) : [];
  });

  // Toggle pin mechanics (limits to max 3)
  const togglePinPost = (postId: string) => {
    setPinnedPostIds(prev => {
      let updated;
      if (prev.includes(postId)) {
        updated = prev.filter(id => id !== postId);
      } else {
        if (prev.length >= 3) {
          window.dispatchEvent(new CustomEvent('toast', { detail: '⚠️ You can pin a maximum of 3 posts!' }));
          return prev;
        }
        updated = [...prev, postId];
      }
      localStorage.setItem(`nexora_pinned_posts_${currentUser.id}`, JSON.stringify(updated));
      window.dispatchEvent(new CustomEvent('toast', { 
        detail: updated.includes(postId) ? '📌 Post pinned to profile!' : '📌 Post unpinned!' 
      }));
      return updated;
    });
  };

  // Play synthesized audio chords preview using Web Audio API
  const playSynthesizedPreview = () => {
    if (isSongPlaying) {
      if (audioCtxRef.current) {
        audioCtxRef.current.close().catch(() => {});
        audioCtxRef.current = null;
      }
      setIsSongPlaying(false);
      return;
    }

    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) {
        window.dispatchEvent(new CustomEvent('toast', { detail: '⚠️ Audio API not supported on this device!' }));
        return;
      }
      const ctx = new AudioCtx();
      audioCtxRef.current = ctx;
      setIsSongPlaying(true);

      const playPluck = (freq: number, startTime: number, delay = 0) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, startTime + delay);

        gain.gain.setValueAtTime(0.12, startTime + delay);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + delay + 0.85);

        osc.start(startTime + delay);
        osc.stop(startTime + delay + 1.0);
      };

      const now = ctx.currentTime;
      // Synthesize elegant afro-futurist chord plucks
      playPluck(329.63, now, 0); // E4
      playPluck(392.00, now, 0.15); // G4
      playPluck(493.88, now, 0.3); // B4
      playPluck(587.33, now, 0.45); // D5

      setTimeout(() => {
        setIsSongPlaying(false);
        if (audioCtxRef.current) {
          audioCtxRef.current.close().catch(() => {});
          audioCtxRef.current = null;
        }
      }, 2000);

    } catch (e) {
      console.error(e);
      setIsSongPlaying(false);
    }
  };

  React.useEffect(() => {
    return () => {
      if (audioCtxRef.current) {
        audioCtxRef.current.close().catch(() => {});
      }
    };
  }, []);

  const startCamera = async () => {
    setCameraError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { width: 300, height: 300, facingMode: 'user' } 
      });
      setIsWebcamActive(true);
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      }, 100);
    } catch (err: any) {
      console.error(err);
      setCameraError('Unable to access camera.');
      window.dispatchEvent(new CustomEvent('toast', { detail: '⚠️ Camera access denied or unavailable.' }));
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    setIsWebcamActive(false);
  };

  const captureCameraPhoto = () => {
    if (videoRef.current) {
      const video = videoRef.current;
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth || 320;
      canvas.height = video.videoHeight || 320;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        try {
          const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
          setEditAvatar(dataUrl);
          stopCamera();
          window.dispatchEvent(new CustomEvent('toast', { detail: '📸 Quick photo snapped and applied!' }));
        } catch (e) {
          console.error(e);
        }
      }
    }
  };

  const handleGalleryUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          setEditAvatar(reader.result);
          window.dispatchEvent(new CustomEvent('toast', { detail: '📁 Photo uploaded as new avatar!' }));
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const [skillsEndorsements, setSkillsEndorsements] = useState<{ [skill: string]: number }>({
    'Founder Mindset': 420,
    'Product Architecture': 382,
    'Community Engineering': 512,
    'AI Orchestration': 614,
    'Creative Coding': 295
  });
  const [newSkillInput, setNewSkillInput] = useState('');

  // Python Exporter Script Content
  const pythonExporterCode = `#!/usr/bin/env python3
import os
import zipfile
import sys

def package_project():
    print("==================================================================")
    print("      🌌 NEXORA CO-BUILDER PLATFORM - SECURE EXPORTER 🌌")
    print("==================================================================")
    print("Preparing secure workspace compression...")
    
    zip_name = "nexora_project.zip"
    
    excluded_dirs = {
        'node_modules', 'dist', '.git', '.github', '.next', 
        '.cache', 'temp', '__pycache__', '.upm'
    }
    excluded_files = {
        zip_name, '.DS_Store', 'package-lock.json', '.env'
    }

    included_count = 0
    total_lines = 0

    try:
        with zipfile.ZipFile(zip_name, 'w', zipfile.ZIP_DEFLATED) as zipf:
            for root, dirs, files in os.walk('.'):
                dirs[:] = [d for d in dirs if d not in excluded_dirs]
                for file in files:
                    if file in excluded_files:
                        continue
                    file_path = os.path.join(root, file)
                    rel_path = os.path.relpath(file_path, '.')
                    try:
                        with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                            lines = len(f.readlines())
                            total_lines += lines
                    except:
                        lines = 0
                    zipf.write(file_path, rel_path)
                    print(f"📦 Paired & Packaged: {rel_path} ({lines} lines)")
                    included_count += 1
        print("==================================================================")
        print("🎉 COMPILATION SUCCESSFUL!")
        print(f"📁 Export Archive:  {os.path.abspath(zip_name)}")
        print(f"🌐 Packaged Nodes: {included_count} modules")
        print(f"📊 Volume Metrics: {total_lines} total lines of code packed")
        print("==================================================================")
        print("To extract your workspace locally:")
        print("  1. Copy 'nexora_project.zip' to your destination directory.")
        print("  2. Unzip using standard tools or terminal command:")
        print(f"     unzip {zip_name}")
        print("==================================================================")
    except Exception as e:
        print(f"❌ Error: {e}", file=sys.stderr)
        sys.exit(1)

if __name__ == '__main__':
    package_project()`;

  // JavaScript/Node Exporter Script Content
  const jsExporterCode = `#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log("==================================================================");
console.log("      🌌 NEXORA CO-BUILDER PLATFORM - JS NODE EXPORTER 🌌");
console.log("==================================================================");

const backupDir = 'nexora_backup_source';
const excludedDirs = new Set([
  'node_modules', 'dist', '.git', '.github', '.next', 
  '.cache', 'temp', '__pycache__', '.upm', backupDir
]);
const excludedFiles = new Set([
  'nexora_project.zip', '.DS_Store', 'package-lock.json', '.env'
]);

let fileCount = 0;
let totalLines = 0;

function walkSync(dir, callback) {
  const files = fs.readdirSync(dir);
  files.forEach((file) => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      if (!excludedDirs.has(file)) {
        walkSync(filePath, callback);
      }
    } else {
      if (!excludedFiles.has(file)) {
        callback(filePath, stat);
      }
    }
  });
}

try {
  if (fs.existsSync(backupDir)) {
    fs.rmSync(backupDir, { recursive: true, force: true });
  }
  fs.mkdirSync(backupDir);

  walkSync('.', (filePath) => {
    const relPath = path.relative('.', filePath);
    const destPath = path.join(backupDir, relPath);
    fs.mkdirSync(path.dirname(destPath), { recursive: true });
    fs.copyFileSync(filePath, destPath);
    let lines = 0;
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      lines = content.split('\\n').length;
      totalLines += lines;
    } catch (e) {}
    console.log(\`📦 Paired & Backuped: \${relPath} (\${lines} lines)\`);
    fileCount++;
  });

  console.log("==================================================================");
  try {
    const zipName = "nexora_project_js.zip";
    if (fs.existsSync(zipName)) {
      fs.unlinkSync(zipName);
    }
    if (process.platform === 'win32') {
      console.log("On Windows - You can right-click nexora_backup_source -> Compress to ZIP file");
    } else {
      execSync(\`zip -r \${zipName} \${backupDir} > /dev/null\`);
      console.log(\`⚡ Native Unix Zip Compiled: ./\${zipName}\`);
    }
  } catch (err) {}
  console.log("==================================================================");
  console.log("🎉 COMPILATION SUCCESSFUL!");
  console.log(\`🌐 Packaged Nodes: \${fileCount} files\`);
  console.log(\`📊 Volume Metrics: \${totalLines} total lines of code packed\`);
  console.log("==================================================================");
} catch (e) {
  console.error(e);
}
`;

  const downloadScriptFile = (filename: string, content: string) => {
    const element = document.createElement("a");
    const file = new Blob([content], { type: 'text/plain;charset=utf-8' });
    element.href = URL.createObjectURL(file);
    element.download = filename;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  // User connections modal state
  const [isConnectionsModalOpen, setIsConnectionsModalOpen] = useState(false);
  const [connectionsModalTab, setConnectionsModalTab] = useState<'followers' | 'following'>('followers');
  const [connectionSearchQuery, setConnectionSearchQuery] = useState('');

  // Sync editing fields when currentUser changes
  React.useEffect(() => {
    setEditName(currentUser.name);
    setEditBio(currentUser.bio);
    setEditLocation(currentUser.location || '');
    setEditWebsite(currentUser.website || '');
    setEditCover(currentUser.coverImage || '');
    setEditAvatar(currentUser.avatar || '');
    setIsFollowing(isFollowingField);
    setIsEditing(false); // Close edit form on profile transition
  }, [currentUser, isFollowingField]);

  // Connections list source
  const getConnectionsList = () => {
    const allUsersMap = new Map<string, User>();
    
    // Add VOH founder to pool
    allUsersMap.set('user-0', {
      id: 'user-0',
      username: 'voh',
      name: 'VOICE OF HARRISON',
      avatar: '/src/assets/images/voh_logo_avatar_1781774114050.jpg',
      bio: '🌍 Founder of NEXORA — The World\'s Living Social Network\n🧠 Creator of VOH AI\n📍 Nigeria',
      location: 'Nigeria',
      website: 'nexora.ai/voh',
      followers: 1200000,
      following: 10,
      isVerified: true,
      coverImage: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1000&auto=format&fit=crop&q=80',
      joinedDate: 'Joined June 2026',
      reputationPoints: 98700,
      reputationBreakdown: { contributions: 15300, helpfulness: 51200, missionsCompleted: 127, skillsVerified: 32073 },
      interestDNA: {},
      skills: ['Founder']
    });

    // Populate creators & all additional test accounts (including our 1,000 programmatically generated users!)
    MOCK_CREATORS.forEach(c => {
      allUsersMap.set(c.id, c);
    });
    ADDITIONAL_TEST_ACCOUNTS.forEach(a => {
      allUsersMap.set(a.id, a);
    });

    // Merge custom registered accounts from local storage
    try {
      const stored = localStorage.getItem('nexora_registered_accounts');
      if (stored) {
        JSON.parse(stored).forEach((acc: any) => {
          if (acc.user) {
            allUsersMap.set(acc.user.id, acc.user);
          }
        });
      }
    } catch(e) {}

    // Load active follow relationships
    let follows: { followerId: string; followingId: string }[] = [];
    try {
      const rawFollows = localStorage.getItem('nexora_db_follows');
      if (rawFollows) {
        follows = JSON.parse(rawFollows);
      }
    } catch(e) {}

    const list = Array.from(allUsersMap.values());

    if (connectionsModalTab === 'following') {
      const followingIds = follows
        .filter(f => f.followerId === currentUser.id)
        .map(f => f.followingId);

      const followingUsers: User[] = [];
      followingIds.forEach(id => {
        const u = allUsersMap.get(id);
        if (u && id !== currentUser.id) {
          followingUsers.push(u);
        }
      });

      // Show some creators by default if empty or for founder backcompat
      if (followingUsers.length === 0) {
        return list.filter(u => u.id !== currentUser.id && (u.id.startsWith('creator-') || u.id.startsWith('test-'))).slice(0, 10);
      }
      return followingUsers;
    } else {
      const followerIds = follows
        .filter(f => f.followingId === currentUser.id)
        .map(f => f.followerId);

      const followerUsers: User[] = [];
      followerIds.forEach(id => {
        const u = allUsersMap.get(id);
        if (u && id !== currentUser.id) {
          followerUsers.push(u);
        }
      });

      // Show seed people if empty or for founder's massive follower list backcompat
      if (followerUsers.length === 0) {
        return list.filter(u => u.id !== currentUser.id);
      }
      return followerUsers;
    }
  };

  const filteredConnections = getConnectionsList().filter(user => {
    const q = connectionSearchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      user.name.toLowerCase().includes(q) ||
      user.username.toLowerCase().includes(q) ||
      user.bio.toLowerCase().includes(q) ||
      (user.location && user.location.toLowerCase().includes(q))
    );
  });

  // Active posts computation
  const myPosts = posts.filter(post => post.userId === currentUser.id || post.username === currentUser.username);
  
  // Tab computed contents
  const mediaPosts = myPosts.filter(post => post.image);
  const savedPosts = posts.filter(post => post.isBookmarkedByUser);
  const voicePosts = myPosts.filter(post => post.isVoice || post.content.includes('🎙') || post.voiceDuration || post.media?.includes('voice'));

  // Custom mock data for Voice transmission recordings
  const voiceTransmissions = [
    {
      id: 'voice-1',
      title: 'Decentralized Social Web Manifesto',
      description: 'Discussing why social media should focus on real-world connections, human capital balance, and zero cold-starts.',
      duration: '5 mins 12 secs',
      published: 'Uploaded 2 days ago'
    },
    {
      id: 'voice-2',
      title: 'Designing the VOH AI Intelligent Proxy',
      description: 'Introducing a high-utility algorithmic teammate to help index conversations, summarize objectives, and inspire collaborators.',
      duration: '8 mins 45 secs',
      published: 'Uploaded 1 week ago'
    },
    {
      id: 'voice-3',
      title: 'Living Reputation vs. Static Metrics',
      description: 'Explaining our algorithmic shift to helpful broadcasts, active social missions, and verified knowledge endorsements.',
      duration: '12 mins 30 secs',
      published: 'Uploaded 3 weeks ago'
    }
  ];

  // Custom mock data for internal Circles
  const circlesData = [
    { id: 'c-1', name: 'The Football Studio', des: 'The official home of local tournaments & tactical discussions.', members: '1,420 members', status: 'Founder Owned', tag: 'Football' },
    { id: 'c-2', name: 'AI Synthesizers', des: 'Co-programming deep intelligent overlays, voice-thought generators, and spatial code.', members: '3,950 members', status: 'Primary Creator', tag: 'AI' },
    { id: 'c-3', name: 'Nexora Core Architects', des: 'Engineering real-time connection protocols and zero-lag streaming sockets.', members: '12,400 members', status: 'Primary Owner', tag: 'System Engineering' }
  ];

  // Custom mock data for Communities
  const communitiesData = [
    { id: 'com-1', name: 'Nigeria Tech Founders Hub', location: 'Lagos & Abuja, NG', members: '8,410 members', description: 'Co-creating world-class consumer and enterprise systems.' },
    { id: 'com-2', name: 'Berlin Neon Photographers', location: 'Berlin, DE', members: '2,210 members', description: 'Exploring high-contrast retro aesthetics, neon signage, and glass structures.' },
    { id: 'com-3', name: 'EPL Football Analytics', location: 'London, UK / Global', members: '5,120 members', description: 'Tactical analysis, Expected Goals simulations, and historical leagues database.' }
  ];

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    stopCamera();

    // Save status and music details
    localStorage.setItem(`nexora_status_emoji_${currentUser.id}`, editStatusEmoji);
    localStorage.setItem(`nexora_status_text_${currentUser.id}`, editStatusText);
    localStorage.setItem(`nexora_pinned_song_${currentUser.id}`, editSong);
    localStorage.setItem(`nexora_pinned_artist_${currentUser.id}`, editArtist);

    setStatusEmoji(editStatusEmoji);
    setStatusText(editStatusText);
    setPinnedSong(editSong);
    setPinnedArtist(editArtist);

    onUpdateProfile({
      name: editName,
      bio: editBio,
      location: editLocation,
      website: editWebsite,
      coverImage: editCover,
      avatar: editAvatar
    });
    setIsEditing(false);
    window.dispatchEvent(new CustomEvent('toast', { detail: '✨ Profile information successfully synchronized!' }));
  };

  const handleEndorseSkill = (skill: string) => {
    setSkillsEndorsements(prev => ({
      ...prev,
      [skill]: (prev[skill] || 0) + 1
    }));
  };

  const handleAddSkill = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSkillInput.trim()) return;
    const cleanSkill = newSkillInput.trim();
    if (!skillsEndorsements[cleanSkill]) {
      setSkillsEndorsements(prev => ({
        ...prev,
        [cleanSkill]: 1
      }));
    }
    setNewSkillInput('');
  };

  const toggleVoicePlay = (id: string) => {
    if (currentPlayingVoice === id) {
      setCurrentPlayingVoice(null);
    } else {
      setCurrentPlayingVoice(id);
    }
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    }
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toLocaleString();
  };

  if (isCreatorDashboardOpen) {
    return (
      <div id="voh-profile-container-root" className="space-y-6">
        <CreatorDashboardView
          currentUser={currentUser}
          posts={posts}
          onClose={() => setIsCreatorDashboardOpen(false)}
          onUpdateProfile={onUpdateProfile}
          activeTabOverride={activeDashboardTab}
        />
      </div>
    );
  }

  return (
    <div id="voh-profile-container-root" className="space-y-6">
      
      {!isOwnProfile && onCloseProfile && !isSettingsOpen && (
        <button 
          onClick={onCloseProfile}
          className="flex items-center gap-2 px-4 py-2 text-xs font-mono font-black border border-violet-500/20 bg-[#0d0a21]/80 hover:bg-violet-950/40 text-violet-300 rounded-xl transition-all cursor-pointer mb-2 w-max"
        >
          ← BACK TO MY NODE
        </button>
      )}

      <AnimatePresence mode="wait">
        {isSettingsOpen ? (
          <motion.div
            key="voh-settings-page"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 15 }}
            className="p-6 rounded-3xl bg-[#080614] border border-violet-500/20 space-y-6"
          >
            {/* Settings Header */}
            <div className="flex items-center justify-between border-b border-violet-500/10 pb-4">
              <button
                onClick={() => setIsSettingsOpen(false)}
                className="flex items-center gap-1.5 text-xs font-mono text-violet-400 hover:text-white font-extrabold uppercase transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Profile
              </button>
              <span className="text-xs font-mono font-black text-violet-400/80 bg-violet-500/10 px-3 py-1 rounded-full uppercase">
                ⚙️ SECURE SETTINGS
              </span>
            </div>

            {/* Content Categories of Settings */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              {/* Category Selector Side Menu */}
              <div className="flex flex-col gap-2">
                <span className="text-[9px] font-mono uppercase tracking-widest text-violet-400/50 block mb-2 px-2">
                  Options and Preferences
                </span>
                <div className="p-2.5 rounded-3xl bg-black/40 border border-violet-500/5 space-y-1">
                  <div className="p-3 bg-violet-600/10 border border-violet-500/20 rounded-xl text-xs text-white font-sans font-bold flex items-center gap-2.5">
                    <Settings className="w-4 h-4 text-violet-400" />
                    <span>Account Settings</span>
                  </div>
                  <div className="p-3 hover:bg-white/5 rounded-xl text-xs text-current/70 font-sans flex items-center gap-2.5">
                    <Shield className="w-4 h-4 text-cyan-400" />
                    <span>Privacy & Direct Messages</span>
                  </div>
                  <div className="p-3 hover:bg-white/5 rounded-xl text-xs text-current/70 font-sans flex items-center gap-2.5">
                    <Bell className="w-4 h-4 text-pink-400 animate-swing" />
                    <span>Notifications</span>
                  </div>
                  <div className="p-3 hover:bg-white/5 rounded-xl text-xs text-current/70 font-sans flex items-center gap-2.5">
                    <Sliders className="w-4 h-4 text-purple-400" />
                    <span>Themes & Colors</span>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-violet-950/10 border border-violet-500/15">
                  <span className="text-[10px] font-mono text-violet-300 font-bold uppercase block mb-1">
                    🟢 Account Status
                  </span>
                  <p className="text-[10px] text-current/60 font-sans">
                    Your profile is secure, active, and verified on the Nexora platform.
                  </p>
                </div>
              </div>

              {/* Main Settings Subsections */}
              <div className="md:col-span-2 space-y-6">
                
                {/* 1. Account Settings */}
                <div className="p-5 rounded-2xl bg-[#0d0926]/40 border border-violet-500/10 space-y-4">
                  <h4 className="text-xs font-mono uppercase tracking-wider text-violet-300 border-b border-violet-500/10 pb-2 flex items-center gap-2">
                    <Settings className="w-4 h-4 text-violet-400" /> Account Management
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div>
                      <label className="text-[9px] font-mono uppercase text-current/50 block mb-1">Display Name</label>
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-violet-950/40 border border-violet-500/15 focus:outline-hidden focus:border-violet-500 text-white"
                      />
                    </div>
                    <div>
                      <label className="text-[9px] font-mono uppercase text-current/50 block mb-1">HQ Location</label>
                      <input
                        type="text"
                        value={editLocation}
                        onChange={(e) => setEditLocation(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-violet-950/40 border border-violet-500/15 focus:outline-hidden focus:border-violet-500 text-white"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="text-[9px] font-mono uppercase text-current/50 block mb-1">Website Link</label>
                      <input
                        type="text"
                        value={editWebsite}
                        onChange={(e) => setEditWebsite(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-violet-950/40 border border-violet-500/15 focus:outline-hidden focus:border-violet-500 text-white"
                        placeholder="e.g. nexora.ai/voh"
                      />
                    </div>
                    <div className="sm:col-span-2 flex items-center justify-between pt-2 border-t border-violet-500/5 mt-1">
                      <div>
                        <span className="text-[11px] font-sans font-bold text-white block">🟣 Signature Verification Badge</span>
                        <span className="text-[9px] text-current/50 font-sans block">Request official violet badge check</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          const reqs = JSON.parse(localStorage.getItem('nexora_verification_requests') || '[]');
                          if (!reqs.some((r: any) => r.userId === currentUser.id)) {
                            reqs.push({
                              userId: currentUser.id,
                              username: currentUser.username,
                              name: currentUser.name,
                              timestamp: new Date().toISOString()
                            });
                            localStorage.setItem('nexora_verification_requests', JSON.stringify(reqs));
                          }
                          alert("Verification request sent! Only VOICE OF HARRISON receives your application and has absolute authority to grant verification status.");
                        }}
                        className="px-3.5 py-2 bg-violet-600 hover:bg-violet-500 text-white text-[10px] font-mono font-bold rounded-lg uppercase transition-colors cursor-pointer"
                      >
                        Request Badge
                      </button>
                    </div>

                    {/* Creator Mode and Earnings/Wallet Settings */}
                    <div className="sm:col-span-2 pt-4 border-t border-violet-500/10 mt-2 space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-[11px] font-sans font-bold text-white block">🟣 Creator Mode</span>
                          <span className="text-[9px] text-[#A78BFA] font-sans block">Unlock creator analytics, creator mode tools and statistics</span>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input 
                            type="checkbox" 
                            checked={!!currentUser.creatorModeEnabled}
                            onChange={(e) => {
                              onUpdateProfile({ creatorModeEnabled: e.target.checked });
                            }}
                            className="sr-only peer" 
                          />
                          <div className="w-11 h-6 bg-zinc-800 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                        </label>
                      </div>

                      <div className="flex items-center justify-between pt-3 border-t border-violet-500/5">
                        <div>
                          <span className="text-[11px] font-sans font-bold text-white block">🟣 Earnings & Wallet</span>
                          <span className="text-[9px] text-[#A78BFA] font-sans block">Monitor and review your accumulative NEX platform tokens</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            if (!currentUser.creatorModeEnabled) {
                              alert("Please enable Creator Mode to unlock Earnings & Wallet!");
                              return;
                            }
                            setIsSettingsOpen(false);
                            setActiveDashboardTab('earnings');
                            setIsCreatorDashboardOpen(true);
                          }}
                          className={`${
                            currentUser.creatorModeEnabled 
                              ? 'bg-purple-600 hover:bg-purple-500 text-white cursor-pointer' 
                              : 'bg-zinc-900 text-zinc-600 cursor-not-allowed'
                          } px-3.5 py-1.5 text-[10px] font-mono font-bold rounded-lg uppercase transition-all`}
                        >
                          Open Wallet
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 2. Privacy Safeguards */}
                <div className="p-5 rounded-2xl bg-[#0d0926]/40 border border-violet-500/10 space-y-3">
                  <h4 className="text-xs font-mono uppercase tracking-wider text-violet-300 border-b border-violet-500/10 pb-2 flex items-center gap-2">
                    <Shield className="w-4 h-4 text-cyan-400" /> Privacy & Direct Messages
                  </h4>
                  <div className="space-y-2.5 text-xs text-current/80 font-sans">
                    <div className="flex items-center justify-between p-2.5 rounded-xl bg-black/20 border border-white/5">
                      <div>
                        <span className="font-bold text-white block text-[11px]">Private Account Feed</span>
                        <span className="text-[9px] text-current/50 block">Only approved followers can view your detailed posts</span>
                      </div>
                      <input type="checkbox" className="w-4 h-4 rounded-sm border-current accent-violet-500 cursor-pointer" />
                    </div>
                    <div className="flex items-center justify-between p-2.5 rounded-xl bg-black/20 border border-white/5">
                      <div>
                        <span className="font-bold text-white block text-[11px]">Online Activity Status</span>
                        <span className="text-[9px] text-current/50 block">Show a green indicator when active</span>
                      </div>
                      <input type="checkbox" defaultChecked className="w-4 h-4 rounded-sm border-current accent-violet-500 cursor-pointer" />
                    </div>
                  </div>
                </div>

                {/* 3. Notification Settings */}
                <div className="p-5 rounded-2xl bg-[#0d0926]/40 border border-violet-500/10 space-y-3">
                  <h4 className="text-xs font-mono uppercase tracking-wider text-violet-300 border-b border-violet-500/10 pb-2 flex items-center gap-2">
                    <Bell className="w-4 h-4 text-pink-400" /> In-App Notification Preferences
                  </h4>
                  <div className="space-y-2.5 text-xs text-current/80 font-sans">
                    <div className="flex items-center justify-between p-1.5">
                      <span className="text-[11px] font-black">Direct Message Alerts</span>
                      <input type="checkbox" defaultChecked className="w-4 h-4 accent-violet-500 cursor-pointer" />
                    </div>
                    <div className="flex items-center justify-between p-1.5">
                      <span className="text-[11px] font-black">New Followers & Updates</span>
                      <input type="checkbox" defaultChecked className="w-4 h-4 accent-violet-500 cursor-pointer" />
                    </div>
                    <div className="flex items-center justify-between p-1.5">
                      <span className="text-[11px] font-black">VOH AI Suggestions Digest</span>
                      <input type="checkbox" className="w-4 h-4 accent-violet-500 cursor-pointer" />
                    </div>
                  </div>
                </div>

                {/* 4. Appearance Settings */}
                {setTheme && theme && (
                  <div className="p-5 rounded-2xl bg-[#0d0926]/40 border border-violet-500/10 space-y-3">
                    <h4 className="text-xs font-mono uppercase tracking-wider text-violet-300 border-b border-violet-500/10 pb-2 flex items-center gap-2">
                      <Sliders className="w-4 h-4 text-purple-400" /> Theme Personalizations
                    </h4>
                    <p className="text-[10px] text-current/60 font-sans">
                      Select a visual theme mode to customize your Nexora experience:
                    </p>
                    <div className="grid grid-cols-2 gap-2.5">
                      {[
                        { id: 'neon-cyber', label: 'Cyber Void', color: 'bg-violet-600', text: 'Neon Violet' },
                        { id: 'stealth-dark', label: 'Stealth Slate', color: 'bg-zinc-700', text: 'Classic Off-Black' },
                        { id: 'emerald-glass', label: 'Matrix Emerald', color: 'bg-emerald-600', text: 'Classy Green' },
                        { id: 'platinum-light', label: 'Ivory Platinum', color: 'bg-slate-200 border border-slate-400', text: 'Bright Clinical' },
                      ].map((t) => (
                        <button
                          key={t.id}
                          onClick={() => setTheme(t.id as any)}
                          className={`p-3 rounded-xl border text-left transition-all hover:scale-102 flex flex-col justify-between h-20 cursor-pointer ${
                            theme === t.id
                              ? 'bg-white/10 border-[#8B5CF6] shadow-sm ring-1 ring-[#8B5CF6]/50'
                              : 'bg-black/40 border-white/5 hover:bg-white/5'
                          }`}
                        >
                          <div className="flex justify-between items-center w-full">
                            <span className="text-[10px] font-bold text-white font-sans">{t.label}</span>
                            <div className={`w-3 h-3 rounded-full ${t.color}`} />
                          </div>
                          <span className="text-[8px] font-mono text-[#8B5CF6]">{t.text}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* 5. Security & Account Safeguards */}
                <div className="p-5 rounded-2xl bg-[#0d0926]/40 border border-violet-500/10 space-y-3">
                  <h4 className="text-xs font-mono uppercase tracking-wider text-violet-300 border-b border-violet-500/10 pb-2 flex items-center gap-2">
                    <Lock className="w-4 h-4 text-yellow-500" /> Platform Security
                  </h4>
                  <div className="text-xs space-y-2 font-sans">
                    <div className="flex justify-between p-2 rounded-lg bg-black/20">
                      <div>
                        <span className="font-bold text-white block text-[11px]">2-Factor Authentication</span>
                        <span className="text-[9px] text-current/50">Enable 2FA login verification code checks</span>
                      </div>
                      <input type="checkbox" className="w-4 h-4 accent-violet-500 cursor-pointer" />
                    </div>
                    <div className="mt-2 text-[9px] text-current/30 font-mono">
                      LAST LOGIN: Lagos, Nigeria • Active desktop session
                    </div>
                  </div>
                </div>

                {/* 6. Content & Storage Management */}
                <div className="p-5 rounded-2xl bg-[#0d0926]/40 border border-violet-500/10 space-y-3">
                  <h4 className="text-xs font-mono uppercase tracking-wider text-violet-300 border-b border-violet-500/10 pb-2 flex items-center gap-2">
                    <Sliders className="w-4 h-4 text-purple-400" /> Content & Storage Management
                  </h4>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => alert("Browser cache storage successfully cleared!")}
                      className="px-3.5 py-1.5 bg-current/5 hover:bg-current/10 text-current text-[10px] font-mono font-bold rounded-lg uppercase cursor-pointer"
                    >
                      Clear Saved Cache
                    </button>
                    <button 
                      onClick={() => alert("Loading past activity summaries...")}
                      className="px-3.5 py-1.5 bg-current/5 hover:bg-current/10 text-current text-[10px] font-mono font-bold rounded-lg uppercase cursor-pointer"
                    >
                      Audit Activity Logs
                    </button>
                  </div>
                </div>

                {/* 7. VOH AI Integration Preferences */}
                <div className="p-5 rounded-2xl bg-[#0d0926]/40 border border-violet-500/10 space-y-3">
                  <h4 className="text-xs font-mono uppercase tracking-wider text-violet-300 border-b border-violet-500/10 pb-2 flex items-center gap-2">
                    <Activity className="w-4 h-4 text-violet-400" /> VOH AI Companion Customizations
                  </h4>
                  <div className="space-y-1.5 text-xs">
                    <span className="text-[10px] font-bold text-violet-300 block">AI Assistant Personality: Casual, Friendly & Helpful</span>
                    <div className="w-full bg-violet-950/40 h-1.5 rounded-full">
                      <div className="w-[85%] h-full bg-violet-500 rounded-full" />
                    </div>
                  </div>
                </div>

                {/* 8. Trends Preferences */}
                <div className="p-5 rounded-2xl bg-[#0d0926]/40 border border-violet-500/10 space-y-3">
                  <h4 className="text-xs font-mono uppercase tracking-wider text-violet-300 border-b border-violet-500/10 pb-2 flex items-center gap-2">
                    <Globe className="w-4 h-4 text-cyan-400" /> Regional Trending Customizations
                  </h4>
                  <div className="space-y-2 text-xs">
                    <span className="font-bold text-[11px] text-white">Location for Trend Customizations</span>
                    <input 
                      type="text" 
                      defaultValue="Lagos, Nigeria"
                      className="w-full px-3 py-1.5 text-[11px] bg-violet-950/20 border border-violet-500/10 rounded-lg text-white"
                    />
                  </div>
                </div>

                {/* 9. Communities roles */}
                <div className="p-5 rounded-2xl bg-[#0d0926]/40 border border-violet-500/10 space-y-3">
                  <h4 className="text-xs font-mono uppercase tracking-wider text-violet-300 border-b border-violet-500/10 pb-2 flex items-center gap-2">
                    <Users className="w-4 h-4 text-purple-400" /> Communities Roles Guide
                  </h4>
                  <p className="text-[10.5px] text-current/60 leading-snug">
                    You hold <strong>Founder Admin rights</strong> in 3 core community spaces, and verified membership in 15 active local groups.
                  </p>
                </div>

                {/* VOH ONLY NOTIFICATION CENTER FOR BADGE REQUESTS */}
                {currentUser.username === 'voh' && (
                  <div className="p-5 rounded-2xl bg-black/40 border border-violet-500/20 space-y-3 mt-4 text-left">
                    <h4 className="text-xs font-mono uppercase tracking-wider text-violet-300 border-b border-violet-500/10 pb-2 flex items-center gap-2">
                      <Award className="w-4 h-4 text-violet-400" /> Pending Verification Notifications
                    </h4>
                    <span className="text-[9px] font-mono text-violet-400 block uppercase">
                      Admin review channel
                    </span>
                    <div className="space-y-2 mt-2">
                      {(() => {
                        const [requests, setRequests] = React.useState<any[]>([]);
                        React.useEffect(() => {
                          const reqs = JSON.parse(localStorage.getItem('nexora_verification_requests') || '[]');
                          setRequests(reqs);
                        }, []);

                        const handleDismiss = (userId: string) => {
                          const updated = requests.filter((r: any) => r.userId !== userId);
                          localStorage.setItem('nexora_verification_requests', JSON.stringify(updated));
                          setRequests(updated);
                          alert("Verification request reviewed and archived. Consistent with policies, only VOICE OF HARRISON is authorized to display the exclusive purple verification tick.");
                        };

                        if (requests.length === 0) {
                          return (
                            <p className="text-[10.5px] text-current/50 italic font-sans py-2">
                              No pending verification requests in the queue.
                            </p>
                          );
                        }

                        return requests.map((req: any, i: number) => (
                          <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-violet-950/25 border border-violet-500/15">
                            <div className="min-w-0 pr-2">
                              <p className="text-[11px] font-black text-white truncate">@{req.username}</p>
                              <p className="text-[9px] text-violet-300/60 truncate">{req.name}</p>
                            </div>
                            <button
                              onClick={() => handleDismiss(req.userId)}
                              className="px-2.5 py-1 bg-violet-600/30 hover:bg-violet-600/60 text-white rounded-md text-[9px] font-mono uppercase transition-colors cursor-pointer"
                            >
                              Review & Archive
                            </button>
                          </div>
                        ));
                      })()}
                    </div>
                  </div>
                )}

                {/* 10. Support Form */}
                <div className="p-5 rounded-2xl bg-[#0d0926]/40 border border-violet-500/10 space-y-3">
                  <h4 className="text-xs font-mono uppercase tracking-wider text-violet-300 border-b border-violet-500/10 pb-2 flex items-center gap-2">
                    <HelpCircle className="w-4 h-4 text-blue-400" /> Nexora Support Desk
                  </h4>
                  <div className="space-y-2">
                    <textarea 
                      placeholder="How can we help you today with your Nexora experience?..." 
                      className="w-full p-2.5 bg-violet-950/20 border border-violet-500/10 rounded-xl text-xs text-white"
                      rows={2}
                    />
                    <button 
                      onClick={() => alert("Your message has been sent to our customer support team!")}
                      className="px-3.5 py-1.5 bg-violet-600 hover:bg-violet-500 text-white text-[10px] font-mono font-bold rounded-lg uppercase cursor-pointer"
                    >
                      Send Support Ticket
                    </button>
                  </div>
                </div>

                {/* 11. DEVELOPER WORKSPACE EXPORTER CONSOLE COMPONENT - VISIBLE ONLY TO FOUNDER VOICE OF HARRISON */}
                {isOwnProfile && currentUser.username === 'voh' && (
                  <div className="p-5 rounded-2xl bg-linear-to-b from-[#150f38] to-[#05030f] border border-violet-500/30 space-y-4">
                    <div className="flex items-center justify-between border-b border-violet-500/10 pb-3">
                      <h4 className="text-xs font-mono uppercase tracking-wider text-transparent bg-clip-text bg-linear-to-r from-violet-400 via-pink-400 to-cyan-400 font-extrabold flex items-center gap-2">
                        <Terminal className="w-4 h-4 text-violet-400 animate-pulse" /> Code Exporter Console
                      </h4>
                      <span className="text-[8px] font-mono bg-violet-500/20 text-violet-300 px-2 py-0.5 rounded border border-violet-500/30 uppercase tracking-widest font-black">
                        V2.1 // OFFLINE BYPASS
                      </span>
                    </div>

                    <p className="text-[10.5px] font-sans text-violet-200/80 leading-relaxed text-left">
                      Save all workspace files and customized parameters to your <strong>local drive/local storage</strong> instantly. We have pre-compiled standalone package-recovery modules in both <strong>Python</strong> and <strong>Node.js (JavaScript)</strong>.
                    </p>

                    {/* Direct script downloads */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                      {/* Python module download */}
                      <div className="p-3.5 rounded-xl bg-black/40 border border-violet-500/10 flex flex-col justify-between hover:border-violet-500/30 transition-all group">
                        <div className="space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-mono font-bold text-violet-300">🐍 Python Downloader</span>
                            <span className="text-[8px] font-mono text-violet-400/40 uppercase">download_project.py</span>
                          </div>
                          <p className="text-[9.5px] text-current/60 font-sans leading-normal">
                            A clean python routine that walks directory trees and bundles all assets in a standard compressed ZIP archive.
                          </p>
                        </div>
                        <div className="pt-3 flex flex-col gap-2">
                          <div className="p-1 px-2.5 rounded bg-black/60 border border-white/5 font-mono text-[9px] text-cyan-400/80 truncate">
                            $ python download_project.py
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              downloadScriptFile('download_project.py', pythonExporterCode);
                            }}
                            className="w-full py-1.5 bg-violet-600/20 hover:bg-violet-600 border border-violet-500/30 text-white font-mono text-[10px] font-bold rounded-lg uppercase flex items-center justify-center gap-1.5 transition-all active:scale-98 cursor-pointer"
                          >
                            <Download className="w-3.5 h-3.5" /> Save Python Script
                          </button>
                        </div>
                      </div>

                      {/* Node JS module download */}
                      <div className="p-3.5 rounded-xl bg-black/40 border border-violet-500/10 flex flex-col justify-between hover:border-violet-500/30 transition-all group">
                        <div className="space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-mono font-bold text-violet-300">⚡ JS Node Exporter</span>
                            <span className="text-[8px] font-mono text-violet-400/40 uppercase">download_project.js</span>
                          </div>
                          <p className="text-[9.5px] text-current/60 font-sans leading-normal">
                            A direct Node.js utility runner that creates a backup directory and compiles files on Unix/macOS or Windows instantly.
                          </p>
                        </div>
                        <div className="pt-3 flex flex-col gap-2">
                          <div className="p-1 px-2.5 rounded bg-black/60 border border-white/5 font-mono text-[9px] text-cyan-400/80 truncate">
                            $ node download_project.js
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              downloadScriptFile('download_project.js', jsExporterCode);
                            }}
                            className="w-full py-1.5 bg-violet-600/20 hover:bg-violet-600 border border-violet-500/30 text-white font-mono text-[10px] font-bold rounded-lg uppercase flex items-center justify-center gap-1.5 transition-all active:scale-98 cursor-pointer"
                          >
                            <Download className="w-3.5 h-3.5" /> Save Node JS Script
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Interactive ZIP instructions guide */}
                    <div className="p-3.5 rounded-xl bg-violet-950/20 border border-violet-500/20 space-y-1.5 text-left">
                      <span className="text-[10.5px] font-mono font-black text-cyan-400 flex items-center gap-1">
                        ✨ Official Workspace Recovery Guide
                      </span>
                      <p className="text-[9.8px] text-violet-300/80 font-sans leading-relaxed">
                        To download <strong>everything co-created here</strong> (including full React sources, configs, linter schemes, and package dependencies) in one fully packaged file directly to your hard drive:
                      </p>
                      <ol className="text-[9.2px] text-current/60 font-mono list-decimal pl-4.5 space-y-1 leading-normal">
                        <li>Locate the <strong>Google AI Studio Interface</strong>.</li>
                        <li>In the top right-hand corner of the workspace, click on the **⚙️ settings/three-dot overlay menu**.</li>
                        <li>Select <strong>Download ZIP</strong> or click <strong>Export to GitHub</strong> to archive all repository parameters instantly!</li>
                      </ol>
                    </div>
                  </div>
                )}

                {/* 12. About Nexora info */}
                <div className="p-5 rounded-2xl bg-[#0d0926]/40 border border-violet-500/15 space-y-2 text-center sm:text-left">
                  <span className="text-[10px] font-mono text-violet-400 font-extrabold flex items-center justify-center sm:justify-start gap-1">
                    <Info className="w-3.5 h-3.5" /> ABOUT NEXORA NETWORK
                  </span>
                  <p className="text-[10px] text-current/50 font-sans leading-relaxed">
                    NEXORA Living Node social system • Version 2.1.0-STABLE.<br />
                    All nodes synchronized on safe cryptographic parameters.<br />
                    Copyright © 2026 Nexora Foundation. All rights reserved.
                  </p>
                </div>

                {/* Sign out and Save button */}
                <div className="pt-4 border-t border-violet-500/10 flex flex-wrap gap-2 justify-between items-center">
                  {onLogout && (
                    <button
                      type="button"
                      onClick={onLogout}
                      className="px-4 py-2 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-400 text-[10px] font-mono font-bold rounded-lg uppercase cursor-pointer"
                    >
                      🚪 Sign Out of Nexora
                    </button>
                  )}
                  <button
                    onClick={() => {
                      onUpdateProfile({
                        name: editName,
                        bio: editBio,
                        location: editLocation,
                        website: editWebsite,
                        coverImage: editCover,
                        avatar: editAvatar
                      });
                      setIsSettingsOpen(false);
                    }}
                    className="px-5 py-2.5 text-[10px] font-mono font-bold rounded-xl bg-linear-to-r from-violet-600 to-pink-500 hover:brightness-110 text-white uppercase tracking-wider cursor-pointer"
                  >
                    Save & Return
                  </button>
                </div>

              </div>

            </div>

          </motion.div>
        ) : (
          <motion.div
            key="voh-profile-content"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-6"
          >
            {/* Immersive Cover Photo and Avatar Banner */}
            <div id="voh-profile-imagery-header" className="relative rounded-3xl overflow-hidden border border-violet-500/20 bg-slate-950 shadow-2xl">
              <div className="h-44 w-full overflow-hidden relative">
                <div className="absolute inset-0 bg-gradient-to-t from-[#020108] via-[#020108]/30 to-transparent z-1" />
                <img 
                  src={currentUser.coverImage || "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1200&auto=format&fit=crop&q=80"} 
                  alt="NEXORA Living Space" 
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover opacity-75" 
                />
              </div>
              
              {/* Profile Avatar Position */}
              <div className="absolute left-6 bottom-[-24px] z-10 flex items-end gap-4">
                <img 
                  src={currentUser.avatar || "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=180&auto=format&fit=crop&q=80"} 
                  alt={currentUser.name} 
                  referrerPolicy="no-referrer"
                  className="w-24 h-24 rounded-2xl object-cover ring-4 ring-violet-500 shadow-xl bg-slate-900" 
                />
                <div className="pb-3 hidden sm:block">
                  <div className="flex items-center gap-1.5">
                    <span className="text-white text-md font-bold font-sans">
                      {currentUser.name}
                    </span>
                    {(currentUser.username === 'voh' || currentUser.isVerified) && <PurpleVerifiedBadge className="w-5 h-5" />}
                  </div>
                  <p className="text-[11px] text-violet-400 font-mono font-medium">@{currentUser.username}</p>
                </div>
              </div>

              {/* Edit Action Overlay & Top-Right Settings trigger */}
              <div className="absolute right-4 bottom-4 z-10 flex items-center gap-2">
                {isOwnProfile && (
                  <>
                    <button
                      onClick={() => {
                        if (isEditing) {
                          stopCamera();
                        }
                        setIsEditing(!isEditing);
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-mono font-black bg-[#0d0a21]/90 hover:bg-violet-950/90 hover:text-violet-300 text-white rounded-lg border border-violet-500/20 backdrop-blur-md transition-all shadow-lg cursor-pointer"
                    >
                      {isEditing ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Edit3 className="w-3.5 h-3.5 text-violet-400" />}
                      <span>{isEditing ? 'Cancel Edit' : 'Edit Profile'}</span>
                    </button>
                    <button
                      onClick={() => setIsSettingsOpen(true)}
                      className="p-1.5 rounded-lg border border-violet-500/20 bg-[#0d0a21]/90 text-violet-400 hover:text-white cursor-pointer"
                      title="Open Settings Console (⚙️)"
                    >
                      <Settings className="w-4 h-4 animate-spin-slow" />
                    </button>
                  </>
                )}
              </div>
            </div>

      {/* Editing Form Section */}
      <AnimatePresence mode="wait">
        {isEditing ? (
          <motion.form
            key="voh-edit-form"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            onSubmit={handleSaveProfile}
            className="p-6 rounded-3xl bg-[#090715] border border-violet-500/30 space-y-4 shadow-xl"
            id="voh-edit-profile-form"
          >
            <h4 className="text-xs font-mono font-black uppercase text-violet-400">
              Update Founder Node Parameters
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[9px] font-mono uppercase text-[#A78BFA]/75">Display Name</label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  required
                  className="w-full px-3 py-2 text-xs rounded-xl bg-violet-950/40 border border-violet-500/20 focus:outline-none focus:border-violet-500/50 text-white transition-colors"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-mono uppercase text-[#A78BFA]/75">Twitter/Website Link</label>
                <input
                  type="text"
                  value={editWebsite}
                  onChange={(e) => setEditWebsite(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-violet-950/40 border border-violet-500/20 focus:outline-none focus:border-violet-500/50 text-white transition-colors"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-mono uppercase text-[#A78BFA]/75">HQ Node (Location)</label>
                <input
                  type="text"
                  value={editLocation}
                  onChange={(e) => setEditLocation(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-violet-950/40 border border-violet-500/20 focus:outline-none focus:border-violet-500/50 text-white transition-colors"
                />
              </div>

              <div className="md:col-span-2 space-y-2 p-4 bg-violet-950/20 rounded-2xl border border-violet-500/10 text-left">
                <span className="text-[10px] font-mono uppercase text-[#A78BFA] font-bold block">
                  👤 Profile Picture Node Configuration
                </span>
                
                <div className="flex flex-col sm:flex-row gap-4 items-center sm:items-start pt-1">
                  {/* Miniature Portrait Node Preview */}
                  <div className="relative group shrink-0">
                    <img 
                      src={editAvatar || "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=180&auto=format&fit=crop&q=80"} 
                      className="w-16 h-16 rounded-2xl object-cover ring-2 ring-violet-500/30 bg-slate-950" 
                    />
                    <span className="absolute -bottom-1 -right-1 bg-violet-600 border border-violet-400 text-white text-[8px] font-mono px-1 rounded scale-90 leading-none py-0.5">
                      Preview
                    </span>
                  </div>

                  {/* Shutter Camera / File selector Actions */}
                  <div className="flex-1 w-full space-y-2.5">
                    {isWebcamActive ? (
                      <div className="space-y-2">
                        <div className="relative rounded-xl overflow-hidden bg-black border border-violet-500/30 max-w-xs mx-auto sm:mx-0">
                          <video 
                            ref={videoRef} 
                            autoPlay 
                            playsInline 
                            className="w-full h-32 object-cover" 
                          />
                          <div className="absolute top-1.5 left-1.5 bg-black/60 px-1.5 py-0.5 rounded text-[8px] font-mono text-fuchsia-400 animate-pulse border border-fuchsia-400/20">
                            SHUTTER ACTIVE
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={captureCameraPhoto}
                            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-mono rounded-lg transition-colors cursor-pointer font-bold uppercase leading-none"
                          >
                            📷 Capture Frame
                          </button>
                          <button
                            type="button"
                            onClick={stopCamera}
                            className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-rose-400 text-[10px] font-mono rounded-lg border border-rose-500/10 transition-colors cursor-pointer uppercase leading-none"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-1.5">
                        <p className="text-[10px] text-violet-300 font-sans">
                          Take a direct snapshot from your webcam or select a custom image file:
                        </p>
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={startCamera}
                            className="px-3.5 py-2 bg-violet-600/20 hover:bg-violet-600/30 border border-violet-500/30 text-violet-300 text-[10px] font-mono rounded-lg transition-all cursor-pointer flex items-center gap-1.5 uppercase font-bold"
                          >
                            📸 Snap Quick Shot
                          </button>
                          <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="px-3.5 py-2 bg-cyan-600/10 hover:bg-cyan-600/20 border border-cyan-500/20 text-cyan-300 text-[10px] font-mono rounded-lg transition-all cursor-pointer flex items-center gap-1.5 uppercase font-bold"
                          >
                            📁 Choose Photo File
                          </button>
                          
                          {/* Hidden actual file input element */}
                          <input 
                            type="file" 
                            ref={fileInputRef} 
                            onChange={handleGalleryUpload} 
                            accept="image/*" 
                            className="hidden" 
                          />
                        </div>
                      </div>
                    )}

                    {/* Keep general raw avatar URL field accessible in case user prefers CDN or static asset urls */}
                    <div className="space-y-1 text-left pt-1">
                      <label className="text-[8.5px] font-mono uppercase text-violet-400/70">Or specify static image index address (URL)</label>
                      <input
                        type="url"
                        value={editAvatar}
                        onChange={(e) => setEditAvatar(e.target.value)}
                        className="w-full px-3 py-1.5 text-[10.5px] rounded-lg bg-zinc-950/60 border border-violet-500/20 focus:outline-none focus:border-violet-500/50 text-white font-mono"
                        placeholder="https://example.com/matrix_avatar.jpg"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="md:col-span-2 space-y-1">
                <label className="text-[9px] font-mono uppercase text-[#A78BFA]/75">Biographical Summary</label>
                <textarea
                  value={editBio}
                  onChange={(e) => setEditBio(e.target.value)}
                  rows={4}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-violet-950/40 border border-violet-500/20 focus:outline-none focus:border-violet-500/50 text-white transition-colors"
                />
              </div>
            </div>

            {/* Personality Settings */}
            <div className="pt-4 border-t border-violet-500/10 space-y-4 text-left">
              <h5 className="text-xs font-bold font-sans text-white uppercase tracking-wider">
                🟣 Personality Systems (Status & Music)
              </h5>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-mono uppercase text-violet-400">Set Custom Activity Status</label>
                  <div className="flex gap-2">
                    <select
                      value={editStatusEmoji}
                      onChange={(e) => setEditStatusEmoji(e.target.value)}
                      className="bg-zinc-950/80 border border-violet-500/20 text-white rounded-xl p-2 text-xs focus:outline-none"
                    >
                      <option value="🟢">🟢 Online</option>
                      <option value="🎮">🎮 Gaming</option>
                      <option value="💻">💻 Working</option>
                      <option value="📚">📚 Studying</option>
                      <option value="☕">☕ Break</option>
                      <option value="⚽">⚽ Football</option>
                      <option value="🔥">🔥 Cooking</option>
                    </select>
                    <input
                      type="text"
                      value={editStatusText}
                      onChange={(e) => setEditStatusText(e.target.value)}
                      placeholder="Custom status text (e.g. Studying, Gaming, working)"
                      className="flex-1 bg-[#150e3a]/50 border border-violet-500/25 rounded-xl p-2 px-3 text-xs text-white placeholder-violet-400/50"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-mono uppercase text-violet-400">Pin Showpiece Song (Show on Profile)</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={editSong}
                      onChange={(e) => setEditSong(e.target.value)}
                      placeholder="Song Title (e.g. Blinding Lights)"
                      className="w-1/2 bg-[#150e3a]/50 border border-violet-500/25 rounded-xl p-2 px-3 text-xs text-white placeholder-violet-400/50"
                    />
                    <input
                      type="text"
                      value={editArtist}
                      onChange={(e) => setEditArtist(e.target.value)}
                      placeholder="Artist (e.g. The Weeknd)"
                      className="w-1/2 bg-[#150e3a]/50 border border-violet-500/25 rounded-xl p-2 px-3 text-xs text-white placeholder-violet-400/50"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Appearance Settings Section within Profile Settings */}
            {setTheme && theme && (
              <div className="pt-4 border-t border-violet-500/10 space-y-3 text-left">
                <h5 className="text-xs font-bold font-sans text-white uppercase tracking-wider">
                  🎨 Appearance (Interface Theme)
                </h5>
                <p className="text-[10px] text-current/60 font-sans">
                  Select a premium aesthetic interface config for your NEXORA experience:
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {[
                    { id: 'neon-cyber', label: 'Cyber Void', color: 'bg-violet-600', text: 'Neon Violet' },
                    { id: 'stealth-dark', label: 'Stealth Slate', color: 'bg-zinc-700', text: 'Classic Off-Black' },
                    { id: 'emerald-glass', label: 'Matrix Emerald', color: 'bg-emerald-600', text: 'Classy Green' },
                    { id: 'platinum-light', label: 'Ivory Platinum', color: 'bg-slate-200 border border-slate-400', text: 'Bright Clinical' },
                  ].map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setTheme(t.id as any)}
                      className={`p-3 rounded-xl border text-left transition-all hover:scale-102 flex flex-col justify-between h-20 cursor-pointer ${
                        theme === t.id
                          ? 'bg-white/10 border-[#8B5CF6] shadow-sm ring-1 ring-[#8B5CF6]/50'
                          : 'bg-black/40 border-white/5 hover:bg-white/5'
                      }`}
                    >
                      <div className="flex justify-between items-center w-full">
                        <span className="text-[10px] font-bold text-white font-sans">{t.label}</span>
                        <div className={`w-3 h-3 rounded-full ${t.color}`} />
                      </div>
                      <span className="text-[8px] font-mono text-[#8B5CF6]">{t.text}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Account Settings Section with Logout button */}
            {onLogout && (
              <div className="pt-4 border-t border-violet-500/10 space-y-3 text-left">
                <h5 className="text-xs font-bold font-sans text-white uppercase tracking-wider">
                  ⚙️ Account Management
                </h5>
                <p className="text-[10px] text-current/60 font-sans">
                  Safely sign out or terminate your current session on this device:
                </p>
                <button
                  type="button"
                  onClick={onLogout}
                  className="w-full sm:w-auto px-4 py-2 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 hover:border-rose-500/50 text-rose-400 text-xs font-mono font-bold rounded-lg transition-all uppercase tracking-wider cursor-pointer"
                >
                  🚪 Log Out of Nexora
                </button>
              </div>
            )}

            <div className="pt-4 border-t border-violet-500/10 flex justify-end gap-2">
              <button
                type="submit"
                className="w-full sm:w-auto px-5 py-2.5 text-xs font-mono font-bold rounded-xl bg-linear-to-r from-violet-600 to-pink-500 hover:brightness-110 text-white shadow-lg shadow-violet-500/25 transition-all text-center uppercase tracking-wider cursor-pointer"
              >
                Save Settings
              </button>
            </div>
          </motion.form>
        ) : (
          <motion.div
            key="voh-display-info"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="pt-2 space-y-4 text-left"
          >
            {/* Unified Compact Profile Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pl-1">
              {/* Left Side: Avatar & Name details */}
              <div className="flex items-center gap-4">
                <img 
                  src={currentUser.avatar || "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=180&auto=format&fit=crop&q=80"} 
                  alt={currentUser.name} 
                  referrerPolicy="no-referrer"
                  className="w-20 h-20 sm:w-24 sm:h-24 rounded-full object-cover ring-4 ring-violet-500 shadow-xl bg-slate-900 border border-violet-500/15" 
                />
                <div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <h2 className="text-xl sm:text-2xl font-black font-sans text-white leading-tight">
                      {currentUser.name}
                    </h2>
                    {(currentUser.username === 'voh' || currentUser.isVerified) && <PurpleVerifiedBadge className="w-5 h-5 shrink-0" />}
                  </div>
                  <p className="text-xs sm:text-sm text-violet-400 font-mono">@{currentUser.username}</p>
                  
                  {/* Small Brand / Creator Sub-tag */}
                  <p className="text-[10px] sm:text-xs font-mono text-purple-200/85 mt-1">
                    {currentUser.username === 'voh' ? '⚡ Nexora Founder' : '👤 Nexora Member'}
                  </p>
                </div>
              </div>

              {/* Right Side / Top: Clean action buttons */}
              <div className="flex flex-wrap items-center gap-2">
                {isOwnProfile ? (
                  <button
                    onClick={() => setIsEditing(true)}
                    className="flex items-center gap-1.5 px-4 py-2 text-xs font-mono bg-[#0d0a21]/90 hover:bg-violet-950/90 hover:text-violet-300 text-white rounded-xl border border-violet-500/20 backdrop-blur-md transition-all shadow-lg cursor-pointer"
                  >
                    <Edit3 className="w-3.5 h-3.5 text-violet-400" />
                    <span>Edit Profile</span>
                  </button>
                ) : (
                  <>
                    <button
                      onClick={() => {
                        if (onToggleFollow) {
                          onToggleFollow(currentUser.id);
                        }
                        setIsFollowing(!isFollowing);
                      }}
                      className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-mono font-black transition-all cursor-pointer ${
                        isFollowing 
                          ? 'bg-violet-950/65 text-violet-300 border border-violet-500/30 hover:bg-violet-900/40' 
                          : 'bg-violet-600 text-white hover:bg-violet-550 active:scale-95'
                      }`}
                    >
                      {isFollowing ? <UserCheck className="w-4 h-4 text-violet-400" /> : <UserPlus className="w-4 h-4" />}
                      <span>{isFollowing ? 'FOLLOWED' : 'FOLLOW'}</span>
                    </button>

                    <button
                      onClick={() => {
                        if (onStartChat) {
                          onStartChat(currentUser.id);
                        } else {
                          alert(`Opening chat with @${currentUser.username}...`);
                        }
                      }}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-mono font-black border border-violet-500/20 bg-violet-500/5 hover:bg-violet-500/15 text-violet-200 transition-all active:scale-95 cursor-pointer"
                    >
                      <MessageCircle className="w-4 h-4 text-violet-400" />
                      <span>MESSAGE</span>
                    </button>
                  </>
                )}

                <div className="relative">
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(`https://nexora.ai/${currentUser.username}`);
                      setShowShareAlert(true);
                      setTimeout(() => setShowShareAlert(false), 2000);
                    }}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-mono font-black border border-violet-500/20 bg-violet-500/5 hover:bg-violet-500/15 text-violet-200 transition-all active:scale-95 cursor-pointer"
                  >
                    <Share2 className="w-4 h-4 text-violet-400" />
                    <span>SHARE</span>
                  </button>
                  {showShareAlert && (
                    <span className="absolute bottom-10 left-1/2 -translate-x-1/2 px-2.5 py-1 bg-violet-600 text-white font-mono text-[9px] rounded-lg tracking-wider whitespace-nowrap animate-bounce shadow-lg z-50">
                      COPIED!
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Personality Status Section */}
            <div className="pl-1 flex flex-wrap items-center gap-2 pt-1">
              <span className="text-[10px] uppercase font-mono px-2.5 py-1 rounded-xl bg-violet-950/50 text-violet-200 border border-violet-500/20 flex items-center gap-1.5 shadow-sm">
                <span className="animate-pulse">{statusEmoji}</span>
                <span className="font-extrabold tracking-wider">{statusText}</span>
              </span>

              {/* Trusted Expert Badges */}
              {(currentUser.username === 'voh' || currentUser.username === 'voh_ai') && (
                <span className="text-[10px] uppercase font-mono px-2.5 py-1 rounded-xl bg-amber-500/10 text-amber-300 border border-amber-500/20 flex items-center gap-1.5" title="Earned through football contributions">
                  <span>⚽</span> Football Expert
                </span>
              )}
              {(currentUser.username === 'nexora_ai' || currentUser.username === 'voh_ai') && (
                <span className="text-[10px] uppercase font-mono px-2.5 py-1 rounded-xl bg-blue-500/10 text-blue-300 border border-blue-500/20 flex items-center gap-1.5" title="Verified system programmer">
                  <span>💻</span> Technical Developer
                </span>
              )}
              {currentUser.username === 'creator-1' && (
                <span className="text-[10px] uppercase font-mono px-2.5 py-1 rounded-xl bg-pink-500/10 text-pink-300 border border-pink-500/20 flex items-center gap-1.5" title="Verified interface designer">
                  <span>🎨</span> Lead Designer
                </span>
              )}
            </div>

            {/* Compact Bio Paragraph & Location info */}
            <div className="pl-1 space-y-2 text-xs">
              {currentUser.bio && (
                <p className="text-violet-100 font-sans leading-relaxed whitespace-pre-wrap max-w-2xl bg-[#09061c]/40 p-3 rounded-2xl border border-violet-500/5">
                  {currentUser.bio}
                </p>
              )}

              {/* Pin Showpiece Song Preview */}
              {(pinnedSong || pinnedArtist) && (
                <div className="flex items-center justify-between gap-3 bg-linear-to-r from-violet-950/40 via-purple-950/10 to-pink-950/20 border border-violet-500/15 p-2 px-3 rounded-2xl max-w-md shadow-md">
                  <div className="flex items-center gap-2">
                    <div className="relative flex items-center justify-center w-8 h-8 rounded-full bg-violet-500/10 border border-violet-500/20">
                      {isSongPlaying ? (
                        <div className="flex gap-0.5 items-end h-3">
                          <span className="w-1 bg-violet-400 h-2 animate-bounce" style={{ animationDelay: '0.1s' }} />
                          <span className="w-1 bg-pink-400 h-3 animate-bounce" style={{ animationDelay: '0.3s' }} />
                          <span className="w-1 bg-violet-400 h-1.5 animate-bounce" style={{ animationDelay: '0s' }} />
                        </div>
                      ) : (
                        <Volume2 className="w-4 h-4 text-violet-400" />
                      )}
                    </div>
                    <div className="text-left">
                      <p className="text-[10px] font-mono text-violet-400 uppercase tracking-widest leading-none">PINNED TRACK</p>
                      <h5 className="text-[11px] font-sans font-bold text-white leading-tight mt-0.5">{pinnedSong}</h5>
                      <p className="text-[9.5px] font-sans text-violet-300/60 leading-none">{pinnedArtist}</p>
                    </div>
                  </div>
                  <button
                    onClick={playSynthesizedPreview}
                    className="p-1 px-3.5 rounded-xl text-[10px] font-mono font-bold bg-[#8B5CF6]/15 hover:bg-[#8B5CF6]/30 border border-[#8B5CF6]/25 text-[#D8B4FE] transition-all hover:scale-103 cursor-pointer"
                  >
                    {isSongPlaying ? 'PAUSE PREVIEW' : 'TAP TO PREVIEW'}
                  </button>
                </div>
              )}

              <div className="flex flex-wrap items-center gap-y-1.5 gap-x-4 text-[11px] font-mono text-violet-300">
                {currentUser.location && (
                  <div className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-violet-400" />
                    <span>{currentUser.location}</span>
                  </div>
                )}
                {currentUser.website && currentUser.website.trim() !== '' && (
                  <div className="flex items-center gap-1">
                    <LinkIcon className="w-3.5 h-3.5 text-violet-400" />
                    <a 
                      href={`https://${currentUser.website}`} 
                      target="_blank" 
                      rel="noreferrer" 
                      className="hover:text-violet-300 underline decoration-violet-500/40 transition-colors"
                    >
                      {currentUser.website}
                    </a>
                  </div>
                )}
                <div className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-violet-400" />
                  <span>Joined {currentUser.joinedDate}</span>
                </div>
              </div>

              {/* Owner visitor analytics */}
              {isOwnProfile && (
                <div className="flex items-center gap-1.5 text-[10.5px] text-violet-300/80 font-mono bg-violet-950/25 px-3.5 py-1.5 rounded-xl border border-violet-500/10 w-fit mt-1">
                  <Eye className="w-3.5 h-3.5 text-violet-400 animate-pulse" />
                  <span><strong className="text-white">127</strong> real humans visited your profile this week.</span>
                  <span className="text-[9px] text-[#A78BFA]/60">(visible only to you)</span>
                </div>
              )}
            </div>

            {/* Nexora Aesthetic Stats Grid */}
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 py-3.5 border-y border-violet-500/10 text-xs pl-1">
              <div>
                <span className="font-bold text-white font-sans mr-1">{myPosts.length}</span>
                <span className="text-violet-400 font-sans">posts</span>
              </div>
              <button 
                onClick={() => {
                  setConnectionsModalTab('followers');
                  setConnectionSearchQuery('');
                  setIsConnectionsModalOpen(true);
                }}
                className="hover:text-violet-300 cursor-pointer text-left"
              >
                <span className="font-bold text-white font-sans mr-1">{formatNumber(currentUser.followers)}</span>
                <span className="text-violet-400 font-sans">followers</span>
              </button>
              <button 
                onClick={() => {
                  setConnectionsModalTab('following');
                  setConnectionSearchQuery('');
                  setIsConnectionsModalOpen(true);
                }}
                className="hover:text-violet-300 cursor-pointer text-left"
              >
                <span className="font-bold text-white font-sans mr-1">{currentUser.following}</span>
                <span className="text-violet-400 font-sans">following</span>
              </button>
              <div className="flex items-center gap-0.5">
                <span className="font-bold text-yellow-400 font-sans mr-1">⚡ {formatNumber(currentUser.sparks || 0)}</span>
                <span className="text-violet-400 font-sans">sparks</span>
              </div>
              <div className="flex items-center gap-0.5">
                <span className="font-bold text-violet-300 font-sans mr-1">⭐ {formatNumber(currentUser.reputationPoints)}</span>
                <span className="text-violet-400 font-sans">reputation</span>
              </div>
            </div>

            {/* REAL ACHIEVEMENT BADGES SHELF */}
            <div className="p-4 rounded-2xl bg-linear-to-b from-[#100c2a]/80 to-[#070514]/90 border border-violet-500/15 text-left mt-2 shadow-inner">
              <span className="text-[9.5px] font-mono uppercase tracking-widest text-violet-400 font-bold flex items-center gap-1.5 mb-2.5">
                <Award className="w-3.5 h-3.5 text-violet-400" />
                <span>Credentials & Credentials (Achievements)</span>
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                {[
                  { title: "First Post", desc: "Shared thoughts with the Nexora world.", emoji: "🏆" },
                  { title: "100 Followers", desc: "A true community starting to grow.", emoji: "🏆" },
                  { title: "Builder Guild", desc: "Co-programmed a collaborative hub.", emoji: "🏆" },
                  { title: "Viral Message", desc: "Resonated with over hundreds of fans.", emoji: "🏆" },
                  { title: "Top Contributor", desc: "Granted maximum reputation bonus.", emoji: "🏆" }
                ].map((ach, idx) => (
                  <div key={idx} className="p-2 bg-[#130f35]/50 rounded-xl border border-violet-500/5 hover:border-violet-500/20 transition-all flex flex-col justify-between h-20 group relative overflow-hidden">
                    <div className="absolute top-1 right-1 text-xs opacity-80">{ach.emoji}</div>
                    <div className="mt-3">
                      <h4 className="text-[10px] font-sans font-extrabold text-white leading-tight group-hover:text-violet-300 transition-colors">{ach.title}</h4>
                      <p className="text-[8px] font-sans text-zinc-400 leading-none mt-1">{ach.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Creator Tools Section - Only shown on user's own profile */}
            {isOwnProfile && (
              <div className="p-4 rounded-2xl bg-[#0e0a25]/60 border border-violet-500/15 text-left mt-3.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="space-y-1">
                  <h3 className="text-xs font-mono uppercase tracking-wider text-violet-400 font-extrabold flex items-center gap-1.5">
                    <span>👉</span> Creator Tools
                  </h3>
                  <h4 className="text-sm font-sans font-black text-white">Creator Dashboard</h4>
                  <p className="text-[11px] text-zinc-400 font-sans">
                    View analytics, earnings and audience growth.
                  </p>
                </div>
                
                <div>
                  <button
                    type="button"
                    onClick={() => {
                      if (!currentUser.creatorModeEnabled) {
                        onUpdateProfile({ creatorModeEnabled: true });
                      }
                      setActiveDashboardTab('overview');
                      setIsCreatorDashboardOpen(true);
                    }}
                    className="bg-purple-600 hover:bg-purple-500 text-white px-4 py-2.5 text-[11px] font-mono font-black rounded-xl uppercase transition-all flex items-center gap-1.5 border border-transparent cursor-pointer"
                  >
                    <Sliders className="w-3.5 h-3.5 text-inherit" />
                    <span>Open Dashboard</span>
                  </button>
                </div>
              </div>
            )}

            {/* Advanced Developer / Network parameters (collapsed by default) */}
            <div className="pt-2">
              <button
                type="button"
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="text-[10px] font-mono text-violet-500 hover:text-violet-300 transition-colors flex items-center gap-1 cursor-pointer pl-1"
              >
                {showAdvanced ? '▼ Hide premium account insights' : '▶ Show premium account insights'}
              </button>

              <AnimatePresence>
                {showAdvanced && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden space-y-4 pt-3"
                  >
                    {/* Primary Statistics Grid - Combined Metrics */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
                      <div className="p-3 bg-violet-950/20 border border-violet-500/10 rounded-2xl">
                        <p className="text-[9px] font-mono text-violet-400 uppercase tracking-wider font-extrabold text-left">Reputation Points</p>
                        <p className="text-lg font-mono font-black text-white mt-1 text-left">{formatNumber(currentUser.reputationPoints)}</p>
                      </div>

                      <div className="p-3 bg-violet-950/20 border border-violet-500/10 rounded-2xl">
                        <p className="text-[9px] font-mono text-violet-400 uppercase tracking-wider font-extrabold text-left font-semibold">Contributions</p>
                        <p className="text-lg font-mono font-black text-cyan-400 mt-1 text-left">{formatNumber(currentUser.reputationBreakdown?.contributions || 0)}</p>
                      </div>

                      <div className="p-3 bg-violet-950/20 border border-violet-500/10 rounded-2xl">
                        <p className="text-[9px] font-mono text-violet-400 uppercase tracking-wider text-left">Sync Status</p>
                        <p className="text-sm font-mono font-bold text-emerald-400 mt-1 text-left">🟢 synced</p>
                      </div>

                      <div className="p-3 bg-violet-950/20 border border-violet-500/10 rounded-2xl">
                        <p className="text-[9px] font-mono text-violet-400 uppercase tracking-wider text-left">Reputation Rank</p>
                        <p className="text-sm font-mono font-bold text-pink-400 mt-1 text-left">Elite Level</p>
                      </div>
                    </div>

                    {/* VOH AI Profile Summary Block */}
                    <div className="p-4 rounded-2xl bg-[#0a071d] border border-violet-500/20 shadow-md relative overflow-hidden text-left">
                      <h3 className="text-[10px] font-mono uppercase text-[#A78BFA] font-black tracking-widest flex items-center gap-1.5 mb-2">
                        <span>🧠</span>
                        <span>AI Profile Insight</span>
                      </h3>
                      <p className="text-xs text-violet-100/90 leading-relaxed font-sans italic">
                        {currentUser.username === 'voh' 
                          ? '"VOICE OF HARRISON is the founder of NEXORA and creator of VOH AI. A technology entrepreneur and community builder focused on creating innovative platforms that help people connect, collaborate, learn, and grow."'
                          : `"${currentUser.name} is an active member of the NEXORA community. They have established a dynamic reputation rating of ${currentUser.reputationPoints} points with strong community contributions."`}
                      </p>
                    </div>

                    {/* Pinned Founder Message */}
                    {currentUser.username === 'voh' && (
                      <div className="p-4 rounded-2xl bg-[#0d0926]/40 border border-violet-500/30 shadow-md relative pl-11 text-left">
                        <div className="absolute left-4 top-4.5">
                          <Pin className="w-4 h-4 text-violet-400 rotate-45" />
                        </div>
                        <h4 className="text-[10px] font-mono uppercase text-violet-400 font-bold tracking-widest mb-1.5">
                          📌 Pinned Founder Message
                        </h4>
                        <blockquote className="text-xs text-white leading-relaxed font-sans border-l-2 border-violet-500/50 pl-3 italic space-y-2">
                          <p>Welcome to NEXORA.</p>
                          <p>Social media should be more than content and scrolling. It should help people discover opportunities, build communities, learn from one another, and create real impact.</p>
                          <cite className="block text-[10px] text-violet-300 font-mono not-italic mt-2">
                            — VOICE OF HARRISON <PurpleVerifiedBadge className="w-3.5 h-3.5" />
                          </cite>
                        </blockquote>
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Profile Tabs List with exactly 8 categories - horizontally smooth scrolling */}
      <div id="voh-profile-tabs-selector" className="border-b border-violet-500/10 pt-4 overflow-x-auto scrollbar-none">
        <div className="flex gap-2 text-center text-[10px] sm:text-xs font-mono font-bold px-2 pb-1.5 min-w-max">
          <button
            onClick={() => setProfileTab('posts')}
            className={`pb-2 px-3 relative flex items-center gap-1.5 cursor-pointer uppercase tracking-wider ${
              profileTab === 'posts' ? 'text-violet-400 font-extrabold' : 'text-violet-300/60 hover:text-white'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Posts</span>
            {profileTab === 'posts' && (
              <motion.div layoutId="vohProfileTabLine" className="absolute bottom-0 inset-x-0 h-0.5 bg-violet-500" />
            )}
          </button>

          <button
            onClick={() => setProfileTab('reels')}
            className={`pb-2 px-3 relative flex items-center gap-1.5 cursor-pointer uppercase tracking-wider ${
              profileTab === 'reels' ? 'text-pink-500 font-extrabold' : 'text-violet-300/60 hover:text-white'
            }`}
          >
            <span>🎥 Videos</span>
            {profileTab === 'reels' && (
              <motion.div layoutId="vohProfileTabLine" className="absolute bottom-0 inset-x-0 h-0.5 bg-pink-500" />
            )}
          </button>

          <button
            onClick={() => setProfileTab('media')}
            className={`pb-2 px-3 relative flex items-center gap-1.5 cursor-pointer uppercase tracking-wider ${
              profileTab === 'media' ? 'text-violet-400 font-extrabold' : 'text-violet-300/60 hover:text-white'
            }`}
          >
            <span>🖼️ Photos</span>
            {profileTab === 'media' && (
              <motion.div layoutId="vohProfileTabLine" className="absolute bottom-0 inset-x-0 h-0.5 bg-violet-500" />
            )}
          </button>
          
          <button
            onClick={() => setProfileTab('voice')}
            className={`pb-2 px-3 relative flex items-center gap-1.5 cursor-pointer uppercase tracking-wider ${
              profileTab === 'voice' ? 'text-violet-400 font-extrabold' : 'text-violet-300/60 hover:text-white'
            }`}
          >
            <span>🎙️ Voice</span>
            {profileTab === 'voice' && (
              <motion.div layoutId="vohProfileTabLine" className="absolute bottom-0 inset-x-0 h-0.5 bg-violet-500" />
            )}
          </button>

          <button
            onClick={() => setProfileTab('saved')}
            className={`pb-2 px-3 relative flex items-center gap-1.5 cursor-pointer uppercase tracking-wider ${
              profileTab === 'saved' ? 'text-[#8B5CF6] font-extrabold' : 'text-violet-300/60 hover:text-white'
            }`}
          >
            <Lock className="w-3.5 h-3.5" />
            <span>Saved</span>
            {profileTab === 'saved' && (
              <motion.div layoutId="vohProfileTabLine" className="absolute bottom-0 inset-x-0 h-0.5 bg-[#8B5CF6]" />
            )}
          </button>

          <button
            onClick={() => setProfileTab('communities')}
            className={`pb-2 px-3 relative flex items-center gap-1.5 cursor-pointer uppercase tracking-wider ${
              profileTab === 'communities' ? 'text-cyan-400 font-extrabold' : 'text-violet-300/60 hover:text-white'
            }`}
          >
            <span>🏟️ Spaces</span>
            {profileTab === 'communities' && (
              <motion.div layoutId="vohProfileTabLine" className="absolute bottom-0 inset-x-0 h-0.5 bg-cyan-700" />
            )}
          </button>

          <button
            onClick={() => setProfileTab('tagged')}
            className={`pb-2 px-3 relative flex items-center gap-1.5 cursor-pointer uppercase tracking-wider ${
              profileTab === 'tagged' ? 'text-orange-400 font-extrabold' : 'text-violet-300/60 hover:text-white'
            }`}
          >
            <span>🏷️ Tagged</span>
            {profileTab === 'tagged' && (
              <motion.div layoutId="vohProfileTabLine" className="absolute bottom-0 inset-x-0 h-0.5 bg-orange-500" />
            )}
          </button>

          <button
            onClick={() => setProfileTab('analytics')}
            className={`pb-2 px-3 relative flex items-center gap-1.5 cursor-pointer uppercase tracking-wider ${
              profileTab === 'analytics' ? 'text-yellow-400 font-extrabold' : 'text-violet-300/60 hover:text-white'
            }`}
          >
            <Activity className="w-3.5 h-3.5 text-yellow-400" />
            <span>📊 Insights</span>
            {profileTab === 'analytics' && (
              <motion.div layoutId="vohProfileTabLine" className="absolute bottom-0 inset-x-0 h-0.5 bg-yellow-500" />
            )}
          </button>
        </div>
      </div>

      {/* Tab Render Content */}
      <div id="voh-tab-content-render" className="space-y-4 pt-2">
        
        {/* Contributions tab */}
        {profileTab === 'posts' && (() => {
          const sortedMyPosts = [...myPosts].sort((a, b) => {
            const isAPinned = pinnedPostIds.includes(a.id);
            const isBPinned = pinnedPostIds.includes(b.id);
            if (isAPinned && !isBPinned) return -1;
            if (!isAPinned && isBPinned) return 1;
            return 0;
          });
          return (
            <div className="grid grid-cols-1 gap-4">
              {sortedMyPosts.length === 0 ? (
                <div className="p-8 text-center rounded-2xl border border-dashed border-violet-500/20 bg-[#070513]/50">
                  <p className="text-xs font-mono text-violet-400/50">
                    No posts found in this profile.
                  </p>
                </div>
              ) : (
                sortedMyPosts.map(post => {
                  const isPinned = pinnedPostIds.includes(post.id);
                  return (
                    <div 
                      key={post.id} 
                      className={`p-5 rounded-3xl bg-[#0b091c]/80 border transition-all flex flex-col justify-between ${
                        isPinned 
                          ? 'border-violet-500/45 shadow-lg shadow-violet-500/5 bg-[#120a2e]/90 ring-1 ring-violet-500/20' 
                          : 'border-violet-500/10 hover:border-violet-500/25'
                      }`}
                    >
                      <div>
                        <div className="flex justify-between items-start mb-2.5">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-xs font-sans font-bold text-white">{post.name}</span>
                            {(post.username === 'voh' || post.username === 'nexora_ai') && <PurpleVerifiedBadge className="w-3.5 h-3.5" />}
                            <span className="text-[10px] font-mono text-violet-400">@{post.username}</span>
                            
                            {isPinned && (
                              <span className="flex items-center gap-0.5 bg-violet-600 text-white font-mono text-[8.5px] px-1.5 py-0.5 rounded-md tracking-wider">
                                <Pin className="w-2.5 h-2.5 fill-current transform rotate-45" />
                                <span>PINNED</span>
                              </span>
                            )}
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <span className="text-[9px] font-mono text-violet-400">
                              <RelativeTimestamp timestamp={post.timestamp} />
                            </span>
                            {/* Toggle Pinned Status Button */}
                            {isOwnProfile && (
                              <button
                                onClick={() => togglePinPost(post.id)}
                                className={`p-1 rounded-lg transition-colors cursor-pointer ${
                                  isPinned 
                                    ? 'bg-violet-600/20 text-violet-300 hover:bg-violet-600/30' 
                                    : 'hover:bg-violet-500/10 text-violet-400/40 hover:text-violet-200'
                                }`}
                                title={isPinned ? "Unpin post" : "Pin post to profile"}
                              >
                                <Pin className={`w-3.5 h-3.5 ${isPinned ? 'fill-current transform rotate-45 text-violet-400' : ''}`} />
                              </button>
                            )}
                          </div>
                        </div>
                        
                        <p className="text-xs text-violet-100 font-sans leading-relaxed mb-3">
                          {post.content}
                        </p>

                        {post.image && (
                          <img 
                            src={post.image} 
                            alt="Thumbnail attachment" 
                            referrerPolicy="no-referrer"
                            className="w-full max-h-[220px] object-cover rounded-xl border border-violet-500/10 mb-3" 
                          />
                        )}
                      </div>

                      <div className="flex items-center gap-4 pt-3 border-t border-violet-500/5 text-[10px] text-violet-300">
                        <button 
                          onClick={() => onLikePost(post.id)}
                          className="flex items-center gap-1 hover:text-rose-400 transition-colors"
                        >
                          <Heart className="w-3.5 h-3.5 text-rose-500/60" />
                          <span>{post.likes}</span>
                        </button>
                        <div className="flex items-center gap-1">
                          <MessageSquare className="w-3.5 h-3.5 text-violet-500/60" />
                          <span>{post.comments?.length || 0}</span>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          );
        })()}

        {/* Media Tab */}
        {profileTab === 'media' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {mediaPosts.length === 0 ? (
              <div className="p-8 text-center rounded-2xl border border-dashed border-violet-500/20 bg-[#070513]/50 col-span-2">
                <p className="text-xs font-mono text-violet-400/50">
                  No media posts found in this profile.
                </p>
              </div>
            ) : (
              mediaPosts.map(post => (
                <div 
                  key={post.id} 
                  className="p-4 rounded-3xl bg-[#090718] border border-violet-500/10 flex flex-col justify-between"
                >
                  <div>
                    <div className="overflow-hidden rounded-xl border border-violet-500/10 mb-3 relative aspect-video bg-black/40">
                      <img 
                        src={post.image} 
                        alt="Media upload" 
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover" 
                      />
                    </div>
                    <p className="text-xs text-violet-100 font-sans leading-relaxed line-clamp-2 mb-2">
                      {post.content}
                    </p>
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t border-violet-500/5 text-[9px] font-mono text-violet-300">
                    <span><RelativeTimestamp timestamp={post.timestamp} /></span>
                    <span className="flex items-center gap-1">
                      <Heart className="w-3 h-3 text-rose-500" /> {post.likes} likes
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Voice Tab */}
        {profileTab === 'voice' && (
          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-[#090718] border border-violet-500/20">
              <div className="flex items-center gap-2 mb-2 text-violet-300">
                <Volume2 className="w-4 h-4 text-violet-400 animate-bounce" />
                <span className="text-[10px] font-mono uppercase tracking-wider font-extrabold">Voice Posts</span>
              </div>
              <p className="text-xs text-violet-100/75 font-sans leading-relaxed">
                Listen to voice posts shared on this profile.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-3">
              {voiceTransmissions.map(voice => {
                const isPlaying = currentPlayingVoice === voice.id;
                return (
                  <div 
                    key={voice.id} 
                    className={`p-4 rounded-2xl border transition-all duration-300 ${
                      isPlaying 
                        ? 'bg-violet-950/40 border-violet-500/50 shadow-lg shadow-violet-500/10' 
                        : 'bg-[#0b091c]/70 border-violet-500/10 hover:border-violet-500/25'
                    }`}
                  >
                    <div className="flex items-start gap-4">
                      <button
                        onClick={() => toggleVoicePlay(voice.id)}
                        className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition-transform active:scale-90 ${
                          isPlaying ? 'bg-linear-to-r from-violet-600 to-pink-500 text-white' : 'bg-violet-500/10 text-violet-400 hover:bg-violet-500/20'
                        }`}
                      >
                        {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-1" />}
                      </button>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <h4 className="text-xs font-bold text-white truncate font-sans">{voice.title}</h4>
                          <span className="text-[9px] font-mono text-violet-400 whitespace-nowrap">{voice.duration}</span>
                        </div>
                        <p className="text-[11px] text-violet-200/80 mt-1 lines-clamp-2 leading-relaxed">
                          {voice.description}
                        </p>
                        
                        {/* Animated waveform visual feedback */}
                        {isPlaying && (
                          <div className="flex items-center gap-0.5 h-6 mt-3">
                            {[...Array(24)].map((_, i) => (
                              <div 
                                key={i} 
                                className="w-[3px] bg-linear-to-t from-violet-500 to-pink-400 rounded-full"
                                style={{
                                  height: `${15 + Math.sin(i * 0.8) * 45 + Math.random() * 30}%`,
                                  animation: 'pulse 1s ease-in-out infinite',
                                  animationDelay: `${i * 0.05}s`
                                }}
                              />
                            ))}
                          </div>
                        )}

                        <div className="text-[9px] font-mono text-violet-400 mt-2">
                          {voice.published}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Saved posts content tab - upgraded with Collection folders */}
        {profileTab === 'saved' && (
          <div className="space-y-6 text-left">
            {!isOwnProfile ? (
              <div className="p-12 text-center rounded-3xl border border-violet-500/15 bg-black/40 backdrop-blur-md max-w-sm mx-auto space-y-3 shadow-xl my-4">
                <div className="w-11 h-11 rounded-full bg-violet-500/10 border border-violet-500/20 flex items-center justify-center mx-auto text-violet-400">
                  <Lock className="w-4.5 h-4.5" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-xs font-sans font-black text-white">Private Repository Node</h4>
                  <p className="text-[10.5px] text-violet-300/50 leading-relaxed font-sans">
                    Saved content collection is secured and private to @{currentUser.username}.
                  </p>
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono uppercase text-[#8B5CF6] tracking-wider font-extrabold flex items-center gap-1">
                    <Lock className="w-3.5 h-3.5 text-pink-500" />
                    Private Saved Library Collections
                  </span>
                  <span className="text-[9px] font-mono text-violet-400/50">Organized folders</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {/* Folder 1 */}
                  <div className="p-4 rounded-3xl bg-linear-to-b from-[#110931] to-[#04010b] border border-violet-500/15 hover:border-violet-500/30 transition-all cursor-pointer group flex flex-col justify-between h-40 relative overflow-hidden">
                    <div className="absolute right-0 top-0 w-24 h-24 bg-purple-600/10 rounded-full blur-xl group-hover:scale-110 transition-transform" />
                    <div>
                      <span className="text-2xl select-none leading-none">🌌</span>
                      <h4 className="text-xs font-black text-white font-sans mt-2.5 leading-tight">Aesthetics & Atmosphere</h4>
                      <p className="text-[9.5px] text-violet-300/40 font-sans mt-1">Sleek twilight & retro interfaces</p>
                    </div>
                    <span className="text-[9px] font-mono text-violet-400/60 font-bold block mt-3">14 Items saved</span>
                  </div>

                  {/* Folder 2 */}
                  <div className="p-4 rounded-3xl bg-linear-to-b from-[#110931] to-[#04010b] border border-violet-500/15 hover:border-violet-500/30 transition-all cursor-pointer group flex flex-col justify-between h-40 relative overflow-hidden">
                    <div className="absolute right-0 top-0 w-24 h-24 bg-cyan-600/10 rounded-full blur-xl group-hover:scale-110 transition-transform" />
                    <div>
                      <span className="text-2xl select-none leading-none">💻</span>
                      <h4 className="text-xs font-black text-white font-sans mt-2.5 leading-tight">Tech & Performance</h4>
                      <p className="text-[9.5px] text-violet-300/40 font-sans mt-1">Rust logic & socket benchmark formulas</p>
                    </div>
                    <span className="text-[9px] font-mono text-violet-400/60 font-bold block mt-3">8 Items saved</span>
                  </div>

                  {/* Folder 3 */}
                  <div className="p-4 rounded-3xl bg-linear-to-b from-[#110931] to-[#04010b] border border-violet-500/15 hover:border-violet-500/30 transition-all cursor-pointer group flex flex-col justify-between h-40 relative overflow-hidden">
                    <div className="absolute right-0 top-0 w-24 h-24 bg-pink-600/10 rounded-full blur-xl group-hover:scale-110 transition-transform" />
                    <div>
                      <span className="text-2xl select-none leading-none">🎙️</span>
                      <h4 className="text-xs font-black text-white font-sans mt-2.5 leading-tight">Vaporwave Broadcasts</h4>
                      <p className="text-[9.5px] text-violet-300/40 font-sans mt-1">Keynotes and spatial soundscapes</p>
                    </div>
                    <span className="text-[9px] font-mono text-violet-400/60 font-bold block mt-3">4 Items saved</span>
                  </div>
                </div>

                {/* Flat saved stream feed as fallback */}
                <div className="pt-4 border-t border-violet-500/5 space-y-4">
                  <span className="text-[9.5px] font-mono font-bold text-violet-400/50 uppercase">Recent Bookmarks</span>
                  {savedPosts.map(post => (
                    <div 
                      key={post.id} 
                      className="p-5 rounded-3xl bg-[#0b091c]/80 border border-violet-500/10 flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex justify-between items-start mb-2.5">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-sans font-bold text-white">{post.name}</span>
                            <PurpleVerifiedBadge className="w-3.5 h-3.5" />
                            <span className="text-[10px] font-mono text-violet-400 font-normal">@{post.username}</span>
                          </div>
                          <span className="text-[9px] font-mono text-violet-400"><RelativeTimestamp timestamp={post.timestamp} /></span>
                        </div>
                        
                        <p className="text-xs text-violet-100 font-sans leading-relaxed mb-3">
                          {post.content}
                        </p>

                        {post.image && (
                          <img 
                            src={post.image} 
                            alt="Thumbnail attachment" 
                            className="w-full max-h-[220px] object-cover rounded-xl border border-violet-500/10 mb-3" 
                            referrerPolicy="no-referrer"
                          />
                        )}
                      </div>

                      <div className="flex items-center gap-4 pt-3 border-t border-violet-500/5 text-[10px] text-violet-300">
                        <button 
                          onClick={() => onLikePost(post.id)}
                          className="flex items-center gap-1 hover:text-rose-400 transition-colors"
                        >
                          <Heart className="w-3.5 h-3.5 text-rose-500/60" />
                          <span>{post.likes}</span>
                        </button>
                        <div className="flex items-center gap-1">
                          <MessageSquare className="w-3.5 h-3.5 text-violet-500/60" />
                          <span>{post.comments.length}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {/* 🎥 NEW: Videos Tab representation */}
        {profileTab === 'reels' && (
          <div className="space-y-4 text-left font-sans">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono uppercase text-[#8B5CF6] tracking-wider font-extrabold flex items-center gap-1">
                🎥 Profile Videos
              </span>
              <span className="text-[9px] font-mono text-violet-400/50">Video post feed</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3.5">
              
              {/* Loop card 1 */}
              <div className="rounded-3xl border border-violet-500/10 bg-slate-950/20 shadow-lg aspect-[9/16] relative overflow-hidden group">
                <video src="https://assets.mixkit.co/videos/preview/mixkit-cyberpunk-neon-city-street-at-night-41551-large.mp4" className="absolute inset-0 w-full h-full object-cover opacity-80" muted loop playsInline />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/20 p-3.5 flex flex-col justify-between">
                  <span className="text-[8px] font-mono bg-[#8B5CF6] text-white py-0.5 px-2 rounded-md self-start font-black uppercase">Active Video</span>
                  <div>
                    <p className="text-[10px] text-white font-sans line-clamp-2 leading-snug">Finally wrapped up our new mobile app design! Love the spacing and color system. #uidesign</p>
                    <span className="text-[9px] font-mono text-yellow-400 block mt-1.5 font-bold">⚡ 12.4K Sparks</span>
                  </div>
                </div>
              </div>

              {/* Loop card 2 */}
              <div className="rounded-3xl border border-violet-500/10 bg-slate-950/10 shadow-lg aspect-[9/16] relative overflow-hidden group">
                <video src="https://assets.mixkit.co/videos/preview/mixkit-holding-smartphone-at-night-with-city-lights-41553-large.mp4" className="absolute inset-0 w-full h-full object-cover opacity-80" muted loop playsInline />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/20 p-3.5 flex flex-col justify-between">
                  <span className="text-[8px] font-mono bg-cyan-600 text-white py-0.5 px-2 rounded-md self-start font-black">1.2K views</span>
                  <div>
                    <p className="text-[10px] text-white font-sans line-clamp-2 leading-snug">Spent all evening testing the new UI animations. Everything feels super butter smooth! #webdev</p>
                    <span className="text-[9px] font-mono text-yellow-400 block mt-1.5 font-semibold">⚡ 8.5K Sparks</span>
                  </div>
                </div>
              </div>

              {/* Placeholder bento */}
              <div className="rounded-3xl border border-dashed border-violet-500/15 bg-slate-950/20 aspect-[9/16] p-4 flex flex-col justify-between text-center">
                <div className="my-auto space-y-1.5">
                  <span className="text-xl select-none block">📹</span>
                  <span className="text-[9.5px] font-mono font-bold text-violet-400/60 uppercase block">Record New Video</span>
                  <p className="text-[8.5px] text-violet-400/30 leading-normal">Record a short video update for your followers.</p>
                </div>
              </div>

            </div>
          </div>
        )}

        {/* 🏷️ NEW: Tagged Posts Tab content */}
        {profileTab === 'tagged' && (
          <div className="space-y-4 text-left">
            <span className="text-[10px] font-mono uppercase text-[#8B5CF6] tracking-wider font-extrabold block">
              🏷️ Tagged Posts ({isOwnProfile ? '2' : '0'})
            </span>

            {isOwnProfile ? (
              <div className="grid grid-cols-1 gap-4.5 font-sans">
                {/* Tagged post 1 */}
                <div className="p-4 rounded-3xl bg-[#0c0a25]/65 border border-violet-500/10">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <img src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=80" className="w-6.5 h-6.5 rounded-lg object-cover" />
                      <div>
                        <span className="text-[11px] font-sans font-black text-white block leading-none">Sophia Thorne</span>
                        <span className="text-[9px] font-mono text-violet-400">@sophia_designs</span>
                      </div>
                    </div>
                    <span className="text-[9px] font-mono text-violet-400">1 day ago</span>
                  </div>
                  <p className="text-xs text-violet-100 font-sans leading-relaxed">
                    Collaborating with <span className="text-[#8B5CF6] font-bold">@{currentUser.username}</span> on glassmorphic backglow gradients. The reduction in border width yields premium visual rhythm! check out the design hub.
                  </p>
                </div>

                {/* Tagged post 2 */}
                <div className="p-4 rounded-3xl bg-[#0c0a25]/65 border border-violet-500/10">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <img src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=80" className="w-6.5 h-6.5 rounded-lg object-cover" />
                      <div>
                        <span className="text-[11px] font-sans font-black text-white block leading-none">Marcus Vance</span>
                        <span className="text-[9px] font-mono text-violet-400">@marcus_v_codes</span>
                      </div>
                    </div>
                    <span className="text-[9px] font-mono text-violet-400">4 days ago</span>
                  </div>
                  <p className="text-xs text-violet-100 font-sans leading-relaxed">
                    Superb package validation pass with <span className="text-[#8B5CF6] font-bold">@{currentUser.username}</span>! Compiling synchronous websocket filters with Rust achieved under 1.8ms! Absolute beast.
                  </p>
                </div>
              </div>
            ) : (
              <div className="text-center py-12 rounded-2xl border border-dashed border-violet-500/10 text-violet-400/40 font-mono text-[10px]">
                No tagged peer anchors found in this profile.
              </div>
            )}
          </div>
        )}

        {/* 📊 NEW: Creator Analytics Insights tab */}
        {profileTab === 'analytics' && (
          <div className="space-y-5 text-left select-none">
            <div className="flex justify-between items-center bg-[#130d24]/50 p-4 rounded-2xl border border-violet-500/15">
              <div className="space-y-0.5">
                <span className="text-[9px] font-mono uppercase tracking-widest text-yellow-400 font-black">Internal metrics dashboards</span>
                <h3 className="text-xs font-sans font-black text-white uppercase tracking-wider">
                  Intellectual Creator Insights Index 📊
                </h3>
              </div>
              <Activity className="w-4.5 h-4.5 text-yellow-400 animate-pulse" />
            </div>

            {/* Metric KPI grids */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3.5">
              
              <div className="p-3.5 rounded-2xl bg-[#0a071d] border border-violet-500/10 text-left">
                <span className="text-[8.5px] font-mono text-violet-400 uppercase font-black">Net Post views</span>
                <p className="text-base font-sans font-black text-white mt-1 leading-none">142.84K</p>
                <span className="text-[8.5px] font-mono text-emerald-400 mt-1 block">📈 +12.4% this week</span>
              </div>

              <div className="p-3.5 rounded-2xl bg-[#0a071d] border border-violet-500/10 text-left">
                <span className="text-[8.5px] font-mono text-violet-400 uppercase font-black">Loop Video plays</span>
                <p className="text-base font-sans font-black text-white mt-1 leading-none">89.41K</p>
                <span className="text-[8.5px] font-mono text-emerald-400 mt-1 block">📈 +24.1% this week</span>
              </div>

              <div className="p-3.5 rounded-2xl bg-[#0a071d] border border-violet-500/10 text-left">
                <span className="text-[8.5px] font-mono text-violet-400 uppercase font-black">Engagements Rate</span>
                <p className="text-base font-sans font-black text-[#8B5CF6] mt-1 leading-none">7.85%</p>
                <span className="text-[8.5px] font-mono text-[#8B5CF6]/65 mt-1 block">⭐ Exceptional index</span>
              </div>

              <div className="p-3.5 rounded-2xl bg-[#0a071d] border border-violet-500/10 text-left">
                <span className="text-[8.5px] font-mono text-violet-400 uppercase font-black">Total Spark tips</span>
                <p className="text-base font-sans font-black text-yellow-400 mt-1 leading-none">12.41K</p>
                <span className="text-[8.5px] font-mono text-yellow-500 mt-1 block">⚡ active sparks</span>
              </div>

              <div className="p-3.5 rounded-2xl bg-[#0a071d] border border-violet-500/10 text-left">
                <span className="text-[8.5px] font-mono text-violet-400 uppercase font-black">Profile Visits</span>
                <p className="text-base font-sans font-black text-cyan-400 mt-1 leading-none">420</p>
                <span className="text-[8.5px] font-mono text-cyan-500 mt-1 block">👤 +24 today</span>
              </div>

              <div className="p-3.5 rounded-2xl bg-[#0a071d] border border-violet-500/10 text-left">
                <span className="text-[8.5px] font-mono text-violet-400 uppercase font-black">Audience growth</span>
                <p className="text-base font-sans font-black text-pink-400 mt-1 leading-none">+194</p>
                <span className="text-[8.5px] font-mono text-purple-400 mt-1 block">👥 Net Follow gains</span>
              </div>

            </div>

            {/* GROWTH METRIC VISUAL CUSTOM CHART */}
            <div className="p-4 rounded-2xl bg-[#0a071d] border border-violet-500/10 mt-2 space-y-3.5">
              <div className="flex justify-between items-center sm:items-start flex-col sm:flex-row gap-1 border-b border-violet-500/5 pb-2">
                <div>
                  <span className="text-[9px] font-mono text-violet-400 uppercase font-bold block">Audience Metric Growth</span>
                  <h4 className="text-xs font-sans font-black text-white mt-0.5">Follower Increase Over the Last 6 Days</h4>
                </div>
                <span className="text-[9px] font-mono text-yellow-400 uppercase font-black bg-yellow-400/10 px-2 py-0.5 rounded leading-none">
                  Stable scaling
                </span>
              </div>

              <div className="flex items-end justify-between gap-2.5 pt-2.5 h-36">
                
                {/* Bar 1 */}
                <div className="flex-1 flex flex-col items-center gap-2 group cursor-pointer">
                  <div className="w-full relative rounded-t-lg bg-violet-600/30 border border-violet-500/15 group-hover:bg-violet-600/60 transition-colors h-8 flex items-center justify-center text-[9px] font-bold text-white">
                    +12
                  </div>
                  <span className="text-[8.5px] font-mono text-violet-400/60 block">Day 1</span>
                </div>

                {/* Bar 2 */}
                <div className="flex-1 flex flex-col items-center gap-2 group cursor-pointer">
                  <div className="w-full relative rounded-t-lg bg-violet-600/35 border border-violet-500/20 group-hover:bg-violet-600/65 transition-colors h-14 flex items-center justify-center text-[9px] font-bold text-white">
                    +18
                  </div>
                  <span className="text-[8.5px] font-mono text-violet-400/60 block">Day 2</span>
                </div>

                {/* Bar 3 */}
                <div className="flex-1 flex flex-col items-center gap-2 group cursor-pointer">
                  <div className="w-full relative rounded-t-lg bg-violet-600/40 border border-violet-500/25 group-hover:bg-violet-600/70 transition-colors h-20 flex items-center justify-center text-[9px] font-bold text-white">
                    +24
                  </div>
                  <span className="text-[8.5px] font-mono text-violet-400/60 block">Day 3</span>
                </div>

                {/* Bar 4 */}
                <div className="flex-1 flex flex-col items-center gap-2 group cursor-pointer">
                  <div className="w-full relative rounded-t-lg bg-[#8B5CF6]/55 border border-[#8B5CF6]/40 group-hover:bg-[#8B5CF6]/80 transition-colors h-24 flex items-center justify-center text-[9px] font-bold text-white">
                    +30
                  </div>
                  <span className="text-[8.5px] font-mono text-violet-400/60 block">Day 4</span>
                </div>

                {/* Bar 5 */}
                <div className="flex-1 flex flex-col items-center gap-2 group cursor-pointer">
                  <div className="w-full relative rounded-t-lg bg-pink-600/60 border border-pink-500/40 group-hover:bg-pink-600/80 transition-colors h-28 flex items-center justify-center text-[9px] font-bold text-white">
                    +42
                  </div>
                  <span className="text-[8.5px] font-mono text-violet-400/6 block">Day 5</span>
                </div>

                {/* Bar 6 */}
                <div className="flex-1 flex flex-col items-center gap-2 group cursor-pointer">
                  <div className="w-full relative rounded-t-lg bg-linear-to-t from-pink-500 to-yellow-400 border border-yellow-500/50 h-32 flex items-center justify-center text-[9px] font-mono font-black text-white">
                    +64
                  </div>
                  <span className="text-[8.5px] font-mono text-violet-400 block font-bold">Today</span>
                </div>

              </div>
            </div>

          </div>
        )}

        {/* Communities Tab */}
        {profileTab === 'communities' && (
          <div className="grid grid-cols-1 gap-3.5">
            {communitiesData.map(com => (
              <div 
                key={com.id} 
                className="p-4 rounded-2xl bg-[#09071c] border border-violet-500/10 hover:border-violet-500/25 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-left"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h4 className="text-xs font-bold text-white font-sans">{com.name}</h4>
                    <span className="text-[9px] font-mono text-cyan-400">📍 {com.location}</span>
                  </div>
                  <p className="text-[11px] text-violet-200/70">{com.description}</p>
                </div>
                
                <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0 border-t sm:border-t-0 pt-2 sm:pt-0 border-violet-500/5">
                  <span className="text-[10px] font-mono text-violet-400 font-bold">{com.members}</span>
                  <button className="text-[9px] font-mono font-black border border-violet-500/30 hover:border-violet-500/50 bg-violet-500/5 text-violet-300 px-2.5 py-1.5 rounded-lg transition-colors uppercase">
                    Launch Room
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}


      </div>

    </motion.div>
  )}
</AnimatePresence>

      {/* Dynamic Connections Modal (Alliances & Followers list) */}
      <AnimatePresence>
        {isConnectionsModalOpen && (
          <div className="fixed inset-0 bg-[#06040f]/90 backdrop-blur-md z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="relative w-full max-w-lg bg-[#09071b] border border-violet-500/20 rounded-3xl p-5 overflow-hidden flex flex-col max-h-[85vh] shadow-[0_0_50px_rgba(139,92,246,0.4)]"
            >
              {/* Top Accent line */}
              <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-violet-500 via-pink-500 to-cyan-400" />

              {/* Header */}
              <div className="flex items-center justify-between pb-3 border-b border-violet-500/10">
                <div>
                  <span className="text-[9px] font-mono font-bold tracking-widest text-[#8B5CF6] uppercase">
                    Network Connections
                  </span>
                  <h3 className="text-base font-black text-white tracking-tight flex items-center gap-1.5 font-sans mt-0.5 animate-fade-in">
                    {connectionsModalTab === 'followers' ? '👥 Followers List' : '⚡ Connected Friends'}
                    <span className="text-xs text-[#8B5CF6]/85 font-mono font-normal">
                      ({connectionsModalTab === 'followers' ? formatNumber(currentUser.followers) : formatNumber(currentUser.following)} Users)
                    </span>
                  </h3>
                </div>
                <button
                  onClick={() => setIsConnectionsModalOpen(false)}
                  className="p-1.5 rounded-lg border border-white/5 bg-white/[0.02] text-violet-300 hover:text-white hover:border-[#8B5CF6]/30 transition-all cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Tabs */}
              <div className="grid grid-cols-2 gap-1.5 mt-3.5 bg-[#050410] p-1 rounded-xl border border-violet-500/5">
                <button
                  onClick={() => {
                    setConnectionsModalTab('followers');
                    setConnectionSearchQuery('');
                  }}
                  className={`py-2 text-[10px] font-mono tracking-wider font-extrabold rounded-lg uppercase transition-all cursor-pointer ${connectionsModalTab === 'followers' ? 'bg-[#8B5CF6] text-white shadow-md' : 'text-violet-300/50 hover:text-violet-200'}`}
                >
                  Followers ({formatNumber(currentUser.followers)})
                </button>
                <button
                  onClick={() => {
                    setConnectionsModalTab('following');
                    setConnectionSearchQuery('');
                  }}
                  className={`py-2 text-[10px] font-mono tracking-wider font-extrabold rounded-lg uppercase transition-all cursor-pointer ${connectionsModalTab === 'following' ? 'bg-[#8B5CF6] text-white shadow-md' : 'text-violet-300/50 hover:text-violet-200'}`}
                >
                  Following ({formatNumber(currentUser.following)})
                </button>
              </div>

              {/* Connection Search Bar */}
              <div className="relative mt-3 group">
                <Search className="absolute left-3 top-2.5 w-4 h-4 text-violet-500 group-hover:text-violet-400 transition-colors" />
                <input
                  type="text"
                  placeholder="Search connections list by name or username..."
                  value={connectionSearchQuery}
                  onChange={(e) => setConnectionSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-purple-950/20 border border-purple-500/10 hover:border-purple-500/25 focus:border-[#8B5CF6] rounded-xl font-mono text-white text-xs placeholder-purple-300/30 focus:outline-hidden focus:ring-1 focus:ring-[#8B5CF6]/15 transition-all"
                />
                {connectionSearchQuery && (
                  <button
                    onClick={() => setConnectionSearchQuery('')}
                    className="absolute right-3 top-2.5 text-[9px] font-mono font-bold text-violet-400 hover:text-white cursor-pointer"
                  >
                    CLEAR
                  </button>
                )}
              </div>

              {/* Connections list dynamic scroll container */}
              <div className="flex-1 overflow-y-auto mt-4 pr-1 space-y-2 max-h-[48vh] custom-scrollbar scroll-smooth">
                {filteredConnections.length > 0 ? (
                  filteredConnections.map((user, idx) => (
                    <div
                      key={user.id || idx}
                      className="p-3 rounded-2xl bg-white/[0.01] hover:bg-violet-950/25 border border-white/5 hover:border-violet-500/25 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 relative overflow-hidden group"
                    >
                      {/* Left Block info */}
                      <div className="flex items-start gap-2.5 min-w-0">
                        <img
                          src={user.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80'}
                          alt={user.name}
                          className="w-9 h-9 rounded-full object-cover border border-violet-500/10 ring-2 ring-violet-500/5 group-hover:scale-105 transition-transform"
                          referrerPolicy="no-referrer"
                        />
                        <div className="min-w-0">
                          <div className="flex items-center gap-1">
                            <span className="text-xs font-black text-white leading-tight truncate">{user.name}</span>
                            {user.isVerified && <PurpleVerifiedBadge />}
                          </div>
                          <span className="text-[10px] text-violet-400 font-mono">@{user.username}</span>
                          <p className="text-[10.5px] text-violet-200/60 leading-tight mt-1 truncate max-w-[240px] sm:max-w-[280px]">
                            {user.bio}
                          </p>
                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                            {user.location && (
                              <span className="text-[9px] font-mono text-violet-300/40 flex items-center gap-0.5">
                                📍 {user.location}
                              </span>
                            )}
                            <span className="text-[9px] font-mono text-purple-400/50">
                              ⭐ {formatNumber(user.reputationPoints)} rep
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Right Action panel */}
                      <div className="flex items-center gap-1.5 self-end sm:self-center">
                        <button
                          onClick={() => {
                            setIsConnectionsModalOpen(false);
                            if (onViewProfile) onViewProfile(user.id);
                          }}
                          className="px-3 py-1.5 text-[10px] font-mono font-black text-white bg-violet-600 hover:bg-violet-700 rounded-lg active:scale-95 transition-all cursor-pointer"
                        >
                          PROFILE
                        </button>
                        {onStartChat && (
                          <button
                            onClick={() => {
                              setIsConnectionsModalOpen(false);
                              onStartChat(user.id);
                            }}
                            className="p-1.5 rounded-lg border border-violet-500/20 bg-violet-500/5 hover:bg-violet-500/20 hover:border-violet-500/40 text-violet-300 transition-all cursor-pointer"
                            title="Open Message Bridge"
                          >
                            <MessageSquare className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-10 border border-dashed border-violet-500/10 rounded-2xl bg-white/[0.01]">
                    <span className="text-2xl select-none">🔍</span>
                    <p className="text-xs font-mono font-bold text-violet-300 mt-2">No connections match your search query.</p>
                    <p className="text-[10px] text-violet-300/40 mt-1">Refine parameters and try again.</p>
                  </div>
                )}
              </div>

              {/* Bottom footer credit indicator */}
              <div className="border-t border-violet-500/10 pt-3 mt-4 text-center">
                <p className="text-[9px] font-mono text-violet-300/30">
                  SECURE CRYPTOGRAPHIC SOCIAL CONNECTIONS FOR NEXORA EXPERIMENTAL PROTOCOLS
                </p>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
