import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Zap, MessageSquare, Send, Bookmark, MoreVertical, Check, Music, Search, Edit3, Archive, Trash, UserPlus, EyeOff, Download, ImageOff } from 'lucide-react';
import VideoBottomSheet from './VideoBottomSheet';
import { resolveMediaUrl } from '../utils/indexedDbStorage';
import NexoraWatermark from './branding/NexoraWatermark';

interface Post {
  id: string;
  username: string;
  name: string;
  avatar: string;
  content: string;
  image?: string;
  images?: string[];
  imageFilter?: string;
  imageFilters?: string[];
  likes: number;
  comments: any[];
  tags: string[];
  userId?: string;
  bookmarksCount?: number;
  shares?: number;
  saves?: number;
  searchSuggestion?: string;
  isLikedByUser?: boolean;
  isVerified?: boolean;
  isArchived?: boolean;
  location?: string;
  soundTitle?: string;
}

interface NexoraImagePlayerProps {
  post: Post;
  image?: string;
  images?: string[];
  onSpark: () => void;
  isProcessing?: boolean;
  isFollowing?: boolean;
  onToggleFollow?: () => void;
  onCommentToggle?: () => void;
  isCommentsOpen?: boolean;
  onNotInterested?: () => void;
  onViewProfile?: (userId: string) => void;
  onViewSound?: (soundId: string) => void;
}

const VerificationBadge = () => (
  <div className="w-4 h-4 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center border border-white/10 shadow-lg ml-1 shrink-0">
    <Check className="w-2.5 h-2.5 text-white" />
  </div>
);

export default function NexoraImagePlayer({
  post,
  image,
  images,
  onSpark,
  isProcessing = false,
  isFollowing = false,
  onToggleFollow,
  onCommentToggle,
  onNotInterested,
  onViewProfile,
  onViewSound
}: NexoraImagePlayerProps) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isExpanded, setIsExpanded] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [showShareSheet, setShowShareSheet] = useState(false);
  const [downloadingState, setDownloadingState] = useState<string | null>(null);
  const [isResolvingMedia, setIsResolvingMedia] = useState(true);
  const [isImageLoading, setIsImageLoading] = useState(true);
  const [hasImageLoadError, setHasImageLoadError] = useState(false);

  const handleDownloadWatermarkedImage = async () => {
    const imgSrc = displayImages[currentImageIndex];
    if (!imgSrc) return;

    setDownloadingState('Preparing download...');
    window.dispatchEvent(new CustomEvent('toast', { detail: '📥 Preparing watermarked image download...' }));

    try {
      setTimeout(() => setDownloadingState('Applying Nexora branding...'), 400);

      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.src = imgSrc;

      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
      });

      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth || 1080;
      canvas.height = img.naturalHeight || 1080;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Canvas 2D context unavailable');

      ctx.drawImage(img, 0, 0);

      setDownloadingState('Applying Nexora branding...');

      const padding = Math.round(canvas.width * 0.035);
      const wmWidth = Math.round(canvas.width * 0.32);
      const wmHeight = Math.round(canvas.height * 0.08);
      const x = canvas.width - wmWidth - padding;
      const y = canvas.height - wmHeight - padding;

      ctx.save();
      ctx.fillStyle = 'rgba(12, 10, 33, 0.82)';
      ctx.shadowColor = 'rgba(0,0,0,0.6)';
      ctx.shadowBlur = 16;
      ctx.shadowOffsetY = 6;
      ctx.beginPath();
      ctx.roundRect(x, y, wmWidth, wmHeight, 24);
      ctx.fill();
      ctx.restore();

      ctx.save();
      ctx.strokeStyle = 'rgba(255,255,255,0.18)';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.restore();

      ctx.save();
      const fontSize = Math.max(16, Math.round(canvas.width * 0.022));
      ctx.font = `bold ${fontSize}px sans-serif`;
      
      const badgeSize = Math.round(wmHeight * 0.6);
      const badgeX = x + padding;
      const badgeY = y + (wmHeight - badgeSize) / 2;
      
      const grad = ctx.createLinearGradient(badgeX, badgeY, badgeX + badgeSize, badgeY + badgeSize);
      grad.addColorStop(0, '#8B5CF6');
      grad.addColorStop(1, '#3B82F6');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.roundRect(badgeX, badgeY, badgeSize, badgeSize, badgeSize / 2);
      ctx.fill();

      ctx.fillStyle = '#FFFFFF';
      ctx.font = `900 ${Math.round(badgeSize * 0.65)}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('N', badgeX + badgeSize / 2, badgeY + badgeSize / 2);

      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#FFFFFF';
      ctx.font = `bold ${Math.round(fontSize * 0.95)}px sans-serif`;
      const textX = badgeX + badgeSize + 12;
      const usernameText = `@${post.username}`;
      ctx.fillText(usernameText, textX, y + wmHeight / 2 - 4);

      if (post.isVerified) {
        const textWidth = ctx.measureText(usernameText).width;
        const tickX = textX + textWidth + 8;
        const tickY = y + wmHeight / 2 - 6;
        ctx.fillStyle = '#8B5CF6';
        ctx.beginPath();
        ctx.arc(tickX + 6, tickY, 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#FFFFFF';
        ctx.font = `bold 10px sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillText('✓', tickX + 6, tickY);
      }

      ctx.fillStyle = '#C4B5FD';
      ctx.font = `800 ${Math.round(fontSize * 0.6)}px monospace`;
      ctx.fillText('NEXORA', textX, y + wmHeight / 2 + 12);

      ctx.restore();

      setDownloadingState('Downloading...');
      const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
      const link = document.createElement('a');
      link.href = dataUrl;
      const safeUsername = (post.username || 'user').replace(/[^a-zA-Z0-9_]/g, '');
      const dateStr = new Date().toISOString().slice(0, 10);
      link.download = `nexora-${safeUsername}-${dateStr}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setDownloadingState(null);
      window.dispatchEvent(new CustomEvent('toast', { detail: '✨ Watermarked image downloaded successfully!' }));
    } catch (err) {
      console.error('Image download export error:', err);
      setDownloadingState(null);
      const link = document.createElement('a');
      link.href = imgSrc;
      link.target = '_blank';
      link.download = `nexora_${post.id}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.dispatchEvent(new CustomEvent('toast', { detail: '✅ Image downloaded successfully.' }));
    }
  };

  const [savedCollectionForThis, setSavedCollectionForThis] = useState<string | null>(() => {
    try {
      return localStorage.getItem(`nexora_saved_mapping_${post.id}`) || null;
    } catch {
      return null;
    }
  });

  const currentUser = (() => {
    try {
      const u = localStorage.getItem('nexora_user');
      return u ? JSON.parse(u) : null;
    } catch {
      return null;
    }
  })();
  
  const rawImages = images && images.length > 0 ? images : (image ? [image] : []);
  const [displayImages, setDisplayImages] = useState<string[]>([]);
  
  useEffect(() => {
    let active = true;
    setIsResolvingMedia(true);
    setHasImageLoadError(false);
    setIsImageLoading(true);
    Promise.all(rawImages.map(url => resolveMediaUrl(url)))
      .then(resolved => {
        if (active) {
          setDisplayImages(resolved.filter(Boolean) as string[]);
          setIsResolvingMedia(false);
        }
      })
      .catch(() => {
        if (active) {
          setDisplayImages([]);
          setIsResolvingMedia(false);
          setIsImageLoading(false);
        }
      });
    return () => { active = false; };
  }, [rawImages.join(',')]);

  useEffect(() => {
    setIsImageLoading(true);
    setHasImageLoadError(false);
  }, [currentImageIndex, displayImages]);

  const isOwnPost = currentUser && (post.userId === currentUser.id || post.username === currentUser.username);


  return (
    <div className="relative w-full overflow-hidden bg-black aspect-square sm:aspect-[4/3] md:aspect-[16/10] max-h-[580px] select-none group">
      {/* Background Image Display */}
      <div className="w-full h-full relative overflow-hidden bg-[#080612] flex items-center justify-center">
        {isResolvingMedia ? (
          <div role="status" aria-live="polite" className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-gradient-to-br from-[#15102a] via-[#080612] to-[#1c0b20] p-6 text-center">
            <span className="w-8 h-8 rounded-full border-2 border-violet-400 border-t-transparent animate-spin" aria-hidden="true" />
            <span className="text-xs font-medium text-zinc-300">Loading media…</span>
          </div>
        ) : displayImages[currentImageIndex] ? (
          <>
            <img loading="lazy"
              src={displayImages[currentImageIndex]}
              alt={post.content || 'Post media'}
              aria-hidden={hasImageLoadError}
              onLoad={() => { setIsImageLoading(false); setHasImageLoadError(false); }}
              onError={() => { setIsImageLoading(false); setHasImageLoadError(true); }}
              className={`w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.01] ${hasImageLoadError ? 'opacity-0' : ''}`}
              referrerPolicy="no-referrer"
              style={{ filter: (post.imageFilters && post.imageFilters[currentImageIndex]) || post.imageFilter || 'none' }}
            />
            {isImageLoading && !hasImageLoadError && (
              <div role="status" aria-live="polite" className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-gradient-to-br from-[#15102a] via-[#080612] to-[#1c0b20] p-6 text-center">
                <span className="w-8 h-8 rounded-full border-2 border-violet-400 border-t-transparent animate-spin" aria-hidden="true" />
                <span className="text-xs font-medium text-zinc-300">Loading media…</span>
              </div>
            )}
            {hasImageLoadError && (
              <div role="status" aria-live="polite" className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 bg-gradient-to-br from-[#15102a] via-[#080612] to-[#1c0b20] p-6 text-center">
                <div className="w-12 h-12 rounded-2xl bg-violet-500/10 border border-violet-400/20 flex items-center justify-center">
                  <ImageOff className="w-6 h-6 text-violet-300" aria-hidden="true" />
                </div>
                <p className="text-sm font-bold text-white">Media unavailable</p>
                <p className="text-xs text-zinc-400 max-w-xs">This image could not be loaded. The post caption and actions are still available.</p>
              </div>
            )}
          </>
        ) : (
          <div role="status" aria-live="polite" className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-gradient-to-br from-[#15102a] via-[#080612] to-[#1c0b20] p-6 text-center">
            <div className="w-12 h-12 rounded-2xl bg-violet-500/10 border border-violet-400/20 flex items-center justify-center">
              <ImageOff className="w-6 h-6 text-violet-300" aria-hidden="true" />
            </div>
            <p className="text-sm font-bold text-white">Media unavailable</p>
            <p className="text-xs text-zinc-400 max-w-xs">This image could not be loaded. The post caption and actions are still available.</p>
          </div>
        )}
        {/* Subtle top and bottom dark gradient overlays for legibility */}
        <div className="absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-black/80 via-black/40 to-transparent pointer-events-none z-10" />
        <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-black/90 via-black/50 to-transparent pointer-events-none z-10" />
      </div>

      {/* Carousel navigation controls if multiple images */}
      {displayImages.length > 1 && (
        <>
          <div className="absolute top-4 right-4 z-20 bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-full text-[10px] font-mono text-white font-bold border border-white/10 shadow-lg">
            {currentImageIndex + 1} / {displayImages.length}
          </div>
          {currentImageIndex > 0 && (
            <button
              onClick={(e) => { e.stopPropagation(); setCurrentImageIndex(prev => prev - 1); }}
              className="absolute left-3 top-1/2 -translate-y-1/2 z-20 w-8 h-8 rounded-full bg-black/50 hover:bg-black/80 backdrop-blur-md border border-white/20 text-white flex items-center justify-center transition-all cursor-pointer shadow-lg active:scale-90"
            >
              ‹
            </button>
          )}
          {currentImageIndex < displayImages.length - 1 && (
            <button
              onClick={(e) => { e.stopPropagation(); setCurrentImageIndex(prev => prev + 1); }}
              className="absolute right-3 top-1/2 -translate-y-1/2 z-20 w-8 h-8 rounded-full bg-black/50 hover:bg-black/80 backdrop-blur-md border border-white/20 text-white flex items-center justify-center transition-all cursor-pointer shadow-lg active:scale-90"
            >
              ›
            </button>
          )}
        </>
      )}

      {/* 1. TOP-LEFT CREATOR INFORMATION OVERLAY (NO PROFILE PICTURE) */}
      <div 
        className="absolute top-4 left-4 sm:top-5 sm:left-5 z-20 flex flex-col items-start gap-1 text-left pointer-events-auto max-w-[calc(100%-120px)] cursor-pointer group/creator"
        onClick={(e) => { e.stopPropagation(); onViewProfile?.(post.userId || ''); }}
      >
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="font-sans font-extrabold text-white text-base sm:text-lg tracking-tight drop-shadow-[0_2px_8px_rgba(0,0,0,0.85)] group-hover/creator:underline">
            {post.name}
          </span>
          <span className="font-mono text-xs sm:text-sm text-zinc-300 font-medium drop-shadow-[0_2px_6px_rgba(0,0,0,0.85)] group-hover/creator:text-white">
            @{post.username}
          </span>
          {post.isVerified && <VerificationBadge />}
        </div>

        {/* Audio / Source Info */}
        <div 
          onClick={(e) => { e.stopPropagation(); onViewSound?.(post.id); }}
          className="flex items-center gap-1.5 mt-0.5 text-xs font-mono text-zinc-300 drop-shadow-[0_2px_6px_rgba(0,0,0,0.85)] cursor-pointer hover:text-violet-300 transition-colors"
        >
          <Music className="w-3.5 h-3.5 text-violet-400 shrink-0" />
          <span className="truncate max-w-[220px]">
            {post.soundTitle || `Original Sound - ${post.name}`}
          </span>
        </div>
      </div>

      {/* 2. RIGHT-SIDE ACTION RAIL */}
      <div 
        className="absolute z-20 flex flex-col items-center gap-4 sm:gap-5"
        style={{
          bottom: "calc(env(safe-area-inset-bottom, 0px) + 20px)",
          right: 'calc(env(safe-area-inset-right, 0px) + 14px)'
        }}
      >
        {/* Spark Button */}
        <button 
          onClick={(e) => { e.stopPropagation(); onSpark(); }}
          disabled={isProcessing}
          className={`flex flex-col items-center gap-1 group/btn cursor-pointer font-sans text-center ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}`}
          title="Spark"
        >
          <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-full flex items-center justify-center bg-black/30 hover:bg-black/50 backdrop-blur-md border border-white/10 transition-all duration-300 active:scale-90 shadow-lg">
            <Zap className={`w-5 h-5 sm:w-6 sm:h-6 transition-transform duration-300 group-hover/btn:scale-110 ${post.isLikedByUser ? 'fill-pink-500 text-pink-500' : 'text-white'}`} />
          </div>
          <span className="font-mono text-[11px] sm:text-xs font-bold text-white drop-shadow-md select-none">{post.likes}</span>
        </button>

        {/* Comment Button */}
        <button 
          onClick={(e) => { e.stopPropagation(); onCommentToggle?.(); }}
          className="flex flex-col items-center gap-1 group/btn cursor-pointer font-sans text-center"
          title="Comments"
        >
          <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-full flex items-center justify-center bg-black/30 hover:bg-black/50 backdrop-blur-md border border-white/10 transition-all duration-300 active:scale-90 shadow-lg">
            <MessageSquare className="w-5 h-5 sm:w-6 sm:h-6 text-white transition-transform duration-300 group-hover/btn:scale-110" />
          </div>
          <span className="font-mono text-[11px] sm:text-xs font-bold text-white drop-shadow-md select-none">{post.comments?.length || 0}</span>
        </button>

        {/* Share Button */}
        <button 
          onClick={(e) => { 
            e.stopPropagation(); 
            setShowShareSheet(true);
          }}
          className="flex flex-col items-center gap-1 group/btn cursor-pointer font-sans text-center"
          title="Share"
        >
          <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-full flex items-center justify-center bg-black/30 hover:bg-black/50 backdrop-blur-md border border-white/10 transition-all duration-300 active:scale-90 shadow-lg">
            <Send className="w-5 h-5 sm:w-6 sm:h-6 text-white transition-transform duration-300 group-hover/btn:scale-110" />
          </div>
          <span className="font-mono text-[11px] sm:text-xs font-bold text-white drop-shadow-md select-none">{post.shares || 0}</span>
        </button>

        {/* Save Button */}
        <button 
          onClick={(e) => { 
            e.stopPropagation(); 
            try {
              const nextState = !savedCollectionForThis;
              setSavedCollectionForThis(nextState ? 'Favorites' : null);
              if (nextState) {
                localStorage.setItem(`nexora_saved_mapping_${post.id}`, 'Favorites');
                window.dispatchEvent(new CustomEvent('toast', { detail: '🔖 Post saved!' }));
              } else {
                localStorage.removeItem(`nexora_saved_mapping_${post.id}`);
                window.dispatchEvent(new CustomEvent('toast', { detail: 'Bookmark removed' }));
              }
            } catch {}
          }}
          className="flex flex-col items-center gap-1 group/btn cursor-pointer font-sans text-center"
          title="Save"
        >
          <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-full flex items-center justify-center bg-black/30 hover:bg-black/50 backdrop-blur-md border border-white/10 transition-all duration-300 active:scale-90 shadow-lg">
            <Bookmark className={`w-5 h-5 sm:w-6 sm:h-6 transition-transform duration-300 group-hover/btn:scale-110 ${savedCollectionForThis ? 'fill-yellow-400 text-yellow-400' : 'text-white'}`} />
          </div>
          <span className="font-mono text-[11px] sm:text-xs font-bold text-white drop-shadow-md select-none">{post.bookmarksCount || post.saves || 0}</span>
        </button>

        {/* More Options Button */}
        <div className="relative flex flex-col items-center">
          <button 
            onClick={(e) => { 
              e.stopPropagation(); 
              setShowMoreMenu(!showMoreMenu);
            }}
            className="w-11 h-11 sm:w-12 sm:h-12 rounded-full flex items-center justify-center bg-black/30 hover:bg-black/50 backdrop-blur-md border border-white/10 transition-all duration-300 active:scale-90 shadow-lg cursor-pointer"
            title="More options"
          >
            <MoreVertical className="w-5 h-5 text-white" />
          </button>

          <AnimatePresence>
            {showMoreMenu && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9, x: 10 }}
                animate={{ opacity: 1, scale: 1, x: 0 }}
                exit={{ opacity: 0, scale: 0.9, x: 10 }}
                className="absolute right-14 bottom-0 w-44 bg-[#0c091f]/95 backdrop-blur-md border border-white/10 rounded-xl shadow-md z-50 overflow-hidden font-sans py-1 text-left"
              >
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowMoreMenu(false);
                        handleDownloadWatermarkedImage();
                      }}
                      className="w-full text-left px-3 py-2 hover:bg-white/5 text-violet-300 font-bold flex items-center gap-2 text-xs transition-colors cursor-pointer border-b border-white/5"
                    >
                      <Download className="w-3.5 h-3.5 shrink-0 text-violet-400" />
                      Download Watermarked
                    </button>
                    {isOwnPost ? (
                  <>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        const newCaption = prompt('Edit caption:', post.content);
                        if (newCaption !== null && newCaption.trim() !== '') {
                          window.dispatchEvent(new CustomEvent('nexora-edit-caption', { detail: { postId: post.id, newCaption } }));
                        }
                        setShowMoreMenu(false);
                      }}
                      className="w-full text-left px-3 py-2 hover:bg-white/5 text-violet-300 font-bold flex items-center gap-2 text-xs transition-colors cursor-pointer border-b border-white/5"
                    >
                      <Edit3 className="w-3.5 h-3.5 shrink-0 text-amber-400" />
                      Edit Caption
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        const archiveState = !post.isArchived;
                        window.dispatchEvent(new CustomEvent('nexora-archive-post', { detail: { postId: post.id, archiveState } }));
                        setShowMoreMenu(false);
                      }}
                      className="w-full text-left px-3 py-2 hover:bg-white/5 text-violet-300 font-bold flex items-center gap-2 text-xs transition-colors cursor-pointer border-b border-white/5"
                    >
                      <Archive className="w-3.5 h-3.5 shrink-0 text-fuchsia-400" />
                      {post.isArchived ? 'Restore Post' : 'Archive Post'}
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm('Are you sure you want to delete this post? This action cannot be undone.')) {
                          window.dispatchEvent(new CustomEvent('nexora-delete-post', { detail: { postId: post.id } }));
                        }
                        setShowMoreMenu(false);
                      }}
                      className="w-full text-left px-3 py-2 hover:bg-red-500/10 text-red-400 font-bold flex items-center gap-2 text-xs transition-colors cursor-pointer"
                    >
                      <Trash className="w-3.5 h-3.5 shrink-0 text-red-500" />
                      Delete Post
                    </button>
                  </>
                ) : (
                  <>
                    {onToggleFollow && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleFollow();
                          setShowMoreMenu(false);
                        }}
                        className="w-full text-left px-3 py-2 hover:bg-white/5 text-violet-300 font-bold flex items-center gap-2 text-xs transition-colors cursor-pointer border-b border-white/5"
                      >
                        <UserPlus className="w-3.5 h-3.5 shrink-0 text-violet-400" />
                        {isFollowing ? 'Unfollow Creator' : 'Follow Creator'}
                      </button>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onNotInterested?.();
                        setShowMoreMenu(false);
                        window.dispatchEvent(new CustomEvent('toast', { detail: '🙈 Marked as not interested' }));
                      }}
                      className="w-full text-left px-3 py-2 hover:bg-white/5 text-violet-300 font-bold flex items-center gap-2 text-xs transition-colors cursor-pointer"
                    >
                      <EyeOff className="w-3.5 h-3.5 shrink-0 text-zinc-400" />
                      Not Interested
                    </button>
                  </>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* 3. BOTTOM-LEFT INFORMATION OVERLAY */}
      <div 
        className="absolute z-20 flex flex-col items-start gap-1.5 text-left pointer-events-auto max-w-[70%] sm:max-w-[75%]"
        style={{
          bottom: "calc(env(safe-area-inset-bottom, 0px) + 20px)",
          left: 'calc(env(safe-area-inset-left, 0px) + 16px)'
        }}
      >
        {/* Search Suggestion if available */}
        {post.searchSuggestion && (
          <button 
            onClick={(e) => {
              e.stopPropagation();
              window.dispatchEvent(new CustomEvent('toast', { detail: `🔍 Searching: ${post.searchSuggestion}` }));
            }}
            className="flex items-center gap-1.5 px-2.5 py-1 mb-0.5 rounded-full bg-black/40 backdrop-blur-md border border-white/10 hover:bg-black/60 transition-colors pointer-events-auto cursor-pointer"
          >
            <Search className="w-3 h-3 text-violet-300" />
            <span className="text-[10px] font-mono text-white tracking-wider">Search • {post.searchSuggestion}</span>
          </button>
        )}

        {/* Caption & Read More Toggle */}
        {post.content && (
          <div className="text-xs sm:text-sm text-zinc-100 font-sans leading-relaxed drop-shadow-[0_2px_8px_rgba(0,0,0,0.85)] pointer-events-auto">
            <p className={isExpanded ? "" : "line-clamp-2"}>
              {post.content}
            </p>
            {post.content.length > 50 && (
              <button 
                onClick={(e) => { e.stopPropagation(); setIsExpanded(!isExpanded); }} 
                className="text-[11px] font-mono font-bold text-violet-300 hover:text-white mt-0.5 cursor-pointer"
              >
                {isExpanded ? "Show less" : "More"}
              </button>
            )}
          </div>
        )}

        {/* Audio / Source Info beneath caption */}
        <div 
          className="flex items-center gap-2 text-xs font-mono text-white/90 drop-shadow-[0_2px_6px_rgba(0,0,0,0.85)] mt-0.5 cursor-pointer hover:text-violet-300 transition-colors pointer-events-auto" 
          onClick={(e) => { e.stopPropagation(); onViewSound?.(post.id); }}
        >
          <div className="w-5 h-5 rounded-full bg-black/40 border border-white/20 flex items-center justify-center shrink-0">
            <Music className="w-3 h-3 text-violet-400" />
          </div>
          <span className="truncate max-w-[200px]">
            {post.soundTitle || `Original Sound - ${post.name}`}
          </span>
        </div>

        {/* Hashtags */}
        {post.tags && post.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pointer-events-auto mt-0.5">
            {post.tags.slice(0, 4).map(tag => (
              <span
                key={tag}
                className="text-[11px] font-mono text-violet-300 hover:text-white drop-shadow-[0_2px_6px_rgba(0,0,0,0.85)] font-semibold cursor-pointer"
                onClick={(e) => {
                  e.stopPropagation();
                  window.dispatchEvent(new CustomEvent('toast', { detail: `🏷️ Filter: #${tag}` }));
                }}
              >
                #{tag}
              </span>
            ))}
          </div>
        )}

        {/* Location if present */}
        {post.location && (
          <div className="flex items-center gap-1 text-[11px] font-mono text-zinc-300 drop-shadow-[0_2px_6px_rgba(0,0,0,0.85)]">
            <span className="text-pink-400">📍</span>
            <span>{post.location}</span>
          </div>
        )}


      </div>

      <VideoBottomSheet
        isOpen={showShareSheet}
        onClose={() => setShowShareSheet(false)}
        post={post as any}
        onDownload={handleDownloadWatermarkedImage}
        onSave={() => {}}
        onShare={() => {}}
        onReport={() => {}}
        onNotInterested={() => {}}
        onViewProfile={() => onViewProfile?.(post.userId || '')}
        onFollowToggle={() => onToggleFollow?.()}
        isFollowing={isFollowing}
      />

      {/* Downloading Export State Overlay */}
      {downloadingState && (
        <div className="absolute inset-0 bg-black/85 backdrop-blur-md flex flex-col items-center justify-center gap-3 z-30">
          <div className="w-10 h-10 rounded-full border-2 border-violet-500 border-t-transparent animate-spin" />
          <p className="text-xs font-mono font-bold text-violet-300 tracking-wider uppercase">{downloadingState}</p>
        </div>
      )}
    </div>
  );
}
