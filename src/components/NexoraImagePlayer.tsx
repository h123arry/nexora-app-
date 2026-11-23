import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Zap, MessageSquare, Send, Bookmark, MoreVertical, Edit3, Archive, Trash, UserPlus, EyeOff, Download, ImageOff } from 'lucide-react';
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
  taggedUsernames?: string[];
  imageAltText?: string;
  commentsDisabled?: boolean;
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
  isActive?: boolean;
  shouldPreload?: boolean;
  isReleased?: boolean;
  isImmersive?: boolean;
}

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
  isActive = true,
  shouldPreload = false,
  isReleased = false,
  isImmersive = false,
}: NexoraImagePlayerProps) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [showShareSheet, setShowShareSheet] = useState(false);
  const [downloadingState, setDownloadingState] = useState<string | null>(null);
  const [isResolvingMedia, setIsResolvingMedia] = useState(true);
  const [isImageLoading, setIsImageLoading] = useState(true);
  const [hasImageLoadError, setHasImageLoadError] = useState(false);
  const [showSwipeHint, setShowSwipeHint] = useState(() => {
    try { return localStorage.getItem('nexora_photo_swipe_hint_seen') !== 'true'; } catch { return false; }
  });
  const touchStartX = useRef<number | null>(null);
  const suppressImageClick = useRef(false);

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
  const rawImagesKey = rawImages.join('\u0000');
  // Keep resolved URLs by their original carousel index. Only the active image
  // and its immediate successor are resolved, rather than every image at once.
  const [displayImages, setDisplayImages] = useState<Array<string | undefined>>([]);
  const [imageRetryKey, setImageRetryKey] = useState(0);

  useEffect(() => {
    setCurrentImageIndex(0);
    setDisplayImages([]);
  }, [rawImagesKey]);

  useEffect(() => {
    if (isReleased || (!isActive && !shouldPreload)) return;
    if (rawImages.length === 0) {
      setIsResolvingMedia(false);
      setIsImageLoading(false);
      setHasImageLoadError(true);
      return;
    }

    let active = true;
    const indexes = [currentImageIndex, currentImageIndex + 1]
      .filter((index, position, all) => index < rawImages.length && all.indexOf(index) === position);
    const missingIndexes = indexes.filter(index => !displayImages[index]);

    setHasImageLoadError(false);
    setIsImageLoading(true);
    if (displayImages[currentImageIndex]) {
      setIsResolvingMedia(false);
    } else {
      setIsResolvingMedia(true);
    }

    if (missingIndexes.length === 0) {
      setIsResolvingMedia(false);
      return () => { active = false; };
    }

    Promise.all(missingIndexes.map(async index => {
      try {
        return { index, url: await resolveMediaUrl(rawImages[index]) };
      } catch {
        // A failed adjacent prefetch must not prevent the visible image loading.
        return { index, url: '' };
      }
    }))
      .then(resolved => {
        if (!active) return;
        setDisplayImages(previous => {
          const next = [...previous];
          for (const item of resolved) next[item.index] = item.url || undefined;
          return next;
        });
        setIsResolvingMedia(false);
        if (resolved.some(item => item.index === currentImageIndex && !item.url)) {
          setIsImageLoading(false);
          setHasImageLoadError(true);
        }
      });

    return () => { active = false; };
  }, [rawImagesKey, currentImageIndex, isActive, shouldPreload, isReleased, imageRetryKey]);

  useEffect(() => {
    setIsImageLoading(true);
    setHasImageLoadError(false);
  }, [currentImageIndex]);

  useEffect(() => {
    if (rawImages.length < 2 || !showSwipeHint) return;
    const timer = window.setTimeout(() => {
      setShowSwipeHint(false);
      try { localStorage.setItem('nexora_photo_swipe_hint_seen', 'true'); } catch { /* Storage may be unavailable in private mode. */ }
    }, 3600);
    return () => window.clearTimeout(timer);
  }, [rawImages.length, showSwipeHint]);

  const handlePhotoTouchStart = (event: React.TouchEvent) => {
    touchStartX.current = event.touches[0]?.clientX ?? null;
    suppressImageClick.current = false;
  };

  const handlePhotoTouchEnd = (event: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const deltaX = (event.changedTouches[0]?.clientX ?? touchStartX.current) - touchStartX.current;
    touchStartX.current = null;
    if (Math.abs(deltaX) < 45 || rawImages.length < 2) return;
    suppressImageClick.current = true;
    setCurrentImageIndex(index => Math.max(0, Math.min(rawImages.length - 1, index + (deltaX < 0 ? 1 : -1))));
    if (showSwipeHint) {
      setShowSwipeHint(false);
      try { localStorage.setItem('nexora_photo_swipe_hint_seen', 'true'); } catch { /* Storage may be unavailable in private mode. */ }
    }
    window.setTimeout(() => { suppressImageClick.current = false; }, 350);
  };

  const isOwnPost = currentUser && (post.userId === currentUser.id || post.username === currentUser.username);

  useEffect(() => {
    if (!isFullscreen) return;
    const closeOnPopState = () => setIsFullscreen(false);
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === 'Escape') window.history.back(); };
    window.history.pushState({ nexoraPhotoViewer: post.id }, '');
    window.addEventListener('popstate', closeOnPopState);
    window.addEventListener('keydown', closeOnEscape);
    return () => { window.removeEventListener('popstate', closeOnPopState); window.removeEventListener('keydown', closeOnEscape); };
  }, [isFullscreen, post.id]);


  return (
    <div className={`relative w-full overflow-hidden bg-black select-none group ${isImmersive ? 'h-full' : ''}`}>
      {/* Background Image Display */}
      <div className={`w-full relative overflow-hidden bg-[#080612] flex items-center justify-center touch-pan-y ${isImmersive ? 'h-full' : ''}`} onTouchStart={handlePhotoTouchStart} onTouchEnd={handlePhotoTouchEnd}>
        {isResolvingMedia ? (
          <div role="status" aria-live="polite" className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-gradient-to-br from-[#15102a] via-[#080612] to-[#1c0b20] p-6 text-center">
            <span className="w-8 h-8 rounded-full border-2 border-violet-400 border-t-transparent animate-spin" aria-hidden="true" />
            <span className="text-xs font-medium text-zinc-300">Loading media…</span>
          </div>
        ) : displayImages[currentImageIndex] ? (
          <>
            <img loading={isActive || shouldPreload ? "eager" : "lazy"}
              key={`${displayImages[currentImageIndex]}-${imageRetryKey}`}
              src={displayImages[currentImageIndex]}
              alt={post.imageAltText || post.content || 'Post media'}
              decoding="async"
              fetchPriority={isActive ? "high" : shouldPreload ? "auto" : "low"}
              aria-hidden={hasImageLoadError}
              onLoad={() => { setIsImageLoading(false); setHasImageLoadError(false); }}
              onError={() => { setIsImageLoading(false); setHasImageLoadError(true); }}
              className={`block w-full ${isImmersive ? 'h-full max-h-full object-contain' : 'h-auto max-h-[78vh] object-contain'} cursor-zoom-in ${hasImageLoadError ? 'opacity-0' : ''}`}
              onClick={() => { if (!suppressImageClick.current) setIsFullscreen(true); }}
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
                <button type="button" onClick={(event) => { event.stopPropagation(); setIsImageLoading(true); setHasImageLoadError(false); setDisplayImages(previous => { const next = [...previous]; next[currentImageIndex] = undefined; return next; }); setImageRetryKey(key => key + 1); }} className="mt-1 rounded-full border border-violet-400/30 bg-violet-500/15 px-4 py-2 text-xs font-semibold text-violet-100 hover:bg-violet-500/25 focus-visible:outline-2 focus-visible:outline-violet-300">Try again</button>
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

      </div>

      {rawImages.length > 1 && (
        <div className="relative flex items-center justify-center gap-1.5 py-3 bg-[#080612]" aria-label={`Photo ${currentImageIndex + 1} of ${rawImages.length}`}>
          {rawImages.map((_, index) => (
            <button
              key={`${post.id}-photo-${index}`}
              type="button"
              onClick={() => setCurrentImageIndex(index)}
              aria-label={`Show photo ${index + 1}`}
              aria-current={currentImageIndex === index ? 'true' : undefined}
              className={`h-1.5 rounded-full transition-all duration-200 ${currentImageIndex === index ? 'w-4 bg-violet-400' : 'w-1.5 bg-white/35 hover:bg-white/65'}`}
            />
          ))}
          {showSwipeHint && currentImageIndex === 0 && (
            <motion.div
              aria-hidden="true"
              className="absolute left-1/2 top-1/2 -translate-y-1/2 pointer-events-none"
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: [0, 1, 1, 0], x: [12, -24, 12, -24] }}
              transition={{ duration: 3.2, ease: 'easeInOut' }}
            >
              <span className="text-2xl drop-shadow-lg">👆</span>
            </motion.div>
          )}
          <span className="sr-only">{currentImageIndex + 1} of {rawImages.length} photos</span>
        </div>
      )}

      {/* 2. RIGHT-SIDE ACTION RAIL */}
      <div className="relative z-20 flex flex-row items-center justify-around gap-5 px-4 py-3 bg-[#080612] border-t border-white/10">
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
          type="button"
          disabled={Boolean(post.commentsDisabled)}
          onClick={(e) => { e.stopPropagation(); if (!post.commentsDisabled) onCommentToggle?.(); }}
          className="flex flex-col items-center gap-1 group/btn cursor-pointer font-sans text-center disabled:cursor-not-allowed disabled:opacity-45"
          title={post.commentsDisabled ? 'Comments are turned off for this post' : 'Comments'}
          aria-label={post.commentsDisabled ? 'Comments are turned off' : 'Open comments'}
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

      {isFullscreen && displayImages[currentImageIndex] && (
        <div className="fixed inset-0 z-[100] bg-black flex items-center justify-center touch-pan-y" role="dialog" aria-modal="true" aria-label="Photo viewer" onTouchStart={handlePhotoTouchStart} onTouchEnd={handlePhotoTouchEnd}>
          <img src={displayImages[currentImageIndex]} alt={post.imageAltText || post.content || "Post photo"} className="w-full h-full object-contain select-none" draggable={false} />
        </div>
      )}

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
