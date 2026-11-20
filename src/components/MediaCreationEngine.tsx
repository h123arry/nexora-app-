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

type PhotoExportOptions = {
  rotation: number;
  zoom: number;
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

    const rotated = Math.abs(options.rotation % 180) === 90;
    // Keep the export lightweight enough for mid-range phones while retaining 4K detail.
    const resizeRatio = Math.min(1, 4096 / Math.max(image.naturalWidth, image.naturalHeight));
    const sourceWidth = Math.max(1, Math.round(image.naturalWidth * resizeRatio));
    const sourceHeight = Math.max(1, Math.round(image.naturalHeight * resizeRatio));
    const canvas = document.createElement('canvas');
    canvas.width = rotated ? sourceHeight : sourceWidth;
    canvas.height = rotated ? sourceWidth : sourceHeight;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Photo editing is not available in this browser.');

    context.save();
    context.translate(canvas.width / 2, canvas.height / 2);
    context.rotate((options.rotation * Math.PI) / 180);
    context.scale(Math.max(1, options.zoom), Math.max(1, options.zoom));
    const filters = [
      options.filterStyle && options.filterStyle !== 'none' ? options.filterStyle : '',
      `brightness(${options.brightness}%)`,
      `contrast(${options.contrast}%)`,
      `saturate(${options.saturation}%)`,
      options.blur > 0 ? `blur(${options.blur}px)` : '',
    ].filter(Boolean);
    context.filter = filters.join(' ');
    context.drawImage(image, -sourceWidth / 2, -sourceHeight / 2, sourceWidth, sourceHeight);
    context.restore();
    context.filter = 'none';

    if (options.sticker) {
      context.font = `bold ${Math.max(48, Math.round(canvas.width * 0.12))}px sans-serif`;
      context.textAlign = 'center';
      context.textBaseline = 'middle';
      context.fillText(options.sticker, canvas.width / 2, canvas.height / 2);
    }
    if (options.text?.trim()) {
      const fontSize = Math.max(24, Math.round(canvas.width * 0.045));
      const padding = Math.round(fontSize * 0.65);
      context.font = `700 ${fontSize}px sans-serif`;
      context.textAlign = 'center';
      context.textBaseline = 'middle';
      const maxWidth = canvas.width - padding * 2;
      const words = options.text.trim().split(/\s+/);
      const lines: string[] = [];
      let line = '';
      for (const word of words) {
        const candidate = line ? `${line} ${word}` : word;
        if (line && context.measureText(candidate).width > maxWidth) {
          lines.push(line);
          line = word;
        } else line = candidate;
      }
      if (line) lines.push(line);
      const lineHeight = Math.round(fontSize * 1.25);
      const blockHeight = lines.length * lineHeight + padding;
      const top = canvas.height - blockHeight - padding;
      context.fillStyle = 'rgba(5, 9, 20, 0.72)';
      context.fillRect(padding / 2, top, canvas.width - padding, blockHeight);
      context.fillStyle = options.textColor || '#ffffff';
      lines.forEach((item, index) => context.fillText(item, canvas.width / 2, top + padding / 2 + index * lineHeight + lineHeight / 2, maxWidth));
    }

    return await new Promise<Blob>((resolve, reject) => {
      const timeout = window.setTimeout(() => reject(new Error('Photo preparation took too long. Please try again with a smaller photo.')), 12000);
      canvas.toBlob(blob => {
        clearTimeout(timeout);
        if (blob) resolve(blob);
        else reject(new Error('Your edited photo could not be exported. Please try again.'));
      }, 'image/jpeg', 0.92);
    });
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
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
  filterName?: string;
  filterStyle?: string;
}

interface DraftItem {
  id: string;
  caption: string;
  images: string[];
  imageEdits?: Pick<SelectedImage, 'rotation' | 'zoom' | 'cropOffset' | 'filterName' | 'filterStyle'>[];
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
        filterName: initialAutosave.imageEdits?.[index]?.filterName,
        filterStyle: initialAutosave.imageEdits?.[index]?.filterStyle,
      }));
    }
    return [];
  });
  const [activeEditIndex, setActiveEditIndex] = useState<number | null>(null);
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
          imageEdits: selectedImages.map(({ rotation, zoom, cropOffset, filterName, filterStyle }) => ({ rotation, zoom, cropOffset, filterName, filterStyle })),
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
      if (!navigator.mediaDevices?.getUserMedia) {
        window.dispatchEvent(new CustomEvent('toast', { detail: 'Camera recording is not supported by this browser. Please upload a video instead.' }));
      } else {
        navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: cameraFacing }, width: { ideal: 1920 }, height: { ideal: 1080 } }, audio: true })
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
      video: { facingMode: { ideal: cameraFacing }, width: { ideal: 1920 }, height: { ideal: 1080 } },
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
    const files = e.target.files;
    if (!files) return;
    requestPermission('gallery', () => {
      void Promise.all(Array.from(files).filter((file: File) => file.type.startsWith('image/')).slice(0, 20).map(async (file: File) => {
        try {
          await validateMediaFile(file, 'image');
        } catch (error) {
          window.dispatchEvent(new CustomEvent('toast', { detail: `⚠️ ${error instanceof Error ? error.message : 'This photo could not be checked.'}` }));
          return;
        }
        const reader = new FileReader();
        reader.onload = (ev) => {
          if (ev.target?.result) {
            setSelectedImages(prev => [
              ...prev,
              { url: ev.target!.result as string, fileName: file.name, capturedAt: file.lastModified || Date.now(), rotation: 0, zoom: 1, cropOffset: { x: 0, y: 0 } }
            ]);
          }
        };
        reader.readAsDataURL(file);
      }));
    });
    e.target.value = '';
  };

  const openVideoInStudio = () => {
    if (!videoRawBlob || !onOpenStudio) return;
    const type = videoRawBlob.type || 'video/webm';
    const extension = type.includes('mp4') ? 'mp4' : type.includes('quicktime') ? 'mov' : 'webm';
    onOpenStudio([new File([videoRawBlob], `nexora-clip-${Date.now()}.${extension}`, { type })]);
  };

  const captureCameraSnapshot = () => {
    requestPermission('camera', () => {
      const video = photoPreviewRef.current;
      if (!photoCameraReady || !video || video.videoWidth === 0 || video.videoHeight === 0) {
        window.dispatchEvent(new CustomEvent('toast', { detail: 'Camera is not ready yet. Wait for the preview, then try again.' }));
        return;
      }
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const context = canvas.getContext('2d');
      if (!context) {
        window.dispatchEvent(new CustomEvent('toast', { detail: 'Could not capture the frame. Please try again.' }));
        return;
      }
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      const snapUrl = canvas.toDataURL('image/jpeg', 0.92);
      setSelectedImages(prev => [...prev, { url: snapUrl, rotation: 0, zoom: 1, cropOffset: { x: 0, y: 0 } }]);
      window.dispatchEvent(new CustomEvent('toast', { detail: '📸 Photo captured.' }));
    });
  };

  const handleVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    requestPermission('gallery', () => {
      void (async () => {
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
    e.target.value = '';
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
      video.pause(); video.currentTime = videoTrimStart;
      await new Promise<void>((resolve, reject) => {
        const onSeek = () => { clearTimeout(timeout); resolve(); };
        const timeout = window.setTimeout(() => { video.removeEventListener('seeked', onSeek); reject(new Error('Could not seek to the selected start time.')); }, 5000);
        video.addEventListener('seeked', onSeek, { once: true });
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
    finally { stream?.getTracks().forEach(track => track.stop()); setIsTrimmingVideo(false); }
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
      imageEdits: selectedImages.map(({ rotation, zoom, cropOffset, filterName, filterStyle }) => ({ rotation, zoom, cropOffset, filterName, filterStyle })),
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
    setAudience('public');
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
    if (currentStep < 6) setCurrentStep(prev => prev + 1);
  };

  const prevStep = () => {
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
    <div className="fixed inset-0 z-50 flex items-stretch justify-stretch backdrop-blur-md bg-[#050914] overflow-hidden">
      
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
        <div className="flex justify-between items-start border-b border-white/10 pb-3 mb-4 shrink-0">
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
        <div className="flex gap-1.5 p-1 bg-[#070511]/80 border border-[#292244] rounded-xl mb-4 shrink-0">
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
        {activeTab !== 'drafts' && (
          <div className="mb-4 shrink-0 px-1" aria-label={`Creation step ${currentStep} of 6`}>
            <div className="h-1 overflow-hidden rounded-full bg-[#292244]">
              <div className="h-full rounded-full bg-gradient-to-r from-[#8A3FFC] to-[#4B10F2] transition-all duration-300" style={{ width: `${(currentStep / 6) * 100}%` }} />
            </div>
          </div>
        )}

        {/* Dynamic Core Body */}
        <div className={`flex-1 min-h-0 pr-1 space-y-4 text-left font-sans ${currentStep === 2 && (activeMode === 'photo' || activeMode === 'reel') ? 'overflow-hidden' : 'overflow-y-auto custom-scrollbar'}`}>
          
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
            <div className="space-y-4">
              
              {currentStep === 1 && (
                /* STEP 1: CREATION HOME */
                <div className="space-y-5 animate-fadeIn">
                  <div className="relative overflow-hidden rounded-[26px] border border-violet-400/20 bg-[radial-gradient(ellipse_at_top_right,rgba(113,56,255,0.28),transparent_58%),linear-gradient(145deg,#17102F_0%,#0B1020_58%,#080B16_100%)] p-5">
                    <div className="pointer-events-none absolute -right-8 -top-10 h-36 w-36 rounded-full bg-violet-500/15 blur-3xl" />
                    <div className="relative flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <span className="mb-2 inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-violet-200"><Sparkles size={12}/> Your creative space</span>
                        <h3 className="max-w-[250px] text-[22px] font-black leading-tight tracking-tight text-white">Make something worth sharing.</h3>
                        <p className="mt-2 max-w-[260px] text-xs leading-relaxed text-[#B9B2D0]">Capture a moment, tell a story or bring an idea to life.</p>
                      </div>
                      <div className="mt-1 flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-violet-300/20 bg-violet-400/10 text-violet-200 shadow-[0_0_35px_rgba(113,56,255,0.16)]"><Camera size={23}/></div>
                    </div>
                    <div className="relative mt-5 grid grid-cols-2 gap-2">
                      <button type="button" onClick={() => { setActiveMode('photo'); setCurrentStep(2); }} className="flex min-h-12 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#8A3FFC] to-[#4B10F2] px-3 py-3 text-xs font-extrabold text-white shadow-[0_8px_24px_rgba(75,16,242,0.25)] transition-transform active:scale-[0.98]"><Camera size={16}/> Open camera</button>
                      <button type="button" onClick={() => { setActiveMode('carousel'); setCurrentStep(2); }} className="flex min-h-12 items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/[0.06] px-3 py-3 text-xs font-bold text-white transition-colors hover:bg-white/10 active:scale-[0.98]"><FileImage size={16}/> Choose from gallery</button>
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
                      <button key={item.id} type="button" onClick={() => { setActiveMode(item.id as any); setCurrentStep(2); }} className="group flex min-h-[82px] items-center gap-3 rounded-2xl border border-[#292244] bg-[#0C0A19] p-3 text-left transition-all hover:border-violet-400/40 hover:bg-[#14102A] active:scale-[0.985]">
                        <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/[0.06] ${item.glow} ${item.tint}`}><item.icon size={19}/></span>
                        <span className="min-w-0"><span className="block text-xs font-extrabold text-white group-hover:text-violet-200">{item.label}</span><span className="mt-1 block text-[10px] leading-snug text-[#89839F]">{item.desc}</span></span>
                        <ChevronRight size={14} className="ml-auto shrink-0 text-[#625A78] transition-transform group-hover:translate-x-0.5 group-hover:text-violet-300"/>
                      </button>
                    ))}
                  </div>

                  {onOpenStudio && (
                    <button type="button" onClick={() => onOpenStudio([])} className="group flex w-full items-center gap-3 rounded-2xl border border-violet-400/25 bg-[linear-gradient(100deg,rgba(113,56,255,0.14),rgba(15,12,32,0.88))] p-3.5 text-left transition-all hover:border-violet-300/50 hover:bg-violet-500/10">
                      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-violet-500/15 text-violet-200"><Clapperboard size={21}/></span>
                      <span className="min-w-0 flex-1"><span className="block text-xs font-extrabold text-white">Open NEXORA Studio</span><span className="mt-1 block text-[10px] text-[#A39BBF]">Edit clips, add music, captions, transitions and more.</span></span>
                      <ChevronRight size={17} className="text-violet-300 transition-transform group-hover:translate-x-1"/>
                    </button>
                  )}
                </div>
              )}

              {currentStep === 2 && (
                /* STEP 2: MEDIA IMPORT & RECORDING */
                <div className="flex h-full min-h-0 flex-col space-y-4 animate-fadeIn">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-semibold text-[#B69BFF]">{activeMode === 'photo' ? 'Choose a photo or take one' : activeMode === 'reel' ? 'Record a video or choose one' : activeMode === 'video' ? 'Choose a video' : 'Add your content'}</span>
                    <button 
                      onClick={() => setCurrentStep(1)} 
                      className="text-xs text-violet-400 hover:underline flex items-center gap-1 font-bold"
                    >
                      Choose another
                    </button>
                  </div>

                  {activeMode === 'photo' && (
                    <div className="relative flex-1 min-h-0 w-full overflow-hidden rounded-3xl bg-[#050914]">
                      {/* Drag upload zone */}
                      <div className="hidden">
                        <FileImage className="w-8 h-8 text-[#8E88A7] animate-bounce" />
                        <div className="space-y-1">
                          <p className="text-xs text-[#D1CBE3] font-bold">Add a photo</p>
                          <p className="text-[10px] text-[#8E88A7] font-sans">Choose a photo from your device.</p>
                        </div>
                        <label className="px-4 py-2 bg-[#120E2B] hover:bg-[#19143A] border border-[#292244] text-white rounded-xl text-xs font-mono font-bold cursor-pointer transition-all">
                          Choose from gallery
                          <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                        </label>
                      </div>

                      {/* Snap device simulation */}
                      <div className="absolute inset-0 flex flex-col justify-between p-4 text-center">
                        <div className="relative z-10 self-start rounded-2xl border border-white/15 bg-black/45 px-4 py-2 text-left backdrop-blur-xl">
                          <span className="text-sm font-semibold text-white block">NEXORA Camera</span>
                          <p className="text-[10px] text-white/70">Your moment, your space.</p>
                        </div>
                        <video ref={photoPreviewRef} autoPlay muted playsInline className="absolute inset-0 h-full w-full rounded-3xl object-cover bg-[#050914]" aria-label="Live camera preview" />
                        {permissionState !== 'granted' && (
                          <button type="button" onClick={() => setPermissionTarget('camera')} className="w-full rounded-xl border border-[#44376F] bg-[#120E2B] py-2.5 text-xs font-semibold text-white hover:border-violet-400/60">Turn on camera</button>
                        )}
                        <div className="relative z-10 flex items-center justify-center gap-3 rounded-3xl border border-white/15 bg-black/45 p-3 backdrop-blur-xl">
                          <label className="rounded-full border border-white/20 bg-white/10 px-4 py-3 text-xs font-semibold text-white">Gallery<input type="file" accept="image/*" multiple className="hidden" onChange={handleImageUpload} /></label>
                          <button type="button" onClick={() => setCameraFacing(previous => previous === 'user' ? 'environment' : 'user')} disabled={!photoCameraReady} className="rounded-full border border-white/20 bg-white/10 px-4 py-3 text-xs font-semibold text-white disabled:opacity-40">Flip</button>
                          <button onClick={captureCameraSnapshot} disabled={!photoCameraReady} aria-disabled={!photoCameraReady} title={photoCameraReady ? 'Capture a photo from your camera' : 'Waiting for camera preview'} className="rounded-full bg-gradient-to-br from-[#A855F7] to-[#4B10F2] px-7 py-4 text-sm font-black text-white shadow-[0_0_35px_rgba(113,56,255,0.45)] transition-all hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50">Capture</button>
                        </div>
                        <button type="button" onClick={() => { if (permissionState === 'granted') setIsLensStudioOpen(true); else { setOpenLensAfterPermission(true); setPermissionTarget('camera'); } }} className="relative z-10 self-center rounded-full border border-violet-300/40 bg-violet-600/80 px-5 py-2.5 text-xs font-bold text-white shadow-lg backdrop-blur-xl transition-all hover:brightness-110"><Sparkles className="mr-1 inline h-3.5 w-3.5" /> Open Filters & Lenses</button>
                        <div className="flex flex-wrap gap-1.5 justify-center mt-2">
                          {selectedImages.map((img, i) => (
                            <div key={i} className="relative w-12 h-12 rounded-lg border border-[#44376F] overflow-hidden shrink-0">
                              <img src={img.url} className="w-full h-full object-cover" />
                              <button 
                                onClick={() => setSelectedImages(prev => prev.filter((_, idx) => idx !== i))}
                                className="absolute top-0.5 right-0.5 bg-black/75 rounded-full p-0.5 text-rose-400"
                              >
                                <X className="w-2.5 h-2.5" />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                      {isLensStudioOpen && (
                        <div className="space-y-3 rounded-2xl border border-[#44376F] bg-[#090714] p-3 sm:col-span-2">
                          <div className="flex items-center justify-between">
                            <div><p className="text-sm font-bold text-white">NEXORA Filters & Lenses</p><p className="text-[10px] text-[#A39BBF]">Take a photo with your lens.</p></div>
                            <div className="flex gap-2">
                              <button type="button" onClick={() => setCameraFacing(previous => previous === 'user' ? 'environment' : 'user')} className="rounded-full border border-white/10 bg-[#120E2B] p-2 text-white" aria-label="Switch camera"><RefreshCw className="h-4 w-4" /></button>
                              <button type="button" onClick={() => setIsLensStudioOpen(false)} className="rounded-full border border-white/10 bg-[#120E2B] px-3 py-2 text-xs font-semibold text-white">Close</button>
                            </div>
                          </div>
                          <NexoraLensStudio cameraFacing={cameraFacing} userId={currentUser.id} captureMode="photo" countdownTimer={countdownTimer}
                            onStreamReady={stream => { videoStreamRef.current = stream; setIsLensStreamReady(Boolean(stream)); }}
                            onCapture={blob => {
                              const url = trackObjectUrl(URL.createObjectURL(blob));
                              setSelectedImages(previous => [...previous, { url, rotation: 0, zoom: 1, cropOffset: { x: 0, y: 0 } }]);
                              setIsLensStudioOpen(false);
                              window.dispatchEvent(new CustomEvent('toast', { detail: 'Your filtered NEXORA photo is ready to share.' }));
                            }}
                          />
                        </div>
                      )}
                    </div>
                  )}

                  {activeMode === 'carousel' && (
                    <div className="space-y-3">
                      <div className="border border-[#292244] border-dashed rounded-2xl p-6 text-center space-y-3 bg-[#080712]/30">
                        <FileImage className="w-8 h-8 text-[#8E88A7] mx-auto" />
                        <p className="text-xs text-[#D1CBE3] font-bold">Add photos to your collection</p>
                        <label className="px-4 py-2 bg-[#120E2B] hover:bg-[#19143A] border border-[#292244] text-white rounded-xl text-xs font-mono font-bold cursor-pointer transition-all inline-block">
                          Choose photos
                          <input type="file" multiple accept="image/*" className="hidden" onChange={handleImageUpload} />
                        </label>
                      </div>

                      {selectedImages.length > 0 && (
                        <div className="space-y-2 bg-[#120E2B]/70 p-3 rounded-xl border border-[#292244]">
                          <div className="flex items-center justify-between gap-2"><span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#B9AED8]">Selected media · {selectedImages.length}/20</span><span className="text-[10px] text-[#817895]">Hold your order · move items below</span></div>
                          <div className="grid grid-cols-3 sm:grid-cols-4 gap-px overflow-hidden rounded-xl border border-[#292244] bg-[#292244]">
                            {selectedImages.map((img, index) => (
                              <div key={index} className="group relative aspect-[4/5] overflow-hidden bg-[#090714]">
                                <img src={img.url} alt={img.fileName || `Selected photo ${index + 1}`} loading="lazy" className="h-full w-full object-cover" />
                                <span className="absolute left-1.5 top-1.5 rounded-md bg-black/65 px-1.5 py-0.5 text-[9px] font-bold text-white">{index + 1}</span>
                                <div className="absolute inset-0 flex items-center justify-center gap-1 bg-black/55 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
                                  {index > 0 && (
                                    <button onClick={() => { const next = [...selectedImages]; const tmp = next[index]; next[index] = next[index - 1]; next[index - 1] = tmp; setSelectedImages(next); }} className="p-1 bg-[#120E2B] rounded text-white">
                                      <ChevronLeft className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                  {index < selectedImages.length - 1 && (
                                    <button onClick={() => { const next = [...selectedImages]; const tmp = next[index]; next[index] = next[index + 1]; next[index + 1] = tmp; setSelectedImages(next); }} className="p-1 bg-[#120E2B] rounded text-white">
                                      <ChevronRight className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                  <button onClick={() => setSelectedImages(prev => prev.filter((_, idx) => idx !== index))} className="p-1 bg-rose-950/80 rounded text-rose-400">
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
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
                        <input type="file" accept="video/*" className="hidden" onChange={handleVideoUpload} />
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
                        <div className="relative mx-auto flex aspect-[4/5] w-full max-w-[320px] flex-col justify-between overflow-hidden rounded-2xl border border-[#44376F] bg-black p-3.5 shadow-md">
                          <div className="z-10 flex items-center justify-between text-[8px] font-mono text-[#A39BBF]">
                            <span className="rounded border border-white/5 bg-black/70 px-2 py-0.5">Camera</span>
                            <button type="button" onClick={() => { setActiveMode('video'); setIsLensStudioOpen(false); }} className="rounded-full border border-white/15 bg-black/65 px-3 py-1.5 text-[9px] font-semibold text-white">Choose from gallery</button>
                            <div className="flex items-center gap-2">
                              <button type="button" onClick={() => { if (permissionState === 'granted') setIsLensStudioOpen(true); else { setOpenLensAfterPermission(true); setPermissionTarget('camera'); } }} className="rounded-full border border-[#A78BFA]/40 bg-[#7138FF]/25 px-3 py-1.5 text-[9px] font-bold text-white"><Sparkles className="mr-1 inline h-3 w-3" /> Filters & Lenses</button>
                              <button disabled={isRecording || isSavingRecordedVideo || countdownTimer !== null} onClick={() => setCameraFacing(prev => prev === 'user' ? 'environment' : 'user')} className="rounded-full bg-[#120E2B] p-1.5 text-white disabled:opacity-40" aria-label="Switch camera"><RefreshCw className="h-3 w-3" /></button>
                            </div>
                          </div>
                          <div className="absolute inset-0 z-0 flex items-center justify-center">
                            {countdownTimer !== null ? <span className="animate-ping text-5xl font-black text-white">{countdownTimer}</span> : recordedVideoUrl ? <video src={recordedVideoUrl} autoPlay loop muted className="h-full w-full object-cover" /> : <video ref={videoPreviewRef} autoPlay muted playsInline className="h-full w-full bg-[#120E2B] object-cover" />}
                          </div>
                          <div className="z-10 flex flex-col items-center gap-2">
                            <label className="flex items-center gap-2 rounded-full border border-white/15 bg-black/65 px-3 py-1.5 text-[10px] font-semibold text-white">
                              Video length
                              <select aria-label="Video recording length" value={recordingLimitSecs} disabled={isRecording || isSavingRecordedVideo || countdownTimer !== null} onChange={event => setRecordingLimitSecs(Number(event.target.value))} className="bg-transparent text-white outline-none">
                                {RECORDING_DURATIONS.map(duration => <option key={duration.seconds} value={duration.seconds} className="bg-[#120E2B]">{duration.label}</option>)}
                              </select>
                            </label>
                            {isRecording ? <button onClick={handleStopReelRecord} className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-white bg-rose-600 text-[10px] font-bold text-white">Stop</button> : <button onClick={startReelRecording} className="flex h-14 w-14 items-center justify-center rounded-full border-4 border-black bg-gradient-to-tr from-[#8A3FFC] to-[#1600A3] text-[10px] font-black text-white shadow-md">{recordedVideoUrl ? 'Again' : 'Record'}</button>}
                            {isRecording && <span className="rounded-full bg-black/60 px-2 py-0.5 text-[9px] font-mono text-white">Recording: {Math.floor(loopTimerSecs / 60)}:{String(loopTimerSecs % 60).padStart(2, '0')} / {Math.floor(recordingLimitSecs / 60)}:{String(recordingLimitSecs % 60).padStart(2, '0')}</span>}
                            {!isRecording && recordedVideoUrl && <span className="rounded-full bg-black/60 px-2 py-0.5 text-[9px] text-white">Video ready</span>}
                             {!isRecording && videoRawBlob && onOpenStudio && <button type="button" onClick={openVideoInStudio} className="rounded-full border border-violet-300/40 bg-violet-500/15 px-4 py-2 text-[10px] font-semibold text-violet-100">Edit in NEXORA Studio</button>}
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
                /* STEP 3: CREATIVE EDIT WORKSPACE */
                <div className="space-y-4 animate-fadeIn">
                  <div>
                    <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-[#B69BFF]">STEP 3 OF 6</span>
                    <h3 className="text-base font-bold text-white">Preview</h3>
                    <p className="mt-1 text-xs leading-relaxed text-[#A39BBF]">Review your post before sharing.</p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Media render wrapper */}
                    <div className="aspect-square rounded-2xl border border-[#292244] bg-black flex items-center justify-center relative overflow-hidden">
                      {selectedImages.length > 0 ? (
                        <div className="relative w-full h-full">
                          <img 
                            src={selectedImages[activeEditIndex || 0]?.url} 
                            style={{ 
                              filter: `${selectedImages[activeEditIndex || 0]?.filterStyle || 'none'} brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%) blur(${blur}px)`,
                              transform: `rotate(${selectedImages[activeEditIndex || 0]?.rotation}deg) scale(${selectedImages[activeEditIndex || 0]?.zoom})`,
                              transition: 'all 0.2s'
                            }}
                            className="w-full h-full object-contain"
                          />
                          {stickerOverlay && (
                            <span className="absolute inset-0 flex items-center justify-center text-5xl animate-bounce pointer-events-none select-none">
                              {stickerOverlay}
                            </span>
                          )}
                          {textOverlay && (
                            <p 
                              className="absolute bottom-6 inset-x-4 text-center font-sans font-black tracking-tight text-xs bg-black/60 py-2 px-3 rounded-lg backdrop-blur-xs"
                              style={{ color: textOverlayColor }}
                            >
                              {textOverlay}
                            </p>
                          )}
                        </div>
                      ) : (videoFileUrl || recordedVideoUrl) ? (
                        <video src={videoFileUrl || recordedVideoUrl || undefined} controls playsInline preload="metadata" className="h-full w-full bg-black object-contain" />
                      ) : (
                        <div className="text-center p-6 space-y-2 text-[#8E88A7]">
                          <Sliders className="w-8 h-8 mx-auto" />
                          <p className="text-xs"></p>
                        </div>
                      )}
                    </div>

                    {/* Photo adjustments are only shown when a photo is selected. */}
                    <div className={`${selectedImages.length > 0 ? 'space-y-3.5 bg-[#120E2B]/70 p-4 rounded-2xl border border-[#292244]/60' : 'hidden'}`}>
                      <span className="text-[10px] font-mono text-[#A39BBF] uppercase block tracking-wider pt-1">Photo adjustments</span>
                      
                      {/* Interactive CSS filters row */}
                      {selectedImages.length > 0 && (
                        <div className="space-y-1.5">
                          <span className="text-[9px] font-mono text-[#8E88A7] block uppercase">Choose a NEXORA look · {FILTER_PRESETS.length} original styles</span>
                          <div className="flex gap-2 overflow-x-auto pb-1.5 custom-scrollbar">
                            {FILTER_PRESETS.map((p) => (
                              <button
                                key={p.name}
                                onClick={() => {
                                  setSelectedImages(prev => prev.map((img, idx) => {
                                    if (idx === (activeEditIndex || 0)) {
                                      return { ...img, filterName: p.name, filterStyle: p.style };
                                    }
                                    return img;
                                  }));
                                }}
                                className={`px-2.5 py-1 text-[10px] font-sans font-bold border rounded-lg transition-all shrink-0 ${
                                  (selectedImages[activeEditIndex || 0]?.filterName || 'Normal') === p.name 
                                    ? 'bg-violet-600 text-white border-violet-500' 
                                    : 'bg-[#120E2B] text-[#A39BBF] border-[#292244] hover:text-white'
                                }`}
                              >
                                {p.name}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Crop/Rotate utilities */}
                      <div className="grid grid-cols-2 gap-2 pt-1 border-t border-[#292244]">
                        <button 
                          onClick={() => {
                            setSelectedImages(prev => prev.map((img, idx) => {
                              if (idx === (activeEditIndex || 0)) {
                                return { ...img, rotation: (img.rotation + 90) % 360 };
                              }
                              return img;
                            }));
                          }}
                          className="py-1.5 bg-[#120E2B] hover:bg-[#19143A] text-[10px] font-mono text-[#D1CBE3] rounded-lg flex items-center justify-center gap-1"
                        >
                          <RotateCw className="w-3.5 h-3.5" /> Rotate photo
                        </button>
                        <button 
                          onClick={() => {
                            setSelectedImages(prev => prev.map((img, idx) => {
                              if (idx === (activeEditIndex || 0)) {
                                return { ...img, zoom: img.zoom === 1 ? 1.5 : 1 };
                              }
                              return img;
                            }));
                          }}
                          className="py-1.5 bg-[#120E2B] hover:bg-[#19143A] text-[10px] font-mono text-[#D1CBE3] rounded-lg flex items-center justify-center gap-1"
                        >
                          <Crop className="w-3.5 h-3.5" /> Zoom photo
                        </button>
                      </div>

                      {/* Adjust Sliders */}
                      <div className="space-y-2 border-t border-[#292244] pt-3">
                        <div className="flex justify-between text-[9px] font-mono text-[#A39BBF]">
                          <span>🔆 Brightness: {brightness}%</span>
                          <input type="range" min="50" max="150" value={brightness} onChange={(e) => setBrightness(parseInt(e.target.value))} className="accent-violet-500" />
                        </div>
                        <div className="flex justify-between text-[9px] font-mono text-[#A39BBF]">
                          <span>🌓 Contrast: {contrast}%</span>
                          <input type="range" min="50" max="150" value={contrast} onChange={(e) => setContrast(parseInt(e.target.value))} className="accent-violet-500" />
                        </div>
                        <div className="flex justify-between text-[9px] font-mono text-[#A39BBF]">
                          <span>🎨 Saturation: {saturation}%</span>
                          <input type="range" min="50" max="150" value={saturation} onChange={(e) => setSaturation(parseInt(e.target.value))} className="accent-violet-500" />
                        </div>
                      </div>

                      {/* Stickers Overlay & Text Overlays */}
                      <div className="space-y-2 border-t border-[#292244] pt-3 text-left">
                        <span className="text-[9px] font-mono text-[#8E88A7] uppercase block">Stickers and text</span>
                        <div className="flex gap-2">
                          {['🔥', '⚡', '✨', '🏆', '👾', '🚀', '💯'].map((emo) => (
                            <button key={emo} onClick={() => setStickerOverlay(stickerOverlay === emo ? null : emo)} className={`text-lg p-1 hover:scale-110 transition-transform ${stickerOverlay === emo ? 'bg-violet-600/20 rounded-lg border border-white/10' : ''}`}>
                              {emo}
                            </button>
                          ))}
                        </div>
                        <div className="space-y-1">
                          <input 
                            type="text" 
                            placeholder="Add text to your photo"
                            value={textOverlay}
                            onChange={(e) => setTextOverlay(e.target.value)}
                            className="w-full bg-[#120E2B] border border-[#292244] rounded-lg px-2.5 py-1 text-[11px] text-white"
                          />
                        </div>
                      </div>

                    </div>
                    {selectedImages.length === 0 && (videoFileUrl || recordedVideoUrl) && (
                      <div className="flex flex-col justify-center rounded-2xl border border-[#7138FF]/25 bg-[#120E2B] p-5">
                        <span className="mb-2 text-xs font-semibold text-[#B69BFF]">Your video is ready</span>
                        <p className="text-sm leading-relaxed text-[#EEEAF8]">Add a caption, check your video, then share it.</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {currentStep === 4 && (
                /* STEP 4: SMART CAPTION & METADATA DETAILS */
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

              {currentStep === 5 && (
                /* STEP 5: VISUAL PREVIEW & ACCESSIBILITY COMPLIANCE */
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

              {currentStep === 6 && (
                /* STEP 6: PUBLISHING OPTIONS & PROGRESS SCREEN */
                <div className="space-y-4 animate-fadeIn">
                  
                  {postingStatus === 'idle' ? (
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-bold text-white">{activeTab === 'story' ? 'Ready to share your story?' : 'Ready to share?'}</span>
                      </div>

                      <div className="space-y-2.5 bg-[#07070d]/50 p-3.5 border border-[#292244] rounded-2xl text-left">
                        <div className="flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <span className="text-xs font-bold text-[#EEEAF8] block">{activeTab === 'story' ? 'Your story' : 'Public post'}</span>
                            <p className="mt-1 text-[11px] leading-relaxed text-[var(--nx-muted)]">{activeTab === 'story' ? 'Your story will be visible on NEXORA for 24 hours.' : 'Anyone on NEXORA can see this post.'}</p>
                          </div>
                          <span className="shrink-0 rounded-full border border-[#7138FF]/40 bg-[#7138FF]/15 px-2.5 py-1 text-[10px] font-semibold text-[#C7B5FF]">Everyone</span>
                        </div>
                        {activeTab !== 'story' && (
                          <label className="flex items-center justify-between gap-3 border-t border-[#292244] pt-3 text-xs text-[#EEEAF8]">
                            <span>Allow comments</span>
                            <input type="checkbox" checked={commentsAllowed} onChange={(event) => setCommentsAllowed(event.target.checked)} className="h-4 w-4 accent-violet-500" />
                          </label>
                        )}
                        {activeTab !== 'story' ? (
                          <>
                            <div className="border-t border-[#292244] pt-3 space-y-2">
                            <div>
                              <span className="block text-xs font-bold text-[#EEEAF8]">NEXORA Origin · Remix permission</span>
                              <p className="mt-1 text-[10px] leading-relaxed text-[#8E88A7]">Let other people remix this post. You can change this later.</p>
                            </div>
                            <select
                              aria-label="NEXORA Origin remix permission"
                              value={originRemixPolicy}
                              onChange={(event) => setOriginRemixPolicyState(event.target.value as OriginRemixPolicy)}
                              className="w-full rounded-xl border border-[#34265E] bg-[#120E2B] px-3 py-2.5 text-xs font-semibold text-white outline-none focus:border-violet-400"
                            >
                              <option value="closed">Closed · Only me</option>
                              <option value="allow_with_attribution">Allow remixing · Attribution required</option>
                            </select>
                            <p className="text-[10px] leading-relaxed text-[#A39BBF]">
                              {originRemixPolicy === 'closed'
                                ? 'Your uploaded media stays closed to cross-account remixes by default.'
                                : 'NEXORA will record creator attribution when another account remixes this media. Permission applies only to newly uploaded media in this post.'}
                            </p>
                          </div>
                            <p className="text-[10px] leading-relaxed text-[#8E88A7]"></p>
                          </>
                        ) : (
                          <p className="border-t border-[#292244] pt-3 text-[10px] leading-relaxed text-[#8E88A7]">Stories are public and disappear automatically after 24 hours.</p>
                        )}
                      </div>

                    </div>
                  ) : (
                    /* Publishing progress */
                    <div className="py-12 flex flex-col items-center justify-center text-center space-y-5">
                      {postingStatus === 'completed' ? (
                        <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center animate-bounce">
                          <Check className="w-9 h-9" />
                        </div>
                      ) : postingStatus === 'failed' ? (
                        <div className="w-16 h-16 rounded-full bg-rose-500/10 border border-rose-500/30 text-rose-400 flex items-center justify-center">
                          <X className="w-9 h-9" />
                        </div>
                      ) : (
                        <div className="w-full max-w-xs space-y-3">
                          <div className="relative w-16 h-16 mx-auto flex items-center justify-center">
                            <NexoraLoader size="md" />
                          </div>
                          <div className="flex items-center justify-between text-[11px] font-mono">
                            <span className="text-violet-300">{publishStage}</span>
                            <span className="text-violet-200 font-black tabular-nums">{uploadProgress}%</span>
                          </div>
                          <div
                            className="h-2 w-full overflow-hidden rounded-full bg-[#19143A]"
                            role="progressbar"
                            aria-label="Upload progress"
                            aria-valuemin={0}
                            aria-valuemax={100}
                            aria-valuenow={uploadProgress}
                          >
                            <div className="h-full rounded-full bg-violet-500 transition-[width] duration-200" style={{ width: `${uploadProgress}%` }} />
                          </div>
                          <p className="text-[10px] text-[#8E88A7]">Upload progress. Large videos may take longer to upload.</p>
                        </div>
                      )}

                      <div className="space-y-1">
                        <span className="text-[10px] font-mono text-[#8E88A7] uppercase block tracking-wider">
                          {postingStatus === 'publishing' && publishStage}
                          {postingStatus === 'completed' && (activeTab === 'story' ? 'Your story is live!' : 'Your post is ready!')}
                        </span>
                        <p className="text-xs text-[#D1CBE3] font-sans">
                          {postingStatus === 'completed' ? (activeTab === 'story' ? 'Your story will be available for 24 hours.' : 'Your post has been shared.') : postingStatus === 'failed' ? (errorMessage || 'Something went wrong. Your content is safe to try again.') : publishStage}
                        </p>
                      </div>

                      {postingStatus === 'failed' && (
                        <div className="w-full max-w-sm rounded-2xl border border-rose-500/20 bg-rose-500/10 p-3 text-left space-y-2">
                          <p className="text-[11px] leading-relaxed text-rose-200">{errorMessage || 'Something interrupted publishing.'}</p>
                          <button
                            type="button"
                            onClick={() => { setPostingStatus('idle'); setErrorMessage(''); }}
                            className="inline-flex items-center gap-1.5 rounded-xl bg-rose-500/15 px-3 py-2 text-[10px] font-bold uppercase tracking-wide text-rose-100 hover:bg-rose-500/25"
                          >
                            <RefreshCw className="h-3.5 w-3.5" /> Try again
                          </button>
                        </div>
                      )}

                      {postingStatus !== 'completed' && postingStatus !== 'failed' && (
                        <div className="flex gap-2">
                          <button 
                            onClick={() => uploadAbortControllerRef.current?.abort()} 
                            className="px-3 py-1.5 bg-[#120E2B] hover:bg-[#19143A] text-[#A39BBF] rounded-lg text-xs"
                          >
                            Cancel
                          </button>
                          <button 
                            onClick={() => setIsMinimized(true)}
                            className="px-3 py-1.5 bg-violet-600/20 text-violet-300 rounded-lg text-xs"
                          >
                            Minimize
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                </div>
              )}

            </div>
          )}

        </div>

        {/* Publishing controls */}
        {activeTab !== 'drafts' && postingStatus === 'idle' && (
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
              {currentStep < 6 ? (
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
