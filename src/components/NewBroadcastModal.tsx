import React, { useState, useMemo } from 'react';
import { 
  X, Search, Check, Users, Radio, Sparkles, Plus, Image as ImageIcon, 
  Palette, Tag, AlertCircle, Shield, Building, Heart, MessageSquare, Info
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { User, Chat } from '../types';

interface NewBroadcastModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateBroadcast: (broadcast: Partial<Chat>) => void;
  availableUsers: User[];
}

export default function NewBroadcastModal({
  isOpen,
  onClose,
  onCreateBroadcast,
  availableUsers
}: NewBroadcastModalProps) {
  const [step, setStep] = useState<1 | 2>(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [selectedCategoryTab, setSelectedCategoryTab] = useState<'all' | 'recent' | 'mutual' | 'followers' | 'verified' | 'business'>('all');

  // Broadcast settings states
  const [broadcastName, setBroadcastName] = useState('');
  const [broadcastDescription, setBroadcastDescription] = useState('');
  const [broadcastIcon, setBroadcastIcon] = useState('https://images.unsplash.com/photo-1614741118887-7a4ee193a5fa?w=150');
  const [broadcastCover, setBroadcastCover] = useState('https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=800');
  const [themeColor, setThemeColor] = useState('#8B5CF6'); // Purple default
  const [category, setCategory] = useState('Announcements');
  const [broadcastMode, setBroadcastMode] = useState<'standard' | 'announcement' | 'community' | 'creator' | 'business'>('standard');

  // Multi-batch load more simulation for "scalable pagination"
  const [visibleCount, setVisibleCount] = useState(15);

  // Mock list of user groups / categorizations
  const categorizedUsers = useMemo(() => {
    return availableUsers.map(u => {
      // Inject some category attributes for filtering if not present
      const isVerified = u.isVerified || u.id === 'voh_ai' || u.id === 'creator-1';
      const isBusiness = u.id === 'creator-3' || u.id.includes('business');
      const isMutual = ['creator-1', 'creator-2', 'creator-4'].includes(u.id);
      const isFollower = !isBusiness;
      
      return {
        ...u,
        isVerified,
        isBusiness,
        isMutual,
        isFollower,
        isOnline: true
      };
    });
  }, [availableUsers]);

  // Filter users based on tab and query
  const filteredUsers = useMemo(() => {
    let result = categorizedUsers;

    if (selectedCategoryTab === 'recent') {
      result = categorizedUsers.slice(0, 4);
    } else if (selectedCategoryTab === 'mutual') {
      result = categorizedUsers.filter(u => u.isMutual);
    } else if (selectedCategoryTab === 'followers') {
      result = categorizedUsers.filter(u => u.isFollower);
    } else if (selectedCategoryTab === 'verified') {
      result = categorizedUsers.filter(u => u.isVerified);
    } else if (selectedCategoryTab === 'business') {
      result = categorizedUsers.filter(u => u.isBusiness);
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(u => 
        u.name.toLowerCase().includes(query) || 
        u.username.toLowerCase().includes(query)
      );
    }

    return result;
  }, [categorizedUsers, selectedCategoryTab, searchQuery]);

  const handleToggleSelect = (userId: string) => {
    setSelectedUserIds(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId) 
        : [...prev, userId]
    );
  };

  const handleSelectAllFiltered = () => {
    const allFilteredIds = filteredUsers.map(u => u.id);
    setSelectedUserIds(prev => {
      const filteredUnselected = allFilteredIds.filter(id => !prev.includes(id));
      if (filteredUnselected.length === 0) {
        // Deselect all filtered
        return prev.filter(id => !allFilteredIds.includes(id));
      }
      // Select all filtered
      return [...prev, ...filteredUnselected];
    });
  };

  const handleRemoveSelected = (userId: string) => {
    setSelectedUserIds(prev => prev.filter(id => id !== userId));
  };

  const selectedUsers = useMemo(() => {
    return categorizedUsers.filter(u => selectedUserIds.includes(u.id));
  }, [categorizedUsers, selectedUserIds]);

  const handleCreate = () => {
    if (!broadcastName.trim()) {
      window.dispatchEvent(new CustomEvent('toast', { detail: "⚠️ Please enter a broadcast name!" }));
      return;
    }

    if (selectedUserIds.length === 0) {
      window.dispatchEvent(new CustomEvent('toast', { detail: "⚠️ Select at least 1 recipient!" }));
      return;
    }

    const newBroadcast: Partial<Chat> = {
      id: `broadcast-${Date.now()}`,
      partnerId: `broadcast-channel-${Date.now()}`,
      partnerName: broadcastName,
      partnerAvatar: broadcastIcon,
      partnerBio: broadcastDescription || `${category} broadcast channel.`,
      isPartnerOnline: true,
      unreadCount: 0,
      lastMessage: "Channel Instantiated on Decentralized Network.",
      lastTimestamp: "Just now",
      isBroadcast: true,
      isGroup: false,
      groupTheme: themeColor,
      groupBanner: broadcastCover,
      groupCategory: category,
      broadcastMode: broadcastMode,
      broadcastRecipients: selectedUserIds,
      welcomeMessage: broadcastDescription || `Welcome to "${broadcastName}" broadcast space.`,
      broadcastDeliveryStats: {
        delivered: selectedUserIds.length,
        read: 0,
        failed: 0,
        pending: 0,
        reactionCount: {},
        repliesCount: 0,
        averageReadTime: '0.0s',
        linkClicks: 0,
        pollParticipation: 0,
        mediaDownloads: 0
      }
    };

    onCreateBroadcast(newBroadcast);
    onClose();

    // Reset fields
    setStep(1);
    setSelectedUserIds([]);
    setBroadcastName('');
    setBroadcastDescription('');
    setBroadcastIcon('https://images.unsplash.com/photo-1614741118887-7a4ee193a5fa?w=150');
    setBroadcastCover('https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=800');
    setThemeColor('#8B5CF6');
    setCategory('Announcements');
    setBroadcastMode('standard');
  };

  const presets = {
    icons: [
      'https://images.unsplash.com/photo-1614741118887-7a4ee193a5fa?w=150',
      'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150',
      'https://images.unsplash.com/photo-1550684848-fac1c5b4e853?w=150',
      'https://images.unsplash.com/photo-1634017839464-5c339ebe3cb4?w=150',
      'https://images.unsplash.com/photo-1618005198143-e5283b519a7f?w=150'
    ],
    covers: [
      'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=800',
      'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=800',
      'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800',
      'https://images.unsplash.com/photo-1634017839464-5c339ebe3cb4?w=800'
    ],
    colors: ['#8B5CF6', '#EC4899', '#10B981', '#3B82F6', '#F59E0B', '#EF4444', '#06B6D4'],
    categories: ['Friends', 'Family', 'Gaming', 'Business', 'Announcements', 'VIP', 'School', 'Football', 'Creator Updates']
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md select-none font-sans">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        transition={{ type: "spring", duration: 0.4 }}
        className="relative w-full max-w-2xl bg-[#09071a]/95 border border-white/10 rounded-3xl overflow-hidden shadow-md flex flex-col h-[580px]"
      >
        {/* Header background glow */}
        <div className="absolute top-0 inset-x-0 h-40 bg-radial-at-t from-violet-600/15 via-transparent to-transparent pointer-events-none" />

        {/* Modal Header */}
        <div className="p-4 border-b border-white/10 flex items-center justify-between relative z-10 bg-[#060412]/80 backdrop-blur-sm">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-xl bg-violet-500/10 text-violet-400 border border-white/10">
              <Radio className="w-4 h-4 animate-pulse" />
            </div>
            <div className="text-left">
              <h3 className="text-xs font-black uppercase tracking-wider text-white">Create Broadcast Node</h3>
              <p className="text-[9px] font-mono text-zinc-500 uppercase">Step {step} of 2 • Secure Broadcast Ledger</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 hover:bg-white/5 rounded-xl text-zinc-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Main Content Body */}
        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar relative z-10">
          <AnimatePresence mode="wait">
            {step === 1 ? (
              <motion.div 
                key="step1"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                className="space-y-4 flex flex-col h-full"
              >
                {/* Info Tip */}
                <div className="p-2.5 rounded-xl bg-violet-600/10 border border-white/10 text-left flex gap-2">
                  <Info className="w-4 h-4 text-violet-400 shrink-0 mt-0.5" />
                  <p className="text-[10px] text-violet-200/80 leading-normal font-sans">
                    Broadcasts distribute messages to many recipients individually. Recipients receive them as a normal DM and do not see other members.
                  </p>
                </div>

                {/* Floating Horizontal Avatar Row for Selected */}
                <AnimatePresence>
                  {selectedUsers.length > 0 && (
                    <motion.div 
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="bg-black/30 border border-white/10 rounded-2xl p-2.5 flex flex-col gap-1 text-left overflow-hidden shrink-0"
                    >
                      <div className="flex justify-between items-center px-1">
                        <span className="text-[9px] font-mono uppercase tracking-wider text-violet-400 font-bold">
                          {selectedUsers.length} Selected Recipient{selectedUsers.length > 1 ? 's' : ''}
                        </span>
                        <button 
                          onClick={() => setSelectedUserIds([])}
                          className="text-[8px] font-mono uppercase text-pink-400 hover:text-pink-300 transition-colors"
                        >
                          Clear All
                        </button>
                      </div>
                      <div className="flex gap-2 overflow-x-auto py-1 no-scrollbar min-h-[50px]">
                        {selectedUsers.map(user => (
                          <motion.div 
                            key={user.id}
                            layout
                            initial={{ scale: 0.7, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.7, opacity: 0 }}
                            className="flex flex-col items-center gap-1 shrink-0 relative group"
                          >
                            <div className="relative">
                              <img 
                                src={user.avatar} 
                                alt={user.name} 
                                className="w-8 h-8 rounded-xl object-cover ring-1 ring-violet-500/30"
                              />
                              <button 
                                onClick={() => handleRemoveSelected(user.id)}
                                className="absolute -top-1.5 -right-1.5 p-0.5 bg-pink-600 hover:bg-pink-500 text-white rounded-full transition-colors cursor-pointer shadow-md"
                              >
                                <X className="w-2 h-2" />
                              </button>
                            </div>
                            <span className="text-[8px] text-zinc-400 font-sans max-w-[45px] truncate">{user.name}</span>
                          </motion.div>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Search Bar & Multi-category selector */}
                <div className="space-y-2 shrink-0">
                  <div className="relative">
                    <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-violet-400/50" />
                    <input 
                      type="text" 
                      placeholder="Search users..." 
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-slate-950 border border-white/10 focus:border-violet-500 focus:outline-hidden text-xs text-white placeholder-violet-400/20 font-sans"
                    />
                  </div>

                  {/* Horizontal Tabs inside Modal */}
                  <div className="flex gap-1 overflow-x-auto no-scrollbar py-0.5 border-b border-white/10">
                    {[
                      { id: 'all', label: 'All Recipients' },
                      { id: 'recent', label: 'Recent DMs' },
                      { id: 'mutual', label: 'Mutual Friends' },
                      { id: 'followers', label: 'Followers' },
                      { id: 'verified', label: 'Verified Creators' },
                      { id: 'business', label: 'Businesses' }
                    ].map(tab => (
                      <button
                        key={tab.id}
                        onClick={() => setSelectedCategoryTab(tab.id as any)}
                        className={`px-2.5 py-1 rounded-lg text-[8px] font-mono uppercase tracking-wider shrink-0 transition-all cursor-pointer ${
                          selectedCategoryTab === tab.id 
                            ? 'bg-violet-600 text-white' 
                            : 'bg-white/5 text-zinc-400 hover:text-white hover:bg-white/10'
                        }`}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* User selection rows */}
                <div className="flex-1 overflow-y-auto space-y-1.5 max-h-[250px] pr-1 text-left custom-scrollbar">
                  <div className="flex justify-between items-center px-1 py-1">
                    <span className="text-[9px] font-mono uppercase tracking-wider text-zinc-500">
                      Showing {filteredUsers.length} user{filteredUsers.length !== 1 ? 's' : ''}
                    </span>
                    <button 
                      onClick={handleSelectAllFiltered}
                      className="text-[9px] font-mono uppercase text-violet-400 hover:text-violet-300 transition-colors cursor-pointer"
                    >
                      {filteredUsers.every(u => selectedUserIds.includes(u.id)) ? 'Deselect All' : 'Select All'}
                    </button>
                  </div>

                  {filteredUsers.slice(0, visibleCount).map(user => {
                    const isSelected = selectedUserIds.includes(user.id);
                    return (
                      <div 
                        key={user.id}
                        onClick={() => handleToggleSelect(user.id)}
                        className={`p-2 rounded-xl border transition-all duration-200 cursor-pointer flex items-center justify-between ${
                          isSelected 
                            ? 'bg-violet-600/10 border-white/10' 
                            : 'bg-black/20 border-white/5 hover:bg-white/5'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="relative">
                            <img 
                              src={user.avatar} 
                              alt={user.name} 
                              className="w-8 h-8 rounded-xl object-cover ring-1 ring-white/5"
                            />
                            {user.isOnline && (
                              <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 border-2 border-[#09071a] rounded-full" />
                            )}
                          </div>
                          <div className="text-left min-w-0">
                            <div className="flex items-center gap-1">
                              <p className="text-[11px] font-sans font-black text-white truncate">{user.name}</p>
                              {user.isVerified && (
                                <span className="p-0.5 bg-violet-500 text-white rounded-full">
                                  <Shield className="w-2 h-2 fill-current" />
                                </span>
                              )}
                              {user.isBusiness && (
                                <Building className="w-2.5 h-2.5 text-cyan-400 shrink-0" />
                              )}
                            </div>
                            <span className="text-[9px] font-mono text-zinc-500">@{user.username}</span>
                          </div>
                        </div>

                        {/* Custom Animated Checkbox */}
                        <div className={`w-4 h-4 rounded-md border flex items-center justify-center transition-all ${
                          isSelected 
                            ? 'bg-violet-600 border-violet-500 shadow-md scale-105' 
                            : 'border-white/20'
                        }`}>
                          {isSelected && <Check className="w-2.5 h-2.5 text-white stroke-[3px]" />}
                        </div>
                      </div>
                    );
                  })}

                  {filteredUsers.length > visibleCount && (
                    <button 
                      onClick={() => setVisibleCount(prev => prev + 15)}
                      className="w-full py-2 bg-white/5 rounded-xl text-[10px] font-mono uppercase text-zinc-400 hover:text-white hover:bg-white/10 transition-all cursor-pointer"
                    >
                      Load More Recipient Nodes (Support Batching)
                    </button>
                  )}

                  {filteredUsers.length === 0 && (
                    <div className="p-8 text-center text-zinc-500">
                      <AlertCircle className="w-6 h-6 text-zinc-600 mx-auto mb-1.5" />
                      <p className="text-[10px] font-sans uppercase">No matching recipients</p>
                    </div>
                  )}
                </div>
              </motion.div>
            ) : (
              <motion.div 
                key="step2"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="space-y-4 text-left"
              >
                {/* Identity Layout */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  
                  {/* Left Column Settings */}
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <label className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 font-bold">Broadcast Name</label>
                      <input 
                        type="text" 
                        placeholder="e.g. VIP Club Weekly Updates" 
                        value={broadcastName}
                        onChange={(e) => setBroadcastName(e.target.value)}
                        className="w-full px-3 py-1.5 rounded-xl bg-slate-950 border border-white/10 focus:border-violet-500 focus:outline-hidden text-xs text-white placeholder-zinc-700 font-sans"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 font-bold">Category</label>
                      <select 
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                        className="w-full px-2.5 py-1.5 rounded-xl bg-slate-950 border border-white/10 focus:border-violet-500 focus:outline-hidden text-xs text-zinc-300 font-sans"
                      >
                        {presets.categories.map(cat => (
                          <option key={cat} value={cat}>{cat}</option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 font-bold">Smart Broadcast Mode</label>
                      <div className="grid grid-cols-1 gap-1.5 max-h-[160px] overflow-y-auto pr-1 custom-scrollbar">
                        {[
                          { id: 'standard', name: 'Standard Broadcast', desc: 'Symmetrical replies, routes response to private DMs.' },
                          { id: 'announcement', name: 'Announcement Mode', desc: 'One-way channel. Recipients can only react. Analytics dashboard available.' },
                          { id: 'community', name: 'Community Broadcast', desc: 'Strict admin post control. Member reactions.' },
                          { id: 'creator', name: 'Creator Broadcast', desc: 'Follower exclusive feed. Toggleable replies, rich polls.' },
                          { id: 'business', name: 'Business Broadcast', desc: 'Optimized templates for updates, promocodes and product notifications.' }
                        ].map(mode => (
                          <div 
                            key={mode.id}
                            onClick={() => setBroadcastMode(mode.id as any)}
                            className={`p-2 rounded-xl border cursor-pointer text-left transition-all ${
                              broadcastMode === mode.id 
                                ? 'bg-violet-600/15 border-white/10' 
                                : 'bg-black/20 border-white/5 hover:bg-white/5'
                            }`}
                          >
                            <p className="text-[10px] font-sans font-bold text-white flex items-center gap-1.5">
                              {mode.id === 'announcement' ? '📢' : mode.id === 'creator' ? '🎙️' : mode.id === 'business' ? '💼' : '💬'}
                              {mode.name}
                            </p>
                            <p className="text-[8px] text-zinc-400 font-sans mt-0.5 leading-normal">{mode.desc}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Right Column Settings */}
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <label className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 font-bold">Broadcast Description</label>
                      <textarea 
                        rows={2}
                        placeholder="Provide details on the broadcast mission..." 
                        value={broadcastDescription}
                        onChange={(e) => setBroadcastDescription(e.target.value)}
                        className="w-full px-3 py-1.5 rounded-xl bg-slate-950 border border-white/10 focus:border-violet-500 focus:outline-hidden text-xs text-white placeholder-zinc-700 font-sans resize-none"
                      />
                    </div>

                    {/* Icon Selection Preset */}
                    <div className="space-y-1">
                      <div className="flex justify-between items-center">
                        <label className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 font-bold">Broadcast Icon</label>
                        <span className="text-[8px] text-zinc-500 font-sans">Tap to choose preset</span>
                      </div>
                      <div className="flex gap-2 items-center">
                        <img 
                          src={broadcastIcon} 
                          alt="Current Icon" 
                          className="w-10 h-10 rounded-xl object-cover ring-2 ring-violet-500/40"
                        />
                        <div className="flex gap-1.5 overflow-x-auto py-1 no-scrollbar flex-1">
                          {presets.icons.map((ic, index) => (
                            <button
                              key={index}
                              onClick={() => setBroadcastIcon(ic)}
                              className={`w-7 h-7 rounded-lg overflow-hidden shrink-0 transition-transform ${
                                broadcastIcon === ic ? 'scale-110 ring-1 ring-violet-500' : 'opacity-60 hover:opacity-100'
                              }`}
                            >
                              <img src={ic} className="w-full h-full object-cover" />
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Cover Selection Preset */}
                    <div className="space-y-1">
                      <div className="flex justify-between items-center">
                        <label className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 font-bold">Cover Image Banner</label>
                      </div>
                      <div className="flex gap-2 items-center">
                        <img 
                          src={broadcastCover} 
                          alt="Current Cover" 
                          className="w-12 h-8 rounded-lg object-cover ring-1 ring-white/10"
                        />
                        <div className="flex gap-1.5 overflow-x-auto py-1 no-scrollbar flex-1">
                          {presets.covers.map((cov, index) => (
                            <button
                              key={index}
                              onClick={() => setBroadcastCover(cov)}
                              className={`w-10 h-6 rounded-md overflow-hidden shrink-0 transition-transform ${
                                broadcastCover === cov ? 'scale-110 ring-1 ring-violet-500' : 'opacity-60 hover:opacity-100'
                              }`}
                            >
                              <img src={cov} className="w-full h-full object-cover" />
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Color Theme Selector */}
                    <div className="space-y-1">
                      <label className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 font-bold">Accent LED Color</label>
                      <div className="flex gap-1.5">
                        {presets.colors.map(col => (
                          <button
                            key={col}
                            onClick={() => setThemeColor(col)}
                            className="w-5 h-5 rounded-full transition-transform flex items-center justify-center cursor-pointer hover:scale-110"
                            style={{ backgroundColor: col }}
                          >
                            {themeColor === col && (
                              <Check className="w-3 h-3 text-white stroke-[3px]" />
                            )}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                </div>

                {/* Selected Recipients Overview */}
                <div className="p-2.5 rounded-xl bg-black/40 border border-white/10 text-left flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-violet-400" />
                    <span className="text-[10px] font-sans text-zinc-300">
                      This broadcast will be dispatched to <strong className="text-white">{selectedUserIds.length}</strong> recipient nodes.
                    </span>
                  </div>
                  <button 
                    onClick={() => setStep(1)}
                    className="text-[9px] font-mono uppercase text-violet-400 hover:text-white transition-colors cursor-pointer"
                  >
                    Edit List
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-white/10 flex items-center justify-between relative z-10 bg-[#060412]/80 backdrop-blur-sm shrink-0">
          <div>
            {step === 1 ? (
              <span className="text-[10px] font-mono text-zinc-500">
                {selectedUserIds.length} recipient{selectedUserIds.length !== 1 ? 's' : ''} staged
              </span>
            ) : (
              <span className="text-[10px] font-mono text-zinc-500">
                Mode: <strong className="text-violet-400 font-normal uppercase">{broadcastMode}</strong>
              </span>
            )}
          </div>
          <div className="flex gap-2">
            {step === 1 ? (
              <button
                onClick={() => {
                  if (selectedUserIds.length === 0) {
                    window.dispatchEvent(new CustomEvent('toast', { detail: "⚠️ Choose at least 1 recipient!" }));
                    return;
                  }
                  setStep(2);
                }}
                disabled={selectedUserIds.length === 0}
                className="px-4 py-1.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-sans text-[10px] uppercase font-bold tracking-wider disabled:opacity-40 transition-all cursor-pointer shadow-md"
              >
                Continue Setup
              </button>
            ) : (
              <>
                <button
                  onClick={() => setStep(1)}
                  className="px-4 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-300 font-sans text-[10px] uppercase font-bold tracking-wider transition-all cursor-pointer"
                >
                  Back
                </button>
                <button
                  onClick={handleCreate}
                  className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-violet-600 via-pink-600 to-pink-500 hover:brightness-110 text-white font-sans text-[10px] uppercase font-bold tracking-wider transition-all cursor-pointer shadow-md flex items-center gap-1"
                >
                  <Radio className="w-3.5 h-3.5" /> Instantiate Channel
                </button>
              </>
            )}
          </div>
        </div>

      </motion.div>
    </div>
  );
}
