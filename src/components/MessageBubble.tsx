import React from 'react';
import { motion } from 'motion/react';
import { Play, Pause, Check, CheckCheck, WifiOff, Pin, Trash2, Edit, Globe, Quote, MapPin } from 'lucide-react';
import { ExtendedMessage } from '../types';
import RelativeTime from './RelativeTime';

interface MessageBubbleProps {
  key?: React.Key;
  message: ExtendedMessage;
  isMe: boolean;
  isGrouped: boolean;
  isLastInGroup: boolean;
  partnerName?: string;
  partnerAvatar?: string;
  onReply: (msg: ExtendedMessage) => void;
  onReact: (msgId: string, emoji: string) => void;
  onDelete: (msgId: string, forEveryone: boolean) => void;
  onEdit: (msg: ExtendedMessage) => void;
  onPin: (msg: ExtendedMessage) => void;
  onTranslate: (msgId: string) => void;
  searchQuery: string;
  onToggleContextMenu: (msgId: string | null) => void;
  activeContextMessageId: string | null;
  onTogglePlayVoice: (msgId: string) => void;
  onLongPress: (msgId: string, e: React.MouseEvent) => void;
  
  // Voice note extension
  playingVoiceId: string | null;
  voiceProgress: number;
  voicePlaybackSpeed: 1 | 1.25 | 1.5 | 2;
  onChangeSpeed?: (speed: 1 | 1.25 | 1.5 | 2) => void;
  onSeekVoice?: (msgId: string, progress: number) => void;
  currentUserId: string;
  onShowReactionDetails?: (msgId: string) => void;
  isPinned: boolean;
}

export default function MessageBubble({
  message,
  isMe,
  isGrouped,
  isLastInGroup,
  partnerName,
  partnerAvatar,
  onReply,
  onReact,
  onDelete,
  onEdit,
  onPin,
  onTranslate,
  searchQuery,
  onToggleContextMenu,
  activeContextMessageId,
  onTogglePlayVoice,
  onLongPress,
  playingVoiceId,
  voiceProgress,
  voicePlaybackSpeed,
  onChangeSpeed,
  onSeekVoice,
  currentUserId,
  onShowReactionDetails,
  isPinned
}: MessageBubbleProps) {
  
  const highlightMatch = (text: string, query: string) => {
    if (!query) return <span>{text}</span>;
    const parts = text.split(new RegExp(`(${query})`, 'gi'));
    return (
      <span>
        {parts.map((part, i) =>
          part.toLowerCase() === query.toLowerCase()
            ? <mark key={i} className="bg-amber-400 text-slate-950 font-semibold px-0.5 rounded">{part}</mark>
            : part
        )}
      </span>
    );
  };

  const isVoice = message.customMediaType === 'voice' || !!message.voiceDuration;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className={`flex ${isMe ? 'justify-end' : 'justify-start'} ${isGrouped ? 'mt-0.5' : 'mt-3.5'} relative group/bubble`}
      onDoubleClick={() => onReact(message.id, '❤️')}
      onContextMenu={(e) => {
        e.preventDefault();
        onLongPress(message.id, e);
      }}
    >
      <div className={`flex items-start gap-2.5 max-w-[75%] ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
        
        {/* Avatar for incoming */}
        {!isMe && !isGrouped ? (
          <img
            src={partnerAvatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100'}
            alt="Partner avatar"
            className="w-7 h-7 rounded-lg object-cover shrink-0 border border-violet-500/10 shadow-md"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className="w-7 shrink-0" />
        )}

        <div className="flex flex-col">
          {/* Display name */}
          {!isMe && !isGrouped && (
            <span className="text-[9px] font-mono text-violet-400 font-extrabold mb-0.5 flex items-center gap-1">
              <span>{partnerName}</span>
            </span>
          )}

          {/* Bubble Container */}
          <div
            className={`relative rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed ${
              isMe
                ? 'bg-gradient-to-r from-violet-600 via-[#8B5CF6] to-pink-500 text-white rounded-tr-none'
                : 'bg-[#0e0a29]/95 text-violet-100 border border-violet-500/10 rounded-tl-none'
            } ${isLastInGroup ? (isMe ? 'rounded-br-sm' : 'rounded-bl-sm') : ''} shadow-lg relative group/item`}
          >
            {/* Top row with Pin Indicator */}
            {isPinned && (
              <div className="mb-1.5 flex items-center gap-1 text-[8px] font-mono text-yellow-400 font-bold uppercase tracking-wider select-none">
                <Pin className="w-2.5 h-2.5 rotate-45 text-yellow-400 fill-current" />
                <span>Pinned Message</span>
              </div>
            )}
            {/* Context menu trigger on hover */}
            <div className={`absolute top-1.5 ${isMe ? 'left-[-40px]' : 'right-[-40px]'} opacity-0 group-hover/item:opacity-100 transition-opacity flex items-center gap-1 bg-[#09071c] border border-violet-500/20 p-1 rounded-lg shadow-xl z-10`}>
              <button 
                onClick={() => onReply(message)} 
                className="p-1 hover:bg-violet-600/30 text-violet-300 rounded cursor-pointer"
                title="Reply"
              >
                <Quote className="w-3 h-3" />
              </button>
              <button 
                onClick={() => onTranslate(message.id)} 
                className="p-1 hover:bg-violet-600/30 text-violet-300 rounded cursor-pointer"
                title="Translate"
              >
                <Globe className="w-3 h-3" />
              </button>
            </div>

            {/* Reply Quote Block */}
            {message.replyToQuote && (
              <div className="mb-2 px-2.5 py-1.5 bg-black/25 border-l-2 border-violet-500/60 rounded text-[10px] text-zinc-300 italic truncate max-w-full flex items-center gap-1">
                <span className="text-violet-400 font-bold not-italic">↳</span>
                <span>{message.replyToQuote}</span>
              </div>
            )}

            {/* Story Reply Render Block */}
            {message.customMediaType === 'story_reply' && message.customMediaData && (
              <div 
                onClick={() => {
                  window.dispatchEvent(new CustomEvent('viewStory', { 
                    detail: { 
                      storyId: message.customMediaData.storyId, 
                      creatorUsername: message.customMediaData.creatorUsername 
                    } 
                  }));
                }}
                className="mb-2 p-2 rounded-xl bg-black/40 hover:bg-black/60 border border-violet-500/15 flex gap-2.5 items-center cursor-pointer transition-all select-none group/story-preview"
                title="Click to view story"
              >
                {message.customMediaData.mediaUrl ? (
                  <img 
                    src={message.customMediaData.mediaUrl} 
                    alt="Story preview" 
                    className="w-10 h-10 rounded-lg object-cover border border-white/10 shrink-0 group-hover/story-preview:scale-105 transition-transform" 
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-tr from-violet-600 via-pink-600 to-pink-500 flex items-center justify-center text-white text-[9px] shrink-0 font-bold uppercase tracking-wider">
                    TXT
                  </div>
                )}
                <div className="min-w-0 flex-1 leading-tight text-left">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[8px] font-mono font-black text-pink-400 uppercase tracking-widest">⚡ STORY REPLY</span>
                    <span className="text-[8px] text-zinc-500 font-mono">@{message.customMediaData.creatorUsername}</span>
                  </div>
                  <p className="text-[10px] text-zinc-300 truncate mt-0.5 max-w-[200px] italic">
                    "{message.customMediaData.caption || 'Photo Story'}"
                  </p>
                </div>
              </div>
            )}

            {/* Content - Handle Voice */}
            {isVoice ? (
              <div className="flex flex-col gap-2 min-w-[240px] max-w-[320px] p-2 bg-slate-900/40 rounded-xl border border-white/5 select-none">
                <div className="flex items-center gap-3">
                  {/* Play Button */}
                  <button 
                    onClick={() => onTogglePlayVoice(message.id)}
                    className="w-9 h-9 rounded-full bg-violet-600 hover:bg-violet-500 flex items-center justify-center hover:scale-105 transition-all text-white shadow-md active:scale-95 cursor-pointer shrink-0"
                  >
                    {playingVoiceId === message.id ? <Pause className="w-4 h-4 text-white" /> : <Play className="w-4 h-4 text-white fill-current ml-0.5" />}
                  </button>

                  {/* Waveform Visualization & Seek Support */}
                  <div 
                    className="flex-1 h-8 flex items-center gap-[3px] px-1 cursor-pointer select-none group/waveform relative"
                    onClick={(e) => {
                      const rect = e.currentTarget.getBoundingClientRect();
                      const x = e.clientX - rect.left;
                      const ratio = Math.min(100, Math.max(0, (x / rect.width) * 100));
                      onSeekVoice?.(message.id, ratio);
                    }}
                  >
                    {/* Render standard 24 vertical bars for professional waveform */}
                    {Array.from({ length: 24 }).map((_, barIdx) => {
                      // Generate a predictable wave pattern based on index
                      const height = Math.abs(Math.sin(barIdx * 0.4)) * 24 + 4;
                      const barProgress = (barIdx / 24) * 100;
                      const isHighlighted = barProgress <= voiceProgress;
                      return (
                        <div 
                          key={barIdx} 
                          style={{ height: `${height}px` }} 
                          className={`w-[2.5px] rounded-full transition-all ${
                            isHighlighted 
                              ? 'bg-gradient-to-t from-violet-400 to-pink-500' 
                              : 'bg-zinc-700/80'
                          }`}
                        />
                      );
                    })}
                  </div>

                  {/* Playback Speed Control */}
                  <button 
                    onClick={() => onChangeSpeed?.(voicePlaybackSpeed)}
                    className="px-1.5 py-0.5 text-[9px] font-mono font-black uppercase rounded bg-violet-950/50 hover:bg-violet-600/30 text-violet-300 border border-violet-500/20 active:scale-95 transition-all cursor-pointer shrink-0"
                  >
                    {voicePlaybackSpeed}x
                  </button>
                </div>

                <div className="flex justify-between items-center px-1 text-[9px] text-zinc-400 font-mono">
                  <span>
                    {playingVoiceId === message.id 
                      ? `0:${String(Math.min(12, Math.floor((voiceProgress / 100) * 12))).padStart(2, '0')}` // Live playback timer
                      : '0:00'}
                  </span>
                  <span className="flex items-center gap-1">
                    <span>HD Voice</span>
                    <span className="w-1 h-1 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="text-zinc-500">{message.voiceDuration || '0:12'}</span>
                  </span>
                </div>
              </div>
            ) : message.customMediaType === 'share_post' && message.customMediaData ? (
              <div 
                className="mb-1 p-3 rounded-2xl bg-black/40 hover:bg-black/60 border border-violet-500/15 flex flex-col gap-2 cursor-pointer transition-all max-w-[280px]"
                onClick={() => {
                  window.dispatchEvent(new CustomEvent('toast', { detail: `🔍 Navigating to post by @${message.customMediaData?.creatorUsername}` }));
                }}
              >
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-full bg-violet-600 flex items-center justify-center text-[8px] font-black font-mono">
                    {message.customMediaData.creatorName?.[0] || 'P'}
                  </div>
                  <div className="flex-1 leading-none text-left">
                    <span className="text-[10px] font-sans font-black text-white">{message.customMediaData.creatorName}</span>
                    <span className="text-[8px] text-zinc-500 font-mono block">@{message.customMediaData.creatorUsername}</span>
                  </div>
                </div>
                {message.customMediaData.mediaUrl ? (
                  <img 
                    src={message.customMediaData.mediaUrl} 
                    alt="Shared post content" 
                    className="w-full h-32 rounded-xl object-cover border border-white/5" 
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-full h-24 rounded-xl bg-gradient-to-tr from-violet-900/40 via-[#100b2b] to-pink-900/25 flex items-center justify-center border border-violet-500/10">
                    <span className="text-[10px] font-mono text-violet-400">📝 No Image Preview</span>
                  </div>
                )}
                <p className="text-[10px] text-zinc-300 line-clamp-2 text-left italic">
                  "{message.customMediaData.caption || 'Shared post'}"
                </p>
                <button className="w-full py-1.5 rounded-lg bg-violet-600/30 hover:bg-violet-600/50 text-violet-200 border border-violet-500/20 text-[9px] font-mono font-bold uppercase transition-all">
                  View Shared Post
                </button>
              </div>
            ) : message.customMediaType === 'share_reel' && message.customMediaData ? (
              <div 
                className="mb-1 p-3 rounded-2xl bg-[#090518] hover:bg-[#120a2e] border border-pink-500/20 flex flex-col gap-2 cursor-pointer transition-all max-w-[240px]"
                onClick={() => {
                  window.dispatchEvent(new CustomEvent('toast', { detail: `📹 Loading immersive Reel by @${message.customMediaData?.creatorUsername}` }));
                }}
              >
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-pink-500 animate-pulse" />
                  <span className="text-[9px] font-mono font-black text-pink-400 uppercase tracking-widest">⚡ Shared Reel</span>
                </div>
                {message.customMediaData.mediaUrl ? (
                  <div className="relative rounded-xl overflow-hidden border border-white/10 aspect-3/4">
                    <img 
                      src={message.customMediaData.mediaUrl} 
                      alt="Reel content" 
                      className="w-full h-40 object-cover" 
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                      <div className="w-8 h-8 rounded-full bg-white/20 backdrop-blur-xs flex items-center justify-center">
                        <Play className="w-4 h-4 text-white fill-current ml-0.5" />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="w-full h-32 rounded-xl bg-gradient-to-tr from-pink-950/40 via-[#100b2b] to-violet-950/25 flex items-center justify-center border border-pink-500/10">
                    <Play className="w-6 h-6 text-pink-500 animate-pulse" />
                  </div>
                )}
                <p className="text-[10px] text-zinc-300 line-clamp-1 text-left">
                  @{message.customMediaData.creatorUsername}: {message.customMediaData.caption || 'Watch this reel!'}
                </p>
              </div>
            ) : message.customMediaType === 'share_profile' && message.customMediaData ? (
              <div 
                className="mb-1 p-3 rounded-2xl bg-[#0b0825] hover:bg-[#130f3c] border border-violet-500/15 flex flex-col gap-3 items-center cursor-pointer transition-all max-w-[240px]"
                onClick={() => {
                  window.dispatchEvent(new CustomEvent('toast', { detail: `👤 Viewing profile for @${message.customMediaData?.username}` }));
                }}
              >
                <div className="text-center">
                  <img 
                    src={message.customMediaData.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100'} 
                    alt={message.customMediaData.name} 
                    className="w-12 h-12 rounded-full border-2 border-violet-500/30 object-cover mx-auto" 
                    referrerPolicy="no-referrer"
                  />
                  <h4 className="text-xs font-sans font-black text-white mt-2 leading-none">{message.customMediaData.name}</h4>
                  <span className="text-[9px] text-zinc-500 font-mono font-semibold">@{message.customMediaData.username}</span>
                </div>
                <p className="text-[9.5px] text-zinc-300 text-center line-clamp-2 italic">
                  "{message.customMediaData.bio || 'Digital pioneer.'}"
                </p>
                <button className="w-full py-1.5 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-[9px] font-mono font-bold uppercase transition-all shadow-md">
                  View Profile
                </button>
              </div>
            ) : message.customMediaType === 'share_location' && message.customMediaData ? (
              <div 
                className="mb-1 p-3 rounded-2xl bg-zinc-950 hover:bg-zinc-900 border border-violet-500/15 flex flex-col gap-2 cursor-pointer transition-all max-w-[240px]"
                onClick={() => {
                  window.dispatchEvent(new CustomEvent('toast', { detail: `📍 Opening ${message.customMediaData?.locationName} in Maps` }));
                }}
              >
                <div className="flex items-center gap-1.5">
                  <div className="p-1 rounded bg-violet-500/20 text-violet-400">
                    <MapPin className="w-3.5 h-3.5" />
                  </div>
                  <div className="text-left leading-none">
                    <h4 className="text-xs font-sans font-black text-white">{message.customMediaData.locationName}</h4>
                    <span className="text-[8px] text-zinc-500 font-mono mt-0.5 block">{message.customMediaData.address}</span>
                  </div>
                </div>
                <div className="w-full h-20 rounded-xl bg-violet-950/20 border border-violet-500/10 flex flex-col items-center justify-center relative overflow-hidden select-none">
                  <div className="absolute inset-0 opacity-10 bg-[linear-gradient(to_right,#808080_1px,transparent_1px),linear-gradient(to_bottom,#808080_1px,transparent_1px)] bg-[size:10px_10px]" />
                  <div className="w-2.5 h-2.5 rounded-full bg-pink-500 animate-ping absolute" />
                  <div className="w-2 h-2 rounded-full bg-pink-500 absolute" />
                  <span className="text-[8px] font-mono text-violet-400 mt-6 z-10 font-bold uppercase tracking-widest">
                    GPS LOCKED: {message.customMediaData.latitude}, {message.customMediaData.longitude}
                  </span>
                </div>
              </div>
            ) : (
              <p className="break-words select-text font-sans">
                {highlightMatch(message.content, searchQuery)}
              </p>
            )}

            {/* Translation render block */}
            {message.translation && (
              <div className="mt-2 pt-2 border-t border-white/10 text-[10px] text-violet-300 italic bg-violet-950/20 p-1.5 rounded-lg">
                <span className="text-[8px] font-mono uppercase bg-violet-500/20 px-1 rounded mr-1">Translated</span>
                {message.translation}
              </div>
            )}

            {/* Reactions Block */}
            {message.reactions && message.reactions.length > 0 && (
              <div 
                onClick={(e) => {
                  e.stopPropagation();
                  onShowReactionDetails?.(message.id);
                }}
                className={`flex flex-wrap items-center gap-1.5 mt-2 ${isMe ? 'justify-end' : 'justify-start'} group/reacts bg-black/15 hover:bg-black/30 p-1 rounded-xl transition-all cursor-pointer`}
              >
                {message.reactions.map(r => {
                  const userReacted = r.userIds.includes(currentUserId);
                  return (
                    <div 
                      key={r.emoji} 
                      onClick={(e) => {
                        e.stopPropagation();
                        onReact(message.id, r.emoji);
                      }}
                      className={`px-2 py-0.5 rounded-full text-[11px] font-sans flex items-center gap-1 border transition-all cursor-pointer select-none active:scale-90 ${
                        userReacted 
                          ? 'bg-violet-600/30 border-violet-500/50 text-white shadow-inner font-bold' 
                          : 'bg-slate-900/80 border-white/5 hover:border-violet-500/25 text-zinc-300'
                      }`}
                    >
                      <span className="transform hover:scale-125 transition-transform">{r.emoji}</span> 
                      <span className="text-[10px] opacity-80">{r.userIds.length}</span>
                    </div>
                  );
                })}
                <span className="text-[8.5px] font-mono text-violet-400/70 opacity-0 group-hover/reacts:opacity-100 transition-all px-1">Details</span>
              </div>
            )}

            {/* Bottom detail row */}
            <div className="flex items-center justify-end gap-1 mt-1 text-[8.5px] opacity-75 font-mono select-none">
              {message.isEdited && <span className="opacity-40 italic text-[7.5px] mr-1">edited</span>}
              <span className="opacity-60"><RelativeTime timestamp={message.timestamp} /></span>
              {isMe && (
                <div className="flex items-center">
                  {message.isOfflineUnsent ? (
                    <WifiOff className="w-3 h-3 text-orange-400" />
                  ) : message.status === 'sent' ? (
                    <Check className="w-3 h-3 text-white/40" />
                  ) : (
                    <CheckCheck className={`w-3 h-3 ${message.status === 'read' ? 'text-cyan-300' : 'text-white/50'}`} />
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
