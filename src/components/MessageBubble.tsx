import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { Play, Pause, Check, CheckCheck, Pin, Trash2, Edit, Globe, Quote, MapPin, FileText, Download, Loader2, Copy, Info, Star, CheckSquare, X } from 'lucide-react';
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
  onRetry?: (msg: ExtendedMessage) => void;
  onReact: (msgId: string, emoji: string) => void;
  onDelete: (msgId: string, forEveryone: boolean) => void;
  onEdit: (msg: ExtendedMessage) => void;
  onPin: (msg: ExtendedMessage) => void;
  onTranslate: (msgId: string) => void;
  searchQuery: string;
  onToggleContextMenu: (msgId: string | null) => void;
  activeContextMessageId: string | null;
  onTogglePlayVoice: (msgId: string) => void;
  onResolveVoiceMedia: (storagePath: string) => Promise<string>;
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
  groupReadCount?: number;
  groupRecipientCount?: number;
  onStar?: (msg: ExtendedMessage) => void;
  onSelectMessage?: (msg: ExtendedMessage) => void;
  onJumpToReply?: (messageId: string) => void;
}

export default function MessageBubble({
  message,
  isMe,
  isGrouped,
  isLastInGroup,
  partnerName,
  partnerAvatar,
  onReply,
  onRetry,
  onReact,
  onDelete,
  onEdit,
  onPin,
  onTranslate,
  searchQuery,
  onToggleContextMenu,
  activeContextMessageId,
  onTogglePlayVoice,
  onResolveVoiceMedia,
  onLongPress,
  playingVoiceId,
  voiceProgress,
  voicePlaybackSpeed,
  onChangeSpeed,
  onSeekVoice,
  currentUserId,
  onShowReactionDetails,
  isPinned,
  groupReadCount = 0,
  groupRecipientCount = 0,
  onStar,
  onSelectMessage,
  onJumpToReply,
}: MessageBubbleProps) {
  const [privateVoiceUrl, setPrivateVoiceUrl] = useState('');
  const [loadingPrivateVoice, setLoadingPrivateVoice] = useState(false);
  const [privateVoiceError, setPrivateVoiceError] = useState('');
  const [privateMediaUrl, setPrivateMediaUrl] = useState('');
  const [loadingPrivateMedia, setLoadingPrivateMedia] = useState(false);
  const [privateMediaError, setPrivateMediaError] = useState('');
  const [showMessageInfo, setShowMessageInfo] = useState(false);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const clearLongPress = () => { if (longPressTimer.current) clearTimeout(longPressTimer.current); longPressTimer.current = null; };
  useEffect(() => () => clearLongPress(), []);
  const copyMessage = async () => {
    try { await navigator.clipboard.writeText(message.customMediaData?.emoji || message.content || message.fileName || ''); window.dispatchEvent(new CustomEvent('toast', { detail: 'Message copied.' })); }
    catch { window.dispatchEvent(new CustomEvent('toast', { detail: 'Could not copy this message on this device.' })); }
    onToggleContextMenu(null);
  };
  const attemptedMediaPathRef = useRef('');
  useEffect(() => () => {
    if (privateVoiceUrl) URL.revokeObjectURL(privateVoiceUrl);
  }, [privateVoiceUrl]);
  useEffect(() => () => { if (privateMediaUrl) URL.revokeObjectURL(privateMediaUrl); }, [privateMediaUrl]);
  const mediaPreviewRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const path = message.mediaStoragePath || '';
    const target = mediaPreviewRef.current;
    if (!(message.mediaType === 'image' || message.mediaType === 'video') || !path || !target || attemptedMediaPathRef.current === path) return;
    let active = true;
    const loadVisibleImage = () => {
      if (!active || attemptedMediaPathRef.current === path) return;
      attemptedMediaPathRef.current = path;
      setLoadingPrivateMedia(true);
      void onResolveVoiceMedia(path).then(url => {
        if (active) setPrivateMediaUrl(url); else URL.revokeObjectURL(url);
      }).catch(() => { if (active) setPrivateMediaError('Image unavailable. Tap to retry.'); })
        .finally(() => { if (active) setLoadingPrivateMedia(false); });
    };
    if (typeof IntersectionObserver === 'undefined') {
      loadVisibleImage();
      return () => { active = false; };
    }
    const observer = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) {
        observer.disconnect();
        loadVisibleImage();
      }
    }, { rootMargin: '240px' });
    observer.observe(target);
    return () => { active = false; observer.disconnect(); };
  }, [message.mediaStoragePath, message.mediaType, onResolveVoiceMedia]);
  const loadPrivateMedia = async () => {
    if (!message.mediaStoragePath || loadingPrivateMedia) return;
    setLoadingPrivateMedia(true); setPrivateMediaError('');
    try { setPrivateMediaUrl(await onResolveVoiceMedia(message.mediaStoragePath)); }
    catch { setPrivateMediaError('This attachment is unavailable or access has expired.'); }
    finally { setLoadingPrivateMedia(false); }
  };
  
  const highlightMatch = (text: string, query: string) => {
    if (!query) return <span>{text}</span>;
    const escapedQuery = query.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\\\    const parts = text.split(new RegExp(`(${query})`, 'gi'));');
    const parts = text.split(new RegExp(`(${escapedQuery})`, 'gi'));
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
  const voiceStoragePath = message.voiceAudioUrl || message.videoUrl || message.mediaStoragePath || '';

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      data-message-id={message.id}
      className={`flex ${isMe ? 'justify-end' : 'justify-start'} ${isGrouped ? 'mt-0.25' : 'mt-2'} relative group/bubble`}
      drag="x"
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.12}
      onDragEnd={(_event, info) => {
        const threshold = 72;
        if ((!isMe && info.offset.x > threshold) || (isMe && info.offset.x < -threshold)) onReply(message);
      }}
      onTouchStart={() => {
        clearLongPress();
        longPressTimer.current = setTimeout(() => {
          onToggleContextMenu(message.id);
          onLongPress(message.id, {} as React.MouseEvent);
        }, 520);
      }}
      onTouchEnd={clearLongPress}
      onTouchMove={clearLongPress}
      onTouchCancel={clearLongPress}
      onDoubleClick={() => onReact(message.id, '❤️')}
      onContextMenu={(e) => {
        e.preventDefault();
        onToggleContextMenu(message.id);
        onLongPress(message.id, e);
      }}
    >
      <div className={`flex items-start gap-2 max-w-[85%] ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
        
        {/* Avatar for incoming */}
        {!isMe && !isGrouped ? (
          <img
            src={partnerAvatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100'}
            alt="Partner avatar"
            className="w-7 h-7 rounded-lg object-cover shrink-0 border border-white/10 shadow-md"
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
                : 'bg-[#0e0a29]/95 text-violet-100 border border-white/10 rounded-tl-none'
            } ${isLastInGroup ? (isMe ? 'rounded-br-sm' : 'rounded-bl-sm') : ''} shadow-lg relative group/item`}
          >
            {/* Top row with Pin Indicator */}
            {(isPinned || message.isStarred) && (
              <div className="mb-1.5 flex items-center gap-1 text-[8px] font-mono font-bold uppercase tracking-wider text-yellow-300 select-none">
                {isPinned && <><Pin className="h-2.5 w-2.5 rotate-45 fill-current" /><span>Pinned</span></>}
                {message.isStarred && <><Star className="ml-1 h-2.5 w-2.5 fill-current"/><span>Starred</span></>}
              </div>
            )}
            {/* Context menu trigger on hover */}
            <div className={`absolute top-1.5 ${isMe ? 'left-[-40px]' : 'right-[-40px]'} opacity-0 group-hover/item:opacity-100 transition-opacity flex items-center gap-1 bg-[#09071c] border border-white/10 p-1 rounded-lg shadow-md z-10`}>
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
              <button type="button" onClick={() => message.replyToMessageId && onJumpToReply?.(message.replyToMessageId)} className="mb-2 flex max-w-full items-center gap-1 truncate rounded border-l-2 border-violet-400/60 bg-black/25 px-2.5 py-1.5 text-left text-[10px] italic text-zinc-300 hover:bg-black/40">
                <span className="font-bold not-italic text-violet-400">↳</span>
                <span className="truncate">{message.replyToQuote}</span>
              </button>
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
                className="mb-2 p-2 rounded-xl bg-black/40 hover:bg-black/60 border border-white/10 flex gap-2.5 items-center cursor-pointer transition-all select-none group/story-preview"
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
              voiceStoragePath ? (
                <div className="min-w-[240px] max-w-[320px] rounded-xl border border-white/10 bg-black/25 p-2">
                  <p className="mb-1 text-[10px] font-medium text-[var(--nx-muted)]">Voice message{message.voiceDuration ? ` · ${message.voiceDuration}` : ''}</p>
                  {voiceStoragePath.startsWith('chats/') && !privateVoiceUrl ? (
                    <button type="button" disabled={loadingPrivateVoice} onClick={async () => {
                      setLoadingPrivateVoice(true);
                      setPrivateVoiceError('');
                      try { setPrivateVoiceUrl(await onResolveVoiceMedia(voiceStoragePath)); }
                      catch (error) { setPrivateVoiceError(error instanceof Error ? error.message : 'Voice note unavailable.'); }
                      finally { setLoadingPrivateVoice(false); }
                    }} className="min-h-11 rounded-lg border border-white/10 px-3 text-xs text-violet-200 disabled:opacity-60">
                      {loadingPrivateVoice ? 'Loading securely…' : 'Load private voice note'}
                    </button>
                  ) : (
                    <audio className="w-full" controls preload="none" src={privateVoiceUrl || (voiceStoragePath.startsWith('chats/') ? '' : voiceStoragePath)} aria-label="Play voice message">
                      Your browser does not support audio playback.
                    </audio>
                  )}
                  {privateVoiceError && <p role="status" className="mt-1 text-[10px] text-rose-300">{privateVoiceError}</p>}
                </div>
              ) : (
                <p className="rounded-lg border border-[var(--nx-edge)] bg-black/20 px-3 py-2 text-xs text-[var(--nx-muted)]">This older voice message has no stored audio file.</p>
              )
            ) : message.customMediaType === 'sticker' && message.customMediaData?.emoji ? (
              <div className="my-1 flex min-h-28 min-w-28 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500/15 via-indigo-950/35 to-fuchsia-500/10 p-4" role="img" aria-label={message.customMediaData.label || 'Sticker'}>
                <span className="select-none text-7xl drop-shadow-[0_5px_12px_rgba(0,0,0,0.35)]">{message.customMediaData.emoji}</span>
              </div>
            ) : message.mediaStoragePath && message.mediaType ? (
              <div ref={mediaPreviewRef} className="mb-1 w-full min-w-[220px] max-w-[320px] overflow-hidden rounded-xl border border-white/10 bg-black/25">
                {message.mediaType === 'image' ? (
                  privateMediaUrl
                    ? <a href={privateMediaUrl} target="_blank" rel="noreferrer"><img src={privateMediaUrl} alt={message.fileName || 'Shared image'} className="max-h-[420px] w-full object-contain" loading="lazy" /></a>
                    : <button type="button" onClick={() => void loadPrivateMedia()} className="flex min-h-28 w-full flex-col items-center justify-center gap-2 p-4 text-xs text-violet-200"><span>{loadingPrivateMedia ? 'Loading private media…' : 'Tap to load photo'}</span>{privateMediaError && <span role="status" className="text-rose-300">{privateMediaError}</span>}</button>
                ) : message.mediaType === 'video' ? (
                  privateMediaUrl
                    ? <video controls playsInline preload="auto" src={privateMediaUrl} className="max-h-[420px] w-full bg-black" aria-label={message.fileName || 'Shared video'} />
                    : <button type="button" onClick={() => void loadPrivateMedia()} className="flex min-h-28 w-full flex-col items-center justify-center gap-2 p-4 text-xs text-violet-200"><Play className="h-7 w-7"/>{loadingPrivateMedia ? 'Loading private video…' : 'Tap to load video'}{privateMediaError && <span role="status" className="text-rose-300">{privateMediaError}</span>}</button>
                ) : message.mediaType === 'audio' ? (
                  privateMediaUrl
                    ? <audio controls preload="none" src={privateMediaUrl} className="w-full p-2" aria-label={message.fileName || 'Shared audio'} />
                    : <button type="button" onClick={() => void loadPrivateMedia()} className="flex min-h-16 w-full items-center gap-3 p-3 text-left text-xs text-violet-100"><Play className="h-6 w-6"/><span className="min-w-0 flex-1 truncate">{message.fileName || 'Audio file'}<small className="block text-[10px] text-white/45">{loadingPrivateMedia ? 'Loading securely…' : 'Tap to play'}</small></span></button>
                ) : (
                  <div className="flex items-center gap-3 p-3">
                    <FileText className="h-7 w-7 shrink-0 text-violet-300"/>
                    <span className="min-w-0 flex-1 truncate text-xs text-white">{message.fileName || 'Document'}<small className="block text-[10px] text-white/45">{message.fileSize || 'Private attachment'}</small></span>
                    {privateMediaUrl
                      ? <a href={privateMediaUrl} download={message.fileName || 'attachment'} aria-label="Download attachment" className="rounded-lg bg-violet-600 p-2 text-white"><Download className="h-4 w-4"/></a>
                      : <button type="button" disabled={loadingPrivateMedia} onClick={() => void loadPrivateMedia()} aria-label="Download attachment" className="rounded-lg bg-violet-600 p-2 text-white disabled:opacity-50">{loadingPrivateMedia ? <Loader2 className="h-4 w-4 animate-spin"/> : <Download className="h-4 w-4"/>}</button>}
                  </div>
                )}
              </div>
            ) : message.customMediaType === 'share_post' && message.customMediaData ? (
              <div 
                className="mb-1 p-3 rounded-2xl bg-black/40 hover:bg-black/60 border border-white/10 flex flex-col gap-2 cursor-pointer transition-all max-w-[280px]"
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
                  <div className="w-full h-24 rounded-xl bg-gradient-to-tr from-violet-900/40 via-[#100b2b] to-pink-900/25 flex items-center justify-center border border-white/10">
                    <span className="text-[10px] font-mono text-violet-400">📝 No Image Preview</span>
                  </div>
                )}
                <p className="text-[10px] text-zinc-300 line-clamp-2 text-left italic">
                  "{message.customMediaData.caption || 'Shared post'}"
                </p>
                <button className="w-full py-1.5 rounded-lg bg-violet-600/30 hover:bg-violet-600/50 text-violet-200 border border-white/10 text-[9px] font-mono font-bold uppercase transition-all">
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
                className="mb-1 p-3 rounded-2xl bg-[#0b0825] hover:bg-[#130f3c] border border-white/10 flex flex-col gap-3 items-center cursor-pointer transition-all max-w-[240px]"
                onClick={() => {
                  window.dispatchEvent(new CustomEvent('toast', { detail: `👤 Viewing profile for @${message.customMediaData?.username}` }));
                }}
              >
                <div className="text-center">
                  <img 
                    src={message.customMediaData.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100'} 
                    alt={message.customMediaData.name} 
                    className="w-12 h-12 rounded-full border-2 border-white/10 object-cover mx-auto" 
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
                className="mb-1 p-3 rounded-2xl bg-zinc-950 hover:bg-zinc-900 border border-white/10 flex flex-col gap-2 cursor-pointer transition-all max-w-[240px]"
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
                <div className="w-full h-20 rounded-xl bg-violet-950/20 border border-white/10 flex flex-col items-center justify-center relative overflow-hidden select-none">
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
                          ? 'bg-violet-600/30 border-white/10 text-white shadow-inner font-bold' 
                          : 'bg-slate-900/80 border-white/5 hover:border-white/10 text-zinc-300'
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
                  {message.isOfflineUnsent || message.status === 'failed' ? (
                    <button type="button" onClick={() => onRetry?.(message)} className="ml-1 rounded-md border border-orange-300/20 bg-orange-400/10 px-1.5 py-0.5 text-[8px] font-bold text-orange-200">Retry</button>
                  ) : message.status === 'sending' ? (
                    <Check className="w-3 h-3 text-white/30 animate-pulse" />
                  ) : message.status === 'sent' ? (
                    <Check className="w-3 h-3 text-white/40" />
                  ) : (
                    <CheckCheck className={`w-3 h-3 ${message.status === 'read' ? 'text-violet-300' : 'text-white/50'}`} />
                  )}
                </div>
              )}
              {isMe && groupRecipientCount > 0 && message.status !== 'failed' && (
                <span className="ml-1 text-[8px] text-white/45" title="Group members who have read this message">
                  {groupReadCount}/{groupRecipientCount} read
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
      {activeContextMessageId === message.id && (
        <div className={`absolute z-30 ${isMe ? 'right-3' : 'left-12'} top-full mt-2 w-[min(310px,calc(100vw-5rem))] rounded-2xl border border-violet-300/15 bg-[#0b0920] p-2 shadow-2xl`} role="menu" aria-label="Message actions">
          <div className="grid grid-cols-4 gap-1">
            <button type="button" role="menuitem" onClick={() => onReply(message)} className="flex min-h-14 flex-col items-center justify-center gap-1 rounded-xl text-violet-200 hover:bg-violet-500/15"><Quote className="h-4 w-4"/><span className="text-[10px]">Reply</span></button>
            <button type="button" role="menuitem" onClick={() => void copyMessage()} className="flex min-h-14 flex-col items-center justify-center gap-1 rounded-xl text-violet-200 hover:bg-violet-500/15"><Copy className="h-4 w-4"/><span className="text-[10px]">Copy</span></button>
            <button type="button" role="menuitem" onClick={() => { onReact(message.id, '❤️'); onToggleContextMenu(null); }} className="flex min-h-14 flex-col items-center justify-center gap-1 rounded-xl text-violet-200 hover:bg-violet-500/15"><span className="text-lg">❤️</span><span className="text-[10px]">React</span></button>
            <button type="button" role="menuitem" onClick={() => { onStar?.(message); onToggleContextMenu(null); }} className="flex min-h-14 flex-col items-center justify-center gap-1 rounded-xl text-violet-200 hover:bg-violet-500/15"><Star className="h-4 w-4"/><span className="text-[10px]">{message.isStarred ? 'Unstar' : 'Star'}</span></button>
            {isMe && !message.mediaStoragePath && message.customMediaType !== 'sticker' && <button type="button" role="menuitem" onClick={() => { onEdit(message); onToggleContextMenu(null); }} className="flex min-h-14 flex-col items-center justify-center gap-1 rounded-xl text-violet-200 hover:bg-violet-500/15"><Edit className="h-4 w-4"/><span className="text-[10px]">Edit</span></button>}
            <button type="button" role="menuitem" onClick={() => { onPin(message); onToggleContextMenu(null); }} className="flex min-h-14 flex-col items-center justify-center gap-1 rounded-xl text-violet-200 hover:bg-violet-500/15"><Pin className="h-4 w-4"/><span className="text-[10px]">{isPinned ? 'Unpin' : 'Pin'}</span></button>
            <button type="button" role="menuitem" onClick={() => setShowMessageInfo(value => !value)} className="flex min-h-14 flex-col items-center justify-center gap-1 rounded-xl text-violet-200 hover:bg-violet-500/15"><Info className="h-4 w-4"/><span className="text-[10px]">Info</span></button>
            <button type="button" role="menuitem" onClick={() => { onSelectMessage?.(message); onToggleContextMenu(null); }} className="flex min-h-14 flex-col items-center justify-center gap-1 rounded-xl text-violet-200 hover:bg-violet-500/15"><CheckSquare className="h-4 w-4"/><span className="text-[10px]">Select</span></button>
            {isMe && <button type="button" role="menuitem" onClick={() => { onDelete(message.id, true); onToggleContextMenu(null); }} className="flex min-h-14 flex-col items-center justify-center gap-1 rounded-xl text-rose-300 hover:bg-rose-500/10"><Trash2 className="h-4 w-4"/><span className="text-[10px]">Delete</span></button>}
          </div>
          {showMessageInfo && (
            <div className="mt-2 rounded-xl border border-white/10 bg-black/25 p-3 text-[11px] text-zinc-300">
              <div className="flex items-center justify-between"><span>Delivery status</span><strong className="capitalize text-violet-200">{message.status}</strong></div>
              {isMe && <div className="mt-1 flex items-center justify-between"><span>Read receipts</span><strong className="text-violet-200">{groupReadCount > 0 ? `${groupReadCount}/${groupRecipientCount} read` : message.status === 'read' ? 'Read' : 'Not read yet'}</strong></div>}
              <div className="mt-1 text-zinc-500">Sent {new Date(message.timestamp).toLocaleString()}</div>
            </div>
          )}
          <button type="button" onClick={() => { setShowMessageInfo(false); onToggleContextMenu(null); }} className="mt-1 flex min-h-9 w-full items-center justify-center gap-1 rounded-lg text-[11px] text-zinc-400 hover:bg-white/5"><X className="h-3 w-3"/>Close</button>
        </div>
      )}
    </motion.div>
  );
}
