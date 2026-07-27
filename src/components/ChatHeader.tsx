import React from 'react';
import { ArrowLeft, Phone, Video, MoreVertical, Ghost, Camera } from 'lucide-react';
import { Chat } from '../types';

interface ChatHeaderProps {
  chat: Chat;
  status: string | null;
  onBack: () => void;
  onCall: (type: 'voice' | 'video') => void;
  onViewProfile: () => void;
  isVanishMode?: boolean;
  onToggleVanishMode?: () => void;
  onSimulateScreenshot?: () => void;
}

export default function ChatHeader({ 
  chat, 
  status, 
  onBack, 
  onCall, 
  onViewProfile,
  isVanishMode = false,
  onToggleVanishMode,
  onSimulateScreenshot
}: ChatHeaderProps) {
  return (
    <div className={`flex items-center justify-between p-3.5 border-b shrink-0 sticky top-0 z-10 h-16 transition-all duration-300 ${
      isVanishMode 
        ? 'border-pink-500/25 bg-[#120516] shadow-[0_0_15px_rgba(236,72,153,0.05)]' 
        : 'border-white/10 bg-[#080516]'
    }`}>
      {/* Left Section: Back, Avatar, Identity */}
      <div className="flex items-center gap-3 overflow-hidden">
        <button onClick={onBack} className="p-1 text-zinc-400 hover:text-white rounded-full transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div 
          className="cursor-pointer relative shrink-0"
          onClick={onViewProfile}
        >
          <img 
            src={chat.partnerAvatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=80'} 
            alt={chat.partnerName} 
            className={`w-10 h-10 rounded-full object-cover border-2 transition-all duration-300 ${
              isVanishMode ? 'border-pink-500 ring-2 ring-pink-500/10' : 'border-white/10'
            }`} 
            referrerPolicy="no-referrer"
          />
          {chat.isPartnerOnline && <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-[#080516]" />}
        </div>
        <div className="text-left overflow-hidden cursor-pointer" onClick={onViewProfile}>
          <div className="flex items-center gap-1.5">
            <h3 className="text-sm font-bold text-white truncate leading-none">{chat.partnerName}</h3>
            {isVanishMode && (
              <span className="px-1.5 py-0.5 rounded-full bg-pink-500/15 border border-pink-500/35 text-[7px] font-mono font-black text-pink-400 uppercase tracking-widest animate-pulse leading-none">
                Vanish
              </span>
            )}
          </div>
          <p className="text-xs text-violet-300 truncate mt-0.5">
            {isVanishMode ? '👻 Vanishing Session Active' : status || (chat.isPartnerOnline ? 'Online' : 'Offline')}
          </p>
        </div>
      </div>

      {/* Right Section: Call, Video, Vanish Mode Toggle, Screenshot Simulation */}
      <div className="flex items-center gap-1.5">
        {/* Vanish mode toggle button */}
        {onToggleVanishMode && (
          <button 
            onClick={onToggleVanishMode}
            className={`p-2 rounded-lg cursor-pointer transition-all ${
              isVanishMode 
                ? 'bg-pink-500/25 text-pink-400 border border-pink-500/40 hover:bg-pink-500/35 shadow-inner' 
                : 'text-zinc-400 hover:text-pink-400 hover:bg-white/5 border border-transparent'
            }`}
            title={isVanishMode ? "Exit secure vanish mode" : "Enter secure vanish mode"}
          >
            <Ghost className={`w-4 h-4 ${isVanishMode ? 'animate-bounce' : ''}`} />
          </button>
        )}

        {/* Screenshot Simulator button */}
        {isVanishMode && onSimulateScreenshot && (
          <button 
            onClick={onSimulateScreenshot}
            className="p-2 text-zinc-400 hover:text-white hover:bg-white/5 border border-pink-500/20 rounded-lg cursor-pointer transition-all"
            title="Simulate screenshot warning detection"
          >
            <Camera className="w-4 h-4 text-pink-400" />
          </button>
        )}

        <button onClick={() => onCall('voice')} className="p-2 text-zinc-400 hover:text-white rounded-full transition-colors">
          <Phone className="w-4 h-4" />
        </button>
        <button onClick={() => onCall('video')} className="p-2 text-zinc-400 hover:text-white rounded-full transition-colors">
          <Video className="w-4 h-4" />
        </button>
        <button className="p-2 text-zinc-400 hover:text-white rounded-full transition-colors">
          <MoreVertical className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
