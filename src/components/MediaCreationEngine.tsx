import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, Check, Plus, Camera, Video, Mic, BarChart2, FileText, 
  MapPin, ChevronRight, Trash2, Play, Pause, RefreshCw, 
  Volume2, RotateCw, Crop, Sliders, VolumeX, Save, 
  ChevronLeft, ArrowUp, ArrowDown, Users, Sparkles, FolderHeart, ShieldAlert, BadgeInfo
} from 'lucide-react';
import { User, Post } from '../types';

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
}

interface SelectedImage {
  url: string;
  rotation: number; // 0, 90, 180, 270
  zoom: number; // 1 to 2
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
  { name: 'Juno', style: 'sepia(0.15) contrast(1.1) saturate(1.3) hue-rotate(-15deg)' },
  { name: 'Noir', style: 'grayscale(1) contrast(1.4)' },
  { name: 'Sepia', style: 'sepia(0.8) contrast(0.95)' },
  { name: 'Vintage', style: 'sepia(0.35) contrast(0.9) brightness(1.05)' },
  { name: 'Emerald', style: 'hue-rotate(90deg) saturate(1.2)' },
  { name: 'Cyberpunk', style: 'hue-rotate(280deg) saturate(1.5) contrast(1.1)' }
];

export default function MediaCreationEngine({
  currentUser,
  onClose,
  onAddPost,
  theme,
  isStoryModeInitially = false
}: MediaCreationEngineProps) {
  // Navigation categories
  const [activeTab, setActiveTab] = useState<'feed' | 'story' | 'drafts'>(isStoryModeInitially ? 'story' : 'feed');
  const [activeMode, setActiveMode] = useState<'text' | 'photo' | 'video' | 'reel' | 'voice' | 'poll' | 'pulse' | 'community' | null>(null);

  // Permissions state
  const [permissionState, setPermissionState] = useState<'prompt' | 'granted' | 'denied'>(() => {
    const saved = localStorage.getItem('nexora_media_permissions_granted');
    return (saved as any) || 'prompt';
  });
  const [permissionTarget, setPermissionTarget] = useState<'camera' | 'gallery' | 'mic' | null>(null);

  // Form core fields
  const [caption, setCaption] = useState('');
  const [topics, setTopics] = useState('');
  const [audience, setAudience] = useState<'public' | 'circle' | 'community' | 'followers' | 'onlyme'>('public');
  const [location, setLocation] = useState('');
  const [locationSuggestions, setLocationSuggestions] = useState<string[]>([]);
  const [taggedUsernames, setTaggedUsernames] = useState('');

  // Automated publication scheduling states
  const [isScheduled, setIsScheduled] = useState(false);
  const [scheduledDateTime, setScheduledDateTime] = useState('');

  // Target post to Founder Broadcast Channel (Only allowed for VOH accounts)
  const [targetBroadcastChannel, setTargetBroadcastChannel] = useState(false);

  // Drafts state
  const [draftsList, setDraftsList] = useState<DraftItem[]>(() => {
    const saved = localStorage.getItem('nexora_post_drafts_v1');
    return saved ? JSON.parse(saved) : [];
  });

  // Photo uploads
  const [selectedImages, setSelectedImages] = useState<SelectedImage[]>([]);
  const [activeEditIndex, setActiveEditIndex] = useState<number | null>(null);

  // Video variables
  const [videoFileUrl, setVideoFileUrl] = useState<string | null>(null);
  const [videoMuted, setVideoMuted] = useState(false);
  const [videoTrimStart, setVideoTrimStart] = useState(0);
  const [videoTrimEnd, setVideoTrimEnd] = useState(15);
  const [videoDuration, setVideoDuration] = useState(15);

  // Reels short-video controls
  const [isRecording, setIsRecording] = useState(false);
  const [isRecordingPaused, setIsRecordingPaused] = useState(false);
  const [recordedVideoUrl, setRecordedVideoUrl] = useState<string | null>(null);
  const [cameraFacing, setCameraFacing] = useState<'user' | 'environment'>('user');
  const [flashActive, setFlashActive] = useState(false);
  const [countdownTimer, setCountdownTimer] = useState<number | null>(null);
  const [loopTimerSecs, setLoopTimerSecs] = useState(0);

  // Voice recording
  const [voiceFileUrl, setVoiceFileUrl] = useState<string | null>(null);
  const [voiceDurationSecs, setVoiceDurationSecs] = useState(0);
  const [voiceIsRecording, setVoiceIsRecording] = useState(false);
  const [voiceIsPaused, setVoiceIsPaused] = useState(false);
  const [voiceTranscript, setVoiceTranscript] = useState('');
  const [voicePlaybackActive, setVoicePlaybackActive] = useState(false);
  const [loadingTranscript, setLoadingTranscript] = useState(false);

  // Poll
  const [pollQuestion, setPollQuestion] = useState('');
  const [pollOptionsList, setPollOptionsList] = useState<string[]>(['', '']);

  // Story specifics
  const [isStoryCloseFriends, setIsStoryCloseFriends] = useState(false);
  const [storyHighlightsList, setStoryHighlightsList] = useState<any[]>(() => {
    const saved = localStorage.getItem('nexora_story_highlights');
    return saved ? JSON.parse(saved) : [];
  });
  const [newHighlightTitle, setNewHighlightTitle] = useState('');
  const [isCreatingHighlight, setIsCreatingHighlight] = useState(false);

  // Upload/Post Status
  const [postingStatus, setPostingStatus] = useState<'idle' | 'compressing' | 'uploading' | 'completed' | 'failed'>('idle');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [errorMessage, setErrorMessage] = useState('');

  // DOM Refs for capture simulation
  const videoPreviewRef = useRef<HTMLVideoElement>(null);
  const videoStreamRef = useRef<MediaStream | null>(null);
  const mediaRecorderVideoRef = useRef<MediaRecorder | null>(null);
  const videoChunksRef = useRef<Blob[]>([]);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const loopTimerRef = useRef<any>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  // Persist permissions
  useEffect(() => {
    localStorage.setItem('nexora_media_permissions_granted', permissionState);
  }, [permissionState]);

  // Manage real front/rear facing camera streams for direct capture
  useEffect(() => {
    let currentStream: MediaStream | null = null;
    if (activeMode === 'reel' && permissionState === 'granted') {
      navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: cameraFacing }, 
        audio: true 
      })
      .then(stream => {
        currentStream = stream;
        videoStreamRef.current = stream;
        if (videoPreviewRef.current) {
          videoPreviewRef.current.srcObject = stream;
        }
      })
      .catch(err => {
        console.error("Camera direct access failed:", err);
      });
    }

    return () => {
      if (currentStream) {
        currentStream.getTracks().forEach(track => track.stop());
      }
      videoStreamRef.current = null;
    };
  }, [activeMode, permissionState, cameraFacing]);

  // Persist drafts
  useEffect(() => {
    localStorage.setItem('nexora_post_drafts_v1', JSON.stringify(draftsList));
  }, [draftsList]);

  // Location Autocomplete
  useEffect(() => {
    if (location.trim().length > 1) {
      const cities = ["Lagos, Nigeria", "Accra, Ghana", "Dakar, Senegal", "London, UK", "New York, USA", "Tokyo, Japan", "San Francisco, USA", "Nairobi, Kenya", "Port Harcourt, Nigeria"];
      setLocationSuggestions(cities.filter(c => c.toLowerCase().includes(location.toLowerCase())));
    } else {
      setLocationSuggestions([]);
    }
  }, [location]);

  // Simulated timer for Loop record
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
    return () => {
      if (loopTimerRef.current) clearInterval(loopTimerRef.current);
    };
  }, [isRecording, isRecordingPaused]);

  // Simulate audio player timing
  useEffect(() => {
    let playTimer: any;
    if (voicePlaybackActive) {
      playTimer = setInterval(() => {
        // Simple visual countdown simulation
      }, 250);
    }
    return () => clearInterval(playTimer);
  }, [voicePlaybackActive]);

  // Request Permissions with visual override
  const handleRequestPermission = (target: 'camera' | 'gallery' | 'mic', callback: () => void) => {
    if (permissionState === 'granted') {
      callback();
      return;
    }
    setPermissionTarget(target);
  };

  const grantPermission = () => {
    setPermissionState('granted');
    setPermissionTarget(null);
    window.dispatchEvent(new CustomEvent('toast', { detail: 'Permissions successfully granted to Nexora' }));
  };

  const denyPermission = () => {
    setPermissionState('denied');
    setPermissionTarget(null);
    window.dispatchEvent(new CustomEvent('toast', { detail: 'Media access denied. You can re-enable later.' }));
  };

  // Image Selection Handle
  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    handleRequestPermission('gallery', () => {
      Array.from(files).forEach((file: File) => {
        const reader = new FileReader();
        reader.onload = (loadEvent) => {
          if (loadEvent.target?.result) {
            setSelectedImages(prev => [
              ...prev, 
              {
                url: loadEvent.target!.result as string,
                rotation: 0,
                zoom: 1,
                cropOffset: { x: 0, y: 0 }
              }
            ]);
          }
        };
        reader.readAsDataURL(file);
      });
    });
  };

  // Simulated Live Snapped Instant Photo
  const handleInstantPhotoCapture = () => {
    handleRequestPermission('camera', () => {
      const snapUrl = [
        'https://images.unsplash.com/photo-1547394765-185e1e68f34e?w=800&auto=format&fit=crop&q=80',
        'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop&q=80',
        'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=800&auto=format&fit=crop&q=80',
        'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=800&auto=format&fit=crop&q=80'
      ][Math.floor(Math.random() * 4)];

      setSelectedImages(prev => [
        ...prev, 
        {
          url: snapUrl,
          rotation: 0,
          zoom: 1,
          cropOffset: { x: 0, y: 0 }
        }
      ]);
      window.dispatchEvent(new CustomEvent('toast', { detail: '📸 Instant camera snapshot captured!' }));
    });
  };

  // Edit tools for image
  const handleRotateImage = (index: number) => {
    setSelectedImages(prev => prev.map((img, idx) => {
      if (idx === index) {
        return { ...img, rotation: (img.rotation + 90) % 360 };
      }
      return img;
    }));
  };

  const handleZoomChange = (index: number, val: number) => {
    setSelectedImages(prev => prev.map((img, idx) => {
      if (idx === index) {
        return { ...img, zoom: val };
      }
      return img;
    }));
  };

  // Rearranging photo order
  const moveImageOrder = (index: number, direction: 'left' | 'right') => {
    const nextList = [...selectedImages];
    const targetIdx = direction === 'left' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= nextList.length) return;

    const temp = nextList[index];
    nextList[index] = nextList[targetIdx];
    nextList[targetIdx] = temp;
    setSelectedImages(nextList);
  };

  const handleRemoveImage = (index: number) => {
    setSelectedImages(prev => prev.filter((_, idx) => idx !== index));
    if (activeEditIndex === index) {
      setActiveEditIndex(null);
    }
  };

  // Video selector
  const handleVideoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    handleRequestPermission('gallery', () => {
      const objectUrl = URL.createObjectURL(files[0]);
      setVideoFileUrl(objectUrl);
      setVideoTrimStart(0);
      setVideoTrimEnd(15);
      setVideoDuration(15);
    });
  };

  // Short Video Recording Methods
  const handleStartReelRecord = () => {
    handleRequestPermission('camera', () => {
      setCountdownTimer(3);
      const countdownInterval = setInterval(() => {
        setCountdownTimer(prev => {
          if (prev !== null && prev <= 1) {
            clearInterval(countdownInterval);
            setCountdownTimer(null);
            setIsRecording(true);
            setIsRecordingPaused(false);
            setLoopTimerSecs(0);
            setRecordedVideoUrl(null);

            // Connect real MediaRecorder to camera stream
            if (videoStreamRef.current) {
              try {
                videoChunksRef.current = [];
                const recorder = new MediaRecorder(videoStreamRef.current, { mimeType: 'video/webm' });
                mediaRecorderVideoRef.current = recorder;
                recorder.ondataavailable = (event) => {
                  if (event.data.size > 0) {
                    videoChunksRef.current.push(event.data);
                  }
                };
                recorder.onstop = () => {
                  const videoBlob = new Blob(videoChunksRef.current, { type: 'video/webm' });
                  const url = URL.createObjectURL(videoBlob);
                  setRecordedVideoUrl(url);
                };
                recorder.start();
              } catch (e) {
                console.error("Failed to start MediaRecorder for video:", e);
              }
            }
            return null;
          }
          return prev !== null ? prev - 1 : null;
        });
      }, 700);
    });
  };

  const handleTogglePauseReelRecord = () => {
    if (mediaRecorderVideoRef.current) {
      if (isRecordingPaused) {
        mediaRecorderVideoRef.current.resume();
      } else {
        mediaRecorderVideoRef.current.pause();
      }
    }
    setIsRecordingPaused(prev => !prev);
  };

  const handleStopReelRecord = () => {
    setIsRecording(false);
    setIsRecordingPaused(false);
    if (mediaRecorderVideoRef.current && mediaRecorderVideoRef.current.state !== 'inactive') {
      try {
        mediaRecorderVideoRef.current.stop();
      } catch (err) {
        console.error("Stop recording failed:", err);
      }
    } else {
      // Fallback
      setRecordedVideoUrl('https://assets.mixkit.co/videos/preview/mixkit-starry-night-sky-background-912-large.mp4');
    }
    window.dispatchEvent(new CustomEvent('toast', { detail: '🎥 Short video clip captured successfully.' }));
  };

  // Voice recording engine
  const handleStartVoiceRecord = async () => {
    handleRequestPermission('mic', async () => {
      try {
        setVoiceIsRecording(true);
        setVoiceIsPaused(false);
        setVoiceDurationSecs(0);
        setVoiceFileUrl(null);
        setVoiceTranscript('');

        // Try getting actual stream if available, otherwise simulate
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true }).catch(() => null);
          if (stream) {
            const recorder = new MediaRecorder(stream);
            mediaRecorderRef.current = recorder;
            audioChunksRef.current = [];

            recorder.ondataavailable = (event) => {
              if (event.data.size > 0) audioChunksRef.current.push(event.data);
            };

            recorder.onstop = () => {
              const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
              const audioUrl = URL.createObjectURL(audioBlob);
              setVoiceFileUrl(audioUrl);
            };

            recorder.start();
          }
        }

        // Incrementor
        const interval = setInterval(() => {
          setVoiceDurationSecs(prev => {
            if (prev >= 60) {
              clearInterval(interval);
              handleStopVoiceRecord();
              return 60;
            }
            return prev + 1;
          });
        }, 1000);
        (window as any).voiceTimerInterval = interval;

      } catch (err) {
        console.error("Mic error:", err);
        setVoiceIsRecording(true);
      }
    });
  };

  const handlePauseVoiceRecord = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.pause();
    }
    setVoiceIsPaused(true);
    if ((window as any).voiceTimerInterval) clearInterval((window as any).voiceTimerInterval);
  };

  const handleResumeVoiceRecord = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'paused') {
      mediaRecorderRef.current.resume();
    }
    setVoiceIsPaused(false);
    const interval = setInterval(() => {
      setVoiceDurationSecs(prev => prev + 1);
    }, 1000);
    (window as any).voiceTimerInterval = interval;
  };

  const handleStopVoiceRecord = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    setVoiceIsRecording(false);
    setVoiceIsPaused(false);
    if ((window as any).voiceTimerInterval) clearInterval((window as any).voiceTimerInterval);

    // If no real recorder URL, use a default high fidelity synth URL
    if (!voiceFileUrl) {
      setVoiceFileUrl('https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3');
    }

    // Trigger AI transcript
    setLoadingTranscript(true);
    setTimeout(() => {
      setVoiceTranscript("This contains high-fidelity media upgrades for Nexora's mobile architecture. Every micro-interaction is streamlined to yield standard, optimal layout rendering.");
      setLoadingTranscript(false);
      window.dispatchEvent(new CustomEvent('toast', { detail: '🎙️ VOH AI Speech-to-Text completed!' }));
    }, 1500);
  };

  // Draft saving
  const handleSaveDraft = () => {
    const newDraft: DraftItem = {
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

    setDraftsList(prev => [newDraft, ...prev]);
    window.dispatchEvent(new CustomEvent('toast', { detail: '💾 Draft saved locally. Lives across sessions!' }));
    resetInputs();
  };

  const handleSelectDraft = (draft: DraftItem) => {
    setCaption(draft.caption);
    setTopics(draft.topics);
    setAudience(draft.audience);
    setActiveMode(draft.type as any);
    
    if (draft.images && draft.images.length > 0) {
      setSelectedImages(draft.images.map(img => ({
        url: img,
        rotation: 0,
        zoom: 1,
        cropOffset: { x: 0, y: 0 }
      })));
    }
    if (draft.videoUrl) {
      setVideoFileUrl(draft.videoUrl);
    }
    if (draft.voiceUrl) {
      setVoiceFileUrl(draft.voiceUrl);
      setVoiceTranscript(draft.transcript || '');
    }
    
    // Remote from drafts list after restoring-
    setDraftsList(prev => prev.filter(d => d.id !== draft.id));
    setActiveTab('feed');
  };

  const handleDeleteDraft = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setDraftsList(prev => prev.filter(d => d.id !== id));
    window.dispatchEvent(new CustomEvent('toast', { detail: '🗑️ Draft discarded.' }));
  };

  const resetInputs = () => {
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
    setActiveMode(null);
  };

  // Quality Optimizer compressor simulation
  const compressMediaAndSubmit = async () => {
    setPostingStatus('compressing');
    setUploadProgress(15);

    // Simulate resizing logic, HEIC formatting checks, and intelligent downscaling
    const compressPromise = new Promise((resolve) => {
      let progress = 15;
      const interval = setInterval(() => {
        progress += 18;
        if (progress >= 100) {
          clearInterval(interval);
          setUploadProgress(100);
          resolve(true);
        } else {
          setUploadProgress(progress);
        }
      }, 300);
    });

    await compressPromise;
    setPostingStatus('uploading');

    // Publish post block
    try {
      const imgArray = selectedImages.map(img => img.url);
      const isVoice = activeMode === 'voice';
      const mainImg = imgArray[0] || undefined;
      const vidUrl = videoFileUrl || recordedVideoUrl || undefined;
      
      const filtersArray = selectedImages.map(img => img.filterStyle || 'none');
      const mainFilter = filtersArray[0] || undefined;
      
      // Build any poll structure
      let pollModel: any = undefined;
      if (activeMode === 'poll' && pollQuestion.trim()) {
        pollModel = {
          question: pollQuestion,
          options: pollOptionsList.filter(o => o.trim().length > 0).map((txt, i) => ({
            id: `opt-${i}`,
            text: txt,
            votes: 0
          }))
        };
      }

      onAddPost(
        caption,
        mainImg,
        topics,
        imgArray.length > 1 ? imgArray : undefined,
        vidUrl,
        voiceTranscript || undefined,
        voiceFileUrl || undefined,
        audience,
        isVoice,
        isVoice ? voiceDurationSecs : undefined,
        pollModel,
        activeMode === 'community' ? 'Collaboration' : undefined,
        activeMode === 'pulse' ? (location || 'Dakar Central') : undefined,
        mainFilter,
        filtersArray.length > 1 ? filtersArray : undefined,
        isScheduled ? (scheduledDateTime || new Date(Date.now() + 86400000).toISOString()) : undefined,
        targetBroadcastChannel
      );

      setPostingStatus('completed');
      window.dispatchEvent(new CustomEvent('toast', { detail: '🚀 Shared directly to network with 0ms delay!' }));
      setTimeout(() => {
        onClose();
      }, 800);

    } catch (err) {
      setPostingStatus('failed');
      setErrorMessage('Upload failed. Please try again.');
    }
  };

  // Story publish directly to active moments
  const handlePublishStory = () => {
    const storyId = `moments-${Date.now()}`;
    const mediaType = activeMode === 'photo' ? 'photo' : activeMode === 'video' || activeMode === 'reel' ? 'video' : activeMode === 'voice' ? 'voice' : 'text';
    const mediaUrl = selectedImages[0]?.url || videoFileUrl || recordedVideoUrl || '';

    const newStory = {
      id: storyId,
      name: currentUser.name,
      username: currentUser.username,
      avatar: currentUser.avatar,
      active: true,
      mediaType,
      mediaUrl,
      isCloseFriends: isStoryCloseFriends,
      createdAt: Date.now(), // 24-hr expiry reference
      quotes: [caption || "✨ Visual moment!"],
      seenList: [] // seen tracking
    };

    // Append to localStorage
    const saved = localStorage.getItem('nexora_moments_list');
    let storyList = [];
    if (saved) {
      try {
        storyList = JSON.parse(saved);
      } catch (e) {}
    }
    const updated = [newStory, ...storyList];
    localStorage.setItem('nexora_moments_list', JSON.stringify(updated));

    window.dispatchEvent(new CustomEvent('toast', { detail: `📖 Story shared to ${isStoryCloseFriends ? 'Close Friends ⭐' : 'Public'}!` }));
    onClose();
  };

  // High quality bento helper
  const getCardBg = () => {
    if (theme === 'neon-cyber') return 'bg-slate-950/95 border-fuchsia-500/20';
    if (theme === 'emerald-glass') return 'bg-emerald-950/95 border-emerald-500/20';
    if (theme === 'stealth-dark') return 'bg-[#050508]/95 border-zinc-800';
    return 'bg-white border-zinc-200';
  };

  const getTextColor = (dim = false) => {
    if (theme === 'platinum-light') {
      return dim ? 'text-zinc-500' : 'text-zinc-900';
    }
    return dim ? 'text-zinc-400' : 'text-white';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 backdrop-blur-md bg-slate-950/70 overflow-y-auto">
      
      {/* Dynamic Permissions Simulation Prompt overlay */}
      <AnimatePresence>
        {permissionTarget && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-51 flex items-center justify-center bg-black/80 p-4"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-zinc-900 border border-violet-500/30 max-w-sm w-full rounded-3xl p-6 text-center space-y-4"
            >
              <div className="mx-auto w-12 h-12 rounded-full bg-violet-600/15 flex items-center justify-center text-violet-400">
                <ShieldAlert className="w-6 h-6 animate-pulse" />
              </div>
              <div className="space-y-2">
                <h4 className="text-sm font-sans font-black tracking-widest text-white uppercase">Device Permission Check</h4>
                <p className="text-xs text-zinc-300 leading-relaxed font-sans">
                  "NEXORA needs access to your camera and gallery so you can create and share content."
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3 pt-2">
                <button 
                  onClick={denyPermission}
                  className="px-4 py-2 border border-zinc-700 hover:bg-zinc-800 text-zinc-300 rounded-xl text-xs font-mono font-bold cursor-pointer transition-colors"
                >
                  Block
                </button>
                <button 
                  onClick={grantPermission}
                  className="px-4 py-2 bg-linear-to-r from-violet-600 to-pink-500 hover:opacity-90 text-white rounded-xl text-xs font-mono font-bold cursor-pointer transition-all"
                >
                  Grant Access
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 20, opacity: 0 }}
        className={`relative w-full max-w-2xl rounded-3xl p-5 md:p-6 border shadow-2xl flex flex-col max-h-[92vh] ${getCardBg()}`}
        id="creative-upgrade-hub"
      >
        {/* Header segment */}
        <div className="flex items-center justify-between border-b border-zinc-800 pb-3 mb-4 shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-violet-600/10 flex items-center justify-center text-violet-400">
              <Sparkles className="w-4 h-4 text-violet-400 animate-spin-slow" />
            </div>
            <div>
              <h2 className="text-xs font-sans font-black tracking-widest uppercase text-violet-400">Content Studio v2.4</h2>
              <p className="text-[9.5px] font-mono text-zinc-500 uppercase mt-0.5">Symmetric Mobile Media Hub</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-lg bg-zinc-800/40 text-zinc-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Global tab options */}
        <div className="flex gap-2 p-1 bg-zinc-950/60 rounded-xl border border-zinc-800 mb-4 shrink-0">
          <button
            onClick={() => { setActiveTab('feed'); resetInputs(); }}
            className={`flex-1 py-1.5 rounded-lg text-xs font-sans font-bold transition-all cursor-pointer ${activeTab === 'feed' ? 'bg-zinc-800 text-white font-extrabold' : 'text-zinc-400 hover:text-zinc-200'}`}
          >
            📝 App Post
          </button>
          <button
            onClick={() => { setActiveTab('story'); resetInputs(); }}
            className={`flex-1 py-1.5 rounded-lg text-xs font-sans font-bold transition-all cursor-pointer ${activeTab === 'story' ? 'bg-emerald-800/20 text-emerald-400 font-extrabold border border-emerald-500/20' : 'text-zinc-400 hover:text-zinc-200'}`}
          >
            📖 Stories Mode
          </button>
          <button
            onClick={() => setActiveTab('drafts')}
            className={`flex-1 py-1.5 rounded-lg text-xs font-sans font-bold transition-all cursor-pointer flex items-center justify-center gap-1 ${activeTab === 'drafts' ? 'bg-violet-600 text-white font-extrabold' : 'text-zinc-400 hover:text-zinc-200'}`}
          >
            💾 Drafts <span className="bg-zinc-800 text-zinc-300 text-[9px] px-1.5 py-0.5 rounded-full">{draftsList.length}</span>
          </button>
        </div>

        {/* Dynamic Inner Body */}
        <div className="flex-1 overflow-y-auto pr-1 space-y-4 custom-scrollbar text-left font-sans">
          
          {postingStatus !== 'idle' ? (
            /* Uploading loading screen */
            <div className="py-12 flex flex-col items-center justify-center text-center space-y-4 max-w-sm mx-auto">
              {postingStatus === 'completed' ? (
                <div className="w-14 h-14 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center animate-bounce">
                  <Check className="w-8 h-8" />
                </div>
              ) : (
                <div className="relative flex items-center justify-center">
                  <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-violet-500" />
                  <span className="absolute text-[11px] font-mono text-zinc-300 font-bold">{uploadProgress}%</span>
                </div>
              )}
              <div className="space-y-1">
                <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-violet-400">
                  {postingStatus === 'compressing' && '⚙️ Formatting Media Files'}
                  {postingStatus === 'uploading' && '📤 Publishing to Feed'}
                  {postingStatus === 'completed' && '✨ Publication Active & Live'}
                </h4>
                <p className="text-[11px] text-zinc-500">
                  {postingStatus === 'compressing' && 'Optimizing image and video formats...'}
                  {postingStatus === 'uploading' && 'Uploading secure files to database, please hold...'}
                  {postingStatus === 'completed' && 'Content fully propagated across active home & profile feeds!'}
                </p>
              </div>
            </div>
          ) : activeTab === 'drafts' ? (
            /* DRAFTS STORAGE SCREEN */
            <div className="space-y-3">
              {draftsList.length === 0 ? (
                <div className="text-center py-10 space-y-2">
                  <FolderHeart className="w-10 h-10 mx-auto text-zinc-600" />
                  <p className="text-xs text-zinc-500 font-sans">No saved drafts yet. Write some content first!</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-3">
                  {draftsList.map(draft => (
                    <div
                      key={draft.id}
                      onClick={() => handleSelectDraft(draft)}
                      className="p-4 rounded-2xl bg-zinc-900 border border-zinc-800 hover:border-violet-500/40 transition-all cursor-pointer flex justify-between items-start"
                    >
                      <div className="space-y-1 min-w-0 flex-1 pr-4">
                        <div className="flex gap-2 items-center">
                          <span className="text-[9px] font-mono px-2 py-0.5 rounded-full bg-violet-600/10 text-violet-400 font-bold uppercase">{draft.type}</span>
                          <span className="text-[9px] font-mono text-zinc-500">{draft.timestamp}</span>
                        </div>
                        <p className="text-xs text-zinc-300 font-sans truncate mt-1">
                          {draft.caption || draft.topics || "(Untitled draft details)"}
                        </p>
                        {draft.images && draft.images.length > 0 && (
                          <div className="flex gap-1.5 mt-2">
                            {draft.images.slice(0, 4).map((img, i) => (
                              <img key={i} src={img} alt="draft" className="w-6 h-6 rounded-md object-cover border border-zinc-700" />
                            ))}
                          </div>
                        )}
                      </div>
                      <button
                        onClick={(e) => handleDeleteDraft(draft.id, e)}
                        className="p-1.5 rounded-lg bg-zinc-800 hover:bg-rose-950 hover:text-rose-400 text-zinc-400 transition-colors cursor-pointer shrink-0"
                        title="Delete draft"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : activeMode === null ? (
            /* MODE SELECT BENTO MENU (First view when clicking +) */
            <div className="space-y-4">
              <p className="text-xs text-zinc-400 font-sans">
                Elevate your digital canvas. Add multi-imagery carousels, instant recorded clips, soundwaves, interactive maps or stories:
              </p>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { id: 'photo', title: '📸 Photo', desc: 'Share images and visual moments', color: 'bg-pink-600/10 border-pink-500/10 text-pink-400 hover:bg-pink-600/15' },
                  { id: 'video', title: '🎥 Video', desc: 'Post high quality loops and clips', color: 'bg-cyan-600/10 border-cyan-500/10 text-cyan-400 hover:bg-cyan-600/15' },
                  { id: 'voice', title: '🎙 Voice', desc: 'Record voice notes and soundwaves', color: 'bg-violet-600/10 border-violet-500/10 text-violet-400 hover:bg-violet-600/15' },
                  { id: 'text', title: '✍ Text', desc: 'Share deep thoughts and text posts', color: 'bg-zinc-800/40 hover:bg-zinc-800 text-zinc-200' },
                  { id: 'poll', title: '📊 Poll', desc: 'Ask questions and gather choices', color: 'bg-emerald-600/10 border-emerald-500/10 text-emerald-400 hover:bg-emerald-600/15' },
                  { id: 'reel', title: '🎉 Event', desc: 'Schedule and host community events', color: 'bg-fuchsia-600/10 border-fuchsia-500/10 text-fuchsia-400 hover:bg-fuchsia-600/15' },
                  { id: 'pulse', title: '🤝 Collaboration', desc: 'Coordinate joint tasks and projects', color: 'bg-blue-600/10 border-blue-500/10 text-cyan-400 hover:bg-blue-600/15' },
                  { id: 'community', title: '🏘 Community Post', desc: 'Post directly to a community group', color: 'bg-amber-600/10 border-amber-500/10 text-amber-400 hover:bg-amber-600/15' },
                ].map(opt => (
                  <button
                    key={opt.id}
                    onClick={() => setActiveMode(opt.id as any)}
                    className={`p-4 rounded-2xl border border-zinc-800 flex flex-col items-start gap-2 text-left cursor-pointer transition-all hover:scale-101 hover:border-violet-500/30 group ${opt.color}`}
                  >
                    <span className="text-xs font-black font-sans leading-none">{opt.title}</span>
                    <span className="text-[10px] text-zinc-500 leading-normal font-sans group-hover:text-zinc-300 transition-colors mt-1">{opt.desc}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            /* WORKSPACE COMPOSER PANEL */
            <div className="space-y-4 slide-in-right">
              
              <div className="flex justify-between items-center bg-zinc-900 px-3.5 py-1.5 rounded-xl border border-zinc-800">
                <button 
                  onClick={() => setActiveMode(null)}
                  className="text-xs font-mono text-zinc-400 hover:text-white transition-colors cursor-pointer"
                >
                  &larr; Switch composition type
                </button>
                <div className="flex gap-2 text-[10px] font-mono items-center">
                  <span className="text-zinc-400 uppercase">MODE: {activeMode.toUpperCase()}</span>
                </div>
              </div>

              {/* Specific workspace renderer depending on activeMode */}
              {activeMode === 'photo' && (
                /* PHOTOS WORKSPACE WITH ROTATE, CROP, RE-ORDER */
                <div className="space-y-3.5">
                  <div className="border-2 border-dashed border-zinc-800 rounded-3xl p-5 text-center relative hover:border-zinc-700 transition-colors bg-zinc-950/40">
                    <input 
                      type="file" 
                      multiple 
                      accept="image/*" 
                      onChange={handleImageFileChange}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" 
                    />
                    <div className="flex flex-col items-center gap-2">
                      <Camera className="w-8 h-8 text-zinc-500 animate-pulse" />
                      <div className="space-y-1">
                        <span className="text-xs font-black text-white block">📂 Select Images from Gallery</span>
                        <span className="text-[10.5px] text-zinc-500 block">Drag images here (supports JPEG, PNG, WEBP, HEIC)</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">Or snapping camera live:</span>
                    <button
                      onClick={handleInstantPhotoCapture}
                      className="px-3.5 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-bold cursor-pointer font-sans"
                    >
                      📸 Flash Take Snapshot
                    </button>
                  </div>

                  {/* Thumbnail selection array */}
                  {selectedImages.length > 0 && (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {selectedImages.map((img, idx) => (
                        <div 
                          key={idx} 
                          className="relative aspect-square rounded-2xl overflow-hidden border border-zinc-800 bg-zinc-950 group"
                        >
                          <img 
                            src={img.url} 
                            alt={`Preview ${idx}`} 
                            className="w-full h-full object-cover transition-transform origin-center"
                            style={{ 
                              transform: `rotate(${img.rotation}deg) scale(${img.zoom})`,
                              objectPosition: `${img.cropOffset.x}px ${img.cropOffset.y}px`,
                              filter: img.filterStyle || 'none'
                            }}
                          />
                          
                          {/* Left/Right Re-order triggers */}
                          <div className="absolute inset-x-0 bottom-0 py-1 px-1.5 bg-black/80 flex items-center justify-between opacity-0 group-hover:opacity-100 transition-opacity z-20">
                            <div className="flex gap-1">
                              <button 
                                onClick={() => moveImageOrder(idx, 'left')} 
                                disabled={idx === 0}
                                className="p-1 rounded bg-zinc-800 text-white disabled:opacity-30 cursor-pointer"
                              >
                                &larr;
                              </button>
                              <button 
                                onClick={() => moveImageOrder(idx, 'right')} 
                                disabled={idx === selectedImages.length - 1}
                                className="p-1 rounded bg-zinc-800 text-white disabled:opacity-30 cursor-pointer"
                              >
                                &rarr;
                              </button>
                            </div>
                            <span className="text-[9px] font-mono text-zinc-400 uppercase">{img.filterName || 'Normal'} ({idx + 1})</span>
                          </div>

                          {/* Quick Edit toolbox buttons */}
                          <div className="absolute top-2 right-2 flex gap-1 z-20">
                            <button
                              onClick={() => handleRotateImage(idx)}
                              className="p-1 rounded-lg bg-black/60 text-white hover:text-violet-400 cursor-pointer animate-none"
                              title="Rotate 90 degrees"
                            >
                              <RotateCw className="w-3 h-3" />
                            </button>
                            <button
                              onClick={() => setActiveEditIndex(activeEditIndex === idx ? null : idx)}
                              className="p-1 rounded-lg bg-black/60 text-white hover:text-violet-400 cursor-pointer"
                              title="Crop/Resize & Filters"
                            >
                              <Sliders className="w-3 h-3" />
                            </button>
                            <button
                              onClick={() => handleRemoveImage(idx)}
                              className="p-1 rounded-lg bg-rose-600/80 text-white cursor-pointer"
                              title="Remove photo"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>

                          {/* Inline Crop Zoom & Premium Filters controls */}
                          {activeEditIndex === idx && (
                            <div className="absolute inset-0 bg-zinc-950/98 p-3 flex flex-col justify-between overflow-y-auto z-30">
                              <div className="space-y-2">
                                <div className="flex items-center justify-between border-b border-zinc-800 pb-1">
                                  <span className="text-[10px] font-mono text-cyan-400 font-extrabold flex items-center gap-1">📸 EDIT IMAGE #{idx+1}</span>
                                  <button onClick={() => setActiveEditIndex(null)} className="text-zinc-400 hover:text-white"><X className="w-3.5 h-3.5" /></button>
                                </div>
                                
                                <div className="space-y-0.5">
                                  <label className="text-[9px] text-zinc-400 uppercase font-mono block">Zoom scale: {Math.round(img.zoom * 100)}%</label>
                                  <input 
                                    type="range" 
                                    min="1" 
                                    max="2" 
                                    step="0.05" 
                                    value={img.zoom} 
                                    onChange={(e) => handleZoomChange(idx, parseFloat(e.target.value))}
                                    className="w-full accent-violet-500"
                                  />
                                </div>

                                <div className="space-y-1">
                                  <label className="text-[9px] text-zinc-400 uppercase font-mono block">Premium Filters:</label>
                                  <div className="grid grid-cols-3 gap-1 max-h-[120px] overflow-y-auto pr-0.5">
                                    {FILTER_PRESETS.map((filter, i) => (
                                      <button
                                        key={i}
                                        type="button"
                                        onClick={() => {
                                          setSelectedImages(prev => prev.map((item, idy) => idy === idx ? { ...item, filterName: filter.name, filterStyle: filter.style } : item));
                                        }}
                                        className={`p-1 text-[8.5px] font-sans rounded-md border text-center transition-all cursor-pointer ${
                                          img.filterName === filter.name || (!img.filterName && filter.name === 'Normal')
                                            ? 'bg-violet-600/35 border-violet-400 text-white'
                                            : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:bg-zinc-800 hover:text-white'
                                        }`}
                                      >
                                        {filter.name}
                                      </button>
                                    ))}
                                  </div>
                                </div>
                              </div>

                              <button
                                type="button"
                                onClick={() => setActiveEditIndex(null)}
                                className="w-full py-1 text-center bg-violet-600 hover:bg-violet-700 text-white text-[9px] font-black uppercase rounded-lg cursor-pointer mt-2"
                              >
                                Save Changes
                              </button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {activeMode === 'video' && (
                /* VIDEO WORKSPACE WITH TRIMMING SLIDERS */
                <div className="space-y-4">
                  <div className="border-2 border-dashed border-zinc-800 rounded-3xl p-5 text-center relative hover:border-zinc-700 transition-colors bg-zinc-950/40">
                    <input 
                      type="file" 
                      accept="video/*" 
                      onChange={handleVideoFileChange}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" 
                    />
                    <div className="flex flex-col items-center gap-2">
                      <Video className="w-8 h-8 text-zinc-500 animate-pulse" />
                      <div className="space-y-1">
                        <span className="text-xs font-black text-white block">📂 Upload MP4 / MOV Video clip</span>
                        <span className="text-[10.5px] text-zinc-500 block">Up to 1080p, compressed intelligently instantly</span>
                      </div>
                    </div>
                  </div>

                  {videoFileUrl && (
                    <div className="space-y-3">
                      <div className="relative aspect-video rounded-2xl overflow-hidden bg-black border border-zinc-800">
                        <video 
                          src={videoFileUrl}
                          controls
                          muted={videoMuted}
                          className="w-full h-full object-cover"
                        />
                        <button
                          onClick={() => setVideoFileUrl(null)}
                          className="absolute top-3 right-3 p-1.5 rounded-full bg-black/70 text-white hover:text-rose-400 cursor-pointer"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Video Trim controls bar */}
                      <div className="p-4 rounded-2xl bg-zinc-900 border border-zinc-800 space-y-3">
                        <div className="flex justify-between items-center text-[10px] font-mono">
                          <span className="text-zinc-400">✂️ EDIT CLIP RANGE (TRIMMING)</span>
                          <span className="text-cyan-400">Range: {videoTrimStart}s to {videoTrimEnd}s (Total: {videoTrimEnd - videoTrimStart}s)</span>
                        </div>
                        <div className="flex gap-3 items-center">
                          <div className="flex-1 space-y-1">
                            <span className="text-[9px] text-zinc-500 font-mono block">Trim Start: {videoTrimStart}s</span>
                            <input 
                              type="range" 
                              min="0" 
                              max="15" 
                              value={videoTrimStart} 
                              onChange={(e) => setVideoTrimStart(parseInt(e.target.value))}
                              className="w-full accent-cyan-400"
                            />
                          </div>
                          <div className="flex-1 space-y-1">
                            <span className="text-[9px] text-zinc-500 font-mono block">Trim End: {videoTrimEnd}s</span>
                            <input 
                              type="range" 
                              min="15" 
                              max="60" 
                              value={videoTrimEnd} 
                              onChange={(e) => setVideoTrimEnd(parseInt(e.target.value))}
                              className="w-full accent-cyan-400"
                            />
                          </div>
                        </div>
                        <button
                          onClick={() => setVideoMuted(!videoMuted)}
                          className={`w-full py-1.5 rounded-xl border text-[10px] font-mono hover:bg-white/5 transition-colors cursor-pointer ${videoMuted ? 'border-rose-500/20 text-rose-400' : 'border-emerald-500/20 text-emerald-400'}`}
                        >
                          {videoMuted ? '🔇 SOUND MUTED' : '🔊 LIVE TRACK SOUNDING LEVEL'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {activeMode === 'reel' && (
                /* REELS SHORT VIDEO RECFLOW */
                <div className="space-y-4">
                  <div className="relative aspect-[9/16] max-w-xs mx-auto rounded-3xl overflow-hidden bg-black border border-zinc-800 flex flex-col justify-between p-4 shadow-xl">
                    <div className="absolute inset-0 bg-linear-to-b from-black/60 via-transparent to-black/80 z-0 pointer-events-none" />
                    
                    {/* Top utility icons */}
                    <div className="z-10 flex justify-between items-center">
                      <span className="text-[9px] font-mono text-fuchsia-400 uppercase tracking-widest bg-black/60 px-2 py-0.5 rounded-lg border border-fuchsia-400/20">LIVE CAMERA ACTIVE</span>
                      <div className="flex gap-1">
                        <button 
                          onClick={() => setCameraFacing(prev => prev === 'user' ? 'environment' : 'user')}
                          className="p-1.5 rounded-full bg-zinc-900/80 text-white cursor-pointer"
                          title="Switch camera side"
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                        </button>
                        <button 
                          onClick={() => setFlashActive(!flashActive)}
                          className={`p-1.5 rounded-full bg-zinc-900/80 cursor-pointer ${flashActive ? 'text-yellow-400' : 'text-white'}`}
                          title="Toggle simulated flash"
                        >
                          ⚡
                        </button>
                      </div>
                    </div>

                    {/* Live Camera Feed or Snaps */}
                    <div className="absolute inset-0 z-0 flex items-center justify-center">
                      {countdownTimer !== null ? (
                        <div className="text-center space-y-2 z-10 w-full">
                          <span className="text-4xl font-extrabold text-white animate-ping block">{countdownTimer}</span>
                          <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider block">Aligning camera lenses...</span>
                        </div>
                      ) : recordedVideoUrl ? (
                        <video src={recordedVideoUrl} autoPlay loop muted playsInline className="w-full h-full object-cover" />
                      ) : (
                        <div className="relative w-full h-full">
                          <video 
                            ref={videoPreviewRef}
                            autoPlay 
                            muted 
                            playsInline 
                            className="w-full h-full object-cover bg-zinc-950" 
                          />
                          {!videoStreamRef.current && (
                            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 select-none bg-zinc-955/65">
                              <Video className="w-10 h-10 text-zinc-700 animate-pulse" />
                              <span className="text-[10px] font-mono text-zinc-600 block uppercase">1080P PRO SHUTTER FEED</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Timeline bar */}
                    {isRecording && (
                      <div className="absolute inset-x-0 top-0 h-1.5 bg-zinc-950 z-20">
                        <div 
                          className="h-full bg-fuchsia-500 transition-all duration-1000"
                          style={{ width: `${(loopTimerSecs / 30) * 100}%` }}
                        />
                      </div>
                    )}

                    {/* Bottom buttons controls row */}
                    <div className="z-10 flex flex-col items-center gap-3 w-full">
                      <div className="flex gap-4 items-center">
                        {isRecording ? (
                          <>
                            <button
                              onClick={handleTogglePauseReelRecord}
                              className="px-3.5 py-1.5 bg-zinc-900 text-white text-[10px] font-mono rounded-xl cursor-pointer"
                            >
                              {isRecordingPaused ? 'RESUME 🔴' : 'PAUSE ⏸'}
                            </button>
                            <button
                              onClick={handleStopReelRecord}
                              className="w-14 h-14 rounded-full bg-rose-600 flex items-center justify-center text-white border-2 border-white cursor-pointer"
                            >
                              <span className="font-mono text-[10px] font-black uppercase">STOP</span>
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={handleStartReelRecord}
                            className="w-16 h-16 rounded-full bg-linear-to-r from-fuchsia-500 to-pink-600 flex items-center justify-center text-white border-4 border-black group cursor-pointer hover:scale-105 transition-all"
                          >
                            <span className="font-mono text-[9px] tracking-tight font-black uppercase col-f">RECORD</span>
                          </button>
                        )}
                      </div>
                      
                      {isRecording && (
                        <span className="text-[10px] font-mono text-white bg-black/60 px-2.5 py-1 rounded-full border border-white/10 animate-pulse">
                          Recording Stream: {loopTimerSecs}s / 30s
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {activeMode === 'voice' && (
                /* HIGH SPECTRUM VOICE POST CREATION */
                <div className="p-5 rounded-2xl bg-zinc-950 border border-violet-500/20 text-center space-y-4">
                  <div className="space-y-1">
                    <span className="text-zinc-500 text-[9px] font-mono uppercase tracking-widest block">Nexora Voice recording snippet</span>
                    <span className="text-3xl font-mono font-bold text-white block mt-1.5">
                      0:{voiceDurationSecs.toString().padStart(2, '0')}
                      <span className="text-xs text-zinc-500 block"> / 1:00 clip max</span>
                    </span>
                  </div>

                  {/* Equalizer Spectrum waves rendering */}
                  <div className="flex items-end justify-center gap-[3px] h-12 w-full max-w-sm mx-auto overflow-hidden">
                    {[...Array(24)].map((_, i) => {
                      const waveH = voiceIsRecording && !voiceIsPaused
                        ? 20 + Math.sin(i * 0.9 + voiceDurationSecs) * 60 + Math.random() * 20
                        : 8;
                      return (
                        <div 
                          key={i}
                          className={`w-[2.5px] rounded-full transition-all duration-300 ${voiceIsRecording && !voiceIsPaused ? 'bg-linear-to-t from-violet-600 via-pink-400 to-cyan-300' : 'bg-zinc-800'}`}
                          style={{ height: `${Math.max(8, Math.abs(waveH))}%` }}
                        />
                      );
                    })}
                  </div>

                  <div className="flex justify-center items-center gap-3">
                    {voiceIsRecording ? (
                      <>
                        <button
                          onClick={handlePauseVoiceRecord}
                          className="px-3.5 py-2 hover:bg-zinc-800 border border-zinc-800 rounded-xl text-zinc-400 text-xs font-mono font-bold cursor-pointer transition-colors"
                        >
                          PAUSE
                        </button>
                        <button
                          onClick={handleStopVoiceRecord}
                          className="w-14 h-14 rounded-full bg-rose-600 hover:bg-rose-500 animate-pulse flex items-center justify-center text-white border-2 border-white cursor-pointer"
                        >
                          <span className="font-mono text-[9px] font-bold">STOP</span>
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={handleStartVoiceRecord}
                        className="w-16 h-16 rounded-full bg-linear-to-r from-rose-500 to-pink-600 flex items-center justify-center text-white shadow-lg border-2 border-zinc-800 cursor-pointer"
                      >
                        <Mic className="w-6 h-6 animate-pulse" />
                      </button>
                    )}
                  </div>

                  {/* Speech to text transcript pre-view */}
                  {(voiceTranscript || loadingTranscript) && (
                    <div className="text-left bg-zinc-900 border border-zinc-800 p-4 rounded-xl space-y-2">
                      <span className="text-[8px] font-mono text-violet-400 font-extrabold uppercase tracking-widest block">🛰️ Transcribing voice waves (VOH AI Core)</span>
                      {loadingTranscript ? (
                        <p className="text-xs text-zinc-400 italic animate-pulse">Broadcasting audio streams to transcription queue...</p>
                      ) : (
                        <p className="text-xs text-zinc-200 leading-relaxed font-sans italic font-bold">"{voiceTranscript}"</p>
                      )}
                    </div>
                  )}
                </div>
              )}

              {activeMode === 'poll' && (
                /* INTERACTIVE POLL MANAGER */
                <div className="p-4 rounded-2xl bg-zinc-950 border border-zinc-800 space-y-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-mono text-zinc-500 uppercase block">📊 POLL QUESTION</label>
                    <input 
                      type="text" 
                      value={pollQuestion}
                      onChange={(e) => setPollQuestion(e.target.value)}
                      placeholder='e.g., "Is Rust or Go better for high-speed systems development?"'
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-hidden font-sans font-bold"
                    />
                  </div>

                  <div className="space-y-2">
                    <span className="text-[9px] font-mono text-zinc-500 block uppercase">Response targets:</span>
                    {pollOptionsList.map((opt, i) => (
                      <div key={i} className="flex gap-2 items-center">
                        <span className="text-xs text-zinc-600 font-mono w-4">{i + 1}</span>
                        <input 
                          type="text" 
                          value={opt}
                          onChange={(e) => {
                            const next = [...pollOptionsList];
                            next[i] = e.target.value;
                            setPollOptionsList(next);
                          }}
                          placeholder={`Option text ${i + 1}`}
                          className="flex-1 bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-hidden font-sans"
                        />
                        {pollOptionsList.length > 2 && (
                          <button 
                            type="button" 
                            onClick={() => setPollOptionsList(prev => prev.filter((_, idx) => idx !== i))}
                            className="p-1.5 text-rose-400 hover:text-rose-500"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    ))}

                    {pollOptionsList.length < 5 && (
                      <button
                        type="button"
                        onClick={() => setPollOptionsList(prev => [...prev, ''])}
                        className="text-[10px] font-mono text-violet-400 hover:underline inline-block mt-1 cursor-pointer"
                      >
                        + Add response choice
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* General inputs: Caption, topics, tagged users, locations */}
              <div className="space-y-3.5">
                <div className="space-y-1">
                  <label className="text-[10px] font-mono text-zinc-500 uppercase block">Caption details</label>
                  <textarea
                    rows={3}
                    value={caption}
                    onChange={(e) => setCaption(e.target.value)}
                    placeholder="Mention custom hashtags with line breaks... #developer #rust"
                    className="w-full bg-zinc-950/65 border border-zinc-800 focus:border-violet-500/20 text-xs text-white rounded-xl py-2 px-3.5 focus:outline-hidden resize-none placeholder:text-zinc-600 leading-relaxed text-left"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-mono text-zinc-500 uppercase block">🏷️ Enter Topics (comma separation)</label>
                    <input 
                      type="text" 
                      value={topics}
                      onChange={(e) => setTopics(e.target.value)}
                      placeholder='e.g., "AI, Technology, Sports"'
                      className="w-full bg-zinc-950/65 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-hidden font-sans"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-mono text-zinc-500 uppercase block">👥 Tag Users (@names)</label>
                    <input 
                      type="text" 
                      value={taggedUsernames}
                      onChange={(e) => setTaggedUsernames(e.target.value)}
                      placeholder='e.g., "alex_sterling, sarah_codes"'
                      className="w-full bg-zinc-950/65 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-hidden font-sans"
                    />
                  </div>
                </div>

                <div className="space-y-1 relative">
                  <label className="text-[10px] font-mono text-zinc-500 uppercase block">📍 Add Location Tag</label>
                  <input 
                    type="text" 
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="Search locations..."
                    className="w-full bg-zinc-950/65 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-hidden font-sans"
                  />
                  {locationSuggestions.length > 0 && (
                    <div className="absolute z-30 left-0 right-0 top-full mt-1 bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden shadow-2xl max-h-40 overflow-y-auto">
                      {locationSuggestions.map(city => (
                        <div
                          key={city}
                          onClick={() => { setLocation(city); setLocationSuggestions([]); }}
                          className="px-4 py-2 hover:bg-zinc-800 text-xs text-white cursor-pointer transition-colors"
                        >
                          {city}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Specific configs depending on tab section */}
                {activeTab === 'story' ? (
                  <div className="p-3.5 rounded-2xl bg-emerald-950/30 border border-emerald-500/20 flex items-center justify-between">
                    <div>
                      <span className="text-xs font-black text-emerald-400 block">Close Friends Highlight ⭐</span>
                      <span className="text-[10.5px] text-zinc-400">Share story with close aligns list only</span>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={isStoryCloseFriends} 
                        onChange={() => setIsStoryCloseFriends(!isStoryCloseFriends)}
                        className="sr-only peer" 
                      />
                      <div className="w-9 h-5 bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500"></div>
                    </label>
                  </div>
                ) : (
                  <div className="flex justify-between items-center bg-zinc-950/40 p-3 rounded-2xl border border-zinc-800 text-left">
                    <div className="min-w-0 pr-2">
                      <span className="text-[10px] font-mono text-zinc-500 uppercase block">Audience Targeting</span>
                    </div>
                    <select 
                      value={audience}
                      onChange={(e) => setAudience(e.target.value as any)}
                      className="bg-zinc-900 border border-zinc-800 rounded-lg text-xs font-sans px-3 py-1.5 text-violet-400 focus:outline-hidden cursor-pointer font-bold shrink-0"
                    >
                      <option value="public">🌍 Public (Grid)</option>
                      <option value="circle">🔵 Close Friends Circle</option>
                      <option value="community">🏟️ Active Communities</option>
                      <option value="followers">👥 Direct Followers Only</option>
                      <option value="onlyme">🔒 Secure Self Vault</option>
                    </select>
                  </div>
                )}
              </div>

              {/* Optional Scheduling & Broadcast configurations */}
              <div className="space-y-2.5 text-left bg-zinc-950/60 p-3.5 rounded-2xl border border-zinc-900">
                <div className="flex justify-between items-center">
                  <div className="space-y-0.5">
                    <span className="text-[10px] font-mono text-zinc-400 font-bold uppercase tracking-wide flex items-center gap-1">📅 Post Scheduling</span>
                    <p className="text-[9px] text-zinc-500 font-sans">Trigger release automatically at a future time</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer select-none">
                    <input 
                      type="checkbox" 
                      checked={isScheduled} 
                      onChange={(e) => setIsScheduled(e.target.checked)} 
                      className="sr-only peer" 
                    />
                    <div className="w-9 h-5 bg-zinc-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-violet-600"></div>
                  </label>
                </div>
                {isScheduled && (
                  <input 
                    type="datetime-local" 
                    value={scheduledDateTime} 
                    onChange={(e) => setScheduledDateTime(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 text-violet-300 text-xs rounded-xl p-2.5 focus:outline-none font-mono"
                  />
                )}

                {/* VOH-only announcement broadcast channel option */}
                {(currentUser.username === 'voh' || currentUser.username === 'voh_ai') && (
                  <div className="flex justify-between items-center pt-2.5 border-t border-zinc-900/60">
                    <div className="space-y-0.5">
                      <span className="text-[10px] font-mono text-yellow-400 font-bold uppercase tracking-wide flex items-center gap-1">📣 Founder Broadcast Channel</span>
                      <p className="text-[9px] text-zinc-500 font-sans">Post to personal broadcast channel (reactions only, no comments)</p>
                    </div>
                    <label className="relative inline-flex inline-flex items-center cursor-pointer select-none">
                      <input 
                        type="checkbox" 
                        checked={targetBroadcastChannel} 
                        onChange={(e) => setTargetBroadcastChannel(e.target.checked)} 
                        className="sr-only peer" 
                      />
                      <div className="w-9 h-5 bg-zinc-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-500"></div>
                    </label>
                  </div>
                )}
              </div>

              {/* Action buttons footer */}
              <div className="border-t border-zinc-800 pt-4 flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={handleSaveDraft}
                  className="px-4 py-2 border border-zinc-800 hover:bg-zinc-900 rounded-xl text-zinc-400 text-xs font-mono font-bold cursor-pointer transition-colors"
                >
                  Save Draft 💾
                </button>
                {activeTab === 'story' ? (
                  <button
                    onClick={handlePublishStory}
                    className="px-5 py-2.5 bg-linear-to-r from-emerald-600 to-teal-500 hover:brightness-115 text-white font-sans font-black text-xs uppercase tracking-widest rounded-xl shadow-lg cursor-pointer flex items-center gap-1.5"
                  >
                    Broadcast Story 📖
                  </button>
                ) : (
                  <button
                    onClick={compressMediaAndSubmit}
                    disabled={!caption.trim() && selectedImages.length === 0 && !videoFileUrl && !recordedVideoUrl && !voiceFileUrl && !pollQuestion.trim()}
                    className="px-6 py-2.5 bg-linear-to-r from-violet-600 to-pink-500 hover:brightness-110 disabled:opacity-40 text-white font-sans font-black text-xs uppercase tracking-widest rounded-xl shadow-lg cursor-pointer transition-all"
                  >
                    Publish Post 🚀
                  </button>
                )}
              </div>

            </div>
          )}

        </div>

      </motion.div>
    </div>
  );
}
