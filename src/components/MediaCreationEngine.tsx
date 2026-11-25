import { authenticatedVohFetch } from '../services/voh/authenticatedVohFetch';
import React, { useState, useEffect, useRef } from 'react';
import NexoraLensStudio from './NexoraLensStudio';
import { NEXORA_LENS_CATALOG } from '../services/nexoraLensCatalog';
import { motion, AnimatePresence } from 'motion/react';
import { X, Check, Plus, Camera, Video, Mic, Clapperboard, BarChart2, FileText, MapPin, ChevronRight, Trash2, Play, Pause, RefreshCw, Volume2, RotateCw, Crop, Sliders, VolumeX, Save, ChevronLeft, ArrowUp, ArrowDown, Users, FolderHeart, ShieldAlert, BadgeInfo, Calendar, Smile, FileImage, SlidersHorizontal, Eye, HelpCircle, Sparkle, Sparkles, Settings, Info, Tag } from 'lucide-react';
import VohIcon from './VohIcon';
import { User } from '../types';
import { videoFileExtension } from '../services/media/videoFileExtension';
import { saveMediaBlob, getMediaBlob, generateVideoThumbnail } from '../utils/indexedDbStorage';
import { revokeObjectUrl, validateMediaFile } from '../utils/mediaValidation';
import { uploadMediaFile } from '../services/firebase/storageService';
import { setOriginRemixPolicy, type OriginRemixPolicy } from '../services/originRemixPolicyService';
import { VoiceEngine } from '../services/voh/voiceEngine';
import NexoraLoader from './NexoraLoader';
import { deleteDraft, getDrafts, saveDraft } from '../services/dataService';
import { db } from '../lib/firebase';
import { collection, endAt, getDocs, limit, orderBy, query, startAt, where } from 'firebase/firestore';
import { isNativeGalleryAvailable, requestNativeGalleryAccess, loadNativeGalleryPage, importNativeGalleryItem, type NexoraGalleryItem } from '../services/nativeGalleryService';

type PhotoExportOptions = {
  rotation: number;
  zoom: number;
  cropOffset: { x: number; y: number };
  aspectRatio: number | null;
  filterStyle?: string;
  brightness: number;
  contrast: number;
  saturation: number;
  blur: number;
  sticker?: string | null;
  text?: string;
  textColor?: string;
};

/** Load a local image safely, attaching handlers before src to avoid cached-load races. */
function loadComposerImage(url: string, timeoutMs = 12000): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    let settled = false;
    const finish = (error?: Error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      image.onload = null;
      image.onerror = null;
      if (error) reject(error);
      else resolve(image);
    };
    const timeout = window.setTimeout(
      () => finish(new Error('Photo preparation took too long. Please try again or choose a smaller photo.')),
      timeoutMs,
    );
    image.onload = () => finish();
    image.onerror = () => finish(new Error('This photo could not be prepared. Please choose it again.'));
    image.src = url;
    // Cached object URLs can already be complete by the time src is assigned.
    if (image.complete && image.naturalWidth > 0) finish();
  });
}

/** Bake the adjustments shown in the composer into the image that is uploaded. */
async function renderEditedPhotoBlob(source: Blob, options: PhotoExportOptions): Promise<Blob> {
  const objectUrl = URL.createObjectURL(source);
  try {
    const image = await loadComposerImage(objectUrl);
    const resizeRatio = Math.min(1, 4096 / Math.max(image.naturalWidth, image.naturalHeight));
    const sourceWidth = Math.max(1, Math.round(image.naturalWidth * resizeRatio));
    const sourceHeight = Math.max(1, Math.round(image.naturalHeight * resizeRatio));
    const rotated = Math.abs(options.rotation % 180) === 90;
    const naturalWidth = rotated ? sourceHeight : sourceWidth;
    const naturalHeight = rotated ? sourceWidth : sourceHeight;
    const ratio = typeof options.aspectRatio === 'number' && Number.isFinite(options.aspectRatio) && options.aspectRatio > 0 ? options.aspectRatio : naturalWidth / naturalHeight;
    const maxEdge = 2560;
    let outputWidth = maxEdge;
    let outputHeight = Math.round(outputWidth / ratio);
    if (outputHeight > maxEdge) { outputHeight = maxEdge; outputWidth = Math.round(outputHeight * ratio); }
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, outputWidth);
    canvas.height = Math.max(1, outputHeight);
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Photo editing is not available in this browser.');
    const coverScale = Math.max(outputWidth / naturalWidth, outputHeight / naturalHeight);
    const drawWidth = sourceWidth * coverScale;
    const drawHeight = sourceHeight * coverScale;
    const zoom = Math.max(1, options.zoom);
    const overflowX = Math.max(0, (naturalWidth * coverScale * zoom - outputWidth) / 2);
    const overflowY = Math.max(0, (naturalHeight * coverScale * zoom - outputHeight) / 2);
    const offsetX = Math.max(-100, Math.min(100, options.cropOffset?.x || 0)) / 100 * overflowX;
    const offsetY = Math.max(-100, Math.min(100, options.cropOffset?.y || 0)) / 100 * overflowY;
    context.save();
    context.translate(outputWidth / 2 + offsetX, outputHeight / 2 + offsetY);
    context.rotate((options.rotation * Math.PI) / 180);
    context.scale(zoom, zoom);
    const filters = [
      options.filterStyle && options.filterStyle !== 'none' ? options.filterStyle : '',
      `brightness(${options.brightness}%)`,
      `contrast(${options.contrast}%)`,
      `saturate(${options.saturation}%)`,
      options.blur > 0 ? `blur(${options.blur}px)` : '',
    ].filter(Boolean);
    context.filter = filters.join(' ');
    context.drawImage(image, -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight);
    context.restore();
    context.filter = 'none';
    if (options.sticker) {
      context.font = `bold ${Math.max(48, Math.round(canvas.width * 0.12))}px sans-serif`;
      context.textAlign = 'center'; context.textBaseline = 'middle';
      context.fillText(options.sticker, canvas.width / 2, canvas.height / 2);
    }
    if (options.text?.trim()) {
      const fontSize = Math.max(24, Math.round(canvas.width * 0.045));
      const padding = Math.round(fontSize * 0.65);
      context.font = `700 ${fontSize}px sans-serif`; context.textAlign = 'center'; context.textBaseline = 'middle';
      const maxWidth = canvas.width - padding * 2;
      const words = options.text.trim().split(/\s+/); const lines: string[] = []; let line = '';
      for (const word of words) {
        const candidate = line ? `${line} ${word}` : word;
        if (line && context.measureText(candidate).width > maxWidth) { lines.push(line); line = word; } else line = candidate;
      }
      if (line) lines.push(line);
      const lineHeight = Math.round(fontSize * 1.25);
      const blockHeight = lines.length * lineHeight + padding;
      const top = canvas.height - blockHeight - padding;
      context.fillStyle = 'rgba(5, 9, 20, 0.72)';
      context.fillRect(padding / 2, top, canvas.width - padding, blockHeight);
      context.fillStyle = options.textColor || '#ffffff';
      lines.forEach((item,index) => context.fillText(item, canvas.width / 2, top + padding / 2 + index * lineHeight + lineHeight / 2, maxWidth));
    }
    return await new Promise<Blob>((resolve,reject) => {
      const timeout = window.setTimeout(() => reject(new Error('Photo preparation took too long. Please try again with a smaller photo.')),12000);
      canvas.toBlob(blob => { clearTimeout(timeout); if(blob) resolve(blob); else reject(new Error('Your edited photo could not be exported. Please try again.')); },'image/jpeg',0.92);
    });
  } finally { URL.revokeObjectURL(objectUrl); }
}


/**
 * Reduce large still-image uploads on-device without touching animated formats.
 * WebP keeps transparency and is only used when the encoded result is smaller.
 */
async function optimizePhotoUpload(source: Blob): Promise<Blob> {
  const type = source.type.toLowerCase();
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(type)) return source;
  if (source.size < 700 * 1024) return source;

  const objectUrl = URL.createObjectURL(source);
  try {
    let image: HTMLImageElement;
    try {
      image = await loadComposerImage(objectUrl);
    } catch (error) {
      // Optimization is optional. Never hold up a valid original photo because
      // a device's decoder is slow or unavailable.
      console.warn('[MediaCreation] Photo optimization skipped; uploading original.', error);
      return source;
    }
    const maxEdge = 2560;
    const scale = Math.min(1, maxEdge / Math.max(image.naturalWidth, image.naturalHeight));
    if (scale === 1 && source.size < 1.5 * 1024 * 1024) return source;
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
    const context = canvas.getContext('2d');
    if (!context) return source;
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    const optimized = await new Promise<Blob | null>(resolve => {
      const timeout = window.setTimeout(() => resolve(null), 10000);
      canvas.toBlob(blob => {
        clearTimeout(timeout);
        resolve(blob);
      }, 'image/webp', 0.86);
    });
    return optimized && optimized.size > 0 && optimized.size < source.size ? optimized : source;
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

interface MediaCreationEngineProps {
  currentUser: User;
  /** Firebase's authenticated UID is the source of truth for media ownership. */
  authenticatedUserId?: string;
  onClose: () => void;
  onAddPost: (
    content: string, 
    imageUrl?: string, 
    tagsString?: string, 
    images?: string[], 
    videoUrl?: string, 
    voiceTranscript?: string, 
    voiceAudioUrl?: string, 
    audience?: 'public' | 'circle' | 'community' | 'followers' | 'onlyme',
    isVoice?: boolean,
    voiceDuration?: number,
    interactivePoll?: any,
    opportunityType?: string,
    pulseRegion?: string,
    imageFilter?: string,
    imageFilters?: string[],
    scheduledTime?: string,
    isBroadcastPost?: boolean,
    communityName?: string,
    postDetails?: { location?: string; taggedUsernames?: string[]; imageAltText?: string; commentsAllowed?: boolean; mediaAssetId?: string; mediaAssetIds?: string[]; publicationId?: string; signal?: AbortSignal }
  ) => string;
  onPublishPost?: (...args: Parameters<MediaCreationEngineProps['onAddPost']>) => Promise<string>;
  onPublishStory?: (caption: string, file?: File, onProgress?: (progress: number) => void, signal?: AbortSignal) => Promise<string>;
  theme: 'neon-cyber' | 'stealth-dark' | 'platinum-light' | 'emerald-glass';
  isStoryModeInitially?: boolean;
  isOffline?: boolean;
  onToggleOffline?: () => void;
  initialMode?: 'text' | 'photo' | 'video' | 'reel' | 'voice' | 'poll' | 'pulse' | 'community' | null;
  initialTab?: 'feed' | 'story' | 'drafts';
  initialCaption?: string;
  onOpenStudio?: (files: File[]) => void;
}

interface SelectedImage {
  url: string;
  fileName?: string;
  capturedAt?: number;
  rotation: number;
  zoom: number;
  cropOffset: { x: number; y: number };
  aspectRatio?: number | null;
  filterName?: string;
  filterStyle?: string;
}

interface DraftItem {
  id: string;
  caption: string;
  images: string[];
  imageEdits?: Pick<SelectedImage, 'rotation' | 'zoom' | 'cropOffset' | 'aspectRatio' | 'filterName' | 'filterStyle'>[];
  videoUrl?: string;
  voiceUrl?: string;
  transcript?: string;
  topics: string;
  audience: 'public' | 'circle' | 'community' | 'followers' | 'onlyme';
  type: string;
  timestamp: string;
  location?: string;
  taggedUsernames?: string;
  imageAltText?: string;
  brightness?: number;
  contrast?: number;
  saturation?: number;
  blur?: number;
  stickerOverlay?: string | null;
  textOverlay?: string;
  textOverlayColor?: string;
  commentsAllowed?: boolean;
  cloudSynced?: boolean;
  cloudOnly?: boolean;
}

function readLocalDrafts(key: string): DraftItem[] {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(key) || '[]');
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is DraftItem =>
      Boolean(item)
      && typeof item.id === 'string'
      && typeof item.caption === 'string'
      && typeof item.topics === 'string'
      && typeof item.type === 'string'
      && typeof item.timestamp === 'string'
      && Array.isArray(item.images)
      && item.images.every((image: unknown) => typeof image === 'string')
    ).slice(0, 50);
  } catch {
    return [];
  }
}

function readLocalAutosave(key: string): Record<string, any> | null {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(key) || 'null');
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? parsed as Record<string, any>
      : null;
  } catch {
    return null;
  }
}

const FILTER_PRESETS = [
  { name: 'Original', style: 'none' },
  ...NEXORA_LENS_CATALOG.map(lens => ({ name: lens.name, style: lens.filter })),
];

const RECORDING_DURATIONS = [
  { seconds: 15, label: '15 sec' },
  { seconds: 20, label: '20 sec' },
  { seconds: 30, label: '30 sec' },
  { seconds: 60, label: '1 min' },
  { seconds: 180, label: '3 min' },
  { seconds: 600, label: '10 min' },
  { seconds: 1200, label: '20 min' },
];

export default function MediaCreationEngine({
  currentUser,
  authenticatedUserId,
  onClose,
  onAddPost,
  onPublishPost,
  onPublishStory,
  theme,
  isStoryModeInitially = false,
  isOffline = false,
  onToggleOffline,
  initialMode = null,
  initialTab = undefined,
  initialCaption = '',
  onOpenStudio
}: MediaCreationEngineProps) {
  const uploadOwnerId = authenticatedUserId || currentUser.id;
  const autosaveKey = `nexora_creation_autosave_v1_${currentUser.id || 'public'}`;
  const draftsKey = `nexora_post_drafts_v1_${currentUser.id || 'public'}`;
  const initialAutosave = readLocalAutosave(autosaveKey);

  // Navigation & Wizard Core
  const [activeTab, setActiveTab] = useState<'feed' | 'story' | 'drafts'>(initialTab || (isStoryModeInitially ? 'story' : 'feed'));
  const [activeMode, setActiveMode] = useState<'text' | 'photo' | 'video' | 'reel' | 'voice' | 'poll' | 'pulse' | 'community' | 'carousel' | null>(() => {
    return initialAutosave?.activeMode || initialMode;
  });
  const [currentStep, setCurrentStep] = useState<number>(() => {
    return initialMode ? 2 : (initialAutosave?.currentStep || 1);
  });

  // Form Fields
  const [caption, setCaption] = useState(() => initialAutosave?.caption || initialCaption);
  const [topics, setTopics] = useState(() => initialAutosave?.topics || '');
  const [audience, setAudience] = useState<'public' | 'circle' | 'community' | 'followers' | 'onlyme'>(() => 'public');
  const [location, setLocation] = useState(() => initialAutosave?.location || '');
  const [locationSuggestions, setLocationSuggestions] = useState<string[]>([]);
  const [taggedUsernames, setTaggedUsernames] = useState(() => initialAutosave?.taggedUsernames || '');
  const [imageAltText, setImageAltText] = useState(() => initialAutosave?.imageAltText || '');

  // Editing parameters
  const [brightness, setBrightness] = useState(() => initialAutosave?.brightness ?? 100);
  const [contrast, setContrast] = useState(() => initialAutosave?.contrast ?? 100);
  const [saturation, setSaturation] = useState(() => initialAutosave?.saturation ?? 100);
  const [blur, setBlur] = useState(() => initialAutosave?.blur ?? 0);
  const [stickerOverlay, setStickerOverlay] = useState<string | null>(() => initialAutosave?.stickerOverlay || null);
  const [textOverlay, setTextOverlay] = useState(() => initialAutosave?.textOverlay || '');
  const [textOverlayColor, setTextOverlayColor] = useState(() => initialAutosave?.textOverlayColor || '#ffffff');
  const [selectedMusic, setSelectedMusic] = useState<string | null>(null);
  const [musicTrimStart, setMusicTrimStart] = useState(0);
  const [musicTrimEnd, setMusicTrimEnd] = useState(15);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);

  // Publish advanced toggles
  const [commentsAllowed, setCommentsAllowed] = useState(() => initialAutosave?.commentsAllowed !== false);
  const [sharesAllowed, setSharesAllowed] = useState(true);
  const [downloadsAllowed, setDownloadsAllowed] = useState(true);
  const [pinnedOnProfile, setPinnedOnProfile] = useState(false);
  const [crossPostToTwitter, setCrossPostToTwitter] = useState(false);
  const [isScheduled, setIsScheduled] = useState(false);
  const [scheduledDateTime, setScheduledDateTime] = useState('');
  const [targetBroadcastChannel, setTargetBroadcastChannel] = useState(false);

  // Media Capture / Import variables
  const [selectedImages, setSelectedImages] = useState<SelectedImage[]>(() => {
    if (initialAutosave?.images && initialAutosave.images.length > 0) {
      return initialAutosave.images.map((img: string, index: number) => ({
        url: img,
        rotation: initialAutosave.imageEdits?.[index]?.rotation ?? 0,
        zoom: initialAutosave.imageEdits?.[index]?.zoom ?? 1,
        cropOffset: initialAutosave.imageEdits?.[index]?.cropOffset || { x: 0, y: 0 },
        aspectRatio: initialAutosave.imageEdits?.[index]?.aspectRatio ?? null,
        filterName: initialAutosave.imageEdits?.[index]?.filterName,
        filterStyle: initialAutosave.imageEdits?.[index]?.filterStyle,
      }));
    }
    return [];
  });
  const [activeEditIndex, setActiveEditIndex] = useState<number | null>(null);
  const [galleryTab, setGalleryTab] = useState<'photos' | 'videos'>('photos');
  const [galleryReturnToCamera, setGalleryReturnToCamera] = useState(false);
  const [galleryPreviewIndex, setGalleryPreviewIndex] = useState<number | null>(null);
  const [isMediaPreviewExpanded, setIsMediaPreviewExpanded] = useState(false);
  const nativeGalleryEnabled = isNativeGalleryAvailable();
  const [nativeGalleryItems, setNativeGalleryItems] = useState<NexoraGalleryItem[]>([]);
  const [nativeGallerySelectedIds, setNativeGallerySelectedIds] = useState<string[]>([]);
  const [nativeGalleryAlbum, setNativeGalleryAlbum] = useState('Recent');
  const [nativeGalleryLoading, setNativeGalleryLoading] = useState(false);
  const [nativeGalleryHasMore, setNativeGalleryHasMore] = useState(false);
  const [nativeGalleryOffset, setNativeGalleryOffset] = useState(0);
  const [nativeGalleryError, setNativeGalleryError] = useState('');

  const [editorToolTab, setEditorToolTab] = useState<'looks' | 'adjust' | 'crop' | 'text'>('looks');
  const [creativeToolTab, setCreativeToolTab] = useState<'looks' | 'effects' | 'text' | 'stickers' | 'audio' | 'presets'>('looks');
  const [isComparingOriginal, setIsComparingOriginal] = useState(false);
  const [videoFileUrl, setVideoFileUrl] = useState<string | null>(() => initialAutosave?.videoUrl || null);
  const [videoRawBlob, setVideoRawBlob] = useState<Blob | null>(null);
  const [videoMuted, setVideoMuted] = useState(false);
  const [videoTrimStart, setVideoTrimStart] = useState(0);
  const [videoTrimEnd, setVideoTrimEnd] = useState(15);
  const [videoDuration, setVideoDuration] = useState(15);
  const [videoCoverBlob, setVideoCoverBlob] = useState<Blob | null>(null);
  const [videoCoverTime, setVideoCoverTime] = useState(0);
  const [isTrimmingVideo, setIsTrimmingVideo] = useState(false);
  const trimVideoRef = useRef<HTMLVideoElement>(null);
  const [mentionSuggestions, setMentionSuggestions] = useState<Array<{ username: string; name: string; avatar: string }>>([]);
  const [mentionValidation, setMentionValidation] = useState<'idle' | 'checking' | 'valid' | 'invalid'>('idle');

  // Reels
  const [isRecording, setIsRecording] = useState(false);
  const [isRecordingPaused, setIsRecordingPaused] = useState(false);
  const [recordedVideoUrl, setRecordedVideoUrl] = useState<string | null>(() => initialAutosave?.recordedVideoUrl || null);
  const [cameraFacing, setCameraFacing] = useState<'user' | 'environment'>('user');
  const [isLensStudioOpen, setIsLensStudioOpen] = useState(false);
  const [isLensStreamReady, setIsLensStreamReady] = useState(false);
  const [isSavingRecordedVideo, setIsSavingRecordedVideo] = useState(false);
  const [openLensAfterPermission, setOpenLensAfterPermission] = useState(false);
  const [countdownTimer, setCountdownTimer] = useState<number | null>(null);
  const [loopTimerSecs, setLoopTimerSecs] = useState(0);
  const [recordingLimitSecs, setRecordingLimitSecs] = useState(30);

  // Voice Recording
  const [voiceFileUrl, setVoiceFileUrl] = useState<string | null>(() => initialAutosave?.voiceUrl || null);
  const [voiceRawBlob, setVoiceRawBlob] = useState<Blob | null>(null);
  const [voiceDurationSecs, setVoiceDurationSecs] = useState(0);
  const [voiceIsRecording, setVoiceIsRecording] = useState(false);
  const [voiceIsPaused, setVoiceIsPaused] = useState(false);
  const [voiceTranscript, setVoiceTranscript] = useState(() => initialAutosave?.voiceTranscript || '');
  const [voicePlaybackActive, setVoicePlaybackActive] = useState(false);
  const [noiseSuppression, setNoiseSuppression] = useState(true);
  const [loadingTranscript, setLoadingTranscript] = useState(false);

  // Poll
  const [pollQuestion, setPollQuestion] = useState('');
  const [pollOptionsList, setPollOptionsList] = useState<string[]>(['', '']);

  // UI state
  const [permissionTarget, setPermissionTarget] = useState<'camera' | 'gallery' | 'mic' | null>(() => initialMode === 'photo' || initialMode === 'reel' ? 'camera' : null);
  // Browser/OS permissions are authoritative. Never restore a locally cached
  // "granted" value because users can revoke camera or microphone access later.
  const [permissionState, setPermissionState] = useState<'prompt' | 'granted' | 'denied'>('prompt');
  const pendingPermissionActionRef = useRef<(() => void) | null>(null);
  const [isAdvancedOptionsOpen, setIsAdvancedOptionsOpen] = useState(false);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [draftsList, setDraftsList] = useState<DraftItem[]>(() => readLocalDrafts(draftsKey));
  const [composerStateOwnerId, setComposerStateOwnerId] = useState(currentUser.id);

  // Publish state; upload progress is reported by Firebase Storage callbacks.
  const [postingStatus, setPostingStatus] = useState<'idle' | 'publishing' | 'completed' | 'failed'>('idle');
  const [originRemixPolicy, setOriginRemixPolicyState] = useState<OriginRemixPolicy>('closed');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [errorMessage, setErrorMessage] = useState('');
  const [publishStage, setPublishStage] = useState('Getting your post ready…');
  const [isMinimized, setIsMinimized] = useState(false);

  // Refs
  const videoPreviewRef = useRef<HTMLVideoElement>(null);
  const videoStreamRef = useRef<MediaStream | null>(null);
  const photoPreviewRef = useRef<HTMLVideoElement>(null);
  const photoStreamRef = useRef<MediaStream | null>(null);
  const [photoCameraReady, setPhotoCameraReady] = useState(false);
  const [videoCameraReady, setVideoCameraReady] = useState(false);
  const mediaRecorderVideoRef = useRef<MediaRecorder | null>(null);
  const videoChunksRef = useRef<Blob[]>([]);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const loopTimerRef = useRef<any>(null);
  const createdObjectUrlsRef = useRef<Set<string>>(new Set());
  const uploadAbortControllerRef = useRef<AbortController | null>(null);
  const publishAttemptIdRef = useRef<string | null>(null);

  const trackObjectUrl = (url: string) => {
    createdObjectUrlsRef.current.add(url);
    return url;
  };

  const revokeTrackedObjectUrl = (url: string | null | undefined) => {
    if (!url || !createdObjectUrlsRef.current.has(url)) return;
    revokeObjectUrl(url);
    createdObjectUrlsRef.current.delete(url);
  };

  const clearTrackedObjectUrls = () => {
    createdObjectUrlsRef.current.forEach(url => revokeObjectUrl(url));
    createdObjectUrlsRef.current.clear();
  };

  useEffect(() => () => {
    if (loopTimerRef.current) clearInterval(loopTimerRef.current);
    videoStreamRef.current?.getTracks().forEach(track => track.stop());
    photoStreamRef.current?.getTracks().forEach(track => track.stop());
    if (mediaRecorderVideoRef.current?.state !== 'inactive') mediaRecorderVideoRef.current?.stop();
    if (mediaRecorderRef.current?.state !== 'inactive') mediaRecorderRef.current?.stop();
    clearTrackedObjectUrls();
  }, []);

  useEffect(() => {
    if (composerStateOwnerId !== currentUser.id) return;
    try {
      localStorage.setItem(draftsKey, JSON.stringify(draftsList.slice(0, 50)));
    } catch {
      setErrorMessage('Device storage is full. Remove an old draft or media item and try again.');
    }
  }, [draftsList, draftsKey, composerStateOwnerId, currentUser.id]);

  // If the signed-in account changes while the studio is open, discard the prior
  // account's in-memory composer state before saving anything under the new UID.
  useEffect(() => {
    if (composerStateOwnerId === currentUser.id) return;
    const nextAutosave = readLocalAutosave(autosaveKey);
    setCaption(nextAutosave?.caption || '');
    setTopics(nextAutosave?.topics || '');
    setAudience('public');
    setActiveMode(nextAutosave?.activeMode || null);
    setCurrentStep(nextAutosave?.currentStep || 1);
    setLocation(nextAutosave?.location || '');
    setTaggedUsernames(nextAutosave?.taggedUsernames || '');
    setImageAltText(nextAutosave?.imageAltText || '');
    setCommentsAllowed(nextAutosave?.commentsAllowed !== false);
    setStickerOverlay(nextAutosave?.stickerOverlay || null);
    setTextOverlay(nextAutosave?.textOverlay || '');
    setTextOverlayColor(nextAutosave?.textOverlayColor || '#ffffff');
    setBrightness(nextAutosave?.brightness ?? 100);
    setContrast(nextAutosave?.contrast ?? 100);
    setSaturation(nextAutosave?.saturation ?? 100);
    setBlur(nextAutosave?.blur ?? 0);
    setSelectedImages(Array.isArray(nextAutosave?.images)
      ? nextAutosave.images.filter((url: unknown): url is string => typeof url === 'string').map((url: string, index: number) => ({
          url,
          rotation: nextAutosave?.imageEdits?.[index]?.rotation ?? 0,
          zoom: nextAutosave?.imageEdits?.[index]?.zoom ?? 1,
          cropOffset: nextAutosave?.imageEdits?.[index]?.cropOffset || { x: 0, y: 0 },
          aspectRatio: nextAutosave?.imageEdits?.[index]?.aspectRatio ?? null,
          filterName: nextAutosave?.imageEdits?.[index]?.filterName,
          filterStyle: nextAutosave?.imageEdits?.[index]?.filterStyle,
        }))
      : []);
    setVideoFileUrl(nextAutosave?.videoUrl || null);
    setRecordedVideoUrl(nextAutosave?.recordedVideoUrl || null);
    setVoiceFileUrl(nextAutosave?.voiceUrl || null);
    setVoiceTranscript(nextAutosave?.voiceTranscript || '');
    setDraftsList(readLocalDrafts(draftsKey));
    setComposerStateOwnerId(currentUser.id);
  }, [currentUser.id, autosaveKey, draftsKey, composerStateOwnerId]);

  // Autosave
  useEffect(() => {
    if (composerStateOwnerId !== currentUser.id) return;
    const timer = setTimeout(() => {
      if (!caption && !activeMode && selectedImages.length === 0 && !videoFileUrl && !voiceFileUrl) {
        localStorage.removeItem(autosaveKey);
        return;
      }
      try {
        const draft = {
          caption,
          topics,
          audience,
          activeMode,
          currentStep,
          images: selectedImages.map(img => img.url),
          imageEdits: selectedImages.map(({ rotation, zoom, cropOffset, aspectRatio, filterName, filterStyle }) => ({ rotation, zoom, cropOffset, aspectRatio, filterName, filterStyle })),
          videoUrl: videoFileUrl,
          recordedVideoUrl,
          voiceUrl: voiceFileUrl,
          voiceTranscript,
          location,
          taggedUsernames,
          imageAltText,
          brightness,
          contrast,
          saturation,
          blur,
          stickerOverlay,
          textOverlay,
          textOverlayColor,
          commentsAllowed
        };
        localStorage.setItem(autosaveKey, JSON.stringify(draft));
      } catch (e) {
        console.error(e);
      }
    }, 1000);
    return () => clearTimeout(timer);
  }, [autosaveKey, caption, topics, audience, activeMode, currentStep, selectedImages, videoFileUrl, recordedVideoUrl, voiceFileUrl, voiceTranscript, location, taggedUsernames, imageAltText, brightness, contrast, saturation, blur, stickerOverlay, textOverlay, textOverlayColor, commentsAllowed, composerStateOwnerId, currentUser.id]);

  // Restore account-owned text drafts across devices. Media bytes and browser object URLs
  // intentionally remain on the originating device unless they have a durable HTTPS URL.
  useEffect(() => {
    if (!currentUser.id || currentUser.id === 'public_explore_session') return;
    let active = true;
    getDrafts(currentUser.id, 50).then(records => {
      if (!active || !Array.isArray(records)) return;
      const cloudDrafts: DraftItem[] = records.map((record: any) => {
        const updatedAt = record.updatedAt?.toDate?.() || new Date();
        return {
          id: String(record.id),
          caption: typeof record.caption === 'string' ? record.caption : '',
          images: [],
          videoUrl: typeof record.videoUrl === 'string' && /^https:\/\//i.test(record.videoUrl) ? record.videoUrl : undefined,
          topics: Array.isArray(record.tags) ? record.tags.join(' ') : '',
          audience: 'public',
          type: typeof record.type === 'string' ? record.type : 'text',
          timestamp: updatedAt.toISOString(),
          cloudSynced: true,
          cloudOnly: true,
        };
      });
      setDraftsList(previous => {
        const existing = new Set(previous.map(item => item.id));
        return [...previous, ...cloudDrafts.filter(item => !existing.has(item.id))].slice(0, 50);
      });
    }).catch(error => console.warn('[Composer] Saved drafts could not be loaded.', error));
    return () => { active = false; };
  }, [currentUser.id]);

  // Camera preview management
  useEffect(() => {
    let currentStream: MediaStream | null = null;
    let cancelled = false;
    if (activeMode === 'reel' && permissionState === 'granted' && currentStep === 2 && !isLensStudioOpen) {
      setVideoCameraReady(false);
      if (!navigator.mediaDevices?.getUserMedia) {
        window.dispatchEvent(new CustomEvent('toast', { detail: 'Camera recording is not supported by this browser. Please upload a video instead.' }));
      } else {
        navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: cameraFacing }, width: { ideal: 1080 }, height: { ideal: 1920 }, aspectRatio: { ideal: 9 / 16 } }, audio: true })
          .then(stream => {
            if (cancelled) {
              stream.getTracks().forEach(track => track.stop());
              return;
            }
            currentStream = stream;
            videoStreamRef.current = stream;
            if (videoPreviewRef.current) {
              videoPreviewRef.current.srcObject = stream;
              void videoPreviewRef.current.play().catch(() => {
                setVideoCameraReady(false);
                window.dispatchEvent(new CustomEvent('toast', { detail: 'Camera preview could not start. Allow camera access in your phone settings and try again.' }));
              });
            }
          })
          .catch(error => {
            const message = error instanceof Error && error.name === 'NotAllowedError'
              ? 'Camera or microphone access was denied. Allow access in browser settings and try again.'
              : error instanceof Error && error.name === 'NotFoundError'
                ? 'No camera or microphone was found on this device.'
                : 'Could not start the camera. Please retry or upload a video.';
            window.dispatchEvent(new CustomEvent('toast', { detail: message }));
          });
      }
    }
    return () => {
      cancelled = true;
      if (currentStream) currentStream.getTracks().forEach(track => track.stop());
      if (videoStreamRef.current === currentStream) videoStreamRef.current = null;
      setVideoCameraReady(false);
    };
  }, [activeMode, permissionState, cameraFacing, currentStep, isLensStudioOpen]);

  // Photo camera preview is opened only while the photo-add step is visible.
  // Wait for real video metadata before enabling capture, especially on mobile browsers.
  useEffect(() => {
    if (activeMode !== 'photo' || permissionState !== 'granted' || currentStep !== 2 || isLensStudioOpen) {
      setPhotoCameraReady(false);
      return;
    }

    let cancelled = false;
    let currentStream: MediaStream | null = null;
    let removeVideoListeners = () => {};
    setPhotoCameraReady(false);

    if (!navigator.mediaDevices?.getUserMedia) {
      window.dispatchEvent(new CustomEvent('toast', { detail: 'Camera is not supported by this browser. Please choose a photo from your device.' }));
      return;
    }

    navigator.mediaDevices.getUserMedia({
      video: { facingMode: { ideal: cameraFacing }, width: { ideal: 1080 }, height: { ideal: 1920 }, aspectRatio: { ideal: 9 / 16 } },
      audio: false,
    }).then(async stream => {
      if (cancelled) {
        stream.getTracks().forEach(track => track.stop());
        return;
      }

      currentStream = stream;
      photoStreamRef.current = stream;
      const video = photoPreviewRef.current;
      if (!video) {
        stream.getTracks().forEach(track => track.stop());
        if (photoStreamRef.current === stream) photoStreamRef.current = null;
        return;
      }

      const metadataReady = new Promise<void>((resolve, reject) => {
        if (video.readyState >= HTMLMediaElement.HAVE_METADATA && video.videoWidth > 0 && video.videoHeight > 0) {
          resolve();
          return;
        }
        const onLoadedMetadata = () => {
          removeVideoListeners();
          resolve();
        };
        const onVideoError = () => {
          removeVideoListeners();
          reject(new Error('The camera did not provide a usable preview.'));
        };
        removeVideoListeners = () => {
          video.removeEventListener('loadedmetadata', onLoadedMetadata);
          video.removeEventListener('error', onVideoError);
        };
        video.addEventListener('loadedmetadata', onLoadedMetadata, { once: true });
        video.addEventListener('error', onVideoError, { once: true });
      });

      video.srcObject = stream;
      try {
        await metadataReady;
        if (cancelled) return;
        await video.play();
        if (cancelled) return;
        if (video.videoWidth <= 0 || video.videoHeight <= 0) {
          throw new Error('The camera preview is not ready yet.');
        }
        setPhotoCameraReady(true);
      } catch (error) {
        stream.getTracks().forEach(track => track.stop());
        if (photoStreamRef.current === stream) photoStreamRef.current = null;
        if (video.srcObject === stream) video.srcObject = null;
        if (!cancelled) {
          window.dispatchEvent(new CustomEvent('toast', {
            detail: error instanceof Error ? error.message : 'Camera preview could not start. Allow camera access in your phone settings and try again.',
          }));
        }
      }
    }).catch(error => {
      if (cancelled) return;
      const message = error instanceof Error && error.name === 'NotAllowedError'
        ? 'Camera access was denied. Allow access in browser settings and try again.'
        : error instanceof Error && error.name === 'NotFoundError'
          ? 'No camera was found on this device.'
          : 'Could not start the camera. Please retry or choose a photo from your device.';
      window.dispatchEvent(new CustomEvent('toast', { detail: message }));
    });

    return () => {
      cancelled = true;
      removeVideoListeners();
      currentStream?.getTracks().forEach(track => track.stop());
      if (photoStreamRef.current === currentStream) photoStreamRef.current = null;
      if (photoPreviewRef.current) photoPreviewRef.current.srcObject = null;
      setPhotoCameraReady(false);
    };
  }, [activeMode, permissionState, cameraFacing, currentStep, isLensStudioOpen]);


  // Android's native gallery reads MediaStore only after the user grants access.
  useEffect(() => {
    if (!nativeGalleryEnabled || activeMode !== 'carousel') return;
    let cancelled = false;
    setNativeGalleryLoading(true);
    setNativeGalleryError('');
    setNativeGalleryItems([]);
    setNativeGalleryOffset(0);
    setNativeGalleryHasMore(false);
    setNativeGallerySelectedIds([]);
    void (async () => {
      try {
        const granted = await requestNativeGalleryAccess(galleryTab);
        if (cancelled) return;
        if (!granted) {
          setNativeGalleryError('Allow NEXORA to access selected photos and videos to browse your gallery.');
          return;
        }
        const page = await loadNativeGalleryPage(galleryTab, 0, 120);
        if (cancelled) return;
        setNativeGalleryItems(page.items);
        setNativeGalleryOffset(page.nextOffset);
        setNativeGalleryHasMore(page.hasMore);
      } catch (error) {
        if (!cancelled) setNativeGalleryError(error instanceof Error ? error.message : 'Your device gallery could not be opened.');
      } finally {
        if (!cancelled) setNativeGalleryLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [activeMode, galleryTab, nativeGalleryEnabled]);

  // Reels Record timing loop
  useEffect(() => {
    if (isRecording && !isRecordingPaused) {
      loopTimerRef.current = setInterval(() => {
        setLoopTimerSecs(prev => {
          if (prev + 1 >= recordingLimitSecs) {
            handleStopReelRecord();
            return recordingLimitSecs;
          }
          return prev + 1;
        });
      }, 1000);
    } else {
      if (loopTimerRef.current) clearInterval(loopTimerRef.current);
    }
    return () => clearInterval(loopTimerRef.current);
  }, [isRecording, isRecordingPaused, recordingLimitSecs]);

  // Resolve @mentions against the public profile directory; never suggest private user records.
  useEffect(() => {
    const raw = String(taggedUsernames || '').split(',').pop()?.trim().replace(/^@/, '') || '';
    if (raw.length < 2 || !db) { setMentionSuggestions([]); return; }
    let active = true;
    const timer = window.setTimeout(async () => {
      try {
        const normalized = raw.toLowerCase().replace(/[^a-z0-9_]/g, '');
        if (!normalized) { setMentionSuggestions([]); return; }
        const result = await getDocs(query(collection(db, 'publicProfiles'), orderBy('username'), startAt(normalized), endAt(`${normalized}\uf8ff`), limit(6)));
        if (!active) return;
        setMentionSuggestions(result.docs.map(item => {
          const data = item.data();
          return { username: String(data.username || ''), name: String(data.name || data.username || 'NEXORA user'), avatar: String(data.avatar || '') };
        }).filter(item => item.username));
      } catch { if (active) setMentionSuggestions([]); }
    }, 180);
    return () => { active = false; window.clearTimeout(timer); };
  }, [taggedUsernames]);

  // Location suggestions
  useEffect(() => {
    if (location.trim().length > 1) {
      const places = ["Lagos, Nigeria", "Accra, Ghana", "Dakar, Senegal", "Nairobi, Kenya", "Port Harcourt, Nigeria", "London, UK", "New York, USA", "San Francisco, USA"];
      setLocationSuggestions(places.filter(p => p.toLowerCase().includes(location.toLowerCase())));
    } else {
      setLocationSuggestions([]);
    }
  }, [location]);

  const requestPermission = (target: 'camera' | 'gallery' | 'mic', callback: () => void) => {
    // The browser's file picker owns gallery access; websites must not pretend
    // that a separate gallery permission has been granted.
    if (target === 'gallery') {
      callback();
      return;
    }
    if (permissionState === 'granted') {
      callback();
      return;
    }
    pendingPermissionActionRef.current = callback;
    setPermissionTarget(target);
  };

  const handlePermissionContinue = async () => {
    const target = permissionTarget;
    if (!target || target === 'gallery') {
      setPermissionTarget(null);
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      setPermissionState('denied');
      setPermissionTarget(null);
      pendingPermissionActionRef.current = null;
      window.dispatchEvent(new CustomEvent('toast', { detail: 'Camera and microphone access require a supported browser on a secure connection. You can still choose media from your device.' }));
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia(
        target === 'mic'
          ? { audio: true }
          : { video: { facingMode: { ideal: cameraFacing } }, audio: activeMode === 'reel' }
      );
      stream.getTracks().forEach(track => track.stop());
      setPermissionState('granted');
      setPermissionTarget(null);
      if (openLensAfterPermission) {
        setIsLensStudioOpen(true);
        setOpenLensAfterPermission(false);
      }
      const pendingAction = pendingPermissionActionRef.current;
      pendingPermissionActionRef.current = null;
      if (pendingAction) {
        // Wait for the preview effect to attach its stream before recording.
        if (target === 'camera' && activeMode === 'reel') {
          let attempts = 0;
          const waitForPreview = () => {
            const live = videoStreamRef.current?.getVideoTracks().some(track => track.readyState === 'live');
            if (live) pendingAction();
            else if (++attempts < 40) window.setTimeout(waitForPreview, 100);
            else window.dispatchEvent(new CustomEvent('toast', { detail: 'Camera access is on, but the preview is still starting. Tap Record again in a moment.' }));
          };
          window.setTimeout(waitForPreview, 100);
        } else {
          pendingAction();
        }
      }
    } catch (error) {
      setPermissionState('denied');
      pendingPermissionActionRef.current = null;
      const message = error instanceof Error && error.name === 'NotAllowedError'
        ? `Allow ${target === 'mic' ? 'microphone' : 'camera'} access in your browser or device settings, then try again.`
        : error instanceof Error && error.name === 'NotFoundError'
          ? `No ${target === 'mic' ? 'microphone' : 'camera'} was found on this device.`
          : 'NEXORA could not access this device. Check your browser permissions and try again.';
      window.dispatchEvent(new CustomEvent('toast', { detail: message }));
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []).filter(file => file.type.startsWith('image/'));
    e.target.value = '';
    if (!files.length) return;

    requestPermission('gallery', () => {
      void (async () => {
        const remaining = Math.max(0, 20 - selectedImages.length);
        if (remaining === 0) {
          window.dispatchEvent(new CustomEvent('toast', { detail: 'You can add up to 20 photos to one NEXORA post.' }));
          return;
        }
        const chosen = files.slice(0, remaining);
        if (files.length > remaining) {
          window.dispatchEvent(new CustomEvent('toast', { detail: `Only ${remaining} more photo${remaining === 1 ? '' : 's'} can be added to this post.` }));
        }
        const imported: Array<SelectedImage | null> = await Promise.all(chosen.map(async (file): Promise<SelectedImage | null> => {
          try {
            await validateMediaFile(file, 'image');
            const url = await new Promise<string>((resolve, reject) => {
              const reader = new FileReader();
              reader.onload = () => typeof reader.result === 'string' ? resolve(reader.result) : reject(new Error('Photo could not be read.'));
              reader.onerror = () => reject(new Error('Photo could not be read from your device.'));
              reader.readAsDataURL(file);
            });
            return { url, fileName: file.name, capturedAt: file.lastModified || Date.now(), rotation: 0, zoom: 1, cropOffset: { x: 0, y: 0 } } satisfies SelectedImage;
          } catch (error) {
            window.dispatchEvent(new CustomEvent('toast', { detail: error instanceof Error ? error.message : 'This photo could not be imported.' }));
            return null;
          }
        }));
        const valid = imported.filter((item): item is SelectedImage => item !== null);
        if (valid.length) {
          setSelectedImages(previous => [...previous, ...valid].slice(0, 20));
          setActiveEditIndex(previous => previous === null ? 0 : previous);
        }
      })();
    });
  };


  const toggleNativeGalleryItem = (item: NexoraGalleryItem) => {
    setNativeGallerySelectedIds(previous => {
      if (previous.includes(item.id)) return previous.filter(id => id !== item.id);
      const maximum = galleryTab === 'photos' ? 20 : 1;
      if (previous.length >= maximum) {
        window.dispatchEvent(new CustomEvent('toast', { detail: `You can select up to ${maximum} ${galleryTab === 'photos' ? 'photos' : 'video'} at once.` }));
        return previous;
      }
      return [...previous, item.id];
    });
  };

  const importSelectedNativeGalleryItems = async () => {
    const chosen = nativeGallerySelectedIds
      .map(id => nativeGalleryItems.find(item => item.id === id))
      .filter((item): item is NexoraGalleryItem => Boolean(item))
      .slice(0, galleryTab === 'videos' ? 1 : 20);
    if (!chosen.length) return;
    setNativeGalleryLoading(true);
    try {
      const files: File[] = [];
      for (const item of chosen) files.push(await importNativeGalleryItem(item));
      setNativeGallerySelectedIds([]);
      const event = { target: { files, value: '' } } as unknown as React.ChangeEvent<HTMLInputElement>;
      if (galleryTab === 'photos') handleImageUpload(event);
      else {
        setActiveMode('video');
        handleVideoUpload(event);
      }
    } catch (error) {
      window.dispatchEvent(new CustomEvent('toast', { detail: error instanceof Error ? error.message : 'Some selected media could not be imported.' }));
    } finally {
      setNativeGalleryLoading(false);
    }
  };

  const loadMoreNativeGalleryItems = async () => {
    if (nativeGalleryLoading || !nativeGalleryHasMore) return;
    setNativeGalleryLoading(true);
    try {
      const page = await loadNativeGalleryPage(galleryTab, nativeGalleryOffset, 120);
      setNativeGalleryItems(previous => [...previous, ...page.items]);
      setNativeGalleryOffset(page.nextOffset);
      setNativeGalleryHasMore(page.hasMore);
    } catch (error) {
      setNativeGalleryError(error instanceof Error ? error.message : 'More media could not be loaded.');
    } finally {
      setNativeGalleryLoading(false);
    }
  };

  const openVideoInStudio = () => {
    if (!videoRawBlob || !onOpenStudio) return;
    const type = videoRawBlob.type || 'video/webm';
    const extension = type.includes('mp4') ? 'mp4' : type.includes('quicktime') ? 'mov' : 'webm';
    onOpenStudio([new File([videoRawBlob], `nexora-clip-${Date.now()}.${extension}`, { type })]);
  };

  const captureCameraSnapshot = () => {
    if (selectedImages.length >= 20) {
      window.dispatchEvent(new CustomEvent('toast', { detail: 'You can capture up to 20 photos in one post.' }));
      return;
    }
    requestPermission('camera', () => {
      const video = photoPreviewRef.current;
      if (!photoCameraReady || !video || video.videoWidth === 0 || video.videoHeight === 0) {
        window.dispatchEvent(new CustomEvent('toast', { detail: 'Camera is not ready yet. Wait for the preview, then try again.' }));
        return;
      }
      const previewBounds = video.getBoundingClientRect();
      const targetAspect = previewBounds.width > 0 && previewBounds.height > 0
        ? previewBounds.width / previewBounds.height
        : 9 / 16;
      const sourceAspect = video.videoWidth / video.videoHeight;
      let sourceX = 0;
      let sourceY = 0;
      let sourceWidth = video.videoWidth;
      let sourceHeight = video.videoHeight;
      // Match the still photo to the exact edge-to-edge camera framing shown on screen.
      if (sourceAspect > targetAspect) {
        sourceWidth = video.videoHeight * targetAspect;
        sourceX = (video.videoWidth - sourceWidth) / 2;
      } else if (sourceAspect < targetAspect) {
        sourceHeight = video.videoWidth / targetAspect;
        sourceY = (video.videoHeight - sourceHeight) / 2;
      }
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(sourceWidth));
      canvas.height = Math.max(1, Math.round(sourceHeight));
      const context = canvas.getContext('2d');
      if (!context) {
        window.dispatchEvent(new CustomEvent('toast', { detail: 'Could not capture the frame. Please try again.' }));
        return;
      }
      context.drawImage(video, sourceX, sourceY, sourceWidth, sourceHeight, 0, 0, canvas.width, canvas.height);
      const snapUrl = canvas.toDataURL('image/jpeg', 0.92);
      setSelectedImages(prev => [...prev, { url: snapUrl, rotation: 0, zoom: 1, cropOffset: { x: 0, y: 0 } }]);
      window.dispatchEvent(new CustomEvent('toast', { detail: '📸 Photo captured.' }));
    });
  };

  const handleVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []).filter(file => file.type.startsWith('video/'));
    e.target.value = '';
    if (!files.length) return;
    requestPermission('gallery', () => {
      void (async () => {
        if (files.length > 1 && onOpenStudio) {
          const validFiles: File[] = [];
          if (files.length > 12) {
            window.dispatchEvent(new CustomEvent('toast', { detail: 'NEXORA Studio can import up to 12 clips at once. The first 12 selected clips will be used.' }));
          }
          for (const file of files.slice(0, 12)) {
            try {
              await validateMediaFile(file, 'video');
              validFiles.push(file);
            } catch (error) {
              window.dispatchEvent(new CustomEvent('toast', { detail: `⚠️ ${file.name}: ${error instanceof Error ? error.message : 'This video could not be checked.'}` }));
            }
          }
          if (validFiles.length) {
            onOpenStudio(validFiles);
            return;
          }
          return;
        }
        const file = files[0];
        try {
          const metadata = await validateMediaFile(file, 'video');
          setVideoFileUrl(previous => {
            revokeTrackedObjectUrl(previous);
            return trackObjectUrl(URL.createObjectURL(file));
          });
          setVideoRawBlob(file);
          setVideoCoverBlob(null);
          setVideoCoverTime(0);
          setVideoTrimStart(0);
          setVideoTrimEnd(Math.min(15, Math.max(1, Math.round(metadata.duration || 15))));
          setVideoDuration(metadata.duration || 15);
        } catch (error) {
          window.dispatchEvent(new CustomEvent('toast', { detail: `⚠️ ${error instanceof Error ? error.message : 'This video could not be checked.'}` }));
        }
      })();
    });
  };

  const applyVideoTrim = async () => {
    const video = trimVideoRef.current;
    if (!video || videoTrimEnd <= videoTrimStart) { setErrorMessage('Choose a valid video section before trimming.'); return; }
    const capture = video as HTMLVideoElement & { captureStream?: () => MediaStream; mozCaptureStream?: () => MediaStream };
    if (typeof MediaRecorder === 'undefined' || (!capture.captureStream && !capture.mozCaptureStream)) {
      setErrorMessage('You cannot trim videos in this browser. Your original video has not changed.'); return;
    }
    setIsTrimmingVideo(true); setErrorMessage('');
    let stream: MediaStream | null = null; let recorder: MediaRecorder | null = null;
    try {
      if (video.readyState < 1) await new Promise<void>((resolve, reject) => { video.onloadedmetadata = () => resolve(); video.onerror = () => reject(new Error('This video could not be opened.')); });
      stream = capture.captureStream ? capture.captureStream() : capture.mozCaptureStream!();
      const mimeType = ['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm'].find(type => MediaRecorder.isTypeSupported(type));
      recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      const chunks: Blob[] = [];
      const finished = new Promise<Blob>((resolve, reject) => {
        recorder!.ondataavailable = event => { if (event.data.size) chunks.push(event.data); };
        recorder!.onerror = () => reject(new Error('The trimmed video could not be encoded.'));
        recorder!.onstop = () => chunks.length ? resolve(new Blob(chunks, { type: recorder!.mimeType || 'video/webm' })) : reject(new Error('The selected section was empty.'));
      });
      video.pause();
      await new Promise<void>((resolve, reject) => {
        let settled = false;
        const finish = (error?: Error) => {
          if (settled) return;
          settled = true;
          clearTimeout(timeout);
          video.removeEventListener('seeked', onSeek);
          if (error) reject(error); else resolve();
        };
        const onSeek = () => finish();
        const timeout = window.setTimeout(() => finish(new Error('Could not seek to the selected start time.')), 5000);
        video.addEventListener('seeked', onSeek, { once: true });
        video.currentTime = videoTrimStart;
        if (!video.seeking && Math.abs(video.currentTime - videoTrimStart) < 0.05) finish();
      });
      recorder.start(200); await video.play();
      await new Promise<void>(resolve => {
        const finish = () => { video.removeEventListener('timeupdate', check); clearTimeout(timeout); resolve(); };
        const check = () => { if (video.currentTime >= videoTrimEnd) { video.pause(); finish(); } };
        const timeout = window.setTimeout(() => { video.pause(); finish(); }, Math.max(1500, (videoTrimEnd - videoTrimStart + 2) * 1000));
        video.addEventListener('timeupdate', check);
      });
      if (recorder.state !== 'inactive') recorder.stop();
      const trimmed = await finished;
      const nextUrl = trackObjectUrl(URL.createObjectURL(trimmed));
      revokeTrackedObjectUrl(videoFileUrl); revokeTrackedObjectUrl(recordedVideoUrl);
      setVideoFileUrl(nextUrl); setRecordedVideoUrl(null); setVideoRawBlob(trimmed);
      setVideoDuration(videoTrimEnd - videoTrimStart); setVideoTrimStart(0); setVideoTrimEnd(Math.max(1, videoTrimEnd - videoTrimStart));
      setVideoCoverBlob(null); setVideoCoverTime(0);
      window.dispatchEvent(new CustomEvent('toast', { detail: 'Video trimmed and ready to publish.' }));
    } catch (error) { setErrorMessage(error instanceof Error ? error.message : 'Video trimming failed.'); }
    finally { if (recorder && recorder.state !== 'inactive') { try { recorder.stop(); } catch { /* The recorder may already have stopped. */ } } stream?.getTracks().forEach(track => track.stop()); setIsTrimmingVideo(false); }
  };

  const captureVideoCover = async () => {
    const video = trimVideoRef.current; if (!video) return;
    try {
      if (video.readyState < 2) await new Promise<void>((resolve, reject) => { video.onloadeddata = () => resolve(); video.onerror = () => reject(new Error('Video frame unavailable.')); });
      const width = Math.min(1280, video.videoWidth || 1280); const canvas = document.createElement('canvas');
      canvas.width = width; canvas.height = Math.max(1, Math.round(width * (video.videoHeight || 720) / (video.videoWidth || 1280)));
      const context = canvas.getContext('2d'); if (!context) throw new Error('Cover selection is unavailable.');
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob(value => value ? resolve(value) : reject(new Error('Could not export this cover.')), 'image/jpeg', 0.9));
      setVideoCoverBlob(blob); setVideoCoverTime(video.currentTime);
      window.dispatchEvent(new CustomEvent('toast', { detail: 'Video cover selected.' }));
    } catch (error) { setErrorMessage(error instanceof Error ? error.message : 'Could not select this cover.'); }
  };

  const startReelRecording = () => {
    if (countdownTimer !== null || isRecording || isSavingRecordedVideo) return;
    requestPermission('camera', () => {
      if (!videoStreamRef.current || !videoStreamRef.current.getVideoTracks().some(track => track.readyState === 'live')) {
        window.dispatchEvent(new CustomEvent('toast', { detail: 'Camera is not ready yet. Wait for the preview, then try recording again.' }));
        return;
      }
      if (typeof MediaRecorder === 'undefined') {
        window.dispatchEvent(new CustomEvent('toast', { detail: 'Video recording is not supported by this browser. You can upload a video instead.' }));
        return;
      }
      setCountdownTimer(3);
      const counter = window.setInterval(() => {
        setCountdownTimer(prev => {
          if (prev !== null && prev <= 1) {
            window.clearInterval(counter);
            try {
              const stream = videoStreamRef.current;
              if (!stream || !stream.getVideoTracks().some(track => track.readyState === 'live')) {
                window.dispatchEvent(new CustomEvent('toast', { detail: 'Camera disconnected before recording started. Please retry.' }));
                return null;
              }
              const mimeType = ['video/mp4;codecs=avc1.42E01E,mp4a.40.2', 'video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm'].find(type => MediaRecorder.isTypeSupported(type));
              const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
              videoChunksRef.current = [];
              mediaRecorderVideoRef.current = recorder;
              recorder.ondataavailable = event => {
                if (event.data.size > 0) videoChunksRef.current.push(event.data);
              };
              recorder.onerror = () => {
                setIsRecording(false);
                setIsSavingRecordedVideo(false);
                window.dispatchEvent(new CustomEvent('toast', { detail: 'Video recording failed. Check available storage and camera permissions, then retry.' }));
              };
              recorder.onstop = () => {
                const chunks = videoChunksRef.current;
                const blob = new Blob(chunks, { type: recorder.mimeType || chunks[0]?.type || 'video/webm' });
                if (!blob.size) {
                  setIsSavingRecordedVideo(false);
                  window.dispatchEvent(new CustomEvent('toast', { detail: 'No video data was captured. Please try recording again.' }));
                  return;
                }
                const nextUrl = trackObjectUrl(URL.createObjectURL(blob));
                setRecordedVideoUrl(previous => {
                  revokeTrackedObjectUrl(previous);
                  return nextUrl;
                });
                setVideoRawBlob(blob);
                setIsSavingRecordedVideo(false);
                window.dispatchEvent(new CustomEvent('toast', { detail: 'Video recording saved to your composer.' }));
              };
              recorder.start(250);
              setIsRecording(true);
              setIsSavingRecordedVideo(false);
              setIsRecordingPaused(false);
              setLoopTimerSecs(0);
              setRecordedVideoUrl(previous => {
                revokeTrackedObjectUrl(previous);
                return null;
              });
              setVideoRawBlob(null);
            } catch (error) {
              setIsRecording(false);
              window.dispatchEvent(new CustomEvent('toast', { detail: error instanceof Error ? error.message : 'Could not start video recording. Please retry.' }));
            }
            return null;
          }
          return prev !== null ? prev - 1 : null;
        });
      }, 600);
    });
  };

  const handleStopReelRecord = () => {
    setIsRecording(false);
    setIsRecordingPaused(false);
    setIsSavingRecordedVideo(true);
    const recorder = mediaRecorderVideoRef.current;
    if (recorder && recorder.state !== 'inactive') {
      try {
        recorder.stop();
        window.dispatchEvent(new CustomEvent('toast', { detail: 'Saving video recording…' }));
      } catch {
        setIsSavingRecordedVideo(false);
        window.dispatchEvent(new CustomEvent('toast', { detail: 'Could not finish the video recording. Please retry.' }));
      }
    } else {
      setIsSavingRecordedVideo(false);
      window.dispatchEvent(new CustomEvent('toast', { detail: 'No video was recorded. Check camera permission and try again.' }));
    }
  };

  const startVoiceRecording = () => {
    requestPermission('mic', async () => {
      try {
        setVoiceIsRecording(true);
        setVoiceIsPaused(false);
        setVoiceDurationSecs(0);
        setVoiceFileUrl(null);
        setVoiceTranscript('');

        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          if (stream) {
            const recorder = new MediaRecorder(stream);
            mediaRecorderRef.current = recorder;
            audioChunksRef.current = [];
            recorder.ondataavailable = (e) => {
              if (e.data.size > 0) audioChunksRef.current.push(e.data);
            };
            recorder.onstop = () => {
              const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
              setVoiceFileUrl(previous => {
                revokeTrackedObjectUrl(previous);
                return trackObjectUrl(URL.createObjectURL(blob));
              });
              setVoiceRawBlob(blob);
              if (blob.size > 0 && blob.size <= 5 * 1024 * 1024) {
                setLoadingTranscript(true);
                const reader = new FileReader();
                reader.onload = async () => {
                  try {
                    const dataUrl = String(reader.result || '');
                    const audioBase64 = dataUrl.slice(dataUrl.indexOf(',') + 1);
                    const result = await VoiceEngine.uploadVoice(audioBase64, blob.type || 'audio/webm');
                    setVoiceTranscript(result.transcription);
                  } catch (error) {
                    window.dispatchEvent(new CustomEvent('toast', { detail: error instanceof Error ? error.message : 'VOH could not turn this recording into text.' }));
                  } finally {
                    setLoadingTranscript(false);
                  }
                };
                reader.onerror = () => {
                  setLoadingTranscript(false);
                  window.dispatchEvent(new CustomEvent('toast', { detail: 'Could not read the voice recording. Please retry.' }));
                };
                reader.readAsDataURL(blob);
              } else if (blob.size > 5 * 1024 * 1024) {
                window.dispatchEvent(new CustomEvent('toast', { detail: 'The voice note was saved, but it is too large for transcription.' }));
              }
              mediaRecorderRef.current?.stream.getTracks().forEach(track => track.stop());
            };
            recorder.start();
          }
        }

        const interval = setInterval(() => {
          setVoiceDurationSecs(prev => {
            if (prev >= 60) {
              clearInterval(interval);
              stopVoiceRecording();
              return 60;
            }
            return prev + 1;
          });
        }, 1000);
        (window as any).voiceInterval = interval;
      } catch (err) {
        setVoiceIsRecording(false);
        window.dispatchEvent(new CustomEvent('toast', { detail: 'Microphone access was not granted. Please check browser permissions.' }));
      }
    });
  };

  const stopVoiceRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    } else {
      setVoiceIsRecording(false);
      setVoiceIsPaused(false);
      window.dispatchEvent(new CustomEvent('toast', { detail: 'No voice recording is available to save.' }));
      return;
    }
    setVoiceIsRecording(false);
    setVoiceIsPaused(false);
    clearInterval((window as any).voiceInterval);

    setLoadingTranscript(true);
  };

  // AI writing assistance only changes the caption when the authenticated service returns a real result.
  const handleAiWritingAssistance = async (promptType: string) => {
    setLoadingTranscript(true);
    window.dispatchEvent(new CustomEvent('toast', { detail: '✨ Nexora is polishing writing...' }));
    try {
      const response = await authenticatedVohFetch('/api/voh-ai/improve-post', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: caption, action: promptType })
      });
      if (!response.ok) throw new Error('AI writing assistance is unavailable right now.');
      const data = await response.json();
      if (typeof data.improved !== 'string' || !data.improved.trim()) {
        throw new Error('AI did not return an improved caption. Your original text has been kept.');
      }
      setCaption(data.improved);
      window.dispatchEvent(new CustomEvent('toast', { detail: '✨ Caption optimized by AI!' }));
    } catch (error) {
      window.dispatchEvent(new CustomEvent('toast', { detail: error instanceof Error ? error.message : 'AI writing assistance is unavailable right now. Your original caption has been kept.' }));
    } finally {
      setLoadingTranscript(false);
    }
  };

  // Save Draft
  const saveAsDraftLocally = async () => {
    if (composerStateOwnerId !== currentUser.id) return;
    const draft: DraftItem = {
      id: `draft-${Date.now()}`,
      caption,
      images: selectedImages.map(img => img.url),
      imageEdits: selectedImages.map(({ rotation, zoom, cropOffset, aspectRatio, filterName, filterStyle }) => ({ rotation, zoom, cropOffset, aspectRatio, filterName, filterStyle })),
      videoUrl: videoFileUrl || recordedVideoUrl || undefined,
      voiceUrl: voiceFileUrl || undefined,
      transcript: voiceTranscript || undefined,
      topics,
      audience,
      type: activeMode || 'text',
      timestamp: new Date().toLocaleDateString(),
      location,
      taggedUsernames,
      imageAltText,
      brightness,
      contrast,
      saturation,
      blur,
      stickerOverlay,
      textOverlay,
      textOverlayColor,
      commentsAllowed
    };
    let cloudSynced = false;
    if (currentUser.id && currentUser.id !== 'public_explore_session' && navigator.onLine) {
      try {
        const durableVideoUrl = [videoFileUrl, recordedVideoUrl, voiceFileUrl].find(value => typeof value === 'string' && /^https:\/\//i.test(value)) || '';
        const saved = await saveDraft(currentUser.id, caption, durableVideoUrl, activeMode === 'video' || activeMode === 'reel' ? 'video' : activeMode === 'photo' || activeMode === 'carousel' ? 'image' : 'text', topics.split(/[ ,]+/).filter(Boolean));
        if (saved?.id) {
          draft.id = saved.id;
          draft.cloudSynced = true;
          cloudSynced = true;
        }
      } catch (error) {
        console.warn('[Composer] Draft remains local because cloud sync failed.', error);
      }
    }
    setDraftsList(prev => [draft, ...prev]);
    localStorage.removeItem(autosaveKey);
    resetStates();
    window.dispatchEvent(new CustomEvent('toast', { detail: cloudSynced ? 'Draft saved to your account. Browser-only media stays on this device.' : 'Draft saved on this device. Sign in and reconnect to sync text drafts across devices.' }));
  };

  const handleSelectDraft = (draft: DraftItem) => {
    setCaption(draft.caption);
    setTopics(draft.topics);
    setAudience(draft.audience || 'public');
    setActiveMode(draft.type as any);
    setLocation(draft.location || '');
    setTaggedUsernames(draft.taggedUsernames || '');
    setImageAltText(draft.imageAltText || '');
    setCommentsAllowed(draft.commentsAllowed !== false);
    setBrightness(draft.brightness ?? 100);
    setContrast(draft.contrast ?? 100);
    setSaturation(draft.saturation ?? 100);
    setBlur(draft.blur ?? 0);
    setStickerOverlay(draft.stickerOverlay || null);
    setTextOverlay(draft.textOverlay || '');
    setTextOverlayColor(draft.textOverlayColor || '#ffffff');
    if (draft.images) {
      setSelectedImages(draft.images.map((img, index) => ({
        url: img,
        rotation: draft.imageEdits?.[index]?.rotation ?? 0,
        zoom: draft.imageEdits?.[index]?.zoom ?? 1,
        cropOffset: draft.imageEdits?.[index]?.cropOffset || { x: 0, y: 0 },
        aspectRatio: draft.imageEdits?.[index]?.aspectRatio ?? null,
        filterName: draft.imageEdits?.[index]?.filterName,
        filterStyle: draft.imageEdits?.[index]?.filterStyle,
      })));
    }
    if (draft.videoUrl) setVideoFileUrl(draft.videoUrl);
    if (draft.voiceUrl) {
      setVoiceFileUrl(draft.voiceUrl);
      setVoiceTranscript(draft.transcript || '');
    }
    if (draft.cloudSynced && currentUser.id !== 'public_explore_session') {
      deleteDraft(draft.id, currentUser.id).catch(error => console.warn('[Composer] Restored draft could not be removed from cloud.', error));
    }
    setDraftsList(prev => prev.filter(d => d.id !== draft.id));
    setCurrentStep(2);
    setActiveTab('feed');
  };

  const resetStates = () => {
    localStorage.removeItem(autosaveKey);
    setCaption('');
    setTopics('');
    setAudience('public');
    setLocation('');
    setTaggedUsernames('');
    setSelectedImages([]);
    setVideoFileUrl(null);
    setRecordedVideoUrl(null);
    setVoiceFileUrl(null);
    clearTrackedObjectUrls();
    setVoiceTranscript('');
    setPollQuestion('');
    setPollOptionsList(['', '']);
    setStickerOverlay(null);
    setTextOverlay('');
    setTextOverlayColor('#ffffff');
    setBrightness(100);
    setContrast(100);
    setSaturation(100);
    setBlur(0);
    setCommentsAllowed(true);
    setOriginRemixPolicyState('closed');
    publishAttemptIdRef.current = null;
    setActiveMode(null);
    setCurrentStep(1);
  };

  const handleDiscard = () => {
    resetStates();
    setShowExitConfirm(false);
    onClose();
  };

  // Stage progress triggers
  const triggerPublishMedia = async () => {
    if (postingStatus !== 'idle') return;
    const hasMedia = selectedImages.length > 0 || !!videoFileUrl || !!recordedVideoUrl || !!voiceFileUrl;
    if (!caption.trim() && !hasMedia && !pollQuestion.trim()) {
      setErrorMessage('Add a caption, media file, voice memo, or poll question before publishing.');
      setPostingStatus('failed');
      return;
    }
    if (activeTab !== 'story' && !publishAttemptIdRef.current) {
      publishAttemptIdRef.current = crypto.randomUUID();
    }
    const uploadController = new AbortController();
    uploadAbortControllerRef.current = uploadController;
    setErrorMessage('');
    setPublishStage('Getting your post ready…');
    setPostingStatus('publishing');
    setUploadProgress(0);

    try {
      if (activeTab === 'story') {
        let storyFile: File | undefined;
        if (videoRawBlob) {
          storyFile = new File([videoRawBlob], `nexora-story-video-${Date.now()}.${videoFileExtension(videoRawBlob.type) || 'mp4'}`, {
            type: videoRawBlob.type || 'video/mp4',
          });
        } else if (videoFileUrl || recordedVideoUrl) {
          const sourceUrl = videoFileUrl || recordedVideoUrl || '';
          const sourceBlob = sourceUrl.startsWith('db-media://')
            ? await getMediaBlob(sourceUrl.slice('db-media://'.length))
            : await (await fetch(sourceUrl)).blob();
          if (!sourceBlob) throw new Error('We could not reopen that video. Please choose it again.');
          storyFile = new File([sourceBlob], `nexora-story-video-${Date.now()}.${videoFileExtension(sourceBlob.type) || 'mp4'}`, {
            type: sourceBlob.type || 'video/mp4',
          });
        } else if (selectedImages.length > 0) {
          const selectedImage = selectedImages[0];
          const sourceBlob = selectedImage.url.startsWith('db-media://')
            ? await getMediaBlob(selectedImage.url.slice('db-media://'.length))
            : await (await fetch(selectedImage.url)).blob();
          if (!sourceBlob) throw new Error('We could not reopen that photo. Please choose it again.');
          const hasEdits = selectedImage.rotation !== 0
            || selectedImage.zoom !== 1
            || Boolean(selectedImage.aspectRatio)
            || Boolean(selectedImage.cropOffset?.x || selectedImage.cropOffset?.y)
            || Boolean(selectedImage.filterStyle && selectedImage.filterStyle !== 'none')
            || brightness !== 100
            || contrast !== 100
            || saturation !== 100
            || blur !== 0
            || Boolean(stickerOverlay)
            || Boolean(textOverlay.trim());
          const finalBlob = hasEdits ? await renderEditedPhotoBlob(sourceBlob, {
            rotation: selectedImage.rotation,
            zoom: selectedImage.zoom,
            cropOffset: selectedImage.cropOffset,
            aspectRatio: selectedImage.aspectRatio ?? null,
            filterStyle: selectedImage.filterStyle,
            brightness,
            contrast,
            saturation,
            blur,
            sticker: stickerOverlay,
            text: textOverlay,
            textColor: textOverlayColor,
          }) : sourceBlob;
          storyFile = new File([finalBlob], `nexora-story-photo-${Date.now()}.jpg`, {
            type: finalBlob.type || 'image/jpeg',
          });
        }

        if (!storyFile && !caption.trim()) {
          throw new Error('Add a photo, video or a short message before sharing your story.');
        }
        if (!onPublishStory) throw new Error('Story sharing is not available right now. Please try again.');
        setPublishStage(storyFile ? 'Uploading your story…' : 'Sharing your story…');
        await onPublishStory(caption, storyFile, progress => setUploadProgress(progress), uploadController.signal);
        setUploadProgress(100);
        setPostingStatus('completed');
        window.dispatchEvent(new CustomEvent('toast', { detail: 'Your story is live for the next 24 hours.' }));
        window.setTimeout(() => {
          setIsMinimized(false);
          onClose();
          resetStates();
        }, 1200);
        return;
      }

      const requestedMentions = taggedUsernames.split(',').map(value => value.trim().replace(/^@/, '').toLowerCase()).filter(Boolean).slice(0, 20);
      if (requestedMentions.length) {
        setMentionValidation('checking');
        const verified = await Promise.all(requestedMentions.map(async username => {
          const match = await getDocs(query(collection(db, 'publicProfiles'), where('username', '==', username), limit(1)));
          return !match.empty;
        }));
        if (verified.some(value => !value)) { setMentionValidation('invalid'); throw new Error('A mentioned username was not found. Select a real account from the suggestions before publishing.'); }
        setMentionValidation('valid');
      }
      let mainImg = selectedImages[0]?.url || undefined;
      let finalVid = videoFileUrl || recordedVideoUrl || undefined;
      const durableImages: string[] = [];
      const uploadedOriginAssetIds: string[] = [];
      for (let index = 0; index < selectedImages.length; index += 1) {
        setPublishStage(selectedImages.length > 1 ? `Uploading photo ${index + 1} of ${selectedImages.length}…` : 'Uploading your photo…');
        const selectedImage = selectedImages[index];
        const imageUrl = selectedImage.url;
        const hasEdits = selectedImage.rotation !== 0
          || selectedImage.zoom !== 1
          || Boolean(selectedImage.aspectRatio)
          || Boolean(selectedImage.cropOffset?.x || selectedImage.cropOffset?.y)
          || Boolean(selectedImage.filterStyle && selectedImage.filterStyle !== 'none')
          || brightness !== 100
          || contrast !== 100
          || saturation !== 100
          || blur !== 0
          || Boolean(stickerOverlay)
          || Boolean(textOverlay.trim());
        const isLocalImage = imageUrl.startsWith('data:') || imageUrl.startsWith('blob:') || imageUrl.startsWith('db-media://');

        if (isLocalImage || hasEdits) {
          if (isOffline) throw new Error('Connect to the internet before publishing photos. Your draft is still saved on this device.');
          const imageBlob = imageUrl.startsWith('db-media://')
            ? await getMediaBlob(imageUrl.slice('db-media://'.length))
            : await (await fetch(imageUrl)).blob();
          if (!imageBlob) throw new Error('A saved photo could not be recovered. Please choose it again.');
          const renderedBlob = hasEdits ? await renderEditedPhotoBlob(imageBlob, {
            rotation: selectedImage.rotation,
            zoom: selectedImage.zoom,
            cropOffset: selectedImage.cropOffset,
            aspectRatio: selectedImage.aspectRatio ?? null,
            filterStyle: selectedImage.filterStyle,
            brightness,
            contrast,
            saturation,
            blur,
            sticker: stickerOverlay,
            text: textOverlay,
            textColor: textOverlayColor,
          }) : imageBlob;
          setPublishStage('Optimising your photo…');
          const publishBlob = await optimizePhotoUpload(renderedBlob);
          const uploadExtension = publishBlob.type === 'image/webp' ? 'webp' : publishBlob.type.split('/')[1]?.replace('jpeg', 'jpg') || 'jpg';
          const uploaded = await uploadMediaFile({
            file: publishBlob,
            userId: uploadOwnerId,
            fileName: `photo-${index + 1}-${Date.now()}.${uploadExtension}`,
            signal: uploadController.signal,
            onProgress: progress => setUploadProgress(progress),
          });
          durableImages.push(uploaded.downloadUrl);
          uploadedOriginAssetIds.push(uploaded.mediaId);
        } else {
          durableImages.push(imageUrl);
        }
      }
      if (durableImages.length) mainImg = durableImages[0];

      let uploadVideoBlob = videoRawBlob;
      if (!uploadVideoBlob && videoFileUrl?.startsWith('db-media://')) {
        uploadVideoBlob = await getMediaBlob(videoFileUrl.slice('db-media://'.length));
      }
      if (uploadVideoBlob) {
        setPublishStage('Uploading your video…');
        try {
          const thumb = videoCoverBlob ? URL.createObjectURL(videoCoverBlob) : await generateVideoThumbnail(uploadVideoBlob);
          if (thumb) mainImg = thumb;
          if (isOffline) throw new Error('Connect to publish this video. Keep it as a draft and retry when online.');
          const uploaded = await uploadMediaFile({
            file: uploadVideoBlob,
            userId: uploadOwnerId,
            fileName: `video-${Date.now()}.${videoFileExtension(uploadVideoBlob.type) || 'video'}`,
            signal: uploadController.signal,
            onProgress: progress => setUploadProgress(progress),
          });
          finalVid = uploaded.downloadUrl;
          uploadedOriginAssetIds.push(uploaded.mediaId);
          if (mainImg?.startsWith('blob:') || mainImg?.startsWith('data:')) {
            const thumbnail = videoCoverBlob || await (await fetch(mainImg)).blob();
            const uploadedThumbnail = await uploadMediaFile({ file: thumbnail, userId: uploadOwnerId, fileName: `video-thumbnail-${Date.now()}.jpg`, signal: uploadController.signal });
            mainImg = uploadedThumbnail.downloadUrl;
          }
        } catch (e) {
          console.error('[MediaCreation] Video upload failed.', e);
          throw e instanceof Error ? e : new Error('Video upload failed. Check your connection and retry.');
        }
      }

      if (activeMode === 'voice') {
        if (!voiceRawBlob && !voiceFileUrl?.startsWith('db-media://')) throw new Error('Record a real voice note before publishing.');
        if (isOffline) throw new Error('Connect to publish this voice note. Keep it as a draft and retry when online.');
      }
      let finalVoiceUrl: string | undefined;
      let uploadVoiceBlob = voiceRawBlob;
      if (!uploadVoiceBlob && activeMode === 'voice' && voiceFileUrl?.startsWith('db-media://')) {
        uploadVoiceBlob = await getMediaBlob(voiceFileUrl.slice('db-media://'.length));
      }
      if (uploadVoiceBlob && activeMode === 'voice') {
        const uploadedVoice = await uploadMediaFile({
          file: uploadVoiceBlob,
          userId: uploadOwnerId,
          fileName: `voice-${Date.now()}.webm`,
          signal: uploadController.signal,
          onProgress: progress => setUploadProgress(progress),
        });
        finalVoiceUrl = uploadedVoice.downloadUrl;
        uploadedOriginAssetIds.push(uploadedVoice.mediaId);
      }

      let pollObj = undefined;
      if (activeMode === 'poll' && pollQuestion.trim()) {
        pollObj = {
          question: pollQuestion,
          options: pollOptionsList.filter(o => o.trim()).map((o, idx) => ({ id: `opt-${idx}`, text: o, votes: 0 }))
        };
      }

      // Open remixing only after the server confirms every uploaded source asset is verified and owned by this creator.
      // If any update fails, publishing stops rather than silently advertising a permission that was not saved.
      if (originRemixPolicy === 'allow_with_attribution') {
        for (const assetId of uploadedOriginAssetIds) {
          await setOriginRemixPolicy(assetId, currentUser.id, originRemixPolicy, uploadController.signal);
        }
      }

      setPublishStage('Saving your post…');
      const publishArgs = [
        caption,
        mainImg,
        topics,
        durableImages.length > 1 ? durableImages : undefined,
        finalVid,
        voiceTranscript || undefined,
        finalVoiceUrl,
        audience,
        activeMode === 'voice',
        activeMode === 'voice' ? voiceDurationSecs : undefined,
        pollObj,
        activeMode === 'community' ? 'Collaboration' : undefined,
        activeMode === 'pulse' ? (location || 'Nigeria') : undefined,
        'none',
        undefined,
        undefined,
        targetBroadcastChannel,
        undefined,
        {
          location: location.trim() || undefined,
          taggedUsernames: requestedMentions,
          imageAltText: imageAltText.trim() || undefined,
          commentsAllowed,
          mediaAssetId: uploadedOriginAssetIds[0],
          mediaAssetIds: uploadedOriginAssetIds,
          publicationId: publishAttemptIdRef.current || undefined,
          signal: uploadController.signal,
        }
      ] as Parameters<MediaCreationEngineProps['onAddPost']>;
      const createdPostId = onPublishPost
        ? await onPublishPost(...publishArgs)
        : onAddPost(...publishArgs);
      if (!createdPostId) throw new Error('NEXORA could not confirm your post. Please sign in and try again.');

      publishAttemptIdRef.current = null;
      setUploadProgress(100);
      setPostingStatus('completed');
      window.dispatchEvent(new CustomEvent('toast', { detail: 'Your post is live on NEXORA.' }));
      setTimeout(() => {
        setIsMinimized(false);
        onClose();
        resetStates();
      }, 1500);
    } catch (err) {
      if (uploadController.signal.aborted) {
        setPostingStatus('failed');
        setUploadProgress(0);
        setErrorMessage('Sharing was canceled. Your draft is still safe.');
      } else {
        const code = (err as { code?: string })?.code || '';
        const rawMessage = err instanceof Error ? err.message : '';
        const friendlyMessage = code === 'permission-denied' || rawMessage.includes('Missing or insufficient permissions')
          ? 'NEXORA could not save this yet because the account does not have permission. Your draft is still safe. Please try again.'
          : code.startsWith('storage/')
            ? 'NEXORA could not upload that file. Check your connection and file type, then try again. Your draft is still safe.'
            : rawMessage || 'Something went wrong while sharing. Your draft is still safe to retry.';
        console.error('[NEXORA publishing] Share failed.', err);
        setPostingStatus('failed');
        setErrorMessage(friendlyMessage);
      }
    } finally {
      if (uploadAbortControllerRef.current === uploadController) uploadAbortControllerRef.current = null;
    }
  };

  // Dynamic Styles
  const getModalBg = () => 'bg-[#090714]/98 border-[#44376F]/70 text-white';

  const canAdvanceFromCurrentStep = () => {
    if (currentStep === 1 && !activeMode) return false;
    if (currentStep === 2) {
      if (['photo', 'carousel'].includes(activeMode || '')) return selectedImages.length > 0;
      if (['video', 'reel'].includes(activeMode || '')) return !!videoFileUrl || !!recordedVideoUrl;
      if (activeMode === 'voice') return !!voiceFileUrl;
      if (activeMode === 'poll') return !!pollQuestion.trim() && pollOptionsList.filter(option => option.trim()).length >= 2;
    }
    return true;
  };

  const nextStep = () => {
    if (!canAdvanceFromCurrentStep()) {
      window.dispatchEvent(new CustomEvent('toast', { detail: 'Complete this step before continuing.' }));
      return;
    }
    if (currentStep < 7) setCurrentStep(prev => prev + 1);
  };

  const prevStep = () => {
    setIsMediaPreviewExpanded(false);
    if (currentStep > 1) setCurrentStep(prev => prev - 1);
  };

  // Exit trigger guard
  const handleExitClick = () => {
    if (caption || selectedImages.length > 0 || videoFileUrl || voiceFileUrl) {
      setShowExitConfirm(true);
    } else {
      onClose();
    }
  };

  // Accessibility Checks
  const isAltTextMissing = selectedImages.length > 0 && !imageAltText.trim();

  return (
    <div className="nx-create-experience fixed inset-0 z-50 flex items-stretch justify-stretch backdrop-blur-md bg-[#050914] overflow-hidden">
      
      {/* ⚠️ Exit Confirmation Overlay */}
      <AnimatePresence>
        {showExitConfirm && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center bg-black/85 p-4"
          >
            <motion.div 
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              className="bg-[#120E2B] border border-[#292244] max-w-sm w-full rounded-2xl p-6 text-center space-y-4"
            >
              <div className="w-12 h-12 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-400 mx-auto">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-sm font-sans font-bold text-white">Leave this post?</h4>
                <p className="text-xs text-[#A39BBF] mt-1">Save as a draft and come back to it anytime.</p>
              </div>
              <div className="grid grid-cols-3 gap-2 pt-2">
                <button 
                  onClick={handleDiscard}
                  className="px-3 py-2 bg-rose-600/10 border border-rose-500/20 text-rose-400 hover:bg-rose-600/20 rounded-xl text-[10px] font-mono font-bold cursor-pointer transition-all"
                >
                  Discard
                </button>
                <button 
                  onClick={() => { saveAsDraftLocally(); onClose(); }}
                  className="px-3 py-2 bg-violet-600/10 border border-white/10 text-violet-300 hover:bg-violet-600/20 rounded-xl text-[10px] font-mono font-bold cursor-pointer transition-all"
                >
                  Save Draft
                </button>
                <button 
                  onClick={() => setShowExitConfirm(false)}
                  className="px-3 py-2 bg-[#19143A] hover:bg-zinc-700 text-white rounded-xl text-[10px] font-mono font-bold cursor-pointer transition-all"
                >
                  Keep Editing
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 📸 Permissions Prompt */}
      <AnimatePresence>
        {permissionTarget && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-52 flex items-center justify-center bg-black/90 p-4"
          >
            <div className="bg-[#070511] border border-white/10 max-w-sm w-full rounded-2xl p-6 text-center space-y-4">
              <div className="w-12 h-12 bg-violet-500/10 text-violet-400 rounded-full flex items-center justify-center mx-auto">
                <Camera className="w-6 h-6 animate-pulse" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Allow {permissionTarget === 'mic' ? 'microphone' : 'camera'} access</h3>
                <p className="text-xs text-[#A39BBF] leading-relaxed mt-1">Your browser or device will ask for permission. NEXORA only uses {permissionTarget === 'mic' ? 'the microphone' : 'the camera'} when you choose to record or capture media.</p>
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={() => { setPermissionState('denied'); setPermissionTarget(null); pendingPermissionActionRef.current = null; }}
                  className="flex-1 py-2 rounded-xl bg-[#120E2B] hover:bg-[#19143A] text-[#8E88A7] text-xs font-mono font-bold cursor-pointer transition-all"
                >
                  Deny
                </button>
                <button 
                  onClick={() => { void handlePermissionContinue(); }}
                  className="flex-1 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-mono font-bold cursor-pointer transition-all"
                >
                  Continue
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isMediaPreviewExpanded && (currentStep === 3 || (currentStep === 2 && activeMode === 'carousel')) && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[70] flex flex-col bg-[#03040A]" role="dialog" aria-modal="true" aria-label="Full-screen media preview">
            <header className="flex shrink-0 items-center justify-between border-b border-white/10 px-4 pb-3 pt-[max(1rem,env(safe-area-inset-top))]">
              <div><p className="text-[9px] font-bold uppercase tracking-[0.18em] text-[#A99BCE]">NEXORA · PREVIEW</p><p className="mt-1 text-xs font-semibold text-white">{selectedImages.length ? `Photo ${Math.min((activeEditIndex ?? 0) + 1, selectedImages.length)} of ${selectedImages.length}` : 'Video preview'}</p></div>
              <button type="button" autoFocus onClick={() => setIsMediaPreviewExpanded(false)} className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/[0.05] text-white" aria-label="Close full-screen preview"><X size={18}/></button>
            </header>
            <div className="flex min-h-0 flex-1 items-center justify-center overflow-hidden p-3 pb-[max(1rem,env(safe-area-inset-bottom))]">
              {selectedImages.length > 0 ? (
                <img src={selectedImages[Math.min(activeEditIndex ?? 0, selectedImages.length - 1)]?.url} alt={selectedImages[Math.min(activeEditIndex ?? 0, selectedImages.length - 1)]?.fileName || 'Full-screen photo preview'} className="max-h-full max-w-full object-contain" />
              ) : (videoFileUrl || recordedVideoUrl) ? (
                <video src={videoFileUrl || recordedVideoUrl || undefined} controls playsInline autoPlay={false} preload="metadata" className="max-h-full max-w-full object-contain" />
              ) : null}
            </div>
            <footer className="flex shrink-0 items-center justify-between gap-3 border-t border-white/10 px-4 py-3 pb-[max(0.9rem,env(safe-area-inset-bottom))]">
              <span className="text-[10px] text-[#9A94A8]">Review your media before continuing.</span>
              <button type="button" onClick={() => setIsMediaPreviewExpanded(false)} className="rounded-xl bg-[#6845C5] px-4 py-2.5 text-xs font-semibold text-white">Done</button>
            </footer>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 📦 Minimized State Overlay */}
      {isMinimized && (
        <div className="fixed bottom-6 right-6 z-50 w-80 rounded-2xl border border-white/10 bg-[#070511]/95 backdrop-blur-md p-4 shadow-md space-y-3 animate-slideIn">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono font-black text-violet-400 uppercase tracking-widest flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-violet-500 animate-pulse" />
              {postingStatus === 'publishing' && '📤 Uploading and publishing'}
              {postingStatus === 'completed' && '✨ Shared!'}
            </span>
            <button 
              onClick={() => setIsMinimized(false)}
              className="text-[10px] text-[#A39BBF] hover:text-white hover:underline cursor-pointer font-mono"
            >
              Open ↗
            </button>
          </div>
          <div className="space-y-1.5">
            <div className="flex justify-between items-center text-[9px] font-mono text-[#A39BBF]">
              <span className="truncate max-w-[200px]">{caption || 'Content compilation...'}</span>
              <span>{uploadProgress}%</span>
            </div>
            <div className="w-full h-1 bg-[#19143A] rounded-full overflow-hidden">
              <div className="h-full bg-violet-500 transition-all duration-300" style={{ width: `${uploadProgress}%` }} />
            </div>
          </div>
        </div>
      )}

      {/* Main Studio Frame */}
      <motion.div
        initial={{ scale: 0.98, opacity: 0, y: 10 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.98, opacity: 0, y: 10 }}
        className={`relative h-[100dvh] w-full max-w-none rounded-none p-3 pt-[max(0.75rem,env(safe-area-inset-top))] pb-[max(0.75rem,env(safe-area-inset-bottom))] border-0 shadow-none flex flex-col min-h-0 overflow-hidden ${getModalBg()}`}
        id="creation-studio-frame"
      >
        {/* Header toolbar */}
        <div className={currentStep === 3 || (currentStep === 2 && activeMode === "carousel") ? "hidden" : "flex justify-between items-start border-b border-white/10 pb-3 mb-4 shrink-0"}>
          <div>
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-violet-600/10 border border-white/10 rounded-lg text-violet-400">
                <VohIcon size={18} animated glow variant="brand" />
              </div>
              <div>
                <div className="flex items-baseline gap-2">
                  <span className="text-sm font-extrabold tracking-tight nx-gradient-text leading-none">NEXORA</span>
                  <span className="text-[11px] font-semibold tracking-wide text-violet-300">Create</span>
                </div>
                <h1 className="text-sm font-semibold font-sans tracking-tight text-[#EEEAF8]">Create a post</h1>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={handleExitClick}
              className="p-1.5 rounded-lg bg-[#19143A]/70 text-[#A39BBF] hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-4.5 h-4.5" />
            </button>
          </div>
        </div>

        {/* Global Tab Navigation */}
        <div className={currentStep === 3 || (currentStep === 2 && activeMode === "carousel") ? "hidden" : "flex gap-1.5 p-1 bg-[#070511]/80 border border-[#292244] rounded-xl mb-4 shrink-0"}>
          <button 
            onClick={() => { setActiveTab('feed'); setCurrentStep(1); }}
            className={`flex-1 py-1.5 rounded-lg text-xs font-sans font-extrabold transition-all cursor-pointer ${activeTab === 'feed' ? 'bg-[#19143A] text-white' : 'text-[#8E88A7] hover:text-[#D1CBE3]'}`}
          >
            📝 Posts
          </button>
          <button 
            onClick={() => { setActiveTab('story'); setActiveMode('photo'); setCurrentStep(2); }}
            className={`flex-1 py-1.5 rounded-lg text-xs font-sans font-extrabold transition-all cursor-pointer ${activeTab === 'story' ? 'bg-violet-600/20 text-violet-200 border border-violet-500/30' : 'text-[#8E88A7] hover:text-[#D1CBE3]'}`}
          >
            📖 Stories
          </button>
          <button 
            onClick={() => setActiveTab('drafts')}
            className={`flex-1 py-1.5 rounded-lg text-xs font-sans font-extrabold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${activeTab === 'drafts' ? 'bg-violet-600 text-white font-black' : 'text-[#8E88A7] hover:text-[#D1CBE3]'}`}
          >
            💾 Drafts <span className="px-1.5 bg-[#19143A] text-[10px] rounded-full text-[#A39BBF]">{draftsList.length}</span>
          </button>
        </div>

        {/* A quiet progress line keeps the focus on creating, not on navigating a dashboard. */}
        {activeTab !== 'drafts' && currentStep !== 3 && !(currentStep === 2 && activeMode === 'carousel') && (
          <div className="mb-4 shrink-0 px-1" aria-label={`Creation step ${currentStep} of 7`}>
            <div className="h-1 overflow-hidden rounded-full bg-[#292244]">
              <div className="h-full rounded-full bg-gradient-to-r from-[#8A3FFC] to-[#4B10F2] transition-all duration-300" style={{ width: `${(currentStep / 7) * 100}%` }} />
            </div>
          </div>
        )}

        {/* Dynamic Core Body */}
        <div className={`flex-1 min-h-0 pr-1 space-y-4 text-left font-sans ${currentStep === 3 || (currentStep === 2 && (activeMode === 'photo' || activeMode === 'reel' || activeMode === 'carousel')) ? 'flex flex-col overflow-hidden' : 'overflow-y-auto custom-scrollbar'}`}>
          
          {activeTab === 'drafts' ? (
            /* Draft Organizer Screen */
            <div className="space-y-3">
              <span className="text-[10px] font-mono text-[#A39BBF] uppercase tracking-widest block">Your drafts</span>
              {draftsList.length === 0 ? (
                <div className="py-12 border border-[#292244] border-dashed rounded-2xl text-center space-y-2">
                  <FolderHeart className="w-8 h-8 text-[#756D91] mx-auto animate-pulse" />
                  <p className="text-xs text-[#A39BBF] italic">No drafts yet.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {draftsList.map((d) => (
                    <div 
                      key={d.id}
                      onClick={() => handleSelectDraft(d)}
                      className="p-3 bg-[#0a0a0f] border border-[#292244] hover:border-white/10 rounded-xl cursor-pointer transition-all group relative overflow-hidden"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <span className="text-[9px] font-mono text-violet-400 uppercase bg-violet-950/25 px-2 py-0.5 rounded border border-violet-800/20">{d.type}</span>
                        <button 
                          onClick={(e) => { e.stopPropagation(); if (d.cloudSynced && currentUser.id !== 'public_explore_session') deleteDraft(d.id, currentUser.id).catch(error => console.warn('[Composer] Draft delete failed.', error)); setDraftsList(prev => prev.filter(item => item.id !== d.id)); }}
                          className="p-1 hover:bg-rose-900/10 text-rose-400 rounded transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <p className="text-xs text-[#D1CBE3] line-clamp-2 italic font-serif">"{d.caption || 'No caption text'}"</p>
                      <div className="flex items-center justify-between mt-3 text-[9px] font-mono text-[#8E88A7]">
                        <span>Saved: {new Date(d.timestamp).toLocaleDateString()}</span>
                        <span className="text-violet-400 group-hover:underline">Continue →</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            /* WIZARD SCREENS */
            <div className={currentStep === 2 && (activeMode === 'photo' || activeMode === 'reel') ? "fixed inset-0 z-[130] flex h-[100dvh] w-screen flex-col overflow-hidden bg-black p-0" : currentStep === 3 ? "flex h-full min-h-0 flex-col overflow-hidden" : "space-y-4"}>
              
              {currentStep === 1 && (
                /* STEP 1: CREATION HOME */
                <div className="space-y-5 animate-fadeIn">
                  <div className="nx-create-hero relative overflow-hidden rounded-[22px] border border-white/10 bg-[#0B0D16] p-5">
                    
                    <div className="relative flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <span className="mb-2 inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-[#A99BDB]"><Sparkles size={12}/> Your creative space</span>
                        <h3 className="max-w-[250px] text-[22px] font-black leading-tight tracking-tight text-white">Make something worth sharing.</h3>
                        <p className="mt-2 max-w-[260px] text-xs leading-relaxed text-[#B9B2D0]">Capture a moment, tell a story or bring an idea to life.</p>
                      </div>
                      <div className="nx-create-hero-icon mt-1 flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-[#B7ADD2]"><Camera size={23}/></div>
                    </div>
                    <div className="relative mt-5 grid grid-cols-2 gap-2">
                      <button type="button" onClick={() => { setActiveMode('photo'); setCurrentStep(2); }} className="nx-create-primary-action flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#6845C5] px-3 py-3 text-xs font-bold text-white transition-colors active:scale-[0.98]"><Camera size={16}/> Open camera</button>
                      <button type="button" onClick={() => { setActiveMode('carousel'); setGalleryTab('photos'); setGalleryPreviewIndex(null); setGalleryReturnToCamera(false); setCurrentStep(2); }} className="nx-create-secondary-action flex min-h-12 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.035] px-3 py-3 text-xs font-semibold text-[#E8E6EF] transition-colors hover:bg-white/[0.07] active:scale-[0.98]"><FileImage size={16}/> Choose from gallery</button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between px-0.5">
                    <div><h4 className="text-sm font-extrabold text-white">Create a post</h4><p className="mt-0.5 text-[10px] text-[#8E88A7]">Choose the format that fits your moment.</p></div>
                    <span className="text-[10px] font-semibold text-[#756B91]">8 formats</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2.5">
                    {[
                      { id: 'text', icon: FileText, label: 'Text post', desc: 'A thought or update', tint: 'text-[#C4B2FF]', glow: 'bg-violet-500/10' },
                      { id: 'video', icon: Video, label: 'Video', desc: 'Upload a video', tint: 'text-[#B7A3FF]', glow: 'bg-violet-500/10' },
                      { id: 'reel', icon: Sparkle, label: 'Record video', desc: 'Shoot a new moment', tint: 'text-[#D0B8FF]', glow: 'bg-purple-500/10' },
                      { id: 'voice', icon: Mic, label: 'Voice note', desc: 'Let your voice lead', tint: 'text-[#B8ACFF]', glow: 'bg-indigo-500/10' },
                      { id: 'carousel', icon: FileImage, label: 'Photo carousel', desc: 'Share multiple photos', tint: 'text-[#C4B2FF]', glow: 'bg-violet-500/10' },
                      { id: 'poll', icon: BarChart2, label: 'Poll', desc: 'Ask people to vote', tint: 'text-[#B7A3FF]', glow: 'bg-violet-500/10' },
                      { id: 'pulse', icon: MapPin, label: 'Local update', desc: 'What is happening nearby', tint: 'text-[#C4B2FF]', glow: 'bg-purple-500/10' },
                      { id: 'community', icon: Users, label: 'Circle post', desc: 'Share with your Circle', tint: 'text-[#B8ACFF]', glow: 'bg-indigo-500/10' },
                    ].map((item) => (
                      <button key={item.id} type="button" onClick={() => { setActiveMode(item.id as any); if (item.id === 'carousel') { setGalleryTab('photos'); setGalleryPreviewIndex(null); setGalleryReturnToCamera(false); } else { setGalleryTab('photos'); setGalleryReturnToCamera(false); } setCurrentStep(2); }} className="nx-create-mode-card group flex min-h-[82px] items-center gap-3 rounded-xl border border-white/[0.09] bg-[#0C0E17] p-3 text-left transition-colors hover:border-white/20 hover:bg-[#11141E] active:scale-[0.985]">
                        <span className={`nx-create-mode-icon flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/[0.07] bg-white/[0.035] text-[#B8B2C7]`}><item.icon size={19}/></span>
                        <span className="min-w-0"><span className="block text-xs font-bold text-[#F3F1F7] group-hover:text-white">{item.label}</span><span className="mt-1 block text-[10px] leading-snug text-[#89839F]">{item.desc}</span></span>
                        <ChevronRight size={14} className="ml-auto shrink-0 text-[#777383] transition-transform group-hover:translate-x-0.5 group-hover:text-[#B8ADD8]"/>
                      </button>
                    ))}
                  </div>

                  {onOpenStudio && (
                    <button type="button" onClick={() => onOpenStudio([])} className="nx-create-studio-action group flex w-full items-center gap-3 rounded-xl border border-white/10 bg-[#0C0E17] p-3.5 text-left transition-colors hover:border-white/20 hover:bg-[#11141E]">
                      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-[#B8ADD8]"><Clapperboard size={21}/></span>
                      <span className="min-w-0 flex-1"><span className="block text-xs font-extrabold text-white">Open NEXORA Studio</span><span className="mt-1 block text-[10px] text-[#A39BBF]">Edit clips, add music, captions, transitions and more.</span></span>
                      <ChevronRight size={17} className="text-[#777383] transition-transform group-hover:translate-x-1"/>
                    </button>
                  )}
                </div>
              )}

              {currentStep === 2 && (
                /* STEP 2: MEDIA IMPORT & RECORDING */
                <div className={activeMode === 'photo' || activeMode === 'reel' ? "relative flex h-full min-h-0 w-full flex-1 flex-col overflow-hidden bg-black animate-fadeIn" : "flex h-full min-h-0 flex-col space-y-4 animate-fadeIn"}>
                  {activeMode !== 'photo' && activeMode !== 'reel' && (
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-semibold text-[#B69BFF]">{activeMode === 'video' ? 'Choose a video' : 'Add your content'}</span>
                      <button onClick={() => { if (galleryTab === "videos") { setActiveMode("carousel"); setCurrentStep(2); } else { setCurrentStep(1); } }} className="text-xs text-violet-400 hover:underline flex items-center gap-1 font-bold">{galleryTab === "videos" ? "Back to gallery" : "Choose another"}</button>
                    </div>
                  )}

                  {activeMode === 'photo' && (
                    <div className="absolute inset-0 h-full min-h-0 w-full overflow-hidden bg-black">
                      {/* Drag upload zone */}
                      <div className="hidden">
                        <FileImage className="w-8 h-8 text-[#8E88A7] animate-bounce" />
                        <div className="space-y-1">
                          <p className="text-xs text-[#D1CBE3] font-bold">Add a photo</p>
                          <p className="text-[10px] text-[#8E88A7] font-sans">Choose a photo from your device.</p>
                        </div>
                        <label className="px-4 py-2 bg-[#120E2B] hover:bg-[#19143A] border border-[#292244] text-white rounded-xl text-xs font-mono font-bold cursor-pointer transition-all">
                          Choose from gallery
                          <input type="file" accept="image/*" multiple className="hidden" onChange={handleImageUpload} />
                        </label>
                      </div>

                      {/* Snap device simulation */}
                      <div className="absolute inset-0 flex flex-col items-center justify-between px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-[max(1rem,env(safe-area-inset-top))] text-center">
                        <div className="absolute inset-x-4 top-[max(1rem,env(safe-area-inset-top))] z-30 flex items-center justify-between"><button type="button" aria-label="Back to creation options" onClick={() => setCurrentStep(1)} className="nx-camera-glass-control flex h-10 w-10 items-center justify-center rounded-full text-white"><ChevronLeft size={20}/></button><span className="nx-camera-mode-label rounded-full px-3 py-1.5 text-[10px] font-semibold tracking-[0.18em] text-white">PHOTO</span><span className="w-10 text-right text-[10px] font-semibold tabular-nums text-white/90" aria-live="polite">{selectedImages.length ? `${selectedImages.length}/20` : ''}</span></div>
                        <video ref={photoPreviewRef} autoPlay muted playsInline onLoadedMetadata={() => setPhotoCameraReady(true)} onCanPlay={() => setPhotoCameraReady(true)} className="absolute inset-0 h-full w-full object-cover bg-black" aria-label="Live camera preview" />
                        {!photoCameraReady && (
                          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-black/35 px-8">
                            <span className="h-8 w-8 animate-spin rounded-full border-2 border-white/25 border-t-violet-300" />
                            <p className="text-xs font-semibold text-white">{permissionState === 'denied' ? 'Camera access is off' : 'Starting your camera…'}</p>
                            <button type="button" onClick={() => { setPermissionState('prompt'); setPermissionTarget('camera'); }} className="rounded-full border border-white/20 bg-black/60 px-4 py-2 text-xs font-semibold text-white">{permissionState === 'denied' ? 'Enable camera' : 'Retry camera'}</button>
                          </div>
                        )}
                        <div className="relative z-20 mt-auto flex w-full flex-col items-center gap-3">
                          <div className="nx-camera-control-dock flex items-center justify-center gap-7 rounded-[28px] px-5 py-3">
                            <button type="button" aria-label="Open photo gallery" onClick={() => { setActiveMode('carousel'); setGalleryTab('photos'); setGalleryPreviewIndex(null); setGalleryReturnToCamera(true); }} className="nx-camera-side-control flex h-12 w-12 items-center justify-center overflow-hidden rounded-2xl text-white">{selectedImages.length > 0 ? <img src={selectedImages[selectedImages.length - 1].url} alt="Last captured photo" className="h-full w-full object-cover"/> : <FileImage size={20}/>}</button>
                            <button type="button" onClick={captureCameraSnapshot} disabled={!photoCameraReady || selectedImages.length >= 20} aria-disabled={!photoCameraReady || selectedImages.length >= 20} title={photoCameraReady ? 'Take photo' : 'Waiting for camera preview'} aria-label="Take photo" className="nx-camera-photo-shutter flex h-[76px] w-[76px] items-center justify-center rounded-full border-[4px] border-white disabled:cursor-not-allowed disabled:opacity-45"><span className="h-[60px] w-[60px] rounded-full border border-black/10 bg-white transition-transform"/></button>
                            <button type="button" aria-label={cameraFacing === 'user' ? 'Switch to rear camera' : 'Switch to front camera'} title={cameraFacing === 'user' ? 'Switch to rear camera' : 'Switch to front camera'} onClick={() => setCameraFacing(previous => previous === 'user' ? 'environment' : 'user')} disabled={!photoCameraReady} className="nx-camera-side-control flex h-12 w-12 items-center justify-center rounded-2xl text-white disabled:opacity-40"><RefreshCw size={20}/></button>
                          </div>
                          {selectedImages.length > 0 && (
                            <div className="flex w-full max-w-full items-center gap-3">
                              <div className="flex min-w-0 flex-1 gap-1.5 overflow-x-auto py-1">
                                {selectedImages.map((img, i) => (
                                  <div key={i} className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg border border-white/25">
                                    <img src={img.url} alt={`Captured photo ${i + 1}`} className="h-full w-full object-cover" />
                                    <span className="absolute bottom-0.5 left-0.5 rounded bg-black/70 px-1 text-[8px] font-bold text-white">{i + 1}</span>
                                    <button type="button" aria-label={`Remove photo ${i + 1}`} onClick={() => setSelectedImages(prev => prev.filter((_, idx) => idx !== i))} className="absolute right-0.5 top-0.5 rounded-full bg-black/80 p-0.5 text-white"><X className="h-3 w-3"/></button>
                                  </div>
                                ))}
                              </div>
                              <button type="button" onClick={nextStep} className="nx-camera-use-button shrink-0 rounded-full px-4 py-3 text-xs font-semibold text-white">Use {selectedImages.length === 1 ? 'photo' : `${selectedImages.length} photos`}</button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {activeMode === 'carousel' && (
                    <section className="nx-gallery flex h-full min-h-0 flex-1 flex-col overflow-hidden rounded-[22px] border border-white/[0.09] bg-[#080A12]" aria-label="Media gallery">
                      <header className="nx-gallery-header shrink-0 border-b border-white/[0.08] px-4 pb-3 pt-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-[#A99BCE]">NEXORA · CREATE</p>
                            <h3 className="mt-1 text-[19px] font-bold tracking-tight text-white">Your gallery</h3>
                            <p className="mt-1 text-[11px] leading-relaxed text-[#92909D]">Choose the photos and clips you want to share.</p>
                          </div>
                          <button type="button" aria-label="Close gallery" onClick={() => { setGalleryPreviewIndex(null); if (galleryReturnToCamera) { setActiveMode('photo'); setCurrentStep(2); setGalleryReturnToCamera(false); } else { setCurrentStep(1); } }} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-[#D5D2DD] transition-colors hover:bg-white/[0.09]"><X size={17}/></button>
                        </div>
                        <div className="nx-gallery-tabs mt-4 grid grid-cols-2 rounded-xl border border-white/[0.08] bg-black/25 p-1" role="group" aria-label="Media type">
                          <button type="button" onClick={() => setGalleryTab('photos')} aria-pressed={galleryTab === 'photos'} className={`rounded-lg px-3 py-2.5 text-xs font-semibold transition-colors ${galleryTab === 'photos' ? 'bg-[#252033] text-white shadow-sm' : 'text-[#8E8B98] hover:text-white'}`}>Photos</button>
                          <button type="button" disabled={selectedImages.length > 0 || nativeGallerySelectedIds.length > 0} onClick={() => setGalleryTab('videos')} aria-pressed={galleryTab === 'videos'} className={`rounded-lg px-3 py-2.5 text-xs font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-35 ${galleryTab === 'videos' ? 'bg-[#252033] text-white shadow-sm' : 'text-[#8E8B98] hover:text-white'}`}>Videos</button>
                        </div>
                        {galleryTab === 'photos' && (
                          <div className="mt-3 flex items-center justify-between gap-2">
                            <span className="text-[10px] text-[#8E8B98]">{selectedImages.length ? 'Selected for your post' : 'Nothing selected yet'}</span>
                            <span className="rounded-full border border-white/10 bg-white/[0.035] px-2.5 py-1 text-[10px] font-semibold tabular-nums text-[#C9C5D2]">{selectedImages.length + nativeGallerySelectedIds.length} of 20</span>
                          </div>
                        )}
                      </header>

                      <div className="nx-gallery-scroll min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-3">
                        {galleryTab === 'videos' ? (
                          nativeGalleryEnabled ? (
                            <div className="space-y-3">
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <p className="text-[10px] font-semibold text-[#C9C4D2]">Videos on this device</p>
                                <span className="text-[10px] tabular-nums text-[#898692]">{nativeGalleryItems.length} loaded</span>
                              </div>
                              {nativeGalleryError && <p role="status" className="rounded-lg border border-amber-300/20 bg-amber-300/[0.06] p-3 text-[11px] text-amber-100">{nativeGalleryError}</p>}
                              {nativeGalleryLoading && nativeGalleryItems.length === 0 ? <div className="py-16 text-center text-xs text-[#A8A3B1]">Opening your gallery…</div> : nativeGalleryItems.length === 0 ? <div className="py-16 text-center text-xs text-[#A8A3B1]">No videos found in this library.</div> : (
                                <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                                  {nativeGalleryItems.map((item, index) => {
                                    const selectedIndex = nativeGallerySelectedIds.indexOf(item.id);
                                    const day = new Date(item.dateAdded).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
                                    const previousDay = index > 0 ? new Date(nativeGalleryItems[index - 1].dateAdded).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : '';
                                    return <React.Fragment key={item.id}>
                                      {day !== previousDay && <div className="col-span-full pt-2 text-[10px] font-semibold text-[#A9A2B6]">{day}</div>}
                                      <button type="button" onClick={() => toggleNativeGalleryItem(item)} aria-pressed={selectedIndex >= 0} className={`relative aspect-square overflow-hidden rounded-xl border bg-[#11121A] ${selectedIndex >= 0 ? 'border-[#B7A5E8] ring-1 ring-[#B7A5E8]/60' : 'border-white/10'}`}>
                                        {item.thumbnail ? <img src={item.thumbnail} alt={item.name} loading="lazy" className="h-full w-full object-cover"/> : <span className="flex h-full items-center justify-center text-[#A9A2B6]"><Video size={22}/></span>}
                                        <span className="absolute bottom-1 left-1 rounded bg-black/75 px-1.5 py-1 text-[9px] text-white">{Math.max(1, Math.round((item.size || 0) / 1048576))} MB</span>
                                        <span className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full border border-white/60 bg-black/65 text-[10px] font-bold text-white">{selectedIndex >= 0 ? selectedIndex + 1 : <Play size={11}/>}</span>
                                      </button>
                                    </React.Fragment>;
                                  })}
                                </div>
                              )}
                              {nativeGallerySelectedIds.length > 0 && (
                                <div className="flex items-center gap-2 overflow-x-auto rounded-xl border border-white/[0.08] bg-black/20 p-2">
                                  {nativeGallerySelectedIds.map((id, index) => {
                                    const item = nativeGalleryItems.find(candidate => candidate.id === id);
                                    return item ? <button key={id} type="button" onClick={() => toggleNativeGalleryItem(item)} aria-label={`Remove selected clip ${index + 1}`} className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg border border-[#B7A5E8]/50">
                                      {item.thumbnail && <img src={item.thumbnail} alt="" className="h-full w-full object-cover"/>}
                                      <span className="absolute left-1 top-1 rounded bg-black/75 px-1.5 py-0.5 text-[9px] font-bold text-white">{index + 1}</span>
                                      <span className="absolute bottom-1 right-1 rounded bg-black/75 p-0.5 text-white"><X size={10}/></span>
                                    </button> : null;
                                  })}
                                  <span className="shrink-0 text-[9px] text-[#A8A3B1]">Tap a clip to remove it</span>
                                </div>
                              )}
                              {nativeGalleryHasMore && <button type="button" disabled={nativeGalleryLoading} onClick={loadMoreNativeGalleryItems} className="w-full rounded-xl border border-white/10 py-2.5 text-xs font-semibold text-[#C9C4D2] disabled:opacity-50">{nativeGalleryLoading ? 'Loading…' : 'Load more videos'}</button>}
                              {nativeGallerySelectedIds.length > 0 && <button type="button" disabled={nativeGalleryLoading} onClick={importSelectedNativeGalleryItems} className="w-full rounded-xl bg-[#6545B7] py-3 text-xs font-semibold text-white disabled:opacity-50">{nativeGalleryLoading ? 'Preparing clips…' : `Use selected video`}</button>}
                            </div>
                          ) : (
                          <div className="nx-gallery-empty flex min-h-[300px] flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 px-6 text-center">
                            <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-[#C4BED2]"><Video size={25}/></div>
                            <h4 className="mt-4 text-sm font-semibold text-white">Choose a video</h4>
                            <p className="mt-1 max-w-[270px] text-[11px] leading-relaxed text-[#92909D]">Select a clip to trim, or choose multiple clips to continue in NEXORA Studio.</p>
                            <label className="mt-5 inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-xl bg-[#6545B7] px-5 py-3 text-xs font-semibold text-white transition-colors hover:bg-[#7555C8] active:scale-[0.98]"><Plus size={16}/> Browse videos<input type="file" accept="video/*" multiple className="hidden" onChange={event => { setActiveMode('video'); handleVideoUpload(event); }}/></label>
                            <p className="mt-3 text-[9px] text-[#777481]">Your device’s media picker controls file access.</p>
                          </div>
                          )
                        ) : (
                          <>
                            {nativeGalleryEnabled && (
                              <div className="mb-4 space-y-3">
                                <div className="flex items-center justify-between gap-2">
                                  <p className="text-[10px] font-semibold text-[#C9C4D2]">Browse photos on this device</p>
                                  <span className="text-[10px] tabular-nums text-[#898692]">{nativeGalleryItems.length} loaded</span>
                                </div>
                                <div className="flex gap-2 overflow-x-auto pb-1">
                                  {['Recent', ...Array.from(new Set(nativeGalleryItems.map(item => item.album).filter(Boolean)))].map(album => (
                                    <button key={album} type="button" onClick={() => setNativeGalleryAlbum(album)} aria-pressed={nativeGalleryAlbum === album} className={`shrink-0 rounded-full border px-3 py-1.5 text-[10px] font-semibold ${nativeGalleryAlbum === album ? 'border-[#B7A5E8]/50 bg-[#6545B7]/25 text-white' : 'border-white/10 text-[#A8A3B1]'}`}>{album}</button>
                                  ))}
                                </div>
                                {nativeGalleryError && <p role="status" className="rounded-lg border border-amber-300/20 bg-amber-300/[0.06] p-3 text-[11px] text-amber-100">{nativeGalleryError}</p>}
                                {nativeGalleryLoading && nativeGalleryItems.length === 0 ? <div className="py-12 text-center text-xs text-[#A8A3B1]">Opening your gallery…</div> : nativeGalleryItems.length === 0 ? <div className="rounded-xl border border-dashed border-white/10 py-12 text-center text-xs text-[#A8A3B1]">No photos found in this library yet.</div> : (
                                  <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                                    {nativeGalleryItems.filter(item => nativeGalleryAlbum === 'Recent' || item.album === nativeGalleryAlbum).map((item, index, visibleItems) => {
                                      const selectedIndex = nativeGallerySelectedIds.indexOf(item.id);
                                      const day = new Date(item.dateAdded).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
                                      const previousDay = index > 0 ? new Date(visibleItems[index - 1].dateAdded).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : '';
                                      return <React.Fragment key={item.id}>
                                        {day !== previousDay && <div className="col-span-full pt-2 text-[10px] font-semibold text-[#A9A2B6]">{day}</div>}
                                        <button type="button" onClick={() => toggleNativeGalleryItem(item)} aria-pressed={selectedIndex >= 0} className={`relative aspect-square overflow-hidden rounded-xl border bg-[#11121A] ${selectedIndex >= 0 ? 'border-[#B7A5E8] ring-1 ring-[#B7A5E8]/60' : 'border-white/10'}`}>
                                          {item.thumbnail ? <img src={item.thumbnail} alt={item.name} loading="lazy" className="h-full w-full object-cover"/> : <span className="flex h-full items-center justify-center text-[#A9A2B6]"><FileImage size={22}/></span>}
                                          <span className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full border border-white/60 bg-black/65 text-[10px] font-bold text-white">{selectedIndex >= 0 ? selectedIndex + 1 : <Plus size={11}/>}</span>
                                        </button>
                                      </React.Fragment>;
                                    })}
                                  </div>
                                )}
                                {nativeGallerySelectedIds.length > 0 && (
                                  <div className="flex items-center gap-2 overflow-x-auto rounded-xl border border-white/[0.08] bg-black/20 p-2">
                                    {nativeGallerySelectedIds.map((id, index) => {
                                      const item = nativeGalleryItems.find(candidate => candidate.id === id);
                                      return item ? <button key={id} type="button" onClick={() => toggleNativeGalleryItem(item)} aria-label={`Remove selected photo ${index + 1}`} className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg border border-[#B7A5E8]/50">
                                        {item.thumbnail && <img src={item.thumbnail} alt="" className="h-full w-full object-cover"/>}
                                        <span className="absolute left-1 top-1 rounded bg-black/75 px-1.5 py-0.5 text-[9px] font-bold text-white">{index + 1}</span>
                                        <span className="absolute bottom-1 right-1 rounded bg-black/75 p-0.5 text-white"><X size={10}/></span>
                                      </button> : null;
                                    })}
                                    <span className="shrink-0 text-[9px] text-[#A8A3B1]">Tap a photo to remove it</span>
                                  </div>
                                )}
                                {nativeGalleryHasMore && <button type="button" disabled={nativeGalleryLoading} onClick={loadMoreNativeGalleryItems} className="w-full rounded-xl border border-white/10 py-2.5 text-xs font-semibold text-[#C9C4D2] disabled:opacity-50">{nativeGalleryLoading ? 'Loading…' : 'Load more photos'}</button>}
                                {nativeGallerySelectedIds.length > 0 && <button type="button" disabled={nativeGalleryLoading} onClick={importSelectedNativeGalleryItems} className="w-full rounded-xl bg-[#6545B7] py-3 text-xs font-semibold text-white disabled:opacity-50">{nativeGalleryLoading ? 'Preparing photos…' : `Add ${nativeGallerySelectedIds.length} selected photo${nativeGallerySelectedIds.length === 1 ? '' : 's'}`}</button>}
                              </div>
                            )}
                            {selectedImages.length === 0 && !nativeGalleryEnabled ? (

                          <div className="nx-gallery-empty flex min-h-[340px] flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 px-6 text-center">
                            <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-[#C4BED2]"><FolderHeart size={26}/></div>
                            <h4 className="mt-4 text-sm font-semibold text-white">Start with a photo</h4>
                            <p className="mt-1 max-w-[260px] text-[11px] leading-relaxed text-[#92909D]">Browse your device, select one or more photos, then arrange and preview them here.</p>
                            <label className="mt-5 inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-xl bg-[#6545B7] px-5 py-3 text-xs font-semibold text-white transition-colors hover:bg-[#7555C8] active:scale-[0.98]"><Plus size={16}/> Choose photos<input type="file" accept="image/*" multiple className="hidden" onChange={handleImageUpload}/></label>
                            <p className="mt-3 text-[9px] text-[#777481]">NEXORA only receives files you choose.</p>
                          </div>
                        ) : null}
                        {selectedImages.length > 0 && (
                          <>
                            <div className="mb-3 flex items-center justify-between gap-2">
                              <div><p className="text-xs font-semibold text-white">Selected photos</p><p className="mt-0.5 text-[10px] text-[#898692]">Tap to preview · use arrows to arrange</p></div>
                              <button type="button" onClick={() => { setSelectedImages([]); setGalleryPreviewIndex(null); setActiveEditIndex(null); }} className="rounded-lg px-2.5 py-1.5 text-[10px] font-semibold text-[#A8A3B1] transition-colors hover:bg-white/[0.06] hover:text-white">Clear all</button>
                            </div>
                            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                              {selectedImages.map((img, index) => (
                                <article key={`${img.fileName || 'photo'}-${index}`} className={`nx-gallery-tile group relative aspect-square overflow-hidden rounded-xl border bg-[#11121A] ${galleryPreviewIndex === index ? 'is-active border-[#B7A5E8]' : 'border-white/10'}`}>
                                  <button type="button" onClick={() => setGalleryPreviewIndex(index)} aria-label={`Preview ${img.fileName || `photo ${index + 1}`}`} aria-pressed={galleryPreviewIndex === index} className="absolute inset-0 h-full w-full">
                                    <img src={img.url} alt={img.fileName || `Selected photo ${index + 1}`} loading="lazy" className="h-full w-full object-cover"/>
                                  </button>
                                  <span className="pointer-events-none absolute left-1.5 top-1.5 flex h-6 min-w-6 items-center justify-center rounded-md bg-black/75 px-1.5 text-[10px] font-bold tabular-nums text-white">{index + 1}</span>
                                  {galleryPreviewIndex === index && <span className="pointer-events-none absolute right-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-[#B7A5E8] text-[#171321]"><Check size={12}/></span>}
                                  <button type="button" aria-label={`Remove photo ${index + 1}`} onClick={() => { setSelectedImages(previous => previous.filter((_, itemIndex) => itemIndex !== index)); setGalleryPreviewIndex(previous => previous === null ? null : previous === index ? null : previous > index ? previous - 1 : previous); setActiveEditIndex(previous => previous === null ? null : previous === index ? null : previous > index ? previous - 1 : previous); }} className="absolute bottom-1.5 right-1.5 flex h-7 w-7 items-center justify-center rounded-lg bg-black/75 text-white transition-colors hover:bg-black"><X size={13}/></button>
                                  <div className="absolute bottom-1.5 left-1.5 flex gap-1">
                                    <button type="button" aria-label={`Move photo ${index + 1} earlier`} disabled={index === 0} onClick={() => { const next = [...selectedImages]; [next[index - 1], next[index]] = [next[index], next[index - 1]]; setSelectedImages(next); setGalleryPreviewIndex(previous => previous === index ? index - 1 : previous === index - 1 ? index : previous); }} className="flex h-7 w-7 items-center justify-center rounded-lg bg-black/75 text-white disabled:opacity-25"><ArrowUp size={13}/></button>
                                    <button type="button" aria-label={`Move photo ${index + 1} later`} disabled={index === selectedImages.length - 1} onClick={() => { const next = [...selectedImages]; [next[index + 1], next[index]] = [next[index], next[index + 1]]; setSelectedImages(next); setGalleryPreviewIndex(previous => previous === index ? index + 1 : previous === index + 1 ? index : previous); }} className="flex h-7 w-7 items-center justify-center rounded-lg bg-black/75 text-white disabled:opacity-25"><ArrowDown size={13}/></button>
                                  </div>
                                </article>
                              ))}
                            </div>
                            {galleryPreviewIndex !== null && selectedImages[galleryPreviewIndex] && (
                              <div className="nx-gallery-preview mt-3 overflow-hidden rounded-xl border border-white/[0.09] bg-[#0D0F16]">
                                <div className="flex items-center justify-between gap-3 px-3 py-2.5">
                                  <div className="min-w-0"><p className="text-[10px] font-semibold text-white">Preview {galleryPreviewIndex + 1} of {selectedImages.length}</p><p className="mt-0.5 truncate text-[9px] text-[#898692]">{selectedImages[galleryPreviewIndex].fileName || 'Selected photo'}</p></div>
                                  <div className="flex shrink-0 items-center gap-1.5">
                                    <button type="button" onClick={() => setIsMediaPreviewExpanded(true)} className="rounded-lg border border-white/10 px-2.5 py-2 text-[10px] font-semibold text-[#C9C4D2] transition-colors hover:bg-white/[0.06]">Expand</button>
                                    <button type="button" onClick={() => { setActiveEditIndex(galleryPreviewIndex); setIsMediaPreviewExpanded(false); nextStep(); }} className="rounded-lg border border-white/10 px-3 py-2 text-[10px] font-semibold text-[#D7D2E1] transition-colors hover:bg-white/[0.06]">Edit photo</button>
                                  </div>
                                </div>
                                <div className="flex max-h-[260px] items-center justify-center bg-black/50 p-2"><img src={selectedImages[galleryPreviewIndex].url} alt={selectedImages[galleryPreviewIndex].fileName || 'Selected photo preview'} className="max-h-[244px] max-w-full rounded-md object-contain"/></div>
                              </div>
                            )}
                          </>
                        )}
                          </>
                        )}
                      </div>

                      <footer className="nx-gallery-footer shrink-0 border-t border-white/[0.08] bg-[#0B0D14] px-3 pb-[max(0.85rem,env(safe-area-inset-bottom))] pt-3">
                        <div className="flex items-center gap-2.5">
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-semibold text-white">{selectedImages.length ? `${selectedImages.length} photo${selectedImages.length === 1 ? '' : 's'} ready` : 'No photos selected'}</p>
                            <p className="mt-0.5 text-[10px] text-[#898692]">{selectedImages.length ? 'Your selected order will be kept.' : 'Choose photos from your device to continue.'}</p>
                          </div>
                          {selectedImages.length < 20 && (
                            <label className="flex h-10 shrink-0 cursor-pointer items-center justify-center gap-1.5 rounded-xl border border-white/10 px-3 text-[10px] font-semibold text-[#C7C2D0] transition-colors hover:bg-white/[0.05]"><Plus size={14}/> Add<input type="file" accept="image/*" multiple className="hidden" onChange={handleImageUpload}/></label>
                          )}
                          <button type="button" disabled={selectedImages.length === 0} onClick={nextStep} className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-[#6545B7] px-4 text-xs font-semibold text-white transition-colors hover:bg-[#7555C8] disabled:cursor-not-allowed disabled:bg-white/[0.08] disabled:text-white/30">{selectedImages.length ? 'Continue' : 'Select'} <ChevronRight size={15}/></button>
                        </div>
                      </footer>
                    </section>
                  )}
                  {activeMode === 'video' && (
                    <div className="border border-[#292244] border-dashed rounded-2xl p-6 text-center space-y-4 bg-[#120E2B]/45">
                      <Video className="w-8 h-8 text-[#8E88A7] mx-auto animate-pulse" />
                      <div className="space-y-1">
                        <p className="text-xs text-[#D1CBE3] font-bold">Choose a video</p>
                        <p className="text-[10px] text-[#8E88A7]">Choose a video from your phone. Videos can be up to 20 minutes and 250 MB.</p>
                      </div>
                      <label className="px-4 py-2 bg-[#120E2B] hover:bg-[#19143A] border border-[#292244] text-white rounded-xl text-xs font-mono font-bold cursor-pointer transition-all inline-block">
                        Choose from gallery
                        <input type="file" accept="video/*" capture={undefined} className="hidden" onChange={handleVideoUpload} />
                      </label>
                      {(videoFileUrl || recordedVideoUrl) && (
                        <div className="max-w-sm mx-auto p-3 bg-[#120E2B] border border-[#292244] rounded-xl space-y-3 text-left">
                          <p className="text-[10px] text-emerald-300 font-semibold">✓ Video ready · {Math.round(videoDuration)} seconds</p>
                          <video ref={trimVideoRef} src={videoFileUrl || recordedVideoUrl || undefined} controls playsInline preload="metadata" onLoadedMetadata={event => { const duration = Number.isFinite(event.currentTarget.duration) ? event.currentTarget.duration : videoDuration; setVideoDuration(duration); setVideoTrimEnd(previous => Math.min(previous, duration)); }} className="w-full rounded-lg bg-black" />
                           {videoRawBlob && onOpenStudio && <button type="button" onClick={openVideoInStudio} className="w-full rounded-lg border border-violet-400/40 bg-violet-500/10 px-3 py-2.5 text-xs font-semibold text-violet-100 hover:bg-violet-500/20">Edit video</button>}
                          <div className="space-y-2">
                            <div className="flex justify-between text-[10px] text-[#A39BBF]"><label htmlFor="video-trim-start">Start · {videoTrimStart.toFixed(1)}s</label><span>End · {videoTrimEnd.toFixed(1)}s</span></div>
                            <input id="video-trim-start" aria-label="Video trim start" type="range" min="0" max={Math.max(0, videoDuration - 1)} step="0.1" value={Math.min(videoTrimStart, Math.max(0, videoDuration - 1))} onChange={event => { const value = Number(event.target.value); setVideoTrimStart(value); if (value >= videoTrimEnd) setVideoTrimEnd(Math.min(videoDuration, value + 1)); }} className="w-full accent-violet-500" />
                            <input aria-label="Video trim end" type="range" min={Math.min(videoDuration, videoTrimStart + 1)} max={videoDuration} step="0.1" value={Math.max(videoTrimStart + 1, Math.min(videoTrimEnd, videoDuration))} onChange={event => setVideoTrimEnd(Number(event.target.value))} className="w-full accent-violet-500" />
                            <p className="text-[10px] text-[#8E88A7]">The selected section is re-encoded in your browser. Audio is retained when media capture is supported.</p>
                            <button type="button" onClick={applyVideoTrim} disabled={isTrimmingVideo || videoTrimEnd <= videoTrimStart} className="w-full rounded-lg bg-violet-600/20 border border-violet-500/30 px-3 py-2 text-xs font-bold text-violet-200 disabled:opacity-50">{isTrimmingVideo ? 'Trimming video…' : 'Apply trim'}</button>
                          </div>
                          <div className="space-y-2 border-t border-[#292244] pt-3">
                            <p className="text-[10px] font-semibold text-white">Choose your cover</p>
                            <input aria-label="Cover frame time" type="range" min="0" max={Math.max(0, videoDuration - 0.1)} step="0.1" value={Math.min(videoCoverTime, Math.max(0, videoDuration - 0.1))} onChange={event => { const value = Number(event.target.value); setVideoCoverTime(value); if (trimVideoRef.current) trimVideoRef.current.currentTime = value; }} className="w-full accent-violet-500" />
                            <button type="button" onClick={captureVideoCover} className="w-full rounded-lg border border-[#44376F] px-3 py-2 text-xs font-semibold text-[#D1CBE3]">Use this frame as cover</button>
                            {videoCoverBlob && <p className="text-[10px] text-emerald-300">✓ Custom cover selected</p>}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {activeMode === 'reel' && (
                    <div className="space-y-3">
                      {isLensStudioOpen ? (
                        <div className="space-y-3 rounded-2xl border border-[#44376F] bg-[#090714] p-3">
                          <div className="flex items-center justify-between gap-2">
                            <div><p className="text-sm font-bold text-white">NEXORA Filters & Lenses</p><p className="text-[10px] text-[#A39BBF]">Your lens appears in the finished video.</p></div>
                            <div className="flex gap-2">
                              <button type="button" disabled={isRecording || isSavingRecordedVideo || countdownTimer !== null} onClick={() => setCameraFacing(prev => prev === 'user' ? 'environment' : 'user')} className="rounded-full border border-white/10 bg-[#120E2B] p-2 text-white disabled:opacity-40" aria-label="Switch camera"><RefreshCw className="h-4 w-4" /></button>
                              <button type="button" disabled={isRecording || isSavingRecordedVideo || countdownTimer !== null} onClick={() => setIsLensStudioOpen(false)} className="rounded-full border border-white/10 bg-[#120E2B] px-3 py-2 text-xs font-semibold text-white disabled:opacity-40">{countdownTimer !== null ? 'Starting…' : isRecording || isSavingRecordedVideo ? 'Saving recording…' : 'Close'}</button>
                            </div>
                          </div>
                          <NexoraLensStudio cameraFacing={cameraFacing} userId={currentUser.id} captureMode="video" countdownTimer={countdownTimer}
                            onStreamReady={stream => { videoStreamRef.current = stream; setIsLensStreamReady(Boolean(stream)); }}
                            onCapture={blob => {
                              const url = trackObjectUrl(URL.createObjectURL(blob));
                              setSelectedImages(previous => [...previous, { url, rotation: 0, zoom: 1, cropOffset: { x: 0, y: 0 } }]);
                              setIsLensStudioOpen(false);
                              setActiveMode('photo');
                              window.dispatchEvent(new CustomEvent('toast', { detail: 'Your filtered NEXORA photo is ready to share.' }));
                            }}
                          />
                          <div className="flex flex-col items-center gap-2 pt-1">
                            <label className="flex items-center gap-2 rounded-full border border-white/15 bg-black/65 px-3 py-1.5 text-[10px] font-semibold text-white">
                              Video length
                              <select aria-label="Filtered video recording length" value={recordingLimitSecs} disabled={isRecording || isSavingRecordedVideo || countdownTimer !== null} onChange={event => setRecordingLimitSecs(Number(event.target.value))} className="bg-transparent text-white outline-none">
                                {RECORDING_DURATIONS.map(duration => <option key={duration.seconds} value={duration.seconds} className="bg-[#120E2B]">{duration.label}</option>)}
                              </select>
                            </label>
                            {isRecording ? <button onClick={handleStopReelRecord} className="h-12 rounded-full bg-rose-600 px-6 text-xs font-bold text-white shadow-lg">Stop recording</button> : <button onClick={startReelRecording} disabled={!isLensStreamReady || isSavingRecordedVideo || countdownTimer !== null} className="h-12 rounded-full bg-gradient-to-r from-[#8A3FFC] to-[#1600A3] px-6 text-xs font-bold text-white shadow-lg disabled:opacity-40">Record with lens</button>}
                            {isRecording && <span className="rounded-full bg-black/60 px-3 py-1 text-[10px] text-white">Recording: {Math.floor(loopTimerSecs / 60)}:{String(loopTimerSecs % 60).padStart(2, '0')}</span>}
                          </div>
                        </div>
                      ) : (
                        <div className="fixed inset-0 z-[131] flex h-[100dvh] w-screen flex-col justify-between overflow-hidden bg-black px-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-[max(1.25rem,env(safe-area-inset-top))]">
                          <div className="z-20 flex w-full items-center justify-start">
                            <div className="flex w-full items-center justify-between"><button type="button" aria-label="Back to creation options" disabled={isRecording || isSavingRecordedVideo || countdownTimer !== null} onClick={() => setCurrentStep(1)} className="nx-camera-glass-control flex h-10 w-10 items-center justify-center rounded-full text-white disabled:opacity-40"><ChevronLeft size={20}/></button><span className="nx-camera-mode-label rounded-full px-3 py-1.5 text-[10px] font-semibold tracking-[0.18em] text-white">VIDEO</span><span className="w-10"/></div>
                          </div>
                          <div className="absolute inset-0 z-0 flex items-center justify-center">
                            <video ref={videoPreviewRef} autoPlay muted playsInline onLoadedMetadata={() => setVideoCameraReady(true)} onCanPlay={() => setVideoCameraReady(true)} className={"absolute inset-0 h-full w-full bg-black object-cover " + (recordedVideoUrl ? "invisible" : "")} aria-label="Live video camera preview" />
                            {recordedVideoUrl && <video src={recordedVideoUrl} autoPlay loop muted playsInline className="absolute inset-0 h-full w-full object-cover" aria-label="Recorded video preview" />}
                            {countdownTimer !== null && <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/15"><span className="text-6xl font-black text-white drop-shadow-lg">{countdownTimer}</span></div>}
                            {!videoCameraReady && !recordedVideoUrl && countdownTimer === null && (
                              <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-black/40 px-8 text-center">
                                <span className="h-8 w-8 animate-spin rounded-full border-2 border-white/25 border-t-violet-300" />
                                <p className="text-xs font-semibold text-white">{permissionState === 'denied' ? 'Camera access is off' : 'Starting your camera…'}</p>
                                <button type="button" onClick={() => { setPermissionState('prompt'); setPermissionTarget('camera'); }} className="rounded-full border border-white/20 bg-black/60 px-4 py-2 text-xs font-semibold text-white">{permissionState === 'denied' ? 'Enable camera' : 'Retry camera'}</button>
                              </div>
                            )}
                          </div>
                          <div className="z-20 flex flex-col items-center gap-3">
                            <div className="nx-camera-duration-dock flex w-full max-w-full items-center justify-center gap-1.5 overflow-x-auto rounded-full p-1.5">
                              {RECORDING_DURATIONS.filter(duration => [15, 30, 60, 180, 600, 1200].includes(duration.seconds)).map(duration => (
                                <button key={duration.seconds} type="button" aria-pressed={recordingLimitSecs === duration.seconds} disabled={isRecording || isSavingRecordedVideo || countdownTimer !== null} onClick={() => setRecordingLimitSecs(duration.seconds)} className={`shrink-0 rounded-full px-3 py-2 text-[10px] font-bold transition-colors disabled:opacity-50 ${recordingLimitSecs === duration.seconds ? 'bg-white text-[#11131A]' : 'text-white/75 hover:bg-white/10'}`}>{duration.label}</button>
                              ))}
                            </div>
                            <div className="nx-camera-control-dock flex w-full items-center justify-center gap-7 rounded-[28px] px-5 py-3">
                              <button type="button" aria-label="Choose a video from gallery" disabled={isRecording || isSavingRecordedVideo || countdownTimer !== null} onClick={() => { setActiveMode(nativeGalleryEnabled ? 'carousel' : 'video'); setGalleryTab('videos'); setIsLensStudioOpen(false); }} className="nx-camera-side-control flex h-12 w-12 items-center justify-center rounded-2xl text-white disabled:opacity-40"><FileImage size={19}/></button>
                              {isRecording ? <button onClick={handleStopReelRecord} aria-label="Stop recording" className="nx-camera-record-shutter flex h-[76px] w-[76px] items-center justify-center rounded-full border-[4px] border-white"><span className="h-7 w-7 rounded-md bg-white"/></button>  : <button onClick={startReelRecording} disabled={!videoCameraReady || isSavingRecordedVideo || countdownTimer !== null || Boolean(recordedVideoUrl)} aria-label="Start recording" className="nx-camera-record-shutter flex h-[76px] w-[76px] items-center justify-center rounded-full border-[4px] border-white disabled:opacity-45"><span className="h-[60px] w-[60px] rounded-full border border-white/70"/></button>}
                              <button type="button" aria-label="Switch camera" disabled={isRecording || isSavingRecordedVideo || countdownTimer !== null || Boolean(recordedVideoUrl)} onClick={() => setCameraFacing(prev => prev === 'user' ? 'environment' : 'user')} className="nx-camera-side-control flex h-12 w-12 items-center justify-center rounded-2xl text-white disabled:opacity-40"><RefreshCw size={20}/></button>
                            </div>
                            {isRecording && <span className="nx-camera-recording-indicator rounded-full px-3 py-1.5 text-[10px] font-semibold tabular-nums text-white" role="status" aria-live="off"><span className="mr-2 inline-block h-1.5 w-1.5 rounded-full bg-red-500"/>REC {Math.floor(loopTimerSecs / 60)}:{String(loopTimerSecs % 60).padStart(2, '0')} <span className="text-white/55">/ {Math.floor(recordingLimitSecs / 60)}:{String(recordingLimitSecs % 60).padStart(2, '0')}</span></span>}
                            {!isRecording && recordedVideoUrl && <div className="flex flex-wrap items-center justify-center gap-2"><span className="rounded-full bg-black/60 px-3 py-1 text-[10px] text-white">Video ready</span><button type="button" onClick={() => { revokeTrackedObjectUrl(recordedVideoUrl); setRecordedVideoUrl(null); setVideoRawBlob(null); setLoopTimerSecs(0); }} className="rounded-full border border-white/20 bg-black/55 px-3 py-2 text-[10px] font-semibold text-white">Retake</button><button type="button" onClick={nextStep} className="nx-camera-use-button rounded-full px-4 py-2.5 text-[10px] font-semibold text-white">Use video</button>{videoRawBlob && onOpenStudio && <button type="button" onClick={openVideoInStudio} className="rounded-full border border-violet-300/40 bg-violet-500/20 px-3 py-2.5 text-[10px] font-semibold text-violet-100">Edit in Studio</button>}</div>}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {activeMode === 'voice' && (
                    <div className="p-5 bg-[#070511] border border-[#292244] rounded-2xl text-center space-y-4">
                      <div className="space-y-1">
                        <span className="text-3xl font-mono font-bold text-white block">0:{voiceDurationSecs.toString().padStart(2, '0')}</span>
                        <span className="text-[9.5px] font-mono text-[#8E88A7] block uppercase">Voice note</span>
                      </div>

                      {/* Waveform simulator */}
                      <div className="flex items-end justify-center gap-1 h-12 max-w-xs mx-auto">
                        {[...Array(18)].map((_, idx) => (
                          <div 
                            key={idx}
                            className={`w-[3px] rounded-full transition-all duration-300 ${voiceIsRecording ? 'bg-violet-500' : 'bg-[#19143A]'}`}
                            style={{ height: voiceIsRecording ? `${20 + Math.sin(idx + voiceDurationSecs) * 60}%` : '15%' }}
                          />
                        ))}
                      </div>

                      <div className="flex justify-center items-center gap-3">
                        {voiceIsRecording ? (
                          <button onClick={stopVoiceRecording} className="px-5 py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl text-xs font-mono">
                            🛑 Stop recording
                          </button>
                        ) : (
                          <button onClick={startVoiceRecording} className="px-6 py-3 bg-linear-to-tr from-[#7138FF] to-[#3B16B8] text-white font-black rounded-xl text-xs font-mono animate-pulse">
                            🎙️ Start recording
                          </button>
                        )}
                      </div>

                      {voiceTranscript && (
                        <div className="text-left bg-[#120E2B] border border-[#292244] p-3.5 rounded-xl space-y-1">
                          <span className="text-[8px] font-mono text-violet-400 uppercase font-black">Voice transcript</span>
                          <p className="text-xs text-[#D1CBE3] font-sans italic">"{voiceTranscript}"</p>
                        </div>
                      )}
                    </div>
                  )}

                  {activeMode === 'poll' && (
                    <div className="p-4 bg-[#070511] border border-[#292244] rounded-2xl space-y-3">
                      <div className="space-y-1">
                        <label className="text-[10px] font-mono text-[#8E88A7] uppercase block">Your question</label>
                        <input 
                          type="text" 
                          placeholder="What would you like to ask?"
                          value={pollQuestion}
                          onChange={(e) => setPollQuestion(e.target.value)}
                          className="w-full bg-[#120E2B] border border-[#292244] rounded-xl px-3 py-2 text-xs text-white font-sans"
                        />
                      </div>
                      <div className="space-y-2">
                        {pollOptionsList.map((opt, i) => (
                          <div key={i} className="flex gap-2 items-center">
                            <span className="text-[10px] font-mono text-[#756D91] w-3">{i+1}</span>
                            <input 
                              type="text"
                              placeholder={`Option ${i+1}`}
                              value={opt}
                              onChange={(e) => { const next = [...pollOptionsList]; next[i] = e.target.value; setPollOptionsList(next); }}
                              className="flex-1 bg-[#120E2B] border border-[#292244] rounded-xl px-3.5 py-1.5 text-xs text-white"
                            />
                            {pollOptionsList.length > 2 && (
                              <button onClick={() => setPollOptionsList(prev => prev.filter((_, idx) => idx !== i))} className="text-rose-400"><X className="w-4 h-4" /></button>
                            )}
                          </div>
                        ))}
                        {pollOptionsList.length < 5 && (
                          <button onClick={() => setPollOptionsList(prev => [...prev, ''])} className="text-[10px] font-mono text-violet-400 hover:underline">
                            + Add another option
                          </button>
                        )}
                      </div>
                    </div>
                  )}

                </div>
              )}

              {currentStep === 3 && (
                <section className="flex h-full min-h-0 flex-col gap-3 animate-fadeIn" aria-label="NEXORA editing workspace">
                  <header className="flex shrink-0 items-center justify-between gap-3">
                    <button type="button" onClick={prevStep} className="inline-flex h-9 items-center gap-1 rounded-xl border border-white/10 bg-white/[0.04] px-3 text-xs font-semibold text-[#D8D0EB] hover:bg-white/[0.08]"><ChevronLeft size={15}/> Back</button>
                    <div className="min-w-0 text-center">
                      <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-violet-300">NEXORA STUDIO</p>
                      <h3 className="text-sm font-black text-white">Edit your creation</h3>
                      <p className="text-[9px] text-[#8E88A7]">{selectedImages.length ? `Photo ${Math.min((activeEditIndex ?? 0) + 1, selectedImages.length)} of ${selectedImages.length}` : videoFileUrl || recordedVideoUrl ? 'Video workspace' : 'Post preview'}</p>
                    </div>
                    <div className="flex shrink-0 items-center gap-1.5">
                      <button type="button" onClick={saveAsDraftLocally} className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-violet-400/25 bg-violet-500/10 px-3 text-[10px] font-bold text-violet-200 hover:bg-violet-500/15"><Save size={13}/> Save</button>
                      <button type="button" aria-label="Close editor" onClick={handleExitClick} className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-[#AFA6C3] hover:bg-white/[0.08] hover:text-white"><X size={15}/></button>
                    </div>
                  </header>

                  <div className="flex min-h-0 flex-1 flex-col gap-3 lg:flex-row">
                    <div className="flex min-h-[30vh] flex-1 flex-col items-center justify-center overflow-hidden rounded-[22px] border border-[#292244] bg-[radial-gradient(ellipse_at_top,rgba(113,56,255,0.13),transparent_58%),#03040A] p-3">
                      <div className="relative flex min-h-0 w-full flex-1 items-center justify-center overflow-hidden">
                        {selectedImages.length > 0 ? (
                          <div
                            className="relative flex max-h-full max-w-full items-center justify-center overflow-hidden"
                            style={{
                              aspectRatio: selectedImages[Math.min(activeEditIndex ?? 0, selectedImages.length - 1)]?.aspectRatio ? String(selectedImages[Math.min(activeEditIndex ?? 0, selectedImages.length - 1)]?.aspectRatio) : undefined,
                              width: selectedImages[Math.min(activeEditIndex ?? 0, selectedImages.length - 1)]?.aspectRatio ? 'min(100%, 52vh)' : '100%',
                              height: selectedImages[Math.min(activeEditIndex ?? 0, selectedImages.length - 1)]?.aspectRatio ? 'auto' : '100%',
                            }}
                          >
                            <img
                              src={selectedImages[Math.min(activeEditIndex ?? 0, selectedImages.length - 1)]?.url}
                              alt={selectedImages[Math.min(activeEditIndex ?? 0, selectedImages.length - 1)]?.fileName || 'Photo being edited'}
                              className="h-full w-full transition-[filter,transform] duration-200"
                              style={{
                                objectFit: selectedImages[Math.min(activeEditIndex ?? 0, selectedImages.length - 1)]?.aspectRatio ? 'cover' : 'contain',
                                objectPosition: `${50 + (selectedImages[Math.min(activeEditIndex ?? 0, selectedImages.length - 1)]?.cropOffset?.x || 0) / 2}% ${50 + (selectedImages[Math.min(activeEditIndex ?? 0, selectedImages.length - 1)]?.cropOffset?.y || 0) / 2}%`,
                                filter: `${selectedImages[Math.min(activeEditIndex ?? 0, selectedImages.length - 1)]?.filterStyle || 'none'} brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%) blur(${blur}px)`,
                                transform: `rotate(${selectedImages[Math.min(activeEditIndex ?? 0, selectedImages.length - 1)]?.rotation || 0}deg) scale(${selectedImages[Math.min(activeEditIndex ?? 0, selectedImages.length - 1)]?.zoom || 1})`
                              }}
                            />
                            {stickerOverlay && <span className="pointer-events-none absolute inset-0 flex items-center justify-center text-5xl">{stickerOverlay}</span>}
                            {textOverlay.trim() && <p className="pointer-events-none absolute inset-x-4 bottom-5 rounded-xl bg-black/65 px-3 py-2 text-center text-sm font-black backdrop-blur-sm" style={{color:textOverlayColor}}>{textOverlay}</p>}
                          </div>
                        ) : (videoFileUrl || recordedVideoUrl) ? (
                          <video src={videoFileUrl || recordedVideoUrl || undefined} controls playsInline preload="metadata" className="max-h-full max-w-full rounded-xl bg-black object-contain"/>
                        ) : (
                          <div className="max-w-xs text-center text-[#8E88A7]"><Sliders size={28} className="mx-auto mb-3 text-violet-300"/><p className="text-sm font-bold text-white">Your preview</p><p className="mt-1 text-xs">Your selected content will appear here as you edit.</p></div>
                        )}
                      </div>
                      <div className="mt-2 flex shrink-0 items-center justify-between gap-3 self-stretch">
                        <span className="truncate text-[9px] text-[#827B9C]">{selectedImages.length ? 'Changes apply to the selected photo.' : 'Preview your media before moving on.'}</span>
                        {selectedImages.length > 0 && <button type="button" onClick={() => setIsMediaPreviewExpanded(true)} className="shrink-0 rounded-lg border border-white/10 px-2.5 py-1.5 text-[9px] font-bold text-[#D5D0E0]">Full screen</button>}
                        {(videoFileUrl || recordedVideoUrl) && <button type="button" onClick={() => setIsMediaPreviewExpanded(true)} className="shrink-0 rounded-lg border border-white/10 px-2.5 py-1.5 text-[9px] font-bold text-[#D5D0E0]">Full screen</button>}
                        {selectedImages.length > 1 && <span className="shrink-0 text-[9px] font-semibold text-violet-200">{selectedImages.length} images</span>}
                        {(videoFileUrl || recordedVideoUrl) && onOpenStudio && <button type="button" onClick={openVideoInStudio} className="shrink-0 rounded-lg border border-violet-400/30 bg-violet-500/10 px-2.5 py-1.5 text-[9px] font-bold text-violet-200">Open full Studio</button>}
                      </div>
                    </div>

                    <aside className="flex min-h-0 w-full shrink-0 flex-col overflow-hidden rounded-[22px] border border-[#292244] bg-[#0B0918] lg:w-[min(390px,42%)]">
                      {selectedImages.length > 1 && (
                        <div className="shrink-0 border-b border-white/[0.07] px-3 py-2.5">
                          <div className="mb-2 flex items-center justify-between"><span className="text-[10px] font-bold text-white">Your sequence</span><span className="text-[9px] text-[#827B9C]">Tap to edit</span></div>
                          <div className="flex gap-2 overflow-x-auto pb-1">
                            {selectedImages.map((image, index) => (
                              <button key={`${image.fileName || 'image'}-${index}`} type="button" onClick={() => setActiveEditIndex(index)} aria-pressed={(activeEditIndex ?? 0) === index} className={`relative h-14 w-12 shrink-0 overflow-hidden rounded-lg border ${(activeEditIndex ?? 0) === index ? 'border-violet-300 ring-2 ring-violet-500/50' : 'border-white/10'}`}>
                                <img src={image.url} alt={image.fileName || `Photo ${index + 1}`} className="h-full w-full object-cover"/>
                                <span className="absolute bottom-0.5 left-0.5 rounded bg-black/75 px-1 text-[8px] font-bold text-white">{index + 1}</span>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {selectedImages.length > 0 && (
                        <div className="grid shrink-0 grid-cols-4 gap-1 border-b border-white/[0.07] p-2">
                          {([
                            {id:'looks',label:'Looks'},
                            {id:'adjust',label:'Adjust'},
                            {id:'crop',label:'Crop'},
                            {id:'text',label:'Text'}
                          ] as const).map(tab => (
                            <button key={tab.id} type="button" onClick={() => setEditorToolTab(tab.id)} aria-pressed={editorToolTab === tab.id} className={`rounded-lg px-2 py-2 text-[10px] font-bold transition-colors ${editorToolTab === tab.id ? 'bg-[#7138FF] text-white shadow-lg' : 'text-[#9A92AF] hover:bg-white/[0.05] hover:text-white'}`}>{tab.label}</button>
                          ))}
                        </div>
                      )}

                      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-3">
                        {selectedImages.length > 0 ? (
                          <>
                            {editorToolTab === 'looks' && (
                              <div className="space-y-3">
                                <div><h4 className="text-xs font-extrabold text-white">NEXORA looks</h4><p className="mt-1 text-[10px] text-[#8E88A7]">Choose a visual style for this photo.</p></div>
                                <div className="grid grid-cols-2 gap-2">
                                  {FILTER_PRESETS.map(preset => (
                                    <button key={preset.name} type="button" onClick={() => setSelectedImages(previous => previous.map((image,index) => index === (activeEditIndex ?? 0) ? {...image,filterName:preset.name,filterStyle:preset.style} : image))} aria-pressed={(selectedImages[activeEditIndex ?? 0]?.filterName || 'Original') === preset.name} className={`overflow-hidden rounded-xl border text-left text-[10px] font-bold transition-colors ${(selectedImages[activeEditIndex ?? 0]?.filterName || 'Original') === preset.name ? 'border-violet-400/60 bg-violet-500/15 text-violet-100 ring-1 ring-violet-400/30' : 'border-white/10 bg-white/[0.025] text-[#B8B0C9] hover:border-violet-400/30'}`}>
                                      <img src={selectedImages[activeEditIndex ?? 0]?.url} alt="" aria-hidden="true" className="h-16 w-full bg-black object-cover" style={{filter:preset.style || 'none'}}/>
                                      <span className="block px-2.5 py-2">{preset.name}</span>
                                    </button>
                                  ))}
                                </div>
                              </div>
                            )}
                            {editorToolTab === 'adjust' && (
                              <div className="space-y-4">
                                <div><h4 className="text-xs font-extrabold text-white">Fine adjustments</h4><p className="mt-1 text-[10px] text-[#8E88A7]">Tune light, depth and colour.</p></div>
                                {([{label:'Brightness',value:brightness,set:setBrightness,min:50,max:150},{label:'Contrast',value:contrast,set:setContrast,min:50,max:150},{label:'Saturation',value:saturation,set:setSaturation,min:50,max:150},{label:'Blur',value:blur,set:setBlur,min:0,max:12}] as const).map(control => (
                                  <label key={control.label} className="block space-y-2">
                                    <span className="flex items-center justify-between text-[10px] font-semibold text-[#BDB5CE]"><span>{control.label}</span><span className="tabular-nums text-violet-200">{control.value}{control.label === 'Blur' ? 'px' : '%'}</span></span>
                                    <input type="range" min={control.min} max={control.max} value={control.value} onChange={event => control.set(Number(event.target.value))} className="w-full accent-violet-500"/>
                                  </label>
                                ))}
                                <button type="button" onClick={() => {setBrightness(100);setContrast(100);setSaturation(100);setBlur(0);}} className="rounded-lg border border-white/10 px-3 py-2 text-[10px] font-bold text-[#B8B0C9] hover:text-white">Reset adjustments</button>
                              </div>
                            )}
                            {editorToolTab === 'crop' && (
                              <div className="space-y-4">
                                <div><h4 className="text-xs font-extrabold text-white">Frame and crop</h4><p className="mt-1 text-[10px] text-[#8E88A7]">Choose a frame, reposition the image, and rotate. Your original stays untouched.</p></div>
                                <div className="grid grid-cols-3 gap-1.5">
                                  {([{label:'Original',value:null},{label:'1:1',value:1},{label:'4:5',value:0.8},{label:'3:4',value:0.75},{label:'16:9',value:16/9},{label:'9:16',value:9/16}] as const).map(option => <button key={option.label} type="button" onClick={() => setSelectedImages(previous => previous.map((image,index) => index === (activeEditIndex ?? 0) ? {...image,aspectRatio:option.value,cropOffset:{x:0,y:0}} : image))} aria-pressed={(selectedImages[activeEditIndex ?? 0]?.aspectRatio ?? null) === option.value} className={(selectedImages[activeEditIndex ?? 0]?.aspectRatio ?? null) === option.value ? 'rounded-lg border border-violet-400/60 bg-violet-500/15 px-2 py-2 text-[10px] font-bold text-white' : 'rounded-lg border border-white/10 bg-white/[0.025] px-2 py-2 text-[10px] font-semibold text-[#B8B0C9]'}>{option.label}</button>)}
                                </div>
                                <button type="button" onClick={() => setSelectedImages(previous => previous.map((image,index) => index === (activeEditIndex ?? 0) ? {...image,rotation:(image.rotation + 90) % 360} : image))} className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-3 text-xs font-bold text-white"><RotateCw size={15}/> Rotate 90°</button>
                                <label className="block space-y-2"><span className="flex items-center justify-between text-[10px] font-semibold text-[#BDB5CE]"><span>Scale</span><span className="tabular-nums text-violet-200">{(selectedImages[activeEditIndex ?? 0]?.zoom || 1).toFixed(2)}×</span></span><input type="range" min="1" max="2.5" step="0.05" value={selectedImages[activeEditIndex ?? 0]?.zoom || 1} onChange={event => setSelectedImages(previous => previous.map((image,index) => index === (activeEditIndex ?? 0) ? {...image,zoom:Number(event.target.value)} : image))} className="w-full accent-violet-500"/></label>
                                {(['x','y'] as const).map(axis => <label key={axis} className="block space-y-2"><span className="flex items-center justify-between text-[10px] font-semibold text-[#BDB5CE]"><span>{axis === 'x' ? 'Horizontal position' : 'Vertical position'}</span><span className="tabular-nums text-violet-200">{selectedImages[activeEditIndex ?? 0]?.cropOffset?.[axis] || 0}</span></span><input aria-label={axis === 'x' ? 'Horizontal crop position' : 'Vertical crop position'} type="range" min="-100" max="100" value={selectedImages[activeEditIndex ?? 0]?.cropOffset?.[axis] || 0} onChange={event => setSelectedImages(previous => previous.map((image,index) => index === (activeEditIndex ?? 0) ? {...image,cropOffset:{...image.cropOffset,[axis]:Number(event.target.value)}} : image))} className="w-full accent-violet-500"/></label>)}
                                <button type="button" onClick={() => setSelectedImages(previous => previous.map((image,index) => index === (activeEditIndex ?? 0) ? {...image,rotation:0,zoom:1,cropOffset:{x:0,y:0},aspectRatio:null} : image))} className="rounded-lg border border-white/10 px-3 py-2 text-[10px] font-bold text-[#B8B0C9] hover:text-white">Reset frame</button>
                              </div>
                            )}
                            {editorToolTab === 'text' && (
                              <div className="space-y-4">
                                <div><h4 className="text-xs font-extrabold text-white">Text and stickers</h4><p className="mt-1 text-[10px] text-[#8E88A7]">Add a simple overlay to your image.</p></div>
                                <div className="flex flex-wrap gap-2">
                                  {['🔥','⚡','✨','🏆','👾','🚀','💯'].map(emoji => <button key={emoji} type="button" onClick={() => setStickerOverlay(stickerOverlay === emoji ? null : emoji)} aria-pressed={stickerOverlay === emoji} className={`rounded-lg border px-3 py-2 text-lg ${stickerOverlay === emoji ? 'border-violet-400/50 bg-violet-500/15' : 'border-white/10 bg-white/[0.03]'}`}>{emoji}</button>)}
                                </div>
                                <label className="block space-y-2"><span className="text-[10px] font-semibold text-[#BDB5CE]">Overlay text</span><input type="text" maxLength={80} value={textOverlay} onChange={event => setTextOverlay(event.target.value)} placeholder="Write something…" className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-3 text-xs text-white placeholder:text-[#6E6682]"/></label>
                                <div className="flex items-center justify-between gap-3"><span className="text-[10px] text-[#9A92AF]">Text colour</span><input aria-label="Overlay text colour" type="color" value={textOverlayColor} onChange={event => setTextOverlayColor(event.target.value)} className="h-8 w-12 cursor-pointer rounded border-0 bg-transparent"/></div>
                                {(stickerOverlay || textOverlay) && <button type="button" onClick={() => {setStickerOverlay(null);setTextOverlay('');}} className="rounded-lg border border-white/10 px-3 py-2 text-[10px] font-bold text-[#B8B0C9] hover:text-white">Clear overlays</button>}
                              </div>
                            )}
                          </>
                        ) : (videoFileUrl || recordedVideoUrl) ? (
                          <div className="space-y-3">
                            <h4 className="text-xs font-extrabold text-white">Build the full edit</h4>
                            <p className="text-[10px] leading-relaxed text-[#A59DBB]">Go beyond quick adjustments. NEXORA Studio opens over this step, so you can return here without losing your Create flow.</p>
                            <div className="grid grid-cols-2 gap-2">
                              {['Multi-clip timeline','Trim, split & reorder','Reverse clip effects','Music & voiceover tracks','Transitions & visual looks','Animated text & stickers','Timed subtitles','Layer motion keyframes'].map(item => <div key={item} className="rounded-lg border border-white/[0.07] bg-white/[0.025] px-2.5 py-2 text-[9px] font-semibold text-[#C7BEDB]"><span className="mr-1.5 text-violet-300">✦</span>{item}</div>)}
                            </div>
                            <p className="text-[9px] leading-relaxed text-[#827B9C]">Import an audio file you have rights to use, including Brazilian funk and other styles. NEXORA does not present unlicensed sample tracks as a music catalogue.</p>
                            {onOpenStudio && <button type="button" onClick={openVideoInStudio} className="w-full rounded-xl bg-gradient-to-r from-[#8A3FFC] to-[#4B10F2] px-4 py-3 text-xs font-extrabold text-white"><Clapperboard size={14} className="mr-2 inline"/> Enter full editing studio</button>}
                            <p className="text-[9px] text-[#756D8A]">Your original source stays intact until you export the finished edit.</p>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            <h4 className="text-xs font-extrabold text-white">Ready to shape your post</h4>
                            <p className="text-[10px] leading-relaxed text-[#8E88A7]">There are no media adjustments for this format. Continue to add your caption and publishing details.</p>
                          </div>
                        )}
                      </div>
                    </aside>
                  </div>

                  <footer className="flex shrink-0 items-center justify-between gap-3 border-t border-white/[0.08] pt-3">
                    <div className="min-w-0"><p className="text-[10px] font-bold text-white">{selectedImages.length ? 'Photo edits are ready' : videoFileUrl || recordedVideoUrl ? 'Video ready for Studio' : 'Preview your post'}</p><p className="mt-0.5 text-[9px] text-[#827B9C]">You can refine this later before publishing.</p></div>
                    <button type="button" onClick={nextStep} className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-gradient-to-r from-[#8A3FFC] to-[#4B10F2] px-5 py-3 text-xs font-extrabold text-white shadow-lg">Continue <ChevronRight size={15}/></button>
                  </footer>
                </section>
              )}

              
              {currentStep === 4 && (
                <section className="flex min-h-[520px] flex-col gap-4 animate-fadeIn">
                  <header><span className="text-[10px] font-mono uppercase tracking-[0.18em] text-violet-300">NEXORA CREATIVE TOOLS</span><h3 className="mt-1 text-lg font-black text-white">Give your creation its signature.</h3><p className="mt-1 text-[10px] text-[#8E88A7]">A focused home for visual treatments, overlays and sound.</p></header>
                  <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
                    {([{id:'looks',label:'Looks',mark:'◈'},{id:'effects',label:'Effects',mark:'✧'},{id:'text',label:'Text',mark:'T'},{id:'stickers',label:'Stickers',mark:'☺'},{id:'audio',label:'Audio',mark:'♫'},{id:'presets',label:'Presets',mark:'✦'}] as const).map(tool => <button key={tool.id} type="button" onClick={() => setCreativeToolTab(tool.id)} aria-pressed={creativeToolTab === tool.id} className={creativeToolTab === tool.id ? 'flex min-h-[66px] flex-col items-center justify-center gap-1.5 rounded-xl border border-violet-400/60 bg-violet-500/15 px-2 py-2 text-white' : 'flex min-h-[66px] flex-col items-center justify-center gap-1.5 rounded-xl border border-[#292244] bg-[#0C0A19] px-2 py-2 text-[#A39BBF]'}><span className="text-lg font-black text-violet-200">{tool.mark}</span><span className="text-[10px] font-bold">{tool.label}</span></button>)}
                  </div>
                  <div className="grid min-h-0 flex-1 gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(280px,0.85fr)]">
                    <div className="relative flex min-h-[260px] flex-col items-center justify-center gap-3 overflow-hidden rounded-2xl border border-[#292244] bg-[radial-gradient(ellipse_at_top,rgba(113,56,255,0.15),transparent_60%),#03040A] p-3">
                      {selectedImages.length > 0 && <button type="button" onClick={() => setIsComparingOriginal(value => !value)} aria-pressed={isComparingOriginal} className="absolute right-3 top-3 z-10 rounded-full border border-white/15 bg-black/70 px-3 py-1.5 text-[9px] font-bold text-white backdrop-blur">{isComparingOriginal ? 'Show edits' : 'Compare original'}</button>}
                      {selectedImages.length ? <div className="relative flex min-h-[190px] flex-1 items-center justify-center"><img src={selectedImages[Math.min(activeEditIndex ?? 0, selectedImages.length - 1)]?.url} alt="Creative tools preview" className="max-h-[300px] max-w-full rounded-lg object-contain" style={{filter:isComparingOriginal ? 'none' : (selectedImages[Math.min(activeEditIndex ?? 0, selectedImages.length - 1)]?.filterStyle || 'none') + ' brightness(' + brightness + '%) contrast(' + contrast + '%) saturate(' + saturation + '%) blur(' + blur + 'px)',transform:isComparingOriginal ? 'none' : 'rotate(' + (selectedImages[Math.min(activeEditIndex ?? 0, selectedImages.length - 1)]?.rotation || 0) + 'deg) scale(' + (selectedImages[Math.min(activeEditIndex ?? 0, selectedImages.length - 1)]?.zoom || 1) + ')'}} />
                        {!isComparingOriginal && stickerOverlay && <span className="pointer-events-none absolute inset-0 flex items-center justify-center text-5xl">{stickerOverlay}</span>}
                        {!isComparingOriginal && textOverlay.trim() && <span className="pointer-events-none absolute bottom-2 inset-x-3 rounded-lg bg-black/70 px-2 py-2 text-center text-xs font-bold" style={{color:textOverlayColor}}>{textOverlay}</span>}
                      </div> : (videoFileUrl || recordedVideoUrl) ? <video src={videoFileUrl || recordedVideoUrl || undefined} controls playsInline preload="metadata" className="max-h-[300px] max-w-full rounded-lg object-contain"/> : <div className="text-center text-xs text-[#8E88A7]">Your creative preview will appear here.</div>}
                      {selectedImages.length > 1 && <div className="flex w-full gap-2 overflow-x-auto border-t border-white/10 pt-2">{selectedImages.map((image,index) => <button key={`${image.fileName || 'creative-photo'}-${index}`} type="button" onClick={() => {setActiveEditIndex(index);setIsComparingOriginal(false);}} aria-pressed={(activeEditIndex ?? 0) === index} className={'relative h-12 w-10 shrink-0 overflow-hidden rounded-lg border ' + ((activeEditIndex ?? 0) === index ? 'border-violet-300 ring-2 ring-violet-500/40' : 'border-white/10')}><img src={image.url} alt={`Select photo ${index + 1}`} className="h-full w-full object-cover"/><span className="absolute bottom-0 left-0 right-0 bg-black/70 text-center text-[8px] text-white">{index + 1}</span></button>)}</div>}
                    </div>
                    <div className="min-h-[220px] overflow-y-auto rounded-2xl border border-[#292244] bg-[#0B0918] p-3">
                      {creativeToolTab === 'looks' && <div className="space-y-3"><h4 className="text-xs font-extrabold text-white">NEXORA looks</h4><p className="text-[10px] text-[#8E88A7]">Apply a look to the selected photo. Video looks are available in Studio.</p>{selectedImages.length ? <><div className="grid grid-cols-2 gap-2">{FILTER_PRESETS.map(preset => <button key={preset.name} type="button" onClick={() => {setIsComparingOriginal(false);setSelectedImages(previous => previous.map((image,index) => index === (activeEditIndex ?? 0) ? {...image,filterName:preset.name,filterStyle:preset.style} : image));}} aria-pressed={(selectedImages[activeEditIndex ?? 0]?.filterName || 'Original') === preset.name} className="overflow-hidden rounded-xl border border-white/10 text-left text-[10px] font-bold text-[#B8B0C9]"><img src={selectedImages[activeEditIndex ?? 0]?.url} alt="" className="h-14 w-full object-cover" style={{filter:preset.style || 'none'}}/><span className="block px-2 py-2">{preset.name}</span></button>)}</div><button type="button" disabled={selectedImages.length < 2} onClick={() => setSelectedImages(previous => {const active = previous[Math.min(activeEditIndex ?? 0, previous.length - 1)];return previous.map(image => ({...image,filterName:active?.filterName,filterStyle:active?.filterStyle}));})} className="w-full rounded-xl border border-violet-400/30 bg-violet-500/10 px-3 py-2.5 text-[10px] font-bold text-violet-100 disabled:opacity-40">Sync this look across all {selectedImages.length} photos</button><p className="text-[9px] text-[#827B9C]">Keep a multi-photo post visually consistent with one tap.</p></> : <p className="rounded-xl border border-white/10 p-3 text-[10px] text-[#A39BBF]">Choose a photo to apply NEXORA looks, or open Studio for video-grade looks.</p>}</div>}
                      {creativeToolTab === 'effects' && <div className="space-y-3"><h4 className="text-xs font-extrabold text-white">Fine visual effects</h4><p className="text-[10px] text-[#8E88A7]">Tune light, depth and colour in real time.</p>{([{label:'Brightness',value:brightness,set:setBrightness,min:50,max:150},{label:'Contrast',value:contrast,set:setContrast,min:50,max:150},{label:'Saturation',value:saturation,set:setSaturation,min:50,max:150},{label:'Soft focus',value:blur,set:setBlur,min:0,max:12}] as const).map(control => <label key={control.label} className="block space-y-2"><span className="flex justify-between text-[10px] text-[#BDB5CE]"><span>{control.label}</span><span className="tabular-nums text-violet-200">{control.value}{control.label === 'Soft focus' ? 'px' : '%'}</span></span><input type="range" min={control.min} max={control.max} value={control.value} onChange={event => control.set(Number(event.target.value))} disabled={!selectedImages.length} className="w-full accent-violet-500 disabled:opacity-40"/></label>)}<button type="button" onClick={() => {setBrightness(100);setContrast(100);setSaturation(100);setBlur(0);}} className="rounded-lg border border-white/10 px-3 py-2 text-[10px] font-bold text-[#B8B0C9]">Reset effects</button></div>}
                      {creativeToolTab === 'text' && <div className="space-y-3"><h4 className="text-xs font-extrabold text-white">Text overlays</h4><p className="text-[10px] text-[#8E88A7]">Add a message to the media preview.</p><input type="text" maxLength={80} value={textOverlay} onChange={event => setTextOverlay(event.target.value)} placeholder="Write your overlay…" className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-3 text-xs text-white"/><div className="flex items-center justify-between text-[10px] text-[#A39BBF]">Text colour<input aria-label="Creative overlay text colour" type="color" value={textOverlayColor} onChange={event => setTextOverlayColor(event.target.value)} className="h-8 w-12 bg-transparent"/></div><p className="text-[9px] text-[#827B9C]">For animated text, timing and motion, use the full NEXORA Studio timeline.</p></div>}
                      {creativeToolTab === 'stickers' && <div className="space-y-3"><h4 className="text-xs font-extrabold text-white">Stickers and reactions</h4><p className="text-[10px] text-[#8E88A7]">Choose one overlay or tap it again to remove.</p><div className="grid grid-cols-4 gap-2">{['🔥','⚡','✨','🏆','👾','🚀','💯','💜','🎧','🌹','🦋','⭐'].map(emoji => <button key={emoji} type="button" onClick={() => setStickerOverlay(stickerOverlay === emoji ? null : emoji)} aria-pressed={stickerOverlay === emoji} className={stickerOverlay === emoji ? 'rounded-xl border border-violet-400/60 bg-violet-500/15 py-3 text-xl' : 'rounded-xl border border-white/10 bg-white/[0.03] py-3 text-xl'}>{emoji}</button>)}</div><button type="button" onClick={() => setStickerOverlay(null)} className="rounded-lg border border-white/10 px-3 py-2 text-[10px] font-bold text-[#B8B0C9]">Remove sticker</button></div>}
                      {creativeToolTab === 'audio' && <div className="space-y-3"><h4 className="text-xs font-extrabold text-white">Music and sound</h4><p className="text-[10px] leading-relaxed text-[#A39BBF]">Add Brazilian funk, other music styles, sound effects or voiceover using audio you own or are licensed to use.</p>{(videoFileUrl || recordedVideoUrl) && onOpenStudio ? <button type="button" onClick={openVideoInStudio} className="w-full rounded-xl bg-gradient-to-r from-[#8A3FFC] to-[#4B10F2] px-4 py-3 text-xs font-extrabold text-white">Open Studio audio timeline</button> : <p className="rounded-xl border border-white/10 p-3 text-[10px] text-[#8E88A7]">Audio mixing is available for video projects in NEXORA Studio.</p>}</div>}
                      {creativeToolTab === 'presets' && <div className="space-y-3"><h4 className="text-xs font-extrabold text-white">Quick creative recipes</h4><p className="text-[10px] text-[#8E88A7]">One-tap colour and mood combinations.</p>{[{name:'NEXORA Signature',style:'contrast(1.12) saturate(1.16) hue-rotate(8deg) brightness(.98)'},{name:'Violet glow',style:'saturate(1.18) contrast(1.08) hue-rotate(8deg)'},{name:'Golden hour',style:'sepia(.18) saturate(1.22) brightness(1.04)'},{name:'Night cinema',style:'contrast(1.22) saturate(.82) brightness(.9)'},{name:'Clean detail',style:'contrast(1.12) saturate(1.08)'}].map(preset => <button key={preset.name} type="button" disabled={!selectedImages.length} onClick={() => setSelectedImages(previous => previous.map((image,index) => index === (activeEditIndex ?? 0) ? {...image,filterName:preset.name,filterStyle:preset.style} : image))} className="flex w-full items-center justify-between rounded-xl border border-white/10 bg-white/[0.025] px-3 py-3 text-left text-[11px] font-bold text-white disabled:opacity-40"><span>{preset.name}</span><span className="text-[9px] text-violet-300">Apply →</span></button>)}</div>}
                    </div>
                  </div>
                  <footer className="flex shrink-0 items-center justify-between gap-3 border-t border-white/[0.08] pt-3"><button type="button" onClick={prevStep} className="rounded-xl border border-white/10 px-4 py-3 text-xs font-bold text-[#B8B0C9]">← Back to editor</button><button type="button" onClick={nextStep} className="rounded-xl bg-gradient-to-r from-[#8A3FFC] to-[#4B10F2] px-5 py-3 text-xs font-extrabold text-white">Continue to details <ChevronRight size={14} className="ml-1 inline"/></button></footer>
                </section>
              )}


              {currentStep === 5 && (
                /* STEP 5: SMART CAPTION & METADATA DETAILS */
                <div className="space-y-4 animate-fadeIn">
                  <div className="space-y-1 text-left">
                    <label className="text-[10px] font-mono text-[#A39BBF] uppercase">Write a caption</label>
                    <textarea
                      rows={3}
                      maxLength={500}
                      value={caption}
                      onChange={(e) => setCaption(e.target.value)}
                      placeholder="Tell people what this is about..."
                      className="w-full bg-[#10102A]/85 border border-[#292244] rounded-xl p-3.5 text-xs text-white focus:outline-none focus:border-white/10 resize-none leading-relaxed"
                    />
                    <div className="flex justify-between text-[9px] font-mono text-[#8E88A7] px-1">
                      <span>{caption.length} of 500 characters</span>
                      {caption.includes('#') && <span className="text-violet-400">⚡ Hashtags detected</span>}
                    </div>
                  </div>

                  {/* AI Writing Assistant chips */}
                  <div className="bg-[#120E2B]/70 p-3.5 border border-[#292244] rounded-2xl space-y-2">
                    <div className="flex items-center gap-1.5 text-violet-400 font-mono text-[9px] uppercase tracking-widest">
                      <VohIcon size={14} animated variant="brand" />
                      <span>VOH AI writing help</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {[
                        { prompt: 'rewrite', label: 'Rewrite' },
                        { prompt: 'shorten', label: 'Shorten' },
                        { prompt: 'expand', label: 'Make clearer' },
                        { prompt: 'tags', label: 'Suggest hashtags' },
                        { prompt: 'translate', label: 'Translate to French' }
                      ].map((assist) => (
                        <button
                          key={assist.prompt}
                          onClick={() => handleAiWritingAssistance(assist.prompt)}
                          disabled={loadingTranscript}
                          className="px-2.5 py-1 text-[9.5px] font-sans bg-violet-600/10 border border-white/10 hover:border-white/10 text-violet-300 rounded-lg transition-all disabled:opacity-50"
                        >
                          {assist.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Tagging, location and Alt-text metadata */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div className="space-y-1">
                      <label className="text-[10px] font-mono text-[#A39BBF] uppercase block">👥 Mention usernames</label>
                      <input 
                        type="text"
                        maxLength={500}
                        value={taggedUsernames}
                        onChange={(e) => { setTaggedUsernames(e.target.value); setMentionValidation('idle'); }}
                        placeholder="@username, @username"
                        className="w-full bg-[#10102A]/85 border border-[#292244] rounded-xl px-3 py-2 text-xs text-white"
                      />
                      {mentionSuggestions.length > 0 && <div className="mt-1 overflow-hidden rounded-xl border border-[#44376F] bg-[#120E2B]">
                        {mentionSuggestions.map(person => <button key={person.username} type="button" onClick={() => { const parts = taggedUsernames.split(','); parts[parts.length - 1] = ` @${person.username}`; setTaggedUsernames(parts.map(value => value.trim()).filter(Boolean).join(', ') + ', '); setMentionSuggestions([]); setMentionValidation('idle'); }} className="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-[#19143A]">
                          {person.avatar ? <img src={person.avatar} alt="" className="h-6 w-6 rounded-full object-cover" /> : <span className="h-6 w-6 rounded-full bg-violet-900" />}
                          <span><span className="block text-xs text-white">{person.name}</span><span className="block text-[10px] text-violet-300">@{person.username}</span></span>
                        </button>)}
                      </div>}
                      {mentionValidation === 'invalid' && <p className="text-[10px] text-rose-300">A username could not be found. Choose accounts from the suggestions.</p>}
                      {mentionValidation === 'valid' && <p className="text-[10px] text-emerald-300">✓ All mentioned accounts are valid.</p>}
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-mono text-[#A39BBF] uppercase block">🏷️ Add topics</label>
                      <input 
                        type="text" 
                        value={topics}
                        onChange={(e) => setTopics(e.target.value)}
                        placeholder="e.g. Music, Football, Technology"
                        className="w-full bg-[#10102A]/85 border border-[#292244] rounded-xl px-3 py-2 text-xs text-white"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 relative">
                    <div className="space-y-1 relative">
                      <label className="text-[10px] font-mono text-[#A39BBF] uppercase block">📍 Location</label>
                      <input 
                        type="text"
                        maxLength={120}
                        value={location}
                        onChange={(e) => setLocation(e.target.value)}
                        placeholder="Search for a place..."
                        className="w-full bg-[#10102A]/85 border border-[#292244] rounded-xl px-3 py-2 text-xs text-white"
                      />
                      {locationSuggestions.length > 0 && (
                        <div className="absolute z-20 left-0 right-0 top-full mt-1 bg-[#120E2B] border border-[#292244] rounded-xl overflow-hidden shadow-md max-h-32 overflow-y-auto">
                          {locationSuggestions.map(city => (
                            <div key={city} onClick={() => { setLocation(city); setLocationSuggestions([]); }} className="px-3 py-1.5 hover:bg-[#19143A] text-xs text-white cursor-pointer">{city}</div>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-mono text-[#A39BBF] uppercase block">👁️ Describe this photo (optional)</label>
                      <input 
                        type="text"
                        maxLength={500}
                        value={imageAltText}
                        onChange={(e) => setImageAltText(e.target.value)}
                        placeholder="Describe the photo for people who use screen readers."
                        className="w-full bg-[#10102A]/85 border border-[#292244] rounded-xl px-3 py-2 text-xs text-white"
                      />
                    </div>
                  </div>

                </div>
              )}

              {currentStep === 6 && (
                /* STEP 6: VISUAL PREVIEW & ACCESSIBILITY COMPLIANCE */
                <div className="space-y-4 animate-fadeIn">
                  <div>
                    <span className="text-[10px] font-mono text-violet-400 uppercase tracking-widest block mb-1">{activeTab === 'story' ? 'STORY PREVIEW' : 'POST PREVIEW'}</span>
                    <h3 className="text-sm font-black text-white">{activeTab === 'story' ? 'This is how your story will look.' : 'This is how your post will look.'}</h3>
                  </div>

                  {/* Simulated Live Post Card */}
                  <div className="p-4 bg-[#070511] border border-[#292244]/80 rounded-2xl space-y-3.5 text-left">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2.5">
                        <img src={currentUser.avatar} className="w-9 h-9 rounded-full object-cover border border-white/10" />
                        <div>
                          <div className="flex items-center gap-1">
                            <span className="text-xs font-black text-white">{currentUser.name}</span>
                            {currentUser.isVerified && <span className="text-blue-400 text-[10px]">✓</span>}
                          </div>
                          <span className="text-[10px] text-[#8E88A7] font-mono">@{currentUser.username}</span>
                        </div>
                      </div>
                      <span className="text-[9px] font-mono text-violet-400 bg-violet-950/25 px-2 py-0.5 rounded border border-white/10">Preview</span>
                    </div>

                    <p className="text-xs text-[#EEEAF8] leading-relaxed font-sans">{caption || "Your caption will appear here."}</p>

                    {selectedImages.length > 0 && (
                      <div className={`grid gap-2 ${selectedImages.length > 1 ? 'grid-cols-2' : 'grid-cols-1'}`}>
                        {selectedImages.map((photo, index) => (
                          <div key={`preview-photo-${index}`} className="relative aspect-square overflow-hidden rounded-xl border border-[#292244] bg-black">
                            <img src={photo.url} alt={index === 0 ? imageAltText || 'Selected post photo' : `Selected post photo ${index + 1}`} className="h-full w-full object-contain" style={{ filter: `${photo.filterStyle || 'none'} brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%) blur(${blur}px)`, transform: `rotate(${photo.rotation}deg) scale(${photo.zoom})` }} />
                            {stickerOverlay && <span className="pointer-events-none absolute inset-0 flex items-center justify-center text-5xl">{stickerOverlay}</span>}
                            {textOverlay.trim() && <span className="pointer-events-none absolute bottom-3 inset-x-3 rounded-lg bg-black/70 px-2 py-2 text-center text-xs font-bold" style={{ color: textOverlayColor }}>{textOverlay}</span>}
                          </div>
                        ))}
                      </div>
                    )}
                    {(videoFileUrl || recordedVideoUrl) && (
                      <video src={videoFileUrl || recordedVideoUrl || undefined} controls playsInline preload="metadata" className="max-h-[460px] w-full rounded-xl border border-[#292244] bg-black object-contain" />
                    )}

                    {location.trim() && <p className="text-[10px] text-[#A39BBF]">📍 {location}</p>}
                    {taggedUsernames.trim() && <p className="text-[10px] text-[#B69BFF]">Mentioned: {taggedUsernames}</p>}
                    {voiceFileUrl && (
                      <div className="p-3 bg-[#120E2B] border border-[#292244] rounded-xl flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <Play className="w-4 h-4 text-violet-400" />
                          <span>Voice note</span>
                        </div>
                        <span className="text-[10px] font-mono text-[#8E88A7]">0:{voiceDurationSecs}</span>
                      </div>
                    )}

                    {pollQuestion.trim() && (
                      <div className="p-3.5 bg-[#120E2B] border border-[#292244] rounded-xl space-y-2">
                        <span className="text-xs font-bold text-white block">📊 {pollQuestion}</span>
                        <div className="space-y-1">
                          {pollOptionsList.filter(o => o.trim()).map((o, idx) => (
                            <div key={idx} className="w-full text-left p-2 bg-[#070511] border border-[#292244] rounded-lg text-xs font-sans">
                              {o}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                  </div>

                  {/* Accessibility & Quality audit compliance checklist */}
                  <div className="p-3.5 bg-[#070511] border border-[#292244] rounded-2xl space-y-2.5 text-left">
                    <span className="text-[9.5px] font-mono text-amber-400 uppercase font-black tracking-widest block">A quick final check</span>
                    <div className="space-y-1.5">
                      {selectedImages.length > 0 && (
                        <div className="flex items-center gap-2 text-xs">
                          {isAltTextMissing ? (
                            <span className="text-amber-400">Describe your photo (optional).</span>
                          ) : (
                            <span className="text-emerald-400">✓ Photo description added</span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                </div>
              )}

              {currentStep === 7 && (
                /* SCREEN 5: FINAL REVIEW, AUDIENCE & PUBLISH */
                <div className="space-y-4 animate-fadeIn">
                  {postingStatus === 'idle' ? (
                    <div className="space-y-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <span className="mb-1 block text-[10px] font-mono uppercase tracking-[0.2em] text-violet-300">NEXORA · FINAL CHECK</span>
                          <h3 className="text-base font-black text-white">Everything ready to go?</h3>
                          <p className="mt-1 text-[11px] leading-relaxed text-[#A39BBF]">Review what you made, choose who can see it, then publish.</p>
                        </div>
                        <span className="shrink-0 rounded-full border border-violet-400/30 bg-violet-500/10 px-3 py-1.5 text-[10px] font-bold text-violet-200">Screen 5 of 5</span>
                      </div>

                      <div className="overflow-hidden rounded-2xl border border-[#34265E] bg-[#090714]">
                        <div className="flex items-center justify-between border-b border-[#292244] px-3.5 py-3">
                          <div className="flex min-w-0 items-center gap-2.5">
                            <img src={currentUser.avatar} alt="" className="h-9 w-9 rounded-full border border-white/10 object-cover"/>
                            <div className="min-w-0">
                              <p className="truncate text-xs font-extrabold text-white">{currentUser.name}</p>
                              <p className="truncate text-[10px] text-[#8E88A7]">@{currentUser.username}</p>
                            </div>
                          </div>
                          <span className="rounded-full border border-violet-400/30 bg-violet-500/10 px-2.5 py-1 text-[9px] font-bold text-violet-200">FINAL PREVIEW</span>
                        </div>
                        <div className="space-y-3 p-3.5">
                          <p className="whitespace-pre-wrap break-words text-xs leading-relaxed text-[#EEEAF8]">{caption || 'No caption added.'}</p>
                          {selectedImages.length > 0 && (
                            <div className={selectedImages.length > 1 ? 'grid grid-cols-2 gap-2' : 'grid grid-cols-1'}>
                              {selectedImages.slice(0, 4).map((photo, index) => (
                                <div key={`publish-photo-${index}`} className="relative aspect-square overflow-hidden rounded-xl border border-[#292244] bg-black">
                                  <img src={photo.url} alt={index === 0 ? imageAltText || 'Selected post photo' : `Selected post photo ${index + 1}`} className="h-full w-full object-cover" style={{filter:`${photo.filterStyle || 'none'} brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%) blur(${blur}px)`,transform:`rotate(${photo.rotation}deg) scale(${photo.zoom})`}}/>
                                  {stickerOverlay && <span className="pointer-events-none absolute inset-0 flex items-center justify-center text-5xl">{stickerOverlay}</span>}
                                  {textOverlay.trim() && <span className="pointer-events-none absolute inset-x-2 bottom-2 rounded-lg bg-black/70 px-2 py-2 text-center text-xs font-bold" style={{color:textOverlayColor}}>{textOverlay}</span>}
                                </div>
                              ))}
                              {selectedImages.length > 4 && <p className="col-span-2 text-center text-[10px] text-[#A39BBF]">+{selectedImages.length - 4} more photos in this post</p>}
                            </div>
                          )}
                          {(videoFileUrl || recordedVideoUrl) && <video src={videoFileUrl || recordedVideoUrl || undefined} controls playsInline preload="metadata" className="max-h-[340px] w-full rounded-xl border border-[#292244] bg-black object-contain"/>}
                          {voiceFileUrl && <div className="flex items-center gap-2 rounded-xl border border-[#292244] bg-[#120E2B] p-3 text-[11px] text-[#D9D1EA]"><Play className="h-4 w-4 text-violet-300"/> Voice recording attached <span className="ml-auto text-[9px] text-[#8E88A7]">{voiceDurationSecs}s</span></div>}
                          {pollQuestion.trim() && <div className="rounded-xl border border-[#292244] bg-[#120E2B] p-3"><p className="text-xs font-bold text-white">{pollQuestion}</p>{pollOptionsList.filter(Boolean).map((option,index)=><p key={index} className="mt-2 rounded-lg bg-[#090714] px-3 py-2 text-[11px] text-[#C9C1D9]">{option}</p>)}</div>}
                          <div className="flex flex-wrap gap-2 border-t border-[#292244] pt-3 text-[9px] text-[#A39BBF]">
                            <span className="rounded-full bg-white/[0.05] px-2.5 py-1">{activeTab === 'story' ? '24-hour story' : activeMode === 'video' || activeMode === 'reel' ? 'Video post' : activeMode === 'carousel' ? 'Carousel post' : activeMode === 'poll' ? 'Poll' : activeMode === 'voice' ? 'Voice post' : 'NEXORA post'}</span>
                            {selectedImages.length > 0 && <span className="rounded-full bg-white/[0.05] px-2.5 py-1">{selectedImages.length} photo{selectedImages.length === 1 ? '' : 's'}</span>}
                            {location.trim() && <span className="rounded-full bg-white/[0.05] px-2.5 py-1">📍 {location}</span>}
                            {taggedUsernames.trim() && <span className="rounded-full bg-white/[0.05] px-2.5 py-1">Mentions added</span>}
                          </div>
                        </div>
                      </div>

                      {activeTab !== 'story' && (
                        <div className="space-y-3 rounded-2xl border border-[#34265E] bg-[#0B0918] p-3.5 text-left">
                          <div>
                            <h4 className="text-xs font-extrabold text-white">Who can see this?</h4>
                            <p className="mt-1 text-[10px] leading-relaxed text-[#8E88A7]">Your audience choice is attached to the post when it is saved.</p>
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            {([
                              {value:'public',label:'Everyone',detail:'Public on NEXORA',icon:'🌍'},
                              {value:'followers',label:'Followers',detail:'People following you',icon:'👥'},
                              {value:'circle',label:'My Circle',detail:'Your selected circle',icon:'💜'},
                              {value:'community',label:'Community',detail:'Your community audience',icon:'◈'},
                              {value:'onlyme',label:'Only me',detail:'Private to your account',icon:'🔒'}
                            ] as const).map(option=>(
                              <button key={option.value} type="button" onClick={()=>setAudience(option.value)} aria-pressed={audience===option.value} className={audience===option.value?'rounded-xl border border-violet-400/60 bg-violet-500/15 p-3 text-left ring-1 ring-violet-400/20':'rounded-xl border border-white/10 bg-white/[0.025] p-3 text-left hover:border-violet-400/30'}>
                                <span className="flex items-center justify-between text-xs font-bold text-white"><span>{option.icon} {option.label}</span>{audience===option.value&&<Check className="h-3.5 w-3.5 text-violet-300"/>}</span>
                                <span className="mt-1 block text-[9px] text-[#8E88A7]">{option.detail}</span>
                              </button>
                            ))}
                          </div>
                          <label className="flex items-center justify-between gap-3 border-t border-[#292244] pt-3 text-xs text-[#EEEAF8]">
                            <span><span className="block font-semibold">Allow comments</span><span className="mt-0.5 block text-[9px] text-[#8E88A7]">People can respond to your post</span></span>
                            <input type="checkbox" checked={commentsAllowed} onChange={event=>setCommentsAllowed(event.target.checked)} className="h-4 w-4 accent-violet-500"/>
                          </label>
                          <div className="border-t border-[#292244] pt-3">
                            <label className="block text-xs font-bold text-white">NEXORA Origin · Remix permission</label>
                            <p className="mt-1 text-[10px] leading-relaxed text-[#8E88A7]">Choose whether other creators can remix the original media you are uploading now.</p>
                            <select aria-label="NEXORA Origin remix permission" value={originRemixPolicy} onChange={event=>setOriginRemixPolicyState(event.target.value as OriginRemixPolicy)} className="mt-2 w-full rounded-xl border border-[#34265E] bg-[#120E2B] px-3 py-2.5 text-xs font-semibold text-white outline-none focus:border-violet-400">
                              <option value="closed">Closed · Only me</option>
                              <option value="allow_with_attribution">Allow remixing · Attribution required</option>
                            </select>
                            <p className="mt-2 text-[10px] leading-relaxed text-[#A39BBF]">{originRemixPolicy==='closed'?'Remixing is off by default.':'Attribution will be recorded for supported NEXORA Origin remixes of the newly uploaded source media.'}</p>
                          </div>
                        </div>
                      )}

                      <div className="rounded-xl border border-white/10 bg-white/[0.025] p-3 text-[10px] leading-relaxed text-[#A39BBF]">
                        <p className="font-bold text-[#E8E2F4]">Before you publish</p>
                        <p className="mt-1">Check your caption, selected audience and media preview. Photo edits and overlays are rendered into uploaded images. Video edits must be exported from Studio before returning here.</p>
                        {activeTab === 'story' && <p className="mt-1">Stories are shared through the existing 24-hour story flow.</p>}
                      </div>
                    </div>
                  ) : (
                    <div className="py-12 flex flex-col items-center justify-center text-center space-y-5">
                      {postingStatus === 'completed' ? (
                        <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center animate-bounce"><Check className="w-9 h-9"/></div>
                      ) : postingStatus === 'failed' ? (
                        <div className="w-16 h-16 rounded-full bg-rose-500/10 border border-rose-500/30 text-rose-400 flex items-center justify-center"><X className="w-9 h-9"/></div>
                      ) : (
                        <div className="w-full max-w-xs space-y-3">
                          <div className="relative mx-auto flex h-16 w-16 items-center justify-center"><NexoraLoader size="md"/></div>
                          <div className="flex items-center justify-between text-[11px] font-mono"><span className="text-violet-300">{publishStage}</span><span className="font-black tabular-nums text-violet-200">{uploadProgress}%</span></div>
                          <div className="h-2 w-full overflow-hidden rounded-full bg-[#19143A]" role="progressbar" aria-label="Upload progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={uploadProgress}><div className="h-full rounded-full bg-violet-500 transition-[width] duration-200" style={{width:`${uploadProgress}%`}}/></div>
                          <p className="text-[10px] text-[#8E88A7]">Your media is uploading. Large videos may take longer.</p>
                        </div>
                      )}
                      <div className="space-y-1">
                        <span className="block text-[10px] font-mono uppercase tracking-wider text-[#8E88A7]">{postingStatus==='publishing'?publishStage:postingStatus==='completed'?(activeTab==='story'?'Your story is live!':'Your post is live!'):'Publishing paused'}</span>
                        <p className="text-xs text-[#D1CBE3]">{postingStatus==='completed'?(activeTab==='story'?'Your story will be available for 24 hours.':'Your post has been shared on NEXORA.'):postingStatus==='failed'?(errorMessage||'Something went wrong. Your content is safe to try again.'):publishStage}</p>
                      </div>
                      {postingStatus==='failed'&&<div className="w-full max-w-sm space-y-2 rounded-2xl border border-rose-500/20 bg-rose-500/10 p-3 text-left"><p className="text-[11px] leading-relaxed text-rose-200">{errorMessage||'Something interrupted publishing.'}</p><button type="button" onClick={()=>{setPostingStatus('idle');setErrorMessage('');}} className="inline-flex items-center gap-1.5 rounded-xl bg-rose-500/15 px-3 py-2 text-[10px] font-bold uppercase tracking-wide text-rose-100"><RefreshCw className="h-3.5 w-3.5"/> Review and try again</button></div>}
                      {postingStatus==='publishing'&&<div className="flex gap-2"><button type="button" onClick={()=>uploadAbortControllerRef.current?.abort()} className="rounded-lg bg-[#120E2B] px-3 py-1.5 text-xs text-[#A39BBF]">Cancel upload</button><button type="button" onClick={()=>setIsMinimized(true)} className="rounded-lg bg-violet-600/20 px-3 py-1.5 text-xs text-violet-300">Minimize</button></div>}
                    </div>
                  )}
                </div>
              )}

            </div>
          )}

        </div>

        {/* Publishing controls */}
        {activeTab !== 'drafts' && currentStep !== 3 && currentStep !== 4 && postingStatus === 'idle' && (
          <div className="border-t border-[#292244]/60 pt-4 flex justify-between items-center shrink-0">
            <div>
              <button 
                onClick={saveAsDraftLocally}
                className="px-4 py-2 border border-[#292244] hover:bg-[#120E2B] rounded-xl text-[#A39BBF] text-xs font-mono font-bold cursor-pointer transition-colors"
              >
                Save draft
              </button>
            </div>
            <div className="flex gap-2">
              {currentStep > 1 && (
                <button 
                  onClick={prevStep}
                  className="px-4 py-2 bg-[#120E2B] hover:bg-[#19143A] text-white rounded-xl text-xs font-mono font-bold cursor-pointer transition-colors"
                >
                  ← Back
                </button>
              )}
              {currentStep < 7 ? (
                <button 
                  onClick={nextStep}
                  disabled={currentStep === 2 && !activeMode}
                  className="px-5 py-2.5 bg-[linear-gradient(135deg,#8A3FFC_0%,#4B10F2_58%,#1600A3_100%)] hover:brightness-110 disabled:opacity-40 text-white font-sans font-black text-xs uppercase tracking-widest rounded-xl shadow-lg cursor-pointer transition-all"
                >
                  Continue →
                </button>
              ) : (
                <button 
                  onClick={triggerPublishMedia}
                  disabled={!caption.trim() && selectedImages.length === 0 && !videoFileUrl && !recordedVideoUrl && !voiceFileUrl && !pollQuestion.trim()}
                  className="px-6 py-2.5 bg-[linear-gradient(135deg,#8A3FFC_0%,#4B10F2_58%,#1600A3_100%)] hover:brightness-110 disabled:opacity-40 text-white font-sans font-black text-xs uppercase tracking-widest rounded-xl shadow-lg cursor-pointer transition-all animate-pulse"
                >
                  {activeTab === 'story' ? 'Share story' : 'Share'}
                </button>
              )}
            </div>
          </div>
        )}

      </motion.div>


    </div>
  );
}
