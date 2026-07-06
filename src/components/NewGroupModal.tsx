import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Users, Shield, Sparkles, Check, Search } from 'lucide-react';

interface NewGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateGroup: (name: string, description: string, avatar: string, members: string[]) => void;
}

const PRESET_AVATARS = [
  'https://images.unsplash.com/photo-1582213782179-e0d53f98f2ca?w=150',
  'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150',
  'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=150',
  'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=150'
];

const PRESET_MEMBERS = [
  { id: 'creator-1', name: 'Luna', username: 'luna_design', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100' },
  { id: 'creator-2', name: 'Sophia', username: 'sophia_code', avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100' },
  { id: 'creator-3', name: 'Ada', username: 'ada_matrix', avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=100' },
  { id: 'creator-4', name: 'Harrison', username: 'harrison_dev', avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100' }
];

export default function NewGroupModal({ isOpen, onClose, onCreateGroup }: NewGroupModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState(PRESET_AVATARS[0]);
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>(['creator-1', 'creator-2']);
  const [memberSearchQuery, setMemberSearchQuery] = useState('');

  if (!isOpen) return null;

  const handleToggleMember = (id: string) => {
    setSelectedMemberIds(prev => 
      prev.includes(id) ? prev.filter(mId => mId !== id) : [...prev, id]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onCreateGroup(name, description || 'Secure developer chatroom', selectedAvatar, selectedMemberIds);
    setName('');
    setDescription('');
    onClose();
  };

  const filteredMembers = PRESET_MEMBERS.filter(m => 
    m.name.toLowerCase().includes(memberSearchQuery.toLowerCase()) ||
    m.username.toLowerCase().includes(memberSearchQuery.toLowerCase())
  );

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="w-full max-w-md bg-[#09071c]/95 border border-violet-500/20 rounded-3xl p-6 text-white shadow-2xl relative overflow-hidden"
        >
          {/* Ambient light streak */}
          <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-violet-500 via-pink-500 to-cyan-500" />
          
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-violet-400" />
              <h3 className="text-sm font-mono uppercase tracking-wider font-extrabold text-white">Create Secure Channel Group</h3>
            </div>
            <button 
              onClick={onClose}
              className="p-1 hover:bg-white/5 border border-white/10 rounded-lg text-zinc-400 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4 text-left">
            {/* Group Name */}
            <div className="space-y-1.5">
              <label className="text-[9px] font-mono uppercase tracking-widest text-violet-300 font-black">Group Identity / Name</label>
              <input
                type="text"
                required
                placeholder="e.g., Matrix Shaders Sync, Rust WebRTC Core"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-slate-950 border border-violet-500/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:border-violet-500/40 focus:outline-hidden"
              />
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <label className="text-[9px] font-mono uppercase tracking-widest text-violet-300 font-black">Topic / Description</label>
              <textarea
                placeholder="Secure coordination space..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                className="w-full bg-slate-950 border border-violet-500/10 rounded-xl px-3.5 py-2 text-xs text-white focus:border-violet-500/40 focus:outline-hidden resize-none"
              />
            </div>

            {/* Preset Avatar Select */}
            <div className="space-y-1.5">
              <label className="text-[9px] font-mono uppercase tracking-widest text-violet-300 font-black">Select Channel Cover Icon</label>
              <div className="flex gap-2">
                {PRESET_AVATARS.map((url, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setSelectedAvatar(url)}
                    className={`w-10 h-10 rounded-xl overflow-hidden border-2 transition-all cursor-pointer shrink-0 ${
                      selectedAvatar === url ? 'border-violet-500 scale-105' : 'border-transparent opacity-60 hover:opacity-100'
                    }`}
                  >
                    <img src={url} alt={`Avatar option ${i}`} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            </div>

            {/* Invite Members */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-[9px] font-mono uppercase tracking-widest text-violet-300 font-black">Enlist Peers ({selectedMemberIds.length})</label>
                <div className="relative w-36">
                  <Search className="absolute left-2 top-1.5 w-3 h-3 text-zinc-500" />
                  <input
                    type="text"
                    placeholder="Search peers..."
                    value={memberSearchQuery}
                    onChange={(e) => setMemberSearchQuery(e.target.value)}
                    className="w-full bg-black pl-7 pr-2 py-0.5 rounded-md text-[9px] text-white border border-white/5 focus:outline-hidden focus:border-violet-500/30"
                  />
                </div>
              </div>

              <div className="max-h-32 overflow-y-auto divide-y divide-white/5 bg-slate-950 rounded-xl border border-white/5 p-2 custom-scrollbar">
                {filteredMembers.map(member => {
                  const isChecked = selectedMemberIds.includes(member.id);
                  return (
                    <div 
                      key={member.id}
                      onClick={() => handleToggleMember(member.id)}
                      className="flex items-center justify-between py-1.5 px-2 hover:bg-violet-500/5 rounded-lg cursor-pointer transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <img src={member.avatar} alt={member.name} className="w-6 h-6 rounded-md object-cover" />
                        <div>
                          <span className="text-[11px] font-bold block leading-none">{member.name}</span>
                          <span className="text-[8px] font-mono text-zinc-500">@{member.username}</span>
                        </div>
                      </div>
                      <div className={`w-4 h-4 rounded-md border flex items-center justify-center transition-all ${
                        isChecked ? 'bg-violet-600 border-violet-400 text-white' : 'border-white/10 text-transparent'
                      }`}>
                        <Check className="w-2.5 h-2.5 stroke-[3]" />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-3 bg-gradient-to-r from-violet-600 to-pink-500 hover:brightness-110 active:scale-98 text-white rounded-xl font-mono text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-lg shadow-violet-950/40"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Instantiate Secure Group</span>
            </button>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
