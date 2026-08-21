import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Zap, Repeat, MessageCircle, Bookmark, Play, Pause, Volume2, Send, 
  Globe, CheckCircle, MoreHorizontal, EyeOff, FolderPlus, ShieldAlert, 
  Edit2, UserPlus, VolumeX, Pin, BookOpen, Archive, Trash, Sparkles, 
  BarChart2, Sliders, X, Check
} from 'lucide-react';
import { Post, User } from '../types';
import NexoraVideoPlayer from './NexoraVideoPlayer';
import NexoraImagePlayer from './NexoraImagePlayer';
import VohSummaryButton from './VohSummaryButton';
import RelativeTime from './RelativeTime';

interface FeedPostCardProps {
  post: Post;
  index: number;
  isActive: boolean;
  playingVoiceId: string | null;
  activeCommentsPostId: string | null;
  followingIds: string[];
  pinnedPostIds: string[];
  shouldPreload: boolean;
  isReleased: boolean;
  preloadMode: 'auto' | 'metadata' | 'none';
  currentUser: User | null;
  activeDotsMenuPostId: string | null;
  setActiveDotsMenuPostId: (id: string | null) => void;
  onSpark: (postId: string) => void;
  onSave: (postId: string) => void;
  onSharePost?: (postId: string) => void;
  onCommentToggle: (postId: string) => void;
  onToggleFollow?: (userId: string) => void;
  onViewProfile?: (userId: string) => void;
  onViewSound?: (soundId: string) => void;
  setActiveVideoFullscreen: (post: Post) => void;
  setContextualMenuPost: (post: Post) => void;
  setMutedUserIds: React.Dispatch<React.SetStateAction<string[]>>;
  setBlockedUserIds: React.Dispatch<React.SetStateAction<string[]>>;
  setPinnedPostIds: React.Dispatch<React.SetStateAction<string[]>>;
  setHiddenPostIds: React.Dispatch<React.SetStateAction<string[]>>;
  setNotInterestedTags: React.Dispatch<React.SetStateAction<string[]>>;
  setMutedCreatorIds: React.Dispatch<React.SetStateAction<string[]>>;
  handlePublishScheduledPostNow: (postId: string) => void;
  handleBroadcastReaction: (postId: string, emoji: string) => void;
  setPlayingVoiceId: (id: string | null) => void;
  voiceSeconds: number;
  votedPolls: Record<string, string>;
  setVotedPolls: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  selectedTag: string | null;
  setSelectedTag: (tag: string | null) => void;
  setNidaDiagnosticPost: (post: Post) => void;
  setAnalyticsPost: (post: Post) => void;
  setReportingPost: (post: any) => void;
  setShowSaveToCollectionModalId: (id: string | null) => void;
  setViewHistoryPost: (post: Post) => void;
  editingPostId: string | null;
  editingPostContent: string;
  setEditingPostId: (id: string | null) => void;
  setEditingPostContent: (content: string) => void;
  handleSaveEditPost: (postId: string) => void;
  expandedPostIds: string[];
  setExpandedPostIds: React.Dispatch<React.SetStateAction<string[]>>;
}

const FeedPostCardImpl: React.FC<FeedPostCardProps> = ({
  post,
  index,
  isActive,
  playingVoiceId,
  activeCommentsPostId,
  followingIds,
  pinnedPostIds,
  shouldPreload,
  isReleased,
  preloadMode,
  currentUser,
  activeDotsMenuPostId,
  setActiveDotsMenuPostId,
  onSpark,
  onSave,
  onSharePost,
  onCommentToggle,
  onToggleFollow,
  onViewProfile,
  setActiveVideoFullscreen,
  setContextualMenuPost,
  setMutedUserIds,
  setBlockedUserIds,
  setPinnedPostIds,
  setHiddenPostIds,
  setNotInterestedTags,
  setMutedCreatorIds,
  handlePublishScheduledPostNow,
  handleBroadcastReaction,
  setPlayingVoiceId,
  voiceSeconds,
  votedPolls,
  setVotedPolls,
  selectedTag,
  setSelectedTag,
  setNidaDiagnosticPost,
  setAnalyticsPost,
  setReportingPost,
  setShowSaveToCollectionModalId,
  setViewHistoryPost,
  editingPostId,
  editingPostContent,
  setEditingPostId,
  setEditingPostContent,
  handleSaveEditPost,
  expandedPostIds,
  setExpandedPostIds
}) => {
  const [floatingHearts, setFloatingHearts] = useState<Array<{ id: string; x: number; y: number }>>([]);
  const longPressTimerRef = useRef<any>(null);

  const isPlaying = playingVoiceId === post.id;
  const isCommentsOpen = activeCommentsPostId === post.id;
  const isOwnPost = currentUser && (post.userId === currentUser.id || post.username === currentUser.username);

  return (
    <div
      id={`post-${post.id}`}
      data-post-id={post.id}
      style={{ contentVisibility: 'auto', containIntrinsicSize: '1px 450px' }}
      onContextMenu={(e) => {
        e.preventDefault();
        setContextualMenuPost(post);
      }}
      onTouchStart={() => {
        longPressTimerRef.current = setTimeout(() => {
          setContextualMenuPost(post);
          if (navigator.vibrate) navigator.vibrate(40);
        }, 600);
      }}
      onTouchEnd={() => {
        if (longPressTimerRef.current) {
          clearTimeout(longPressTimerRef.current);
          longPressTimerRef.current = null;
        }
      }}
      onDoubleClick={(e) => {
        e.preventDefault();
        const rect = e.currentTarget.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        const heartId = `${Date.now()}-${Math.random()}`;
        setFloatingHearts((prev) => [...prev, { id: heartId, x, y }]);
        setTimeout(() => {
          setFloatingHearts((prev) => prev.filter((h) => h.id !== heartId));
        }, 1000);

        if (!post.isLikedByUser) {
          onSpark(post.id);
        } else if (navigator.vibrate) {
          navigator.vibrate(20);
        }
      }}
      className={`py-3 sm:py-4 border-b border-white/5 transition-colors duration-150 group text-left relative space-y-3 transform-gpu ${
        post.isBroadcastPost
          ? 'bg-gradient-to-b from-amber-500/5 to-transparent'
          : post.userId === 'user-0'
          ? 'bg-gradient-to-b from-violet-500/5 to-transparent'
          : 'bg-transparent'
      }`}
    >
      {/* Floating hearts double-tap animation */}
      {floatingHearts.map((heart) => (
        <motion.div
          key={heart.id}
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: [0, 1.5, 1.2, 1], opacity: [0, 1, 1, 0], y: -90, rotate: (Math.random() - 0.5) * 30 }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          style={{ left: heart.x, top: heart.y }}
          className="absolute -translate-x-1/2 -translate-y-1/2 pointer-events-none z-50 text-pink-500 text-5xl filter drop-shadow-[0_0_15px_rgba(244,63,94,0.6)]"
        >
          ❤️
        </motion.div>
      ))}

      {/* Scheduled Queue Warning */}
      {post.scheduledTime && new Date(post.scheduledTime).getTime() > Date.now() && (
        <div className="mx-4 sm:mx-6 mb-4 p-3 bg-violet-600/15 border border-white/10 rounded-2xl flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono text-violet-300">
          <span className="flex items-center gap-1.5">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-violet-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-violet-500"></span>
            </span>
            <span>📅 SCHEDULED QUEUE: {new Date(post.scheduledTime).toLocaleString()}</span>
          </span>
          <button
            onClick={() => handlePublishScheduledPostNow(post.id)}
            className="bg-violet-600 hover:bg-violet-500 text-white font-extrabold text-[9px] px-3 py-1 rounded-xl uppercase tracking-wider cursor-pointer"
          >
            Publish Now 🚀
          </button>
        </div>
      )}

      {/* Dynamic Recommendation Badge */}
      <div className="px-4 sm:px-6 mb-3 text-[9px] font-mono font-bold tracking-wider text-violet-400/60 uppercase flex items-center gap-1.5 border-b border-white/5 pb-2">
        <span className="w-1.5 h-1.5 rounded-full bg-violet-500 shrink-0"></span>
        {(() => {
          if (post.userId === 'user-0') return '⭐ Highlight: Recommended by Founder';
          if (post.username === 'voh_ai' || post.username === 'nexora_ai') return '🧠 Intelligence: Recommended by Nexora AI';
          if (post.username === 'nexora_official') return '🌌 System: Nexora Official Update';
          if (post.isBroadcastPost) return '📣 Broadcast channel propagation';
          if (post.userId && followingIds.includes(post.userId)) return '👥 Followed Creator';
          if (post.tags && post.tags.length > 0) {
            return `🔥 Recommended because you read ${post.tags[0]}`;
          }
          return '✨ High Engagement Feed Distribution';
        })()}
      </div>

      {/* Card Header Row */}
      <div className="px-4 sm:px-6 flex items-start justify-between gap-3 mb-4">
        <div className="flex gap-3">
          <img
            src={post.avatar}
            alt={post.name}
            loading="lazy"
            decoding="async"
            className="w-10 h-10 rounded-xl object-cover border border-white/10 cursor-pointer"
            onClick={() => post.userId && onViewProfile?.(post.userId)}
          />
          <div>
            <div className="flex items-center gap-1.5 flex-wrap">
              <span
                onClick={() => post.userId && onViewProfile?.(post.userId)}
                className="font-sans font-extrabold text-sm text-white hover:text-violet-400 transition-colors cursor-pointer"
              >
                {post.name}
              </span>
              {(post.username === 'voh' || post.userId === 'user-0' || post.username === 'voh_ai' || post.username === 'nexora_ai') && (
                <CheckCircle className="w-3.5 h-3.5 text-violet-400 fill-current" />
              )}
              {post.isBroadcastPost && (
                <span className="text-[8px] font-mono font-black uppercase text-amber-300 bg-amber-500/15 border border-amber-500/30 px-1.5 py-0.5 rounded-md flex items-center gap-0.5 tracking-wider">
                  <span>📣</span> BROADCASTS CHN
                </span>
              )}
              {post.content.length > 100 && <VohSummaryButton content={post.content} />}
            </div>
            <div className="flex items-center gap-1.5 text-[10.5px] font-mono text-violet-400/80 leading-tight">
              <span
                onClick={() => (post.userId || post.username) && onViewProfile?.(post.userId || post.username)}
                className="hover:underline cursor-pointer"
              >
                @{post.username}
              </span>
              <span>•</span>
              <span><RelativeTime timestamp={post.timestamp} /></span>
              <span>•</span>
              <span className="flex items-center gap-0.5 text-[10px] text-pink-400 bg-pink-500/5 px-1 py-0.5 rounded border border-pink-500/10">
                <BookOpen className="w-2.5 h-2.5 shrink-0" />
                {(() => {
                  const words = post.content.trim().split(/\s+/).length;
                  const min = Math.max(1, Math.ceil(words / 200));
                  return `${min} min read`;
                })()}
              </span>
            </div>
          </div>
        </div>

        {/* Badges & Menu Button */}
        <div className="flex flex-col items-end gap-1.5 text-[9.5px] font-mono shrink-0">
          <div className="flex items-center gap-1.5 flex-wrap justify-end">
            {pinnedPostIds.includes(post.id) && (
              <span className="text-[8.5px] font-black uppercase text-pink-400 bg-pink-500/10 border border-pink-500/20 px-1.5 py-0.5 rounded-md flex items-center gap-0.5 tracking-wider animate-pulse">
                <Pin className="w-2.5 h-2.5 text-pink-400 fill-current shrink-0" /> PINNED
              </span>
            )}
            {(post.userId === 'user-0' || post.username === 'voh') && (
              <span className="text-[8px] font-black uppercase text-amber-400 bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.5 rounded-md tracking-wider flex items-center gap-0.5">
                FOUNDER 👑
              </span>
            )}
            {post.username === 'voh_ai' && (
              <span className="text-[8px] font-black uppercase text-violet-400 bg-violet-500/10 border border-white/10 px-1.5 py-0.5 rounded-md tracking-wider flex items-center gap-0.5">
                VOH AI 🧠
              </span>
            )}
            {post.username === 'nexora_ai' && (
              <span className="text-[8px] font-black uppercase text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 px-1.5 py-0.5 rounded-md tracking-wider flex items-center gap-0.5">
                NEXORA AI 🌌
              </span>
            )}

            {/* Three Dots Menu Button */}
            <div className="relative">
              <button
                onClick={() => setActiveDotsMenuPostId(activeDotsMenuPostId === post.id ? null : post.id)}
                className="p-1.5 rounded-xl hover:bg-white/10 text-violet-400 transition-colors cursor-pointer"
                title="Post Options"
              >
                <MoreHorizontal className="w-4 h-4" />
              </button>

              <AnimatePresence>
                {activeDotsMenuPostId === post.id && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: -5 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: -5 }}
                    className="absolute right-0 mt-1 w-48 bg-[#0c091f] border border-white/10 rounded-xl shadow-md z-50 overflow-hidden font-sans py-1"
                  >
                    <button
                      onClick={() => {
                        setNidaDiagnosticPost(post);
                        setActiveDotsMenuPostId(null);
                      }}
                      className="w-full text-left px-3 py-2.5 bg-gradient-to-r from-violet-950/40 via-cyan-950/20 to-pink-950/15 text-cyan-300 font-extrabold flex items-center gap-2 text-xs transition-colors cursor-pointer border-b border-white/5"
                    >
                      <Sparkles className="w-3.5 h-3.5 shrink-0 text-cyan-400 animate-pulse" />
                      NIDA Diagnostics 🧬
                    </button>

                    {isOwnPost && (
                      <button
                        onClick={() => {
                          setAnalyticsPost(post);
                          setActiveDotsMenuPostId(null);
                        }}
                        className="w-full text-left px-3 py-2.5 bg-gradient-to-r from-violet-600/20 to-pink-500/20 text-violet-200 font-extrabold flex items-center gap-2 text-xs transition-colors cursor-pointer border-b border-white/5"
                      >
                        <BarChart2 className="w-3.5 h-3.5 shrink-0 text-pink-400" />
                        View Analytics 📊
                      </button>
                    )}

                    {isOwnPost && (
                      <button
                        onClick={() => {
                          const isPinned = pinnedPostIds.includes(post.id);
                          setPinnedPostIds((prev) => {
                            const next = isPinned ? prev.filter((id) => id !== post.id) : [...prev, post.id];
                            localStorage.setItem('nexora_pinned_posts', JSON.stringify(next));
                            return next;
                          });
                          setActiveDotsMenuPostId(null);
                          window.dispatchEvent(
                            new CustomEvent('toast', { detail: isPinned ? '📌 Post unpinned!' : '📌 Post pinned successfully!' })
                          );
                        }}
                        className="w-full text-left px-3 py-2 hover:bg-white/5 text-violet-300 font-bold flex items-center gap-2 text-xs transition-colors cursor-pointer border-b border-white/5"
                      >
                        <Pin className="w-3.5 h-3.5 shrink-0 text-violet-400" />
                        {pinnedPostIds.includes(post.id) ? 'Unpin Post' : 'Pin Post'}
                      </button>
                    )}

                    {isOwnPost && (
                      <button
                        onClick={() => {
                          const newCaption = prompt('Edit caption:', post.content);
                          if (newCaption !== null && newCaption.trim() !== '') {
                            window.dispatchEvent(
                              new CustomEvent('nexora-edit-caption', { detail: { postId: post.id, newCaption } })
                            );
                          }
                          setActiveDotsMenuPostId(null);
                        }}
                        className="w-full text-left px-3 py-2 hover:bg-white/5 text-violet-300 font-bold flex items-center gap-2 text-xs transition-colors cursor-pointer border-b border-white/5"
                      >
                        <Edit2 className="w-3.5 h-3.5 shrink-0 text-amber-400" />
                        Edit Caption
                      </button>
                    )}

                    {!isOwnPost && post.userId && (
                      <button
                        onClick={() => {
                          onToggleFollow?.(post.userId!);
                          setActiveDotsMenuPostId(null);
                        }}
                        className="w-full text-left px-3 py-2 hover:bg-white/5 text-violet-300 font-bold flex items-center gap-2 text-xs transition-colors cursor-pointer border-b border-white/5"
                      >
                        <UserPlus className="w-3.5 h-3.5 shrink-0 text-violet-400" />
                        {followingIds.includes(post.userId) ? 'Unfollow Creator' : 'Follow Creator'}
                      </button>
                    )}

                    <button
                      onClick={() => {
                        setReportingPost(post);
                        setActiveDotsMenuPostId(null);
                      }}
                      className="w-full text-left px-3 py-2 hover:bg-red-500/10 text-red-400 font-bold flex items-center gap-2 text-xs transition-colors cursor-pointer"
                    >
                      <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
                      Report Post
                    </button>

                    <button
                      onClick={() => {
                        setHiddenPostIds((prev) => [...prev, post.id]);
                        setActiveDotsMenuPostId(null);
                        window.dispatchEvent(new CustomEvent('toast', { detail: '🙈 Post hidden from active feed.' }));
                      }}
                      className="w-full text-left px-3 py-2 hover:bg-white/5 text-zinc-300 flex items-center gap-2 text-xs transition-colors cursor-pointer"
                    >
                      <EyeOff className="w-3.5 h-3.5 shrink-0" />
                      Hide Post
                    </button>

                    <button
                      onClick={() => {
                        const text = `${window.location.origin}/post/${post.id}`;
                        navigator.clipboard.writeText(text);
                        setActiveDotsMenuPostId(null);
                        window.dispatchEvent(new CustomEvent('toast', { detail: '🔗 Link copied to clipboard!' }));
                      }}
                      className="w-full text-left px-3 py-2 hover:bg-white/5 text-emerald-400 flex items-center gap-2 text-xs transition-colors cursor-pointer"
                    >
                      <span className="text-emerald-400 font-bold text-xs">➥</span>
                      Copy Link
                    </button>

                    <button
                      onClick={() => {
                        setShowSaveToCollectionModalId(post.id);
                        setActiveDotsMenuPostId(null);
                      }}
                      className="w-full text-left px-3 py-2 hover:bg-white/5 text-pink-400 font-bold flex items-center gap-2 text-xs transition-colors cursor-pointer border-t border-white/5"
                    >
                      <FolderPlus className="w-3.5 h-3.5 shrink-0" />
                      Save to Folder
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {post.communityName && (
            <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-md font-bold uppercase tracking-wide">
              🏟 {post.communityName}
            </span>
          )}
          {post.location && (
            <span className="bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 px-2 py-0.5 rounded-md flex items-center gap-1 animate-pulse">
              <Globe className="w-2.5 h-2.5 text-cyan-300" />
              <span>🌍 Pulse Report</span>
            </span>
          )}
        </div>
      </div>

      {/* Content Section */}
      <div className="px-4 sm:px-6 space-y-3 mb-4 text-left">
        {editingPostId === post.id ? (
          <div className="space-y-2 bg-slate-950/60 p-3 rounded-2xl border border-white/10">
            <textarea
              value={editingPostContent}
              onChange={(e) => setEditingPostContent(e.target.value)}
              className="w-full bg-zinc-900 text-xs text-white p-2.5 rounded-xl border border-zinc-800 focus:outline-none font-sans min-h-[80px]"
            />
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => {
                  setEditingPostId(null);
                  setEditingPostContent('');
                }}
                className="px-3 py-1.5 bg-zinc-850 hover:bg-zinc-800 text-zinc-300 font-bold text-[10px] uppercase tracking-wider rounded-lg cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => handleSaveEditPost(post.id)}
                className="px-3 py-1.5 bg-gradient-to-r from-violet-600 to-pink-500 hover:brightness-110 text-white font-bold text-[10px] uppercase tracking-wider rounded-lg cursor-pointer"
              >
                Save Changes 💾
              </button>
            </div>
          </div>
        ) : (
          <div>
            {(() => {
              const isExpanded = expandedPostIds.includes(post.id);
              const shouldTruncate = post.content.length > 280;
              const displayContent = shouldTruncate && !isExpanded ? `${post.content.slice(0, 280)}...` : post.content;

              return (
                <>
                  <p className="text-sm text-slate-100 font-sans leading-relaxed whitespace-pre-wrap select-all">
                    {displayContent}
                  </p>
                  {shouldTruncate && !isExpanded && (
                    <button
                      onClick={() => setExpandedPostIds((prev) => [...prev, post.id])}
                      className="text-violet-400 hover:text-violet-300 font-bold text-xs mt-2 block cursor-pointer transition-all hover:underline"
                    >
                      Continue Reading...
                    </button>
                  )}
                </>
              );
            })()}
            {post.editHistory && post.editHistory.length > 0 && (
              <button
                onClick={() => setViewHistoryPost(post)}
                className="mt-1.5 text-[9px] font-mono text-violet-400 hover:text-violet-300 flex items-center gap-1 cursor-pointer bg-violet-950/20 px-2 py-0.5 rounded-md border border-white/10"
              >
                ✏️ Edited ({post.editHistory.length}x) • View Change Log
              </button>
            )}
          </div>
        )}
      </div>

      {/* Media Players (Photo or Video) */}
      {post.videoUrl ? (
        <div className="mb-3 w-full overflow-hidden border-y border-white/10 bg-black">
          <NexoraVideoPlayer
            post={post}
            videoUrl={post.videoUrl}
            onOpenFullscreen={() => setActiveVideoFullscreen(post)}
            onSpark={() => onSpark(post.id)}
            isActive={isActive}
            preloadMode={preloadMode}
            isReleased={isReleased}
            shouldPreload={shouldPreload}
            isFollowing={post.userId ? followingIds.includes(post.userId) : false}
            onToggleFollow={() => post.userId && onToggleFollow?.(post.userId)}
            onCommentToggle={() => onCommentToggle(post.id)}
            isCommentsOpen={isCommentsOpen}
            onNotInterested={() => {
              if (post.userId) setMutedUserIds((prev) => [...prev, post.userId!]);
              window.dispatchEvent(new CustomEvent('toast', { detail: '👎 Not interested. Creator muted.' }));
            }}
            onViewProfile={(userId) => onViewProfile?.(userId)}
          />
        </div>
      ) : (post.image || (post.images && post.images.length > 0)) && !post.opportunityType ? (
        <div className="mb-3 w-full overflow-hidden border-y border-white/10 bg-black">
          <NexoraImagePlayer
            post={post}
            image={post.image}
            images={post.images}
            onSpark={() => onSpark(post.id)}
            isFollowing={post.userId ? followingIds.includes(post.userId) : false}
            onToggleFollow={() => post.userId && onToggleFollow?.(post.userId)}
            onCommentToggle={() => onCommentToggle(post.id)}
            isCommentsOpen={isCommentsOpen}
            onNotInterested={() => {
              if (post.userId) setMutedUserIds((prev) => [...prev, post.userId!]);
              window.dispatchEvent(new CustomEvent('toast', { detail: '👎 Not interested. Creator muted.' }));
            }}
            onViewProfile={(userId) => onViewProfile?.(userId)}
          />
        </div>
      ) : null}

      {/* Voice Broadcast Player */}
      {post.isVoice && (
        <div className="px-4 sm:px-6 mb-4">
          <div className="p-4 rounded-2xl bg-[#070518] border border-white/10 flex items-center gap-3">
            <button
              onClick={() => {
                if (isPlaying) {
                  setPlayingVoiceId(null);
                } else {
                  setPlayingVoiceId(post.id);
                }
              }}
              className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-transform active:scale-90 cursor-pointer ${
                isPlaying ? 'bg-gradient-to-r from-violet-600 to-pink-500 text-white' : 'bg-violet-500/20 text-violet-300'
              }`}
            >
              {isPlaying ? <Pause className="w-4 h-4 text-white" /> : <Play className="w-4 h-4 text-violet-300 ml-0.5" />}
            </button>
            <div className="flex-1 min-w-0">
              <div className="flex justify-between items-center text-[10px] font-mono mb-1.5">
                <span className="text-pink-400 font-extrabold flex items-center gap-1">
                  <Volume2 className="w-3.5 h-3.5 text-pink-400 animate-pulse" />
                  VOICE POST
                </span>
                <span className="text-violet-400">
                  {isPlaying ? `0:${voiceSeconds.toString().padStart(2, '0')}` : '0:00'} / {post.voiceDuration || '0:45'}
                </span>
              </div>
              <div className="flex items-end gap-[2px] h-5.5">
                {[...Array(20)].map((_, idx) => (
                  <div
                    key={idx}
                    className={`w-[2.5px] rounded-full transition-all duration-300 ${
                      isPlaying ? 'bg-gradient-to-t from-violet-500 via-pink-400 to-cyan-300' : 'bg-violet-500/20'
                    }`}
                    style={{
                      height: isPlaying ? `${Math.floor(20 + Math.sin(idx * 1.5 + voiceSeconds) * 60 + Math.random() * 20)}%` : '15%'
                    }}
                  />
                ))}
              </div>
              {post.voiceTranscript && (
                <div className="mt-3 bg-violet-950/30 p-2.5 rounded-xl border border-white/10">
                  <span className="text-[8.5px] font-mono text-violet-400 block uppercase font-bold tracking-widest mb-0.5">Captions Preview</span>
                  <p className="text-xs font-sans text-violet-300 italic">"{post.voiceTranscript}"</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Poll */}
      {post.interactivePoll && (
        <div className="px-4 sm:px-6 mb-4">
          <div className="p-4 rounded-2xl bg-slate-950/60 border border-white/10 space-y-3">
            <p className="text-xs font-sans text-violet-100 font-bold">{post.interactivePoll.question}</p>
          <div className="space-y-2">
            {post.interactivePoll.options.map((opt) => {
              const userVote = votedPolls[post.id];
              const totalVotes = post.interactivePoll!.options.reduce((acc, o) => acc + o.votes + (userVote === o.id ? 1 : 0), 0);
              const currentVotes = opt.votes + (userVote === opt.id ? 1 : 0);
              const percentage = totalVotes > 0 ? Math.round((currentVotes / totalVotes) * 100) : 0;

              return (
                <button
                  key={opt.id}
                  disabled={!!userVote}
                  onClick={() => setVotedPolls((prev) => ({ ...prev, [post.id]: opt.id }))}
                  className={`w-full text-left p-2.5 rounded-xl border relative overflow-hidden transition-all text-xs font-sans cursor-pointer ${
                    userVote === opt.id
                      ? 'border-violet-500 bg-violet-600/10 font-bold text-white'
                      : 'border-white/5 bg-white/3 hover:border-white/10 text-violet-200'
                  }`}
                >
                  {userVote && (
                    <div
                      className="absolute left-0 top-0 bottom-0 bg-violet-500/10 transition-all duration-700"
                      style={{ width: `${percentage}%` }}
                    />
                  )}
                  <div className="relative flex justify-between items-center z-10">
                    <span>{opt.text}</span>
                    {userVote && <span className="font-mono text-[10px] text-violet-400 font-bold">{percentage}% ({currentVotes})</span>}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
      )}

      {/* Hashtags */}
      {post.tags.length > 0 && (
        <div className="px-4 sm:px-6 flex flex-wrap gap-1.5 mb-4">
          {post.tags.map((tag) => (
            <button
              key={tag}
              onClick={() => setSelectedTag(selectedTag === tag ? null : tag)}
              className={`text-[10px] font-mono px-2.5 py-0.5 rounded-md transition-colors cursor-pointer ${
                selectedTag === tag ? 'bg-violet-600 text-white' : 'bg-[#15112e] text-violet-400 hover:bg-violet-500/10'
              }`}
            >
              #{tag}
            </button>
          ))}
        </div>
      )}

      {/* Action Row for text posts */}
      {!(post.videoUrl || (post.image && !post.opportunityType) || (post.images && post.images.length > 0)) && (
        post.isBroadcastPost ? (
          <div className="px-4 sm:px-6 flex flex-col gap-3 border-t border-white/5 pt-3.5 mb-1 text-left w-full">
            <span className="text-[9.5px] font-mono text-amber-400 font-bold tracking-widest uppercase flex items-center gap-1">
              <span>🔒</span> COMMENTS LOCKED • REACTIONS ALLOWED
            </span>
            <div className="flex flex-wrap items-center gap-2.5">
              {[
                { emoji: '🔥', label: 'Inspirational' },
                { emoji: '🙌', label: 'Applaud' },
                { emoji: '⚡', label: 'High Power' },
                { emoji: '🏆', label: 'Milestone' }
              ].map((reactOption) => {
                const count = post.broadcastReactions ? post.broadcastReactions[reactOption.emoji] || 0 : 0;
                return (
                  <button
                    key={reactOption.emoji}
                    onClick={() => handleBroadcastReaction(post.id, reactOption.emoji)}
                    className="p-1 px-3 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 hover:border-amber-500/40 rounded-xl flex items-center gap-2 text-xs font-mono font-bold text-amber-200 transition-all active:scale-95 cursor-pointer"
                    title={reactOption.label}
                  >
                    <span>{reactOption.emoji}</span>
                    <span className="text-[11px] font-mono text-amber-300/80">{count}</span>
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="px-4 sm:px-6 flex items-start gap-4 border-t border-white/5 pt-4 mt-2 text-white">
            {/* Spark (Zap) */}
            <button
              onClick={() => onSpark(post.id)}
              className="flex flex-col items-center gap-1 group cursor-pointer"
              title="Spark"
            >
              <Zap className={`w-6 h-6 ${post.isLikedByUser ? 'fill-pink-500 text-pink-500' : 'text-white'}`} />
              <span className="text-[10px] font-mono font-bold">{post.likes}</span>
            </button>

            {/* Comment */}
            <button
              onClick={() => onCommentToggle(post.id)}
              className="flex flex-col items-center gap-1 group cursor-pointer"
              title="Comment"
            >
              <MessageCircle className="w-6 h-6 text-white" />
              <span className="text-[10px] font-mono font-bold">{post.comments?.length || 0}</span>
            </button>

            {/* Repost */}
            <button
              onClick={() => {
                if (onSharePost) onSharePost(post.id);
                window.dispatchEvent(new CustomEvent('toast', { detail: '🔁 Post reposted!' }));
              }}
              className="flex flex-col items-center gap-1 group cursor-pointer"
              title="Repost"
            >
              <Repeat className="w-6 h-6 text-white" />
              <span className="text-[10px] font-mono font-bold">{post.shares || 0}</span>
            </button>

            {/* Share */}
            <button
              onClick={() => {
                try {
                  navigator.clipboard.writeText(`${window.location.origin}/post/${post.id}`);
                  window.dispatchEvent(new CustomEvent('toast', { detail: '📋 Link copied!' }));
                } catch (e) {}
              }}
              className="flex flex-col items-center gap-1 group cursor-pointer"
              title="Share"
            >
              <Send className="w-6 h-6 text-white" />
              <span className="text-[10px] font-mono font-bold">Share</span>
            </button>

            {/* Bookmark */}
            <button
              onClick={() => onSave(post.id)}
              className="flex flex-col items-center gap-1 group cursor-pointer"
              title="Bookmark"
            >
              <Bookmark className={`w-6 h-6 ${post.isBookmarkedByUser ? 'fill-cyan-400 text-cyan-400' : 'text-white'}`} />
              <span className="text-[10px] font-mono font-bold">{post.bookmarksCount || 0}</span>
            </button>
          </div>
        )
      )}
    </div>
  );
};

export const FeedPostCard = React.memo(FeedPostCardImpl, (prev, next) => {
  return Object.keys(prev).every(key => {
    if (typeof prev[key] === 'function') return true; // Ignore functions
    if (key === 'post') {
      return prev.post.isLikedByUser === next.post.isLikedByUser && 
             prev.post.likes === next.post.likes &&
             prev.post.comments?.length === next.post.comments?.length &&
             prev.post.content === next.post.content &&
             prev.post.scheduledTime === next.post.scheduledTime;
    }
    if (key === 'votedPolls') {
      return prev.votedPolls[prev.post.id] === next.votedPolls[next.post.id];
    }
    if (key === 'followingIds') {
      return prev.followingIds.includes(prev.post.userId) === next.followingIds.includes(next.post.userId);
    }
    return prev[key] === next[key];
  });
});
export default FeedPostCard;
