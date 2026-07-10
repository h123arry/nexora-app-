import React, { useState, useEffect } from 'react';
import { 
  X, Users, Shield, Plus, ChevronRight, Trash, Link as LinkIcon, BarChart2, VolumeX, Volume2, 
  Pin, CheckCircle, Copy, PlusCircle, Send, Sparkles, Image as ImageIcon, FileText, Settings, 
  Radio, Bell, Search, AlertCircle, Play, Pause, Video, Mic, Eye, Check, Lock, Globe, QrCode, 
  MoreVertical, ShieldAlert, Award, Sliders, RefreshCw, Calendar, Flame, AlertTriangle, Clock, 
  Trash2, MicOff, VideoOff, Monitor, Check as CheckIcon
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Chat, User } from '../types';

interface GroupMember {
  id: string;
  name: string;
  username: string;
  role: 'Owner' | 'Admin' | 'Moderator' | 'Member';
  avatar: string;
  isOnline: boolean;
  lastActive?: string;
  isMuted?: boolean;
  isSuspended?: boolean;
  badge?: string;
}

interface JoinRequest {
  id: string;
  userId: string;
  name: string;
  username: string;
  avatar: string;
  bio: string;
  requestedAt: string;
  rejectionReason?: string;
}

interface SharedAsset {
  id: string;
  name: string;
  type: 'photo' | 'video' | 'voice' | 'file' | 'link' | 'gif' | 'doc';
  url: string;
  size?: string;
  uploadedBy: string;
  timestamp: string;
  isPinned?: boolean;
}

interface ModerationLog {
  id: string;
  adminName: string;
  action: string;
  targetName: string;
  timestamp: string;
  reason?: string;
}

interface GroupDashboardProps {
  isOpen: boolean;
  onClose: () => void;
  groupName: string;
  groupAvatar: string;
  groupDescription: string;
  activeChat?: Chat;
  onUpdateGroup?: (updatedFields: Partial<Chat>) => void;
}

// Preset assets for Shared Media
const INITIAL_SHARED_ASSETS: SharedAsset[] = [
  { id: 'sa-1', name: 'core_architecture_spec.pdf', type: 'file', url: '#', size: '2.8 MB', uploadedBy: 'Harrison (You)', timestamp: '2 hours ago' },
  { id: 'sa-2', name: 'UI_Design_Preview.png', type: 'photo', url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600', size: '4.1 MB', uploadedBy: 'Sophia', timestamp: 'Yesterday' },
  { id: 'sa-3', name: 'dev_discussion_clip.mp4', type: 'video', url: '#', size: '18.4 MB', uploadedBy: 'Marcus', timestamp: '3 days ago' },
  { id: 'sa-4', name: 'https://github.com/nexora-core/sandbox', type: 'link', url: 'https://github.com/nexora-core/sandbox', uploadedBy: 'Harrison (You)', timestamp: 'Last week', isPinned: true },
  { id: 'sa-5', name: 'voice_memo_04_07.aac', type: 'voice', url: '#', size: '320 KB', uploadedBy: 'Luna', timestamp: 'Yesterday' },
  { id: 'sa-6', name: 'celebration_dance.gif', type: 'gif', url: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=200', uploadedBy: 'Ada', timestamp: '2 days ago' }
];

// Initial mock requests
const INITIAL_REQUESTS: JoinRequest[] = [
  { id: 'jr-1', userId: 'user-req-1', name: 'Elias Vance', username: 'elias_v', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100', bio: 'Full stack developer excited to align with Nexora protocols and contribute to decentralized chat routing.', requestedAt: '10 mins ago' },
  { id: 'jr-2', userId: 'user-req-2', name: 'Chloe Sterling', username: 'chloe_code', avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100', bio: 'Crypto researcher & smart contracts auditor. Looking to sync on the encrypted ledger system.', requestedAt: '1 hour ago' }
];

// Initial mock log registry
const INITIAL_MOD_LOGS: ModerationLog[] = [
  { id: 'log-1', adminName: 'Harrison (You)', action: 'Promoted to Moderator', targetName: 'Sophia', timestamp: '3 hours ago', reason: 'High reliability in community coordination' },
  { id: 'log-2', adminName: 'Harrison (You)', action: 'Muted user', targetName: 'SpamBot_99', timestamp: 'Yesterday', reason: 'Repetitive advertising links in main core' },
  { id: 'log-3', adminName: 'System', action: 'Privacy changed to PRIVATE', targetName: 'Node', timestamp: '2 days ago' }
];

export default function GroupDashboard({
  isOpen,
  onClose,
  groupName,
  groupAvatar,
  groupDescription,
  activeChat,
  onUpdateGroup
}: GroupDashboardProps) {
  // Tabs: overview, media, peers, requests, stage, moderation, invite, search
  const [activeTab, setActiveTab] = useState<'overview' | 'media' | 'peers' | 'requests' | 'stage' | 'moderation' | 'invite' | 'search'>('overview');
  
  // Core Group state synced with props or initialized
  const [name, setName] = useState(groupName);
  const [description, setDescription] = useState(groupDescription);
  const [avatar, setAvatar] = useState(groupAvatar);
  const [banner, setBanner] = useState(activeChat?.groupBanner || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1000');
  const [category, setCategory] = useState(activeChat?.groupCategory || 'Technology');
  const [privacy, setPrivacy] = useState<'public' | 'private' | 'invite'>(activeChat?.groupPrivacy || 'public');
  const [themeAccent, setThemeAccent] = useState(activeChat?.groupTheme || '#8B5CF6'); // Theme color
  const [welcomeMsg, setWelcomeMsg] = useState(activeChat?.welcomeMessage || 'Welcome to our premium community node!');
  const [rules, setRules] = useState<string[]>(activeChat?.groupRules || [
    'Respect other members in this secure community',
    'Keep discussions relevant to the core topic',
    'No spam or unauthorized solicitation'
  ]);
  const [newRuleInput, setNewRuleInput] = useState('');

  // Secondary sub-module states
  const [members, setMembers] = useState<GroupMember[]>([
    { id: 'm-harrison', name: 'Harrison (You)', username: 'harrison_voh', role: 'Owner', avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100', isOnline: true, badge: '👑 Founder' },
    { id: 'm-sophia', name: 'Sophia Code', username: 'sophia_code', role: 'Admin', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100', isOnline: true, badge: '🛠️ Core Tech' },
    { id: 'm-luna', name: 'Luna Celestial', username: 'luna_design', role: 'Moderator', avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100', isOnline: true, lastActive: 'Active now', badge: '🎨 Designer' },
    { id: 'm-ada', name: 'Ada Matrix', username: 'ada_matrix', role: 'Member', avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=100', isOnline: false, lastActive: '2 hours ago' },
    { id: 'm-marcus', name: 'Marcus Dev', username: 'marcus_dev', role: 'Member', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100', isOnline: true, lastActive: 'Active now' }
  ]);
  const [requests, setRequests] = useState<JoinRequest[]>(INITIAL_REQUESTS);
  const [sharedAssets, setSharedAssets] = useState<SharedAsset[]>(INITIAL_SHARED_ASSETS);
  const [modLogs, setModLogs] = useState<ModerationLog[]>(INITIAL_MOD_LOGS);

  // Search & Filters
  const [memberSearchQuery, setMemberSearchQuery] = useState('');
  const [mediaSearchQuery, setMediaSearchQuery] = useState('');
  const [mediaActiveType, setMediaActiveType] = useState<'all' | 'photo' | 'voice' | 'file' | 'link'>('all');
  const [globalSearchQuery, setGlobalSearchQuery] = useState('');
  const [disappearingDuration, setDisappearingDuration] = useState<number>(0); // 0 = disabled

  // Live Stage Simulation states
  const [isCallingActive, setIsCallingActive] = useState(false);
  const [speakingMembers, setSpeakingMembers] = useState<string[]>([]);
  const [isMutedOnCall, setIsMutedOnCall] = useState(false);
  const [isCameraOnCall, setIsCameraOnCall] = useState(false);
  const [isScreenSharingCall, setIsScreenSharingCall] = useState(false);
  const [callVolume, setCallVolume] = useState<number>(80);

  // Invite link settings
  const [inviteLinkLimit, setInviteLinkLimit] = useState<string>('Unlimited');
  const [inviteLinkExpiry, setInviteLinkExpiry] = useState<string>('Never');
  const [inviteLinkDisabled, setInviteLinkDisabled] = useState(false);

  // Notification overrides
  const [notificationPreference, setNotificationPreference] = useState<'all' | 'mentions' | 'announcements' | 'muted'>('all');

  // Permission settings matrix
  const [permissions, setPermissions] = useState({
    sendMessages: true,
    sendMedia: true,
    sendVoice: true,
    startCalls: true,
    editGroupInfo: false, // only mods/admins
    inviteMembers: true,
    mentionEveryone: false,
    createPolls: true,
    pinMessages: false
  });

  // Rejection reason modal
  const [rejectionModalRequest, setRejectionModalRequest] = useState<JoinRequest | null>(null);
  const [rejectionReasonText, setRejectionReasonText] = useState('');

  // Sync state when props change
  useEffect(() => {
    if (activeChat) {
      setName(activeChat.partnerName);
      setDescription(activeChat.partnerBio);
      setAvatar(activeChat.partnerAvatar);
      if (activeChat.groupBanner) setBanner(activeChat.groupBanner);
      if (activeChat.groupCategory) setCategory(activeChat.groupCategory);
      if (activeChat.groupPrivacy) setPrivacy(activeChat.groupPrivacy);
      if (activeChat.groupTheme) setThemeAccent(activeChat.groupTheme);
      if (activeChat.welcomeMessage) setWelcomeMsg(activeChat.welcomeMessage);
      if (activeChat.groupRules) setRules(activeChat.groupRules);
    }
  }, [activeChat, isOpen]);

  // Speaking state simulator on Stage
  useEffect(() => {
    if (!isCallingActive) return;
    const interval = setInterval(() => {
      const liveSpeakers: string[] = [];
      members.forEach(m => {
        if (m.isOnline && Math.random() > 0.6) {
          liveSpeakers.push(m.id);
        }
      });
      setSpeakingMembers(liveSpeakers);
    }, 2000);
    return () => clearInterval(interval);
  }, [isCallingActive, members]);

  if (!isOpen) return null;

  // Trigger Chat level save
  const handlePropagateChanges = (updates: Partial<Chat>) => {
    if (onUpdateGroup) {
      onUpdateGroup(updates);
    }
  };

  // Profile fields edits
  const handleSaveProfileDetails = (e: React.FormEvent) => {
    e.preventDefault();
    handlePropagateChanges({
      partnerName: name,
      partnerBio: description,
      partnerAvatar: avatar,
      groupBanner: banner,
      groupCategory: category,
      groupPrivacy: privacy,
      groupTheme: themeAccent,
      welcomeMessage: welcomeMsg,
      groupRules: rules
    });
    setModLogs([
      { id: 'log-' + Date.now(), adminName: 'Harrison (You)', action: 'Updated Core Group Parameters', targetName: 'Node Profile', timestamp: 'Just now' },
      ...modLogs
    ]);
    window.dispatchEvent(new CustomEvent('toast', { detail: "💾 Group Core Settings synchronized on decentral-ledger!" }));
  };

  // Add custom rule
  const handleAddRule = () => {
    if (newRuleInput.trim()) {
      const updatedRules = [...rules, newRuleInput.trim()];
      setRules(updatedRules);
      setNewRuleInput('');
      handlePropagateChanges({ groupRules: updatedRules });
      window.dispatchEvent(new CustomEvent('toast', { detail: "📜 Codex rules list updated." }));
    }
  };

  const handleRemoveRule = (index: number) => {
    const updatedRules = rules.filter((_, i) => i !== index);
    setRules(updatedRules);
    handlePropagateChanges({ groupRules: updatedRules });
  };

  // Accept Request
  const handleAcceptRequest = (req: JoinRequest) => {
    setRequests(prev => prev.filter(r => r.id !== req.id));
    // Add to members list
    setMembers(prev => [
      ...prev,
      { id: req.userId, name: req.name, username: req.username, role: 'Member', avatar: req.avatar, isOnline: true }
    ]);
    // Log
    setModLogs([
      { id: 'log-' + Date.now(), adminName: 'Harrison (You)', action: 'Approved join request', targetName: `@${req.username}`, timestamp: 'Just now' },
      ...modLogs
    ]);
    // update count
    handlePropagateChanges({ membersCount: members.length + 1 });
    window.dispatchEvent(new CustomEvent('toast', { detail: `✅ Approved @${req.username} into core conversation.` }));
  };

  // Reject request
  const handleRejectRequestSubmit = () => {
    if (!rejectionModalRequest) return;
    const req = rejectionModalRequest;
    setRequests(prev => prev.filter(r => r.id !== req.id));
    setModLogs([
      { id: 'log-' + Date.now(), adminName: 'Harrison (You)', action: 'Rejected join request', targetName: `@${req.username}`, timestamp: 'Just now', reason: rejectionReasonText || 'Unspecified reasons' },
      ...modLogs
    ]);
    setRejectionModalRequest(null);
    setRejectionReasonText('');
    window.dispatchEvent(new CustomEvent('toast', { detail: `❌ Request from @${req.username} rejected.` }));
  };

  // Promote Member Role
  const handleCycleRole = (memberId: string) => {
    setMembers(prev => prev.map(m => {
      if (m.id === memberId) {
        let nextRole: GroupMember['role'] = 'Member';
        if (m.role === 'Member') nextRole = 'Moderator';
        else if (m.role === 'Moderator') nextRole = 'Admin';
        else if (m.role === 'Admin') nextRole = 'Member'; // Cycle back, Owner is locked
        
        if (m.role === 'Owner') return m; // Owner is static

        // Log mod action
        setModLogs(logs => [
          { id: 'log-' + Date.now(), adminName: 'Harrison (You)', action: `Updated Role from ${m.role} to ${nextRole}`, targetName: `@${m.username}`, timestamp: 'Just now' },
          ...logs
        ]);

        window.dispatchEvent(new CustomEvent('toast', { detail: `👑 @${m.username} designated as ${nextRole}.` }));
        return { ...m, role: nextRole };
      }
      return m;
    }));
  };

  // Mute member
  const handleToggleMuteMember = (memberId: string) => {
    setMembers(prev => prev.map(m => {
      if (m.id === memberId) {
        const nextState = !m.isMuted;
        setModLogs(logs => [
          { id: 'log-' + Date.now(), adminName: 'Harrison (You)', action: nextState ? 'Muted communication' : 'Restored communication', targetName: `@${m.username}`, timestamp: 'Just now' },
          ...logs
        ]);
        window.dispatchEvent(new CustomEvent('toast', { detail: `${nextState ? '🔇 Muted' : '🔊 Unmuted'} @${m.username}.` }));
        return { ...m, isMuted: nextState };
      }
      return m;
    }));
  };

  // Ban member
  const handleBanMember = (member: GroupMember) => {
    if (window.confirm(`Are you sure you want to permanently blacklist and ban @${member.username} from this node?`)) {
      setMembers(prev => prev.filter(m => m.id !== member.id));
      setModLogs(logs => [
        { id: 'log-' + Date.now(), adminName: 'Harrison (You)', action: 'Permanently Banned', targetName: `@${member.username}`, timestamp: 'Just now', reason: 'Safety violation' },
        ...logs
      ]);
      handlePropagateChanges({ membersCount: members.length - 1 });
      window.dispatchEvent(new CustomEvent('toast', { detail: `🚫 Blacklisted and banned @${member.username}.` }));
    }
  };

  // Filter lists based on search
  const filteredPeersList = members.filter(m => 
    m.name.toLowerCase().includes(memberSearchQuery.toLowerCase()) ||
    m.username.toLowerCase().includes(memberSearchQuery.toLowerCase())
  );

  const filteredMediaList = sharedAssets.filter(asset => {
    const matchesQuery = asset.name.toLowerCase().includes(mediaSearchQuery.toLowerCase());
    if (!matchesQuery) return false;
    if (mediaActiveType !== 'all' && asset.type !== mediaActiveType) return false;
    return true;
  });

  const highlightText = (text: string, query: string) => {
    if (!query) return text;
    const parts = text.split(new RegExp(`(${query})`, 'gi'));
    return (
      <>
        {parts.map((part, i) => 
          part.toLowerCase() === query.toLowerCase() 
            ? <mark key={i} className="bg-yellow-400 text-black px-0.5 rounded font-bold">{part}</mark> 
            : part
        )}
      </>
    );
  };

  return (
    <div className="absolute inset-0 z-40 bg-[#06040f]/95 backdrop-blur-2xl flex flex-col md:flex-row h-full border-l border-violet-500/10 text-white font-sans overflow-hidden select-none">
      
      {/* ========================================== */}
      {/* LEFT COLUMN: CONTROL & NAVIGATION DECK */}
      {/* ========================================== */}
      <div className="w-full md:w-64 border-r border-white/5 bg-[#03010a]/80 flex flex-col shrink-0">
        {/* Upper Group Identifier card */}
        <div className="p-4 border-b border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <img 
                src={avatar} 
                alt={name} 
                className="w-10 h-10 rounded-xl object-cover border border-white/10" 
              />
              <div 
                className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center text-[8px] bg-[#09071c] border border-white/10"
                style={{ color: themeAccent }}
              >
                ★
              </div>
            </div>
            <div className="text-left leading-none">
              <h3 className="text-xs font-black font-sans text-white truncate max-w-[120px]">{name}</h3>
              <span className="text-[8px] font-mono text-zinc-500 uppercase">@{category} Node</span>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 hover:bg-white/5 border border-white/15 rounded-xl text-zinc-400 hover:text-white transition-all cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Scrolling navigation sidebar */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1.5 custom-scrollbar text-left">
          <div className="text-[8px] font-mono uppercase tracking-widest text-zinc-600 px-3 py-1 font-black">Management Deck</div>
          {[
            { id: 'overview', label: '🛡️ Core Overview', desc: 'Cover, Codex & Themes' },
            { id: 'peers', label: '👥 Peers & Roles', desc: `Peers (${members.length}) • ${members.filter(m => m.isOnline).length} Online` },
            { id: 'requests', label: '📨 Onboarding requests', desc: `${requests.length} Pending Review` },
            { id: 'stage', label: '🎙️ Voice Spaces Stage', desc: isCallingActive ? '🔴 LIVE EVENT' : 'Go live now' },
            { id: 'media', label: '🗂️ Shared Media Hub', desc: 'Shared photos, docs & notes' },
            { id: 'search', label: '🔍 Ledger Search', desc: 'Highlighter queries' },
            { id: 'invite', label: '🔑 Invite & QR Code', desc: 'Secure authorization keys' },
            { id: 'moderation', label: '📜 Safety & Logs', desc: 'Audit registries & Reports' }
          ].map(tab => {
            const isSel = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`w-full p-2.5 px-3 rounded-2xl transition-all flex flex-col text-left cursor-pointer relative ${
                  isSel 
                    ? 'bg-white/5 shadow-md ring-1 ring-white/10' 
                    : 'hover:bg-white/5 text-zinc-400 hover:text-white'
                }`}
              >
                {isSel && (
                  <div 
                    className="absolute left-0 top-1/4 bottom-1/4 w-[3px] rounded-r-md transition-colors"
                    style={{ backgroundColor: themeAccent }}
                  />
                )}
                <span className="text-[11px] font-bold leading-tight" style={{ color: isSel ? themeAccent : undefined }}>{tab.label}</span>
                <span className="text-[8px] opacity-60 leading-tight mt-0.5 font-sans">{tab.desc}</span>
              </button>
            );
          })}
        </div>

        {/* Global node controls / quick indicator */}
        <div className="p-4 border-t border-white/5 bg-black/40 text-left space-y-1.5">
          <div className="flex items-center justify-between text-[9px] font-mono text-zinc-500">
            <span>DISAPPEARING</span>
            <span style={{ color: themeAccent }}>{disappearingDuration === 0 ? 'Disabled' : disappearingDuration === 10 ? '10 seconds' : disappearingDuration === 60 ? '1 hour' : '1 day'}</span>
          </div>
          <div className="flex items-center justify-between text-[9px] font-mono text-zinc-500">
            <span>NOTIFICATIONS</span>
            <span className="text-zinc-300">{notificationPreference.toUpperCase()}</span>
          </div>
        </div>
      </div>

      {/* ========================================== */}
      {/* RIGHT COLUMN: CORE WORKSPACE CANVAS */}
      {/* ========================================== */}
      <div className="flex-1 bg-[#05030d] flex flex-col relative overflow-hidden h-full">
        
        {/* Tab Header Banner and profile details */}
        <div className="relative h-32 border-b border-white/5 flex items-end p-5 shrink-0">
          <img 
            src={banner} 
            alt="Group backdrop cover" 
            className="absolute inset-0 w-full h-full object-cover brightness-50" 
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#05030d] via-[#05030d]/40 to-transparent" />
          
          <div className="relative z-10 flex items-center gap-4 text-left w-full">
            <img 
              src={avatar} 
              alt={name} 
              className="w-16 h-16 rounded-2xl object-cover border-2 border-[#05030d] bg-zinc-900 shadow-xl"
            />
            <div className="flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base sm:text-lg font-black font-sans leading-none text-white">{name}</h2>
                <span 
                  className="px-1.5 py-0.5 rounded text-[8px] font-mono uppercase font-extrabold"
                  style={{ backgroundColor: `${themeAccent}20`, border: `1px solid ${themeAccent}30`, color: themeAccent }}
                >
                  {category}
                </span>
                {activeChat?.isVerified && (
                  <span className="bg-purple-500/10 border border-purple-500/20 text-purple-400 text-[8px] font-mono px-1 py-0.5 rounded flex items-center gap-0.5 uppercase">
                    ✓ Verified
                  </span>
                )}
              </div>
              <p className="text-[10px] text-zinc-400 leading-snug max-w-xl mt-1.5 italic font-sans">{description}</p>
            </div>
            
            {/* Quick action stat badges */}
            <div className="hidden lg:flex gap-3 items-center text-right text-xs">
              <div className="bg-black/45 border border-white/5 p-2 rounded-xl text-center min-w-[70px]">
                <span className="block text-[8px] font-mono text-zinc-500">PEERS</span>
                <span className="font-mono font-bold text-white text-xs">{members.length}</span>
              </div>
              <div className="bg-black/45 border border-white/5 p-2 rounded-xl text-center min-w-[70px]">
                <span className="block text-[8px] font-mono text-zinc-500">ONLINE</span>
                <span className="font-mono font-bold text-emerald-400 text-xs">{members.filter(m => m.isOnline).length}</span>
              </div>
              <div className="bg-black/45 border border-white/5 p-2 rounded-xl text-center min-w-[70px]">
                <span className="block text-[8px] font-mono text-zinc-500">ACCESS</span>
                <span className="font-mono font-bold text-violet-400 text-[10px] uppercase">{privacy}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Inner Canvas Area Scroll Wrapper */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar text-left">
          
          {/* TAB 1: CORE OVERVIEW & PERSONALIZATION */}
          {activeTab === 'overview' && (
            <div className="space-y-6 max-w-3xl">
              
              <form onSubmit={handleSaveProfileDetails} className="bg-black/30 border border-white/5 p-5 rounded-3xl space-y-4">
                <div className="flex items-center justify-between border-b border-white/5 pb-3">
                  <h4 className="text-xs font-black font-mono uppercase tracking-widest text-zinc-400 flex items-center gap-1.5">
                    <Sliders className="w-3.5 h-3.5" style={{ color: themeAccent }} /> Redesign Node Core Parameters
                  </h4>
                  <span className="text-[8px] font-mono text-zinc-500">Owner Access Only</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[9px] font-mono uppercase tracking-widest text-zinc-500">Group Name</label>
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-hidden"
                      style={{ focusBorderColor: themeAccent }}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-mono uppercase tracking-widest text-zinc-500">Node Category</label>
                    <input
                      type="text"
                      required
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-hidden"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-mono uppercase tracking-widest text-zinc-500">Topic / Core Description</label>
                  <textarea
                    rows={2}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full bg-slate-950 border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-hidden resize-none leading-relaxed font-sans"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[9px] font-mono uppercase tracking-widest text-zinc-500">Node Avatar URL</label>
                    <input
                      type="text"
                      value={avatar}
                      onChange={(e) => setAvatar(e.target.value)}
                      className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-hidden font-mono"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-mono uppercase tracking-widest text-zinc-500">Backdrop Banner URL</label>
                    <input
                      type="text"
                      value={banner}
                      onChange={(e) => setBanner(e.target.value)}
                      className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-hidden font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[9px] font-mono uppercase tracking-widest text-zinc-500">Privacy Scope</label>
                    <select
                      value={privacy}
                      onChange={(e) => setPrivacy(e.target.value as any)}
                      className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-hidden cursor-pointer"
                    >
                      <option value="public">🌐 Public (Anyone can join)</option>
                      <option value="private">🔒 Private (Join Requests enabled)</option>
                      <option value="invite">🔑 Invite Only (Strict invitations)</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-mono uppercase tracking-widest text-zinc-500">Theme Palette Accent</label>
                    <div className="flex items-center gap-2">
                      <input 
                        type="color" 
                        value={themeAccent}
                        onChange={(e) => setThemeAccent(e.target.value)}
                        className="w-8 h-8 rounded border-0 bg-transparent cursor-pointer" 
                      />
                      <input 
                        type="text" 
                        value={themeAccent}
                        onChange={(e) => setThemeAccent(e.target.value)}
                        className="flex-1 bg-slate-950 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white font-mono" 
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-mono uppercase tracking-widest text-zinc-500">Welcome Message broadcast</label>
                  <input
                    type="text"
                    value={welcomeMsg}
                    onChange={(e) => setWelcomeMsg(e.target.value)}
                    className="w-full bg-slate-950 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-hidden"
                  />
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    className="px-5 py-2.5 hover:brightness-110 text-white rounded-xl font-mono text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5"
                    style={{ background: `linear-gradient(to right, ${themeAccent}, #EC4899)` }}
                  >
                    <Sparkles className="w-3.5 h-3.5 text-black" />
                    <span className="text-black font-extrabold">Synchronize Node Profile</span>
                  </button>
                </div>
              </form>

              {/* Rules Management Codex */}
              <div className="bg-black/30 border border-white/5 p-5 rounded-3xl space-y-4">
                <div className="flex justify-between items-center border-b border-white/5 pb-3">
                  <h4 className="text-xs font-black font-mono uppercase tracking-widest text-zinc-400 flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-pink-400" /> Community Codex & Rules
                  </h4>
                  <span className="text-[8px] font-mono text-zinc-500">{rules.length} Active Directives</span>
                </div>

                <div className="space-y-2.5">
                  {rules.map((rule, idx) => (
                    <div key={idx} className="flex items-center justify-between gap-3 p-3 bg-slate-950/40 border border-white/5 rounded-2xl text-xs font-sans text-zinc-300">
                      <p className="flex-1 leading-relaxed"><span className="font-mono text-zinc-500 font-bold mr-2">C-{idx + 1}</span>{rule}</p>
                      <button
                        onClick={() => handleRemoveRule(idx)}
                        className="p-1 hover:bg-white/15 rounded text-zinc-500 hover:text-red-400 transition-colors"
                        title="Vanish rule"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>

                <div className="flex gap-2.5 pt-2">
                  <input
                    type="text"
                    placeholder="Formulate a new community rule directive..."
                    value={newRuleInput}
                    onChange={(e) => setNewRuleInput(e.target.value)}
                    className="flex-1 bg-slate-950 border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-hidden"
                  />
                  <button
                    onClick={handleAddRule}
                    className="px-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xs font-mono text-white transition-all"
                  >
                    Inject Rule
                  </button>
                </div>
              </div>

              {/* Disappearing Messages Segment */}
              <div className="bg-gradient-to-r from-violet-950/20 to-pink-950/10 p-5 rounded-3xl border border-violet-500/10 space-y-3">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-violet-400" />
                  <h4 className="text-xs font-black font-mono uppercase tracking-widest text-violet-300">Vanish Ledger (Disappearing messages)</h4>
                </div>
                <p className="text-[11px] text-zinc-400 leading-relaxed font-sans">
                  Enable secure ephemeral memory coordinates. Messages sent inside this node will automatically vanish from the local ledger after a predetermined duration.
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2">
                  {[
                    { id: 0, label: 'Disabled' },
                    { id: 10, label: '10 Seconds' },
                    { id: 60, label: '1 Hour' },
                    { id: 1440, label: '1 Day' }
                  ].map((dur) => {
                    const isSel = disappearingDuration === dur.id;
                    return (
                      <button
                        key={dur.id}
                        type="button"
                        onClick={() => {
                          setDisappearingDuration(dur.id);
                          window.dispatchEvent(new CustomEvent('toast', { detail: `🧹 Vanish Duration set to ${dur.label}` }));
                        }}
                        className={`p-2 rounded-xl text-[10px] font-mono uppercase font-black tracking-wider transition-all border ${
                          isSel 
                            ? 'bg-violet-600 text-white' 
                            : 'bg-black/40 border-white/5 text-zinc-500 hover:text-white'
                        }`}
                        style={{ borderColor: isSel ? themeAccent : undefined }}
                      >
                        {dur.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: PEERS & ROLES */}
          {activeTab === 'peers' && (
            <div className="space-y-4 max-w-3xl">
              
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/5 pb-4">
                <div>
                  <h4 className="text-xs font-black font-mono uppercase tracking-widest text-zinc-400">Enrolled Node Peers ({members.length})</h4>
                  <span className="text-[9px] text-zinc-500">Configure role authorities, communication muting & safety blacklists.</span>
                </div>
                <div className="relative w-48 shrink-0">
                  <Search className="absolute left-2.5 top-2 w-3.5 h-3.5 text-zinc-500" />
                  <input
                    type="text"
                    placeholder="Search peers..."
                    value={memberSearchQuery}
                    onChange={(e) => setMemberSearchQuery(e.target.value)}
                    className="w-full bg-black pl-8 pr-3 py-1 text-xs text-white border border-white/10 rounded-xl focus:outline-hidden"
                  />
                </div>
              </div>

              {/* Configurable permissions deck */}
              <div className="bg-black/40 border border-white/5 p-4 rounded-3xl space-y-3">
                <span className="text-[9px] font-mono uppercase tracking-widest text-zinc-500 font-bold block">Granular Member Permissions Registry</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {[
                    { key: 'sendMessages', label: 'Write Messages' },
                    { key: 'sendMedia', label: 'Share Media / Files' },
                    { key: 'sendVoice', label: 'Share Voice Notes' },
                    { key: 'startCalls', label: 'Initiate Call Stages' },
                    { key: 'inviteMembers', label: 'Share Invite Links' },
                    { key: 'createPolls', label: 'Create Polls' }
                  ].map((perm) => {
                    const checked = (permissions as any)[perm.key];
                    return (
                      <div key={perm.key} className="flex items-center justify-between p-2 bg-[#09071c]/30 rounded-xl border border-white/5">
                        <span className="text-[10px] text-zinc-300 font-sans">{perm.label}</span>
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => {
                            setPermissions(prev => ({ ...prev, [perm.key]: !checked }));
                            window.dispatchEvent(new CustomEvent('toast', { detail: `🛡️ Permission updated.` }));
                          }}
                          className="w-3.5 h-3.5 rounded accent-violet-600 focus:ring-0 cursor-pointer"
                        />
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Grouped member list */}
              <div className="space-y-4">
                {['Owner', 'Admin', 'Moderator', 'Member'].map((roleSection) => {
                  const rolePeers = filteredPeersList.filter(m => m.role === roleSection);
                  if (rolePeers.length === 0) return null;

                  return (
                    <div key={roleSection} className="space-y-2">
                      <span className="text-[8px] font-mono uppercase tracking-widest text-zinc-600 font-black block text-left">
                        {roleSection}S — {rolePeers.length}
                      </span>
                      <div className="divide-y divide-white/5 bg-black/25 border border-white/5 rounded-3xl overflow-hidden">
                        {rolePeers.map(member => {
                          const isMe = member.id === 'm-harrison';
                          
                          return (
                            <div key={member.id} className="p-3.5 flex items-center justify-between hover:bg-white/5 transition-all">
                              <div className="flex items-center gap-3">
                                <div className="relative">
                                  <img 
                                    src={member.avatar} 
                                    alt={member.name} 
                                    className="w-9 h-9 rounded-xl object-cover border border-white/10" 
                                  />
                                  {member.isOnline && (
                                    <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 rounded-full border border-[#05030d]" />
                                  )}
                                </div>
                                <div className="text-left">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <p className="text-xs font-bold text-white leading-none">
                                      {highlightText(member.name, memberSearchQuery)}
                                    </p>
                                    {member.badge && (
                                      <span className="text-[7.5px] font-sans bg-white/5 text-zinc-300 border border-white/10 px-1 py-0.2 rounded">
                                        {member.badge}
                                      </span>
                                    )}
                                    {member.isMuted && (
                                      <span className="text-[7px] bg-red-500/20 text-red-400 font-mono px-1 rounded uppercase">MUTED</span>
                                    )}
                                  </div>
                                  <span className="text-[9px] font-mono text-zinc-500 mt-0.5 block">
                                    @{highlightText(member.username, memberSearchQuery)}
                                  </span>
                                </div>
                              </div>

                              <div className="flex items-center gap-2">
                                <span className={`px-2 py-0.5 rounded-md text-[8.5px] font-mono font-extrabold uppercase ${
                                  member.role === 'Owner' 
                                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/20' 
                                    : member.role === 'Admin'
                                      ? 'bg-rose-500/20 text-rose-300 border border-rose-500/20' 
                                      : member.role === 'Moderator' 
                                        ? 'bg-violet-500/20 text-violet-300 border border-violet-500/20' 
                                        : 'bg-zinc-850 text-zinc-500 border border-white/5'
                                }`}>
                                  {member.role}
                                </span>

                                {!isMe && member.role !== 'Owner' && (
                                  <div className="flex items-center gap-1.5 pl-2.5 border-l border-white/10">
                                    {/* Cycle role */}
                                    <button
                                      onClick={() => handleCycleRole(member.id)}
                                      className="p-1 hover:bg-white/10 rounded text-zinc-400 hover:text-violet-400 cursor-pointer"
                                      title="Promote/Demote peer"
                                    >
                                      <Shield className="w-3.5 h-3.5" />
                                    </button>

                                    {/* Mute member toggle */}
                                    <button
                                      onClick={() => handleToggleMuteMember(member.id)}
                                      className={`p-1 rounded transition-colors cursor-pointer ${
                                        member.isMuted ? 'bg-red-500/10 text-red-400' : 'hover:bg-white/10 text-zinc-400 hover:text-white'
                                      }`}
                                      title={member.isMuted ? "Unmute peer" : "Mute peer"}
                                    >
                                      {member.isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
                                    </button>

                                    {/* Ban peer */}
                                    <button
                                      onClick={() => handleBanMember(member)}
                                      className="p-1 hover:bg-red-500/10 rounded text-zinc-500 hover:text-red-400 cursor-pointer"
                                      title="Ban from node"
                                    >
                                      <Trash className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 3: JOIN REQUESTS */}
          {activeTab === 'requests' && (
            <div className="space-y-4 max-w-3xl">
              
              <div className="border-b border-white/5 pb-4">
                <h4 className="text-xs font-black font-mono uppercase tracking-widest text-zinc-400">Onboarding Join Requests ({requests.length})</h4>
                <span className="text-[9px] text-zinc-500">Incoming applications requesting core node coordinates.</span>
              </div>

              {requests.length === 0 ? (
                <div className="bg-black/20 border border-dashed border-white/5 rounded-3xl p-12 text-center text-zinc-500">
                  <MailBoxEmptyIcon className="w-10 h-10 mx-auto text-zinc-600 mb-3" />
                  <p className="text-xs font-mono">No pending join requests registry found.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {requests.map((req) => (
                    <div key={req.id} className="p-4 bg-black/40 border border-white/5 rounded-3xl flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="flex items-start gap-3 text-left">
                        <img 
                          src={req.avatar} 
                          alt={req.name} 
                          className="w-11 h-11 rounded-xl object-cover border border-white/10 shrink-0" 
                        />
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-xs font-bold text-white leading-none">{req.name}</span>
                            <span className="text-[9px] font-mono text-zinc-500">@{req.username}</span>
                          </div>
                          <p className="text-[11px] text-zinc-400 font-sans leading-relaxed">{req.bio}</p>
                          <span className="block text-[8px] font-mono text-zinc-600">Submitted {req.requestedAt}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-end md:self-center shrink-0">
                        <button
                          onClick={() => {
                            setRejectionModalRequest(req);
                            setRejectionReasonText('');
                          }}
                          className="px-3 py-1.5 hover:bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-[10px] font-mono uppercase font-black transition-colors"
                        >
                          Reject
                        </button>
                        <button
                          onClick={() => handleAcceptRequest(req)}
                          className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-black font-extrabold rounded-xl text-[10px] font-mono uppercase transition-colors"
                        >
                          Accept
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 4: VOICE SPACES STAGE */}
          {activeTab === 'stage' && (
            <div className="space-y-6 max-w-3xl">
              <div className="border-b border-white/5 pb-4">
                <h4 className="text-xs font-black font-mono uppercase tracking-widest text-zinc-400">Nexora Voice Spaces & Live Stage</h4>
                <span className="text-[9px] text-zinc-500">Conduct decentralized voice calls, screen sharing and video presentations.</span>
              </div>

              {/* Call Control Dashboard */}
              <div className="bg-[#0b0821] border border-violet-500/15 p-6 rounded-3xl flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden">
                <div className="absolute -top-12 -right-12 w-32 h-32 bg-violet-600/5 rounded-full blur-2xl" />
                
                <div className="space-y-2 relative z-10 text-left">
                  <div className="flex items-center gap-2">
                    <span className={`w-2.5 h-2.5 rounded-full ${isCallingActive ? 'bg-red-500 animate-pulse' : 'bg-zinc-600'}`} />
                    <span className="text-[10px] font-mono uppercase tracking-wider font-extrabold text-violet-300">
                      {isCallingActive ? '🔴 VOICE SPACE BROADCAST LIVE' : 'VOICE STAGE INACTIVE'}
                    </span>
                  </div>
                  <h3 className="text-sm font-black text-white">
                    {isCallingActive ? 'Harrison VOH is broadcasting live' : 'Initialize Decentralized Call Session'}
                  </h3>
                  <p className="text-[11px] text-zinc-400 font-sans max-w-md leading-relaxed">
                    Instantiate an encrypted Voice/Video connection with speaking permissions, dynamic waveform indicators and stage highlight.
                  </p>
                </div>

                <div className="shrink-0 relative z-10">
                  <button
                    onClick={() => {
                      setIsCallingActive(!isCallingActive);
                      if (!isCallingActive) {
                        window.dispatchEvent(new CustomEvent('toast', { detail: "🎙️ Secure Voice Space launched on local node!" }));
                      } else {
                        window.dispatchEvent(new CustomEvent('toast', { detail: "🚪 Voice Space broadcast terminated." }));
                      }
                    }}
                    className={`px-5 py-3 rounded-2xl font-mono text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer ${
                      isCallingActive 
                        ? 'bg-red-600 text-white hover:bg-red-500' 
                        : 'bg-violet-600 text-white hover:bg-violet-500 shadow-lg shadow-violet-900/30'
                    }`}
                  >
                    {isCallingActive ? 'DISBAND STAGE' : 'GO LIVE ON STAGE'}
                  </button>
                </div>
              </div>

              {isCallingActive && (
                <div className="space-y-4">
                  {/* Speaking Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {members.filter(m => m.isOnline).map((speaker) => {
                      const isSpeaking = speakingMembers.includes(speaker.id);
                      const isHarrisonMe = speaker.id === 'm-harrison';
                      
                      return (
                        <div 
                          key={speaker.id} 
                          className={`p-4 rounded-3xl border text-center transition-all flex flex-col items-center justify-center gap-2 relative overflow-hidden ${
                            isSpeaking 
                              ? 'bg-violet-600/10 border-violet-500' 
                              : 'bg-black/45 border-white/5'
                          }`}
                        >
                          {/* Pulsing speaking halo */}
                          {isSpeaking && (
                            <div className="absolute inset-0 bg-violet-500/5 animate-pulse" />
                          )}

                          <div className="relative">
                            <img 
                              src={speaker.avatar} 
                              alt={speaker.name} 
                              className={`w-12 h-12 rounded-2xl object-cover mx-auto border transition-transform duration-300 ${
                                isSpeaking ? 'border-violet-400 scale-105' : 'border-white/10'
                              }`} 
                            />
                            {/* Speaking sound indicator */}
                            {isSpeaking && (
                              <div className="absolute -bottom-1 -right-1 bg-violet-600 border border-[#05030d] rounded-full p-0.5 flex gap-0.5 px-1 py-0.8 items-center justify-center">
                                <span className="w-0.5 h-1.5 bg-white rounded-full animate-bounce" />
                                <span className="w-0.5 h-3.5 bg-white rounded-full animate-bounce [animation-delay:0.15s]" />
                                <span className="w-0.5 h-2 bg-white rounded-full animate-bounce [animation-delay:0.3s]" />
                              </div>
                            )}
                          </div>

                          <div className="text-center relative z-10 leading-none">
                            <span className="block text-[10px] font-bold text-white truncate max-w-[120px]">{speaker.name}</span>
                            <span className="text-[8px] font-mono text-zinc-500 mt-0.5 block">@{speaker.username}</span>
                          </div>

                          <div className="flex items-center gap-1 mt-1 bg-black/30 px-2 py-0.5 rounded-lg text-[7px] font-mono text-zinc-400">
                            <span>{isHarrisonMe ? 'HOST / SPEAKER' : speaker.role.toUpperCase()}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Stage Quick Bar Controls */}
                  <div className="p-4 bg-black/40 border border-white/5 rounded-3xl flex flex-wrap justify-between items-center gap-4">
                    <div className="flex items-center gap-2 text-xs">
                      {isMutedOnCall ? <MicOff className="w-4 h-4 text-red-400" /> : <Mic className="w-4 h-4 text-emerald-400 animate-pulse" />}
                      <span className="font-mono text-[10px] text-zinc-400"> Harrison VOH status: <span className="text-white font-extrabold">{isMutedOnCall ? 'MUTED' : 'BROADCASTING'}</span></span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => setIsMutedOnCall(!isMutedOnCall)}
                        className={`p-2.5 rounded-xl transition-all cursor-pointer ${isMutedOnCall ? 'bg-red-500/20 text-red-400 border border-red-500/20' : 'bg-white/5 text-zinc-300 hover:bg-white/10'}`}
                        title={isMutedOnCall ? "Unmute Microphone" : "Mute Microphone"}
                      >
                        {isMutedOnCall ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                      </button>
                      <button 
                        onClick={() => setIsCameraOnCall(!isCameraOnCall)}
                        className={`p-2.5 rounded-xl transition-all cursor-pointer ${isCameraOnCall ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/20' : 'bg-white/5 text-zinc-300 hover:bg-white/10'}`}
                        title="Toggle Video Stream"
                      >
                        <Video className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => setIsScreenSharingCall(!isScreenSharingCall)}
                        className={`p-2.5 rounded-xl transition-all cursor-pointer ${isScreenSharingCall ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/20' : 'bg-white/5 text-zinc-300 hover:bg-white/10'}`}
                        title="Share Monitor Screen"
                      >
                        <Monitor className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="flex items-center gap-2 bg-black/50 p-1.5 px-3 rounded-xl border border-white/5 text-xs">
                      <span className="text-zinc-500 font-mono text-[9px]">VOLUME</span>
                      <input 
                        type="range" 
                        min="0" 
                        max="100" 
                        value={callVolume} 
                        onChange={(e) => setCallVolume(Number(e.target.value))} 
                        className="w-16 accent-violet-500 cursor-pointer"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 5: SHARED MEDIA HUB */}
          {activeTab === 'media' && (
            <div className="space-y-4 max-w-3xl">
              
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/5 pb-4">
                <div>
                  <h4 className="text-xs font-black font-mono uppercase tracking-widest text-zinc-400">Node Asset Media Hub</h4>
                  <span className="text-[9px] text-zinc-500 font-sans">Every image, file, link, or document shared inside this secure coordinate.</span>
                </div>
                <div className="relative w-48 shrink-0">
                  <Search className="absolute left-2.5 top-2 w-3.5 h-3.5 text-zinc-500" />
                  <input
                    type="text"
                    placeholder="Search shared asset..."
                    value={mediaSearchQuery}
                    onChange={(e) => setMediaSearchQuery(e.target.value)}
                    className="w-full bg-black pl-8 pr-3 py-1 text-xs text-white border border-white/10 rounded-xl focus:outline-hidden"
                  />
                </div>
              </div>

              {/* Media type pills */}
              <div className="flex gap-1.5 overflow-x-auto no-scrollbar shrink-0">
                {[
                  { id: 'all', label: 'All shared' },
                  { id: 'photo', label: '🖼️ Photos' },
                  { id: 'file', label: '📁 Documents' },
                  { id: 'link', label: '🔗 Hyperlinks' },
                  { id: 'voice', label: '🎙️ Voice Memos' }
                ].map((type) => {
                  const isSel = mediaActiveType === type.id;
                  return (
                    <button
                      key={type.id}
                      onClick={() => setMediaActiveType(type.id as any)}
                      className={`px-3 py-1 rounded-xl text-[9px] font-mono uppercase font-black tracking-wider shrink-0 transition-all cursor-pointer ${
                        isSel ? 'bg-violet-600 text-white' : 'bg-white/5 text-zinc-400 hover:text-white'
                      }`}
                    >
                      {type.label}
                    </button>
                  );
                })}
              </div>

              {/* Media Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {filteredMediaList.map((asset) => (
                  <div key={asset.id} className="bg-black/30 border border-white/5 p-3 rounded-2xl space-y-3 hover:border-violet-500/25 transition-all text-left flex flex-col justify-between">
                    
                    <div className="space-y-2">
                      <div className="flex justify-between items-start gap-2">
                        <span className="text-[8px] font-mono uppercase bg-white/5 text-zinc-500 border border-white/10 px-1.5 py-0.5 rounded">
                          {asset.type}
                        </span>
                        <div className="flex gap-1">
                          {asset.isPinned && <span className="text-amber-400 text-[8px] font-mono">📍 PINNED</span>}
                        </div>
                      </div>

                      {asset.type === 'photo' && (
                        <div className="h-20 rounded-xl overflow-hidden border border-white/5">
                          <img src={asset.url} alt={asset.name} className="w-full h-full object-cover" />
                        </div>
                      )}

                      <h5 className="text-[11px] font-bold text-white font-sans break-all leading-snug line-clamp-2">
                        {highlightText(asset.name, mediaSearchQuery)}
                      </h5>
                    </div>

                    <div className="pt-2 border-t border-white/5 flex items-center justify-between text-[9px] font-mono text-zinc-500 mt-auto">
                      <span>By {asset.uploadedBy}</span>
                      <span>{asset.size || asset.timestamp}</span>
                    </div>

                  </div>
                ))}

                {filteredMediaList.length === 0 && (
                  <div className="col-span-full py-12 text-center text-zinc-600 font-mono text-xs">
                    No files or media found in active ledger segment.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 6: GLOBAL LEDGER HIGHLIGHTER SEARCH */}
          {activeTab === 'search' && (
            <div className="space-y-4 max-w-3xl">
              <div className="border-b border-white/5 pb-4">
                <h4 className="text-xs font-black font-mono uppercase tracking-widest text-zinc-400">Node Search & Keyword Highlighter</h4>
                <span className="text-[9px] text-zinc-500">Query and isolate specific content within this decentralized group ledger.</span>
              </div>

              <div className="relative">
                <Search className="absolute left-3.5 top-3 w-4 h-4 text-zinc-500" />
                <input
                  type="text"
                  placeholder="Enter keywords to search messages, mentions, files or polls..."
                  value={globalSearchQuery}
                  onChange={(e) => setGlobalSearchQuery(e.target.value)}
                  className="w-full bg-black pl-10 pr-4 py-2.5 text-xs text-white border border-white/10 rounded-2xl focus:outline-hidden"
                />
              </div>

              {globalSearchQuery ? (
                <div className="space-y-2.5">
                  <span className="text-[8px] font-mono uppercase text-zinc-500 font-bold block">Search Results matching "{globalSearchQuery}"</span>
                  {[
                    { sender: 'Sophia', content: 'Optimized real-time latency for WebRTC channels.', source: 'Message Logs', time: 'Yesterday' },
                    { sender: 'Harrison (You)', content: 'Shared documentation for glassmorphic backdrop spec sheets.', source: 'Asset Hub', time: '2 hours ago' },
                    { sender: 'Marcus', content: 'Yes, absolutely, looks premium! ✨ (Voted Poll)', source: 'Polls Registry', time: '3 days ago' }
                  ].filter(res => res.content.toLowerCase().includes(globalSearchQuery.toLowerCase()) || res.sender.toLowerCase().includes(globalSearchQuery.toLowerCase())).map((res, i) => (
                    <div key={i} className="p-3.5 bg-black/40 border border-white/5 rounded-3xl text-left space-y-1.5 transition-all hover:bg-[#09071c]/35">
                      <div className="flex justify-between items-center text-[8.5px] font-mono text-zinc-500">
                        <span>SOURCE: {res.source.toUpperCase()}</span>
                        <span>{res.time}</span>
                      </div>
                      <p className="text-xs text-white leading-relaxed font-sans">
                        <span className="font-bold mr-1">{highlightText(res.sender, globalSearchQuery)}:</span>
                        {highlightText(res.content, globalSearchQuery)}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-black/20 border border-dashed border-white/5 p-8 rounded-3xl text-center text-zinc-600 font-mono text-[10px] leading-relaxed">
                  Enter queries to isolate cryptographic ledger details instantly. Supports @mentions, #categories, and text strings.
                </div>
              )}
            </div>
          )}

          {/* TAB 7: INVITE SYSTEM & QR CODE */}
          {activeTab === 'invite' && (
            <div className="space-y-6 max-w-3xl">
              <div className="border-b border-white/5 pb-4">
                <h4 className="text-xs font-black font-mono uppercase tracking-widest text-zinc-400">Node Invite & QR Code Generator</h4>
                <span className="text-[9px] text-zinc-500 font-sans">Issue custom cryptographic invitation keys with strict constraints.</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-left">
                
                {/* Invite Settings */}
                <div className="bg-black/30 border border-white/5 p-5 rounded-3xl space-y-4">
                  <span className="text-[9px] font-mono uppercase tracking-widest text-zinc-500 font-bold block">Configure Invitation Key Limits</span>
                  
                  <div className="space-y-1">
                    <label className="text-[9px] font-mono uppercase tracking-widest text-zinc-500">Maximum Peer Joins Limit</label>
                    <select
                      value={inviteLinkLimit}
                      onChange={(e) => {
                        setInviteLinkLimit(e.target.value);
                        window.dispatchEvent(new CustomEvent('toast', { detail: `🔒 Join limit set to ${e.target.value}` }));
                      }}
                      className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white cursor-pointer"
                    >
                      <option>Unlimited</option>
                      <option>5 Joins</option>
                      <option>10 Joins</option>
                      <option>50 Joins</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[9px] font-mono uppercase tracking-widest text-zinc-500">Invitation Expiration</label>
                    <select
                      value={inviteLinkExpiry}
                      onChange={(e) => {
                        setInviteLinkExpiry(e.target.value);
                        window.dispatchEvent(new CustomEvent('toast', { detail: `🔒 Key Expiration set to ${e.target.value}` }));
                      }}
                      className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white cursor-pointer"
                    >
                      <option>Never</option>
                      <option>1 Hour</option>
                      <option>1 Day</option>
                      <option>7 Days</option>
                    </select>
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <div className="space-y-0.5 pr-4">
                      <span className="text-xs font-bold block text-white leading-tight">Deactivate Invite Links</span>
                      <span className="text-[10px] text-zinc-500">Temporarily block any onboarding entries</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={inviteLinkDisabled}
                      onChange={() => {
                        setInviteLinkDisabled(!inviteLinkDisabled);
                        window.dispatchEvent(new CustomEvent('toast', { detail: `🔑 Invitation status toggled.` }));
                      }}
                      className="w-4 h-4 rounded accent-violet-600 focus:ring-0 cursor-pointer"
                    />
                  </div>

                  <button
                    onClick={() => {
                      window.dispatchEvent(new CustomEvent('toast', { detail: "🔄 Cypher keys rotated. Old links expired!" }));
                    }}
                    className="w-full py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl font-mono text-[9px] uppercase font-black text-white transition-all"
                  >
                    ROTATE ALL CRYPTO-KEYS
                  </button>
                </div>

                {/* QR Display */}
                <div className="bg-[#09071c] border border-white/5 p-5 rounded-3xl flex flex-col items-center justify-center space-y-4">
                  <div className="p-3 bg-white rounded-2xl relative">
                    {/* Simulated Authentic Vector QR Code */}
                    <svg className="w-32 h-32 text-[#05030d]" viewBox="0 0 100 100" fill="currentColor">
                      <rect x="0" y="0" width="25" height="25" />
                      <rect x="5" y="5" width="15" height="15" fill="white" />
                      <rect x="9" y="9" width="7" height="7" />
                      
                      <rect x="75" y="0" width="25" height="25" />
                      <rect x="80" y="5" width="15" height="15" fill="white" />
                      <rect x="84" y="84" width="7" height="7" />
                      
                      <rect x="0" y="75" width="25" height="25" />
                      <rect x="5" y="80" width="15" height="15" fill="white" />
                      
                      <rect x="40" y="10" width="10" height="20" />
                      <rect x="55" y="0" width="12" height="10" />
                      <rect x="45" y="45" width="15" height="15" />
                      <rect x="10" y="45" width="10" height="25" />
                      <rect x="75" y="45" width="20" height="20" />
                      <rect x="45" y="75" width="20" height="20" />
                      <rect x="85" y="75" width="10" height="15" />
                    </svg>
                    <div className="absolute inset-0 m-auto w-8 h-8 rounded-lg bg-[#09071c] border-2 border-white flex items-center justify-center text-white text-[10px] font-mono">
                      N
                    </div>
                  </div>

                  <div className="text-center space-y-1">
                    <span className="text-[10px] font-mono text-zinc-500 uppercase">Cryptographic Entry Ticket</span>
                    <span className="block text-xs font-bold font-sans text-white">QR Code — Sync and Join</span>
                  </div>

                  <button
                    onClick={() => {
                      window.dispatchEvent(new CustomEvent('toast', { detail: "💾 Download Mock QR code triggered (Secure PDF)" }));
                    }}
                    className="px-4 py-1.5 bg-violet-600 hover:bg-violet-500 text-white rounded-xl text-[10px] font-mono font-black uppercase transition-all"
                  >
                    DOWNLOAD QR TICKET
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 8: AUDIT LOGS & REPORTS */}
          {activeTab === 'moderation' && (
            <div className="space-y-4 max-w-3xl">
              <div className="border-b border-white/5 pb-4">
                <h4 className="text-xs font-black font-mono uppercase tracking-widest text-zinc-400">Node Moderation Safety & Audit Register</h4>
                <span className="text-[9px] text-zinc-500">Historical chronological record of security operations and node changes.</span>
              </div>

              <div className="space-y-2.5">
                {modLogs.map((log) => (
                  <div key={log.id} className="p-3.5 bg-black/40 border border-white/5 rounded-3xl text-left space-y-1">
                    <div className="flex justify-between items-center text-[8px] font-mono text-zinc-600">
                      <span>AUDIT REGISTRY</span>
                      <span>{log.timestamp}</span>
                    </div>
                    <p className="text-xs text-white leading-relaxed font-sans">
                      <span className="font-bold text-violet-400 mr-1.5">{log.adminName}</span>
                      <span className="bg-white/5 px-1.5 py-0.5 rounded text-[10px] text-zinc-300 font-mono mr-1.5 uppercase border border-white/5">{log.action}</span>
                      <span className="text-zinc-400">Target: {log.targetName}</span>
                    </p>
                    {log.reason && (
                      <p className="text-[10px] text-zinc-500 leading-relaxed font-sans italic pl-4 border-l border-white/10 mt-1">
                        Reason: "{log.reason}"
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>

      </div>

      {/* ========================================== */}
      {/* REJECTION REASON COMPOSER OVERLAY MODAL */}
      {/* ========================================== */}
      <AnimatePresence>
        {rejectionModalRequest && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="w-full max-w-md bg-[#09071c]/95 border border-red-500/20 rounded-3xl p-6 text-white text-left shadow-2xl relative overflow-hidden"
            >
              <div className="absolute top-0 inset-x-0 h-[2px] bg-red-500" />
              
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-xs font-mono uppercase tracking-widest text-red-400 font-black">Denial Reason Dispatcher</h4>
                <button 
                  onClick={() => setRejectionModalRequest(null)}
                  className="p-1 hover:bg-white/5 rounded-lg text-zinc-500 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-4">
                <p className="text-[11px] text-zinc-400 leading-relaxed font-sans">
                  Provide an official reason for rejecting the onboarding credentials of <span className="text-white font-bold">@{rejectionModalRequest.username}</span> (optional). This log will be indexed.
                </p>

                <textarea
                  placeholder="Specify denial reason (e.g. Identity verification failure, security mismatch)..."
                  value={rejectionReasonText}
                  onChange={(e) => setRejectionReasonText(e.target.value)}
                  rows={3}
                  className="w-full bg-slate-950 border border-white/10 rounded-2xl px-3.5 py-2 text-xs text-white placeholder-zinc-600 focus:outline-hidden resize-none leading-relaxed"
                />

                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => setRejectionModalRequest(null)}
                    className="px-4 py-2 bg-white/5 hover:bg-white/10 rounded-xl text-xs font-mono text-zinc-400 hover:text-white transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleRejectRequestSubmit}
                    className="px-4 py-2 bg-red-600 hover:bg-red-500 rounded-xl text-xs font-mono font-extrabold text-white transition-colors"
                  >
                    Reject Access Request
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}

// Custom Helper vector icons for design consistency
function MailBoxEmptyIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />
    </svg>
  );
}
