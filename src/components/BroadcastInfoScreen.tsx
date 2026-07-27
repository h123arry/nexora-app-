import React, { useState } from 'react';
import { 
  X, Radio, Users, Calendar, Shield, Info, Image as ImageIcon, 
  Paperclip, Link as LinkIcon, BarChart2, Bell, BellOff, Volume2, VolumeX,
  Search, Trash2, Edit2, Pin, Sparkles, User, ArrowLeft, ChevronRight, Check
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Chat, User as UserType } from '../types';

interface BroadcastInfoScreenProps {
  isOpen: boolean;
  onClose: () => void;
  broadcast: Chat | null;
  onDeleteBroadcast: (id: string) => void;
  onUpdateBroadcast: (id: string, fields: Partial<Chat>) => void;
  onOpenAnalytics: () => void;
  availableUsers: UserType[];
}

export default function BroadcastInfoScreen({
  isOpen,
  onClose,
  broadcast,
  onDeleteBroadcast,
  onUpdateBroadcast,
  onOpenAnalytics,
  availableUsers
}: BroadcastInfoScreenProps) {
  const [isEditingName, setIsEditingName] = useState(false);
  const [newName, setNewName] = useState('');
  const [isEditingBio, setIsEditingBio] = useState(false);
  const [newBio, setNewBio] = useState('');
  
  const [activeMediaTab, setActiveMediaTab] = useState<'media' | 'files' | 'links' | 'recipients'>('recipients');
  const [isMuted, setIsMuted] = useState(false);

  if (!isOpen || !broadcast) return null;

  const recipientsCount = broadcast.broadcastRecipients?.length || 0;
  const broadcastTheme = broadcast.groupTheme || '#8B5CF6';

  const handleSaveName = () => {
    if (newName.trim()) {
      onUpdateBroadcast(broadcast.id, { partnerName: newName.trim() });
      setIsEditingName(false);
      window.dispatchEvent(new CustomEvent('toast', { detail: "✏️ Broadcast name updated successfully!" }));
    }
  };

  const handleSaveBio = () => {
    onUpdateBroadcast(broadcast.id, { partnerBio: newBio.trim() });
    setIsEditingBio(false);
    window.dispatchEvent(new CustomEvent('toast', { detail: "✏️ Broadcast description updated!" }));
  };

  const handleDelete = () => {
    if (window.confirm("Are you absolutely sure you want to delete this broadcast node and clear all messages? This action is irreversible on the local ledger.")) {
      onDeleteBroadcast(broadcast.id);
      onClose();
      window.dispatchEvent(new CustomEvent('toast', { detail: "🗑️ Broadcast node purged from ledger." }));
    }
  };

  // Find users in this broadcast
  const recipientUsers = availableUsers.filter(u => broadcast.broadcastRecipients?.includes(u.id));

  // Simulated Shared Items
  const sharedItems = {
    media: [
      'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150',
      'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=150',
      'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=150'
    ],
    files: [
      { name: 'Nexora_Developer_Manual.pdf', size: '4.8 MB', date: 'Yesterday' },
      { name: 'Interactive_UI_Spec_v3.zip', size: '12.4 MB', date: '3 days ago' }
    ],
    links: [
      { url: 'https://nexora.dev/alpha-feedback', title: 'Nexora Alpha Feedback Portal' },
      { url: 'https://images.unsplash.com/photo-1550745165', title: 'Unsplash Core Backgrounds' }
    ]
  };

  return (
    <div className="absolute inset-0 z-40 bg-[#060412] flex flex-col h-full overflow-hidden select-none">
      
      {/* Dynamic Cover Image Banner */}
      <div className="h-44 w-full relative shrink-0">
        <img 
          src={broadcast.groupBanner || 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=800'} 
          alt="Broadcast Banner Cover" 
          className="w-full h-full object-cover"
        />
        {/* Cover gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#060412] via-[#060412]/50 to-transparent" />
        
        {/* Back Button */}
        <button 
          onClick={onClose}
          className="absolute top-4 left-4 p-2 bg-black/60 hover:bg-black/80 rounded-full text-white cursor-pointer transition-all border border-white/10"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>

        {/* Floating Category Tag */}
        <span className="absolute top-4 right-4 px-2.5 py-0.5 rounded-full text-[8.5px] font-mono tracking-wider font-extrabold text-white bg-violet-600 border border-violet-400/20 uppercase shadow-md">
          {broadcast.groupCategory || 'Broadcast'}
        </span>
      </div>

      {/* Profile & Info Overlap Section */}
      <div className="px-4 -mt-16 relative z-10 shrink-0 text-left">
        <div className="flex items-end gap-3.5">
          <img 
            src={broadcast.partnerAvatar} 
            alt={broadcast.partnerName} 
            className="w-20 h-20 rounded-2xl object-cover ring-4 ring-[#060412] bg-[#0c0a1f] shadow-md"
          />
          <div className="mb-2 leading-tight">
            <span className="px-2 py-0.5 rounded-md text-[7.5px] font-mono uppercase tracking-widest text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 font-bold">
              {broadcast.broadcastMode ? broadcast.broadcastMode.toUpperCase() + ' MODE' : 'BROADCAST NODE'}
            </span>
            <div className="flex items-center gap-1.5 mt-1.5">
              {isEditingName ? (
                <div className="flex gap-1.5 items-center">
                  <input 
                    type="text" 
                    value={newName} 
                    onChange={e => setNewName(e.target.value)}
                    className="bg-black/40 border border-white/10 rounded-lg px-2 py-0.5 text-xs text-white font-sans focus:outline-hidden"
                  />
                  <button onClick={handleSaveName} className="p-1 bg-emerald-500 text-slate-950 rounded-md">
                    <Check className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <>
                  <h2 className="text-sm font-black uppercase text-white truncate max-w-[200px]">{broadcast.partnerName}</h2>
                  <button 
                    onClick={() => {
                      setNewName(broadcast.partnerName);
                      setIsEditingName(true);
                    }}
                    className="p-1 hover:bg-white/5 rounded-md text-zinc-400 hover:text-white"
                  >
                    <Edit2 className="w-3 h-3" />
                  </button>
                </>
              )}
            </div>
            <p className="text-[10px] font-mono text-zinc-500 mt-1">{recipientsCount} Active Recipient Nodes</p>
          </div>
        </div>
      </div>

      {/* Main Details Body */}
      <div className="flex-1 overflow-y-auto p-4 custom-scrollbar text-left space-y-4">
        
        {/* Bio / Description */}
        <div className="p-3 rounded-2xl bg-black/30 border border-white/5 space-y-1 text-left relative">
          <div className="flex justify-between items-center">
            <span className="text-[8px] font-mono uppercase tracking-widest text-zinc-500 font-bold">Description Ledger</span>
            <button 
              onClick={() => {
                setNewBio(broadcast.partnerBio);
                setIsEditingBio(true);
              }}
              className="p-1 hover:bg-white/5 rounded-md text-zinc-500 hover:text-white"
            >
              <Edit2 className="w-3 h-3" />
            </button>
          </div>
          {isEditingBio ? (
            <div className="space-y-2 mt-1">
              <textarea 
                value={newBio}
                onChange={e => setNewBio(e.target.value)}
                className="w-full bg-slate-950 border border-white/10 rounded-xl p-2 text-[10.5px] text-white focus:outline-hidden resize-none"
                rows={2}
              />
              <div className="flex justify-end gap-1.5">
                <button 
                  onClick={() => setIsEditingBio(false)} 
                  className="px-2 py-1 bg-white/5 text-zinc-400 rounded-lg text-[9px] font-mono uppercase"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleSaveBio} 
                  className="px-2 py-1 bg-violet-600 text-white rounded-lg text-[9px] font-mono uppercase font-bold"
                >
                  Save
                </button>
              </div>
            </div>
          ) : (
            <p className="text-[11px] text-zinc-300 leading-relaxed font-sans">{broadcast.partnerBio}</p>
          )}
        </div>

        {/* Action Button Grid */}
        <div className="grid grid-cols-3 gap-2 shrink-0">
          <button 
            onClick={onOpenAnalytics}
            className="p-2.5 rounded-2xl bg-emerald-500/5 hover:bg-emerald-500/10 border border-emerald-500/10 text-center flex flex-col items-center justify-center gap-1 cursor-pointer transition-all hover:-translate-y-0.5"
          >
            <BarChart2 className="w-4 h-4 text-emerald-400" />
            <span className="text-[8.5px] font-mono uppercase tracking-wider text-emerald-400 font-black">Analytics</span>
          </button>
          
          <button 
            onClick={() => {
              setIsMuted(!isMuted);
              window.dispatchEvent(new CustomEvent('toast', { detail: isMuted ? "🔊 Broadcast updates unmuted!" : "🔇 Broadcast notifications muted." }));
            }}
            className="p-2.5 rounded-2xl bg-black/40 hover:bg-white/5 border border-white/5 text-center flex flex-col items-center justify-center gap-1 cursor-pointer transition-all hover:-translate-y-0.5"
          >
            {isMuted ? (
              <>
                <BellOff className="w-4 h-4 text-pink-500" />
                <span className="text-[8.5px] font-mono uppercase tracking-wider text-pink-500 font-black">Unmute</span>
              </>
            ) : (
              <>
                <Bell className="w-4 h-4 text-violet-400" />
                <span className="text-[8.5px] font-mono uppercase tracking-wider text-violet-400 font-black">Mute</span>
              </>
            )}
          </button>

          <button 
            onClick={handleDelete}
            className="p-2.5 rounded-2xl bg-pink-500/5 hover:bg-pink-500/10 border border-pink-500/10 text-center flex flex-col items-center justify-center gap-1 cursor-pointer transition-all hover:-translate-y-0.5"
          >
            <Trash2 className="w-4 h-4 text-pink-500" />
            <span className="text-[8.5px] font-mono uppercase tracking-wider text-pink-500 font-black">Purge Node</span>
          </button>
        </div>

        {/* Info Grid (Owner, Creation Date) */}
        <div className="grid grid-cols-2 gap-2.5">
          <div className="p-2.5 rounded-2xl bg-black/20 border border-white/5 leading-none">
            <span className="text-[7.5px] font-mono uppercase text-zinc-500 block">Created On</span>
            <strong className="text-[10px] text-white block mt-1.5 font-sans uppercase">July 10, 2026</strong>
          </div>
          <div className="p-2.5 rounded-2xl bg-black/20 border border-white/5 leading-none">
            <span className="text-[7.5px] font-mono uppercase text-zinc-500 block">Owner / Node</span>
            <strong className="text-[10px] text-white block mt-1.5 font-sans uppercase flex items-center gap-1">
              <User className="w-3 h-3 text-violet-400" /> My Workspace
            </strong>
          </div>
        </div>

        {/* Media / Files / Links / Recipients Switch Panel */}
        <div className="space-y-2">
          {/* Tabs */}
          <div className="flex gap-1 overflow-x-auto no-scrollbar border-b border-white/5 py-1">
            {[
              { id: 'recipients', label: `👥 Recipients (${recipientsCount})` },
              { id: 'media', label: '📸 Media' },
              { id: 'files', label: '📎 Files' },
              { id: 'links', label: '🔗 Links' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveMediaTab(tab.id as any)}
                className={`px-3 py-1 rounded-lg text-[8.5px] font-mono uppercase tracking-wider shrink-0 transition-all cursor-pointer ${
                  activeMediaTab === tab.id 
                    ? 'bg-violet-600/25 border border-white/10 text-white' 
                    : 'bg-transparent text-zinc-500 hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div className="min-h-[140px]">
            {activeMediaTab === 'recipients' && (
              <div className="space-y-1 max-h-[220px] overflow-y-auto pr-1 custom-scrollbar">
                {recipientUsers.map(user => (
                  <div key={user.id} className="p-2 rounded-xl bg-black/20 border border-white/5 flex items-center justify-between">
                    <div className="flex items-center gap-2 min-w-0">
                      <img src={user.avatar} className="w-7 h-7 rounded-lg object-cover" />
                      <div className="text-left leading-none min-w-0">
                        <span className="text-[10px] font-sans font-black text-white block truncate">{user.name}</span>
                        <span className="text-[8px] font-mono text-zinc-500 block mt-0.5">@{user.username}</span>
                      </div>
                    </div>
                    {user.isVerified && (
                      <span className="p-0.5 bg-violet-500 text-white rounded-full shrink-0">
                        <Shield className="w-2 h-2 fill-current" />
                      </span>
                    )}
                  </div>
                ))}
                {recipientUsers.length === 0 && (
                  <p className="text-[9px] font-mono text-zinc-500 text-center py-6 uppercase">No custom recipients added.</p>
                )}
              </div>
            )}

            {activeMediaTab === 'media' && (
              <div className="grid grid-cols-3 gap-1.5 max-h-[220px] overflow-y-auto pr-1 custom-scrollbar">
                {sharedItems.media.map((img, i) => (
                  <div key={i} className="aspect-square rounded-xl overflow-hidden border border-white/5 relative group">
                    <img src={img} className="w-full h-full object-cover" />
                  </div>
                ))}
              </div>
            )}

            {activeMediaTab === 'files' && (
              <div className="space-y-1.5 max-h-[220px] overflow-y-auto pr-1 custom-scrollbar">
                {sharedItems.files.map((file, i) => (
                  <div key={i} className="p-2 rounded-xl bg-black/30 border border-white/5 flex items-center justify-between text-left">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="p-1.5 rounded-lg bg-violet-600/10 border border-white/10 text-violet-400">
                        <Paperclip className="w-3.5 h-3.5" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[9.5px] font-sans font-bold text-white truncate">{file.name}</p>
                        <span className="text-[7.5px] font-mono text-zinc-500">{file.size} • {file.date}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {activeMediaTab === 'links' && (
              <div className="space-y-1.5 max-h-[220px] overflow-y-auto pr-1 custom-scrollbar">
                {sharedItems.links.map((link, i) => (
                  <a 
                    key={i} 
                    href={link.url} 
                    target="_blank" 
                    rel="noreferrer" 
                    className="p-2 rounded-xl bg-black/30 border border-white/5 flex items-center justify-between text-left hover:bg-white/5 transition-all block"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="p-1.5 rounded-lg bg-violet-600/10 border border-white/10 text-violet-400">
                        <LinkIcon className="w-3.5 h-3.5" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[9.5px] font-sans font-bold text-white truncate">{link.title}</p>
                        <span className="text-[7.5px] font-mono text-zinc-500 block truncate">{link.url}</span>
                      </div>
                    </div>
                  </a>
                ))}
              </div>
            )}
          </div>
        </div>

      </div>

    </div>
  );
}
