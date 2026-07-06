import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, 
  Sliders, 
  TrendingUp, 
  Award, 
  Users, 
  FileText, 
  Award as Crown, 
  Share2, 
  Heart, 
  MessageSquare, 
  Bookmark, 
  Eye, 
  ArrowUpRight,
  TrendingDown,
  Sparkles,
  HelpCircle,
  Lightbulb,
  PlusCircle,
  Briefcase,
  DollarSign,
  UserCheck,
  Send,
  Lock,
  Clock,
  ShieldAlert,
  Globe,
  Phone,
  Mail,
  Zap,
  CheckCircle,
  ChevronRight,
  UserX,
  CreditCard,
  Plus
} from 'lucide-react';
import { User, Post } from '../types';

interface CreatorDashboardViewProps {
  currentUser: User;
  posts: Post[];
  onClose: () => void;
  onUpdateProfile: (updatedData: Partial<User>) => void;
  activeTabOverride?: 'overview' | 'content' | 'earnings' | 'insights' | 'pages' | 'collabs';
}

interface CreatorPage {
  id: string;
  name: string;
  username: string;
  avatar: string;
  bio: string;
  category: 'Creator' | 'Brand' | 'Business' | 'Community' | 'Organization' | 'Public Figure';
  website: string;
  email: string;
  phone: string;
  followers: number;
  following: number;
  about: string;
}

interface CollabInvite {
  id: string;
  senderUsername: string;
  senderName: string;
  senderAvatar: string;
  proposal: string;
  revenueSplit: number;
  status: 'pending' | 'accepted' | 'declined';
  campaignName?: string;
}

export default function CreatorDashboardView({
  currentUser,
  posts,
  onClose,
  onUpdateProfile,
  activeTabOverride = 'overview'
}: CreatorDashboardViewProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'content' | 'earnings' | 'insights' | 'pages' | 'collabs'>(activeTabOverride);
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);

  // Live simulation states (already supported)
  const [isLiveStreaming, setIsLiveStreaming] = useState(false);
  const [liveDuration, setLiveDuration] = useState(0);
  const [liveViewerCount, setLiveViewerCount] = useState(120);

  // 1. Creator Pages State
  const [creatorPages, setCreatorPages] = useState<CreatorPage[]>(() => {
    const saved = localStorage.getItem(`nexora_creator_pages_${currentUser.id}`);
    if (saved) return JSON.parse(saved);
    // Pre-seed a default brand page to demonstrate capability
    return [
      {
        id: `page-seed-${currentUser.id}`,
        name: `${currentUser.name} Studio`,
        username: `${currentUser.username}_studio`,
        avatar: currentUser.avatar || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=150&q=80',
        bio: `Official brand page for ${currentUser.name} creative design, digital assets, and high-fidelity video tutorials.`,
        category: 'Brand',
        website: 'www.nexorastudio.ai',
        email: currentUser.email || 'studio@nexora.co',
        phone: currentUser.phone || '+234 812 3456',
        followers: Math.floor(currentUser.followers * 0.45) + 85,
        following: 12,
        about: 'Dedicated organization powering modern digital storytelling and interactive design across Sub-Saharan Africa and beyond.'
      }
    ];
  });

  // Pages creation state
  const [isCreatingPage, setIsCreatingPage] = useState(false);
  const [newPageName, setNewPageName] = useState('');
  const [newPageUsername, setNewPageUsername] = useState('');
  const [newPageCategory, setNewPageCategory] = useState<'Creator' | 'Brand' | 'Business' | 'Community' | 'Organization' | 'Public Figure'>('Creator');
  const [newPageBio, setNewPageBio] = useState('');
  const [newPageWebsite, setNewPageWebsite] = useState('');
  const [newPageEmail, setNewPageEmail] = useState('');
  const [newPagePhone, setNewPagePhone] = useState('');
  const [newPageAbout, setNewPageAbout] = useState('');

  // 2. Monetization States
  const [walletBalance, setWalletBalance] = useState(currentUser.nexBalance ?? 0);
  const [lifetimeEarnings, setLifetimeEarnings] = useState(walletBalance * 1.3);
  const [pendingEarnings, setPendingEarnings] = useState(0);
  const [payoutMethod, setPayoutMethod] = useState<'bank' | 'paypal' | 'crypto'>('bank');
  const [bankName, setBankName] = useState('Zenith Bank Plc');
  const [accountNumber, setAccountNumber] = useState('2208947231');
  const [paypalEmail, setPaypalEmail] = useState(currentUser.email || '');
  const [cryptoAddress, setCryptoAddress] = useState('0x7f9a...e3b2');
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawalHistory, setWithdrawalHistory] = useState<{ id: string; amount: number; method: string; date: string; status: 'approved' | 'pending' }[]>([
    { id: 'tx-101', amount: 8000, method: 'Bank Transfer (Access Bank)', date: '2026-06-25 14:32', status: 'approved' },
    { id: 'tx-102', amount: 12000, method: 'PayPal (ogoulu131@gmail.com)', date: '2026-07-01 09:15', status: 'approved' }
  ]);

  // 3. Creator Collaboration States
  const [collabInvites, setCollabInvites] = useState<CollabInvite[]>([
    {
      id: 'invite-1',
      senderUsername: 'voh_ai',
      senderName: 'VOH AI Assistant',
      senderAvatar: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=150&q=80',
      proposal: 'Looking to co-author an interactive tech trends post regarding real-time system performance and local latency reduction techniques.',
      revenueSplit: 50,
      status: 'pending'
    },
    {
      id: 'invite-2',
      senderUsername: 'sarah_growth',
      senderName: 'Sarah Martins',
      senderAvatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&q=80',
      proposal: 'Sponsored Campaign: Highlight Onyx Energy Drinks in a 15-second loop. Guaranteed visual promotion.',
      revenueSplit: 40,
      status: 'pending',
      campaignName: 'Onyx Extreme Loop'
    }
  ]);
  const [inviteCollabUsername, setInviteCollabUsername] = useState('');
  const [inviteCollabProposal, setInviteCollabProposal] = useState('');
  const [inviteCollabSplit, setInviteCollabSplit] = useState(50);
  const [activeSponsoredComps] = useState([
    { id: 'comp-1', brand: 'Onyx Energy', title: 'Onyx Extreme Performance Challenge', prize: '10,000 NEX', ddl: 'July 20, 2026', desc: 'Post a 15s loop featuring high energy startup vibes.' },
    { id: 'comp-2', brand: 'NIDA Tech', title: 'Interactive Neural Interface Showcase', prize: '15,000 NEX', ddl: 'July 28, 2026', desc: 'Create content highlighting user customization flows.' }
  ]);

  // Sync state to localstorage
  useEffect(() => {
    localStorage.setItem(`nexora_creator_pages_${currentUser.id}`, JSON.stringify(creatorPages));
  }, [creatorPages, currentUser.id]);

  // Live Streaming logic
  useEffect(() => {
    let interval: any;
    if (isLiveStreaming) {
      interval = setInterval(() => {
        setLiveDuration(prev => prev + 1);
        setLiveViewerCount(prev => {
          const delta = Math.floor(Math.random() * 9) - 4; // fluctuates viewer counts
          return Math.max(10, prev + delta);
        });
      }, 1000);
    } else {
      setLiveDuration(0);
    }
    return () => clearInterval(interval);
  }, [isLiveStreaming]);

  // Filter posts by user
  const myPosts = posts.filter(p => p.username === currentUser.username);

  // Aggregate statistics dynamically
  const isNewUser = currentUser.reputationPoints === 0 && currentUser.followers === 0 && (currentUser.nexBalance === undefined || currentUser.nexBalance === 0);
  const totalSparks = isNewUser ? 0 : myPosts.reduce((acc, p) => acc + (p.likes || 0), 0) + (currentUser.username === 'voh' ? 45000 : 820);
  const totalComments = isNewUser ? 0 : myPosts.reduce((acc, p) => acc + (p.commentsCount || 0), 0) + (currentUser.username === 'voh' ? 12300 : 210);
  const totalShares = isNewUser ? 0 : myPosts.reduce((acc, p) => acc + (p.shares || 0), 0) + (currentUser.username === 'voh' ? 3200 : 45);
  const totalViews = isNewUser ? 0 : myPosts.length * 820 + (currentUser.username === 'voh' ? 245000 : 12400);
  const totalSaves = isNewUser ? 0 : Math.floor(totalSparks * 0.15) + (currentUser.username === 'voh' ? 1850 : 124);
  const profileVisits = isNewUser ? 0 : Math.floor(totalViews * 0.22) + (currentUser.username === 'voh' ? 62000 : 2500);

  const engagementRate = totalViews > 0 
    ? (((totalSparks + totalComments + totalShares + totalSaves) / totalViews) * 100).toFixed(1) + '%' 
    : '0%';

  // Handles page creation
  const handleCreatePage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPageName.trim() || !newPageUsername.trim()) {
      window.dispatchEvent(new CustomEvent('toast', { detail: '⚠️ Name and username are strictly required.' }));
      return;
    }

    const cleanUsername = newPageUsername.trim().toLowerCase().replace(/[^a-z0-9_]/g, '');
    const newPage: CreatorPage = {
      id: `page-${Date.now()}`,
      name: newPageName.trim(),
      username: cleanUsername,
      avatar: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=150&q=80',
      bio: newPageBio.trim() || 'A new public page on Nexora.',
      category: newPageCategory,
      website: newPageWebsite.trim() || 'www.nexora.co',
      email: newPageEmail.trim() || currentUser.email || 'page@nexora.co',
      phone: newPagePhone.trim() || currentUser.phone || '',
      followers: 0,
      following: 0,
      about: newPageAbout.trim() || 'This page has not set their primary organization description yet.'
    };

    setCreatorPages(prev => [...prev, newPage]);
    setIsCreatingPage(false);
    
    // Clear fields
    setNewPageName('');
    setNewPageUsername('');
    setNewPageBio('');
    setNewPageWebsite('');
    setNewPageEmail('');
    setNewPagePhone('');
    setNewPageAbout('');

    window.dispatchEvent(new CustomEvent('toast', { detail: `✨ Successfully created Creator Page: @${cleanUsername}` }));
  };

  // Handles switching profile identity
  const handleSwitchToPage = (page: CreatorPage) => {
    // Construct a User profile based on this page
    const simulatedUser: User = {
      id: page.id,
      name: page.name,
      username: page.username,
      avatar: page.avatar,
      bio: page.bio,
      location: currentUser.location || 'Port Harcourt, Nigeria',
      website: page.website,
      followers: page.followers,
      following: page.following,
      isVerified: true,
      coverImage: currentUser.coverImage || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=800&q=80',
      joinedDate: 'Joined July 2026',
      email: page.email,
      phone: page.phone,
      nexBalance: 0,
      reputationPoints: 100,
      reputationBreakdown: { contributions: 50, helpfulness: 50, missionsCompleted: 0, skillsVerified: 0 },
      interestDNA: { 'Tech': 80 },
      skills: ['Creative Creator', page.category]
    };

    // Save current user as primary user ID so we can switch back
    localStorage.setItem(`nexora_primary_user_${currentUser.id}`, JSON.stringify(currentUser));
    
    // Fire event to switch active user in App.tsx
    window.dispatchEvent(new CustomEvent('nexora-switch-identity', { detail: simulatedUser }));
    onClose();
  };

  // Handle withdrawal submission
  const handleWithdrawal = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = Number(withdrawAmount);
    if (isNaN(amount) || amount <= 0) {
      window.dispatchEvent(new CustomEvent('toast', { detail: '⚠️ Please enter a valid withdrawal amount.' }));
      return;
    }

    if (amount > walletBalance) {
      window.dispatchEvent(new CustomEvent('toast', { detail: '⚠️ Insufficient wallet balance.' }));
      return;
    }

    // Deduct and add to transaction history
    setWalletBalance(prev => prev - amount);
    onUpdateProfile({ nexBalance: walletBalance - amount });
    
    const newTx = {
      id: `tx-${Date.now()}`,
      amount: amount,
      method: payoutMethod === 'bank' ? `Bank Transfer (${bankName})` : payoutMethod === 'paypal' ? `PayPal (${paypalEmail})` : `Crypto Wallet (${cryptoAddress})`,
      date: new Date().toISOString().replace('T', ' ').substring(0, 16),
      status: 'pending' as const
    };

    setWithdrawalHistory(prev => [newTx, ...prev]);
    setWithdrawAmount('');
    window.dispatchEvent(new CustomEvent('toast', { detail: `💸 Withdrawal request for ${amount} NEX has been queued.` }));
  };

  // Handle collaborations actions
  const handleCollabAction = (id: string, action: 'accept' | 'decline') => {
    setCollabInvites(prev => prev.map(c => c.id === id ? { ...c, status: action === 'accept' ? 'accepted' : 'declined' } : c));
    window.dispatchEvent(new CustomEvent('toast', { detail: `🤝 Collaboration request ${action === 'accept' ? 'accepted' : 'declined'} successfully.` }));
  };

  const handleSendCollabInvite = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteCollabUsername.trim() || !inviteCollabProposal.trim()) {
      window.dispatchEvent(new CustomEvent('toast', { detail: '⚠️ Username and Proposal are strictly required.' }));
      return;
    }

    const newInvite: CollabInvite = {
      id: `collab-${Date.now()}`,
      senderUsername: currentUser.username,
      senderName: currentUser.name,
      senderAvatar: currentUser.avatar,
      proposal: inviteCollabProposal.trim(),
      revenueSplit: inviteCollabSplit,
      status: 'pending'
    };

    window.dispatchEvent(new CustomEvent('toast', { detail: `🚀 Sent collaboration proposal to @${inviteCollabUsername.trim()}` }));
    setInviteCollabUsername('');
    setInviteCollabProposal('');
    setInviteCollabSplit(50);
  };

  const formatVal = (val: number) => {
    if (val >= 1000000) return (val / 1000000).toFixed(1) + 'M';
    if (val >= 1000) return (val / 1000).toFixed(1) + 'K';
    return val.toString();
  };

  return (
    <div id="voh-creator-dashboard-screen" className="bg-[#05030f] min-h-[85vh] text-zinc-100 rounded-3xl border border-violet-500/15 overflow-hidden flex flex-col mt-4">
      
      {/* Top Header Section */}
      <div className="p-4 sm:p-6 bg-[#0c0822]/60 border-b border-violet-500/15 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            className="p-2 hover:bg-violet-950/40 rounded-xl transition-all border border-violet-500/10 text-violet-400 hover:text-white cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="text-left">
            <div className="flex items-center gap-1.5">
              <Sliders className="w-4 h-4 text-violet-400 animate-pulse" />
              <h1 className="text-sm font-mono font-black uppercase tracking-wider text-white">Creator Hub & Studio</h1>
            </div>
            <p className="text-[10px] sm:text-xs text-zinc-400 mt-0.5">
              Manage public Pages, view visual Analytics, configure monetization wallet, and request collaborations.
            </p>
          </div>
        </div>

        {/* Short info row on earnings multiplier */}
        <div className="flex items-center gap-2.5 bg-violet-950/25 border border-violet-500/15 px-3.5 py-1.5 rounded-2xl max-w-max self-start sm:self-center">
          <Crown className="w-4 h-4 text-yellow-400 animate-bounce" />
          <div className="text-left">
            <span className="text-[9px] font-mono text-zinc-400 block leading-tight font-black uppercase">Creator Tier</span>
            <span className="text-xs font-mono font-extrabold text-violet-300">
              {currentUser.reputationPoints > 100000 ? 'Elite (2.5x Split)' : currentUser.reputationPoints > 1000 ? 'Rising Star (1.5x Split)' : 'Standard (1.0x)'}
            </span>
          </div>
        </div>
      </div>

      {/* 6 Tabs Selector Navigation */}
      <div className="border-b border-violet-500/10 bg-black/20 px-4 py-1 flex overflow-x-auto scrollbar-none">
        <div className="flex gap-2 w-full">
          {[
            { id: 'overview', label: 'Dashboard', icon: TrendingUp },
            { id: 'pages', label: 'My Pages', icon: Globe },
            { id: 'earnings', label: 'Wallet & Monetization', icon: DollarSign },
            { id: 'collabs', label: 'Collab Center', icon: UserCheck },
            { id: 'drafts', label: 'Drafts', icon: FileText },
            { id: 'insights', label: 'Scheduler', icon: Lightbulb }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id as any);
                setSelectedPostId(null);
              }}
              className={`py-3 px-3 sm:px-6 relative flex items-center justify-center gap-1.5 cursor-pointer uppercase tracking-widest text-[10px] font-mono font-extrabold transition-all border-b-2 whitespace-nowrap ${
                activeTab === tab.id 
                  ? 'border-violet-500 text-white font-extrabold bg-violet-950/10' 
                  : 'border-transparent text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <tab.icon className={`w-3.5 h-3.5 ${activeTab === tab.id ? 'text-violet-400' : 'text-zinc-500'}`} />
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Main Tab Area Content */}
      <div className="p-4 sm:p-6 flex-1 select-none">
        
        {/* TAB 1: OVERVIEW */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            
            {/* Live Streaming Simulation suite */}
            <div className="p-5 rounded-3xl bg-[#0b081c] border border-violet-500/10 space-y-4 text-left">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-sans font-bold text-violet-100 flex items-center gap-1.5 uppercase">
                    <Zap className="w-4 h-4 text-pink-500 animate-pulse" /> Nexora Broadcast simulation suite
                  </h3>
                  <p className="text-[10px] text-zinc-400 font-mono">Test live telemetry and subscriber push notifications.</p>
                </div>
                <button
                  onClick={() => setIsLiveStreaming(!isLiveStreaming)}
                  className={`px-4 py-2 rounded-xl text-[10px] font-mono font-black uppercase tracking-widest transition-all cursor-pointer ${
                    isLiveStreaming 
                      ? 'bg-red-600 text-white animate-pulse' 
                      : 'bg-violet-600 text-white hover:bg-violet-500'
                  }`}
                >
                  {isLiveStreaming ? 'Stop Broadcast 🔴' : 'Go Live Simulation'}
                </button>
              </div>

              {isLiveStreaming && (
                <div className="p-4 rounded-2xl bg-black/50 border border-red-500/20 space-y-3 font-mono">
                  <div className="grid grid-cols-3 gap-2 text-center text-xs">
                    <div className="bg-[#12080a] p-2 rounded-xl border border-red-500/10">
                      <p className="text-[9px] text-zinc-500">PEAK VIEWERS</p>
                      <p className="text-sm font-bold text-red-400">{liveViewerCount}</p>
                    </div>
                    <div className="bg-[#080c12] p-2 rounded-xl border border-violet-500/10">
                      <p className="text-[9px] text-zinc-500">ELAPSED TIME</p>
                      <p className="text-sm font-bold text-violet-300">
                        {Math.floor(liveDuration / 60)}m {liveDuration % 60}s
                      </p>
                    </div>
                    <div className="bg-[#08120a] p-2 rounded-xl border border-emerald-500/10">
                      <p className="text-[9px] text-zinc-500">LIVE COINS</p>
                      <p className="text-sm font-bold text-emerald-400">{(liveDuration * 4).toLocaleString()} NEX</p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Content Analytics Panel */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-left">
              <div className="bg-[#0b081c]/60 p-4 rounded-2xl border border-violet-500/10">
                <span className="text-[9px] font-mono text-zinc-500 block">TOTAL VIEWS</span>
                <span className="text-lg font-black text-white mt-1 block">{formatVal(totalViews)}</span>
                <span className="text-[9px] font-mono text-emerald-400 flex items-center gap-0.5 mt-1">
                  <TrendingUp className="w-3 h-3" /> +14.2% this week
                </span>
              </div>
              <div className="bg-[#0b081c]/60 p-4 rounded-2xl border border-violet-500/10">
                <span className="text-[9px] font-mono text-zinc-500 block">ENGAGEMENT RATE</span>
                <span className="text-lg font-black text-white mt-1 block">{engagementRate}</span>
                <span className="text-[9px] font-mono text-emerald-400 flex items-center gap-0.5 mt-1">
                  <TrendingUp className="w-3 h-3" /> +5.6% vs avg
                </span>
              </div>
              <div className="bg-[#0b081c]/60 p-4 rounded-2xl border border-violet-500/10">
                <span className="text-[9px] font-mono text-zinc-500 block">PROFILE VISITS</span>
                <span className="text-lg font-black text-white mt-1 block">{formatVal(profileVisits)}</span>
                <span className="text-[9px] font-mono text-pink-400 flex items-center gap-0.5 mt-1">
                  <TrendingUp className="w-3 h-3" /> +19.3% views
                </span>
              </div>
              <div className="bg-[#0b081c]/60 p-4 rounded-2xl border border-violet-500/10">
                <span className="text-[9px] font-mono text-zinc-500 block">SPARKS (LIKES)</span>
                <span className="text-lg font-black text-white mt-1 block">{formatVal(totalSparks)}</span>
                <span className="text-[9px] font-mono text-emerald-400 flex items-center gap-0.5 mt-1">
                  <TrendingUp className="w-3 h-3" /> +22.1% loop hits
                </span>
              </div>
            </div>

            {/* Interactive Graph Simulation */}
            <div className="p-6 rounded-3xl bg-[#0b081c] border border-violet-500/10 space-y-6 text-left">
              <div>
                <h3 className="text-sm font-sans font-bold text-violet-100 uppercase tracking-wide">Network Impressions Matrix</h3>
                <p className="text-[10px] text-zinc-400 font-mono">Simulated graph tracking high-fidelity audience growth trends.</p>
              </div>

              <div className="h-44 bg-black/40 border border-white/5 rounded-2xl p-4 relative overflow-hidden flex items-end">
                <svg className="absolute inset-0 w-full h-full" viewBox="0 0 400 150" preserveAspectRatio="none">
                  <defs>
                    <linearGradient id="chartGradNew" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#8B5CF6" stopOpacity="0.4" />
                      <stop offset="100%" stopColor="#8B5CF6" stopOpacity="0.0" />
                    </linearGradient>
                  </defs>
                  <line x1="0" y1="37" x2="400" y2="37" stroke="rgba(255,255,255,0.03)" strokeWidth="1" />
                  <line x1="0" y1="75" x2="400" y2="75" stroke="rgba(255,255,255,0.03)" strokeWidth="1" />
                  <line x1="0" y1="112" x2="400" y2="112" stroke="rgba(255,255,255,0.03)" strokeWidth="1" />
                  <path d="M0 130 Q 50 80, 100 110 T 200 40 T 300 90 T 400 20 L 400 150 L 0 150 Z" fill="url(#chartGradNew)" />
                  <path d="M0 130 Q 50 80, 100 110 T 200 40 T 300 90 T 400 20" fill="none" stroke="#8B5CF6" strokeWidth="3" strokeLinecap="round" />
                </svg>
                <div className="absolute inset-x-4 bottom-2 flex justify-between text-[8px] font-mono text-zinc-500 uppercase">
                  <span>MON</span>
                  <span>TUE</span>
                  <span>WED</span>
                  <span>THU</span>
                  <span>FRI</span>
                  <span>SAT</span>
                  <span>SUN</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: MY PAGES */}
        {activeTab === 'pages' && (
          <div className="space-y-6 text-left">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-violet-500/10 pb-4 gap-2">
              <div>
                <h3 className="text-sm font-sans font-black text-white uppercase tracking-wider flex items-center gap-1.5">
                  <Globe className="w-4 h-4 text-violet-400" /> CREATOR PAGES HUB
                </h3>
                <p className="text-[10px] sm:text-xs text-zinc-400">Create, manage, and switch active public pages without logging out.</p>
              </div>
              <button
                onClick={() => setIsCreatingPage(true)}
                className="px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white rounded-xl text-xs font-mono font-black uppercase tracking-wider transition-all flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-4 h-4" /> Create Page
              </button>
            </div>

            {/* Create Page Modal/Form Overlay */}
            {isCreatingPage && (
              <form onSubmit={handleCreatePage} className="p-6 rounded-3xl bg-[#0e0c25] border border-violet-500/20 space-y-4">
                <div className="flex items-center justify-between border-b border-white/5 pb-2">
                  <h4 className="text-xs font-mono font-black text-white uppercase tracking-widest">Create Public Page</h4>
                  <button type="button" onClick={() => setIsCreatingPage(false)} className="text-zinc-500 hover:text-white text-xs font-mono">Cancel</button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-mono text-zinc-400 uppercase font-bold">Display Name</label>
                    <input 
                      type="text" 
                      required
                      placeholder="e.g. Apex Coding Guild" 
                      value={newPageName}
                      onChange={(e) => setNewPageName(e.target.value)}
                      className="w-full px-3 py-2.5 bg-black/60 border border-violet-500/20 rounded-xl text-xs text-white placeholder-zinc-600"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-mono text-zinc-400 uppercase font-bold">Username</label>
                    <input 
                      type="text" 
                      required
                      placeholder="e.g. apex_coding_guild" 
                      value={newPageUsername}
                      onChange={(e) => setNewPageUsername(e.target.value)}
                      className="w-full px-3 py-2.5 bg-black/60 border border-violet-500/20 rounded-xl text-xs text-white placeholder-zinc-600"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-mono text-zinc-400 uppercase font-bold">Category</label>
                    <select
                      value={newPageCategory}
                      onChange={(e: any) => setNewPageCategory(e.target.value)}
                      className="w-full px-3 py-2.5 bg-black/60 border border-violet-500/20 rounded-xl text-xs text-white"
                    >
                      <option value="Creator">🎨 Creator</option>
                      <option value="Brand">🏷️ Brand</option>
                      <option value="Business">💼 Business</option>
                      <option value="Community">🏟️ Community</option>
                      <option value="Organization">🏢 Organization</option>
                      <option value="Public Figure">👑 Public Figure</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-mono text-zinc-400 uppercase font-bold">Website</label>
                    <input 
                      type="text" 
                      placeholder="e.g. www.apex.ai" 
                      value={newPageWebsite}
                      onChange={(e) => setNewPageWebsite(e.target.value)}
                      className="w-full px-3 py-2.5 bg-black/60 border border-violet-500/20 rounded-xl text-xs text-white placeholder-zinc-600"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-mono text-zinc-400 uppercase font-bold">Contact Email</label>
                    <input 
                      type="email" 
                      placeholder="e.g. contact@apex.co" 
                      value={newPageEmail}
                      onChange={(e) => setNewPageEmail(e.target.value)}
                      className="w-full px-3 py-2.5 bg-black/60 border border-violet-500/20 rounded-xl text-xs text-white placeholder-zinc-600"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-mono text-zinc-400 uppercase font-bold">Contact Phone</label>
                    <input 
                      type="text" 
                      placeholder="e.g. +234 812 3456" 
                      value={newPagePhone}
                      onChange={(e) => setNewPagePhone(e.target.value)}
                      className="w-full px-3 py-2.5 bg-black/60 border border-violet-500/20 rounded-xl text-xs text-white placeholder-zinc-600"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-mono text-zinc-400 uppercase font-bold">Short Bio</label>
                  <input 
                    type="text" 
                    placeholder="Short subtitle or tagline..." 
                    value={newPageBio}
                    onChange={(e) => setNewPageBio(e.target.value)}
                    className="w-full px-3 py-2 bg-black/60 border border-violet-500/20 rounded-xl text-xs text-white placeholder-zinc-600"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-mono text-zinc-400 uppercase font-bold">About Organization</label>
                  <textarea 
                    placeholder="Provide full details regarding community guidelines, business history, or creative milestones..." 
                    value={newPageAbout}
                    onChange={(e) => setNewPageAbout(e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 bg-black/60 border border-violet-500/20 rounded-xl text-xs text-white placeholder-zinc-600 font-sans"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-3 bg-violet-600 hover:bg-violet-500 text-white rounded-xl text-xs font-mono font-black uppercase tracking-wider transition-all"
                >
                  Create & Link Page
                </button>
              </form>
            )}

            {/* Listing existing pages */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {creatorPages.map(page => (
                <div key={page.id} className="p-5 rounded-3xl bg-[#0b081c] border border-violet-500/10 flex flex-col justify-between gap-4">
                  <div className="flex gap-3.5 items-start">
                    <img 
                      src={page.avatar} 
                      alt={page.name} 
                      className="w-12 h-12 rounded-2xl object-cover ring-2 ring-violet-500/40"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <h4 className="text-sm font-sans font-bold text-white truncate">{page.name}</h4>
                        <span className="px-1.5 py-0.5 bg-violet-900/50 border border-violet-500/20 rounded text-[8px] font-mono text-violet-300 font-black uppercase">
                          {page.category}
                        </span>
                      </div>
                      <p className="text-[10px] text-zinc-500 font-mono">@{page.username}</p>
                      <p className="text-xs text-zinc-400 mt-1.5 leading-relaxed truncate">{page.bio}</p>
                    </div>
                  </div>

                  {/* Visual metrics bar */}
                  <div className="grid grid-cols-2 gap-2 py-1.5 px-3 bg-black/20 border border-white/5 rounded-xl text-center text-[10px] font-mono">
                    <div>
                      <span className="text-zinc-500 block text-[9px]">FOLLOWERS</span>
                      <span className="font-extrabold text-violet-400">{page.followers.toLocaleString()}</span>
                    </div>
                    <div>
                      <span className="text-zinc-500 block text-[9px]">FOLLOWING</span>
                      <span className="font-extrabold text-violet-400">{page.following.toLocaleString()}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleSwitchToPage(page)}
                      className="flex-1 py-2 bg-violet-950 hover:bg-violet-900 border border-violet-500/25 text-violet-300 rounded-xl text-[10px] font-mono font-black uppercase tracking-wider transition-all cursor-pointer text-center"
                    >
                      Switch Active Identity
                    </button>
                    {page.website && (
                      <a 
                        href={`https://${page.website}`} 
                        target="_blank" 
                        rel="noreferrer"
                        className="p-2 bg-black/40 border border-white/5 hover:border-violet-500/30 text-zinc-400 hover:text-white rounded-xl transition-all"
                      >
                        <Globe className="w-4 h-4" />
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 3: EARNINGS & WALLET */}
        {activeTab === 'earnings' && (
          <div className="space-y-6 text-left">
            
            {/* Wallet Overview widgets */}
            <div className="p-6 rounded-3xl bg-linear-to-r from-violet-950 to-pink-950 border border-violet-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
              <div className="space-y-2">
                <span className="text-[9px] font-mono text-pink-300 font-extrabold uppercase tracking-widest block leading-none">NEX BIT-WALLET BALANCE</span>
                <h2 className="text-4xl font-black text-white leading-none">
                  {walletBalance.toLocaleString()} <span className="text-base font-mono font-normal text-pink-400">NEX</span>
                </h2>
                <div className="flex gap-4 pt-1 flex-wrap text-xs text-zinc-400 font-sans">
                  <p>Lifetime: <span className="font-bold text-white">{formatVal(lifetimeEarnings)} NEX</span></p>
                  <p>Pending: <span className="font-bold text-white">{formatVal(pendingEarnings)} NEX</span></p>
                </div>
              </div>

              {/* Quick Withdraw form */}
              <form onSubmit={handleWithdrawal} className="bg-black/45 p-4 rounded-2xl border border-white/5 space-y-3 shrink-0 w-full sm:w-72">
                <div className="flex items-center gap-1">
                  <CreditCard className="w-4 h-4 text-violet-400" />
                  <span className="text-[10px] font-mono text-zinc-300 uppercase font-black">Disburse Funds</span>
                </div>
                <div className="flex gap-1.5">
                  <input 
                    type="number" 
                    placeholder="Amount (NEX)" 
                    value={withdrawAmount}
                    onChange={(e) => setWithdrawAmount(e.target.value)}
                    className="flex-1 bg-black/60 border border-violet-500/20 px-3 py-1.5 rounded-xl text-xs text-white"
                  />
                  <button 
                    type="submit"
                    className="px-3 py-1.5 bg-violet-600 hover:bg-violet-500 text-white text-xs font-mono font-black uppercase rounded-xl"
                  >
                    Send
                  </button>
                </div>
                <div className="flex items-center justify-between text-[8px] font-mono text-zinc-500">
                  <span>Payout Rate: 1 NEX = ₦1.5</span>
                  <span>Fee: 0%</span>
                </div>
              </form>
            </div>

            {/* Split layout for eligibility checklist and payout options */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Payout configurations */}
              <div className="p-5 rounded-3xl bg-[#0b081c] border border-violet-500/10 space-y-4">
                <h4 className="text-xs font-mono font-black text-white uppercase tracking-widest border-b border-white/5 pb-2">Payout Channel Selection</h4>
                
                <div className="flex gap-2">
                  {(['bank', 'paypal', 'crypto'] as const).map(method => (
                    <button
                      key={method}
                      type="button"
                      onClick={() => setPayoutMethod(method)}
                      className={`flex-1 py-2 text-[10px] font-mono uppercase font-black rounded-xl border transition-all cursor-pointer ${
                        payoutMethod === method 
                          ? 'bg-violet-600 border-violet-500 text-white' 
                          : 'bg-black/35 border-white/5 text-zinc-400 hover:border-white/10'
                      }`}
                    >
                      {method}
                    </button>
                  ))}
                </div>

                {payoutMethod === 'bank' && (
                  <div className="space-y-3">
                    <div>
                      <label className="text-[8.5px] font-mono text-zinc-500 block uppercase">Bank Name</label>
                      <input 
                        type="text" 
                        value={bankName} 
                        onChange={(e) => setBankName(e.target.value)}
                        className="w-full bg-black/40 border border-white/5 px-3 py-2 rounded-xl text-xs text-white"
                      />
                    </div>
                    <div>
                      <label className="text-[8.5px] font-mono text-zinc-500 block uppercase">Account Number</label>
                      <input 
                        type="text" 
                        value={accountNumber} 
                        onChange={(e) => setAccountNumber(e.target.value)}
                        className="w-full bg-black/40 border border-white/5 px-3 py-2 rounded-xl text-xs text-white"
                      />
                    </div>
                  </div>
                )}

                {payoutMethod === 'paypal' && (
                  <div>
                    <label className="text-[8.5px] font-mono text-zinc-500 block uppercase">PayPal Email Address</label>
                    <input 
                      type="email" 
                      value={paypalEmail} 
                      onChange={(e) => setPaypalEmail(e.target.value)}
                      className="w-full bg-black/40 border border-white/5 px-3 py-2 rounded-xl text-xs text-white"
                    />
                  </div>
                )}

                {payoutMethod === 'crypto' && (
                  <div>
                    <label className="text-[8.5px] font-mono text-zinc-500 block uppercase">Web3 EVM Wallet Address</label>
                    <input 
                      type="text" 
                      value={cryptoAddress} 
                      onChange={(e) => setCryptoAddress(e.target.value)}
                      className="w-full bg-black/40 border border-white/5 px-3 py-2 rounded-xl text-xs text-white"
                    />
                  </div>
                )}
              </div>

              {/* Eligibility progress checklist */}
              <div className="p-5 rounded-3xl bg-[#0b081c] border border-violet-500/10 space-y-4">
                <h4 className="text-xs font-mono font-black text-white uppercase tracking-widest border-b border-white/5 pb-2">Creator eligibility status</h4>
                
                <div className="space-y-3.5">
                  <div className="space-y-1">
                    <div className="flex justify-between text-[10px] font-mono">
                      <span className="text-zinc-400">Follower Milestone (1,000 req.)</span>
                      <span className="text-violet-400 font-bold">{currentUser.followers} / 1,000</span>
                    </div>
                    <div className="h-1.5 bg-black/40 rounded-full overflow-hidden">
                      <div className="h-full bg-violet-500" style={{ width: `${Math.min(100, (currentUser.followers / 1000) * 100)}%` }} />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between text-[10px] font-mono">
                      <span className="text-zinc-400">Missions Completed (3 req.)</span>
                      <span className="text-violet-400 font-bold">{currentUser.reputationBreakdown.missionsCompleted} / 3</span>
                    </div>
                    <div className="h-1.5 bg-black/40 rounded-full overflow-hidden">
                      <div className="h-full bg-violet-500" style={{ width: `${Math.min(100, (currentUser.reputationBreakdown.missionsCompleted / 3) * 100)}%` }} />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between text-[10px] font-mono">
                      <span className="text-zinc-400">Reputation Score (100 req.)</span>
                      <span className="text-violet-400 font-bold">{currentUser.reputationPoints} / 100</span>
                    </div>
                    <div className="h-1.5 bg-black/40 rounded-full overflow-hidden">
                      <div className="h-full bg-violet-500" style={{ width: `${Math.min(100, (currentUser.reputationPoints / 100) * 100)}%` }} />
                    </div>
                  </div>

                  <div className="flex items-center gap-2 p-2 rounded-xl bg-violet-950/20 border border-violet-500/10 text-[10px] font-mono text-violet-300">
                    <CheckCircle className="w-4 h-4 shrink-0 text-emerald-400" />
                    <span>Your account is in great standing. Keep engaging!</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Payout log transaction history */}
            <div className="p-5 rounded-3xl bg-[#0b081c] border border-violet-500/10 space-y-4">
              <h4 className="text-xs font-mono font-black text-white uppercase tracking-widest border-b border-white/5 pb-2">Recent transactions</h4>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-[10px] font-mono text-zinc-400">
                  <thead>
                    <tr className="border-b border-white/5 text-zinc-500 uppercase">
                      <th className="pb-2">TXID</th>
                      <th className="pb-2">AMOUNT</th>
                      <th className="pb-2">PAYOUT CHANNEL</th>
                      <th className="pb-2">DATE & TIME</th>
                      <th className="pb-2">STATUS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {withdrawalHistory.map(tx => (
                      <tr key={tx.id} className="border-b border-white/5 last:border-0">
                        <td className="py-3 text-white font-black">{tx.id}</td>
                        <td className="py-3 text-violet-400 font-bold">-{tx.amount.toLocaleString()} NEX</td>
                        <td className="py-3 truncate max-w-xs">{tx.method}</td>
                        <td className="py-3">{tx.date}</td>
                        <td className="py-3">
                          <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase ${
                            tx.status === 'approved' ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400' : 'bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 animate-pulse'
                          }`}>
                            {tx.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: COLLABS */}
        {activeTab === 'collabs' && (
          <div className="space-y-6 text-left">
            
            {/* Split layout: active invites vs send new invite */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Invite a collaborator form */}
              <div className="p-5 rounded-3xl bg-[#0b081c] border border-violet-500/10 space-y-4">
                <h4 className="text-xs font-mono font-black text-white uppercase tracking-widest border-b border-white/5 pb-2">Invite Collaborator</h4>
                <form onSubmit={handleSendCollabInvite} className="space-y-3.5">
                  <div className="space-y-1">
                    <label className="text-[9px] font-mono text-zinc-500 uppercase">Username</label>
                    <input 
                      type="text" 
                      required
                      placeholder="e.g. alex, sarah_growth" 
                      value={inviteCollabUsername}
                      onChange={(e) => setInviteCollabUsername(e.target.value)}
                      className="w-full bg-black/40 border border-white/5 px-3 py-2 rounded-xl text-xs text-white placeholder-zinc-600"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-mono text-zinc-500 uppercase">Interactive Proposal</label>
                    <textarea 
                      required
                      placeholder="Propose a co-authored visual loop or post content split..." 
                      value={inviteCollabProposal}
                      onChange={(e) => setInviteCollabProposal(e.target.value)}
                      rows={3}
                      className="w-full bg-black/40 border border-white/5 px-3 py-2 rounded-xl text-xs text-white placeholder-zinc-600 font-sans"
                    />
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between text-[9px] font-mono text-zinc-500 uppercase">
                      <span>Revenue split ratio</span>
                      <span className="text-violet-400 font-bold">{inviteCollabSplit}% / {100 - inviteCollabSplit}%</span>
                    </div>
                    <input 
                      type="range" 
                      min="10" 
                      max="90" 
                      value={inviteCollabSplit}
                      onChange={(e) => setInviteCollabSplit(Number(e.target.value))}
                      className="w-full accent-violet-500 cursor-pointer"
                    />
                  </div>
                  <button 
                    type="submit"
                    className="w-full py-2.5 bg-violet-600 hover:bg-violet-500 text-white rounded-xl text-xs font-mono font-black uppercase tracking-wider transition-all"
                  >
                    Send Invitation
                  </button>
                </form>
              </div>

              {/* Active incoming invites */}
              <div className="p-5 rounded-3xl bg-[#0b081c] border border-violet-500/10 space-y-4">
                <h4 className="text-xs font-mono font-black text-white uppercase tracking-widest border-b border-white/5 pb-2">Incoming collaboration invites</h4>
                
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {collabInvites.map(invite => (
                    <div key={invite.id} className="p-4 rounded-2xl bg-black/35 border border-white/5 space-y-3">
                      <div className="flex gap-2.5 items-start">
                        <img src={invite.senderAvatar} alt="" className="w-8 h-8 rounded-xl object-cover ring-1 ring-violet-500/30" />
                        <div className="flex-1 min-w-0">
                          <h5 className="text-xs font-bold text-white leading-tight">{invite.senderName}</h5>
                          <p className="text-[9px] text-zinc-500 font-mono">@{invite.senderUsername}</p>
                        </div>
                      </div>
                      <p className="text-[11px] text-zinc-300 leading-normal font-sans text-left">{invite.proposal}</p>
                      
                      <div className="flex items-center justify-between text-[9px] font-mono bg-black/40 px-2 py-1.5 rounded-lg border border-white/5">
                        <span className="text-zinc-500">REVENUE SPLIT:</span>
                        <span className="text-violet-400 font-black">{invite.revenueSplit}% / {100 - invite.revenueSplit}%</span>
                      </div>

                      {invite.status === 'pending' ? (
                        <div className="grid grid-cols-2 gap-2 text-[10px] font-mono uppercase font-black pt-1">
                          <button 
                            type="button"
                            onClick={() => handleCollabAction(invite.id, 'decline')}
                            className="py-1.5 bg-zinc-900 hover:bg-zinc-850 text-zinc-400 rounded-xl transition-all cursor-pointer border border-white/5"
                          >
                            Decline
                          </button>
                          <button 
                            type="button"
                            onClick={() => handleCollabAction(invite.id, 'accept')}
                            className="py-1.5 bg-violet-600 hover:bg-violet-500 text-white rounded-xl transition-all cursor-pointer"
                          >
                            Accept
                          </button>
                        </div>
                      ) : (
                        <div className="text-center py-1 bg-white/5 rounded-xl border border-white/5">
                          <span className={`text-[9px] font-mono uppercase font-black ${
                            invite.status === 'accepted' ? 'text-emerald-400' : 'text-zinc-500'
                          }`}>
                            {invite.status === 'accepted' ? '✓ Accepted & Linked' : 'Declined'}
                          </span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Sponsored campaigns brand ops */}
            <div className="p-5 rounded-3xl bg-[#0b081c] border border-violet-500/10 space-y-4">
              <h4 className="text-xs font-mono font-black text-white uppercase tracking-widest border-b border-white/5 pb-2">Sponsored brand campaigns</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {activeSponsoredComps.map(comp => (
                  <div key={comp.id} className="p-4 rounded-2xl bg-black/35 border border-white/5 flex flex-col justify-between gap-3 text-left">
                    <div className="space-y-1">
                      <span className="text-[8px] font-mono text-pink-400 bg-pink-500/10 border border-pink-500/20 px-2 py-0.5 rounded uppercase font-black">
                        {comp.brand}
                      </span>
                      <h5 className="text-xs font-sans font-bold text-white pt-1">{comp.title}</h5>
                      <p className="text-[10px] text-zinc-400 leading-normal pt-1">{comp.desc}</p>
                    </div>
                    <div className="flex items-center justify-between text-[9px] font-mono pt-2 border-t border-white/5">
                      <span className="text-zinc-500">PRIZE POOL: <b className="text-emerald-400">{comp.prize}</b></span>
                      <button 
                        onClick={() => window.dispatchEvent(new CustomEvent('toast', { detail: `🚀 Proposal submitted to ${comp.brand}!` }))}
                        className="px-3 py-1 bg-violet-600 hover:bg-violet-500 text-white rounded-lg text-[8.5px] font-black uppercase tracking-wider cursor-pointer"
                      >
                        Apply Now
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: DRAFTS */}
        {activeTab === 'drafts' && (
          <div className="p-5 rounded-3xl bg-[#0b081c] border border-violet-500/10 space-y-6 text-left">
            <h3 className="text-sm font-sans font-black text-white uppercase tracking-wider">My Drafts</h3>
            <p className="text-xs text-zinc-400">Manage your unpublished video drafts.</p>
            <div className="p-10 rounded-3xl bg-black/40 border border-violet-500/10 text-center text-zinc-500 text-xs font-mono">
              No drafts available. Create new content to get started.
            </div>
          </div>
        )}

        {/* TAB 5: SCHEDULER / HEATMAP */}
        {activeTab === 'insights' && (
          <div className="p-5 rounded-3xl bg-[#0b081c] border border-violet-500/10 space-y-6 text-left">
            <div className="flex items-center justify-between border-b border-white/5 pb-4">
              <div>
                <h3 className="text-sm font-sans font-black text-white uppercase tracking-wider flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-violet-400" /> Posting Schedule Optimizations
                </h3>
                <p className="text-[10px] text-zinc-400">Heatmap tracking global user activity spikes for optimal engagement rates.</p>
              </div>
              <span className="text-[8px] font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded uppercase font-black">
                Optimal Window Active
              </span>
            </div>

            {/* Top Metrics Details Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-2.5 bg-black/30 rounded-xl border border-white/5">
                <span className="text-[8.5px] font-mono text-zinc-500 uppercase block leading-none">Best Posting Days</span>
                <span className="text-xs font-sans font-black text-white mt-1.5 block">Wednesday & Friday</span>
              </div>
              <div className="p-2.5 bg-black/30 rounded-xl border border-white/5">
                <span className="text-[8.5px] font-mono text-zinc-500 uppercase block leading-none">Best Posting Hours</span>
                <span className="text-xs font-sans font-black text-white mt-1.5 block">2:00 PM - 6:00 PM</span>
              </div>
              <div className="p-2.5 bg-black/30 rounded-xl border border-white/5">
                <span className="text-[8.5px] font-mono text-zinc-500 uppercase block leading-none">Peak Audience Time</span>
                <span className="text-xs font-sans font-black text-white mt-1.5 block">4:00 PM - 8:00 PM</span>
              </div>
              <div className="p-2.5 bg-black/30 rounded-xl border border-white/5">
                <span className="text-[8.5px] font-mono text-zinc-500 uppercase block leading-none">Top Content Format</span>
                <span className="text-xs font-sans font-black text-purple-300 mt-1.5 block">Video Loops 🎥</span>
              </div>
            </div>

            {/* Grid Visualizer */}
            <div className="space-y-2">
              <div className="flex justify-between text-[9px] font-mono text-zinc-500 px-1 pt-1">
                <span>Morning (08:00)</span>
                <span>Noon (12:00)</span>
                <span>Afternoon (16:00)</span>
                <span>Evening (20:00)</span>
                <span>Midnight (00:00)</span>
              </div>

              <div className="space-y-1 bg-black/30 p-3 rounded-xl border border-white/5">
                {['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map((day, dIdx) => {
                  const isHotDay = dIdx === 3 || dIdx === 5;
                  return (
                    <div key={day} className="flex items-center gap-2">
                      <span className="w-8 text-[9px] font-mono text-zinc-400 text-left truncate">{day.substring(0, 3)}</span>
                      <div className="flex-1 flex gap-1">
                        {Array.from({ length: 12 }).map((_, hIdx) => {
                          const isPeakHour = hIdx >= 4 && hIdx <= 8;
                          let opacityLevel = 10;
                          if (isHotDay && isPeakHour) {
                            opacityLevel = 90;
                          } else if (isHotDay || isPeakHour) {
                            opacityLevel = 50;
                          } else if (hIdx % 3 === 0) {
                            opacityLevel = 30;
                          }
                          
                          const styleClass = opacityLevel === 90 
                            ? 'bg-purple-500 shadow-[0_0_8px_rgba(168,85,247,0.4)]' 
                            : opacityLevel === 50 
                            ? 'bg-[#8B5CF6]/60' 
                            : opacityLevel === 30 
                            ? 'bg-[#8B5CF6]/20' 
                            : 'bg-zinc-800/20';

                          return (
                            <div 
                              key={hIdx} 
                              className={`flex-1 h-3.5 sm:h-4.5 rounded-sm transition-all hover:scale-115 hover:ring-1 hover:ring-purple-300 cursor-crosshair ${styleClass}`}
                              title={`${day} block ${hIdx * 2}:00 — Engagement boost: ${opacityLevel}%`}
                            />
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="flex items-center gap-3 justify-end text-[9px] font-mono text-zinc-500 pt-1 select-none">
                <span>Muted (0%)</span>
                <div className="flex items-center gap-0.5">
                  <div className="w-2 h-2 bg-zinc-800 rounded-xs" />
                  <div className="w-2 h-2 bg-purple-900/20 rounded-xs" />
                  <div className="w-2 h-2 bg-purple-700/60 rounded-xs" />
                  <div className="w-2 h-2 bg-purple-500 rounded-xs" />
                </div>
                <span>Extreme Engagement Spike (100%)</span>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
