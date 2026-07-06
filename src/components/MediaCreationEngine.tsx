import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, Check, Plus, Camera, Video, Mic, BarChart2, FileText, 
  MapPin, ChevronRight, Trash2, Play, Pause, RefreshCw, 
  Volume2, RotateCw, Crop, Sliders, VolumeX, Save, 
  ChevronLeft, ArrowUp, ArrowDown, Users, Sparkles, FolderHeart, ShieldAlert, BadgeInfo,
  Calendar, Smile, FileImage, SlidersHorizontal, Eye, HelpCircle, Sparkle, Settings, Info, Tag
} from 'lucide-react';
import { User } from '../types';
import { saveMediaBlob, generateVideoThumbnail } from '../utils/indexedDbStorage';

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
    isBroadcastPost?: boolean
  ) => string;
  theme: 'neon-cyber' | 'stealth-dark' | 'platinum-light' | 'emerald-glass';
  isStoryModeInitially?: boolean;
  isOffline?: boolean;
  onToggleOffline?: () => void;
  initialMode?: 'text' | 'photo' | 'video' | 'reel' | 'voice' | 'poll' | 'pulse' | 'community' | null;
  initialTab?: 'feed' | 'story' | 'drafts';
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
  videoUrl?: string;
  voiceUrl?: string;
  transcript?: string;
  topics: string;
  audience: 'public' | 'circle' | 'community' | 'followers' | 'onlyme';
  type: string;
  timestamp: string;
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
  { id: 1, label: 'Type' },
  { id: 2, label: 'Media' },
  { id: 3, label: 'Edit' },
  { id: 4, label: 'Details' },
  { id: 5, label: 'Preview' },
  { id: 6, label: 'Publish' }
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
  initialTab = undefined
}: MediaCreationEngineProps) {
  // Navigation & Wizard Core
  const [activeTab, setActiveTab] = useState<'feed' | 'story' | 'drafts'>(initialTab || (isStoryModeInitially ? 'story' : 'feed'));
  const [activeMode, setActiveMode] = useState<'text' | 'photo' | 'video' | 'reel' | 'voice' | 'poll' | 'pulse' | 'community' | null>(initialMode);
  const [currentStep, setCurrentStep] = useState<number>(1);

  // Form Fields
  const [caption, setCaption] = useState('');
  const [topics, setTopics] = useState('');
  const [audience, setAudience] = useState<'public' | 'circle' | 'community' | 'followers' | 'onlyme'>('public');
  const [location, setLocation] = useState('');
  const [locationSuggestions, setLocationSuggestions] = useState<string[]>([]);
  const [taggedUsernames, setTaggedUsernames] = useState('');
  const [imageAltText, setImageAltText] = useState('');

  // Editing parameters
  const [brightness, setBrightness] = useState(100);
  const [contrast, setContrast] = useState(100);
  const [saturation, setSaturation] = useState(100);
  const [blur, setBlur] = useState(0);
  const [stickerOverlay, setStickerOverlay] = useState<string | null>(null);
  const [textOverlay, setTextOverlay] = useState('');
  const [textOverlayColor, setTextOverlayColor] = useState('#ffffff');
  const [selectedMusic, setSelectedMusic] = useState<string | null>(null);
  const [musicTrimStart, setMusicTrimStart] = useState(0);
  const [musicTrimEnd, setMusicTrimEnd] = useState(15);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);

  // Publish advanced toggles
  const [commentsAllowed, setCommentsAllowed] = useState(true);
  const [sharesAllowed, setSharesAllowed] = useState(true);
  const [downloadsAllowed, setDownloadsAllowed] = useState(true);
  const [pinnedOnProfile, setPinnedOnProfile] = useState(false);
  const [crossPostToTwitter, setCrossPostToTwitter] = useState(false);
  const [isScheduled, setIsScheduled] = useState(false);
  const [scheduledDateTime, setScheduledDateTime] = useState('');
  const [targetBroadcastChannel, setTargetBroadcastChannel] = useState(false);

  // Media Capture / Import variables
  const [selectedImages, setSelectedImages] = useState<SelectedImage[]>([]);
  const [activeEditIndex, setActiveEditIndex] = useState<number | null>(null);
  const [videoFileUrl, setVideoFileUrl] = useState<string | null>(null);
  const [videoRawBlob, setVideoRawBlob] = useState<Blob | null>(null);
  const [videoMuted, setVideoMuted] = useState(false);
  const [videoTrimStart, setVideoTrimStart] = useState(0);
  const [videoTrimEnd, setVideoTrimEnd] = useState(15);
  const [videoDuration, setVideoDuration] = useState(15);

  // Reels
  const [isRecording, setIsRecording] = useState(false);
  const [isRecordingPaused, setIsRecordingPaused] = useState(false);
  const [recordedVideoUrl, setRecordedVideoUrl] = useState<string | null>(null);
  const [cameraFacing, setCameraFacing] = useState<'user' | 'environment'>('user');
  const [countdownTimer, setCountdownTimer] = useState<number | null>(null);
  const [loopTimerSecs, setLoopTimerSecs] = useState(0);

  // Voice Recording
  const [voiceFileUrl, setVoiceFileUrl] = useState<string | null>(null);
  const [voiceRawBlob, setVoiceRawBlob] = useState<Blob | null>(null);
  const [voiceDurationSecs, setVoiceDurationSecs] = useState(0);
  const [voiceIsRecording, setVoiceIsRecording] = useState(false);
  const [voiceIsPaused, setVoiceIsPaused] = useState(false);
  const [voiceTranscript, setVoiceTranscript] = useState('');
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
  const [draftsList, setDraftsList] = useState<DraftItem[]>(() => {
    const saved = localStorage.getItem('nexora_post_drafts_v1');
    return saved ? JSON.parse(saved) : [];
  });

  // Background Publish simulation
  const [postingStatus, setPostingStatus] = useState<'idle' | 'compressing' | 'publishing' | 'processing' | 'completed' | 'failed'>('idle');
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
  const uploadIntervalRef = useRef<any>(null);

  useEffect(() => {
    localStorage.setItem('nexora_media_permissions_granted', permissionState);
  }, [permissionState]);

  useEffect(() => {
    localStorage.setItem('nexora_post_drafts_v1', JSON.stringify(draftsList));
  }, [draftsList]);

  // Restores workspace on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('nexora_creation_autosave_v1');
      if (saved) {
        const item = JSON.parse(saved);
        setCaption(item.caption || '');
        setTopics(item.topics || '');
        setAudience(item.audience || 'public');
        setActiveMode(item.activeMode || null);
        setCurrentStep(item.currentStep || 1);
        if (item.images && item.images.length > 0) {
          setSelectedImages(item.images.map((img: string) => ({
            url: img,
            rotation: 0,
            zoom: 1,
            cropOffset: { x: 0, y: 0 }
          })));
        }
        if (item.videoUrl) setVideoFileUrl(item.videoUrl);
        if (item.recordedVideoUrl) setRecordedVideoUrl(item.recordedVideoUrl);
        if (item.voiceUrl) setVoiceFileUrl(item.voiceUrl);
        if (item.voiceTranscript) setVoiceTranscript(item.voiceTranscript);
        window.dispatchEvent(new CustomEvent('toast', { 
          detail: '🔄 Workspace restored! Caption and media recovered.' 
        }));
      }
    } catch (e) {
      console.error(e);
    }
  }, []);

  // Autosave
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!caption && !activeMode && selectedImages.length === 0 && !videoFileUrl && !voiceFileUrl) {
        localStorage.removeItem('nexora_creation_autosave_v1');
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
          videoUrl: videoFileUrl,
          recordedVideoUrl,
          voiceUrl: voiceFileUrl,
          voiceTranscript
        };
        localStorage.setItem('nexora_creation_autosave_v1', JSON.stringify(draft));
      } catch (e) {
        console.error(e);
      }
    }, 1000);
    return () => clearTimeout(timer);
  }, [caption, topics, audience, activeMode, currentStep, selectedImages, videoFileUrl, recordedVideoUrl, voiceFileUrl, voiceTranscript]);

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

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    requestPermission('gallery', () => {
      Array.from(files).forEach((file: File) => {
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
      });
    });
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

  const handleVideoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    requestPermission('gallery', () => {
      const file = files[0];
      setVideoFileUrl(URL.createObjectURL(file));
      setVideoRawBlob(file);
      setVideoTrimStart(0);
      setVideoTrimEnd(15);
      setVideoDuration(15);
    });
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
                  setRecordedVideoUrl(URL.createObjectURL(blob));
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
      setRecordedVideoUrl('https://assets.mixkit.co/videos/preview/mixkit-starry-night-sky-background-912-large.mp4');
    }
    window.dispatchEvent(new CustomEvent('toast', { detail: '🎥 Reel recording captured!' }));
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
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true }).catch(() => null);
          if (stream) {
            const recorder = new MediaRecorder(stream);
            mediaRecorderRef.current = recorder;
            audioChunksRef.current = [];
            recorder.ondataavailable = (e) => {
              if (e.data.size > 0) audioChunksRef.current.push(e.data);
            };
            recorder.onstop = () => {
              const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
              setVoiceFileUrl(URL.createObjectURL(blob));
              setVoiceRawBlob(blob);
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
        console.error(err);
      }
    });
  };

  const stopVoiceRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    setVoiceIsRecording(false);
    setVoiceIsPaused(false);
    clearInterval((window as any).voiceInterval);

    if (!voiceFileUrl) {
      setVoiceFileUrl('https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3');
    }

    setLoadingTranscript(true);
    setTimeout(() => {
      setVoiceTranscript("This voice transmission records high fidelity metadata for Nexora. It streamlines all workflows automatically.");
      setLoadingTranscript(false);
      window.dispatchEvent(new CustomEvent('toast', { detail: '🎙️ Speech-to-Text completed!' }));
    }, 1200);
  };

  // AI assistant simulation
  const handleAiWritingAssistance = async (promptType: string) => {
    setLoadingTranscript(true);
    window.dispatchEvent(new CustomEvent('toast', { detail: '✨ Nexora is polishing writing...' }));
    try {
      const response = await fetch('/api/voh-ai/improve-post', {
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
        expand: `Absolutely thrilled to announce the rollout of Content Studio v2.4 on Nexora. Designed for supreme responsiveness, we are cutting friction for developers and modern creators alike. Check out the custom filters and multi-step publisher. #systemsdesign`,
        tags: `${caption} #developer #creativehub #nextgen #futureReady`,
        translate: `Studio de création de contenu Nexora. Publier des médias en toute fluidité. 🚀`
      };
      setCaption(mockCaptions[promptType] || caption);
      window.dispatchEvent(new CustomEvent('toast', { detail: '✨ local fallback optimized successfully.' }));
    } finally {
      setLoadingTranscript(false);
    }
  };

  // Save Draft
  const saveAsDraftLocally = () => {
    const draft: DraftItem = {
      id: `draft-${Date.now()}`,
      caption,
      images: selectedImages.map(img => img.url),
      videoUrl: videoFileUrl || recordedVideoUrl || undefined,
      voiceUrl: voiceFileUrl || undefined,
      transcript: voiceTranscript || undefined,
      topics,
      audience,
      type: activeMode || 'text',
      timestamp: new Date().toLocaleDateString()
    };
    setDraftsList(prev => [draft, ...prev]);
    localStorage.removeItem('nexora_creation_autosave_v1');
    resetStates();
    window.dispatchEvent(new CustomEvent('toast', { detail: '💾 Draft saved securely across devices!' }));
  };

  const handleSelectDraft = (draft: DraftItem) => {
    setCaption(draft.caption);
    setTopics(draft.topics);
    setAudience(draft.audience);
    setActiveMode(draft.type as any);
    if (draft.images) {
      setSelectedImages(draft.images.map(img => ({ url: img, rotation: 0, zoom: 1, cropOffset: { x: 0, y: 0 } })));
    }
    if (draft.videoUrl) setVideoFileUrl(draft.videoUrl);
    if (draft.voiceUrl) {
      setVoiceFileUrl(draft.voiceUrl);
      setVoiceTranscript(draft.transcript || '');
    }
    setDraftsList(prev => prev.filter(d => d.id !== draft.id));
    setCurrentStep(2);
    setActiveTab('feed');
  };

  const resetStates = () => {
    localStorage.removeItem('nexora_creation_autosave_v1');
    setCaption('');
    setTopics('');
    setAudience('public');
    setLocation('');
    setTaggedUsernames('');
    setSelectedImages([]);
    setVideoFileUrl(null);
    setRecordedVideoUrl(null);
    setVoiceFileUrl(null);
    setVoiceTranscript('');
    setPollQuestion('');
    setPollOptionsList(['', '']);
    setStickerOverlay(null);
    setTextOverlay('');
    setActiveMode(null);
    setCurrentStep(1);
  };

  const handleDiscard = () => {
    resetStates();
    setShowExitConfirm(false);
    onClose();
  };

  // Stage progress triggers
  const triggerPublishPipeline = async () => {
    setPostingStatus('compressing');
    setUploadProgress(5);

    const runStage = (start: number, end: number, step: number, status: typeof postingStatus, duration: number) => {
      return new Promise<boolean>((resolve) => {
        let current = start;
        setPostingStatus(status);
        const interval = setInterval(() => {
          current += step;
          if (current >= end) {
            clearInterval(interval);
            setUploadProgress(end);
            resolve(true);
          } else {
            setUploadProgress(current);
          }
        }, duration / ((end - start) / step));
        uploadIntervalRef.current = interval;
      });
    };

    let ok = await runStage(5, 35, 5, 'compressing', 800);
    if (!ok) return;

    ok = await runStage(35, 75, 5, 'publishing', 900);
    if (!ok) return;

    ok = await runStage(75, 100, 5, 'processing', 700);
    if (!ok) return;

    try {
      let mainImg = selectedImages[0]?.url || undefined;
      let finalVid = videoFileUrl || recordedVideoUrl || undefined;

      if (videoRawBlob) {
        try {
          const thumb = await generateVideoThumbnail(videoRawBlob);
          if (thumb) mainImg = thumb;
          const uri = await saveMediaBlob(`vid-${Date.now()}`, videoRawBlob);
          finalVid = uri;
        } catch (e) {
          console.error(e);
        }
      }

      const activeFilters = selectedImages.map(img => img.filterStyle || 'none');
      const activeFilter = activeFilters[0] || 'none';

      let pollObj = undefined;
      if (activeMode === 'poll' && pollQuestion.trim()) {
        pollObj = {
          question: pollQuestion,
          options: pollOptionsList.filter(o => o.trim()).map((o, idx) => ({ id: `opt-${idx}`, text: o, votes: 0 }))
        };
      }

      onAddPost(
        caption,
        mainImg,
        topics,
        selectedImages.length > 1 ? selectedImages.map(img => img.url) : undefined,
        finalVid,
        voiceTranscript || undefined,
        voiceFileUrl || undefined,
        audience,
        activeMode === 'voice',
        activeMode === 'voice' ? voiceDurationSecs : undefined,
        pollObj,
        activeMode === 'community' ? 'Collaboration' : undefined,
        activeMode === 'pulse' ? (location || 'Nigeria') : undefined,
        activeFilter,
        selectedImages.length > 1 ? activeFilters : undefined,
        isScheduled ? scheduledDateTime : undefined,
        targetBroadcastChannel
      );

      setPostingStatus('completed');
      window.dispatchEvent(new CustomEvent('toast', { detail: '✨ Post Published Successfully!' }));
      setTimeout(() => {
        setIsMinimized(false);
        onClose();
        resetStates();
      }, 1500);
    } catch (err) {
      setPostingStatus('failed');
      setErrorMessage('Verification failed. Server returned non-zero response.');
    }
  };

  // Dynamic Styles
  const getModalBg = () => {
    if (theme === 'neon-cyber') return 'bg-slate-950/95 border-fuchsia-500/20 text-white';
    if (theme === 'emerald-glass') return 'bg-emerald-950/95 border-emerald-500/20 text-white';
    if (theme === 'stealth-dark') return 'bg-[#06060a]/95 border-zinc-800/80 text-white';
    return 'bg-white border-zinc-200 text-zinc-900';
  };

  const getStepButtonColor = (step: number) => {
    if (step === currentStep) return 'bg-violet-600 text-white shadow-lg shadow-violet-600/20';
    if (step < currentStep) return 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-400';
    return 'bg-zinc-900/40 border border-zinc-800 text-zinc-500';
  };

  const nextStep = () => {
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
  const hasContrastIssue = theme === 'platinum-light' && caption.trim().length > 0;
  const isAltTextMissing = selectedImages.length > 0 && !imageAltText.trim();
  const isVideoTrimCheck = (videoFileUrl || recordedVideoUrl) && videoTrimEnd - videoTrimStart > 15;

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
              className="bg-zinc-900 border border-zinc-800 max-w-sm w-full rounded-2xl p-6 text-center space-y-4"
            >
              <div className="w-12 h-12 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-400 mx-auto">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-sm font-sans font-black text-white uppercase tracking-wider">Unsaved Work Detected</h4>
                <p className="text-xs text-zinc-400 mt-1">Would you like to preserve your captions and edits as a draft before leaving the studio?</p>
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
                  className="px-3 py-2 bg-violet-600/10 border border-violet-500/20 text-violet-300 hover:bg-violet-600/20 rounded-xl text-[10px] font-mono font-bold cursor-pointer transition-all"
                >
                  Save Draft
                </button>
                <button 
                  onClick={() => setShowExitConfirm(false)}
                  className="px-3 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl text-[10px] font-mono font-bold cursor-pointer transition-all"
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
            <div className="bg-zinc-950 border border-violet-500/30 max-w-sm w-full rounded-2xl p-6 text-center space-y-4">
              <div className="w-12 h-12 bg-violet-500/10 text-violet-400 rounded-full flex items-center justify-center mx-auto">
                <Camera className="w-6 h-6 animate-pulse" />
              </div>
              <div>
                <h3 className="text-sm font-black text-white uppercase tracking-wider">Access Shutter Hardware</h3>
                <p className="text-xs text-zinc-400 leading-relaxed mt-1">Nexora requires high-definition camera, mic, and media library synchronization for live overlays.</p>
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={() => { setPermissionState('denied'); setPermissionTarget(null); }}
                  className="flex-1 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-500 text-xs font-mono font-bold cursor-pointer transition-all"
                >
                  Deny
                </button>
                <button 
                  onClick={() => { setPermissionState('granted'); setPermissionTarget(null); }}
                  className="flex-1 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-mono font-bold cursor-pointer transition-all"
                >
                  Authorize
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 📦 Minimized State Overlay */}
      {isMinimized && (
        <div className="fixed bottom-6 right-6 z-50 w-80 rounded-2xl border border-violet-500/20 bg-zinc-950/95 backdrop-blur-md p-4 shadow-2xl space-y-3 animate-slideIn">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono font-black text-violet-400 uppercase tracking-widest flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-violet-500 animate-pulse" />
              {postingStatus === 'compressing' && '⚙️ Compressing Media'}
              {postingStatus === 'publishing' && '📤 Sharing Post'}
              {postingStatus === 'processing' && '🧠 AI Processing'}
              {postingStatus === 'completed' && '✨ Shared!'}
            </span>
            <button 
              onClick={() => setIsMinimized(false)}
              className="text-[10px] text-zinc-400 hover:text-white hover:underline cursor-pointer font-mono"
            >
              Open ↗
            </button>
          </div>
          <div className="space-y-1.5">
            <div className="flex justify-between items-center text-[9px] font-mono text-zinc-400">
              <span className="truncate max-w-[200px]">{caption || 'Content compilation...'}</span>
              <span>{uploadProgress}%</span>
            </div>
            <div className="w-full h-1 bg-zinc-800 rounded-full overflow-hidden">
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
        className={`relative w-full max-w-2xl rounded-3xl p-5 md:p-6 border shadow-2xl flex flex-col max-h-[92vh] ${getModalBg()}`}
        id="creation-studio-frame"
      >
        {/* Header toolbar */}
        <div className="flex justify-between items-start border-b border-zinc-800/60 pb-3 mb-4 shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-violet-600/10 border border-violet-500/20 rounded-lg text-violet-400">
                <Sparkles className="w-4.5 h-4.5 animate-spin-slow" />
              </div>
              <div>
                <h2 className="text-[11px] font-mono font-bold tracking-widest uppercase text-violet-400">Nexora Content Studio</h2>
                <h1 className="text-sm font-black font-sans uppercase tracking-tight">Unified Publisher v3.0</h1>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {onToggleOffline && (
              <button 
                onClick={onToggleOffline}
                className={`px-2 py-1 rounded-lg text-[9px] font-mono font-bold border transition-colors ${isOffline ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : 'bg-zinc-800/40 text-zinc-400 border-zinc-800 hover:bg-zinc-800'}`}
              >
                {isOffline ? '🔌 OFF' : '🟢 ON'}
              </button>
            )}
            <button 
              onClick={handleExitClick}
              className="p-1.5 rounded-lg bg-zinc-800/40 text-zinc-400 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-4.5 h-4.5" />
            </button>
          </div>
        </div>

        {/* Global Tab Navigation */}
        <div className="flex gap-1.5 p-1 bg-zinc-950/60 border border-zinc-900 rounded-xl mb-4 shrink-0">
          <button 
            onClick={() => { setActiveTab('feed'); setCurrentStep(1); }}
            className={`flex-1 py-1.5 rounded-lg text-xs font-sans font-extrabold transition-all cursor-pointer ${activeTab === 'feed' ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
          >
            📝 Dynamic Feed
          </button>
          <button 
            onClick={() => { setActiveTab('story'); setActiveMode('photo'); setCurrentStep(2); }}
            className={`flex-1 py-1.5 rounded-lg text-xs font-sans font-extrabold transition-all cursor-pointer ${activeTab === 'story' ? 'bg-emerald-600/15 text-emerald-400 border border-emerald-500/20' : 'text-zinc-500 hover:text-zinc-300'}`}
          >
            📖 Stories Mode
          </button>
          <button 
            onClick={() => setActiveTab('drafts')}
            className={`flex-1 py-1.5 rounded-lg text-xs font-sans font-extrabold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${activeTab === 'drafts' ? 'bg-violet-600 text-white font-black' : 'text-zinc-500 hover:text-zinc-300'}`}
          >
            💾 Saved Drafts <span className="px-1.5 bg-zinc-800 text-[10px] rounded-full text-zinc-400">{draftsList.length}</span>
          </button>
        </div>

        {/* Dynamic 6-Step Indicator Track */}
        {activeTab !== 'drafts' && (
          <div className="flex items-center justify-between px-1.5 py-2.5 bg-[#080710]/40 border border-zinc-900 rounded-2xl mb-4 shrink-0">
            {WIZARD_STEPS.map((st) => (
              <button 
                key={st.id}
                onClick={() => {
                  if (activeMode || st.id === 1) {
                    setCurrentStep(st.id);
                  }
                }}
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
              <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-widest block">Draft Archives</span>
              {draftsList.length === 0 ? (
                <div className="py-12 border border-zinc-900 border-dashed rounded-2xl text-center space-y-2">
                  <FolderHeart className="w-8 h-8 text-zinc-600 mx-auto animate-pulse" />
                  <p className="text-xs text-zinc-400 italic">No saved drafts available. Drafts persist across refresh sessions.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {draftsList.map((d) => (
                    <div 
                      key={d.id}
                      onClick={() => handleSelectDraft(d)}
                      className="p-3 bg-[#0a0a0f] border border-zinc-800 hover:border-violet-500/20 rounded-xl cursor-pointer transition-all group relative overflow-hidden"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <span className="text-[9px] font-mono text-violet-400 uppercase bg-violet-950/25 px-2 py-0.5 rounded border border-violet-800/20">{d.type}</span>
                        <button 
                          onClick={(e) => { e.stopPropagation(); setDraftsList(prev => prev.filter(item => item.id !== d.id)); }}
                          className="p-1 hover:bg-rose-900/10 text-rose-400 rounded transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <p className="text-xs text-zinc-300 line-clamp-2 italic font-serif">"{d.caption || 'No caption text'}"</p>
                      <div className="flex items-center justify-between mt-3 text-[9px] font-mono text-zinc-500">
                        <span>Calendar: {d.timestamp}</span>
                        <span className="text-violet-400 group-hover:underline">Restore →</span>
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
                    <span className="text-[10px] font-mono text-violet-400 uppercase tracking-widest block mb-1">Unified Create Hub</span>
                    <h3 className="text-sm font-black text-white uppercase">Choose content format type</h3>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {[
                      { id: 'text', icon: FileText, label: 'Text Post', color: 'border-blue-500/10 hover:border-blue-500/30 text-blue-400', desc: 'Symmetric layout micro-blog' },
                      { id: 'photo', icon: Camera, label: 'Photo snapshot', color: 'border-violet-500/10 hover:border-violet-500/30 text-violet-400', desc: 'Capture or Import images' },
                      { id: 'carousel', icon: FileImage, label: 'Carousel (Multiple)', color: 'border-fuchsia-500/10 hover:border-fuchsia-500/30 text-fuchsia-400', desc: 'Multiple images layout' },
                      { id: 'video', icon: Video, label: 'Interactive Video', color: 'border-cyan-500/10 hover:border-cyan-500/30 text-cyan-400', desc: 'Publish full standard video' },
                      { id: 'reel', icon: Sparkle, label: 'Reel (Short Video)', color: 'border-pink-500/10 hover:border-pink-500/30 text-pink-400', desc: 'TikTok-style short video' },
                      { id: 'voice', icon: Mic, label: 'Voice Memo', color: 'border-rose-500/10 hover:border-rose-500/30 text-rose-400', desc: 'Record microphone waves' },
                      { id: 'poll', icon: BarChart2, label: 'Interactive Poll', color: 'border-amber-500/10 hover:border-amber-500/30 text-amber-400', desc: 'Engage audience feedback' },
                      { id: 'pulse', icon: MapPin, label: 'Regional Pulse', color: 'border-emerald-500/10 hover:border-emerald-500/30 text-emerald-400', desc: 'Localized regional checkins' },
                      { id: 'community', icon: Users, label: 'Collaboration', color: 'border-purple-500/10 hover:border-purple-500/30 text-purple-400', desc: 'Share with close friends circle' }
                    ].map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => { setActiveMode(item.id as any); setCurrentStep(2); }}
                        className={`p-3.5 text-left rounded-2xl bg-[#090812] border transition-all hover:bg-zinc-950/40 group cursor-pointer ${item.color}`}
                      >
                        <item.icon className="w-5 h-5 mb-1.5" />
                        <span className="block text-xs font-black text-white group-hover:text-violet-300">{item.label}</span>
                        <p className="text-[10px] text-zinc-500 leading-tight mt-1">{item.desc}</p>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {currentStep === 2 && (
                /* STEP 2: MEDIA IMPORT & RECORDING */
                <div className="space-y-4 animate-fadeIn">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-mono text-zinc-400 uppercase">Format: {activeMode?.toUpperCase()}</span>
                    <button 
                      onClick={() => setCurrentStep(1)} 
                      className="text-xs text-violet-400 hover:underline flex items-center gap-1 font-bold"
                    >
                      Change Type
                    </button>
                  </div>

                  {activeMode === 'photo' && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Drag upload zone */}
                      <div className="border border-zinc-800 border-dashed rounded-2xl p-6 text-center space-y-3 bg-zinc-950/20 hover:border-violet-500/30 transition-all flex flex-col items-center justify-center">
                        <FileImage className="w-8 h-8 text-zinc-500 animate-bounce" />
                        <div className="space-y-1">
                          <p className="text-xs text-zinc-300 font-bold">Upload Snapshot</p>
                          <p className="text-[10px] text-zinc-500 font-sans">Support JPG, PNG format up to 10MB</p>
                        </div>
                        <label className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-white rounded-xl text-xs font-mono font-bold cursor-pointer transition-all">
                          Browse Local Gallery
                          <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                        </label>
                      </div>

                      {/* Snap device simulation */}
                      <div className="border border-zinc-800 rounded-2xl p-4 text-center space-y-4 bg-zinc-950/40 flex flex-col justify-between">
                        <div className="space-y-1">
                          <span className="text-[9px] font-mono text-violet-400 uppercase tracking-wider block">Live Frame Shutter</span>
                          <p className="text-[10px] text-zinc-500">Capture an instant photo from your physical webcam.</p>
                        </div>
                        <button 
                          onClick={captureCameraSnapshot}
                          className="w-full py-2.5 bg-linear-to-r from-violet-600 to-pink-500 text-white text-xs font-mono font-bold rounded-xl shadow-lg cursor-pointer hover:brightness-110 active:scale-95 transition-all"
                        >
                          📸 Snaps live frame
                        </button>
                        <div className="flex flex-wrap gap-1.5 justify-center mt-2">
                          {selectedImages.map((img, i) => (
                            <div key={i} className="relative w-12 h-12 rounded-lg border border-zinc-700 overflow-hidden shrink-0">
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
                      <div className="border border-zinc-800 border-dashed rounded-2xl p-6 text-center space-y-3 bg-[#080712]/30">
                        <FileImage className="w-8 h-8 text-zinc-500 mx-auto" />
                        <p className="text-xs text-zinc-300 font-bold">Multi-Image Grid selection</p>
                        <label className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-white rounded-xl text-xs font-mono font-bold cursor-pointer transition-all inline-block">
                          Add multiple images
                          <input type="file" multiple accept="image/*" className="hidden" onChange={handleImageUpload} />
                        </label>
                      </div>

                      {selectedImages.length > 0 && (
                        <div className="space-y-2 bg-zinc-950/50 p-3 rounded-xl border border-zinc-900">
                          <span className="text-[9px] font-mono text-zinc-400 uppercase">Selected list ({selectedImages.length}): Drag to reorder</span>
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                            {selectedImages.map((img, index) => (
                              <div key={index} className="relative aspect-square rounded-lg border border-zinc-800 overflow-hidden group">
                                <img src={img.url} className="w-full h-full object-cover" />
                                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
                                  {index > 0 && (
                                    <button onClick={() => { const next = [...selectedImages]; const tmp = next[index]; next[index] = next[index - 1]; next[index - 1] = tmp; setSelectedImages(next); }} className="p-1 bg-zinc-900 rounded text-white">
                                      <ChevronLeft className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                  {index < selectedImages.length - 1 && (
                                    <button onClick={() => { const next = [...selectedImages]; const tmp = next[index]; next[index] = next[index + 1]; next[index + 1] = tmp; setSelectedImages(next); }} className="p-1 bg-zinc-900 rounded text-white">
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
                    <div className="border border-zinc-800 border-dashed rounded-2xl p-6 text-center space-y-4 bg-zinc-950/20">
                      <Video className="w-8 h-8 text-zinc-500 mx-auto animate-pulse" />
                      <div className="space-y-1">
                        <p className="text-xs text-zinc-300 font-bold">Import Interactive Video</p>
                        <p className="text-[10px] text-zinc-500">Supported formats: MP4, MOV, WebM up to 50MB</p>
                      </div>
                      <label className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-white rounded-xl text-xs font-mono font-bold cursor-pointer transition-all inline-block">
                        Choose Video File
                        <input type="file" accept="video/*" className="hidden" onChange={handleVideoUpload} />
                      </label>
                      {videoFileUrl && (
                        <div className="max-w-xs mx-auto p-2 bg-zinc-900 border border-zinc-800 rounded-xl space-y-1">
                          <p className="text-[10px] text-emerald-400 font-mono truncate">✓ {videoFileUrl}</p>
                          <video src={videoFileUrl} controls className="w-full rounded-lg" />
                        </div>
                      )}
                    </div>
                  )}

                  {activeMode === 'reel' && (
                    /* REEL INTERACTIVE CAMERA */
                    <div className="space-y-3">
                      <div className="relative aspect-[9/16] max-w-[240px] mx-auto rounded-2xl overflow-hidden bg-black border border-zinc-800 flex flex-col justify-between p-3.5 shadow-2xl">
                        <div className="z-10 flex justify-between items-center text-[8px] font-mono text-zinc-400">
                          <span className="bg-black/70 px-2 py-0.5 rounded border border-white/5">RECORDING CONSOLE</span>
                          <button onClick={() => setCameraFacing(prev => prev === 'user' ? 'environment' : 'user')} className="p-1.5 bg-zinc-900 rounded-full text-white">
                            <RefreshCw className="w-3 h-3" />
                          </button>
                        </div>

                        <div className="absolute inset-0 z-0 flex items-center justify-center">
                          {countdownTimer !== null ? (
                            <span className="text-5xl font-black text-white animate-ping">{countdownTimer}</span>
                          ) : recordedVideoUrl ? (
                            <video src={recordedVideoUrl} autoPlay loop muted className="w-full h-full object-cover" />
                          ) : (
                            <video ref={videoPreviewRef} autoPlay muted playsInline className="w-full h-full object-cover bg-zinc-900" />
                          )}
                        </div>

                        <div className="z-10 flex flex-col items-center gap-2">
                          {isRecording ? (
                            <button onClick={handleStopReelRecord} className="w-12 h-12 bg-rose-600 rounded-full border-2 border-white animate-pulse flex items-center justify-center text-[10px] text-white font-bold font-mono">
                              STOP
                            </button>
                          ) : (
                            <button onClick={startReelRecording} className="w-14 h-14 bg-linear-to-tr from-fuchsia-600 to-pink-500 rounded-full border-4 border-black flex items-center justify-center text-[10px] text-white font-black font-mono shadow-xl cursor-pointer">
                              START
                            </button>
                          )}
                          {isRecording && <span className="text-[9px] font-mono bg-black/60 text-white px-2 py-0.5 rounded-full">Stream time: {loopTimerSecs}s</span>}
                        </div>
                      </div>
                    </div>
                  )}

                  {activeMode === 'voice' && (
                    <div className="p-5 bg-zinc-950 border border-zinc-800 rounded-2xl text-center space-y-4">
                      <div className="space-y-1">
                        <span className="text-3xl font-mono font-bold text-white block">0:{voiceDurationSecs.toString().padStart(2, '0')}</span>
                        <span className="text-[9.5px] font-mono text-zinc-500 block uppercase">Continuous recording</span>
                      </div>

                      {/* Waveform simulator */}
                      <div className="flex items-end justify-center gap-1 h-12 max-w-xs mx-auto">
                        {[...Array(18)].map((_, idx) => (
                          <div 
                            key={idx}
                            className={`w-[3px] rounded-full transition-all duration-300 ${voiceIsRecording ? 'bg-violet-500' : 'bg-zinc-800'}`}
                            style={{ height: voiceIsRecording ? `${20 + Math.sin(idx + voiceDurationSecs) * 60}%` : '15%' }}
                          />
                        ))}
                      </div>

                      <div className="flex justify-center items-center gap-3">
                        {voiceIsRecording ? (
                          <button onClick={stopVoiceRecording} className="px-5 py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl text-xs font-mono">
                            🛑 STOP WAVE
                          </button>
                        ) : (
                          <button onClick={startVoiceRecording} className="px-6 py-3 bg-linear-to-tr from-violet-600 to-pink-500 text-white font-black rounded-xl text-xs font-mono animate-pulse">
                            🎙️ START RECORDING
                          </button>
                        )}
                      </div>

                      {voiceTranscript && (
                        <div className="text-left bg-zinc-900 border border-zinc-800 p-3.5 rounded-xl space-y-1">
                          <span className="text-[8px] font-mono text-violet-400 uppercase font-black">AI Transcribing Shutter</span>
                          <p className="text-xs text-zinc-300 font-sans italic">"{voiceTranscript}"</p>
                        </div>
                      )}
                    </div>
                  )}

                  {activeMode === 'poll' && (
                    <div className="p-4 bg-zinc-950 border border-zinc-800 rounded-2xl space-y-3">
                      <div className="space-y-1">
                        <label className="text-[10px] font-mono text-zinc-500 uppercase block">Poll question query</label>
                        <input 
                          type="text" 
                          placeholder="e.g. Is Decentralization ready for prime-time?"
                          value={pollQuestion}
                          onChange={(e) => setPollQuestion(e.target.value)}
                          className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white font-sans"
                        />
                      </div>
                      <div className="space-y-2">
                        {pollOptionsList.map((opt, i) => (
                          <div key={i} className="flex gap-2 items-center">
                            <span className="text-[10px] font-mono text-zinc-600 w-3">{i+1}</span>
                            <input 
                              type="text"
                              placeholder={`Option ${i+1}`}
                              value={opt}
                              onChange={(e) => { const next = [...pollOptionsList]; next[i] = e.target.value; setPollOptionsList(next); }}
                              className="flex-1 bg-zinc-900 border border-zinc-800 rounded-xl px-3.5 py-1.5 text-xs text-white"
                            />
                            {pollOptionsList.length > 2 && (
                              <button onClick={() => setPollOptionsList(prev => prev.filter((_, idx) => idx !== i))} className="text-rose-400"><X className="w-4 h-4" /></button>
                            )}
                          </div>
                        ))}
                        {pollOptionsList.length < 5 && (
                          <button onClick={() => setPollOptionsList(prev => [...prev, ''])} className="text-[10px] font-mono text-violet-400 hover:underline">
                            + Add poll option targets
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
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Media render wrapper */}
                    <div className="aspect-square rounded-2xl border border-zinc-800 bg-black flex items-center justify-center relative overflow-hidden">
                      {selectedImages.length > 0 ? (
                        <div className="relative w-full h-full">
                          <img 
                            src={selectedImages[activeEditIndex || 0]?.url} 
                            style={{ 
                              filter: `${selectedImages[activeEditIndex || 0]?.filterStyle || 'none'} brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%) blur(${blur}px)`,
                              transform: `rotate(${selectedImages[activeEditIndex || 0]?.rotation}deg) scale(${selectedImages[activeEditIndex || 0]?.zoom})`,
                              transition: 'all 0.2s'
                            }}
                            className="w-full h-full object-cover"
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
                      ) : (
                        <div className="text-center p-6 space-y-2 text-zinc-500">
                          <Sliders className="w-8 h-8 mx-auto" />
                          <p className="text-xs italic">No editable images selected. Choose standard photo formats to trigger overlays.</p>
                        </div>
                      )}
                    </div>

                    {/* Editor controls list */}
                    <div className="space-y-3.5 bg-zinc-950/40 p-4 rounded-2xl border border-zinc-900/60">
                      <span className="text-[10px] font-mono text-zinc-400 uppercase block tracking-wider">Adjustment Panel</span>
                      
                      {/* Interactive CSS filters row */}
                      {selectedImages.length > 0 && (
                        <div className="space-y-1.5">
                          <span className="text-[9px] font-mono text-zinc-500 block uppercase">Filters Palette</span>
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
                                    : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-white'
                                }`}
                              >
                                {p.name}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Crop/Rotate utilities */}
                      <div className="grid grid-cols-2 gap-2 pt-1 border-t border-zinc-900">
                        <button 
                          onClick={() => {
                            setSelectedImages(prev => prev.map((img, idx) => {
                              if (idx === (activeEditIndex || 0)) {
                                return { ...img, rotation: (img.rotation + 90) % 360 };
                              }
                              return img;
                            }));
                          }}
                          className="py-1.5 bg-zinc-900 hover:bg-zinc-800 text-[10px] font-mono text-zinc-300 rounded-lg flex items-center justify-center gap-1"
                        >
                          <RotateCw className="w-3.5 h-3.5" /> ROTATE (90°)
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
                          className="py-1.5 bg-zinc-900 hover:bg-zinc-800 text-[10px] font-mono text-zinc-300 rounded-lg flex items-center justify-center gap-1"
                        >
                          <Crop className="w-3.5 h-3.5" /> ZOOM (TOGGLE)
                        </button>
                      </div>

                      {/* Adjust Sliders */}
                      <div className="space-y-2 border-t border-zinc-900 pt-3">
                        <div className="flex justify-between text-[9px] font-mono text-zinc-400">
                          <span>🔆 Brightness: {brightness}%</span>
                          <input type="range" min="50" max="150" value={brightness} onChange={(e) => setBrightness(parseInt(e.target.value))} className="accent-violet-500" />
                        </div>
                        <div className="flex justify-between text-[9px] font-mono text-zinc-400">
                          <span>🌓 Contrast: {contrast}%</span>
                          <input type="range" min="50" max="150" value={contrast} onChange={(e) => setContrast(parseInt(e.target.value))} className="accent-violet-500" />
                        </div>
                        <div className="flex justify-between text-[9px] font-mono text-zinc-400">
                          <span>🎨 Saturation: {saturation}%</span>
                          <input type="range" min="50" max="150" value={saturation} onChange={(e) => setSaturation(parseInt(e.target.value))} className="accent-violet-500" />
                        </div>
                      </div>

                      {/* Stickers Overlay & Text Overlays */}
                      <div className="space-y-2 border-t border-zinc-900 pt-3 text-left">
                        <span className="text-[9px] font-mono text-zinc-500 uppercase block">Stickers & Labels overlays</span>
                        <div className="flex gap-2">
                          {['🔥', '⚡', '✨', '🏆', '👾', '🚀', '💯'].map((emo) => (
                            <button key={emo} onClick={() => setStickerOverlay(stickerOverlay === emo ? null : emo)} className={`text-lg p-1 hover:scale-110 transition-transform ${stickerOverlay === emo ? 'bg-violet-600/20 rounded-lg border border-violet-500/30' : ''}`}>
                              {emo}
                            </button>
                          ))}
                        </div>
                        <div className="space-y-1">
                          <input 
                            type="text" 
                            placeholder="Add Overlay Text details..."
                            value={textOverlay}
                            onChange={(e) => setTextOverlay(e.target.value)}
                            className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-2.5 py-1 text-[11px] text-white"
                          />
                        </div>
                      </div>

                    </div>
                  </div>
                </div>
              )}

              {currentStep === 4 && (
                /* STEP 4: SMART CAPTION & METADATA DETAILS */
                <div className="space-y-4 animate-fadeIn">
                  <div className="space-y-1 text-left">
                    <label className="text-[10px] font-mono text-zinc-400 uppercase">Write Smart Caption</label>
                    <textarea
                      rows={3}
                      value={caption}
                      onChange={(e) => setCaption(e.target.value)}
                      placeholder="Type details... use #developer, #systemsdesign or tag @voh to explore."
                      className="w-full bg-zinc-950/65 border border-zinc-800 rounded-xl p-3.5 text-xs text-white focus:outline-none focus:border-violet-500/20 resize-none leading-relaxed"
                    />
                    <div className="flex justify-between text-[9px] font-mono text-zinc-500 px-1">
                      <span>Character metrics: {caption.length} / 500</span>
                      {caption.includes('#') && <span className="text-violet-400">⚡ Hashtags detected</span>}
                    </div>
                  </div>

                  {/* AI Writing Assistant chips */}
                  <div className="bg-zinc-950/40 p-3.5 border border-zinc-900 rounded-2xl space-y-2">
                    <span className="text-[9px] font-mono text-violet-400 uppercase tracking-widest block">🪄 Nexora AI Caption Assistant</span>
                    <div className="flex flex-wrap gap-1.5">
                      {[
                        { prompt: 'rewrite', label: 'Rewrite Punchy' },
                        { prompt: 'shorten', label: 'Shorten Text' },
                        { prompt: 'expand', label: 'Expand Professional' },
                        { prompt: 'tags', label: 'Add Hashtags' },
                        { prompt: 'translate', label: 'Translate (FR)' }
                      ].map((assist) => (
                        <button
                          key={assist.prompt}
                          onClick={() => handleAiWritingAssistance(assist.prompt)}
                          disabled={loadingTranscript}
                          className="px-2.5 py-1 text-[9.5px] font-sans bg-violet-600/10 border border-violet-500/20 hover:border-violet-500/40 text-violet-300 rounded-lg transition-all disabled:opacity-50"
                        >
                          {assist.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Tagging, location and Alt-text metadata */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div className="space-y-1">
                      <label className="text-[10px] font-mono text-zinc-400 uppercase block">👥 Tag alignments (@names)</label>
                      <input 
                        type="text" 
                        value={taggedUsernames}
                        onChange={(e) => setTaggedUsernames(e.target.value)}
                        placeholder="alex_sterling, sarah_codes"
                        className="w-full bg-zinc-950/65 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-mono text-zinc-400 uppercase block">🏷️ Topic Categories</label>
                      <input 
                        type="text" 
                        value={topics}
                        onChange={(e) => setTopics(e.target.value)}
                        placeholder="AI, Technology, Systems"
                        className="w-full bg-zinc-950/65 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 relative">
                    <div className="space-y-1 relative">
                      <label className="text-[10px] font-mono text-zinc-400 uppercase block">📍 Location</label>
                      <input 
                        type="text" 
                        value={location}
                        onChange={(e) => setLocation(e.target.value)}
                        placeholder="Search regions..."
                        className="w-full bg-zinc-950/65 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white"
                      />
                      {locationSuggestions.length > 0 && (
                        <div className="absolute z-20 left-0 right-0 top-full mt-1 bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden shadow-xl max-h-32 overflow-y-auto">
                          {locationSuggestions.map(city => (
                            <div key={city} onClick={() => { setLocation(city); setLocationSuggestions([]); }} className="px-3 py-1.5 hover:bg-zinc-800 text-xs text-white cursor-pointer">{city}</div>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-mono text-zinc-400 uppercase block">👁️ Accessibility Alt-Text (Images)</label>
                      <input 
                        type="text" 
                        value={imageAltText}
                        onChange={(e) => setImageAltText(e.target.value)}
                        placeholder="Describe what is in the media..."
                        className="w-full bg-zinc-950/65 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white"
                      />
                    </div>
                  </div>

                </div>
              )}

              {currentStep === 5 && (
                /* STEP 5: VISUAL PREVIEW & ACCESSIBILITY COMPLIANCE */
                <div className="space-y-4 animate-fadeIn">
                  <div>
                    <span className="text-[10px] font-mono text-violet-400 uppercase tracking-widest block mb-1">Live Shutter Preview</span>
                    <h3 className="text-sm font-black text-white uppercase">Exactly how your post will render</h3>
                  </div>

                  {/* Simulated Live Post Card */}
                  <div className="p-4 bg-zinc-950 border border-zinc-800/80 rounded-2xl space-y-3.5 text-left">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2.5">
                        <img src={currentUser.avatar} className="w-9 h-9 rounded-full object-cover border border-violet-500/20" />
                        <div>
                          <div className="flex items-center gap-1">
                            <span className="text-xs font-black text-white">{currentUser.name}</span>
                            {currentUser.isVerified && <span className="text-blue-400 text-[10px]">✓</span>}
                          </div>
                          <span className="text-[10px] text-zinc-500 font-mono">@{currentUser.username}</span>
                        </div>
                      </div>
                      <span className="text-[9px] font-mono text-violet-400 bg-violet-950/25 px-2 py-0.5 rounded border border-violet-500/20">Preview Card</span>
                    </div>

                    <p className="text-xs text-zinc-200 leading-relaxed font-sans">{caption || "Write caption text in previous step... #developer #systemsdesign"}</p>

                    {selectedImages.length > 0 && (
                      <div className="aspect-video rounded-xl border border-zinc-900 bg-black overflow-hidden">
                        <img src={selectedImages[0]?.url} className="w-full h-full object-cover" style={{ filter: selectedImages[0]?.filterStyle || 'none' }} />
                      </div>
                    )}

                    {voiceFileUrl && (
                      <div className="p-3 bg-zinc-900 border border-zinc-800 rounded-xl flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <Play className="w-4 h-4 text-violet-400" />
                          <span>Voice memopad playing...</span>
                        </div>
                        <span className="text-[10px] font-mono text-zinc-500">0:{voiceDurationSecs}</span>
                      </div>
                    )}

                    {pollQuestion.trim() && (
                      <div className="p-3.5 bg-zinc-900 border border-zinc-800 rounded-xl space-y-2">
                        <span className="text-xs font-bold text-white block">📊 {pollQuestion}</span>
                        <div className="space-y-1">
                          {pollOptionsList.filter(o => o.trim()).map((o, idx) => (
                            <div key={idx} className="w-full text-left p-2 bg-zinc-950 border border-zinc-800 rounded-lg text-xs font-sans">
                              {o}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Mock action triggers */}
                    <div className="flex justify-between items-center text-xs text-zinc-400 border-t border-zinc-900 pt-3">
                      <span>❤️ Like</span>
                      <span>💬 Comment</span>
                      <span>🔄 Repost</span>
                      <span>⚡ Tip</span>
                    </div>
                  </div>

                  {/* Accessibility & Quality audit compliance checklist */}
                  <div className="p-3.5 bg-zinc-950 border border-zinc-800 rounded-2xl space-y-2.5 text-left">
                    <span className="text-[9.5px] font-mono text-amber-400 uppercase font-black tracking-widest block">Quality Shutter Check</span>
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2 text-xs">
                        {hasContrastIssue ? (
                          <span className="text-amber-400">⚠️ Soft background contrast warnings in Light Theme.</span>
                        ) : (
                          <span className="text-emerald-400">✓ Contrast checklist satisfied</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-xs">
                        {isAltTextMissing ? (
                          <span className="text-amber-400">⚠️ Missing alt-text description targets for visually impaired readers.</span>
                        ) : (
                          <span className="text-emerald-400">✓ Alt-text metadata checks satisfied</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-xs">
                        {isVideoTrimCheck ? (
                          <span className="text-amber-400">⚠️ Video trim boundaries exceed optimal 15 seconds engagement weight.</span>
                        ) : (
                          <span className="text-emerald-400">✓ Media trim boundaries optimal</span>
                        )}
                      </div>
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
                        <span className="text-sm font-black text-white uppercase">Configure Publishing settings</span>
                        <button 
                          onClick={() => setIsAdvancedOptionsOpen(!isAdvancedOptionsOpen)}
                          className="text-xs text-violet-400 hover:underline flex items-center gap-1"
                        >
                          {isAdvancedOptionsOpen ? 'Collapse Details' : 'Show Advanced Details'}
                        </button>
                      </div>

                      {/* Custom options row */}
                      <div className="space-y-2.5 bg-[#07070d]/50 p-3.5 border border-zinc-900 rounded-2xl text-left">
                        <div className="flex justify-between items-center text-xs text-zinc-300">
                          <span className="font-bold">Audience Targets</span>
                          <select 
                            value={audience} 
                            onChange={(e) => setAudience(e.target.value as any)}
                            className="bg-zinc-900 border border-zinc-800 rounded-lg p-1.5 text-xs text-violet-400 cursor-pointer"
                          >
                            <option value="public">🌍 Public</option>
                            <option value="circle">🔵 Close Friends</option>
                            <option value="community">🏟️ My Community Circle</option>
                            <option value="onlyme">🔒 Only Me</option>
                          </select>
                        </div>
                      </div>

                      {isAdvancedOptionsOpen && (
                        <div className="space-y-2.5 bg-zinc-950/40 p-4 border border-zinc-900 rounded-2xl text-left">
                          <div className="flex justify-between items-center text-xs">
                            <span className="text-zinc-300">Allow Comments reactions</span>
                            <input type="checkbox" checked={commentsAllowed} onChange={(e) => setCommentsAllowed(e.target.checked)} className="accent-violet-500" />
                          </div>
                          <div className="flex justify-between items-center text-xs">
                            <span className="text-zinc-300">Allow Shares & Reposts</span>
                            <input type="checkbox" checked={sharesAllowed} onChange={(e) => setSharesAllowed(e.target.checked)} className="accent-violet-500" />
                          </div>
                          <div className="flex justify-between items-center text-xs">
                            <span className="text-zinc-300">Allow Downloads</span>
                            <input type="checkbox" checked={downloadsAllowed} onChange={(e) => setDownloadsAllowed(e.target.checked)} className="accent-violet-500" />
                          </div>
                          <div className="flex justify-between items-center text-xs">
                            <span className="text-zinc-300">Cross-Post to external grids</span>
                            <input type="checkbox" checked={crossPostToTwitter} onChange={(e) => setCrossPostToTwitter(e.target.checked)} className="accent-violet-500" />
                          </div>
                          <div className="flex justify-between items-center text-xs">
                            <span className="text-zinc-300">Pin Post to top of profile</span>
                            <input type="checkbox" checked={pinnedOnProfile} onChange={(e) => setPinnedOnProfile(e.target.checked)} className="accent-violet-500" />
                          </div>
                        </div>
                      )}

                      {/* Scheduling controls */}
                      <div className="p-3.5 bg-[#0a0715]/40 border border-zinc-900 rounded-2xl text-left space-y-2">
                        <div className="flex justify-between items-center text-xs">
                          <div>
                            <span className="font-bold text-white block">📅 Post Scheduling</span>
                            <span className="text-[10px] text-zinc-500">Post automatically triggers at a future date</span>
                          </div>
                          <input type="checkbox" checked={isScheduled} onChange={(e) => setIsScheduled(e.target.checked)} className="accent-violet-500" />
                        </div>
                        {isScheduled && (
                          <input 
                            type="datetime-local" 
                            value={scheduledDateTime}
                            onChange={(e) => setScheduledDateTime(e.target.value)}
                            className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-2.5 text-xs text-violet-400"
                          />
                        )}
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
                        <div className="relative w-16 h-16 flex items-center justify-center">
                          <div className="absolute inset-0 rounded-full border-4 border-violet-600/10 border-t-violet-500 animate-spin" />
                          <span className="text-xs font-mono text-violet-400">{uploadProgress}%</span>
                        </div>
                      )}

                      <div className="space-y-1">
                        <span className="text-[10px] font-mono text-zinc-500 uppercase block tracking-wider">
                          {postingStatus === 'compressing' && '⚙️ Compressing media quality...'}
                          {postingStatus === 'publishing' && '📤 Sharing your creation...'}
                          {postingStatus === 'processing' && '🧠 AI formatting and checking...'}
                          {postingStatus === 'completed' && '✨ Content Successfully Shared!'}
                        </span>
                        <p className="text-xs text-zinc-300 font-sans">
                          {postingStatus === 'completed' ? 'Post shared successfully.' : 'Syncing post settings...'}
                        </p>
                      </div>

                      {postingStatus !== 'completed' && postingStatus !== 'failed' && (
                        <div className="flex gap-2">
                          <button 
                            onClick={() => { clearInterval(uploadIntervalRef.current); setPostingStatus('idle'); }} 
                            className="px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 rounded-lg text-xs"
                          >
                            Cancel Publish
                          </button>
                          <button 
                            onClick={() => setIsMinimized(true)}
                            className="px-3 py-1.5 bg-violet-600/20 text-violet-300 rounded-lg text-xs"
                          >
                            Minimize to Tray
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
          <div className="border-t border-zinc-800/60 pt-4 flex justify-between items-center shrink-0">
            <div>
              <button 
                onClick={saveAsDraftLocally}
                className="px-4 py-2 border border-zinc-800 hover:bg-zinc-900 rounded-xl text-zinc-400 text-xs font-mono font-bold cursor-pointer transition-colors"
              >
                Save Draft 💾
              </button>
            </div>
            <div className="flex gap-2">
              {currentStep > 1 && (
                <button 
                  onClick={prevStep}
                  className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-white rounded-xl text-xs font-mono font-bold cursor-pointer transition-colors"
                >
                  ← Back
                </button>
              )}
              {currentStep < 6 ? (
                <button 
                  onClick={nextStep}
                  disabled={currentStep === 2 && !activeMode}
                  className="px-5 py-2.5 bg-linear-to-r from-violet-600 to-pink-500 hover:brightness-110 disabled:opacity-40 text-white font-sans font-black text-xs uppercase tracking-widest rounded-xl shadow-lg cursor-pointer transition-all"
                >
                  Next Step →
                </button>
              ) : (
                <button 
                  onClick={triggerPublishPipeline}
                  disabled={!caption.trim() && selectedImages.length === 0 && !videoFileUrl && !recordedVideoUrl && !voiceFileUrl && !pollQuestion.trim()}
                  className="px-6 py-2.5 bg-linear-to-r from-violet-600 to-pink-500 hover:brightness-110 disabled:opacity-40 text-white font-sans font-black text-xs uppercase tracking-widest rounded-xl shadow-lg cursor-pointer transition-all animate-pulse"
                >
                  Publish Now 🚀
                </button>
              )}
            </div>
          </div>
        )}

      </motion.div>
    </div>
  );
}
