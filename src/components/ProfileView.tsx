import React, { useState, useEffect, useRef, useMemo } from 'react';
import { MapPin, Link as LinkIcon, Calendar, Edit3, Check, Heart, MessageSquare, Award, Zap, Sparkles, Play, Pause, Volume2, Users, Compass, FileText, UserPlus, MessageCircle, Download, Terminal, Pin, Flame, UserCheck, Search, X, ArrowLeft, Settings, Shield, Lock, Eye, Bell, BellOff, Ban, Flag, Sliders, Globe, Trash2, HelpCircle, Info, Activity, Video, Film, Camera, Image as ImageIcon, Mic, Menu, BarChart2, FolderClosed, QrCode, AlertTriangle, LogOut, ChevronRight, TrendingUp, TrendingDown, Coins, Music, Plus, Tv, EyeOff, UserX, VolumeX, CheckCircle2, LockKeyhole, Briefcase, Layers, Crown, Laptop, Smartphone, Key, RefreshCw, ChevronDown, LayoutGrid, Bookmark, Repeat2, HardDrive, Share2, MoreVertical, MoreHorizontal, Radio, ShieldCheck, Gift } from 'lucide-react';
import VohIcon from './VohIcon';
import ShareSheet from './ShareSheet';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import { User, Post } from '../types';
import { recordCreatorProfileVisit } from '../services/analytics/creatorAudience';
import PurpleVerifiedBadge from './VohVerifiedBadge';
import { ProfileService } from '../services/firebase/profileService';
import { getReputationStanding } from '../services/reputationStanding';
import { getCreatorCommunityAsset } from '../content/creatorCommunityAssets';
import NexoraBranding from './NexoraBranding';
import CreatorGiftGallery from './CreatorGiftGallery';
import GiftVerseView from './GiftVerseView';
import { validateUsername } from '../utils/username';
import ReportModal from './ReportModal';
import { auth, db } from '../services/firebase/config';
import { collection, doc, limit, onSnapshot, orderBy, query, updateDoc, where } from 'firebase/firestore';
import { uploadMediaFile } from '../services/firebase/storageService';
import { normalizeMediaDeliveryUrl } from '../lib/apiBaseUrl';
import { SettingsService } from '../services/firebase/settingsService';
import { subscribeToFollows } from '../services/dataService';
import RelativeTimestamp from './RelativeTimestamp';
import NexoraVideoPlayer from './NexoraVideoPlayer';
import NexoraLoader from './NexoraLoader';
import NexoraVideo from './NexoraVideo';
import CreatorDashboardView from './CreatorDashboardView';
import ImmersiveVideoViewer from './ImmersiveVideoViewer';
import { AuthService } from '../services/firebase/authService';
import StorageDataCenterModal from './StorageDataCenterModal';
import { exportAccountData, getLatestAccountDeletionRequest, requestAccountDeletion, AccountDeletionRequest } from '../services/firebase/accountLifecycleService';
import { getBillingSummary, type BillingSummary } from '../services/monetizationService';
import { 
  getFollowersCount, 
  getFollowingCount, 
  getReputationPoints, 
  getSparksReceived, 
  getContributionsCount, 
  getRichUser,
  getDefaultAvatar
} from '../data/database';


/** Retry transient public media failures without ever hiding the profile image element. */
function retryProfileMediaLoad(event: React.SyntheticEvent<HTMLImageElement>) {
  const image = event.currentTarget;
  if (!image.src.includes('/api/media/')) return;
  const attempts = Number(image.dataset.nexoraRetry || '0');
  if (attempts >= 3) {
    image.dataset.nexoraMediaState = 'unavailable';
    image.style.opacity = '1';
    image.dispatchEvent(new CustomEvent('nexora:media-unavailable', { bubbles: true }));
    return;
  }
  try {
    const retryUrl = new URL(image.src);
    retryUrl.searchParams.set('_nx_retry', `${Date.now()}-${attempts + 1}`);
    image.dataset.nexoraRetry = String(attempts + 1);
    image.dataset.nexoraMediaState = 'retrying';
    image.style.opacity = '1';
    image.src = retryUrl.toString();
  } catch {
    image.dataset.nexoraMediaState = 'unavailable';
    image.style.opacity = '1';
  }
}

/** Accept common mobile gallery formats even when a file provider omits its MIME type. All selected images are rasterised to JPEG before upload. */
function isSupportedProfileImageFile(file: File): boolean {
  const mime = (file.type || '').split(';')[0].trim().toLowerCase();
  const extension = file.name.toLowerCase().split('.').pop() || '';
  return ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif', 'image/heic', 'image/heif'].includes(mime)
    || ['jpg', 'jpeg', 'png', 'webp', 'gif', 'avif', 'heic', 'heif'].includes(extension);
}

/** Retry profile uploads after transient mobile-network failures. Each retry obtains a fresh R2 upload intent. */
async function uploadProfileMediaWithRetry(options: Parameters<typeof uploadMediaFile>[0]): Promise<Awaited<ReturnType<typeof uploadMediaFile>>> {
  let lastError: unknown;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      return await uploadMediaFile(options);
    } catch (error) {
      lastError = error;
      const message = error instanceof Error ? error.message : '';
      const isAbort = error instanceof DOMException && error.name === 'AbortError';
      const isPermanent = /HTTP (400|401|403|404|413|415)|invalid|unsupported|not authorized|sign in to the same account/i.test(message);
      if (isAbort || isPermanent || attempt === 2) throw error;
      await new Promise(resolve => window.setTimeout(resolve, 500 * (attempt + 1)));
    }
  }
  throw lastError instanceof Error ? lastError : new Error('NEXORA could not upload this profile photo. Please try again.');
}

/** Convert profile cover uploads to a predictable, browser-friendly JPEG before signing the R2 PUT. */
async function prepareProfileCoverImage(source: File): Promise<File> {
  let bitmap: ImageBitmap | null = null;
  let image: HTMLImageElement | null = null;
  let objectUrl: string | null = null;
  try {
    let width = 0;
    let height = 0;
    let draw: CanvasImageSource;
    if (typeof createImageBitmap === 'function') {
      try {
        bitmap = await createImageBitmap(source, { imageOrientation: 'from-image' });
      } catch {
        // Some mobile browsers expose createImageBitmap but cannot decode every
        // gallery format. Fall back to the browser image decoder before rejecting.
        bitmap = null;
      }
    }
    if (bitmap) {
      width = bitmap.width;
      height = bitmap.height;
      draw = bitmap;
    } else {
      objectUrl = URL.createObjectURL(source);
      image = new Image();
      await new Promise<void>((resolve, reject) => {
        const timeout = window.setTimeout(() => reject(new Error('Photo preparation took too long. Choose another image or a smaller file.')), 15000);
        image!.onload = () => { window.clearTimeout(timeout); resolve(); };
        image!.onerror = () => { window.clearTimeout(timeout); reject(new Error('NEXORA could not read this cover photo. Choose another image.')); };
        image!.src = objectUrl!;
        if (image!.complete && image!.naturalWidth > 0) { window.clearTimeout(timeout); resolve(); }
      });
      width = image.naturalWidth;
      height = image.naturalHeight;
      draw = image;
    }
    if (!width || !height) throw new Error('This cover photo has invalid image dimensions.');
    const scale = Math.min(1, 2400 / width, 1200 / height);
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(width * scale));
    canvas.height = Math.max(1, Math.round(height * scale));
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Your browser could not prepare this cover photo.');
    context.fillStyle = '#090714';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(draw, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(result => result ? resolve(result) : reject(new Error('NEXORA could not prepare this cover photo. Please choose another image.')), 'image/jpeg', 0.9);
    });
    return new File([blob], 'profile-cover.jpg', { type: 'image/jpeg', lastModified: Date.now() });
  } finally {
    bitmap?.close();
    if (objectUrl) URL.revokeObjectURL(objectUrl);
  }
}

interface MediaGridProps {
  gridPosts: Post[];
  pinnedPostIds: string[];
  onSelectPost: (post: Post) => void;
  repairVideoPosters?: boolean;
  ownerId?: string;
}

/**
 * Extract a representative frame from a remote video. The source must permit
 * anonymous canvas access; otherwise we leave the post untouched and retry
 * only after a later profile visit.
 */
function createRemoteVideoPoster(videoUrl: string): Promise<Blob | null> {
  return new Promise(resolve => {
    const video = document.createElement('video');
    video.crossOrigin = 'anonymous';
    video.preload = 'auto';
    video.muted = true;
    video.playsInline = true;
    let settled = false;
    const finish = (blob: Blob | null) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timeout);
      video.onloadedmetadata = null;
      video.onseeked = null;
      video.onerror = null;
      video.removeAttribute('src');
      video.load();
      resolve(blob);
    };
    const timeout = window.setTimeout(() => finish(null), 12000);
    video.onerror = () => finish(null);
    video.onloadedmetadata = () => {
      if (!Number.isFinite(video.duration) || video.duration <= 0) {
        finish(null);
        return;
      }
      try {
        video.currentTime = Math.min(0.5, Math.max(0.08, video.duration * 0.08));
      } catch {
        finish(null);
      }
    };
    video.onseeked = () => {
      try {
        const width = video.videoWidth;
        const height = video.videoHeight;
        if (!width || !height) return finish(null);
        const scale = Math.min(1, 1280 / Math.max(width, height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(width * scale));
        canvas.height = Math.max(1, Math.round(height * scale));
        const context = canvas.getContext('2d');
        if (!context) return finish(null);
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        canvas.toBlob(blob => finish(blob && blob.size > 0 ? blob : null), 'image/jpeg', 0.86);
      } catch {
        // Tainted canvas / cross-origin restrictions: never persist a fake poster.
        finish(null);
      }
    };
    video.src = videoUrl;
    video.load();
  });
}

const MediaGrid = React.memo(({ gridPosts, pinnedPostIds, onSelectPost, repairVideoPosters = false, ownerId }: MediaGridProps) => {
  const attemptedPosterRepairs = useRef(new Set<string>());
  const temporaryPosterUrls = useRef<string[]>([]);
  const [repairedPosters, setRepairedPosters] = useState<Record<string, string>>({});
  const posterRepairSignature = gridPosts.map(post => `${post.id}:${post.videoUrl || ''}:${post.media || ''}:${(post as any).mediaType || (post as any).type || ''}:${(post as any).videoThumbnailUrl || ''}:${(post as any).posterUrl || ''}`).join('|');

  // Keep temporary frame URLs alive for the whole mounted gallery. Effect
  // re-runs must not revoke URLs that are still being rendered by an <img>.
  useEffect(() => () => {
    temporaryPosterUrls.current.forEach(url => URL.revokeObjectURL(url));
    temporaryPosterUrls.current = [];
  }, []);

  useEffect(() => {
    let active = true;
    const repairVideoPosters = async () => {
      for (const post of gridPosts) {
        const mediaType = String((post as any).mediaType || (post as any).type || '').toLowerCase();
        const videoSource = post.videoUrl || (typeof post.media === 'string' && (mediaType === 'video' || /\.(mp4|m4v|mov|webm|m3u8)(?:$|[?#])/i.test(post.media)) ? post.media : '');
        const savedPoster = (post as any).videoThumbnailUrl || (post as any).posterUrl;
        if (!videoSource || savedPoster || attemptedPosterRepairs.current.has(post.id)) continue;
        attemptedPosterRepairs.current.add(post.id);
        try {
          const posterBlob = await createRemoteVideoPoster(normalizeMediaDeliveryUrl(videoSource));
          if (!posterBlob || !active) continue;
          const temporaryUrl = URL.createObjectURL(posterBlob);
          temporaryPosterUrls.current.push(temporaryUrl);
          setRepairedPosters(current => ({ ...current, [post.id]: temporaryUrl }));
          if (ownerId && post.userId === ownerId && auth.currentUser?.uid === ownerId) {
            const uploaded = await uploadMediaFile({
              file: new File([posterBlob], `profile-poster-${post.id}.jpg`, { type: 'image/jpeg' }),
              userId: ownerId,
              fileName: `profile-poster-${post.id}.jpg`,
            });
            if (active && auth.currentUser?.uid === ownerId) {
              await updateDoc(doc(db, 'posts', post.id), {
                videoThumbnailUrl: uploaded.downloadUrl,
                posterUrl: uploaded.downloadUrl,
              });
              setRepairedPosters(current => ({ ...current, [post.id]: uploaded.downloadUrl }));
            }
          }
        } catch (error) {
          console.warn('[ProfileMedia] Could not generate the real video poster:', post.id, error);
        }
      }
    };
    void repairVideoPosters();
    return () => { active = false; };
  }, [posterRepairSignature, ownerId]);
  if (gridPosts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center text-center py-20 px-6 w-full col-span-full">
        <div className="w-20 h-20 bg-linear-to-br from-violet-600/20 to-pink-500/20 rounded-full flex items-center justify-center mb-6 border border-white/5">
          <Camera className="w-8 h-8 text-violet-400" />
        </div>
        <p className="text-sm font-black text-white mb-1">No posts yet.</p>
        <p className="text-[11px] text-zinc-500 font-sans max-w-[200px] leading-relaxed">
          When you share your first post, it will appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="nx-profile-media-grid grid w-full grid-cols-[repeat(3,minmax(0,1fr))] gap-px bg-[#090714]">
      {gridPosts.map(post => {
        const isVoice = post.isVoice || !!post.voiceAudioUrl || !!(post as any).audioUrl || post.content.includes('🎙') || post.voiceDuration;
        const mediaUrl = typeof post.media === 'string' ? post.media : '';
        const mediaType = String((post as any).mediaType || (post as any).type || '').toLowerCase();
        const isVideo = !!post.videoUrl || (mediaType === 'video' && !!mediaUrl) || /\.(mp4|m4v|mov|webm|m3u8)(?:$|[?#])/i.test(mediaUrl);
        const videoSource = post.videoUrl || (isVideo ? mediaUrl : '');
        // Resolve actual uploaded media and saved posters across legacy and current post schemas.
        const thumbnail = isVideo
          ? (post as any).videoThumbnailUrl
            || (post as any).posterUrl
            || repairedPosters[post.id]
          : post.image || post.images?.find(Boolean) || (post as any).thumbnailUrl || (post as any).thumbnail || mediaUrl;
        const voiceAudioUrl = post.voiceAudioUrl || (post as any).audioUrl;
        const isMultiImage = !isVideo && (post.images?.filter(Boolean).length || 0) > 1;
        const isPinned = pinnedPostIds.includes(post.id);
        
        if (isVoice && !isVideo) {
          return (
            <motion.div
              key={post.id}
              layout
              className="aspect-[3/4] min-w-0 overflow-hidden bg-gradient-to-br from-[#1d1242] to-[#050314] p-2.5 flex flex-col justify-between text-left"
            >
              <div className="flex items-center justify-between gap-1">
                <Mic className="h-4 w-4 shrink-0 text-violet-300" />
                <span className="rounded-full border border-violet-400/20 bg-violet-500/10 px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wide text-violet-200">Voice</span>
              </div>
              {thumbnail && <img src={thumbnail} alt="" loading="lazy" decoding="async" className="h-10 w-10 rounded-lg object-cover" onError={retryProfileMediaLoad} />}
              <div className="min-w-0 space-y-1.5">
                {voiceAudioUrl ? (
                  <audio controls preload="none" src={voiceAudioUrl} className="h-8 w-full max-w-full" aria-label="Play voice post" />
                ) : (
                  <p className="text-[9px] leading-tight text-amber-200/80">Audio file unavailable</p>
                )}
                <p className="line-clamp-2 text-[9px] leading-snug text-zinc-200">{post.voiceTranscript || post.content}</p>
              </div>
            </motion.div>
          );
        }

        return (
          <motion.button
            type="button"
            layout
            key={post.id}
            onClick={() => onSelectPost(post)}
            aria-label={`Open post: ${post.content?.trim().slice(0, 100) || (isVideo ? 'Video post' : 'Photo post')}`}
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.98 }}
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
            className="group aspect-[3/4] overflow-hidden relative cursor-pointer bg-[#050314]/90 rounded-none flex flex-col justify-between text-left focus-visible:outline-2 focus-visible:outline-violet-300 focus-visible:outline-offset-[-3px]"
          >
            {/* Thumbnail Container */}
            <div className="absolute inset-0 w-full h-full z-0">
              {isVideo ? (
                <div className="w-full h-full bg-slate-950 relative overflow-hidden">
                  <div className="absolute inset-0 z-0 bg-gradient-to-tr from-violet-950/15 via-[#0a0521]/15 to-[#2c0b3d]/10 pointer-events-none" />
                  {thumbnail ? (
                    <img 
                      src={normalizeMediaDeliveryUrl(thumbnail)} 
                      loading="lazy"
                      decoding="async"
                      className="relative z-10 w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.05]" 
                      alt={post.content || 'Video thumbnail'}
                      referrerPolicy="no-referrer"
                      onError={(event) => { event.currentTarget.style.display = 'none'; }}
                    />
                  ) : (
                    <NexoraVideo 
                      src={videoSource ? `${videoSource}#t=0.001` : ''} 
                      className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity relative z-10" 
                      preload="metadata" 
                      muted 
                      playsInline
                    />
                  )}
                  <div className="absolute top-2 right-2 p-1.5 bg-black/60 backdrop-blur-md rounded-full z-20">
                    <Film className="w-3.5 h-3.5 text-violet-400" />
                  </div>
                  {/* Consistent Bottom overlays for video count and duration */}
                  <div className="absolute bottom-2 left-2 px-1.5 py-0.5 bg-black/60 backdrop-blur-md rounded text-white text-[9px] font-mono font-bold z-20 flex items-center gap-1">
                    <Play className="w-2 h-2 fill-white text-white" />
                    {(() => {
                      const views = Number.isFinite(post.views) ? Math.max(0, Number(post.views)) : 0;
                      const formatted = views >= 1000000
                        ? (views / 1000000).toFixed(1).replace(/\.0$/, '') + 'M'
                        : views >= 1000
                          ? (views / 1000).toFixed(1).replace(/\.0$/, '') + 'K'
                          : String(views);
                      return formatted;
                    })()}
                  </div>
                  <div className="absolute bottom-2 right-2 px-1.5 py-0.5 bg-black/60 backdrop-blur-md rounded text-white text-[9px] font-mono font-bold z-20">
                    {post.videoDuration || 'Reel'}
                  </div>
                </div>
              ) : thumbnail ? (
                <>
                <img 
                  src={normalizeMediaDeliveryUrl(thumbnail)} 
                  loading="lazy"
                  decoding="async"
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.05]" 
                  alt={post.content || 'Post image'}
                  referrerPolicy="no-referrer"
                  onError={(event) => { event.currentTarget.style.display = 'none'; }}
                />
                {isMultiImage && <div className="absolute top-2 right-2 z-20 rounded-full bg-black/65 p-1.5 text-white backdrop-blur-md" aria-label="Multiple photos"><Layers className="h-3.5 w-3.5" /></div>}
                </>
              ) : isVoice ? (
                <div className="w-full h-full bg-gradient-to-tr from-pink-950/75 via-[#1d1242] to-[#040212] flex flex-col justify-between p-3">
                  <div className="flex justify-between items-center">
                    <Mic className="w-4 h-4 text-violet-400 group-hover:scale-110 transition-transform" />
                    <span className="text-[8px] font-mono text-purple-300 font-extrabold uppercase bg-purple-500/10 px-1.5 py-0.5 rounded border border-purple-500/15">Voice</span>
                  </div>
                  
                  {/* Visual Waves */}
                  <div className="space-y-1 my-auto">
                    <div className="flex gap-0.5 items-end justify-center h-8 opacity-60 group-hover:opacity-85 transition-opacity">
                      <span className="w-0.5 bg-pink-400 h-4 animate-bounce" />
                      <span className="w-0.5 bg-purple-500 h-6 animate-bounce" style={{ animationDelay: '0.1s' }} />
                      <span className="w-0.5 bg-pink-400 h-2 animate-bounce" style={{ animationDelay: '0.2s' }} />
                      <span className="w-0.5 bg-purple-500 h-7 animate-bounce" style={{ animationDelay: '0.15s' }} />
                      <span className="w-0.5 bg-pink-400 h-5 animate-bounce" style={{ animationDelay: '0.05s' }} />
                    </div>
                  </div>
                  
                  <p className="text-[10px] text-left text-zinc-300 italic truncate font-sans max-w-full">
                    "{post.voiceTranscript || post.content}"
                  </p>
                </div>
              ) : (
                // Gradient visual cards for Text posts
                (() => {
                  const grads = [
                    'from-violet-950 via-[#100730] to-zinc-950',
                    'from-blue-950 via-[#0a0a38] to-[#1a0833]',
                    'from-emerald-950 via-teal-950 to-zinc-950',
                    'from-fuchsia-950 via-slate-950 to-rose-950/70',
                  ];
                  const num = post.id.charCodeAt(post.id.length - 1) || 0;
                  const grad = grads[num % grads.length];
                  return (
                    <div className={`w-full h-full bg-gradient-to-br ${grad} p-4 flex flex-col justify-between`}>
                      <div className="flex justify-between items-center">
                        <span className="text-[8px] font-mono text-violet-400/80 font-bold uppercase tracking-wider">Thought</span>
                        <span className="text-xs text-violet-400/60 font-serif">“</span>
                      </div>
                      <p className="text-[10px] md:text-xs font-sans font-medium line-clamp-3 italic text-zinc-300 leading-normal text-center my-auto">
                        {post.content}
                      </p>
                      <div className="text-right">
                        <span className="text-[8px] font-mono text-violet-400/50">Nexora App</span>
                      </div>
                    </div>
                  );
                })()
              )}
            </div>

            {/* Badges */}
            <div className="absolute top-2 left-2 z-10 flex gap-1 items-center">
              {isPinned && (
                <span className="p-1.5 bg-[#8B5CF6]/95 backdrop-blur-md rounded-full text-white shadow-sm" title="Pinned Post">
                  <Pin className="w-3 h-3 rotate-45 text-white" />
                </span>
              )}
            </div>

            {/* Hover Stats Blur Overlay */}
            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 backdrop-blur-xs transition-all flex items-center justify-center gap-4 z-2">
              <div className="flex items-center gap-1.5 text-white font-sans font-black text-xs md:text-sm">
                <Zap className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                <span>{post.likes || 0}</span>
              </div>
              <div className="flex items-center gap-1.5 text-white font-sans font-black text-xs md:text-sm">
                <MessageSquare className="w-4 h-4 text-violet-300" />
                <span>{post.comments?.length || 0}</span>
              </div>
            </div>
          </motion.button>
        );
      })}
    </div>
  );
});

interface ProfileViewProps {
  currentUser: User;
  isLoggedIn?: boolean;
  posts: Post[];
  userSparks?: string[];
  onUpdateProfile: (updatedData: Partial<User>) => void | Promise<void>;
  onLikePost: (postId: string) => void;
  onAddComment?: (postId: string, text: string) => void;
  onAddPost?: (content: string, imageUrl?: string, tagsString?: string, images?: string[], videoUrl?: string) => string;
  isOwnProfile?: boolean;
  onCloseProfile?: () => void;
  onToggleFollow?: (creatorId: string) => void;
  isFollowingField?: boolean;
  onStartChat?: (userId: string) => void;
  onViewProfile?: (userId: string) => void;
  theme?: string;
  setTheme?: (t: any) => void;
  onLogout?: () => void;
  onTriggerPWAInstall?: () => void;
  showPWAInstallPrompt?: boolean;
  onOpenVohAi?: () => void;
}

export default function ProfileView({
  currentUser,
  isLoggedIn = false,
  posts,
  userSparks = [],
  onUpdateProfile,
  onLikePost,
  onAddComment,
  onAddPost,
  isOwnProfile = true,
  onCloseProfile,
  onToggleFollow,
  isFollowingField = false,
  onStartChat,
  onViewProfile,
  theme,
  setTheme,
  onLogout,
  onTriggerPWAInstall,
  showPWAInstallPrompt,
  onOpenVohAi
}: ProfileViewProps) {
  const reduceMotion = useReducedMotion();
  const profileFrameAsset = getCreatorCommunityAsset(currentUser.profileFrameId);
  const profileBadgeAsset = getCreatorCommunityAsset(currentUser.profileBadgeId);
  // Navigation State
  const [activePanel, setActivePanel] = useState<'profile' | 'edit-profile' | 'menu' | 'creator-studio' | 'qr-profile' | 'social-graph' | 'collections' | 'subscriptions' | 'linked-accounts' | 'other-profile-menu'>('profile');
  const [profileTab, setProfileTab] = useState<string>('media');
  const [userBookmarks] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(`nexora_bookmarks_${currentUser.id}`);
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });
  const [receivedSparks, setReceivedSparks] = useState<Array<{ id: string; fromUserId: string; username: string; name: string; avatar: string; postId: string }>>([]);
  const [profileFollows, setProfileFollows] = useState<Array<{ followerId: string; followingId: string }>>([]);
  const [authorProfilePosts, setAuthorProfilePosts] = useState<Post[]>([]);
  useEffect(() => {
    setAuthorProfilePosts([]);
    if (!currentUser.id) return;
    const authorPostsQuery = query(
      collection(db, 'posts'),
      where('userId', '==', currentUser.id),
      where('audience', '==', 'public'),
      orderBy('timestamp', 'desc'),
      limit(100),
    );
    return onSnapshot(authorPostsQuery, snapshot => {
      const nextPosts = snapshot.docs.map(postDoc => ({ ...postDoc.data(), id: postDoc.id })) as Post[];
      setAuthorProfilePosts(nextPosts);
    }, error => {
      const code = (error as { code?: string } | null)?.code || 'unknown';
      console.warn('[NEXORA] Profile post feed sync paused; retaining available posts', { code, userId: currentUser.id });
    });
  }, [currentUser.id]);
  const [relationshipUsers, setRelationshipUsers] = useState<User[]>([]);
  useEffect(() => {
    if (!isLoggedIn || !currentUser.id || auth.currentUser?.uid !== currentUser.id) {
      setProfileFollows([]);
      setRelationshipUsers([]);
      return;
    }
    let active = true;
    const unsubscribe = subscribeToFollows(currentUser.id, follows => {
      if (!active) return;
      const edges = follows
        .filter((follow: any) => typeof follow.followerId === 'string' && typeof follow.followingId === 'string')
        .map((follow: any) => ({ followerId: follow.followerId, followingId: follow.followingId }));
      setProfileFollows(edges);
      const relatedIds = [...new Set(edges.map(edge => edge.followerId === currentUser.id ? edge.followingId : edge.followerId))];
      void Promise.all(relatedIds.map(id => ProfileService.getPublicProfile(id))).then(profiles => {
        if (active) setRelationshipUsers(profiles.filter((profile): profile is User => !!profile));
      });
    });
    return () => {
      active = false;
      unsubscribe();
    };
  }, [currentUser.id, isLoggedIn]);

  useEffect(() => {
    if (!isOwnProfile || auth.currentUser?.uid !== currentUser.id) {
      setReceivedSparks([]);
      return;
    }
    const sparkQuery = query(
      collection(db, 'users', currentUser.id, 'sparkEvents'),
      orderBy('createdAt', 'desc'),
      limit(20),
    );
    return onSnapshot(sparkQuery, snapshot => {
      setReceivedSparks(snapshot.docs.map(item => ({ id: item.id, ...item.data() } as typeof receivedSparks[number])));
    }, () => {
      setReceivedSparks([]);
    });
  }, [currentUser.id, isOwnProfile]);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [identityVerification, setIdentityVerification] = useState<{ identityType: 'individual' | 'creator' | 'public_figure' | 'organization'; displayName: string } | null>(null);

  useEffect(() => {
    let active = true;
    setIdentityVerification(null);
    if (currentUser.id) {
      void ProfileService.getPublicIdentityVerification(currentUser.id).then(result => {
        if (active) setIdentityVerification(result);
      });
    }
    return () => { active = false; };
  }, [currentUser.id]);

  const identityBadgeType = identityVerification?.identityType === 'organization'
    ? 'organization'
    : identityVerification?.identityType === 'public_figure'
      ? 'figure'
      : identityVerification?.identityType === 'creator'
        ? 'creator'
        : 'default';
  const [isBioExpanded, setIsBioExpanded] = useState(false);
  const [selectedGridPost, setSelectedGridPost] = useState<Post | null>(null);
  const [showGiftVerse, setShowGiftVerse] = useState(false);
  const [detailCommentText, setDetailCommentText] = useState<string>('');
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);
  const touchStartPos = useRef<{ x: number; y: number } | null>(null);

  const profileTabsList = ['media', 'voice', 'reposts', 'sparks', 'gifts', ...(isOwnProfile ? ['bookmarks', 'archive'] : [])];
  useEffect(() => { if (!isOwnProfile && (profileTab === 'bookmarks' || profileTab === 'archive')) setProfileTab('media'); }, [isOwnProfile, profileTab]);

  const handleContentTouchStart = (e: React.TouchEvent) => {
    touchStartPos.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  };

  const handleContentTouchEnd = (e: React.TouchEvent) => {
    if (!touchStartPos.current) return;
    const deltaX = e.changedTouches[0].clientX - touchStartPos.current.x;
    const deltaY = e.changedTouches[0].clientY - touchStartPos.current.y;
    touchStartPos.current = null;

    // Only switch if deltaX is significant and clearly horizontal (at least 60px and 1.8x deltaY)
    if (Math.abs(deltaX) > 60 && Math.abs(deltaX) > Math.abs(deltaY) * 1.8) {
      const currentIndex = profileTabsList.indexOf(profileTab);
      if (deltaX < 0 && currentIndex < profileTabsList.length - 1) {
        // Swiped left -> next tab
        setProfileTab(profileTabsList[currentIndex + 1]);
      } else if (deltaX > 0 && currentIndex > 0) {
        // Swiped right -> prev tab
        setProfileTab(profileTabsList[currentIndex - 1]);
      }
    }
  };

  useEffect(() => {
    if (!isLoggedIn || isOwnProfile || !currentUser.id) return;
    void recordCreatorProfileVisit(currentUser.id).catch(() => {
      // Profile browsing remains available when analytics is offline.
    });
  }, [currentUser.id, isLoggedIn, isOwnProfile]);

  useEffect(() => {
    setIsLoadingProfile(true);
    const timer = setTimeout(() => {
      setIsLoadingProfile(false);
    }, 450);
    return () => clearTimeout(timer);
  }, [currentUser.id]);

  useEffect(() => {
    const handleCustomTabChange = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail && customEvent.detail.subTab) {
        const sub = customEvent.detail.subTab;
        if (sub === 'saved') {
          setActivePanel('collections');
        } else if (sub === 'wallet') {
          setActivePanel('creator-studio');
        } else if (sub === 'settings') {
          setActivePanel('menu');
        }
      }
    };

    window.addEventListener('changeTab', handleCustomTabChange);
    return () => window.removeEventListener('changeTab', handleCustomTabChange);
  }, []);

  // Redesigned Settings & Privacy Hub state
  const [settingsSearchQuery, setSettingsSearchQuery] = useState('');
  const [settingsActiveSubPanel, setSettingsActiveSubPanel] = useState<'main' | 'account' | 'privacy' | 'security' | 'notifications' | 'appearance' | 'storage' | 'support' | 'about'>('main');
  
  const [isNotificationsEnabled, setIsNotificationsEnabled] = useState(() => {
    return localStorage.getItem(`nexora_notify_${currentUser.id}`) === 'true';
  });

  useEffect(() => {
    setIsNotificationsEnabled(localStorage.getItem(`nexora_notify_${currentUser.id}`) === 'true');
  }, [currentUser.id]);
  
  // Storage and data
  const [cacheSize, setCacheSize] = useState('128.4 MB');
  const [dataSaver, setDataSaver] = useState(false);
  const [autoplayVideos, setAutoplayVideos] = useState(true);
  const [mediaQuality, setMediaQuality] = useState('high'); // 'standard' | 'high' | 'lossless'
  const [isStorageCenterOpen, setIsStorageCenterOpen] = useState(false);

  // Security toggles/inputs
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  // Privacy toggles/inputs
  const [isPrivateNode, setIsPrivateNode] = useState(false);
  const [commentAudience, setCommentAudience] = useState('everyone'); // 'everyone' | 'friends' | 'none'
  const [mentionAudience, setMentionAudience] = useState('everyone'); // 'everyone' | 'followers' | 'none'

  // Support inputs
  const [supportCategory, setSupportCategory] = useState('feedback');
  const [supportMessage, setSupportMessage] = useState('');
  const [supportSubmitted, setSupportSubmitted] = useState(false);

  // Destructive Actions Confirmations
  const [confirmingLogout, setConfirmingLogout] = useState(false);
  const [confirmingDeleteAccount, setConfirmingDeleteAccount] = useState(false);
  const [deleteAccountPassword, setDeleteAccountPassword] = useState('');
  const [deleteStep, setDeleteStep] = useState(1); // 1 = warning, 2 = password enter, 3 = final delete
  const [isLifecycleBusy, setIsLifecycleBusy] = useState(false);
  const [deletionRequest, setDeletionRequest] = useState<AccountDeletionRequest | null>(null);

  useEffect(() => {
    let active = true;
    const refreshDeletionRequest = async () => {
      try {
        const latest = await getLatestAccountDeletionRequest(currentUser.id);
        if (active) setDeletionRequest(latest);
      } catch {
        console.warn('Unable to refresh account lifecycle status; details redacted.');
      }
    };
    void refreshDeletionRequest();
    const shouldPoll = deletionRequest?.status === 'pending' || deletionRequest?.status === 'processing';
    const timer = shouldPoll ? window.setInterval(() => void refreshDeletionRequest(), 15000) : undefined;
    return () => {
      active = false;
      if (timer) window.clearInterval(timer);
    };
  }, [currentUser.id, deletionRequest?.status]);

  const refreshSafetyLists = async () => {
    const ownerId = auth.currentUser?.uid;
    if (!ownerId) {
      setBlockedUsers([]);
      setMutedUsers([]);
      return;
    }
    try {
      const settings = await SettingsService.getSettings(ownerId);
      setBlockedUsers(settings.messaging.blockedUserIds);
      setMutedUsers(settings.feed.mutedCreatorIds);
    } catch {
      window.dispatchEvent(new CustomEvent('toast', { detail: 'Your safety lists could not be loaded. Please retry.' }));
    }
  };

  useEffect(() => {
    void refreshSafetyLists();
  }, [auth.currentUser?.uid]);

  const handleBlockProfile = async () => {
    const ownerId = auth.currentUser?.uid;
    if (!ownerId) {
      window.dispatchEvent(new CustomEvent('toast', { detail: 'Sign in to manage blocked accounts.' }));
      return;
    }
    if (currentUser.id === ownerId || isSafetyActionBusy) return;
    setIsSafetyActionBusy(true);
    try {
      const result = await SettingsService.toggleBlockedUser(ownerId, currentUser.id);
      setBlockedUsers(result.blockedUserIds);
      window.dispatchEvent(new CustomEvent('toast', {
        detail: result.blocked
          ? 'This account is blocked from messaging you and hidden from your feed.'
          : 'Account unblocked.',
      }));
      setActivePanel('profile');
    } catch (error) {
      await refreshSafetyLists();
      const message = error instanceof Error ? error.message : 'The block setting could not be saved. Please retry.';
      window.dispatchEvent(new CustomEvent('toast', { detail: message }));
    } finally {
      setIsSafetyActionBusy(false);
    }
  };

  const handleMuteAccount = async (targetId: string, muted: boolean) => {
    const ownerId = auth.currentUser?.uid;
    if (!ownerId || isSafetyActionBusy) return;
    setIsSafetyActionBusy(true);
    try {
      const settings = await SettingsService.getSettings(ownerId);
      const mutedIds = muted
        ? [...new Set([...settings.feed.mutedCreatorIds, targetId])].slice(0, 500)
        : settings.feed.mutedCreatorIds.filter(id => id !== targetId);
      await SettingsService.updateFeed(ownerId, { mutedCreatorIds: mutedIds });
      setMutedUsers(mutedIds);
      window.dispatchEvent(new CustomEvent('toast', { detail: muted ? 'You won’t see this creator’s posts in your feed.' : 'Creator unmuted.' }));
    } catch {
      await refreshSafetyLists();
      window.dispatchEvent(new CustomEvent('toast', { detail: 'This mute setting could not be saved. Please retry.' }));
    } finally {
      setIsSafetyActionBusy(false);
    }
  };

  const handleUnblockAccount = async (targetId: string) => {
    const ownerId = auth.currentUser?.uid;
    if (!ownerId || isSafetyActionBusy) return;
    setIsSafetyActionBusy(true);
    try {
      const result = await SettingsService.setBlockedUser(ownerId, targetId, false);
      setBlockedUsers(result.blockedUserIds);
      window.dispatchEvent(new CustomEvent('toast', { detail: 'Account unblocked.' }));
    } catch (error) {
      await refreshSafetyLists();
      const message = error instanceof Error ? error.message : 'This account could not be unblocked. Please retry.';
      window.dispatchEvent(new CustomEvent('toast', { detail: message }));
    } finally {
      setIsSafetyActionBusy(false);
    }
  };

  // Appearance customization
  const [accentColor, setAccentColor] = useState('violet'); // 'violet' | 'pink' | 'emerald' | 'cyan'
  const [textSize, setTextSize] = useState('medium'); // 'xs' | 'sm' | 'medium' | 'lg' | 'xl'
  const [customFont, setCustomFont] = useState('sans'); // 'sans' | 'mono' | 'space'
  const [displayDensity, setDisplayDensity] = useState('default'); // 'default' | 'cozy' | 'compact'
  const [chatBubbleStyle, setChatBubbleStyle] = useState('cyber'); // 'cyber' | 'classic' | 'neon'

  // Notification toggles
  const [notifToggles, setNotifToggles] = useState({
    likes: true,
    comments: true,
    mentions: true,
    reposts: true,
    directMessages: true,
    systemAlerts: true,
    verificationUpdates: true
  });

  // Remove legacy device-wide account labels from older builds. Account identity
  // is always derived from the currently authenticated Firebase user.
  useEffect(() => {
    try { localStorage.removeItem('nexora_saved_accounts'); } catch { /* Storage may be unavailable. */ }
  }, []);

  // Reputation breakdown view
  const [showReputationModal, setShowReputationModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);

  // Realistic Saving UX states
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isSavingCoverPhoto, setIsSavingCoverPhoto] = useState(false);
  const [showSavedFeedback, setShowSavedFeedback] = useState(false);
  const profileFieldSavesRef = useRef(new Set<string>());
  const [savingProfileFields, setSavingProfileFields] = useState<Set<string>>(new Set());
  const [savedProfileFields, setSavedProfileFields] = useState<Set<string>>(new Set());

  // Relationship states (Muted / Blocked lists)
  const [relationsTab, setRelationsTab] = useState<'followers' | 'following' | 'close-friends' | 'blocked' | 'muted'>('followers');
  const [searchRelationQuery, setSearchRelationQuery] = useState('');
  
  // Stateful Subscriptions

  const [subscriptionsTab, setSubscriptionsTab] = useState<'active' | 'plans' | 'exclusive'>('active');
  const [activeSubscriptions, setActiveSubscriptions] = useState<any[]>([]);
  const [mySubscriptionPlans, setMySubscriptionPlans] = useState<any[]>([]);
  const [exclusiveContentList, setExclusiveContentList] = useState<any[]>([]);
  const [billingSummary, setBillingSummary] = useState<BillingSummary | null>(null);
  const [billingSummaryError, setBillingSummaryError] = useState(false);
  const [blockedUsers, setBlockedUsers] = useState<string[]>([]);
  const [mutedUsers, setMutedUsers] = useState<string[]>([]);
  const [closeFriends, setCloseFriends] = useState<string[]>([]);

  useEffect(() => {
    if (activePanel !== 'subscriptions' || !isOwnProfile) return;
    let cancelled = false;
    setBillingSummaryError(false);
    void getBillingSummary().then(summary => {
      if (!cancelled) setBillingSummary(summary);
    }).catch(() => {
      if (!cancelled) setBillingSummaryError(true);
    });
    return () => { cancelled = true; };
  }, [activePanel, isOwnProfile, currentUser.id]);

  // Edit fields live states
  const [editName, setEditName] = useState(currentUser.name);
  const [editUsername, setEditUsername] = useState(currentUser.username);
  const [editBio, setEditBio] = useState(currentUser.bio);
  const [editLocation, setEditLocation] = useState(currentUser.location || '');
  const [editWebsite, setEditWebsite] = useState(currentUser.website || '');
  const [editPronouns, setEditPronouns] = useState(currentUser.pronouns || '');
  const [editCategory, setEditCategory] = useState(currentUser.profileCategory || 'Digital Creator');
  const [editCreatorType, setEditCreatorType] = useState(currentUser.creatorType || 'Premium creator');
  const [editAvatar, setEditAvatar] = useState(currentUser.avatar);
  const [editCover, setEditCover] = useState(currentUser.coverImage || '');
  const [editSocialTwitter, setEditSocialTwitter] = useState(currentUser.socialTwitter || '');
  const [editSocialInsta, setEditSocialInsta] = useState(currentUser.socialInstagram || '');
  const coverInputRef = useRef<HTMLInputElement | null>(null);
  const [pendingCoverFile, setPendingCoverFile] = useState<File | null>(null);
  const [pendingCoverPreview, setPendingCoverPreview] = useState<string | null>(null);
  const profileEditorWasOpenRef = useRef(false);
  useEffect(() => {
    const editorIsOpen = activePanel === 'edit-profile';
    if (editorIsOpen && !profileEditorWasOpenRef.current) {
      // Rehydrate the editor from the latest authenticated profile each time it opens.
      // This avoids editing stale placeholder values after async profile hydration.
      setEditName(currentUser.name || '');
      setEditUsername(currentUser.username || '');
      setEditBio(currentUser.bio || '');
      setEditLocation(currentUser.location || '');
      setEditWebsite(currentUser.website || '');
      setEditPronouns(currentUser.pronouns || '');
      setEditCategory(currentUser.profileCategory || 'Digital Creator');
      setEditCreatorType(currentUser.creatorType || 'Premium creator');
      setEditAvatar(currentUser.avatar || '');
      setEditCover(currentUser.coverImage || '');
      setEditSocialTwitter(currentUser.socialTwitter || '');
      setEditSocialInsta(currentUser.socialInstagram || '');
      setPendingCoverFile(null);
      setPendingCoverPreview(null);
    }
    profileEditorWasOpenRef.current = editorIsOpen;
  }, [activePanel, currentUser.id, currentUser.name, currentUser.username, currentUser.bio, currentUser.location, currentUser.website, currentUser.pronouns, currentUser.profileCategory, currentUser.creatorType, currentUser.avatar, currentUser.coverImage, currentUser.socialTwitter, currentUser.socialInstagram]);

  useEffect(() => {
    return () => { if (pendingCoverPreview) URL.revokeObjectURL(pendingCoverPreview); };
  }, [pendingCoverPreview]);

  // Webcam capture states
  const [isWebcamActive, setIsWebcamActive] = useState(false);
  const [webcamError, setWebcamError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);

  // Profile dropdown menu state
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [isSafetyActionBusy, setIsSafetyActionBusy] = useState(false);

  const handleAccountExport = async () => {
    if (isLifecycleBusy) return;
    setIsLifecycleBusy(true);
    try {
      const payload = await exportAccountData(currentUser.id);
      const dataStr = 'data:application/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(payload, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.href = dataStr;
      downloadAnchor.download = `nexora-account-snapshot-${currentUser.username}-${Date.now()}.json`;
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
      window.dispatchEvent(new CustomEvent('toast', { detail: 'A copy of some account information was downloaded. It may not include everything.' }));
    } catch (error) {
      window.dispatchEvent(new CustomEvent('toast', { detail: 'Your account information couldn’t be prepared. Please try again later.' }));
    } finally {
      setIsLifecycleBusy(false);
    }
  };

  const handleAccountDeletionRequest = async () => {
    if (isLifecycleBusy) return;
    setIsLifecycleBusy(true);
    try {
      const request = await requestAccountDeletion(currentUser.id, deleteAccountPassword);
      setDeletionRequest(request);
      setDeleteStep(3);
      setDeleteAccountPassword('');
      window.dispatchEvent(new CustomEvent('toast', { detail: 'Your account deletion request has been received and will be processed.' }));
    } catch (error) {
      window.dispatchEvent(new CustomEvent('toast', { detail: error instanceof Error && error.message.startsWith('For your safety') ? error.message : 'Your deletion request couldn’t be sent. Sign in again and try once more.' }));
    } finally {
      setIsLifecycleBusy(false);
    }
  };

  // Exquisite Interactive Avatar modal editor state
  const [isAvatarModalOpen, setIsAvatarModalOpen] = useState(false);
  const [avatarSourceType, setAvatarSourceType] = useState<'select' | 'webcam' | 'gallery_edit'>('select');
  const [galleryImage, setGalleryImage] = useState<string | null>(null);
  const [avatarZoom, setAvatarZoom] = useState(1.0);
  const [avatarRotation, setAvatarRotation] = useState(0);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Android Back / Escape event listener to close active overlays gracefully
  useEffect(() => {
    const handleEscape = (e: Event) => {
      if (isAvatarModalOpen) {
        setIsAvatarModalOpen(false);
        e.preventDefault();
        return;
      }
      if (selectedGridPost) {
        setSelectedGridPost(null);
        e.preventDefault();
        return;
      }
      if (showShareModal) {
        setShowShareModal(false);
        e.preventDefault();
        return;
      }
      if (isProfileMenuOpen) {
        setIsProfileMenuOpen(false);
        e.preventDefault();
        return;
      }
      if (isStorageCenterOpen) {
        setIsStorageCenterOpen(false);
        e.preventDefault();
        return;
      }
      if (showReputationModal) {
        setShowReputationModal(false);
        e.preventDefault();
        return;
      }
      if (activePanel !== 'profile') {
        setActivePanel('profile');
        setSettingsActiveSubPanel('main');
        setSettingsSearchQuery('');
        e.preventDefault();
        return;
      }
    };

    window.addEventListener('nexora-escape', handleEscape);
    return () => window.removeEventListener('nexora-escape', handleEscape);
  }, [
    isAvatarModalOpen,
    selectedGridPost,
    showShareModal,
    isProfileMenuOpen,
    isStorageCenterOpen,
    showReputationModal,
    activePanel
  ]);

  const handleGalleryFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.currentTarget;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      window.dispatchEvent(new CustomEvent('toast', { detail: 'Please select a valid image file.' }));
      return;
    }
    if (file.size <= 0 || file.size > 12 * 1024 * 1024) {
      window.dispatchEvent(new CustomEvent('toast', { detail: 'Choose an image smaller than 12 MB.' }));
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result !== 'string' || !reader.result.startsWith('data:image/')) {
        window.dispatchEvent(new CustomEvent('toast', { detail: 'NEXORA could not read that photo. Please try another.' }));
        return;
      }
      setGalleryImage(reader.result);
      setAvatarSourceType('gallery_edit');
      setAvatarZoom(1.0);
      setAvatarRotation(0);
    };
    reader.onerror = () => {
      window.dispatchEvent(new CustomEvent('toast', { detail: 'NEXORA could not read that photo. Please try another.' }));
    };
    reader.readAsDataURL(file);
  };

  const capturePhotoToGallery = () => {
    if (videoRef.current) {
      const canvas = document.createElement('canvas');
      canvas.width = 400;
      canvas.height = 400;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(videoRef.current, 0, 0, 400, 400);
        const dataUrl = canvas.toDataURL('image/jpeg');
        stopWebcam();
        setGalleryImage(dataUrl);
        setAvatarSourceType('gallery_edit');
        setAvatarZoom(1.0);
        setAvatarRotation(0);
        window.dispatchEvent(new CustomEvent('toast', { detail: '📸 Frame captured! Now crop and zoom your photo.' }));
      }
    }
  };

  const handleSaveCroppedAvatar = () => {
    if (!galleryImage || isSavingProfile) return;

    const img = new Image();
    img.onload = () => {
      if (!img.naturalWidth || !img.naturalHeight) {
        window.dispatchEvent(new CustomEvent('toast', { detail: 'This photo could not be prepared. Please choose another.' }));
        return;
      }

      try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('Image editor is unavailable on this device.');

        const size = 512;
        canvas.width = size;
        canvas.height = size;
        ctx.clearRect(0, 0, size, size);
        ctx.save();
        ctx.translate(size / 2, size / 2);
        ctx.rotate((avatarRotation * Math.PI) / 180);
        ctx.scale(avatarZoom, avatarZoom);

        const aspect = img.naturalWidth / img.naturalHeight;
        const drawWidth = aspect > 1 ? size * aspect : size;
        const drawHeight = aspect > 1 ? size : size / aspect;
        ctx.drawImage(img, -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight);
        ctx.restore();

        const finalDataUrl = canvas.toDataURL('image/jpeg', 0.9);
        if (!finalDataUrl.startsWith('data:image/jpeg;base64,')) {
          throw new Error('NEXORA could not prepare your profile photo. Please try another image.');
        }

        // Save Photo is a complete action: upload to R2, then persist the new
        // avatar in the private profile and public profile projection.
        setIsSavingProfile(true);
        void (async () => {
          try {
            const response = await fetch(finalDataUrl);
            if (!response.ok) throw new Error('NEXORA could not prepare your profile photo.');
            const avatarBlob = await response.blob();
            const uploadedAvatar = await uploadProfileMediaWithRetry({
              file: new File([avatarBlob], 'profile-avatar.jpg', { type: 'image/jpeg' }),
              userId: currentUser.id,
              fileName: 'profile-avatar',
              metadata: { purpose: 'profile-avatar' },
            });
            await onUpdateProfile({ avatar: uploadedAvatar.downloadUrl });
            setEditAvatar(uploadedAvatar.downloadUrl);
            setIsAvatarModalOpen(false);
            setGalleryImage(null);
            setAvatarZoom(1.0);
            setAvatarRotation(0);
            window.dispatchEvent(new CustomEvent('toast', { detail: 'Your profile photo has been uploaded and saved.' }));
          } catch (error) {
            const code = (error as { code?: string } | null)?.code;
            const rawMessage = error instanceof Error ? error.message : '';
            const isPermissionFailure = code === 'permission-denied' || /missing or insufficient permissions/i.test(rawMessage);
            window.dispatchEvent(new CustomEvent('toast', {
              detail: isPermissionFailure
                ? 'NEXORA could not save your profile photo right now. Please try again.'
                : rawMessage.trim() || 'NEXORA could not upload your profile photo. Please try again.'
            }));
          } finally {
            setIsSavingProfile(false);
          }
        })();
      } catch (error) {
        window.dispatchEvent(new CustomEvent('toast', {
          detail: error instanceof Error ? error.message : 'NEXORA could not prepare your profile photo. Please try another image.'
        }));
      }
    };
    img.onerror = () => {
      window.dispatchEvent(new CustomEvent('toast', { detail: 'This photo could not be opened. Please choose another one.' }));
    };
    img.src = galleryImage;
  };

  // Dynamic status presets
  const [statusText, setStatusText] = useState(() => localStorage.getItem(`nexora_status_text_${currentUser.id}`) || 'Exploring...');
  const [statusEmoji, setStatusEmoji] = useState(() => localStorage.getItem(`nexora_status_emoji_${currentUser.id}`) || '🌌');

  // Social Stats follow action toggle
  const [isFollowing, setIsFollowing] = useState(isFollowingField);
  // Keep the displayed relationship state authoritative when the viewed profile or
  // the parent-owned follow relationship changes while this view remains mounted.
  useEffect(() => {
    setIsFollowing(isFollowingField);
  }, [currentUser.id, isFollowingField]);
  const [profilePicExpanded, setProfilePicExpanded] = useState(false);

  // Analytics tab options
  const [analyticsTimeframe, setAnalyticsTimeframe] = useState<'7d' | '30d' | '90d'>('7d');

  // Sync edits when user switches
  useEffect(() => {
    setEditName(currentUser.name);
    setEditUsername(currentUser.username);
    setEditBio(currentUser.bio);
    setEditLocation(currentUser.location || '');
    setEditWebsite(currentUser.website || '');
    setEditPronouns(currentUser.pronouns || '');
    setEditCategory(currentUser.profileCategory || 'Digital Creator');
    setEditCreatorType(currentUser.creatorType || 'Premium creator');
    setEditSocialTwitter(currentUser.socialTwitter || '');
    setEditSocialInsta(currentUser.socialInstagram || '');
    setEditAvatar(currentUser.avatar);
    setEditCover(currentUser.coverImage || '');
  }, [currentUser.id]);

  // Web camera activation
  const startWebcam = async () => {
    setIsWebcamActive(true);
    setWebcamError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      mediaStreamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err: any) {
      setWebcamError('Unable to lock camera stream. Please grant hardware privileges.');
    }
  };

  const stopWebcam = () => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
    }
    mediaStreamRef.current = null;
    setIsWebcamActive(false);
  };

  const capturePhoto = () => {
    if (videoRef.current) {
      const canvas = document.createElement('canvas');
      canvas.width = 300;
      canvas.height = 300;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(videoRef.current, 0, 0, 300, 300);
        const dataUrl = canvas.toDataURL('image/jpeg');
        setEditAvatar(dataUrl);
        stopWebcam();
        window.dispatchEvent(new CustomEvent('toast', { detail: '📸 Identity selfie captured successfully!' }));
      }
    }
  };

  const handleAvatarGallerySelection = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!isSupportedProfileImageFile(file) || file.size <= 0 || file.size > 12 * 1024 * 1024) {
      window.dispatchEvent(new CustomEvent('toast', { detail: 'Choose a supported image under 12 MB.' }));
      return;
    }
    const objectUrl = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 512;
      canvas.height = 512;
      const context = canvas.getContext('2d');
      if (!context) {
        URL.revokeObjectURL(objectUrl);
        window.dispatchEvent(new CustomEvent('toast', { detail: 'This photo could not be prepared. Please try another one.' }));
        return;
      }
      const size = Math.min(image.naturalWidth, image.naturalHeight);
      const left = (image.naturalWidth - size) / 2;
      const top = (image.naturalHeight - size) / 2;
      context.drawImage(image, left, top, size, size, 0, 0, 512, 512);
      setEditAvatar(canvas.toDataURL('image/jpeg', 0.88));
      URL.revokeObjectURL(objectUrl);
    };
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      window.dispatchEvent(new CustomEvent('toast', { detail: 'This photo could not be opened. Please choose another one.' }));
    };
    image.src = objectUrl;
  };

  // Validate and submit profile updates. The one-time grace is enforced again by ProfileService.
  const handleSaveProfile = async () => {
    if (isSavingProfile || showSavedFeedback) return;
    if (!isLoggedIn || auth.currentUser?.uid !== currentUser.id) {
      window.dispatchEvent(new CustomEvent('toast', { detail: 'Sign in to this account before saving profile changes.' }));
      return;
    }

    // 30-day username lock
    if (editUsername !== currentUser.username) {
      const usernameError = validateUsername(editUsername, currentUser.id);
      if (usernameError) {
        window.dispatchEvent(new CustomEvent('toast', { detail: `⚠️ ${usernameError}` }));
        return;
      }

    }

    // Start saving animation & lock controls
    setIsSavingProfile(true);

    try {
      let persistedAvatar = editAvatar;
      let persistedCover = editCover;
      // Cropped/captured photos are data URLs. Upload the binary to R2 instead
      // of writing a large base64 string into the Firestore profile document.
      if (/^data:image\/(?:jpeg|png|webp|gif|avif);base64,/i.test(editAvatar)) {
        const avatarBlob = await fetch(editAvatar).then(response => {
          if (!response.ok) throw new Error('NEXORA could not prepare your profile photo.');
          return response.blob();
        });
        const uploadedAvatar = await uploadProfileMediaWithRetry({
          file: new File([avatarBlob], 'profile-avatar.jpg', { type: avatarBlob.type || 'image/jpeg' }),
          userId: currentUser.id,
          fileName: 'profile-avatar',
          metadata: { purpose: 'profile-avatar' },
        });
        persistedAvatar = uploadedAvatar.downloadUrl;
      }
      if (/^data:image\/(?:jpeg|png|webp|gif|avif);base64,/i.test(editCover)) {
        const coverBlob = await fetch(editCover).then(response => {
          if (!response.ok) throw new Error('NEXORA could not prepare your cover photo.');
          return response.blob();
        });
        const uploadedCover = await uploadProfileMediaWithRetry({
          file: coverBlob,
          userId: currentUser.id,
          fileName: 'profile-cover',
          metadata: { purpose: 'profile-cover' },
        });
        persistedCover = uploadedCover.downloadUrl;
      }

      await onUpdateProfile({
        name: editName,
        username: editUsername,
        bio: editBio,
        location: editLocation,
        website: editWebsite,
        pronouns: editPronouns.trim(), profileCategory: editCategory, creatorType: editCreatorType,
        socialTwitter: editSocialTwitter.trim(), socialInstagram: editSocialInsta.trim(),
        avatar: persistedAvatar,
        coverImage: persistedCover,
      });
      setEditAvatar(persistedAvatar);
      setEditCover(persistedCover);

      localStorage.setItem(`nexora_status_text_${currentUser.id}`, statusText);
      localStorage.setItem(`nexora_status_emoji_${currentUser.id}`, statusEmoji);

      setIsSavingProfile(false);
      setShowSavedFeedback(true);

      const successMsg = '✓ Profile updated successfully';
      window.dispatchEvent(new CustomEvent('toast', { detail: successMsg }));

      // Wait 1.5s for the success message feedback, then transition back smoothly
      setTimeout(() => {
        setShowSavedFeedback(false);
        setActivePanel('profile');
      }, 1500);
    } catch (error) {
      // Preserve the form state and surface only the safe, actionable error.
      console.error('Profile update failed.', error instanceof Error ? error.message : 'Unknown error');
      setIsSavingProfile(false);
      const message = error instanceof Error && error.message.trim()
        ? error.message
        : 'NEXORA could not save your profile. Please try again.';
      window.dispatchEvent(new CustomEvent('toast', { detail: `❌ ${message}` }));
    }
  };

  // Persist each profile field as soon as the user finishes editing it.
  // Media uploads are completed before the public/private profile transaction.
  const saveProfileField = async (updates: Partial<User>): Promise<boolean> => {
    if (!isLoggedIn || auth.currentUser?.uid !== currentUser.id) return false;
    const patch: Partial<User> = { ...updates };

    if (patch.name !== undefined && patch.name !== currentUser.name) {
      const cleanName = patch.name.trim();
      if (!cleanName || cleanName.length > 50) {
        window.dispatchEvent(new CustomEvent('toast', { detail: 'Display name must be between 1 and 50 characters.' }));
        setEditName(currentUser.name);
        return false;
      }
      patch.name = cleanName;
    }
    if (patch.username !== undefined && patch.username !== currentUser.username) {
      const usernameError = validateUsername(patch.username, currentUser.id);
      if (usernameError) {
        window.dispatchEvent(new CustomEvent('toast', { detail: usernameError }));
        setEditUsername(currentUser.username);
        return false;
      }
    }

    const changed = Object.entries(patch).some(([key, value]) =>
      value !== undefined && value !== (currentUser as any)[key]
    );
    if (!changed) return true;
    const fieldKeys = Object.keys(patch);
    if (fieldKeys.some(key => profileFieldSavesRef.current.has(key))) return false;
    fieldKeys.forEach(key => profileFieldSavesRef.current.add(key));
    setSavingProfileFields(previous => new Set([...previous, ...fieldKeys]));

    try {
      await onUpdateProfile(patch);
      setSavedProfileFields(previous => new Set([...previous, ...fieldKeys]));
      window.setTimeout(() => setSavedProfileFields(previous => {
        const next = new Set(previous);
        fieldKeys.forEach(key => next.delete(key));
        return next;
      }), 2500);
      return true;
    } catch (error) {
      const code = (error as { code?: string } | null)?.code;
      const rawMessage = error instanceof Error ? error.message : '';
      const isPermissionFailure = code === 'permission-denied' || /missing or insufficient permissions/i.test(rawMessage);
      const message = isPermissionFailure
        ? 'NEXORA could not save this change right now. Please try again.'
        : rawMessage.trim() || 'NEXORA could not save this profile change. Please try again.';
      window.dispatchEvent(new CustomEvent('toast', { detail: message }));
      return false;
    } finally {
      fieldKeys.forEach(key => profileFieldSavesRef.current.delete(key));
      setSavingProfileFields(previous => {
        const next = new Set(previous);
        fieldKeys.forEach(key => next.delete(key));
        return next;
      });
    }
  };

  const markProfileFieldEdited = (fieldKey: string) => {
    setSavedProfileFields(previous => { const next = new Set(previous); next.delete(fieldKey); return next; });
  };

  const profileFieldSaveAction = (fieldKey: string, onSave: () => Promise<boolean>, changed: boolean) => (
    <button type="button" onClick={() => void onSave()}
      disabled={!changed || isSavingProfile || savingProfileFields.has(fieldKey) || showSavedFeedback}
      className="inline-flex min-h-8 items-center gap-1 rounded-lg border border-violet-400/20 bg-violet-500/10 px-2.5 text-[11px] font-semibold text-violet-200 transition-colors hover:bg-violet-500/20 disabled:cursor-not-allowed disabled:opacity-45">
      {savingProfileFields.has(fieldKey) ? 'Saving…' : savedProfileFields.has(fieldKey) ? <><Check className="h-3.5 w-3.5" /> Saved</> : <><Check className="h-3.5 w-3.5" /> Save</>}
    </button>
  );

  const handleCoverPhotoSelection = (event: React.ChangeEvent<HTMLInputElement>) => {
    const input = event.currentTarget;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    if (!isSupportedProfileImageFile(file) || file.size <= 0 || file.size > 12 * 1024 * 1024) {
      window.dispatchEvent(new CustomEvent('toast', { detail: 'Choose a supported photo (JPG, PNG, WebP, GIF, AVIF or HEIC) under 12 MB.' }));
      return;
    }
    if (!isLoggedIn || auth.currentUser?.uid !== currentUser.id) {
      window.dispatchEvent(new CustomEvent('toast', { detail: 'Sign in to this account before changing its cover photo.' }));
      return;
    }
    setPendingCoverFile(file);
    setPendingCoverPreview(URL.createObjectURL(file));
  };

  const handleSaveCoverPhoto = async () => {
    if (!pendingCoverFile || isSavingCoverPhoto || !isLoggedIn || auth.currentUser?.uid !== currentUser.id) return;
    setIsSavingCoverPhoto(true);
    try {
      const preparedCover = await prepareProfileCoverImage(pendingCoverFile);
      const uploaded = await uploadProfileMediaWithRetry({
        file: preparedCover,
        userId: currentUser.id,
        fileName: 'profile-cover',
        metadata: { purpose: 'profile-cover' },
      });
      await onUpdateProfile({ coverImage: uploaded.downloadUrl });
      setEditCover(uploaded.downloadUrl);
      setPendingCoverFile(null);
      setPendingCoverPreview(null);
      window.dispatchEvent(new CustomEvent('toast', { detail: 'Cover photo uploaded and saved.' }));
    } catch (error) {
      const code = (error as { code?: string } | null)?.code;
      const rawMessage = error instanceof Error ? error.message : '';
      const isPermissionFailure = code === 'permission-denied' || /missing or insufficient permissions/i.test(rawMessage);
      const message = isPermissionFailure
        ? 'NEXORA could not save your cover photo right now. Please try again.'
        : rawMessage.trim() || 'NEXORA could not save your cover photo. Please try again.';
      window.dispatchEvent(new CustomEvent('toast', { detail: message }));
    } finally {
      setIsSavingCoverPhoto(false);
    }
  };

  const hasUnsavedProfileChanges =
    editName !== currentUser.name ||
    editUsername !== currentUser.username ||
    editBio !== currentUser.bio ||
    editLocation !== (currentUser.location || '') ||
    editWebsite !== (currentUser.website || '') ||
    editPronouns !== (currentUser.pronouns || '') ||
    editCategory !== (currentUser.profileCategory || 'Digital Creator') ||
    editCreatorType !== (currentUser.creatorType || 'Premium creator') ||
    editSocialTwitter !== (currentUser.socialTwitter || '') ||
    editSocialInsta !== (currentUser.socialInstagram || '') ||
    editAvatar !== currentUser.avatar ||
    editCover !== (currentUser.coverImage || '') ||
    !!pendingCoverFile;
  const handleCancelEditProfile = () => {
    if (hasUnsavedProfileChanges && !window.confirm('Discard your unsaved profile changes?')) return;
    stopWebcam();
    setEditName(currentUser.name);
    setEditUsername(currentUser.username);
    setEditBio(currentUser.bio);
    setEditLocation(currentUser.location || '');
    setEditWebsite(currentUser.website || '');
    setEditPronouns(currentUser.pronouns || '');
    setEditCategory(currentUser.profileCategory || 'Digital Creator');
    setEditCreatorType(currentUser.creatorType || 'Premium creator');
    setEditSocialTwitter(currentUser.socialTwitter || '');
    setEditSocialInsta(currentUser.socialInstagram || '');
    setEditAvatar(currentUser.avatar);
    setEditCover(currentUser.coverImage || '');
    setPendingCoverFile(null);
    setPendingCoverPreview(null);
    setActivePanel('profile');
    window.dispatchEvent(new CustomEvent('toast', { detail: '❌ Changes cancelled. Nothing was saved.' }));
  };

  // Pinned items filtering
  const pinnedPostIdsList = useMemo(() => currentUser.pinnedPosts || [], [currentUser.pinnedPosts]);
  // The global feed is intentionally paginated; load this author's public posts
  // independently so older profile posts do not disappear just because they are
  // outside the currently loaded home-feed window.
  const myPosts = useMemo(() => [...new Map([...posts, ...authorProfilePosts]
    .filter(post => post && (post.userId === currentUser.id || post.username === currentUser.username))
    .map(post => [post.id, post] as const)).values()]
    .map(post => ({
      ...post,
      username: currentUser.username,
      name: currentUser.name,
      avatar: currentUser.avatar,
      isVerified: currentUser.isVerified,
      comments: (post.comments || []).map(comment => comment.userId === currentUser.id
        ? { ...comment, username: currentUser.username, name: currentUser.name, avatar: currentUser.avatar }
        : comment),
    }))
    .sort((left, right) => Date.parse(String(right.timestamp)) - Date.parse(String(left.timestamp))),
  [posts, authorProfilePosts, currentUser.id, currentUser.username, currentUser.name, currentUser.avatar, currentUser.isVerified]);
  const [, setMetricsUpdateTick] = useState(0);
  
  useEffect(() => {
    const handleDeletePost = (e: Event) => {
      const { postId } = (e as CustomEvent).detail || {};
      if (postId && selectedGridPost?.id === postId) {
        setSelectedGridPost(null);
      }
    };

    const handleMetricsUpdated = (e: Event) => {
      const detail = (e as CustomEvent).detail || {};
      if (detail.userId === currentUser.id) {
        setMetricsUpdateTick(t => t + 1);
      }
    };

    window.addEventListener('nexora-delete-post', handleDeletePost);
    window.addEventListener('nexora-user-metrics-updated', handleMetricsUpdated);
    return () => {
      window.removeEventListener('nexora-delete-post', handleDeletePost);
      window.removeEventListener('nexora-user-metrics-updated', handleMetricsUpdated);
    };
  }, [selectedGridPost, currentUser.id]);

  // Tab filtered items (Media, Voice, Reposts, Sparks, Bookmarks, Archive)
  const getTabContent = () => {
    // Drive profile tabs from the complete author subscription, not the bounded
    // home-feed page. Keep post order and media visible after refresh/pagination.
    const allActive = [...myPosts].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    const userMyPosts = allActive;

    switch (profileTab) {
      case 'media':
        return userMyPosts.filter(p => !p.isArchived && (!!p.image || !!p.images?.length || !!p.videoUrl || !!p.media || !!(p as any).thumbnailUrl || !!(p as any).posterUrl));
      case 'voice':
        return userMyPosts.filter(p => !p.isArchived && (p.isVoice || p.voiceAudioUrl || p.voiceDuration || (p as any).audioUrl || p.content.includes('🎙')));
      case 'reposts':
        return allActive.filter(p => !p.isArchived && ((p as any).isRepost && ((p as any).repostedBy === currentUser.username || (p as any).repostedBy === currentUser.id || p.userId === currentUser.id)));
      case 'sparks':
        return allActive.filter(p => !p.isArchived && (userSparks.includes(p.id) || (p as any).isSparkedByMe));
      case 'bookmarks':
        return isOwnProfile ? allActive.filter(p => !p.isArchived && userBookmarks.includes(p.id)) : [];
      case 'archive':
        return isOwnProfile ? userMyPosts.filter(p => p.isArchived) : [];
      default:
        return userMyPosts.filter(p => !p.isArchived && (!!p.image || !!p.images?.length || !!p.videoUrl || !!p.media || !!(p as any).thumbnailUrl || !!(p as any).posterUrl));
    }
  };

  const filteredTabPosts = useMemo(
    () => getTabContent(),
    [myPosts, profileTab, currentUser.id, currentUser.username, isOwnProfile, userSparks, userBookmarks],
  );
  const orderedGridPosts = useMemo(
    () => [...filteredTabPosts].sort((a, b) => Number(pinnedPostIdsList.includes(b.id)) - Number(pinnedPostIdsList.includes(a.id))),
    [filteredTabPosts, pinnedPostIdsList],
  );

  // Keep the open viewer bound to the latest profile post snapshot so creator view totals stay current.
  useEffect(() => {
    if (!selectedGridPost) return;
    const latestPost = posts.find(post => post.id === selectedGridPost.id);
    if (latestPost && latestPost.views !== selectedGridPost.views) setSelectedGridPost(latestPost);
  }, [posts, selectedGridPost?.id, selectedGridPost?.views]);

  const formatSecondaryStat = (num: number) => {
    if (num === undefined || num === null || isNaN(num)) return '0';
    if (num >= 1000000) {
      const val = num / 1000000;
      const rounded = Math.floor(val * 10) / 10;
      return (rounded % 1 === 0 ? rounded.toFixed(0) : rounded.toFixed(1)) + 'M';
    }
    if (num >= 1000) {
      const val = num / 1000;
      const rounded = Math.floor(val * 10) / 10;
      return (rounded % 1 === 0 ? rounded.toFixed(0) : rounded.toFixed(1)) + 'K';
    }
    return num.toString();
  };

  const getPostsCount = () => {
    return myPosts.filter(p => !p.isArchived).length;
  };

  const getSecondaryMetric = (type: 'sparks' | 'reputation' | 'contributions') => {
    if (type === 'sparks') {
      return formatSecondaryStat(currentUser.sparks || 0);
    }
    if (type === 'reputation') {
      return formatSecondaryStat(currentUser.reputationPoints || 0);
    }
    return formatSecondaryStat(currentUser.contributions ?? currentUser.reputationBreakdown?.contributions ?? 0);
  };
  const reputationStanding = getReputationStanding(Number(currentUser.reputationPoints) || 0);

  return (
    <div className="nx-page-shell nx-profile-shell relative w-full min-h-screen text-white font-sans overflow-x-hidden pb-24">
      
      {/* 1. TOP NAVIGATION ACTION BAR */}
      <div className="nx-page-header nx-profile-topbar sticky top-0 z-40 py-2 px-4 flex items-center justify-between border-b">
        <div className="flex items-center gap-3 relative">
          
          {onCloseProfile && (
            <button 
              onClick={onCloseProfile}
              title="Return to Feed"
              aria-label="Return to feed"
              className="min-h-10 min-w-10 p-2 rounded-xl hover:bg-white/5 text-zinc-400 hover:text-white transition-all cursor-pointer focus-visible:outline-2 focus-visible:outline-violet-300"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}
          
          <div className="relative">
            {isOwnProfile ? (
              <button 
                onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
                aria-expanded={isProfileMenuOpen}
                aria-haspopup="menu"
                className="min-h-10 flex items-center gap-1.5 px-2.5 py-1 rounded-xl hover:bg-white/5 text-xs font-mono font-bold tracking-wider text-zinc-200 uppercase transition-all cursor-pointer select-none border border-white/10 bg-white/3"
              >
                <span>My Profile</span>
                <ChevronDown className={`w-3.5 h-3.5 text-zinc-400 transition-transform duration-300 ${isProfileMenuOpen ? 'rotate-180' : ''}`} />
              </button>
            ) : null}

            <AnimatePresence>
              {isProfileMenuOpen && isOwnProfile && (
                <>
                  {/* Backdrop to dismiss */}
                  <div className="fixed inset-0 z-40 bg-black/40" onClick={() => setIsProfileMenuOpen(false)} />
                  
                  {/* Dropdown Card */}
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    transition={{ duration: 0.2, ease: 'easeOut' }}
                    className="absolute left-0 mt-2 w-56 rounded-2xl bg-[#0c0926] border border-white/10 shadow-md p-2 z-50 overflow-hidden space-y-0.5"
                  >
                    {[
                      { label: 'Profile Settings', action: () => { setActivePanel('edit-profile'); setIsProfileMenuOpen(false); }, icon: Edit3, iconColor: 'text-violet-400' },
                      { label: 'Saved Posts', action: () => { window.dispatchEvent(new CustomEvent('changeTab', { detail: { tab: 'saved' } })); setIsProfileMenuOpen(false); }, icon: Bookmark, iconColor: 'text-yellow-400' },
                      { label: 'Creator Studio', action: () => { window.dispatchEvent(new CustomEvent('changeTab', { detail: { tab: 'creator' } })); setIsProfileMenuOpen(false); }, icon: BarChart2, iconColor: 'text-indigo-400' },
                      { label: 'Privacy', action: () => { setActivePanel('menu'); setSettingsActiveSubPanel('privacy'); setIsProfileMenuOpen(false); }, icon: Lock, iconColor: 'text-teal-400' },
                      { label: 'Share Profile', action: () => { setShowShareModal(true); setIsProfileMenuOpen(false); }, icon: QrCode, iconColor: 'text-indigo-400' },
                      { label: 'Export Account Data', action: () => {
                          setIsProfileMenuOpen(false);
                          void handleAccountExport();
                        }, icon: Download, iconColor: 'text-sky-400' },
                    ].map(item => {
                      const IconComponent = item.icon;
                      return (
                        <button
                          key={item.label}
                          onClick={item.action}
                          className="w-full min-h-10 text-left px-3.5 py-2 hover:bg-white/5 rounded-xl transition-all flex items-center gap-2.5 text-xs font-sans text-zinc-300 hover:text-white cursor-pointer focus-visible:outline-2 focus-visible:outline-violet-300"
                        >
                          <IconComponent className={`w-4 h-4 ${item.iconColor}`} />
                          <span className="font-semibold">{item.label}</span>
                        </button>
                      );
                    })}
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isOwnProfile ? (
            <>
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={() => setShowShareModal(true)}
                className="min-h-10 min-w-10 p-2 rounded-xl hover:bg-white/5 text-zinc-400 hover:text-white transition-all cursor-pointer focus-visible:outline-2 focus-visible:outline-violet-300"
                title="Share Profile"
                aria-label="Share profile"
              >
                <svg viewBox="0 0 24 24" aria-hidden="true" className="h-[21px] w-[21px]" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 15V3m0 0 4.5 4.5M12 3 7.5 7.5" />
                  <path d="M5 12v7a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-7" />
                </svg>
              </motion.button>
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={() => setActivePanel('menu')}
                className="min-h-10 min-w-10 p-2 rounded-xl hover:bg-white/5 text-zinc-400 hover:text-white transition-all cursor-pointer focus-visible:outline-2 focus-visible:outline-violet-300"
                title="Menu"
                aria-label="Open profile menu"
                id="nexora-profile-more-trigger"
              >
                <MoreVertical className="w-5 h-5" />
              </motion.button>
            </>
          ) : (
            <>
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={() => setShowShareModal(true)}
                className="p-2 rounded-xl hover:bg-white/5 text-zinc-400 hover:text-white transition-all cursor-pointer"
                title="Share Profile"
              >
                <Share2 className="w-4.5 h-4.5" />
              </motion.button>
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={() => {
                  const nextState = !isNotificationsEnabled;
                  setIsNotificationsEnabled(nextState);
                  localStorage.setItem(`nexora_notify_${currentUser.id}`, String(nextState));
                  window.dispatchEvent(new CustomEvent('toast', { detail: nextState ? `🔔 Notifications enabled for @${currentUser.username}` : `🔕 Notifications disabled for @${currentUser.username}` }));
                }}
                className="p-2 rounded-xl hover:bg-white/5 text-zinc-400 hover:text-white transition-all cursor-pointer"
                title={isNotificationsEnabled ? "Mute Notifications" : "Enable Notifications"}
              >
                {isNotificationsEnabled ? <Bell className="w-4.5 h-4.5 text-violet-400" /> : <BellOff className="w-4.5 h-4.5 text-zinc-400" />}
              </motion.button>
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={() => setActivePanel('other-profile-menu')}
                className="p-2 rounded-xl hover:bg-white/5 text-zinc-400 hover:text-white transition-all cursor-pointer"
                title="More Options"
              >
                <MoreVertical className="w-4.5 h-4.5" />
              </motion.button>
            </>
          )}
        </div>
      </div>

      {/* 2. PROFILE HEADER (COMPRESSED) */}
      <div className="nx-profile-main w-full max-w-4xl mx-auto px-2.5 sm:px-4 md:px-6 pt-0 sm:pt-0.5 pb-0.5 text-left">
        
          {/* Profile Completion Prompts */}
          {false && isOwnProfile && (
            <div className="nx-profile-completion mb-4 p-4 bg-violet-950/40 border border-white/10 rounded-2xl space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold text-violet-300 uppercase tracking-wider">Complete your profile</span>
                <span className="text-[10px] font-mono text-zinc-400">
                  {[
                    currentUser.name && currentUser.name !== 'New User',
                    currentUser.username,
                    currentUser.bio,
                    currentUser.avatar && !currentUser.avatar.includes('photo-1535713875002-d1d0cf377fde')
                  ].filter(Boolean).length}/4 completed
                </span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-violet-600 to-purple-400 transition-[width] duration-500"
                  style={{ width: `${([
                    currentUser.name && currentUser.name !== 'New User',
                    currentUser.username,
                    currentUser.bio,
                    currentUser.avatar && !currentUser.avatar.includes('photo-1535713875002-d1d0cf377fde')
                  ].filter(Boolean).length / 4) * 100}%` }}
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
                {(!currentUser.avatar || currentUser.avatar.includes('photo-1535713875002-d1d0cf377fde')) && (
                  <button
                    onClick={() => setActivePanel('edit-profile')}
                    className="p-2.5 bg-black/40 hover:bg-black/60 border border-white/10 rounded-xl text-left transition-all cursor-pointer flex items-center justify-between group"
                  >
                    <span className="text-xs text-zinc-200 font-medium">Add your profile photo</span>
                    <span className="text-violet-400 font-mono text-xs group-hover:translate-x-0.5 transition-transform">→</span>
                  </button>
                )}
                {(!currentUser.name || currentUser.name === 'New User') && (
                  <button
                    onClick={() => setActivePanel('edit-profile')}
                    className="p-2.5 bg-black/40 hover:bg-black/60 border border-white/10 rounded-xl text-left transition-all cursor-pointer flex items-center justify-between group"
                  >
                    <span className="text-xs text-zinc-200 font-medium">Set your display name</span>
                    <span className="text-violet-400 font-mono text-xs group-hover:translate-x-0.5 transition-transform">→</span>
                  </button>
                )}
                {!currentUser.username && (
                  <button
                    onClick={() => setActivePanel('edit-profile')}
                    className="p-2.5 bg-black/40 hover:bg-black/60 border border-white/10 rounded-xl text-left transition-all cursor-pointer flex items-center justify-between group"
                  >
                    <span className="text-xs text-zinc-200 font-medium">Choose your username</span>
                    <span className="text-violet-400 font-mono text-xs group-hover:translate-x-0.5 transition-transform">→</span>
                  </button>
                )}
                {!currentUser.bio && (
                  <button
                    onClick={() => setActivePanel('edit-profile')}
                    className="p-2.5 bg-black/40 hover:bg-black/60 border border-white/10 rounded-xl text-left transition-all cursor-pointer flex items-center justify-between group"
                  >
                    <span className="text-xs text-zinc-200 font-medium">Write your bio</span>
                    <span className="text-violet-400 font-mono text-xs group-hover:translate-x-0.5 transition-transform">→</span>
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Profile cover with compact avatar anchored over its lower edge. */}
          <div className="nx-profile-cover relative h-40 sm:h-52 overflow-visible rounded-none border-0 bg-[#100B25]">
            {currentUser.coverImage ? (
              <img src={normalizeMediaDeliveryUrl(currentUser.coverImage)} alt="" onError={retryProfileMediaLoad} className="h-full w-full rounded-none object-cover" />
            ) : (
              <div className="h-full w-full rounded-none bg-gradient-to-br from-[#25105a] via-[#120d2b] to-[#070914]" />
            )}
            <div className="absolute inset-0 rounded-none bg-gradient-to-b from-black/35 via-transparent to-black/35 pointer-events-none" />
            {isOwnProfile && <button type="button" onClick={() => setActivePanel('edit-profile')} className="absolute right-3 bottom-3 z-10 rounded-xl border border-white/15 bg-black/55 px-3 py-2 text-[10px] font-bold text-white backdrop-blur-md hover:bg-black/75"><Camera className="mr-1.5 inline h-3.5 w-3.5" /> Edit cover</button>}
            <div className="absolute left-4 -bottom-7">
              <div className="relative">
                {currentUser.hasStory && <div className="absolute -inset-1 rounded-full bg-gradient-to-tr from-violet-500 via-violet-400 to-indigo-500 blur-[2px] opacity-75" />}
                <button type="button" onClick={() => setProfilePicExpanded(true)} aria-label="View profile photo" className="relative z-10 h-[5.5rem] w-[5.5rem] sm:h-28 sm:w-28 rounded-full border-[3px] border-[#080617] bg-black overflow-visible shadow-lg cursor-zoom-in focus-visible:outline-2 focus-visible:outline-violet-300 focus-visible:outline-offset-4">
                  <img src={normalizeMediaDeliveryUrl(currentUser.avatar)} onError={retryProfileMediaLoad} className="h-full w-full rounded-full object-cover" alt="" referrerPolicy="no-referrer" />
                  {profileFrameAsset && <img src={profileFrameAsset.path} alt="" aria-hidden="true" className="pointer-events-none absolute -inset-[6px] z-20 h-[calc(100%+12px)] w-[calc(100%+12px)] object-contain" />}
                </button>
                {isOwnProfile && (
                  <button
                    type="button"
                    onClick={() => { setAvatarSourceType('select'); setIsAvatarModalOpen(true); }}
                    aria-label="Change profile photo"
                    title="Change profile photo"
                    className="absolute bottom-0 right-0 z-30 flex h-7 w-7 items-center justify-center rounded-full border-2 border-[#080617] bg-violet-600 text-white shadow-lg transition-colors hover:bg-violet-500 focus-visible:outline-2 focus-visible:outline-violet-200 focus-visible:outline-offset-2"
                  >
                    <Camera className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Profile Identity Header (Stage 2 Redesign) */}
          <div className="nx-profile-identity flex flex-col space-y-1.5 sm:space-y-2 text-left mb-1 pt-9">
            {/* Identity & Action Bar */}
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <h1 className={`text-xl sm:text-2xl font-black leading-tight tracking-tight ${!currentUser.name ? 'text-violet-400/70 italic text-base' : 'text-white'}`}>
                      {currentUser.name || (isOwnProfile ? 'Set your display name' : 'Member')}
                    </h1>
                    {profileBadgeAsset && <img src={profileBadgeAsset.path} alt="Creator badge" title={profileBadgeAsset.title} className="h-5 w-5 shrink-0 object-contain" />}
                  </div>
                  <div className="mt-1 flex min-w-0 items-center gap-1.5">
                    <p className={`min-w-0 truncate text-xs sm:text-sm font-bold font-mono tracking-wider ${!currentUser.username ? 'text-violet-400/60 italic' : 'text-violet-300'}`}>
                      @{currentUser.username || (isOwnProfile ? 'add-username' : 'member')}
                    </p>
                    {(identityVerification || currentUser.earlyCommunityMember) && <PurpleVerifiedBadge className="h-3.5 w-3.5 shrink-0" type={currentUser.earlyCommunityMember ? 'leader' : identityBadgeType} />}
                  </div>
              </div>

              {/* Keep owner controls in the identity row; visitor actions get a full-width, balanced row below. */}
              {isOwnProfile && (
                <div className="shrink-0">
                  <button
                    type="button"
                    onClick={() => setActivePanel('edit-profile')}
                    className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-violet-300/25 bg-violet-500/10 px-3.5 py-2 text-xs font-bold text-violet-100 shadow-sm transition-all hover:border-violet-300/40 hover:bg-violet-500/20 focus-visible:outline-2 focus-visible:outline-violet-200 focus-visible:outline-offset-2"
                    title="Edit profile details and photos"
                    aria-label="Edit profile"
                  >
                    <Edit3 className="h-3.5 w-3.5" />
                    <span>Edit profile</span>
                  </button>
                </div>
              )}
            </div>

            {!isOwnProfile && (
              <div className="mt-3 grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] gap-2" aria-label="Profile actions">
                <button
                  type="button"
                  onClick={() => onToggleFollow?.(currentUser.id)}
                  aria-pressed={isFollowing}
                  className={`flex min-h-11 min-w-0 items-center justify-center gap-2 rounded-xl px-3 text-xs font-bold transition-all focus-visible:outline-2 focus-visible:outline-violet-300 focus-visible:outline-offset-2 ${
                    isFollowing
                      ? 'border border-white/12 bg-white/[0.06] text-zinc-100 hover:bg-white/[0.1]'
                      : 'border border-violet-400/30 bg-violet-600 text-white shadow-[0_5px_18px_rgba(113,56,255,0.2)] hover:bg-violet-500'
                  }`}
                >
                  {isFollowing ? <UserCheck className="h-4 w-4 shrink-0" /> : <UserPlus className="h-4 w-4 shrink-0" />}
                  <span className="truncate">{isFollowing ? 'Following' : 'Follow'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => onStartChat?.(currentUser.id)}
                  disabled={!onStartChat}
                  className="flex min-h-11 min-w-0 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.045] px-3 text-xs font-bold text-zinc-100 transition-colors hover:border-violet-300/25 hover:bg-violet-500/10 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-violet-300 focus-visible:outline-offset-2"
                >
                  <MessageCircle className="h-4 w-4 shrink-0" />
                  <span className="truncate">Message</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowGiftVerse(true)}
                  aria-label={`Send a gift to @${currentUser.username || 'member'}`}
                  title="Send a gift"
                  className="flex min-h-11 min-w-11 items-center justify-center gap-1.5 rounded-xl border border-violet-300/20 bg-violet-500/10 px-3 text-violet-200 transition-colors hover:border-violet-300/35 hover:bg-violet-500/20 focus-visible:outline-2 focus-visible:outline-violet-300 focus-visible:outline-offset-2"
                >
                  <Gift className="h-4 w-4" />
                  <span className="hidden text-xs font-bold sm:inline">Gift</span>
                </button>
              </div>
            )}

            {currentUser.website && (() => { const href = /^https?:\/\//i.test(currentUser.website) ? currentUser.website : 'https://' + currentUser.website; return <a href={href} target="_blank" rel="noopener noreferrer" className="inline-flex max-w-full items-center gap-1.5 text-xs text-violet-300 underline-offset-4 hover:text-violet-200 hover:underline"><LinkIcon className="h-3.5 w-3.5 shrink-0" /><span className="truncate">{currentUser.website}</span></a>; })()}
            {(currentUser.location || currentUser.pronouns) && <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-zinc-400">{currentUser.location && <span><MapPin className="mr-1 inline h-3 w-3" />{currentUser.location}</span>}{currentUser.pronouns && <span>{currentUser.pronouns}</span>}</div>}
            {(currentUser.profileCategory || currentUser.creatorType) && <p className="text-[10px] font-semibold uppercase tracking-wider text-violet-300">{[currentUser.profileCategory, currentUser.creatorType].filter(Boolean).join(' · ')}</p>}
            {(currentUser.socialTwitter || currentUser.socialInstagram) && <div className="flex flex-wrap gap-3 text-[11px]">{currentUser.socialTwitter && <a href={/^https?:\/\//i.test(currentUser.socialTwitter) ? currentUser.socialTwitter : 'https://' + currentUser.socialTwitter.replace(/^@/, '')} target="_blank" rel="noopener noreferrer" className="text-violet-300 hover:text-violet-200 hover:underline">X / Twitter</a>}{currentUser.socialInstagram && <a href={/^https?:\/\//i.test(currentUser.socialInstagram) ? currentUser.socialInstagram : 'https://instagram.com/' + currentUser.socialInstagram.replace(/^@/, '')} target="_blank" rel="noopener noreferrer" className="text-violet-300 hover:text-violet-200 hover:underline">Instagram</a>}</div>}
            {((currentUser.skills || []).length > 0 || Object.keys(currentUser.interestDNA || {}).length > 0) && <div className="flex flex-wrap gap-1.5 pt-1">{[...(currentUser.skills || []), ...Object.keys(currentUser.interestDNA || {}).sort((a,b) => (currentUser.interestDNA[b] || 0) - (currentUser.interestDNA[a] || 0))].filter((value,index,array) => value && array.indexOf(value) === index).slice(0,6).map(item => <span key={item} className="rounded-full border border-violet-400/15 bg-violet-500/10 px-2.5 py-1 text-[10px] font-medium text-violet-200">{item}</span>)}</div>}
            {/* Nexora profile statistics: two rows, one central rule, short column separators */}
            <div className="nx-profile-stats mx-auto mt-2 grid w-full max-w-xl grid-cols-3 text-center sm:mt-3">
              {[
                { label: 'Followers', value: formatSecondaryStat(currentUser.followers || 0) },
                { label: 'Following', value: formatSecondaryStat(currentUser.following || 0) },
                { label: 'Posts', value: formatSecondaryStat(getPostsCount()) },
              ].map((stat, index) => (
                <button key={stat.label} type="button" onClick={() => { if (stat.label === 'Followers' || stat.label === 'Following') { setRelationsTab(stat.label === 'Followers' ? 'followers' : 'following'); setActivePanel('social-graph'); } else setProfileTab('media'); }} className="relative flex min-w-0 flex-col gap-0.5 bg-transparent px-1 py-2 text-center transition-colors hover:bg-violet-500/[0.06] focus-visible:outline-2 focus-visible:outline-violet-300 focus-visible:outline-offset-[-2px]">
                  <span className="text-sm font-black leading-tight text-white sm:text-base">{stat.value}</span>
                  <span className="text-[10px] font-medium leading-tight text-zinc-300 sm:text-xs">{stat.label}</span>
                  {index < 2 && <span aria-hidden="true" className="pointer-events-none absolute right-0 top-1/2 h-4 w-px -translate-y-1/2 bg-white/10" />}
                </button>
              ))}
              <div aria-hidden="true" className="col-span-3 h-px bg-white/10" />
              {[
                { label: 'Sparks', value: getSecondaryMetric('sparks') },
                { label: 'Reputation', value: getSecondaryMetric('reputation') },
                { label: 'Contributions', value: getSecondaryMetric('contributions') },
              ].map((stat, index) => (
                <button key={stat.label} type="button" onClick={() => { if (stat.label === 'Sparks') setProfileTab('sparks'); }} className="relative flex min-w-0 flex-col gap-0.5 bg-transparent px-1 py-2 text-center transition-colors hover:bg-violet-500/[0.06] focus-visible:outline-2 focus-visible:outline-violet-300 focus-visible:outline-offset-[-2px]">
                  <span className="text-sm font-black leading-tight text-white sm:text-base">{stat.value}</span>
                  <span className="text-[10px] font-medium leading-tight text-zinc-300 sm:text-xs">{stat.label}</span>
                  {index < 2 && <span aria-hidden="true" className="pointer-events-none absolute right-0 top-1/2 h-4 w-px -translate-y-1/2 bg-white/10" />}
                </button>
              ))}
            </div>

            {/* Collapsible Bio */}
            <div className="text-zinc-300 text-xs leading-relaxed pt-1 sm:pt-2">
              <motion.div 
                animate={{ height: isBioExpanded ? "auto" : "2.6rem" }} 
                className="overflow-hidden relative"
                transition={{ duration: 0.25, ease: "easeInOut" }}
              >
                <p className={`whitespace-pre-wrap ${!currentUser.bio ? 'text-zinc-500 italic' : 'text-zinc-300'}`}>
                  {currentUser.bio || (isOwnProfile ? 'Add a bio to complete your profile' : 'No bio provided.')}
                </p>
              </motion.div>
              {currentUser.bio && (currentUser.bio.length > 70 || currentUser.bio.split('\n').length > 2) && (
                <button 
                  onClick={() => setIsBioExpanded(!isBioExpanded)} 
                  className="text-violet-400 font-bold mt-0.5 text-[10px] hover:text-violet-300 transition-colors cursor-pointer flex items-center gap-1"
                >
                  <span>{isBioExpanded ? 'Show less' : 'Show more'}</span>
                  <ChevronDown className={`w-3 h-3 transition-transform ${isBioExpanded ? 'rotate-180' : ''}`} />
                </button>
              )}
            </div>

          </div>

          {/* Profile content navigation */}
          <div role="group" aria-label="Profile content views" className="nx-profile-tabbar sticky top-0 nx-glass z-30 border-y border-white/10 mt-4 px-0 w-full">
            <div className="nx-profile-tabs-track mx-auto flex w-full min-w-0 items-center gap-2 overflow-x-auto px-2 py-2 sm:justify-center">
              {[
                { id: 'media', label: 'Posts', icon: Camera },
                { id: 'voice', label: 'Voice', icon: Mic },
                { id: 'reposts', label: 'Reposts', icon: Repeat2 },
                { id: 'sparks', label: 'Sparks', icon: Zap },
                { id: 'gifts', label: 'Gifts', icon: Award },
                ...(isOwnProfile ? [
                  { id: 'bookmarks', label: 'Saved', icon: Bookmark },
                  { id: 'archive', label: 'Archive', icon: HardDrive }
                ] : [])
              ].map(tab => {
                const Icon = tab.icon;
                const isActive = profileTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setProfileTab(tab.id)}
                    aria-label={tab.label}
                    aria-pressed={isActive}
                    title={tab.label}
                    className={`min-h-11 min-w-[88px] shrink-0 flex justify-center items-center gap-2 rounded-xl border px-3 py-2 transition-all cursor-pointer focus-visible:outline-violet-300 ${
                      isActive
                        ? 'border-violet-300/40 bg-violet-500/20 text-white shadow-[inset_0_0_0_1px_rgba(167,139,250,0.12)]'
                        : 'border-white/[0.06] bg-white/[0.025] text-zinc-300 hover:border-violet-300/25 hover:bg-white/[0.06] hover:text-white'
                    }`}
                  >
                    <Icon className={`w-5 h-5 shrink-0 ${isActive ? 'text-violet-200' : 'text-zinc-400'}`} aria-hidden="true" />
                    <span className="text-[11px] sm:text-xs font-semibold tracking-normal">{tab.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Profile Tab Content Area */}
          <div
            onTouchStart={handleContentTouchStart}
            onTouchEnd={handleContentTouchEnd}
            className="nx-profile-content w-full pt-4 space-y-4 bg-black min-h-[350px] touch-pan-y"
          >
            {profileTab === 'sparks' && isOwnProfile && (
              <section className="w-full max-w-4xl mx-auto px-3 space-y-3">
                <div>
                  <h3 className="text-sm font-bold text-white">People who sparked your posts</h3>
                  <p className="text-xs text-zinc-500 mt-1">These are saved to your profile, not just your notifications.</p>
                </div>
                {receivedSparks.length === 0 ? (
                  <p className="rounded-xl border border-white/5 bg-white/[0.02] p-4 text-xs text-zinc-500">No one has sparked your posts yet.</p>
                ) : (
                  <div className="space-y-2">
                    {receivedSparks.map(spark => (
                      <button key={spark.id} type="button" onClick={() => onViewProfile?.(spark.fromUserId)} className="w-full flex items-center gap-3 rounded-xl border border-white/5 bg-white/[0.025] p-3 text-left hover:bg-white/[0.05]">
                        <img src={spark.avatar || getDefaultAvatar(spark.fromUserId)} alt="" className="h-9 w-9 rounded-full object-cover" />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-semibold text-white">{spark.name || spark.username || 'NEXORA member'}</span>
                          <span className="block truncate text-xs text-zinc-500">@{spark.username || 'member'} sparked your post</span>
                        </span>
                        <Zap className="h-4 w-4 shrink-0 text-violet-400" />
                      </button>
                    ))}
                  </div>
                )}
              </section>
            )}
            {profileTab === 'gifts' ? <CreatorGiftGallery userId={currentUser.id} isOwner={auth.currentUser?.uid === currentUser.id} onExplore={() => setShowGiftVerse(true)} /> : profileTab === 'sparks' && isOwnProfile ? null : filteredTabPosts.length === 0 ? (
              <div className="p-8 py-16 rounded-2xl bg-white/[0.01] border border-white/5 text-center space-y-3 max-w-md mx-auto my-6">
                <div className="w-12 h-12 rounded-2xl bg-violet-600/10 border border-white/10 flex items-center justify-center mx-auto text-violet-400">
                  {profileTab === 'media' && <Camera className="w-6 h-6" />}
                  {profileTab === 'voice' && <Mic className="w-6 h-6" />}
                  {profileTab === 'reposts' && <Repeat2 className="w-6 h-6" />}
                  {profileTab === 'sparks' && <Zap className="w-6 h-6" />}
                  {profileTab === 'bookmarks' && <Bookmark className="w-6 h-6" />}
                  {profileTab === 'archive' && <HardDrive className="w-6 h-6" />}
                </div>
                <div>
                  <h4 className="text-sm font-bold text-zinc-200">{profileTab === 'media' ? 'No posts yet' : profileTab === 'voice' ? 'No voice posts yet' : profileTab === 'reposts' ? 'No reposts yet' : profileTab === 'sparks' ? 'No sparks yet' : profileTab === 'bookmarks' ? 'No saved posts yet' : 'No archived posts yet'}</h4>
                  <p className="text-xs text-zinc-500 max-w-sm mx-auto mt-1 leading-relaxed">
                    {profileTab === 'media' && 'Published visual media and videos will appear here.'}
                    {profileTab === 'voice' && 'Recorded voice pulses and audio broadcasts will appear here.'}
                    {profileTab === 'reposts' && 'Content reposted by this creator will appear here.'}
                    {profileTab === 'sparks' && "Posts you've sparked will appear here."}
                    {profileTab === 'bookmarks' && 'Saved bookmarks and favorite posts will appear here.'}
                    {profileTab === 'archive' && 'Your archived posts will appear here.'}
                  </p>
                </div>
              </div>
            ) : (
              <div className="nx-profile-media-grid-bleed w-full max-w-[1040px] mx-auto px-0">
                <MediaGrid 
                  gridPosts={orderedGridPosts} 
                  pinnedPostIds={pinnedPostIdsList} 
                  onSelectPost={(post) => setSelectedGridPost(post)}
                  repairVideoPosters={isOwnProfile && isLoggedIn}
                  ownerId={currentUser.id}
                />
              </div>
            )}
          </div>
        
        {/* 6. ADVANCED SLIDE-OUT DRAWER MENU ☰ (Progressive Disclosure - Redesigned Settings & Privacy Hub) */}
      <AnimatePresence>
        {activePanel === 'other-profile-menu' && !isOwnProfile && (
          <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex justify-end" onClick={() => setActivePanel('profile')}>
            <motion.div
              initial={reduceMotion ? false : { x: "100%", opacity: 0 }}
              animate={reduceMotion ? { opacity: 1 } : { x: 0, opacity: 1 }}
              exit={reduceMotion ? { opacity: 0 } : { x: "100%", opacity: 0 }}
              transition={reduceMotion ? { duration: 0 } : { type: "spring", damping: 30, stiffness: 300 }}
              className="w-full max-w-sm h-full bg-[#080614] border-l border-white/10 p-5 overflow-y-auto space-y-5 text-left flex flex-col justify-between"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="space-y-4 shrink-0">
                <div className="flex items-center justify-between border-b border-white/5 pb-3">
                  <h3 className="text-xs font-mono text-zinc-300 font-black uppercase tracking-wider">Profile settings</h3>
                  <button
                    type="button"
                    onClick={() => setActivePanel('profile')}
                    className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white transition-all"
                    aria-label="Close profile options"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={() => {
                      void navigator.clipboard.writeText(`https://nexora.app/@${currentUser.username}`);
                      window.dispatchEvent(new CustomEvent('toast', { detail: 'Profile link copied to clipboard.' }));
                      setActivePanel('profile');
                    }}
                    className="w-full text-left p-4 rounded-2xl bg-white/[0.02] hover:bg-white/[0.05] transition-all flex items-center gap-3"
                  >
                    <LinkIcon className="w-5 h-5 text-zinc-400" />
                    <div className="space-y-0.5">
                      <span className="block text-sm font-semibold text-white">Copy profile link</span>
                      <span className="block text-xs text-zinc-500 font-mono">Copy this profile link</span>
                    </div>
                  </button>
                  {!isOwnProfile && (
                    <>
                      <button
                        type="button"
                        onClick={() => { void handleBlockProfile(); }}
                        disabled={isSafetyActionBusy}
                        className="w-full text-left p-4 rounded-2xl bg-red-500/5 hover:bg-red-500/10 disabled:opacity-50 transition-all flex items-center gap-3"
                      >
                        <Ban className="w-5 h-5 text-red-400" />
                        <div className="space-y-0.5">
                          <span className="block text-sm font-semibold text-red-400">{blockedUsers.includes(currentUser.id) ? 'Unblock User' : 'Block User'}</span>
                          <span className="block text-xs text-red-400/60 font-mono">Persist this account in your safety preferences</span>
                        </div>
                      </button>
                      <button
                        type="button"
                        onClick={() => { void handleMuteAccount(currentUser.id, !mutedUsers.includes(currentUser.id)); }}
                        disabled={isSafetyActionBusy}
                        className="w-full text-left p-4 rounded-2xl bg-white/[0.02] hover:bg-white/[0.05] disabled:opacity-50 transition-all flex items-center gap-3"
                      >
                        <VolumeX className="w-5 h-5 text-violet-400" />
                        <div className="space-y-0.5">
                          <span className="block text-sm font-semibold text-white">{mutedUsers.includes(currentUser.id) ? 'Unmute User' : 'Mute User'}</span>
                          <span className="block text-xs text-zinc-500 font-mono">Show more posts from this creator</span>
                        </div>
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsReportModalOpen(true)}
                        className="w-full text-left p-4 rounded-2xl bg-red-500/5 hover:bg-red-500/10 transition-all flex items-center gap-3"
                      >
                        <Flag className="w-5 h-5 text-red-400" />
                        <div className="space-y-0.5">
                          <span className="block text-sm font-semibold text-red-400">Report User</span>
                          <span className="block text-xs text-red-400/60 font-mono">Report this profile</span>
                        </div>
                      </button>
                    </>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        )}

        {activePanel === 'menu' && (
          <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex justify-end" onClick={() => { setActivePanel('profile'); setSettingsActiveSubPanel('main'); setSettingsSearchQuery(''); }}>
            <motion.div
              initial={reduceMotion ? false : { x: "100%", opacity: 0 }}
              animate={reduceMotion ? { opacity: 1 } : { x: 0, opacity: 1 }}
              exit={reduceMotion ? { opacity: 0 } : { x: "100%", opacity: 0 }}
              transition={reduceMotion ? { duration: 0 } : { type: "spring", damping: 30, stiffness: 300 }}
              className="w-full max-w-md h-full bg-[#080614] border-l border-white/10 p-5 overflow-y-auto space-y-5 text-left flex flex-col justify-between"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="space-y-4 shrink-0">
                {/* Header Row */}
                <div className="flex items-center justify-between border-b border-white/5 pb-3">
                  <div className="flex items-center gap-2">
                    <Settings className={`w-5 h-5 text-violet-400 ${reduceMotion ? '' : 'animate-spin'}`} style={reduceMotion ? undefined : { animationDuration: '10s' }} />
                    <div>
                      <span className="text-[10px] font-mono text-zinc-400 font-extrabold tracking-widest uppercase block leading-none">NEXORA SYSTEM</span>
                      <h3 className="text-xs font-mono text-violet-300 font-black uppercase tracking-wider">SETTINGS & PRIVACY HUB</h3>
                    </div>
                  </div>
                  <button 
                    onClick={() => { setActivePanel('profile'); setSettingsActiveSubPanel('main'); setSettingsSearchQuery(''); }}
                    className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white transition-all"
                  >
                    <X className="w-4.5 h-4.5" />
                  </button>
                </div>

                {/* Instant Search in Settings */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                  <input
                    type="text"
                    placeholder="Search settings, privacy, security..."
                    value={settingsSearchQuery}
                    onChange={(e) => setSettingsSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-8 py-2.5 bg-black/40 border border-white/10 rounded-xl text-xs font-sans text-white focus:outline-hidden focus:border-violet-500 transition-all font-medium placeholder-zinc-500"
                  />
                  {settingsSearchQuery && (
                    <button 
                      onClick={() => setSettingsSearchQuery('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white text-xs font-mono font-bold"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>

              {/* Scrollable Settings Content */}
              <div className="flex-1 overflow-y-auto py-2 space-y-4 pr-1 scrollbar-thin">
                {settingsSearchQuery ? (
                  /* Search Results Panel */
                  <div className="space-y-2">
                    <span className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest block pl-1">SEARCH RESULTS</span>
                    {(() => {
                      const items = [
                        { id: 'edit-profile', title: 'Edit Profile Details', desc: 'Calibrate username, display name, pronouns, and bio', panel: 'account' },
                        { id: 'switch-account', title: 'Switch / Add Account', desc: 'Register other user accounts and toggle active sessions', panel: 'account' },
                        { id: 'private-node', title: 'Private Account', desc: 'Only approved followers can see your posts', panel: 'privacy' },
                        { id: 'comments-audience', title: 'Comments & Interactions', desc: 'Configure who is permitted to comment on your posts', panel: 'privacy' },
                        { id: 'mentions-audience', title: 'Mentions & Tags Visibility', desc: 'Control who can mention or tag you in threads', panel: 'privacy' },
                        { id: 'blocked-muted', title: 'Blocked & Muted Connections', desc: 'Manage blocked or muted accounts and unblock users', panel: 'privacy' },
                        { id: 'change-password', title: 'Change Account Password', desc: 'Rotate password credentials with full security audits', panel: 'security' },
                        { id: 'two-factor', title: 'Two-Factor Authentication (2FA)', desc: 'Add another sign-in check with a verification code', panel: 'security' },
                        { id: 'passkeys', title: 'Passkeys Sign-On', desc: 'Configure secure biometric face or thumbprint lock registers', panel: 'security' },
                        { id: 'sessions-log', title: 'Recent Login Activity', desc: 'Review active browser locations and log out individual devices', panel: 'security' },
                        { id: 'notification-toggles', title: 'Push Alerts Toggles', desc: 'Adjust sparks, comments, direct messages alert modes', panel: 'notifications' },
                        { id: 'appearance-theme', title: 'Theme Customization', desc: 'Switch Violet, Emerald Glass, or Stealth Dark modes', panel: 'appearance' },
                        { id: 'accent-color', title: 'Accent Colors Selector', desc: 'Customize glows with glowing neon highlights', panel: 'appearance' },
                        { id: 'text-size', title: 'Typography Text Sizing', desc: 'Adjust text sizes dynamically across the canvas', panel: 'appearance' },
                        { id: 'clear-cache', title: 'Clear Cache Tool', desc: 'Free temporary mesh asset store and logs', panel: 'storage' },
                        { id: 'data-saver', title: 'Data Saver Mode', desc: 'Compress high-resolution multimedia files', panel: 'storage' },
                        { id: 'support-ticket', title: 'Send Feedback & Support', desc: 'Connect to our technical help support lines', panel: 'support' },
                        { id: 'about-matrix', title: 'About NEXORA', description: 'Review system status and terms', panel: 'about' }
                      ];

                      const filtered = items.filter(item => 
                        item.title.toLowerCase().includes(settingsSearchQuery.toLowerCase()) ||
                        item.desc.toLowerCase().includes(settingsSearchQuery.toLowerCase())
                      );

                      if (filtered.length === 0) {
                        return (
                          <div className="text-center py-10 bg-black/20 rounded-2xl border border-white/5 p-4">
                            <AlertTriangle className="w-8 h-8 text-amber-500 mx-auto mb-2 opacity-80" />
                            <p className="text-xs font-mono text-zinc-400">No settings found matching "{settingsSearchQuery}"</p>
                            <p className="text-[10px] text-zinc-600 mt-1">Try keywords like "password", "theme", "cache" or "privacy"</p>
                          </div>
                        );
                      }

                      return filtered.map(item => (
                        <button
                          key={item.id}
                          onClick={() => {
                            setSettingsActiveSubPanel(item.panel as any);
                            setSettingsSearchQuery('');
                          }}
                          className="w-full text-left p-3.5 rounded-2xl bg-[#0e0c24] border border-white/10 hover:border-white/10 transition-all flex items-start gap-3 group"
                        >
                          <div className="p-2 rounded-xl bg-violet-600/10 text-violet-400 group-hover:bg-violet-600/20">
                            <Sliders className="w-4 h-4" />
                          </div>
                          <div className="space-y-0.5">
                            <h4 className="text-xs font-bold text-white flex items-center gap-1">
                              {item.title} <span className="text-[8px] font-mono px-1 bg-white/5 rounded text-violet-300">In {item.panel.toUpperCase()}</span>
                            </h4>
                            <p className="text-[10px] text-zinc-400 font-sans leading-normal">{item.desc}</p>
                          </div>
                        </button>
                      ));
                    })()}
                  </div>
                ) : settingsActiveSubPanel === 'main' ? (
                  /* Main List view of Settings */
                  <div className="space-y-5">
                    
                    {/* User profile brief */}
                    <div className="p-3.5 rounded-2xl bg-linear-to-tr from-[#130f3c]/90 to-[#0c0926]/90 border border-white/10 flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <img src={normalizeMediaDeliveryUrl(currentUser.avatar)} className="w-10 h-10 rounded-xl object-cover border border-white/10" alt="" />
                        <div className="leading-tight">
                          <p className="text-xs font-bold text-white flex items-center gap-1">
                            {currentUser.name} {(identityVerification || currentUser.earlyCommunityMember) && <PurpleVerifiedBadge className="h-3.5 w-3.5" type={currentUser.earlyCommunityMember ? 'leader' : identityBadgeType} />}
                          </p>
                          <p className="text-[10px] font-mono text-violet-400">@{currentUser.username}</p>
                        </div>
                      </div>
                      <span className="text-[8px] font-mono bg-violet-500/25 text-violet-300 px-2 py-1 rounded-full font-extrabold uppercase">ACTIVE</span>
                    </div>

                    {/* Section 2: Grouped Directories */}
                    <div className="space-y-4">
                      
                      {/* Account Category */}
                      <div className="space-y-1">
                        <p className="text-[9px] font-mono uppercase text-zinc-500 tracking-widest pl-2">Account Administration</p>
                        <div className="rounded-2xl bg-black/40 border border-white/5 overflow-hidden divide-y divide-white/5">
                          <button 
                            onClick={() => setSettingsActiveSubPanel('account')}
                            className="w-full p-3 flex items-center justify-between text-xs hover:bg-white/5 font-sans font-bold transition-all text-zinc-300 hover:text-white"
                          >
                            <span className="flex items-center gap-2.5">
                              <Edit3 className="w-4 h-4 text-violet-400" />
                              <div className="text-left">
                                <p className="leading-tight text-xs font-bold">Profile appearance</p>
                                <p className="text-[9px] text-zinc-500 font-normal">Edit display name, usernames, bio attributes</p>
                              </div>
                            </span>
                            <ChevronRight className="w-4 h-4 text-zinc-600" />
                          </button>
                        </div>
                      </div>

                      {/* Security & Privacy */}
                      <div className="space-y-1">
                        <p className="text-[9px] font-mono uppercase text-zinc-500 tracking-widest pl-2">Safety & Shielding</p>
                        <div className="rounded-2xl bg-black/40 border border-white/5 overflow-hidden divide-y divide-white/5">
                          <button 
                            onClick={() => setSettingsActiveSubPanel('privacy')}
                            className="w-full p-3 flex items-center justify-between text-xs hover:bg-white/5 font-sans font-bold transition-all text-zinc-300 hover:text-white"
                          >
                            <span className="flex items-center gap-2.5">
                              <Shield className="w-4 h-4 text-violet-300" />
                              <div className="text-left">
                                <p className="leading-tight text-xs font-bold">Privacy settings</p>
                                <p className="text-[9px] text-zinc-500 font-normal">Choose who can see your profile and manage blocked accounts</p>
                              </div>
                            </span>
                            <ChevronRight className="w-4 h-4 text-zinc-600" />
                          </button>

                          <button 
                            onClick={() => setSettingsActiveSubPanel('security')}
                            className="w-full p-3 flex items-center justify-between text-xs hover:bg-white/5 font-sans font-bold transition-all text-zinc-300 hover:text-white"
                          >
                            <span className="flex items-center gap-2.5">
                              <LockKeyhole className="w-4 h-4 text-emerald-400" />
                              <div className="text-left">
                                <p className="leading-tight text-xs font-bold">Security Center</p>
                                <p className="text-[9px] text-zinc-500 font-normal">Rotate passwords, passkeys, 2FA & active sessions</p>
                              </div>
                            </span>
                            <ChevronRight className="w-4 h-4 text-zinc-600" />
                          </button>
                        </div>
                      </div>

                      {/* Preferences */}
                      <div className="space-y-1">
                        <p className="text-[9px] font-mono uppercase text-zinc-500 tracking-widest pl-2">User Experience</p>
                        <div className="rounded-2xl bg-black/40 border border-white/5 overflow-hidden divide-y divide-white/5">
                          <button 
                            onClick={() => setSettingsActiveSubPanel('notifications')}
                            className="w-full p-3 flex items-center justify-between text-xs hover:bg-white/5 font-sans font-bold transition-all text-zinc-300 hover:text-white"
                          >
                            <span className="flex items-center gap-2.5">
                              <Bell className="w-4 h-4 text-violet-400" />
                              <div className="text-left">
                                <p className="leading-tight text-xs font-bold">Notifications Control</p>
                                <p className="text-[9px] text-zinc-500 font-normal">Sieve likes, comments, DM alert triggers</p>
                              </div>
                            </span>
                            <ChevronRight className="w-4 h-4 text-zinc-600" />
                          </button>

                          <button 
                            onClick={() => setSettingsActiveSubPanel('appearance')}
                            className="w-full p-3 flex items-center justify-between text-xs hover:bg-white/5 font-sans font-bold transition-all text-zinc-300 hover:text-white"
                          >
                            <span className="flex items-center gap-2.5">
                              <Sliders className="w-4 h-4 text-amber-400" />
                              <div className="text-left">
                                <p className="leading-tight text-xs font-bold">Appearance & Canvas</p>
                                <p className="text-[9px] text-zinc-500 font-normal">Change the look of your app</p>
                              </div>
                            </span>
                            <ChevronRight className="w-4 h-4 text-zinc-600" />
                          </button>

                          <button 
                            onClick={() => setSettingsActiveSubPanel('storage')}
                            className="w-full p-3 flex items-center justify-between text-xs hover:bg-white/5 font-sans font-bold transition-all text-zinc-300 hover:text-white"
                          >
                            <span className="flex items-center gap-2.5">
                              <Layers className="w-4 h-4 text-purple-400" />
                              <div className="text-left">
                                <p className="leading-tight text-xs font-bold">Storage and data</p>
                                <p className="text-[9px] text-zinc-500 font-normal">Manage storage, data use and video playback</p>
                              </div>
                            </span>
                            <ChevronRight className="w-4 h-4 text-zinc-600" />
                          </button>
                        </div>
                      </div>

                      {/* Help & System parameters */}
                      <div className="space-y-1">
                        <p className="text-[9px] font-mono uppercase text-zinc-500 tracking-widest pl-2">System Support</p>
                        <div className="rounded-2xl bg-black/40 border border-white/5 overflow-hidden divide-y divide-white/5">
                          <button 
                            onClick={() => setSettingsActiveSubPanel('support')}
                            className="w-full p-3 flex items-center justify-between text-xs hover:bg-white/5 font-sans font-bold transition-all text-zinc-300 hover:text-white"
                          >
                            <span className="flex items-center gap-2.5">
                              <HelpCircle className="w-4 h-4 text-fuchsia-400" />
                              <div className="text-left">
                                <p className="leading-tight text-xs font-bold">Technical Help Desk</p>
                                <p className="text-[9px] text-zinc-500 font-normal">Report a problem or suggest a feature</p>
                              </div>
                            </span>
                            <ChevronRight className="w-4 h-4 text-zinc-600" />
                          </button>

                          <button 
                            onClick={() => setSettingsActiveSubPanel('about')}
                            className="w-full p-3 flex items-center justify-between text-xs hover:bg-white/5 font-sans font-bold transition-all text-zinc-300 hover:text-white"
                          >
                            <span className="flex items-center gap-2.5">
                              <Info className="w-4 h-4 text-indigo-400" />
                              <div className="text-left">
                                <p className="leading-tight text-xs font-bold">About NEXORA</p>
                                <p className="text-[9px] text-zinc-500 font-normal">App version and system information</p>
                              </div>
                            </span>
                            <ChevronRight className="w-4 h-4 text-zinc-600" />
                          </button>
                        </div>
                      </div>

                      {/* Account Actions */}
                      <div className="space-y-1">
                        <p className="text-[9px] font-mono uppercase text-red-500/80 tracking-widest pl-2">Account actions</p>
                        <div className="rounded-2xl bg-red-950/10 border border-red-500/15 overflow-hidden divide-y divide-red-950/20">
                          <button 
                            onClick={() => setConfirmingLogout(true)}
                            className="w-full p-3.5 flex items-center justify-between text-xs hover:bg-red-950/25 text-red-400 hover:text-red-300 font-sans font-black transition-all"
                          >
                            <span className="flex items-center gap-2.5">
                              <LogOut className="w-4 h-4" />
                              <div className="text-left">
                                <p className="leading-none text-xs font-extrabold">Log Out of Account</p>
                                <p className="text-[9px] text-zinc-500 font-normal mt-1">Safely exit and clear active session</p>
                              </div>
                            </span>
                            <ChevronRight className="w-4 h-4" />
                          </button>

                          <button 
                            onClick={() => { setConfirmingDeleteAccount(true); setDeleteStep(1); }}
                            className="w-full p-3.5 flex items-center justify-between text-xs hover:bg-red-950/45 text-red-500 hover:text-red-400 font-sans font-black transition-all"
                          >
                            <span className="flex items-center gap-2.5">
                              <Trash2 className="w-4 h-4" />
                              <div className="text-left">
                                <p className="leading-none text-xs font-extrabold">Delete Nexora Account</p>
                                <p className="text-[9px] text-red-500/50 font-normal mt-1">Permanently delete your account and posts</p>
                              </div>
                            </span>
                            <ChevronRight className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                    </div>

                  </div>
                ) : (
                  /* Drill-Down Sub Panels */
                  <div className="space-y-4">
                    {/* Sub-panel Back Header */}
                    <button
                      onClick={() => { setSettingsActiveSubPanel('main'); setSupportSubmitted(false); }}
                      className="flex items-center gap-1.5 text-xs font-mono text-violet-400 hover:text-violet-300 font-extrabold uppercase bg-violet-600/5 px-2.5 py-1.5 rounded-lg border border-white/10"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" /> Back to Menu
                    </button>

                    {/* Drill down Panel 1: Account / Profile Details */}
                    {settingsActiveSubPanel === 'account' && (
                      <div className="space-y-4 text-left">
                        <div className="bg-[#0e0c24] p-4 rounded-2xl border border-white/10 space-y-3.5">
                          <span className="text-[9px] font-mono text-violet-400 font-extrabold uppercase tracking-widest block border-b border-white/5 pb-1.5">👤 PROFILE DETAILS</span>
                          
                          {/* Display name */}
                          <div className="space-y-1 text-xs">
                            <label className="text-zinc-400 font-mono text-[9px] uppercase">Display Name</label>
                            <input
                              type="text"
                              value={editName}
                              onChange={(e) => setEditName(e.target.value)}
                              onBlur={() => void saveProfileField({ name: editName })}
                              disabled={isSavingProfile}
                              className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-xl text-white focus:outline-hidden focus:border-violet-500 text-xs font-medium"
                            />
                          </div>

                          {/* Username */}
                          <div className="space-y-1 text-xs">
                            <label className="text-zinc-400 font-mono text-[9px] uppercase">@username ID</label>
                            <input
                              type="text"
                              value={editUsername}
                              onChange={(e) => setEditUsername(e.target.value.toLowerCase().replace(/^@/, '').replace(/\s/g, ''))}
                              onBlur={() => void saveProfileField({ username: editUsername })}
                              disabled={isSavingProfile}
                              className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-xl text-white font-mono focus:outline-hidden focus:border-violet-500 text-xs font-medium"
                            />
                          </div>

                          {/* Website */}
                          <div className="space-y-1 text-xs">
                            <label className="text-zinc-400 font-mono text-[9px] uppercase">Website Link</label>
                            <input
                              type="text"
                              value={editWebsite}
                              placeholder="e.g. nexora.ai"
                              onChange={(e) => setEditWebsite(e.target.value)}
                              onBlur={() => void saveProfileField({ website: editWebsite })}
                              disabled={isSavingProfile}
                              className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-xl text-white focus:outline-hidden focus:border-violet-500 text-xs"
                            />
                          </div>

                          {/* Website */}
                          <div className="space-y-1 text-xs">
                            <label className="text-zinc-400 font-mono text-[9px] uppercase">Bio Description</label>
                            <textarea
                              value={editBio}
                              rows={3}
                              onChange={(e) => setEditBio(e.target.value)}
                              onBlur={() => void saveProfileField({ bio: editBio })}
                              disabled={isSavingProfile}
                              className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-xl text-white focus:outline-hidden focus:border-violet-500 text-xs leading-relaxed"
                            />
                          </div>

                          {/* Location */}
                          <div className="space-y-1 text-xs">
                            <label className="text-zinc-400 font-mono text-[9px] uppercase">Location</label>
                            <input
                              type="text"
                              value={editLocation}
                              onChange={(e) => setEditLocation(e.target.value)}
                              onBlur={() => void saveProfileField({ location: editLocation })}
                              disabled={isSavingProfile}
                              className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-xl text-white focus:outline-hidden focus:border-violet-500 text-xs"
                            />
                          </div>

                          <p className="px-1 text-[10px] font-semibold text-violet-300" aria-live="polite">
                            {isSavingProfile ? 'Saving this change…' : 'Changes save automatically when you finish editing each field.'}
                          </p>
                        </div>

                        {/* Camera Setup block */}
                        <div className="bg-[#0e0c24] p-4 rounded-2xl border border-white/10 space-y-3">
                          <span className="text-[9px] font-mono text-violet-400 font-extrabold uppercase tracking-widest block">📸 PROFILE PHOTO</span>
                          {isWebcamActive ? (
                            <div className="space-y-2 text-center">
                              <video ref={videoRef} autoPlay playsInline className="w-40 h-40 object-cover mx-auto rounded-xl border border-pink-500/20 scale-x-[-1]" />
                              <div className="flex gap-2 justify-center">
                                <button onClick={capturePhoto} className="px-3 py-1.5 bg-emerald-600 text-white font-mono text-[9px] uppercase font-bold rounded-lg">Capture</button>
                                <button onClick={stopWebcam} className="px-3 py-1.5 bg-zinc-800 text-zinc-400 font-mono text-[9px] uppercase font-bold rounded-lg">Cancel</button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-center gap-3">
                              <img src={editAvatar} className="w-12 h-12 rounded-xl object-cover border border-white/10" alt="" />
                              <div className="flex-1 space-y-1">
                                <button onClick={startWebcam} className="w-full py-1.5 bg-pink-500/10 border border-pink-500/20 hover:bg-pink-500/20 text-pink-300 font-mono text-[9px] uppercase font-bold rounded-lg">Take Photo</button>
                                <label className="block w-full py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-sans text-[10px] font-semibold rounded-lg text-center cursor-pointer">
                                  Choose from gallery
                                  <input type="file" accept="image/*" className="hidden" onChange={handleAvatarGallerySelection} />
                                </label>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Drill down Panel 2: Privacy settings */}
                    {settingsActiveSubPanel === 'privacy' && (
                      <div className="space-y-4">
                        <div className="p-4 rounded-2xl bg-[#0e0c24] border border-white/10 space-y-4">
                          <span className="text-[9px] font-mono text-violet-300 font-extrabold uppercase tracking-widest block">🔒 PRIVACY SETTINGS</span>
                          
                          {/* Private account is deliberately unavailable until follower-request and
                              private-post reads are enforced together by trusted rules and services. */}
                          <div className="flex items-center justify-between p-2 rounded-xl bg-black/20 opacity-80">
                            <div className="space-y-0.5 text-left max-w-[80%]">
                              <p className="text-xs font-bold text-white">Private Account</p>
                              <p className="text-[9px] text-zinc-500 leading-normal">This option isn't available yet.</p>
                            </div>
                            <input
                              type="checkbox"
                              checked={false}
                              disabled
                              aria-label="Private account unavailable until access controls are implemented"
                              className="accent-violet-500 h-4 w-4 cursor-not-allowed"
                            />
                          </div>

                          {/* Comments permission dropdown */}
                          <div className="space-y-1.5 text-left">
                            <label className="text-[10px] font-mono text-zinc-400 uppercase">Who Can Comment On Your Posts</label>
                            <select
                              value={commentAudience}
                              onChange={(e) => {
                                setCommentAudience(e.target.value);
                                window.dispatchEvent(new CustomEvent('toast', { detail: `💬 Comments set to: ${e.target.value}` }));
                              }}
                              className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-xl text-xs text-white"
                            >
                              <option value="everyone">Everyone (Open network)</option>
                              <option value="friends">Only Close Friends circles</option>
                              <option value="none">Disabled (Lock replies)</option>
                            </select>
                          </div>

                          {/* Mentions permission dropdown */}
                          <div className="space-y-1.5 text-left">
                            <label className="text-[10px] font-mono text-zinc-400 uppercase">Who Can Mention You</label>
                            <select
                              value={mentionAudience}
                              onChange={(e) => {
                                setMentionAudience(e.target.value);
                                window.dispatchEvent(new CustomEvent('toast', { detail: `🏷️ Mentions set to: ${e.target.value}` }));
                              }}
                              className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-xl text-xs text-white"
                            >
                              <option value="everyone">Everyone (Open tag)</option>
                              <option value="followers">Only followers you know</option>
                              <option value="none">None (Deny tags)</option>
                            </select>
                          </div>
                        </div>

                        {/* Blocks & Mutes Manager */}
                        <div className="p-4 rounded-2xl bg-[#0e0c24] border border-white/10 space-y-3 text-left">
                          <span className="text-[9px] font-mono text-red-400 font-extrabold uppercase tracking-widest block">🚫 Restricted Accounts</span>
                          
                          <div className="space-y-2">
                            <p className="text-[10px] font-mono text-zinc-500">BLOCKED USERS ({blockedUsers.length})</p>
                            {blockedUsers.map(usr => (
                              <div key={usr} className="flex justify-between items-center bg-black/20 p-2 rounded-xl text-xs">
                                <span className="font-mono text-zinc-300">Account {usr.slice(0, 10)}</span>
                                <button 
                                  onClick={() => { void handleUnblockAccount(usr); }}
                                  disabled={isSafetyActionBusy}
                                  className="text-[9px] font-mono font-black text-violet-400 uppercase hover:text-violet-300 disabled:opacity-50"
                                >
                                  Unblock
                                </button>
                              </div>
                            ))}

                            <p className="text-[10px] font-mono text-zinc-500 mt-2">MUTED USERS ({mutedUsers.length})</p>
                            {mutedUsers.map(usr => (
                              <div key={usr} className="flex justify-between items-center bg-black/20 p-2 rounded-xl text-xs">
                                <span className="font-mono text-zinc-300">Account {usr.slice(0, 10)}</span>
                                <button 
                                  onClick={() => { void handleMuteAccount(usr, false); }}
                                  disabled={isSafetyActionBusy}
                                  className="text-[9px] font-mono font-black text-violet-400 uppercase hover:text-violet-300 disabled:opacity-50"
                                >
                                  Unmute
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Drill down Panel 3: Security Center */}
                    {settingsActiveSubPanel === 'security' && (
                      <div className="space-y-4 text-left">
                        
                        <div className="p-4 rounded-2xl bg-gradient-to-tr from-[#120e26] to-[#04120f] border border-amber-500/20 flex items-center justify-between" role="status">
                          <div className="space-y-0.5">
                            <span className="text-[8px] font-mono text-amber-400 font-extrabold tracking-widest uppercase block">ACCOUNT SECURITY</span>
                            <h4 className="text-xs font-black text-white">Provider-managed security</h4>
                            <p className="text-[9px] text-zinc-400 font-sans mt-0.5">Nexora cannot verify a numeric security score or active second-factor enrollment.</p>
                          </div>
                          <Shield className="w-7 h-7 text-amber-400" />
                        </div>

                        {/* Rotate Password Form */}
                        <div className="p-4 rounded-2xl bg-[#0e0c24] border border-white/10 space-y-3">
                          <span className="text-[9px] font-mono text-violet-400 font-extrabold uppercase tracking-widest block">🔑 Rotate Access Credentials</span>
                          
                          <div className="space-y-2 text-xs">
                            <div className="space-y-1">
                              <label className="text-[9px] font-mono text-zinc-400 uppercase">Current account password</label>
                              <input 
                                type="password" 
                                placeholder="••••••••••••"
                                value={currentPassword}
                                onChange={(e) => setCurrentPassword(e.target.value)}
                                className="w-full px-2.5 py-1.5 bg-black/40 border border-white/10 rounded-lg text-white font-mono" 
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[9px] font-mono text-zinc-400 uppercase">New password</label>
                              <input 
                                type="password" 
                                placeholder="Minimum 8 characters"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                className="w-full px-2.5 py-1.5 bg-black/40 border border-white/10 rounded-lg text-white font-mono" 
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[9px] font-mono text-zinc-400 uppercase">Confirm new password</label>
                              <input 
                                type="password" 
                                placeholder="Match new access key"
                                value={confirmNewPassword}
                                onChange={(e) => setConfirmNewPassword(e.target.value)}
                                className="w-full px-2.5 py-1.5 bg-black/40 border border-white/10 rounded-lg text-white font-mono" 
                              />
                            </div>
                          </div>

                          <button 
                            onClick={async () => {
                              if (!currentPassword || !newPassword || !confirmNewPassword) {
                                alert('Enter your current password and the new password twice.');
                                return;
                              }
                              if (newPassword.length < 8) {
                                alert('Choose a password with at least 8 characters.');
                                return;
                              }
                              if (newPassword !== confirmNewPassword) {
                                alert('The new password entries do not match.');
                                return;
                              }
                              try {
                                await AuthService.updateAccountPassword(currentPassword, newPassword);
                                setCurrentPassword('');
                                setNewPassword('');
                                setConfirmNewPassword('');
                                window.dispatchEvent(new CustomEvent('toast', { detail: 'Firebase updated your account password.' }));
                              } catch (error) {
                                window.dispatchEvent(new CustomEvent('toast', { detail: error instanceof Error ? error.message : 'Password could not be updated.' }));
                              }
                            }}
                            className="w-full py-2 bg-violet-600 hover:bg-violet-500 text-white font-mono text-[9px] uppercase font-black tracking-wider rounded-lg transition-all"
                          >
                            Update Password
                          </button>
                        </div>

                        <div className="p-4 rounded-2xl bg-[#0e0c24] border border-white/10 space-y-2" role="status">
                          <span className="text-[9px] font-mono text-violet-300 font-extrabold uppercase tracking-widest block">Advanced sign-in protections</span>
                          <p className="text-[10px] text-zinc-400 leading-relaxed">Passkey and app-managed TOTP enrollment are not implemented in Nexora. No passkey or second factor is enabled by these settings. Check Firebase Authentication for provider-supported MFA options.</p>
                        </div>

                        <div className="p-4 rounded-2xl bg-[#0e0c24] border border-white/10 space-y-2" role="status">
                          <span className="text-[9px] font-mono text-amber-400 font-extrabold uppercase tracking-widest block">Session security</span>
                          <p className="text-[10px] text-zinc-400 leading-relaxed">Nexora does not currently maintain a device-session inventory or remote sign-out control. Sign out here to end this session. If you suspect account compromise, contact the project owner to revoke Firebase refresh tokens.</p>
                        </div>
                      </div>
                    )}

                    {/* Drill down Panel 4: Notification preferences */}
                    {settingsActiveSubPanel === 'notifications' && (
                      <div className="space-y-4 text-left">
                        <div className="p-4 rounded-2xl bg-[#0e0c24] border border-white/10 space-y-3.5">
                          <span className="text-[9px] font-mono text-violet-400 font-extrabold uppercase tracking-widest block">🔔 PUSH PREFERENCES</span>
                          <p className="text-[10px] text-zinc-400 leading-normal font-sans">Manage how you receive notifications on this device.</p>
                          
                          <div className="space-y-3">
                            {[
                              { key: 'likes', title: 'Likes', desc: 'Get notified when someone likes your content' },
                              { key: 'comments', title: 'Comments', desc: 'Alerts for comments on your posts' },
                              { key: 'mentions', title: 'Mentions & Tags', desc: 'Alerts when someone mentions you' },
                              { key: 'reposts', title: 'Reposts', desc: 'Notifications when someone shares your posts' },
                              { key: 'directMessages', title: 'Direct Messages', desc: 'Alerts for new messages' },
                              { key: 'systemAlerts', title: 'System Alerts', desc: 'Important app updates and security alerts' }
                            ].map(item => (
                              <div key={item.key} className="flex items-center justify-between p-2 rounded-xl bg-black/20">
                                <div className="space-y-0.5 text-left max-w-[80%]">
                                  <p className="text-xs font-bold text-white leading-tight">{item.title}</p>
                                  <p className="text-[9px] text-zinc-500 leading-normal">{item.desc}</p>
                                </div>
                                <input
                                  type="checkbox"
                                  checked={(notifToggles as any)[item.key]}
                                  onChange={(e) => {
                                    setNotifToggles({
                                      ...notifToggles,
                                      [item.key]: e.target.checked
                                    });
                                    window.dispatchEvent(new CustomEvent('toast', { detail: e.target.checked ? `🔔 Notifications enabled for: ${item.title}` : `🔕 Silenced notifications for: ${item.title}` }));
                                  }}
                                  className="accent-pink-500 h-4 w-4 shrink-0"
                                />
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Drill down Panel 5: Appearance and Canvas */}
                    {settingsActiveSubPanel === 'appearance' && (
                      <div className="space-y-4 text-left">
                        
                        {/* Themes Cards selection */}
                        <div className="p-4 rounded-2xl bg-[#0e0c24] border border-white/10 space-y-3">
                          <span className="text-[9px] font-mono text-amber-400 font-extrabold uppercase tracking-widest block">App appearance</span>
                          
                          <div className="grid grid-cols-2 gap-2">
                            {[
                              { id: 'neon-cyber', label: 'Violet', bg: 'bg-[#050409]', border: 'border-white/10 text-violet-300' },
                              { id: 'emerald-glass', label: 'Emerald Glass', bg: 'bg-[#010403]', border: 'border-emerald-600/40 text-emerald-400' },
                              { id: 'platinum-light', label: 'Platinum Light', bg: 'bg-[#f4f6fa]', border: 'border-slate-300 text-slate-800' },
                              { id: 'stealth-dark', label: 'Stealth Dark', bg: 'bg-zinc-950', border: 'border-zinc-800 text-zinc-400' }
                            ].map(mood => (
                              <button
                                key={mood.id}
                                onClick={() => {
                                  setTheme?.(mood.id as any);
                                  localStorage.setItem('nexora_theme', mood.id);
                                  window.dispatchEvent(new CustomEvent('toast', { detail: `🎨 Switch to: ${mood.label} Theme!` }));
                                }}
                                className={`p-3 rounded-xl border text-xs font-bold font-sans transition-all flex flex-col justify-between h-16 ${mood.bg} ${
                                  theme === mood.id 
                                    ? 'ring-2 ring-violet-500 scale-[1.02]' 
                                    : 'opacity-85 hover:opacity-100 border-white/5'
                                }`}
                              >
                                <span className={`text-[9px] font-mono uppercase tracking-widest ${mood.border}`}>{mood.label}</span>
                                <div className="flex gap-1">
                                  <span className="w-2 h-2 rounded-full bg-violet-500" />
                                  <span className="w-2 h-2 rounded-full bg-pink-500" />
                                  <span className="w-2 h-2 rounded-full bg-cyan-500" />
                                </div>
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Accent pickers */}
                        <div className="p-4 rounded-2xl bg-[#0e0c24] border border-white/10 space-y-3">
                          <span className="text-[9px] font-mono text-violet-400 font-extrabold uppercase tracking-widest block">⚡ Glow Accent Color</span>
                          <div className="flex gap-2">
                            {[
                              { id: 'violet', color: 'bg-violet-600 shadow-violet-500/50' },
                              { id: 'pink', color: 'bg-pink-500 shadow-pink-500/50' },
                              { id: 'emerald', color: 'bg-emerald-500 shadow-emerald-500/50' },
                              { id: 'cyan', color: 'bg-cyan-500 shadow-cyan-500/50' }
                            ].map(ac => (
                              <button
                                key={ac.id}
                                onClick={() => {
                                  setAccentColor(ac.id);
                                  window.dispatchEvent(new CustomEvent('toast', { detail: `✨ Accent glow: ${ac.id}` }));
                                }}
                                className={`flex-1 h-8 rounded-xl transition-all cursor-pointer relative flex items-center justify-center ${ac.color} shadow-sm ${
                                  accentColor === ac.id ? 'ring-2 ring-white scale-105' : 'hover:scale-102'
                                }`}
                              >
                                {accentColor === ac.id && <Check className="w-4 h-4 text-white" />}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Typography customizer */}
                        <div className="p-4 rounded-2xl bg-[#0e0c24] border border-white/10 space-y-3">
                          <span className="text-[9px] font-mono text-violet-400 font-extrabold uppercase tracking-widest block">✍️ TYPOGRAPHY SCALES</span>
                          
                          {/* Text size selector */}
                          <div className="space-y-1">
                            <label className="text-[9px] font-mono text-zinc-500 uppercase">Text size zoom</label>
                            <div className="flex justify-between bg-black/30 p-1 rounded-xl">
                              {['xs', 'sm', 'medium', 'lg', 'xl'].map(sz => (
                                <button
                                  key={sz}
                                  onClick={() => {
                                    setTextSize(sz);
                                    window.dispatchEvent(new CustomEvent('toast', { detail: `🔎 Sizing preset set to: ${sz}` }));
                                  }}
                                  className={`flex-1 py-1.5 rounded-lg text-[9px] font-mono uppercase font-black transition-all ${
                                    textSize === sz 
                                      ? 'bg-violet-600 text-white shadow-xs' 
                                      : 'text-zinc-500 hover:text-zinc-300'
                                  }`}
                                >
                                  {sz}
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* Font selection */}
                          <div className="space-y-1 mt-2">
                            <label className="text-[9px] font-mono text-zinc-500 uppercase">Typography pairing</label>
                            <div className="flex justify-between bg-black/30 p-1 rounded-xl">
                              {[
                                { id: 'sans', label: 'Inter Sans' },
                                { id: 'mono', label: 'JetBrains' },
                                { id: 'space', label: 'Grotesk' }
                              ].map(fnt => (
                                <button
                                  key={fnt.id}
                                  onClick={() => {
                                    setCustomFont(fnt.id);
                                    window.dispatchEvent(new CustomEvent('toast', { detail: `🔤 Font family set to: ${fnt.label}` }));
                                  }}
                                  className={`flex-1 py-1.5 rounded-lg text-[9px] font-mono uppercase font-black transition-all ${
                                    customFont === fnt.id 
                                      ? 'bg-violet-600 text-white shadow-xs' 
                                      : 'text-zinc-500 hover:text-zinc-300'
                                  }`}
                                >
                                  {fnt.label.split(' ')[0]}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Drill down Panel 6: Storage and Performance */}
                    {settingsActiveSubPanel === 'storage' && (
                      <div className="space-y-4 text-left">
                        {/* Premium Storage and Data Center Launcher */}
                        <div className="p-4 rounded-2xl bg-gradient-to-br from-[#12082b] to-[#04010a] border border-white/10 space-y-3 relative overflow-hidden group">
                          <div className="absolute top-0 right-0 w-24 h-24 bg-violet-600/10 rounded-full blur-2xl group-hover:bg-violet-600/20 transition-all duration-500" />
                          <div className="flex items-center gap-2.5">
                            <VohIcon size={18} animated glow variant="brand" />
                            <span className="text-[10px] font-mono text-violet-400 font-extrabold uppercase tracking-widest block">NEXORA PLATFORM UTILITY</span>
                          </div>
                          <div className="space-y-1">
                            <h4 className="text-xs font-black font-sans uppercase text-white tracking-wider">Storage and data</h4>
                            <p className="text-[10px] text-zinc-400 leading-relaxed">Manage storage and data use on this device. Backup and restore aren't available yet.</p>
                          </div>
                          <button
                            onClick={() => setIsStorageCenterOpen(true)}
                            className="w-full py-2.5 bg-violet-600 hover:bg-violet-500 text-white font-mono text-[10px] uppercase font-black tracking-wider rounded-lg transition-all flex items-center justify-center gap-2 shadow-lg shadow-violet-600/10 cursor-pointer"
                          >
                            <HardDrive className="w-4 h-4" /> Launch Interactive Storage Center
                          </button>
                        </div>

                        <div className="p-4 rounded-2xl bg-[#0e0c24] border border-white/10 space-y-3.5">
                          <span className="text-[9px] font-mono text-violet-300 font-extrabold uppercase tracking-widest block">Clear saved app data</span>
                          
                          {/* Cache size meter */}
                          <div className="bg-black/30 p-3.5 rounded-xl border border-white/5 space-y-2">
                            <div className="flex justify-between items-center text-xs">
                              <span className="font-sans text-zinc-400">Storage used by the app</span>
                              <span className="font-mono text-white font-bold">{cacheSize}</span>
                            </div>
                            
                            {/* Visual SVG Progress loader bar */}
                            <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                              <div className="h-full bg-linear-to-r from-violet-600 to-violet-500 rounded-full" style={{ width: cacheSize === '0.0 B' ? '0%' : '65%' }} />
                            </div>
                            <p className="text-[9px] text-zinc-500 font-sans leading-normal">This includes saved profile photos, video previews and other temporary files.</p>
                          </div>

                          <button
                            onClick={() => {
                              const conf = window.confirm('🧹 Clear system temporary local cache indices? This action will reload necessary images.');
                              if (conf) {
                                setCacheSize('Clearing cache...');
                                window.dispatchEvent(new CustomEvent('toast', { detail: '🧹 Emptying temporary asset indexes...' }));
                                setTimeout(() => {
                                  setCacheSize('0.0 B');
                                  window.dispatchEvent(new CustomEvent('toast', { detail: '✨ All 128 MB cache cleared!' }));
                                }, 1500);
                              }
                            }}
                            className="w-full py-2.5 bg-violet-600 hover:bg-violet-500 text-white font-mono text-[9px] uppercase font-black tracking-wider rounded-lg transition-all"
                          >
                            Empty Device Cache Logs
                          </button>
                        </div>

                        {/* Performance toggles */}
                        <div className="p-4 rounded-2xl bg-[#0e0c24] border border-white/10 space-y-3.5">
                          <span className="text-[9px] font-mono text-amber-400 font-extrabold uppercase tracking-widest block">🏎️ Performance & Compression</span>
                          
                          {/* Data saver */}
                          <div className="flex items-center justify-between p-2 rounded-xl bg-black/20">
                            <div className="space-y-0.5 text-left max-w-[80%]">
                              <p className="text-xs font-bold text-white leading-tight">Data Saver</p>
                              <p className="text-[9px] text-zinc-500 leading-normal">Limit resolution of video clips on mobile grids.</p>
                            </div>
                            <input
                              type="checkbox"
                              checked={dataSaver}
                              onChange={(e) => {
                                setDataSaver(e.target.checked);
                                window.dispatchEvent(new CustomEvent('toast', { detail: e.target.checked ? '📶 Data Saver Enabled' : '📶 High resolution stream activated' }));
                              }}
                              className="accent-amber-400 h-4 w-4 shrink-0"
                            />
                          </div>

                          {/* Autoplay */}
                          <div className="flex items-center justify-between p-2 rounded-xl bg-black/20">
                            <div className="space-y-0.5 text-left max-w-[80%]">
                              <p className="text-xs font-bold text-white leading-tight">Autoplay Feed Videos</p>
                              <p className="text-[9px] text-zinc-500 leading-normal">Immediately spin up clips on screen scrolling.</p>
                            </div>
                            <input
                              type="checkbox"
                              checked={autoplayVideos}
                              onChange={(e) => {
                                setAutoplayVideos(e.target.checked);
                                window.dispatchEvent(new CustomEvent('toast', { detail: e.target.checked ? '🎥 Autoplay active' : '🎥 Autoplay silent' }));
                              }}
                              className="accent-amber-400 h-4 w-4 shrink-0"
                            />
                          </div>

                          {/* Upload quality */}
                          <div className="space-y-1 text-left">
                            <label className="text-[9px] font-mono text-zinc-500 uppercase">Photo and video quality</label>
                            <select
                              value={mediaQuality}
                              onChange={(e) => {
                                setMediaQuality(e.target.value);
                                window.dispatchEvent(new CustomEvent('toast', { detail: `🚀 Upload set to: ${e.target.value.toUpperCase()}` }));
                              }}
                              className="w-full px-2.5 py-1.5 bg-black/40 border border-white/10 rounded-lg text-xs text-white font-sans"
                            >
                              <option value="standard">Standard Speed (Compressed)</option>
                              <option value="high">HD Quality (Pro High-Res)</option>
                              <option value="lossless">Original quality</option>
                            </select>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Drill down Panel 7: Technical support desk */}
                    {settingsActiveSubPanel === 'support' && (
                      <div className="space-y-4 text-left">
                        <div className="p-4 rounded-2xl bg-[#0e0c24] border border-white/10 space-y-3">
                          <span className="text-[9px] font-mono text-violet-400 font-extrabold uppercase tracking-widest block">💬 Lagos Technical Grid Support</span>
                          
                          {supportSubmitted ? (
                            <div className="p-6 text-center space-y-3 bg-black/20 rounded-xl border border-emerald-500/20">
                              <div className="w-10 h-10 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center mx-auto">
                                <Check className="w-5 h-5" />
                              </div>
                              <h4 className="text-xs font-bold text-emerald-400">Report sent</h4>
                              <p className="text-[9px] text-zinc-500 font-mono leading-relaxed">Your report number is #{Math.floor(Math.random() * 9000) + 1000}. Our team will review it soon.</p>
                            </div>
                          ) : (
                            <div className="space-y-3 text-xs">
                              <div className="space-y-1">
                                <label className="text-[9px] font-mono text-zinc-400 uppercase">Ticket Category</label>
                                <select
                                  value={supportCategory}
                                  onChange={(e) => setSupportCategory(e.target.value)}
                                  className="w-full px-2.5 py-1.5 bg-black/40 border border-white/10 rounded-lg text-white"
                                >
                                  <option value="feedback">Product Feedback Idea</option>
                                  <option value="bug">Report a Bug</option>
                                  <option value="auth">ID Verification Help</option>
                                  <option value="billing">NEX Coin and earnings</option>
                                </select>
                              </div>

                              <div className="space-y-1">
                                <label className="text-[9px] font-mono text-zinc-400 uppercase">Describe Your Issue</label>
                                <textarea
                                  placeholder="Describe what occurred, including details of your issue..."
                                  value={supportMessage}
                                  rows={4}
                                  onChange={(e) => setSupportMessage(e.target.value)}
                                  className="w-full px-2.5 py-1.5 bg-black/40 border border-white/10 rounded-lg text-white"
                                />
                              </div>

                              <button
                                onClick={() => {
                                  if (!supportMessage.trim()) {
                                    alert('⚠️ Please explain the issue details.');
                                    return;
                                  }
                                  setSupportSubmitted(true);
                                  setSupportMessage('');
                                }}
                                className="w-full py-2 bg-pink-600 hover:bg-pink-500 text-white font-mono text-[9px] uppercase font-black tracking-wider rounded-lg transition-all"
                              >
                                Transmit Ticket Packet
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Drill down Panel 8: About NEXORA */}
                    {settingsActiveSubPanel === 'about' && (
                      <div className="space-y-4 text-left">
                        <div className="p-4 rounded-2xl bg-[#0e0c24] border border-white/10 space-y-3 font-mono">
                          <NexoraBranding size="sm" showSubtitle={true} className="mb-2" />
                          <div className="space-y-2 text-[10px] leading-relaxed text-zinc-300">
                            <p className="flex justify-between border-b border-white/5 pb-1"><span className="text-zinc-500">APP:</span> <span>Nexora</span></p>
                            <p className="flex justify-between border-b border-white/5 pb-1"><span className="text-zinc-500">PLATFORM:</span> <span>Live video</span></p>
                            <p className="flex justify-between pb-1"><span className="text-zinc-500">REGION:</span> <span>Global</span></p>
                          </div>
                          
                          <div className="p-3 bg-black/30 rounded-xl border border-white/5 space-y-1.5 text-[9px] text-zinc-400 font-sans leading-relaxed">
                            <p className="font-bold text-zinc-300">Terms of Service</p>
                            <p>By connecting to Nexora, you agree to our secure content distribution guidelines and community standards designed to protect creators and members worldwide.</p>
                          </div>
                        </div>
                      </div>
                    )}

                  </div>
                )}
              </div>

              {/* Drawer footer close trigger */}
              <div className="shrink-0 pt-4 border-t border-white/5">
                <button
                  onClick={() => { setActivePanel('profile'); setSettingsActiveSubPanel('main'); setSettingsSearchQuery(''); }}
                  className="w-full py-3.5 bg-violet-950 hover:bg-violet-900 text-violet-300 rounded-xl text-[10px] font-mono font-black uppercase tracking-wider transition-all"
                >
                  Close Settings Control Panel
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Confirmation Dialog 1: Safe Log Out Confirmation Overlay */}
      <AnimatePresence>
        {confirmingLogout && (
          <div className="fixed inset-0 z-210 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
            <motion.div
              initial={reduceMotion ? false : { scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={reduceMotion ? { opacity: 0 } : { scale: 0.95, opacity: 0 }}
              transition={{ duration: reduceMotion ? 0 : 0.16 }}
              className="bg-[#0c0926] border border-red-500/25 rounded-3xl p-6 max-w-sm w-full text-center space-y-5 shadow-md relative"
            >
              <div className="w-12 h-12 rounded-full bg-red-600/10 text-red-500 flex items-center justify-center mx-auto">
                <LogOut className="w-6 h-6 animate-pulse" />
              </div>

              <div className="space-y-1.5">
                <h3 className="text-sm font-sans font-black text-white uppercase tracking-wider">Sign Out?</h3>
                <p className="text-[10px] text-zinc-400 font-mono leading-normal">
                  Are you sure you want to log out of Nexora on this device?
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1 font-mono text-[10px] uppercase font-black">
                <button
                  onClick={() => setConfirmingLogout(false)}
                  className="p-3 bg-zinc-900 border border-white/5 hover:bg-zinc-800 text-zinc-400 rounded-2xl transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    setConfirmingLogout(false);
                    onLogout?.();
                    setActivePanel('profile');
                    setSettingsActiveSubPanel('main');
                  }}
                  className="p-3 bg-red-600 hover:bg-red-500 text-white rounded-2xl transition-all"
                >
                  Sign Out
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Confirmation Dialog 2: Safe Account Delete Multi-Step Overlay */}
      <AnimatePresence>
        {confirmingDeleteAccount && (
          <div className="fixed inset-0 z-210 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#0c0926] border border-red-500/40 rounded-3xl p-6 max-w-sm w-full text-center space-y-5 shadow-md"
            >
              <div className="w-12 h-12 rounded-full bg-red-600/20 text-red-500 flex items-center justify-center mx-auto">
                <AlertTriangle className="w-6 h-6 animate-bounce" />
              </div>

              {deleteStep === 1 && (
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <h3 className="text-sm font-sans font-black text-white uppercase tracking-wider text-red-400">DELETE ACCOUNT</h3>
                    <p className="text-[10px] text-zinc-300 font-mono leading-normal">
                      This submits an account deletion request. A trusted cleanup process must remove owned records and media asynchronously; the account is not erased immediately.
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-2 pt-1 font-mono text-[10px] uppercase font-black">
                    <button
                      onClick={() => setConfirmingDeleteAccount(false)}
                      className="p-3 bg-zinc-900 border border-white/5 text-zinc-400 rounded-2xl"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => setDeleteStep(2)}
                      className="p-3 bg-red-600 hover:bg-red-500 text-white rounded-2xl"
                    >
                      Continue
                    </button>
                  </div>
                </div>
              )}

              {deleteStep === 2 && (
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <h3 className="text-sm font-sans font-black text-white uppercase tracking-wider">Reauthenticate to Delete</h3>
                    <p className="text-[10px] text-zinc-400 font-mono leading-normal">
                      Email/password accounts must enter the current password, which Firebase verifies. For Google or phone sign-in, sign out and sign in again within five minutes. Firestore rejects stale sessions. Cleanup is queued; backups and legal records may retain data temporarily.
                    </p>
                    <input 
                      type="password"
                      placeholder="Current password (email/password accounts)"
                      value={deleteAccountPassword}
                      onChange={(e) => setDeleteAccountPassword(e.target.value)}
                      className="w-full px-3 py-2 bg-black border border-red-500/30 rounded-xl text-center text-white text-xs font-mono tracking-widest mt-2"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2 pt-1 font-mono text-[10px] uppercase font-black">
                    <button
                      onClick={() => setConfirmingDeleteAccount(false)}
                      className="p-3 bg-zinc-900 border border-white/5 text-zinc-400 rounded-2xl"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => {
                        void handleAccountDeletionRequest();
                      }}
                      disabled={isLifecycleBusy}
                      className="p-3 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white rounded-2xl"
                    >
                      {isLifecycleBusy ? 'Queueing...' : 'Request Deletion'}
                    </button>
                  </div>
                </div>
              )}

              {deleteStep === 3 && (
                <div className="space-y-3 py-4">
                  <div className="w-10 h-10 border-2 border-red-500 border-t-transparent rounded-full animate-spin mx-auto" />
                  <p className="text-xs font-mono text-red-400 font-extrabold uppercase">DELETION REQUEST {deletionRequest?.status?.toUpperCase() || 'QUEUED'}</p>
                  <p className="text-[9px] text-zinc-500 font-mono leading-relaxed">Your request is processed by a trusted cleanup worker. You remain signed in until processing is verified.</p>
                  {deletionRequest?.progress && (
                    <p className="text-[9px] text-zinc-400 font-mono" role="status" aria-live="polite">
                      Stage: {deletionRequest.progress.stage.replace(/-/g, ' ')} · {deletionRequest.progress.deletedDocuments} records · {deletionRequest.progress.deletedFiles} files
                    </p>
                  )}
                  <button
                    onClick={() => setConfirmingDeleteAccount(false)}
                    className="w-full p-3 bg-zinc-900 border border-white/10 text-zinc-300 rounded-2xl font-mono text-[10px] uppercase"
                  >
                    Close
                  </button>
                </div>
              )}

            </motion.div>
          </div>
        )}
      </AnimatePresence>


      {/* 7. DYNAMIC Nexora Studio & DETAILED ANALYTICS VIEW */}
      <AnimatePresence>
        {activePanel === 'creator-studio' && (
          <div className="fixed inset-0 z-50 bg-[#04020f] overflow-y-auto">
            <div className="max-w-4xl mx-auto px-4 py-6">
              <CreatorDashboardView
                currentUser={currentUser}
                posts={posts}
                onAddPost={onAddPost || (() => '')}
                onClose={() => setActivePanel('profile')}
                onUpdateProfile={onUpdateProfile}
              />
            </div>
          </div>
        )}
      </AnimatePresence>



      {/* 9. SOCIAL GRAPH & RELATIONSHIP MANAGER VIEW */}
      <AnimatePresence>
        {activePanel === 'social-graph' && (
          <div className="fixed inset-0 z-50 bg-[#04020f] overflow-y-auto">
            <div className="max-w-xl mx-auto px-4 py-6 space-y-6">
              
              <div className="flex items-center justify-between border-b border-white/5 pb-4">
                <button
                  onClick={() => setActivePanel('profile')}
                  className="flex items-center gap-1 text-xs font-mono text-zinc-400 hover:text-white uppercase font-black cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" /> Back to Profile
                </button>
                <span className="text-xs font-mono text-zinc-400 font-extrabold uppercase">Social Network Graph</span>
              </div>

              {/* Graph subtabs */}
              <div className="flex gap-1 overflow-x-auto scrollbar-none bg-black/40 p-1 rounded-2xl border border-white/5">
                {[
                  { id: 'followers', label: 'Followers' },
                  { id: 'following', label: 'Following' },
                  { id: 'close-friends', label: 'Close Friends' },
                  { id: 'blocked', label: 'Blocked' },
                  { id: 'muted', label: 'Muted' }
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setRelationsTab(tab.id as any)}
                    className={`flex-1 px-3 py-2 rounded-xl text-[10px] font-mono uppercase font-black tracking-wider whitespace-nowrap cursor-pointer transition-all ${
                      relationsTab === tab.id 
                        ? 'bg-violet-600 text-white' 
                        : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Filter search bar */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                <input
                  type="text"
                  placeholder="Search by username..."
                  value={searchRelationQuery}
                  onChange={(e) => setSearchRelationQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-3 bg-[#0d0926]/60 border border-white/10 rounded-2xl text-xs font-sans text-white focus:outline-hidden focus:border-violet-500 focus:bg-black/60 font-medium"
                />
              </div>

              {/* Relation list render */}
              <div className="space-y-2 text-left">
                {(() => {
                  if ((relationsTab === 'followers' || relationsTab === 'following') && (!isOwnProfile || auth.currentUser?.uid !== currentUser.id)) {
                    return <div className="text-center py-12 text-zinc-500 text-xs">Relationship lists are private for this account.</div>;
                  }
                  let list: any[] = [];
                  const allFollows = profileFollows;
                  const allRegisteredUsers = relationshipUsers;

                  if (relationsTab === 'followers') {
                    const followerIds = allFollows.filter(f => f.followingId === currentUser.id).map(f => f.followerId);
                    list = allRegisteredUsers.filter(u => followerIds.includes(u.id));
                  } else if (relationsTab === 'following') {
                    const followingIds = allFollows.filter(f => f.followerId === currentUser.id).map(f => f.followingId);
                    list = allRegisteredUsers.filter(u => followingIds.includes(u.id));
                  } else if (relationsTab === 'close-friends') {
                    list = allRegisteredUsers.filter(u => closeFriends.includes(u.id));
                  } else if (relationsTab === 'blocked') {
                    list = blockedUsers.map(u => ({ id: u, username: u, name: u.toUpperCase(), avatar: getDefaultAvatar(u) }));
                  } else if (relationsTab === 'muted') {
                    list = mutedUsers.map(u => ({ id: u, username: u, name: u.toUpperCase(), avatar: getDefaultAvatar(u) }));
                  }

                  const filtered = list.filter(item => 
                    (item.username || '').toLowerCase().includes(searchRelationQuery.toLowerCase()) ||
                    (item.name || '').toLowerCase().includes(searchRelationQuery.toLowerCase())
                  );

                  if (filtered.length === 0) {
                    return (
                      <div className="text-center py-12 text-zinc-500 font-mono text-xs">
                        ⚠️ No accounts match your query.
                      </div>
                    );
                  }

                  return filtered.map(item => (
                    <div 
                      key={item.id} 
                      onClick={() => onViewProfile && onViewProfile(item.id)}
                      className="flex items-center justify-between p-3.5 rounded-2xl bg-[#0b081c] border border-white/3 cursor-pointer hover:bg-violet-950/20 transition-all"
                    >
                      <div className="flex items-center gap-3">
                        <img src={item.avatar} alt={item.name} className="w-9 h-9 rounded-xl object-cover" />
                        <div>
                          <p className="text-xs font-bold text-white flex items-center gap-1">
                            {item.name} 
                          </p>
                          <p className="text-[10px] text-zinc-500 font-mono">@{item.username}</p>
                        </div>
                      </div>

                      {/* Right actions context */}
                      <div className="flex items-center gap-1.5">
                        {relationsTab === 'following' && (
                          <label className="flex items-center gap-1 text-[10px] font-mono text-violet-400 bg-pink-500/5 px-2 py-1 rounded-lg border border-pink-500/10 cursor-pointer">
                            <input 
                              type="checkbox" 
                              checked={closeFriends.includes(item.id)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setCloseFriends([...closeFriends, item.id]);
                                } else {
                                  setCloseFriends(closeFriends.filter(id => id !== item.id));
                                }
                              }}
                              className="accent-pink-500"
                            />
                            <span>Close Friend</span>
                          </label>
                        )}

                        {relationsTab === 'blocked' && (
                          <button
                            type="button"
                            onClick={() => { void handleUnblockAccount(item.id); }}
                            disabled={isSafetyActionBusy}
                            className="p-1 px-2.5 bg-violet-600 text-white rounded-lg text-[9px] font-mono uppercase font-black cursor-pointer disabled:cursor-wait disabled:opacity-50"
                          >
                            Unblock
                          </button>
                        )}

                        {relationsTab === 'muted' && (
                          <button
                            onClick={() => {
                              setMutedUsers(mutedUsers.filter(u => u !== item.id));
                              window.dispatchEvent(new CustomEvent('toast', { detail: '🔊 Account unmuted!' }));
                            }}
                            className="p-1 px-2.5 bg-violet-600 text-white rounded-lg text-[9px] font-mono uppercase font-black cursor-pointer"
                          >
                            Unmute
                          </button>
                        )}
                      </div>
                    </div>
                  ));
                })()}
              </div>

              <button
                onClick={() => setActivePanel('profile')}
                className="w-full py-3.5 bg-violet-950 hover:bg-violet-900 text-violet-300 rounded-2xl text-xs font-mono font-black uppercase tracking-wider transition-all"
              >
                Close Relationships
              </button>
            </div>
          </div>
        )}
      </AnimatePresence>

            {/* 11. SUBSCRIPTIONS MANAGEMENT PAGE */}
      <AnimatePresence>
        {activePanel === 'subscriptions' && (
          <div className="fixed inset-0 z-50 bg-[#04020f] overflow-y-auto">
            <div className="max-w-3xl mx-auto px-4 py-6 space-y-6 text-left">
              <div className="flex items-center justify-between border-b border-white/5 pb-4">
                <button
                  onClick={() => setActivePanel('profile')}
                  className="flex items-center gap-1 text-xs font-mono text-zinc-400 hover:text-white uppercase font-black cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" /> Back to Profile
                </button>
                <span className="text-xs font-mono text-zinc-400 font-extrabold uppercase">Subscriptions</span>
              </div>
              
              <div className="space-y-6">
                {/* Header Info */}
                <div className="p-6 bg-linear-to-tr from-violet-900/20 to-[#04020f] border border-white/10 rounded-3xl">
                  <h2 className="text-xl font-black text-white mb-2">Memberships & billing</h2>
                  <p className="text-sm text-zinc-400">Verified creator subscriptions and premium checkout are not enabled yet. Nexora will show this area only after a trusted payment provider and merchant configuration are deployed.</p>
                  <p className="text-xs text-amber-300/80 mt-3">No subscriptions, prices, balances, or payment history are being simulated.</p>
                  <div className="mt-4 rounded-2xl border border-white/5 bg-black/20 p-4 text-xs text-zinc-500">
                    {billingSummaryError ? 'Billing status is temporarily unavailable. No payment state was changed.' : billingSummary?.providerConfigured ? `${billingSummary.transactions.length} verified transaction record(s)` : 'Provider status: not configured'}
                  </div>
                </div>
                
                {/* Tabs */}
                <div className="flex gap-4 border-b border-white/5">
                  {[
                    { id: 'active', label: 'Active Subscriptions' },
                    { id: 'plans', label: 'Manage My Plans' },
                    { id: 'exclusive', label: 'Exclusive Content' }
                  ].map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => setSubscriptionsTab(tab.id as any)}
                      className={`pb-3 text-xs font-bold transition-all cursor-pointer ${
                        subscriptionsTab === tab.id
                          ? 'text-violet-400 border-b-2 border-violet-500'
                          : 'text-zinc-500 hover:text-zinc-300'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                {/* Subscriptions List (Active) */}
                {subscriptionsTab === 'active' && (
                  <div className="space-y-4">
                    {activeSubscriptions.length === 0 ? (
                      <div className="py-12 text-center border border-dashed border-white/10 rounded-3xl bg-white/[0.02]">
                        <p className="text-sm text-zinc-400 font-bold">No active subscriptions</p>
                        <p className="text-xs text-zinc-600 mt-1">Subscribe to a creator to support them.</p>
                      </div>
                    ) : (
                      activeSubscriptions.map(sub => (
                        <div key={sub.username} className="flex items-center justify-between p-4 bg-[#0a0818] border border-white/5 rounded-2xl">
                          <div className="flex items-center gap-3">
                            <img src={sub.avatar} alt={sub.name} className="w-12 h-12 rounded-xl object-cover" referrerPolicy="no-referrer" />
                            <div>
                              <p className="text-sm font-bold text-white">{sub.name}</p>
                              <p className="text-[10px] font-mono text-zinc-500">@{sub.username}</p>
                              <div className="mt-1 flex items-center gap-1.5">
                                <span className="text-[9px] font-bold uppercase tracking-wider text-violet-400 bg-violet-400/10 px-2 py-0.5 rounded-md">{sub.plan}</span>
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-xs font-bold text-white mb-2">{sub.price}</p>
                            <button 
                              onClick={() => {
                                setActiveSubscriptions(prev => prev.filter(p => p.username !== sub.username));
                                window.dispatchEvent(new CustomEvent('toast', { detail: `❌ Unsubscribed from @${sub.username}` }));
                              }}
                              className="text-[10px] font-bold text-red-400 hover:text-white hover:bg-red-500/20 transition-colors bg-white/5 px-3 py-1.5 rounded-lg border border-white/5 cursor-pointer"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}

                {/* Manage My Plans Tab */}
                {subscriptionsTab === 'plans' && (
                  <div className="space-y-4">
                    <p className="text-xs text-zinc-400 leading-relaxed">
                      Configure the premium subscription tiers offered to your own subscribers. Update perks and prices to incentivize support.
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {mySubscriptionPlans.map((plan, index) => (
                        <div key={index} className="p-4 bg-[#0a0818] border border-white/5 rounded-2xl flex flex-col justify-between space-y-4">
                          <div>
                            <span className="text-[9px] font-bold uppercase tracking-wider text-violet-400 bg-violet-400/10 px-2.5 py-1 rounded-md block w-fit mb-2">
                              {plan.tier}
                            </span>
                            <p className="text-2xl font-black text-white">{plan.price}<span className="text-xs text-zinc-500 font-normal">/mo</span></p>
                            <p className="text-[11px] text-zinc-400 mt-2 leading-relaxed font-sans">{plan.perks}</p>
                          </div>
                          <button
                            onClick={() => {
                              const newPrice = prompt(`Enter new monthly price for ${plan.tier}:`, plan.price);
                              if (newPrice) {
                                setMySubscriptionPlans(prev => prev.map((p, i) => i === index ? { ...p, price: newPrice } : p));
                                window.dispatchEvent(new CustomEvent('toast', { detail: `✅ Updated price of ${plan.tier} to ${newPrice}/mo` }));
                              }
                            }}
                            className="w-full py-2 bg-white/5 hover:bg-white/10 text-white rounded-xl text-[10px] font-mono font-bold uppercase transition-all cursor-pointer"
                          >
                            Edit Pricing
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Exclusive Content Tab */}
                {subscriptionsTab === 'exclusive' && (
                  <div className="space-y-4">
                    <p className="text-xs text-zinc-400 leading-relaxed">
                      Exclusive posts and files available only to active supporters. High-tier items remain locked until the subscription is active.
                    </p>
                    <div className="space-y-3">
                      {exclusiveContentList.map(content => (
                        <div key={content.id} className="p-4 bg-[#0a0818] border border-white/5 rounded-2xl flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-violet-950/40 border border-white/10 flex items-center justify-center text-violet-300">
                              {content.type === 'Video' ? <Film className="w-5 h-5" /> : content.type === 'Audio' ? <Mic className="w-5 h-5" /> : <FileText className="w-5 h-5" />}
                            </div>
                            <div>
                              <p className="text-xs font-bold text-white flex items-center gap-1.5">
                                {content.title}
                                <span className="text-[9px] font-mono text-zinc-500">({content.type})</span>
                              </p>
                              <p className="text-[10px] text-zinc-500 font-mono mt-0.5">by @{content.creator} • {content.date}</p>
                            </div>
                          </div>
                          <button
                            onClick={() => {
                              window.dispatchEvent(new CustomEvent('toast', { detail: `🔒 Unlock higher subscription tier to view this exclusive ${content.type.toLowerCase()}!` }));
                            }}
                            className="px-4 py-2 bg-violet-950 text-violet-400 border border-white/10 hover:bg-violet-900/40 rounded-xl text-[10px] font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                          >
                            <Lock className="w-3.5 h-3.5" /> Unlock
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* 12. LINKED ACCOUNTS MANAGEMENT PAGE */}
      <AnimatePresence>
        {activePanel === 'linked-accounts' && (
          <div className="fixed inset-0 z-50 bg-[#04020f] overflow-y-auto">
            <div className="max-w-3xl mx-auto px-4 py-6 space-y-6 text-left relative min-h-screen">
              <div className="flex items-center justify-between border-b border-white/5 pb-4">
                <button
                  onClick={() => setActivePanel('profile')}
                  className="flex items-center gap-1 text-xs font-mono text-zinc-400 hover:text-white uppercase font-black cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" /> Back to Profile
                </button>
                <span className="text-xs font-mono text-zinc-400 font-extrabold uppercase">Linked Accounts</span>
              </div>
              


            </div>
          </div>
        )}
      </AnimatePresence>

      {/* Fixed, one-screen profile editor */}
      <AnimatePresence>
        {activePanel === 'edit-profile' && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 h-[100dvh] overflow-hidden bg-[#090714]"
            role="dialog" aria-modal="true" aria-label="Edit profile"
          >
            <div className="mx-auto flex h-full w-full max-w-3xl flex-col px-3 pb-[max(10px,env(safe-area-inset-bottom))] pt-[max(10px,env(safe-area-inset-top))] text-left">
              <header className="flex shrink-0 items-center justify-between border-b border-white/10 pb-2.5">
                <button type="button" onClick={handleCancelEditProfile} disabled={isSavingProfile || isSavingCoverPhoto || savingProfileFields.size > 0 || showSavedFeedback}
                  className="inline-flex items-center gap-1.5 rounded-lg px-2 py-2 text-sm font-semibold text-zinc-300 hover:bg-white/5 disabled:opacity-50">
                  <ArrowLeft className="h-4 w-4" /> Cancel
                </button>
                <h2 className="text-base font-bold text-white">Edit profile</h2>
                <span className="px-2 text-xs font-semibold text-violet-300" aria-live="polite">{isSavingProfile || isSavingCoverPhoto || savingProfileFields.size > 0 ? 'Saving…' : hasUnsavedProfileChanges ? 'Unsaved changes' : savedProfileFields.size > 0 ? 'Saved' : 'Up to date'}</span>
              </header>

              <div className="flex min-h-0 flex-1 flex-col justify-start gap-3 overflow-y-auto overscroll-contain py-3">
                <section aria-labelledby="profile-media-heading" className="overflow-hidden rounded-3xl border border-violet-300/15 bg-[#100C25]">
                  <div className="relative h-36 overflow-hidden bg-[#211B49] sm:h-44">
                    {(pendingCoverPreview || editCover) ? (
                      <img src={pendingCoverPreview || editCover} alt="Profile cover preview" className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full items-center justify-center bg-[radial-gradient(ellipse_at_top_right,_#4822A8_0%,_#21134C_42%,_#0B1020_100%)]">
                        <div className="text-center"><Sparkles className="mx-auto h-7 w-7 text-violet-200/70" /><p className="mt-2 text-[11px] font-medium tracking-wide text-violet-100/70">Your space on NEXORA</p></div>
                      </div>
                    )}
                    <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-[#100C25]/95 to-transparent" />
                    <div className="absolute right-3 top-3 flex items-center gap-2">
                      <button type="button" disabled={isSavingCoverPhoto || savingProfileFields.has('coverImage') || showSavedFeedback}
                        onClick={() => coverInputRef.current?.click()}
                        className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-white/20 bg-black/55 px-3 text-[11px] font-semibold text-white backdrop-blur-md transition hover:bg-black/70 disabled:opacity-50">
                        <ImageIcon className="h-3.5 w-3.5" /> {pendingCoverFile ? 'Change selection' : editCover ? 'Change cover' : 'Add cover'}
                      </button>
                    </div>
                    <div className="absolute -bottom-1 left-4 flex translate-y-1/2 items-end gap-3">
                      <img src={editAvatar} alt="Profile photo preview" className="h-[76px] w-[76px] rounded-full border-[3px] border-[#100C25] bg-[#211B49] object-cover shadow-xl sm:h-20 sm:w-20" />
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-3 px-4 pb-3 pt-11">
                    <div className="min-w-0">
                      <h3 id="profile-media-heading" className="text-sm font-semibold text-white">Profile identity</h3>
                      <p className="mt-0.5 text-[11px] text-zinc-400">Make your first impression yours.</p>
                    </div>
                    <button type="button" disabled={isSavingProfile || showSavedFeedback}
                      onClick={() => { setAvatarSourceType('select'); setIsAvatarModalOpen(true); }}
                      className="inline-flex min-h-9 items-center gap-1.5 rounded-xl border border-violet-300/20 bg-violet-500/10 px-3 text-[11px] font-semibold text-violet-200 transition hover:bg-violet-500/20 disabled:opacity-50">
                      <Camera className="h-3.5 w-3.5" /> Change photo
                    </button>
                  </div>
                  {pendingCoverFile && <div className="flex flex-wrap items-center gap-2 border-t border-white/10 px-4 py-3">
                    <span className="mr-auto text-[11px] text-violet-200" aria-live="polite">{isSavingCoverPhoto ? 'Preparing and uploading cover…' : 'Cover preview ready'}</span>
                    <button type="button" disabled={isSavingCoverPhoto} onClick={() => void handleSaveCoverPhoto()}
                      className="inline-flex min-h-9 items-center gap-1.5 rounded-xl bg-violet-600 px-3 text-[11px] font-bold text-white transition hover:bg-violet-500 disabled:opacity-50">
                      <Check className="h-3.5 w-3.5" /> {isSavingCoverPhoto ? 'Uploading…' : 'Save cover'}
                    </button>
                    <button type="button" aria-label="Cancel cover photo" disabled={isSavingCoverPhoto} onClick={() => { setPendingCoverFile(null); setPendingCoverPreview(null); }}
                      className="min-h-9 rounded-xl border border-white/10 px-3 text-[11px] font-semibold text-zinc-300 disabled:opacity-50">Cancel</button>
                  </div>}
                  {!pendingCoverFile && editCover && <div className="border-t border-white/10 px-4 py-2">
                    <button type="button" disabled={isSavingCoverPhoto || savingProfileFields.has('coverImage') || showSavedFeedback}
                      onClick={async () => { if (await saveProfileField({ coverImage: '' })) setEditCover(''); }}
                      className="text-[11px] font-medium text-zinc-400 transition hover:text-red-300 disabled:opacity-50">Remove cover photo</button>
                  </div>}
                  <input ref={coverInputRef} type="file" accept="image/*,.heic,.heif,.avif" className="hidden" disabled={isSavingCoverPhoto || savingProfileFields.has('coverImage')} onChange={handleCoverPhotoSelection} />
                </section>

                <section aria-labelledby="profile-details-heading" className="space-y-3 rounded-3xl border border-white/10 bg-[#0D1020] p-4">
                  <div>
                    <h3 id="profile-details-heading" className="text-sm font-semibold text-white">Profile details</h3>
                    <p className="mt-0.5 text-[11px] text-zinc-400">The details people see across NEXORA.</p>
                  </div>
                <div className="grid grid-cols-1 gap-x-4 gap-y-3 sm:grid-cols-2">
                  <label className="min-w-0 text-xs text-zinc-300">Name
                    <span className="mt-0.5 block text-[10px] text-zinc-500">{ProfileService.isIdentityChangeGraceAvailable('displayName', currentUser) ? 'One-time update available today. After saving, locked for 7 days.' : 'After changing, display name is locked for 7 days.'}</span>
                    <input value={editName} onChange={e => setEditName(e.target.value)} maxLength={50} disabled={isSavingProfile || savingProfileFields.has('name') || showSavedFeedback}
                      className="mt-1 h-10 w-full rounded-xl border border-white/10 bg-[#120E2B] px-3 text-sm text-white outline-none focus:border-violet-500 disabled:opacity-50" placeholder="Your name" />
                  </label>
                  <label className="min-w-0 text-xs text-zinc-300">Username
                    <span className="mt-0.5 block text-[10px] text-zinc-500">{ProfileService.isIdentityChangeGraceAvailable('username', currentUser) ? 'One-time update available today. After saving, locked for 30 days.' : 'After changing, username is locked for 30 days.'}</span>
                    <div className="mt-1 flex h-10 items-center rounded-xl border border-white/10 bg-[#120E2B] px-3 focus-within:border-violet-500">
                      <span className="text-violet-300">@</span>
                      <input value={editUsername} onChange={e => setEditUsername(e.target.value.toLowerCase().replace(/^@/, '').replace(/\s/g, ''))} maxLength={30} disabled={isSavingProfile || savingProfileFields.has('username') || showSavedFeedback}
                        className="min-w-0 w-full bg-transparent pl-1 text-sm text-white outline-none disabled:opacity-50" placeholder="username" />
                    </div>
                  </label>
                  <label className="min-w-0 text-xs text-zinc-300">Website
                    <input value={editWebsite} onChange={e => setEditWebsite(e.target.value)} disabled={isSavingProfile || savingProfileFields.has('website') || showSavedFeedback}
                      className="mt-1 h-10 w-full rounded-xl border border-white/10 bg-[#120E2B] px-3 text-sm text-white outline-none focus:border-violet-500" placeholder="yourwebsite.com" />
                  </label>
                  <label className="min-w-0 text-xs text-zinc-300">Location
                    <input value={editLocation} onChange={e => setEditLocation(e.target.value)} disabled={isSavingProfile || savingProfileFields.has('location') || showSavedFeedback}
                      className="mt-1 h-10 w-full rounded-xl border border-white/10 bg-[#120E2B] px-3 text-sm text-white outline-none focus:border-violet-500" placeholder="City, country" />
                  </label>
                  <label className="min-w-0 text-xs text-zinc-300">Pronouns
                    <input value={editPronouns} onChange={e => setEditPronouns(e.target.value)} disabled={isSavingProfile || savingProfileFields.has('pronouns') || showSavedFeedback}
                      className="mt-1 h-10 w-full rounded-xl border border-white/10 bg-[#120E2B] px-3 text-sm text-white outline-none focus:border-violet-500" placeholder="Optional" />
                  </label>
                  <label className="min-w-0 text-xs text-zinc-300">Profile type
                    <select value={editCategory} onChange={e => setEditCategory(e.target.value)} disabled={isSavingProfile || savingProfileFields.has('profileCategory') || showSavedFeedback}
                      className="mt-1 h-10 w-full rounded-xl border border-white/10 bg-[#120E2B] px-2 text-sm text-white outline-none focus:border-violet-500">
                      <option value="Digital Creator">Digital creator</option><option value="Founder Mindset">Founder</option><option value="Community Leader">Community leader</option><option value="Technical Support">Technical support</option>
                    </select>
                  </label>
                  <div className="col-span-full min-w-0 text-xs text-zinc-300">
                    <div className="mb-1 flex items-center justify-between gap-2">
                      <label htmlFor="nexora-edit-bio">Bio</label>
                      {profileFieldSaveAction('bio', () => saveProfileField({ bio: editBio }), editBio !== (currentUser.bio || ''))}
                    </div>
                    <p className="mb-1 text-[10px] text-zinc-500">Up to 160 characters. Tap Save when you're finished.</p>
                    <textarea id="nexora-edit-bio" value={editBio} onChange={e => { setEditBio(e.target.value); markProfileFieldEdited('bio'); }} maxLength={160} rows={3} disabled={isSavingProfile || savingProfileFields.has('bio') || showSavedFeedback}
                      className="block w-full resize-none rounded-xl border border-white/10 bg-[#120E2B] px-3 py-2 text-sm text-white outline-none focus:border-violet-500" placeholder="Tell people a little about yourself." />
                    <div className="mt-1 flex items-center justify-between text-[10px] text-zinc-500">
                      <span>{editBio.length}/160 characters</span>
                      <span>{savingProfileFields.has('bio') ? 'Saving bio…' : savedProfileFields.has('bio') ? 'Bio saved' : editBio !== (currentUser.bio || '') ? 'Tap Save to publish your bio' : 'Your bio is up to date'}</span>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <label className="min-w-0 text-xs text-zinc-300">Creator type
                    <select value={editCreatorType} onChange={e => setEditCreatorType(e.target.value)} disabled={isSavingProfile || savingProfileFields.has('creatorType') || showSavedFeedback}
                      className="mt-1 h-10 w-full rounded-xl border border-white/10 bg-[#120E2B] px-2 text-sm text-white outline-none focus:border-violet-500">
                      <option value="Premium creator">Premium</option><option value="Creator">Creator</option><option value="Collaborator">Collaborator</option>
                    </select>
                  </label>
                  <label className="min-w-0 text-xs text-zinc-300">X profile
                    <input value={editSocialTwitter} onChange={e => setEditSocialTwitter(e.target.value)} disabled={isSavingProfile || savingProfileFields.has('socialTwitter') || showSavedFeedback}
                      className="mt-1 h-10 w-full rounded-xl border border-white/10 bg-[#120E2B] px-3 text-sm text-white outline-none focus:border-violet-500" placeholder="@username or link" />
                  </label>
                  <label className="col-span-full min-w-0 text-xs text-zinc-300">Instagram
                    <input value={editSocialInsta} onChange={e => setEditSocialInsta(e.target.value)} disabled={isSavingProfile || savingProfileFields.has('socialInstagram') || showSavedFeedback}
                      className="mt-1 h-10 w-full rounded-xl border border-white/10 bg-[#120E2B] px-3 text-sm text-white outline-none focus:border-violet-500" placeholder="@username or link" />
                  </label>
                </div>
                </section>
              </div>
              <div className="shrink-0 flex items-center justify-between gap-3 border-t border-white/10 pt-3 pb-1">
                <p className="min-w-0 text-[10px] text-zinc-500">Save your profile details when you're finished. Photos have their own Save actions.</p>
                <button type="button" onClick={() => void handleSaveProfile()}
                  disabled={!hasUnsavedProfileChanges || isSavingProfile || isSavingCoverPhoto || !!pendingCoverFile || savingProfileFields.size > 0 || showSavedFeedback}
                  className="inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 text-xs font-bold text-white shadow-[0_6px_20px_rgba(113,56,255,0.22)] transition-colors hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-45">
                  <Check className="h-4 w-4" /> {isSavingProfile ? 'Saving…' : showSavedFeedback ? 'Saved' : 'Save profile'}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* EXQUISITE INTERACTIVE PROFILE PICTURE EDITOR MODAL */}
      <AnimatePresence>
        {isAvatarModalOpen && (
          <div className="fixed inset-0 z-[200] bg-black/95 backdrop-blur-md flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.92, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.92, opacity: 0 }}
              className="bg-[#0b0821] border border-white/10 rounded-2xl max-w-sm w-full overflow-hidden p-6 space-y-5 text-left"
            >
              <div className="flex items-center justify-between border-b border-white/5 pb-2">
                <span className="text-[10px] font-mono text-violet-400 font-extrabold uppercase tracking-widest">
                  Profile photo
                </span>
                <button
                  onClick={() => {
                    stopWebcam();
                    setIsAvatarModalOpen(false);
                    setGalleryImage(null);
                  }}
                  className="p-1 text-zinc-400 hover:text-white text-xs font-mono cursor-pointer"
                >
                  Close ×
                </button>
              </div>

              {avatarSourceType === 'select' && (
                <div className="flex flex-col gap-2 pt-2">
                  <button
                    onClick={() => {
                      setAvatarSourceType('webcam');
                      startWebcam();
                    }}
                    className="w-full py-3 bg-violet-600 hover:bg-violet-500 text-white font-mono text-[11px] font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2"
                  >
                    <Camera className="w-4 h-4" /> Take Photo
                  </button>

                  <button
                    onClick={() => {
                      fileInputRef.current?.click();
                    }}
                    className="w-full py-3 bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-200 font-mono text-[11px] font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2"
                  >
                    <ImageIcon className="w-4 h-4" /> Choose from your photos
                  </button>

                  <button
                    onClick={async () => {
                      if (isSavingProfile) return;
                      setIsSavingProfile(true);
                      try {
                        const fallbackAvatar = getDefaultAvatar(editName || editUsername);
                        await onUpdateProfile({ avatar: fallbackAvatar });
                        setEditAvatar(fallbackAvatar);
                        setIsAvatarModalOpen(false);
                        setGalleryImage(null);
                        window.dispatchEvent(new CustomEvent('toast', { detail: 'Profile photo removed and saved.' }));
                      } catch {
                        window.dispatchEvent(new CustomEvent('toast', { detail: 'NEXORA could not remove your profile photo. Please try again.' }));
                      } finally {
                        setIsSavingProfile(false);
                      }
                    }}
                    className="w-full py-3 bg-red-950/40 hover:bg-red-900/50 border border-red-900/25 text-red-400 font-mono text-[11px] font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2"
                  >
                    <Trash2 className="w-4 h-4" /> Remove photo
                  </button>

                  <button
                    onClick={() => {
                      setIsAvatarModalOpen(false);
                    }}
                    className="w-full py-3 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 font-mono text-[11px] font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              )}

              {avatarSourceType === 'webcam' && (
                <div className="space-y-4">
                  {isWebcamActive ? (
                    <div className="relative aspect-square rounded-2xl bg-black overflow-hidden border border-white/10 max-w-xs mx-auto">
                      <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover scale-x-[-1]" />
                      <div className="absolute top-2 right-2 px-2 py-0.5 bg-black/60 rounded-full animate-pulse text-red-500 text-[10px] font-mono">
                        🔴 Camera is on
                      </div>
                    </div>
                  ) : (
                    <div className="aspect-square rounded-2xl bg-black/40 border border-white/5 flex items-center justify-center text-zinc-500 text-xs font-mono">
                      Initializing camera...
                    </div>
                  )}

                  {webcamError && <p className="text-[10px] font-mono text-red-400 text-center">{webcamError}</p>}

                  <div className="flex gap-2">
                    <button
                      onClick={capturePhotoToGallery}
                      className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-mono text-[10px] font-bold uppercase rounded-lg transition-all cursor-pointer"
                    >
                      Capture
                    </button>
                    <button
                      onClick={() => {
                        stopWebcam();
                        setAvatarSourceType('select');
                      }}
                      className="flex-1 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 font-mono text-[10px] font-bold uppercase rounded-lg transition-all cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {avatarSourceType === 'gallery_edit' && galleryImage && (
                <div className="space-y-4">
                  {/* Circular Preview Container */}
                  <div className="relative w-44 h-44 mx-auto rounded-full overflow-hidden border-2 border-violet-500 bg-black/40 flex items-center justify-center">
                    <div className="absolute inset-0 border border-white/5 rounded-full pointer-events-none z-10" />
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
                      <div className="w-full h-[1px] bg-white/10" />
                    </div>
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
                      <div className="h-full w-[1px] bg-white/10" />
                    </div>
                    
                    <img
                      src={galleryImage}
                      alt="Crop target"
                      className="max-w-none origin-center transition-all duration-75"
                      style={{
                        transform: `scale(${avatarZoom}) rotate(${avatarRotation}deg)`,
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover'
                      }}
                    />
                  </div>

                  {/* Zoom Slider */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[10px] font-mono text-zinc-400 uppercase">
                      <span>Zoom</span>
                      <span>{avatarZoom.toFixed(1)}x</span>
                    </div>
                    <input
                      type="range"
                      min="1"
                      max="3"
                      step="0.1"
                      value={avatarZoom}
                      onChange={(e) => setAvatarZoom(parseFloat(e.target.value))}
                      className="w-full accent-violet-500 bg-zinc-800 rounded-lg appearance-none h-1.5 cursor-pointer"
                    />
                  </div>

                  {/* Rotate Control */}
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono text-zinc-400 uppercase">Rotate photo</span>
                    <button
                      onClick={() => setAvatarRotation(prev => (prev + 90) % 360)}
                      className="px-3 py-1.5 bg-white/5 border border-white/10 text-white font-mono text-[9px] uppercase font-bold rounded-lg hover:bg-white/10 cursor-pointer flex items-center gap-1"
                    >
                      <RefreshCw className="w-3 h-3 text-violet-400 animate-spin" /> Rotate 90°
                    </button>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-2 pt-2 border-t border-white/5">
                    <button
                      onClick={() => {
                        setGalleryImage(null);
                        setAvatarSourceType('select');
                      }}
                      className="flex-1 py-2.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 font-mono text-[10px] font-bold uppercase rounded-lg transition-all cursor-pointer"
                    >
                      Back
                    </button>
                    <button
                      onClick={handleSaveCroppedAvatar}
                      disabled={isSavingProfile}
                      className="flex-1 py-2.5 bg-linear-to-r from-violet-600 to-violet-500 hover:brightness-110 text-white font-mono text-[10px] font-black uppercase rounded-lg transition-all cursor-pointer disabled:cursor-wait disabled:opacity-60"
                    >
                      {isSavingProfile ? 'Uploading…' : 'Upload & Save Photo'}
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* HIDDEN FILE INPUT FOR GALLERY SELECT */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleGalleryFileSelect}
        className="hidden"
      />

      {/* 11. REPUTATION & CONTRIBUTIONS ALGORITHM MATRIX MODAL */}
      <AnimatePresence>
        {showReputationModal && (
          <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4" onClick={() => setShowReputationModal(false)}>
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#0b081e] border border-white/10 rounded-2xl p-6 max-w-lg w-full text-left space-y-5 overflow-y-auto max-h-[90vh]"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-violet-600/20 border border-white/10 flex items-center justify-center text-violet-400">
                    <Shield className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-sans font-extrabold text-white">How Reputation works</h3>
                    <p className="text-[10px] font-mono text-zinc-400">Your community standing and contribution score</p>
                  </div>
                </div>
                <button 
                  onClick={() => setShowReputationModal(false)}
                  className="p-1.5 px-3 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white text-xs font-mono transition-all cursor-pointer"
                >
                  Close ×
                </button>
              </div>

              {/* Core Definitions Banner */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3.5 rounded-2xl bg-violet-950/30 border border-white/10 space-y-1">
                  <span className="text-[10px] font-mono text-violet-400 font-extrabold uppercase block">Reputation</span>
                  <p className="text-xs font-sans text-zinc-200 font-medium">"The trust and impact you have built on Nexora."</p>
                  <span className="text-[11px] font-black text-white block pt-1">{formatSecondaryStat(currentUser.reputationPoints || 0)} PR</span>
                </div>
                <div className="p-3.5 rounded-2xl bg-violet-950/30 border border-violet-500/20 space-y-1">
                  <span className="text-[10px] font-mono text-violet-300 font-extrabold uppercase block">Contributions</span>
                  <p className="text-xs font-sans text-zinc-200 font-medium">What you've shared with Nexora.</p>
                  <span className="text-[11px] font-black text-white block pt-1">{formatSecondaryStat(currentUser.reputationBreakdown?.contributions || 0)} Value</span>
                </div>
              </div>

              <div className="rounded-2xl border border-violet-500/20 bg-violet-950/25 p-4 space-y-2.5">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <span className="block text-[10px] font-mono font-extrabold uppercase tracking-wider text-violet-300">Community standing</span>
                    <span className="mt-1 block text-sm font-black text-white">{reputationStanding.tier}</span>
                  </div>
                  <span className="rounded-full border border-violet-400/25 bg-violet-500/10 px-2.5 py-1 text-[10px] font-bold text-violet-200">
                    {reputationStanding.nextTier ? `Level ${['Newcomer', 'Active Member', 'Trusted Builder', 'Master Contributor', 'Apex Luminary'].indexOf(reputationStanding.tier) + 1} of 5` : 'Highest level'}
                  </span>
                </div>
                <div role="progressbar" aria-label="Progress toward next reputation level" aria-valuemin={0} aria-valuemax={100} aria-valuenow={reputationStanding.progress} className="h-1.5 overflow-hidden rounded-full bg-white/10">
                  <div className="h-full rounded-full bg-violet-500 transition-[width]" style={{ width: `${reputationStanding.progress}%` }} />
                </div>
                <p className="text-[11px] leading-relaxed text-zinc-300">
                  {reputationStanding.nextTier
                    ? `${reputationStanding.pointsRemaining} more Reputation points to reach ${reputationStanding.nextTier}.`
                    : 'You have reached NEXORA’s highest Reputation level.'}
                  {' '}Reputation is earned through trust and positive community impact. Nex Coins and follower counts cannot buy it.
                </p>
              </div>

              {/* Algorithm Invariants & Protection Status */}
              <div className="p-3.5 rounded-2xl bg-white/5 border border-white/5 space-y-2">
                <div className="flex items-center justify-between text-[11px] font-mono">
                  <span className="text-emerald-400 font-bold flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Invariant: Rep ≤ Contrib
                  </span>
                  <span className="text-violet-300 font-bold flex items-center gap-1">
                    <Lock className="w-3.5 h-3.5" /> Integrity protections
                  </span>
                </div>
                <p className="text-[11px] text-zinc-400 leading-relaxed font-sans">
                  Contributions grow organically with platform value, while Reputation requires verified trust signals, distinct community engagement, and sustained quality.
                </p>
              </div>

              {/* 6 Internal Contribution Pillar Breakdown */}
              <div className="space-y-3">
                <h4 className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider font-extrabold flex items-center justify-between">
                  <span>Internal Contribution Dimensions</span>
                  <span className="text-violet-400 text-[10px]">6 things tracked</span>
                </h4>

                <div className="grid grid-cols-1 gap-2.5">
                  {!currentUser.reputationBreakdown?.categories && (
                    <p className="text-[10px] text-zinc-500 leading-relaxed">
                      Verified contribution scores will appear here when the platform has evaluated your activity. Placeholder scores are not displayed.
                    </p>
                  )}
                  {[
                    { key: 'contentCreation', name: 'Content Creation', icon: '🎨', val: currentUser.reputationBreakdown?.categories?.contentCreation ?? 0, desc: 'Original posts, rich media & video depth', color: 'bg-violet-500' },
                    { key: 'communityEngagement', name: 'Community Engagement', icon: '💬', val: currentUser.reputationBreakdown?.categories?.communityEngagement ?? 0, desc: 'Thoughtful comments & creator sparks', color: 'bg-violet-400' },
                    { key: 'helpfulResponses', name: 'Helpful Responses', icon: '💡', val: currentUser.reputationBreakdown?.categories?.helpfulResponses ?? 0, desc: 'Direct replies & community endorsements', color: 'bg-violet-300' },
                    { key: 'discoveryImpact', name: 'Discovery Impact', icon: '🚀', val: currentUser.reputationBreakdown?.categories?.discoveryImpact ?? 0, desc: 'Unique user sparks & viral shares', color: 'bg-emerald-500' },
                    { key: 'trustBuilding', name: 'Trust Building', icon: '🔒', val: currentUser.reputationBreakdown?.categories?.trustBuilding ?? 0, desc: 'Profile completeness & account longevity', color: 'bg-amber-500' },
                    { key: 'platformParticipation', name: 'Platform Participation', icon: '🌐', val: currentUser.reputationBreakdown?.categories?.platformParticipation ?? 0, desc: 'Missions completed & circle leadership', color: 'bg-indigo-500' },
                  ].map(pillar => {
                    const maxVal = Math.max(50, (currentUser.reputationBreakdown?.contributions ?? 0) * 0.4);
                    const pct = Math.min(100, Math.round((pillar.val / maxVal) * 100));

                    return (
                      <div key={pillar.key} className="p-3 rounded-2xl bg-white/[0.03] border border-white/5 space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-zinc-200 flex items-center gap-1.5">
                            <span>{pillar.icon}</span> {pillar.name}
                          </span>
                          <span className="font-mono text-white font-extrabold">{pillar.val} pts</span>
                        </div>
                        <p className="text-[10px] text-zinc-400 leading-tight">{pillar.desc}</p>
                        <div role="progressbar" aria-label={pillar.name + ' score'} aria-valuemin={0} aria-valuemax={maxVal} aria-valuenow={pillar.val} className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                          <div className={`h-full ${pillar.color}`} style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Quality & Anti-Gaming Diagnostics */}
              <div className="p-4 rounded-2xl bg-violet-950/20 border border-white/10 space-y-2 text-center">
                <span className="text-[10px] font-mono text-violet-300 uppercase block font-extrabold">Feed preferences</span>
                <div className="grid grid-cols-3 gap-2 text-center pt-1">
                  <div className="bg-white/5 p-2 rounded-xl">
                    <span className="text-xs font-mono font-bold text-emerald-400 block">
                      {currentUser.reputationBreakdown?.trustMultiplier == null ? 'N/A' : Math.round(currentUser.reputationBreakdown.trustMultiplier * 100) + '%'}
                    </span>
                    <span className="text-[9px] text-zinc-400 block mt-0.5">Trust Multiplier</span>
                  </div>
                  <div className="bg-white/5 p-2 rounded-xl">
                    <span className="text-xs font-mono font-bold text-violet-300 block">
                      {currentUser.reputationBreakdown?.antiGamingStatus?.uniqueEngagerRatio == null ? 'N/A' : Math.round(currentUser.reputationBreakdown.antiGamingStatus.uniqueEngagerRatio * 100) + '%'}
                    </span>
                    <span className="text-[9px] text-zinc-400 block mt-0.5">Unique Engagers</span>
                  </div>
                  <div className="bg-white/5 p-2 rounded-xl">
                    <span className="text-xs font-mono font-bold text-violet-300 block">N/A</span>
                    <span className="text-[9px] text-zinc-400 block mt-0.5">Integrity status</span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => setShowReputationModal(false)}
                className="w-full py-3 bg-violet-600 hover:bg-violet-500 text-white font-mono font-bold text-xs uppercase tracking-wider rounded-2xl cursor-pointer transition-all shadow-lg shadow-violet-600/20"
              >
                Close Algorithm Matrix
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 12. FULL SCREEN EXPANDED PHOTO OVERLAY */}
      <AnimatePresence>
        {profilePicExpanded && (
          <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4" onClick={() => setProfilePicExpanded(false)}>
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative max-w-md w-full aspect-square rounded-[36px] overflow-hidden border border-white/10"
              onClick={(e) => e.stopPropagation()}
            >
              <img src={normalizeMediaDeliveryUrl(currentUser.avatar)} className="w-full h-full object-cover" alt="Expanded user profile avatar" referrerPolicy="no-referrer" />
              <button 
                onClick={() => setProfilePicExpanded(false)}
                className="absolute top-4 right-4 p-2 rounded-2xl bg-black/50 hover:bg-black/80 border border-white/10 text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 14. GRID SELECTION DETAIL DRAWER (Clicking a thumbnail post opens it) */}
      <AnimatePresence>
        {selectedGridPost && (
          <ImmersiveVideoViewer
            initialPost={selectedGridPost}
            creatorPosts={orderedGridPosts}
            currentUser={currentUser}
            onClose={() => setSelectedGridPost(null)}
            onLikePost={onLikePost}
            onToggleFollow={onToggleFollow}
            isFollowing={isFollowing}
            onAddComment={onAddComment}
          />
        )}
      </AnimatePresence>

      {/* 📥 NEXORA SOCIAL SHARE SHEET MODAL */}
      {showGiftVerse && <div className="fixed inset-0 z-[160] overflow-y-auto bg-black/90 backdrop-blur-md">
        <div className="sticky top-0 z-[170] flex justify-end border-b border-white/10 bg-[#090714]/95 p-3">
          <button type="button" onClick={() => setShowGiftVerse(false)} className="rounded-xl border border-white/15 px-4 py-2 text-xs font-bold text-white">Close GiftVerse</button>
        </div>
        <GiftVerseView isLoggedIn={isLoggedIn} recipientId={currentUser.id} deliveryContext="profile" deliveryContextId={currentUser.id}/>
      </div>}
      <ShareSheet
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        onShare={(recipientId) => {
          window.dispatchEvent(new CustomEvent('toast', { detail: '🚀 Profile shared successfully!' }));
        }}
        post={{
          id: currentUser.id,
          username: currentUser.username,
          name: currentUser.name,
          tags: [],
          likes: currentUser.followers || 0,
        }}
      />
      <ReportModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        targetType="user"
        targetId={currentUser.id}
        targetContent={currentUser.bio || currentUser.name}
        reporterUsername={auth.currentUser?.displayName || 'NEXORA member'}
      />
      <StorageDataCenterModal isOpen={isStorageCenterOpen} onClose={() => setIsStorageCenterOpen(false)} />
      </div>
    </div>
  );
}
