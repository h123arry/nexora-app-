import { authenticatedVohFetch } from '../services/voh/authenticatedVohFetch';
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Check, Plus, Camera, Video, Mic, BarChart2, FileText, MapPin, ChevronRight, Trash2, Play, Pause, RefreshCw, Volume2, RotateCw, Crop, Sliders, VolumeX, Save, ChevronLeft, ArrowUp, ArrowDown, Users, FolderHeart, ShieldAlert, BadgeInfo, Calendar, Smile, FileImage, SlidersHorizontal, Eye, HelpCircle, Sparkle, Settings, Info, Tag } from 'lucide-react';
import VohIcon from './VohIcon';
import { User } from '../types';
import { videoFileExtension } from '../services/media/videoFileExtension';
import { saveMediaBlob, getMediaBlob, generateVideoThumbnail } from '../utils/indexedDbStorage';
import { revokeObjectUrl, validateMediaFile } from '../utils/mediaValidation';
import { uploadMediaFile } from '../services/firebase/storageService';
import { VoiceEngine } from '../services/voh/voiceEngine';
import NexoraLoader from './NexoraLoader';
import { deleteDraft, getDrafts, saveDraft } from '../services/dataService';

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

/** Bake the adjustments shown in the composer into the image that is uploaded. */
async function renderEditedPhotoBlob(source: Blob, options: PhotoExportOptions): Promise<Blob> {
  const objectUrl = URL.createObjectURL(source);
  try {
    const image = new Image();
    image.src = objectUrl;
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error('This photo could not be prepared. Please choose it again.'));
    });

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
      canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('Your edited photo could not be exported. Please try again.')), 'image/jpeg', 0.92);
    });
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

interface MediaCreationEngineProps {
  currentUser: User;
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
    postDetails?: { location?: string; taggedUsernames?: string[]; imageAltText?: string; commentsAllowed?: boolean }
  ) => string;
  theme: 'neon-cyber' | 'stealth-dark' | 'platinum-light' | 'emerald-glass';
  isStoryModeInitially?: boolean;
  isOffline?: boolean;
  onToggleOffline?: () => void;
  initialMode?: 'text' | 'photo' | 'video' | 'reel' | 'voice' | 'poll' | 'pulse' | 'community' | null;
  initialTab?: 'feed' | 'story' | 'drafts';
  initialCaption?: string;
}

interface SelectedImage {
  url: string;
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
  { name: 'Normal', style: 'none' },
  { name: 'Clarendon', style: 'contrast(1.2) brightness(1.1) saturate(1.2)' },
  { name: 'Lark', style: 'saturate(1.35) hue-rotate(-10deg)' },
  { name: 'Noir', style: 'grayscale(1) contrast(1.4)' },
  { name: 'Sepia', style: 'sepia(0.8) contrast(0.95)' },
  { name: 'Cyberpunk', style: 'hue-rotate(280deg) saturate(1.5) contrast(1.1)' }
];

const WIZARD_STEPS = [
  { id: 1, label: 'Choose' },
  { id: 2, label: 'Add' },
  { id: 3, label: 'Review' },
  { id: 4, label: 'Caption' },
  { id: 5, label: 'Preview' },
  { id: 6, label: 'Share' }
];

export default function MediaCreationEngine({
  currentUser,
  onClose,
  onAddPost,
  theme,
  isStoryModeInitially = false,
  isOffline = false,
  onToggleOffline,
  initialMode = null,
  initialTab = undefined,
  initialCaption = ''
}: MediaCreationEngineProps) {
  const autosaveKey = `nexora_creation_autosave_v1_${currentUser.id || 'visitor'}`;
  const draftsKey = `nexora_post_drafts_v1_${currentUser.id || 'visitor'}`;
  const initialAutosave = readLocalAutosave(autosaveKey);

  // Navigation & Wizard Core
  const [activeTab, setActiveTab] = useState<'feed' | 'story' | 'drafts'>(initialTab || (isStoryModeInitially ? 'story' : 'feed'));
  const [activeMode, setActiveMode] = useState<'text' | 'photo' | 'video' | 'reel' | 'voice' | 'poll' | 'pulse' | 'community' | 'carousel' | null>(() => {
    return initialAutosave?.activeMode || initialMode;
  });
  const [currentStep, setCurrentStep] = useState<number>(() => {
    return initialAutosave?.currentStep || 1;
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

  // Reels
  const [isRecording, setIsRecording] = useState(false);
  const [isRecordingPaused, setIsRecordingPaused] = useState(false);
  const [recordedVideoUrl, setRecordedVideoUrl] = useState<string | null>(() => initialAutosave?.recordedVideoUrl || null);
  const [cameraFacing, setCameraFacing] = useState<'user' | 'environment'>('user');
  const [countdownTimer, setCountdownTimer] = useState<number | null>(null);
  const [loopTimerSecs, setLoopTimerSecs] = useState(0);

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
  const [permissionTarget, setPermissionTarget] = useState<'camera' | 'gallery' | 'mic' | null>(null);
  const [permissionState, setPermissionState] = useState<'prompt' | 'granted' | 'denied'>(() => {
    return (localStorage.getItem('nexora_media_permissions_granted') as any) || 'prompt';
  });
  const [isAdvancedOptionsOpen, setIsAdvancedOptionsOpen] = useState(false);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [draftsList, setDraftsList] = useState<DraftItem[]>(() => readLocalDrafts(draftsKey));
  const [composerStateOwnerId, setComposerStateOwnerId] = useState(currentUser.id);

  // Publish state; upload progress is reported by Firebase Storage callbacks.
  const [postingStatus, setPostingStatus] = useState<'idle' | 'publishing' | 'completed' | 'failed'>('idle');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [errorMessage, setErrorMessage] = useState('');
  const [isMinimized, setIsMinimized] = useState(false);

  // Refs
  const videoPreviewRef = useRef<HTMLVideoElement>(null);
  const videoStreamRef = useRef<MediaStream | null>(null);
  const mediaRecorderVideoRef = useRef<MediaRecorder | null>(null);
  const videoChunksRef = useRef<Blob[]>([]);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const loopTimerRef = useRef<any>(null);
  const createdObjectUrlsRef = useRef<Set<string>>(new Set());
  const uploadAbortControllerRef = useRef<AbortController | null>(null);

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
    if (mediaRecorderVideoRef.current?.state !== 'inactive') mediaRecorderVideoRef.current?.stop();
    if (mediaRecorderRef.current?.state !== 'inactive') mediaRecorderRef.current?.stop();
    clearTrackedObjectUrls();
  }, []);

  useEffect(() => {
    localStorage.setItem('nexora_media_permissions_granted', permissionState);
  }, [permissionState]);

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
    if (!currentUser.id || currentUser.id === 'guest_visitor_id') return;
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
    }).catch(error => console.warn('[Composer] Cloud drafts could not be restored.', error));
    return () => { active = false; };
  }, [currentUser.id]);

  // Camera preview management
  useEffect(() => {
    let currentStream: MediaStream | null = null;
    if (activeMode === 'reel' && permissionState === 'granted' && currentStep === 2) {
      navigator.mediaDevices.getUserMedia({ video: { facingMode: cameraFacing }, audio: true })
        .then(stream => {
          currentStream = stream;
          videoStreamRef.current = stream;
          if (videoPreviewRef.current) {
            videoPreviewRef.current.srcObject = stream;
          }
        })
        .catch(err => console.error("Camera error: ", err));
    }
    return () => {
      if (currentStream) {
        currentStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [activeMode, permissionState, cameraFacing, currentStep]);

  // Reels Record timing loop
  useEffect(() => {
    if (isRecording && !isRecordingPaused) {
      loopTimerRef.current = setInterval(() => {
        setLoopTimerSecs(prev => {
          if (prev >= 30) {
            handleStopReelRecord();
            return 30;
          }
          return prev + 1;
        });
      }, 1000);
    } else {
      if (loopTimerRef.current) clearInterval(loopTimerRef.current);
    }
    return () => clearInterval(loopTimerRef.current);
  }, [isRecording, isRecordingPaused]);

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
    if (permissionState === 'granted') {
      callback();
    } else {
      setPermissionTarget(target);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    requestPermission('gallery', () => {
      void Promise.all(Array.from(files).slice(0, 10).map(async (file: File) => {
        try {
          await validateMediaFile(file, 'image');
        } catch (error) {
          window.dispatchEvent(new CustomEvent('toast', { detail: `⚠️ ${error instanceof Error ? error.message : 'Image validation failed.'}` }));
          return;
        }
        const reader = new FileReader();
        reader.onload = (ev) => {
          if (ev.target?.result) {
            setSelectedImages(prev => [
              ...prev,
              { url: ev.target!.result as string, rotation: 0, zoom: 1, cropOffset: { x: 0, y: 0 } }
            ]);
          }
        };
        reader.readAsDataURL(file);
      }));
    });
    e.target.value = '';
  };

  const captureCameraSnapshot = () => {
    requestPermission('camera', () => {
      const snaps = [
        'https://images.unsplash.com/photo-1547394765-185e1e68f34e?w=800&auto=format&fit=crop&q=80',
        'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop&q=80',
        'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=800&auto=format&fit=crop&q=80'
      ];
      const snapUrl = snaps[Math.floor(Math.random() * snaps.length)];
      setSelectedImages(prev => [...prev, { url: snapUrl, rotation: 0, zoom: 1, cropOffset: { x: 0, y: 0 } }]);
      window.dispatchEvent(new CustomEvent('toast', { detail: '📸 Captured high fidelity camera frame!' }));
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
          setVideoTrimStart(0);
          setVideoTrimEnd(Math.min(15, Math.max(1, Math.round(metadata.duration || 15))));
          setVideoDuration(metadata.duration || 15);
        } catch (error) {
          window.dispatchEvent(new CustomEvent('toast', { detail: `⚠️ ${error instanceof Error ? error.message : 'Video validation failed.'}` }));
        }
      })();
    });
    e.target.value = '';
  };

  const startReelRecording = () => {
    requestPermission('camera', () => {
      setCountdownTimer(3);
      const counter = setInterval(() => {
        setCountdownTimer(prev => {
          if (prev !== null && prev <= 1) {
            clearInterval(counter);
            setIsRecording(true);
            setIsRecordingPaused(false);
            setLoopTimerSecs(0);
            setRecordedVideoUrl(null);
            
            if (videoStreamRef.current) {
              try {
                videoChunksRef.current = [];
                const recorder = new MediaRecorder(videoStreamRef.current);
                mediaRecorderVideoRef.current = recorder;
                recorder.ondataavailable = (event) => {
                  if (event.data.size > 0) videoChunksRef.current.push(event.data);
                };
                recorder.onstop = () => {
                  const blob = new Blob(videoChunksRef.current, { type: 'video/webm' });
                  setRecordedVideoUrl(previous => {
                    revokeTrackedObjectUrl(previous);
                    return trackObjectUrl(URL.createObjectURL(blob));
                  });
                  setVideoRawBlob(blob);
                };
                recorder.start();
              } catch (e) {
                console.error(e);
              }
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
    if (mediaRecorderVideoRef.current && mediaRecorderVideoRef.current.state !== 'inactive') {
      try {
        mediaRecorderVideoRef.current.stop();
      } catch (e) {
        console.error(e);
      }
    } else {
      window.dispatchEvent(new CustomEvent('toast', { detail: 'No video was recorded. Check camera permission and try again.' }));
      return;
    }
    window.dispatchEvent(new CustomEvent('toast', { detail: 'Saving video recording…' }));
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
                    window.dispatchEvent(new CustomEvent('toast', { detail: error instanceof Error ? error.message : 'VOH could not transcribe this recording.' }));
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

  // AI assistant simulation
  const handleAiWritingAssistance = async (promptType: string) => {
    setLoadingTranscript(true);
    window.dispatchEvent(new CustomEvent('toast', { detail: '✨ Nexora is polishing writing...' }));
    try {
      const response = await authenticatedVohFetch('/api/voh-ai/improve-post', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: caption || "Drafting system setup instructions.", action: promptType })
      });
      if (response.ok) {
        const data = await response.json();
        if (data.improved) {
          setCaption(data.improved);
          window.dispatchEvent(new CustomEvent('toast', { detail: '✨ Caption optimized by AI!' }));
        }
      } else {
        throw new Error();
      }
    } catch (e) {
      const mockCaptions: Record<string, string> = {
        rewrite: `🚀 streamlined content creation engine in Nexora. Accelerating creator capability! #nexora #innovation`,
        shorten: `Accelerating creative workflows on Nexora. ⚡`,
        expand: `Absolutely thrilled to announce the rollout of Content Studio on Nexora. Designed for supreme responsiveness, we are cutting friction for modern creators. Check out the custom filters and multi-step publisher. #systemsdesign`,
        tags: `${caption} #developer #creativehub #nextgen #futureReady`,
        translate: `Studio de création de contenu Nexora. Publier des médias en toute fluidité. 🚀`
      };
      setCaption(mockCaptions[promptType] || caption);
      window.dispatchEvent(new CustomEvent('toast', { detail: '✨ Caption enhanced!' }));
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
    if (currentUser.id && currentUser.id !== 'guest_visitor_id' && navigator.onLine) {
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
    if (draft.cloudSynced && currentUser.id !== 'guest_visitor_id') {
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
    const uploadController = new AbortController();
    uploadAbortControllerRef.current = uploadController;
    setErrorMessage('');
    setPostingStatus('publishing');
    setUploadProgress(0);

    try {
      let mainImg = selectedImages[0]?.url || undefined;
      let finalVid = videoFileUrl || recordedVideoUrl || undefined;
      const durableImages: string[] = [];
      for (let index = 0; index < selectedImages.length; index += 1) {
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
          const publishBlob = hasEdits ? await renderEditedPhotoBlob(imageBlob, {
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
          const uploaded = await uploadMediaFile({
            file: publishBlob,
            userId: currentUser.id,
            fileName: `photo-${index + 1}-${Date.now()}.${hasEdits ? 'jpg' : (imageBlob.type.split('/')[1]?.replace('jpeg', 'jpg') || 'jpg')}`,
            signal: uploadController.signal,
            onProgress: progress => setUploadProgress(progress),
          });
          durableImages.push(uploaded.downloadUrl);
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
        try {
          const thumb = await generateVideoThumbnail(uploadVideoBlob);
          if (thumb) mainImg = thumb;
          if (isOffline) throw new Error('Connect to publish this video. Keep it as a draft and retry when online.');
          const uploaded = await uploadMediaFile({
            file: uploadVideoBlob,
            userId: currentUser.id,
            fileName: `video-${Date.now()}.${videoFileExtension(uploadVideoBlob.type) || 'video'}`,
            signal: uploadController.signal,
            onProgress: progress => setUploadProgress(progress),
          });
          finalVid = uploaded.downloadUrl;
          if (mainImg?.startsWith('data:')) {
            const thumbnail = await (await fetch(mainImg)).blob();
            const uploadedThumbnail = await uploadMediaFile({ file: thumbnail, userId: currentUser.id, fileName: `video-thumbnail-${Date.now()}.jpg`, signal: uploadController.signal });
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
          userId: currentUser.id,
          fileName: `voice-${Date.now()}.webm`,
          signal: uploadController.signal,
          onProgress: progress => setUploadProgress(progress),
        });
        finalVoiceUrl = uploadedVoice.downloadUrl;
      }

      let pollObj = undefined;
      if (activeMode === 'poll' && pollQuestion.trim()) {
        pollObj = {
          question: pollQuestion,
          options: pollOptionsList.filter(o => o.trim()).map((o, idx) => ({ id: `opt-${idx}`, text: o, votes: 0 }))
        };
      }

      const createdPostId = onAddPost(
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
          taggedUsernames: taggedUsernames.split(',').map(value => value.trim().replace(/^@/, '')).filter(Boolean).slice(0, 20),
          imageAltText: imageAltText.trim() || undefined,
          commentsAllowed,
        }
      );
      if (!createdPostId) throw new Error('Nexora could not confirm this post. Please sign in and retry.');

      setUploadProgress(100);
      setPostingStatus('completed');
      window.dispatchEvent(new CustomEvent('toast', { detail: '✨ Post Published Successfully!' }));
      setTimeout(() => {
        setIsMinimized(false);
        onClose();
        resetStates();
      }, 1500);
    } catch (err) {
      if (uploadController.signal.aborted) {
        setPostingStatus('idle');
        setUploadProgress(0);
        setErrorMessage('Upload canceled. Your draft is still available.');
        window.dispatchEvent(new CustomEvent('toast', { detail: 'Upload canceled. Your draft is still available.' }));
      } else {
        setPostingStatus('failed');
        setErrorMessage(err instanceof Error ? err.message : 'Publishing failed. Your draft is still available to retry.');
      }
    } finally {
      if (uploadAbortControllerRef.current === uploadController) uploadAbortControllerRef.current = null;
    }
  };

  // Dynamic Styles
  const getModalBg = () => 'bg-[#090714]/98 border-[#44376F]/70 text-white';

  const getStepButtonColor = (step: number) => {
    if (step === currentStep) return 'bg-violet-600 text-white shadow-lg shadow-violet-600/20';
    if (step < currentStep) return 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-400';
    return 'bg-[#120E2B]/65 border border-[#292244] text-[#8E88A7]';
  };

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-4 backdrop-blur-md bg-black/75 overflow-y-auto">
      
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
                <p className="text-xs text-[#A39BBF] mt-1">Save your work as a draft so you can come back to it later.</p>
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
                <h3 className="text-sm font-bold text-white">Allow camera and microphone access</h3>
                <p className="text-xs text-[#A39BBF] leading-relaxed mt-1">Allow access when you want to take a photo, record a video or make a voice note.</p>
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={() => { setPermissionState('denied'); setPermissionTarget(null); }}
                  className="flex-1 py-2 rounded-xl bg-[#120E2B] hover:bg-[#19143A] text-[#8E88A7] text-xs font-mono font-bold cursor-pointer transition-all"
                >
                  Deny
                </button>
                <button 
                  onClick={() => { setPermissionState('granted'); setPermissionTarget(null); }}
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
        className={`relative w-full max-w-2xl rounded-3xl p-5 md:p-6 border shadow-md flex flex-col max-h-[92vh] ${getModalBg()}`}
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
                  <span className="text-[11px] font-semibold tracking-wide text-violet-300">CREATE</span>
                </div>
                <h1 className="text-sm font-semibold font-sans tracking-tight text-[#EEEAF8]">Make something worth sharing</h1>
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

        {/* Dynamic 6-Step Indicator Track */}
        {activeTab !== 'drafts' && (
          <div className="flex items-center justify-between px-1.5 py-2.5 bg-[#080710]/40 border border-[#292244] rounded-2xl mb-4 shrink-0">
            {WIZARD_STEPS.map((st) => (
              <button 
                key={st.id}
                onClick={() => {
                  if (st.id <= currentStep) setCurrentStep(st.id);
                  else if (st.id === currentStep + 1) nextStep();
                }}
                disabled={st.id > currentStep + 1 || (st.id === currentStep + 1 && !activeMode)}
                className={`px-3 py-1 text-[10px] font-sans font-black uppercase rounded-lg transition-all ${getStepButtonColor(st.id)}`}
              >
                {st.id < currentStep ? '✓' : st.id}. {st.label}
              </button>
            ))}
          </div>
        )}

        {/* Dynamic Core Body */}
        <div className="flex-1 overflow-y-auto pr-1 space-y-4 text-left font-sans custom-scrollbar">
          
          {activeTab === 'drafts' ? (
            /* Draft Organizer Screen */
            <div className="space-y-3">
              <span className="text-[10px] font-mono text-[#A39BBF] uppercase tracking-widest block">Your drafts</span>
              {draftsList.length === 0 ? (
                <div className="py-12 border border-[#292244] border-dashed rounded-2xl text-center space-y-2">
                  <FolderHeart className="w-8 h-8 text-[#756D91] mx-auto animate-pulse" />
                  <p className="text-xs text-[#A39BBF] italic">No drafts yet. Save something you're working on and it will be waiting here.</p>
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
                          onClick={(e) => { e.stopPropagation(); if (d.cloudSynced && currentUser.id !== 'guest_visitor_id') deleteDraft(d.id, currentUser.id).catch(error => console.warn('[Composer] Draft delete failed.', error)); setDraftsList(prev => prev.filter(item => item.id !== d.id)); }}
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
                /* STEP 1: CHOOSE CONTENT TYPE */
                <div className="space-y-4 animate-fadeIn">
                  <div>
                    <span className="text-[10px] font-mono text-violet-400 uppercase tracking-widest block mb-1">CREATE SOMETHING</span>
                    <h3 className="text-sm font-black text-white uppercase">What would you like to share?</h3>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {[
                      { id: 'text', icon: FileText, label: 'Text post', color: 'border-[#7138FF]/20 hover:border-[#7138FF]/50 text-[#B69BFF]', desc: 'Share a thought, story or update.' },
                      { id: 'photo', icon: Camera, label: 'Photo', color: 'border-[#7138FF]/20 hover:border-[#7138FF]/50 text-[#B69BFF]', desc: 'Share a photo from your device or camera.' },
                      { id: 'carousel', icon: FileImage, label: 'Photo collection', color: 'border-[#7138FF]/20 hover:border-[#7138FF]/50 text-[#B69BFF]', desc: 'Share several photos together.' },
                      { id: 'video', icon: Video, label: 'Video post', color: 'border-[#7138FF]/20 hover:border-[#7138FF]/50 text-[#B69BFF]', desc: 'Share a full video with your own caption.' },
                      { id: 'reel', icon: Sparkle, label: 'Quick clip', color: 'border-[#7138FF]/20 hover:border-[#7138FF]/50 text-[#B69BFF]', desc: 'Capture a quick moment in your own style.' },
                      { id: 'voice', icon: Mic, label: 'Voice note', color: 'border-[#7138FF]/20 hover:border-[#7138FF]/50 text-[#B69BFF]', desc: 'Record a message in your own voice.' },
                      { id: 'poll', icon: BarChart2, label: 'Poll', color: 'border-[#7138FF]/20 hover:border-[#7138FF]/50 text-[#B69BFF]', desc: 'Ask a question and let people vote.' },
                      { id: 'pulse', icon: MapPin, label: 'Local update', color: 'border-[#7138FF]/20 hover:border-[#7138FF]/50 text-[#B69BFF]', desc: 'Share what is happening near you.' },
                      { id: 'community', icon: Users, label: 'Circle post', color: 'border-[#7138FF]/20 hover:border-[#7138FF]/50 text-[#B69BFF]', desc: 'Share something with your circle.' }
                    ].map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => { setActiveMode(item.id as any); setCurrentStep(2); }}
                        className={`p-3.5 text-left rounded-2xl bg-[#090812] border transition-all hover:bg-[#120E2B]/70 group cursor-pointer ${item.color}`}
                      >
                        <item.icon className="w-5 h-5 mb-1.5" />
                        <span className="block text-xs font-black text-white group-hover:text-violet-300">{item.label}</span>
                        <p className="text-[10px] text-[#8E88A7] leading-tight mt-1">{item.desc}</p>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {currentStep === 2 && (
                /* STEP 2: MEDIA IMPORT & RECORDING */
                <div className="space-y-4 animate-fadeIn">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-semibold text-[#B69BFF]">Step 2 of 6 · Add your content</span>
                    <button 
                      onClick={() => setCurrentStep(1)} 
                      className="text-xs text-violet-400 hover:underline flex items-center gap-1 font-bold"
                    >
                      Choose another
                    </button>
                  </div>

                  {activeMode === 'photo' && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Drag upload zone */}
                      <div className="border border-[#292244] border-dashed rounded-2xl p-6 text-center space-y-3 bg-[#120E2B]/45 hover:border-white/10 transition-all flex flex-col items-center justify-center">
                        <FileImage className="w-8 h-8 text-[#8E88A7] animate-bounce" />
                        <div className="space-y-1">
                          <p className="text-xs text-[#D1CBE3] font-bold">Add a photo</p>
                          <p className="text-[10px] text-[#8E88A7] font-sans">Choose a photo from your device.</p>
                        </div>
                        <label className="px-4 py-2 bg-[#120E2B] hover:bg-[#19143A] border border-[#292244] text-white rounded-xl text-xs font-mono font-bold cursor-pointer transition-all">
                          Choose from device
                          <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                        </label>
                      </div>

                      {/* Snap device simulation */}
                      <div className="border border-[#292244] rounded-2xl p-4 text-center space-y-4 bg-[#120E2B]/70 flex flex-col justify-between">
                        <div className="space-y-1">
                          <span className="text-[9px] font-mono text-violet-400 uppercase tracking-wider block">Take a photo</span>
                          <p className="text-[10px] text-[#8E88A7]">Use your camera to take a photo.</p>
                        </div>
                        <button 
                          onClick={captureCameraSnapshot}
                          className="w-full py-2.5 bg-[linear-gradient(135deg,#8A3FFC_0%,#4B10F2_58%,#1600A3_100%)] text-white text-xs font-mono font-bold rounded-xl shadow-lg cursor-pointer hover:brightness-110 active:scale-95 transition-all"
                        >
                          Take photo
                        </button>
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
                    </div>
                  )}

                  {activeMode === 'carousel' && (
                    <div className="space-y-3">
                      <div className="border border-[#292244] border-dashed rounded-2xl p-6 text-center space-y-3 bg-[#080712]/30">
                        <FileImage className="w-8 h-8 text-[#8E88A7] mx-auto" />
                        <p className="text-xs text-[#D1CBE3] font-bold">Add photos to your collection</p>
                        <label className="px-4 py-2 bg-[#120E2B] hover:bg-[#19143A] border border-[#292244] text-white rounded-xl text-xs font-mono font-bold cursor-pointer transition-all inline-block">
                          Add multiple images
                          <input type="file" multiple accept="image/*" className="hidden" onChange={handleImageUpload} />
                        </label>
                      </div>

                      {selectedImages.length > 0 && (
                        <div className="space-y-2 bg-[#120E2B]/70 p-3 rounded-xl border border-[#292244]">
                          <span className="text-[9px] font-mono text-[#A39BBF] uppercase">Your photos ({selectedImages.length}) · Arrange them in the order you want</span>
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                            {selectedImages.map((img, index) => (
                              <div key={index} className="relative aspect-square rounded-lg border border-[#292244] overflow-hidden group">
                                <img src={img.url} className="w-full h-full object-cover" />
                                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
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
                        <p className="text-[10px] text-[#8E88A7]">Choose a video from your device (up to 50 MB).</p>
                      </div>
                      <label className="px-4 py-2 bg-[#120E2B] hover:bg-[#19143A] border border-[#292244] text-white rounded-xl text-xs font-mono font-bold cursor-pointer transition-all inline-block">
                        Choose video
                        <input type="file" accept="video/*" className="hidden" onChange={handleVideoUpload} />
                      </label>
                      {videoFileUrl && (
                        <div className="max-w-xs mx-auto p-2 bg-[#120E2B] border border-[#292244] rounded-xl space-y-1">
                          <p className="text-[10px] text-emerald-300 font-semibold">✓ Video selected</p>
                          <video src={videoFileUrl} controls className="w-full rounded-lg" />
                        </div>
                      )}
                    </div>
                  )}

                  {activeMode === 'reel' && (
                    /* REEL INTERACTIVE CAMERA */
                    <div className="space-y-3">
                      <div className="relative aspect-[4/5] w-full max-w-[320px] mx-auto rounded-2xl overflow-hidden bg-black border border-[#44376F] flex flex-col justify-between p-3.5 shadow-md">
                        <div className="z-10 flex justify-between items-center text-[8px] font-mono text-[#A39BBF]">
                          <span className="bg-black/70 px-2 py-0.5 rounded border border-white/5">YOUR CAMERA</span>
                          <button onClick={() => setCameraFacing(prev => prev === 'user' ? 'environment' : 'user')} className="p-1.5 bg-[#120E2B] rounded-full text-white">
                            <RefreshCw className="w-3 h-3" />
                          </button>
                        </div>

                        <div className="absolute inset-0 z-0 flex items-center justify-center">
                          {countdownTimer !== null ? (
                            <span className="text-5xl font-black text-white animate-ping">{countdownTimer}</span>
                          ) : recordedVideoUrl ? (
                            <video src={recordedVideoUrl} autoPlay loop muted className="w-full h-full object-cover" />
                          ) : (
                            <video ref={videoPreviewRef} autoPlay muted playsInline className="w-full h-full object-cover bg-[#120E2B]" />
                          )}
                        </div>

                        <div className="z-10 flex flex-col items-center gap-2">
                          {isRecording ? (
                            <button onClick={handleStopReelRecord} className="w-12 h-12 bg-rose-600 rounded-full border-2 border-white animate-pulse flex items-center justify-center text-[10px] text-white font-bold font-mono">
                              Stop recording
                            </button>
                          ) : (
                            <button onClick={startReelRecording} className="w-14 h-14 bg-linear-to-tr from-[#8A3FFC] to-[#1600A3] rounded-full border-4 border-black flex items-center justify-center text-[10px] text-white font-black font-mono shadow-md cursor-pointer">
                              Start recording
                            </button>
                          )}
                          {isRecording && <span className="text-[9px] font-mono bg-black/60 text-white px-2 py-0.5 rounded-full">Recording: {loopTimerSecs}s</span>}
                        </div>
                      </div>
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
                    <h3 className="text-base font-bold text-white">Review your photo or video</h3>
                    <p className="mt-1 text-xs leading-relaxed text-[#A39BBF]">Check your media before adding a caption and sharing it.</p>
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
                          <p className="text-xs">Your photo or video preview will appear here.</p>
                        </div>
                      )}
                    </div>

                    {/* Photo adjustments are only shown when a photo is selected. */}
                    <div className={`${selectedImages.length > 0 ? 'space-y-3.5 bg-[#120E2B]/70 p-4 rounded-2xl border border-[#292244]/60' : 'hidden'}`}>
                      <span className="text-[10px] font-mono text-[#A39BBF] uppercase block tracking-wider pt-1">Photo adjustments</span>
                      
                      {/* Interactive CSS filters row */}
                      {selectedImages.length > 0 && (
                        <div className="space-y-1.5">
                          <span className="text-[9px] font-mono text-[#8E88A7] block uppercase">Choose a look</span>
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
                        <p className="text-sm leading-relaxed text-[#EEEAF8]">Review your clip on the left. Add a caption and details next, then preview it before sharing.</p>
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
                        onChange={(e) => setTaggedUsernames(e.target.value)}
                        placeholder="@username, @username"
                        className="w-full bg-[#10102A]/85 border border-[#292244] rounded-xl px-3 py-2 text-xs text-white"
                      />
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
                            <span className="text-amber-400">Add a short photo description to help people using screen readers.</span>
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
                            <span className="text-xs font-bold text-[#EEEAF8] block">Public post</span>
                            <p className="mt-1 text-[11px] leading-relaxed text-[var(--nx-muted)]">Anyone on NEXORA can see this post.</p>
                          </div>
                          <span className="shrink-0 rounded-full border border-[#7138FF]/40 bg-[#7138FF]/15 px-2.5 py-1 text-[10px] font-semibold text-[#C7B5FF]">Everyone</span>
                        </div>
                        <label className="flex items-center justify-between gap-3 border-t border-[#292244] pt-3 text-xs text-[#EEEAF8]">
                          <span>Allow comments</span>
                          <input type="checkbox" checked={commentsAllowed} onChange={(event) => setCommentsAllowed(event.target.checked)} className="h-4 w-4 accent-violet-500" />
                        </label>
                        <p className="text-[10px] leading-relaxed text-[#8E88A7]">Private audience options will appear here when they are fully supported and protected.</p>
                      </div>

                    </div>
                  ) : (
                    /* Dynamic Publish Loading indicators */
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
                        <div className="relative w-16 h-16 flex items-center justify-center flex-col">
                          <NexoraLoader size="md" />
                          <span className="text-[10px] font-mono text-violet-400 mt-4 font-black">{uploadProgress}%</span>
                        </div>
                      )}

                      <div className="space-y-1">
                        <span className="text-[10px] font-mono text-[#8E88A7] uppercase block tracking-wider">
                          {postingStatus === 'publishing' && '📤 Sharing your post...'}
                          {postingStatus === 'completed' && '✨ Your post is live!'}
                        </span>
                        <p className="text-xs text-[#D1CBE3] font-sans">
                          {postingStatus === 'completed' ? 'Your post has been shared.' : postingStatus === 'failed' ? (errorMessage || 'Publishing failed. Your content is safe to retry.') : 'Getting your post ready...'}
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

        {/* Wizard Footer controls */}
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
                  {activeTab === 'story' ? 'Share story' : 'Share post'}
                </button>
              )}
            </div>
          </div>
        )}

      </motion.div>


    </div>
  );
}
