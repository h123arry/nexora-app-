import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Zap, MessageSquare, Send, Bookmark, MoreVertical, Check, Music, Search, Edit3, Archive, Trash, UserPlus, EyeOff } from 'lucide-react';
import VideoBottomSheet from './VideoBottomSheet';

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
  const isOwnPost = currentUser && (post.userId === currentUser.id || post.username === currentUser.username);

  const displayImages = images && images.length > 0 ? images : (image ? [image] : []);
  if (displayImages.length === 0) return null;

  return (
    <div className="relative w-full overflow-hidden rounded-2xl border border-white/10 bg-black aspect-square sm:aspect-[4/3] md:aspect-[16/10] max-h-[580px] shadow-2xl select-none group">
      {/* Background Image Display */}
      <div className="w-full h-full relative overflow-hidden bg-black flex items-center justify-center">
        <img
          src={displayImages[currentImageIndex]}
          alt={post.content || 'Post media'}
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.01]"
          referrerPolicy="no-referrer"
          style={{ filter: (post.imageFilters && post.imageFilters[currentImageIndex]) || post.imageFilter || 'none' }}
        />
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
                className="absolute right-14 bottom-0 w-44 bg-[#0c091f]/95 backdrop-blur-md border border-white/10 rounded-xl shadow-2xl z-50 overflow-hidden font-sans py-1 text-left"
              >
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
        onDownload={() => {}}
        onSave={() => {}}
        onShare={() => {}}
        onReport={() => {}}
        onNotInterested={() => {}}
        onViewProfile={() => onViewProfile?.(post.userId || '')}
        onFollowToggle={() => onToggleFollow?.()}
        isFollowing={isFollowing}
      />
    </div>
  );
}
