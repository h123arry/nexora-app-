import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Users, Shield, Sparkles, Check, Search, Image as ImageIcon, Layout, HelpCircle, Lock, Globe, FileText, ArrowRight, ArrowLeft } from 'lucide-react';
import { Chat } from '../types';

interface NewGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateGroup: (group: Partial<Chat>) => void;
}

const PRESET_AVATARS = [
  'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150', // Abstract Fluid
  'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=150', // Tech / Synthwave
  'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=150', // Matrix code
  'https://images.unsplash.com/photo-1614850523459-c2f4c699c52e?w=150', // Neon Neon
  'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=150', // Stadium / Sports
  'https://images.unsplash.com/photo-1538481199705-c710c4e965fc?w=150'  // Retro Gaming
];

const PRESET_BANNERS = [
  'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1000', // Fluid Purple
  'https://images.unsplash.com/photo-1614850523459-c2f4c699c52e?w=1000', // Vibrant Neon
  'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=1000', // Deep Hologram
  'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=1000', // Neon Matrix Grid
  'https://images.unsplash.com/photo-1501183007986-d0d080b147f9?w=1000', // Charcoal Grid
  'https://images.unsplash.com/photo-1478760329108-5c3ed9d495a0?w=1000'  // Dark Cosmic Dust
];

const CATEGORIES = [
  'Technology', 'Gaming', 'Friends', 'Business', 'School', 'Sports', 'Entertainment', 'Design & Art', 'Crypto', 'General'
];

const PRESET_MEMBERS = [
  { id: 'm-sophia', name: 'Sophia Code', username: 'sophia_code', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100' },
  { id: 'm-luna', name: 'Luna Celestial', username: 'luna_design', avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100' },
  { id: 'm-ada', name: 'Ada Matrix', username: 'ada_matrix', avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=100' },
  { id: 'm-marcus', name: 'Marcus Aurelius', username: 'marcus_dev', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100' },
  { id: 'm-harrison', name: 'Harrison VOH', username: 'harrison_voh', avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100' }
];

const THEMES = [
  { id: 'violet', name: 'Cyber Violet', accent: '#8B5CF6', text: 'text-violet-400', bg: 'bg-violet-600', ring: 'ring-violet-500/30' },
  { id: 'pink', name: 'Stellar Pink', accent: '#EC4899', text: 'text-pink-400', bg: 'bg-pink-600', ring: 'ring-pink-500/30' },
  { id: 'cyan', name: 'Matrix Cyan', accent: '#06B6D4', text: 'text-cyan-400', bg: 'bg-cyan-600', ring: 'ring-cyan-500/30' },
  { id: 'emerald', name: 'Neon Emerald', accent: '#10B981', text: 'text-emerald-400', bg: 'bg-emerald-600', ring: 'ring-emerald-500/30' },
  { id: 'amber', name: 'Vortex Amber', accent: '#F59E0B', text: 'text-amber-400', bg: 'bg-amber-600', ring: 'ring-amber-500/30' }
];

export default function NewGroupModal({ isOpen, onClose, onCreateGroup }: NewGroupModalProps) {
  const [step, setStep] = useState<1 | 2>(1);
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [privacy, setPrivacy] = useState<'public' | 'private' | 'invite'>('public');
  const [selectedTheme, setSelectedTheme] = useState(THEMES[0]);
  
  const [selectedAvatar, setSelectedAvatar] = useState(PRESET_AVATARS[0]);
  const [customAvatar, setCustomAvatar] = useState('');
  const [selectedBanner, setSelectedBanner] = useState(PRESET_BANNERS[0]);
  const [customBanner, setCustomBanner] = useState('');

  const [rules, setRules] = useState([
    'Respect other members in this secure community',
    'Keep discussions relevant to the core topic',
    'No spam or unauthorized solicitation'
  ]);
  const [newRule, setNewRule] = useState('');
  const [welcomeMessage, setWelcomeMessage] = useState('Welcome to our newly instantiated Nexora private node! Let\'s build the future together.');
  const [invitedPeerIds, setInvitedPeerIds] = useState<string[]>(['m-sophia', 'm-luna']);
  const [searchMemberQuery, setSearchMemberQuery] = useState('');

  if (!isOpen) return null;

  const handleToggleMember = (id: string) => {
    setInvitedPeerIds(prev =>
      prev.includes(id) ? prev.filter(mId => mId !== id) : [...prev, id]
    );
  };

  const handleAddRule = () => {
    if (newRule.trim()) {
      setRules([...rules, newRule.trim()]);
      setNewRule('');
    }
  };

  const handleRemoveRule = (index: number) => {
    setRules(rules.filter((_, i) => i !== index));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const groupSlug = username.trim().toLowerCase().replace(/[^a-z0-9_]/g, '') || name.trim().toLowerCase().replace(/[^a-z0-9_]/g, '_');
    
    const finalAvatar = customAvatar.trim() || selectedAvatar;
    const finalBanner = customBanner.trim() || selectedBanner;

    onCreateGroup({
      id: `group-${Date.now()}`,
      partnerId: `group-${groupSlug}`,
      partnerName: name.trim(),
      partnerAvatar: finalAvatar,
      partnerBio: description.trim() || 'Welcome to our premium secure community space.',
      isPartnerOnline: true,
      lastMessage: `System: Created the group "${name.trim()}"`,
      lastTimestamp: 'Just now',
      unreadCount: 0,
      isGroup: true,
      groupBanner: finalBanner,
      groupCategory: category,
      groupPrivacy: privacy,
      groupTheme: selectedTheme.accent,
      groupRules: rules,
      welcomeMessage: welcomeMessage.trim() || 'Welcome to our group!',
      creatorId: 'user-0', // HARRISON
      creationDate: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
      membersCount: invitedPeerIds.length + 1,
      adminsCount: 1,
      onlineCount: Math.ceil((invitedPeerIds.length + 1) * 0.4),
      username: `@${groupSlug}`,
      inviteLink: `https://nexora.live/invite/${groupSlug}-${Math.floor(1000 + Math.random() * 9000)}`,
      isVerified: category === 'Business' || category === 'Technology'
    });

    // Reset values
    setName('');
    setUsername('');
    setDescription('');
    setCategory(CATEGORIES[0]);
    setPrivacy('public');
    setStep(1);
    onClose();
  };

  const filteredMembers = PRESET_MEMBERS.filter(m =>
    m.name.toLowerCase().includes(searchMemberQuery.toLowerCase()) ||
    m.username.toLowerCase().includes(searchMemberQuery.toLowerCase())
  );

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-xl overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="w-full max-w-xl bg-[#09071c]/95 border border-white/10 rounded-3xl text-white shadow-md relative overflow-hidden my-8"
        >
          {/* Ambient header glow bar */}
          <div 
            className="absolute top-0 inset-x-0 h-[3px] transition-colors duration-500"
            style={{ backgroundColor: selectedTheme.accent }}
          />

          {/* Top Header */}
          <div className="p-5 border-b border-white/5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div 
                className="p-1.5 rounded-lg bg-white/5 border border-white/10 transition-colors"
                style={{ color: selectedTheme.accent }}
              >
                <Users className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-xs font-mono uppercase tracking-widest font-black">Initialize Nexora Node</h3>
                <p className="text-[10px] text-zinc-500">Step {step} of 2 — {step === 1 ? 'Design & Identity' : 'Rules, Access & Peer Enrollment'}</p>
              </div>
            </div>
            <button 
              onClick={onClose}
              className="p-1.5 hover:bg-white/5 border border-white/10 rounded-xl text-zinc-400 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-5 text-left max-h-[75vh] overflow-y-auto custom-scrollbar">
            {step === 1 ? (
              <div className="space-y-4">
                {/* Visual Identity Preview banner */}
                <div className="relative h-28 rounded-2xl overflow-hidden border border-white/5 bg-slate-950">
                  <img 
                    src={customBanner.trim() || selectedBanner} 
                    alt="Banner preview" 
                    className="w-full h-full object-cover brightness-75" 
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#09071c] via-transparent to-transparent" />
                  
                  {/* Avatar circle preview */}
                  <div className="absolute bottom-2 left-4 w-14 h-14 rounded-2xl overflow-hidden border-2 border-[#09071c] bg-zinc-900 shadow-lg">
                    <img src={customAvatar.trim() || selectedAvatar} alt="Avatar preview" className="w-full h-full object-cover" />
                  </div>

                  <div className="absolute bottom-2 left-20">
                    <h4 className="text-xs font-bold leading-none text-white">{name || 'Node Title'}</h4>
                    <span className="text-[9px] font-mono opacity-60">@{username.toLowerCase().replace(/[^a-z0-9_]/g, '') || 'username'}</span>
                  </div>

                  <div className="absolute top-3 right-3">
                    <span 
                      className="px-2 py-0.5 rounded text-[8px] font-mono uppercase font-black tracking-wider shadow-sm"
                      style={{ backgroundColor: `${selectedTheme.accent}25`, border: `1px solid ${selectedTheme.accent}40`, color: selectedTheme.accent }}
                    >
                      {category}
                    </span>
                  </div>
                </div>

                {/* Identity Inputs Row */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[9px] font-mono uppercase tracking-widest text-zinc-400">Group Name</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Synthwave Hackers"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:border-white/10 focus:outline-hidden"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[9px] font-mono uppercase tracking-widest text-zinc-400">Unique Username Slug</label>
                    <div className="relative">
                      <span className="absolute left-3 top-2.5 text-xs text-zinc-600 font-mono">@</span>
                      <input
                        type="text"
                        required
                        placeholder="synth_hackers"
                        value={username}
                        onChange={(e) => setUsername(e.target.value.toLowerCase().trim().replace(/[^a-z0-9_]/g, ''))}
                        className="w-full bg-black/40 border border-white/10 rounded-xl pl-7 pr-3 py-2 text-xs text-white focus:border-white/10 focus:outline-hidden font-mono"
                      />
                    </div>
                  </div>
                </div>

                {/* Category & Accent Theme */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[9px] font-mono uppercase tracking-widest text-zinc-400">Community Category</label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:border-white/10 focus:outline-hidden cursor-pointer"
                    >
                      {CATEGORIES.map(c => (
                        <option key={c} value={c} className="bg-[#09071c]">{c}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[9px] font-mono uppercase tracking-widest text-zinc-400">Identity Accent Color</label>
                    <div className="flex gap-2 py-1 items-center">
                      {THEMES.map(t => (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => setSelectedTheme(t)}
                          style={{ backgroundColor: t.accent }}
                          className={`w-5 h-5 rounded-full transition-transform cursor-pointer relative ${
                            selectedTheme.id === t.id ? 'scale-125 ring-2 ring-white/40' : 'opacity-70 hover:opacity-100'
                          }`}
                          title={t.name}
                        >
                          {selectedTheme.id === t.id && (
                            <Check className="w-3 h-3 text-black absolute inset-0 m-auto stroke-[3]" />
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Description */}
                <div className="space-y-1">
                  <label className="text-[9px] font-mono uppercase tracking-widest text-zinc-400">About / Description</label>
                  <textarea
                    placeholder="Provide a modern brief regarding your private node coordinates..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={2}
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white focus:border-white/10 focus:outline-hidden resize-none leading-relaxed font-sans"
                  />
                </div>

                {/* Avatar Presets Selection */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="text-[9px] font-mono uppercase tracking-widest text-zinc-400">Avatar cover icon</label>
                    <span className="text-[8px] font-mono text-zinc-600">Preset or custom URL</span>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    {PRESET_AVATARS.map((url, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => { setSelectedAvatar(url); setCustomAvatar(''); }}
                        className={`w-9 h-9 rounded-xl overflow-hidden border transition-all cursor-pointer ${
                          selectedAvatar === url && !customAvatar ? 'border-violet-500 scale-105 shadow-md shadow-violet-500/10' : 'border-transparent opacity-60 hover:opacity-100'
                        }`}
                      >
                        <img src={url} alt={`Avatar option ${i}`} className="w-full h-full object-cover" />
                      </button>
                    ))}
                    <div className="flex-1 min-w-[150px]">
                      <input
                        type="text"
                        placeholder="Or paste external avatar image URL..."
                        value={customAvatar}
                        onChange={(e) => setCustomAvatar(e.target.value)}
                        className="w-full bg-black/30 border border-white/10 rounded-xl px-3 py-1.5 text-[10px] text-zinc-300 focus:border-white/10 focus:outline-hidden"
                      />
                    </div>
                  </div>
                </div>

                {/* Banner Presets Selection */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="text-[9px] font-mono uppercase tracking-widest text-zinc-400">Banner backdrop</label>
                    <span className="text-[8px] font-mono text-zinc-600">Preset or custom URL</span>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    {PRESET_BANNERS.map((url, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => { setSelectedBanner(url); setCustomBanner(''); }}
                        className={`w-14 h-8 rounded-lg overflow-hidden border transition-all cursor-pointer ${
                          selectedBanner === url && !customBanner ? 'border-violet-500 scale-105' : 'border-transparent opacity-60 hover:opacity-100'
                        }`}
                      >
                        <img src={url} alt={`Banner option ${i}`} className="w-full h-full object-cover" />
                      </button>
                    ))}
                    <div className="flex-1 min-w-[150px]">
                      <input
                        type="text"
                        placeholder="Or paste banner image URL..."
                        value={customBanner}
                        onChange={(e) => setCustomBanner(e.target.value)}
                        className="w-full bg-black/30 border border-white/10 rounded-xl px-3 py-1.5 text-[10px] text-zinc-300 focus:border-white/10 focus:outline-hidden"
                      />
                    </div>
                  </div>
                </div>

                {/* Step Navigation */}
                <div className="pt-4 flex justify-end">
                  <button
                    type="button"
                    onClick={() => setStep(2)}
                    disabled={!name.trim()}
                    className="px-5 py-2.5 bg-gradient-to-r from-violet-600 to-pink-500 hover:brightness-110 disabled:opacity-50 text-white rounded-xl font-mono text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    <span>Configure Access & Rules</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Privacy select cards */}
                <div className="space-y-1.5">
                  <label className="text-[9px] font-mono uppercase tracking-widest text-zinc-400">Node Privacy & Permissions</label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: 'public', label: 'Public', icon: Globe, desc: 'Anyone can join' },
                      { id: 'private', label: 'Private', icon: Shield, desc: 'Requires request' },
                      { id: 'invite', label: 'Invite Only', icon: Lock, desc: 'Admins invite only' }
                    ].map((pOpt) => {
                      const Icon = pOpt.icon;
                      const isSel = privacy === pOpt.id;
                      return (
                        <button
                          key={pOpt.id}
                          type="button"
                          onClick={() => setPrivacy(pOpt.id as any)}
                          className={`p-3 rounded-2xl border text-center cursor-pointer transition-all flex flex-col items-center gap-1.5 ${
                            isSel 
                              ? 'bg-violet-600/10 text-white' 
                              : 'bg-black/30 border-white/5 text-zinc-400 hover:text-white'
                          }`}
                          style={{ borderColor: isSel ? selectedTheme.accent : 'transparent' }}
                        >
                          <Icon className="w-4 h-4" style={{ color: isSel ? selectedTheme.accent : undefined }} />
                          <div className="text-[10px] font-extrabold font-mono uppercase leading-none">{pOpt.label}</div>
                          <span className="text-[8px] opacity-60 leading-tight">{pOpt.desc}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Rules & Codex Builder */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="text-[9px] font-mono uppercase tracking-widest text-zinc-400">Group Codex (Rules)</label>
                    <span className="text-[8px] font-mono text-zinc-500">Admins can edit later</span>
                  </div>
                  
                  <div className="space-y-1.5 max-h-28 overflow-y-auto bg-black/45 border border-white/5 p-2 rounded-xl custom-scrollbar">
                    {rules.map((rule, idx) => (
                      <div key={idx} className="flex items-center justify-between gap-2 p-1.5 px-2 bg-slate-950/55 rounded-lg text-[10px] border border-white/5">
                        <span className="flex-1 text-zinc-300 leading-snug">{idx + 1}. {rule}</span>
                        <button 
                          type="button" 
                          onClick={() => handleRemoveRule(idx)}
                          className="p-0.5 hover:bg-white/10 rounded text-zinc-500 hover:text-red-400 transition-colors"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                    {rules.length === 0 && (
                      <p className="text-[10px] italic text-zinc-600 p-2 text-center">No group rules set. This community is rule-free.</p>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Add new rule / standard..."
                      value={newRule}
                      onChange={(e) => setNewRule(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddRule(); } }}
                      className="flex-1 bg-black/40 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white placeholder-zinc-600 focus:outline-hidden"
                    />
                    <button
                      type="button"
                      onClick={handleAddRule}
                      className="px-3 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-xl text-xs font-mono"
                    >
                      Add
                    </button>
                  </div>
                </div>

                {/* Welcome Message */}
                <div className="space-y-1">
                  <label className="text-[9px] font-mono uppercase tracking-widest text-zinc-400">Welcome / Broadcast Message</label>
                  <input
                    type="text"
                    placeholder="Instantiated welcome statement..."
                    value={welcomeMessage}
                    onChange={(e) => setWelcomeMessage(e.target.value)}
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:border-white/10 focus:outline-hidden"
                  />
                </div>

                {/* Select / Invite initial contacts */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="text-[9px] font-mono uppercase tracking-widest text-zinc-400">Enroll Initial Peers ({invitedPeerIds.length})</label>
                    <div className="relative w-36">
                      <Search className="absolute left-2 top-2 w-2.5 h-2.5 text-zinc-500" />
                      <input
                        type="text"
                        placeholder="Search peers..."
                        value={searchMemberQuery}
                        onChange={(e) => setSearchMemberQuery(e.target.value)}
                        className="w-full bg-black pl-6 pr-2 py-1 rounded-lg text-[9px] text-white border border-white/10 focus:outline-hidden"
                      />
                    </div>
                  </div>

                  <div className="max-h-24 overflow-y-auto divide-y divide-white/5 bg-black/40 rounded-xl border border-white/5 p-1.5 custom-scrollbar">
                    {filteredMembers.map(member => {
                      const isChecked = invitedPeerIds.includes(member.id);
                      return (
                        <div 
                          key={member.id}
                          onClick={() => handleToggleMember(member.id)}
                          className="flex items-center justify-between py-1 px-1.5 hover:bg-white/5 rounded-lg cursor-pointer transition-colors"
                        >
                          <div className="flex items-center gap-2">
                            <img src={member.avatar} alt={member.name} className="w-5.5 h-5.5 rounded-lg object-cover" />
                            <div>
                              <span className="text-[10px] font-bold block leading-none">{member.name}</span>
                              <span className="text-[8px] font-mono text-zinc-500">@{member.username}</span>
                            </div>
                          </div>
                          <div className="w-3.5 h-3.5 rounded-md border flex items-center justify-center transition-all"
                            style={{ 
                              backgroundColor: isChecked ? selectedTheme.accent : 'transparent',
                              borderColor: isChecked ? selectedTheme.accent : 'rgba(255, 255, 255, 0.1)'
                            }}
                          >
                            {isChecked && <Check className="w-2.5 h-2.5 text-black stroke-[4]" />}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Action Row */}
                <div className="pt-4 flex justify-between items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="px-4 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-400 hover:text-white rounded-xl font-mono text-[10px] uppercase font-bold transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Back</span>
                  </button>

                  <button
                    type="submit"
                    style={{ 
                      background: `linear-gradient(to right, ${selectedTheme.accent}, #EC4899)`,
                      boxShadow: `0 4px 14px -4px ${selectedTheme.accent}aa`
                    }}
                    className="flex-1 py-3 text-white rounded-xl font-mono text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-black" />
                    <span className="text-black font-extrabold">Instantiate Group Node</span>
                  </button>
                </div>
              </div>
            )}
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
