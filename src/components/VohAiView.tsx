import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, Mic, MicOff, Volume2, VolumeX, FileText, Send, BrainCircuit, ClipboardCopy, Info, CheckCircle, TrendingUp, Award, Compass, Search, Plus, Trash2, Pin, Archive, FolderPlus, Folder, RefreshCw, HelpCircle, ShieldCheck, AlertTriangle, FileCheck, ThumbsUp, MessageSquare, Sparkle, PenSquare, Users, Settings, X, Play, Square, BookOpen, DollarSign, Cpu, Database, HardDrive, Bell, Layers, Lock, UserCheck, Activity, Eye, Forward } from 'lucide-react';
import VohIcon from './VohIcon';
import { User, Post, Circle, Notification } from '../types';
import RelativeTimestamp from './RelativeTimestamp';
import NexoraLoader from './NexoraLoader';
import { 
  ChatEngine, 
  ChatSession, 
  ChatFolder, 
  Message,
  VoiceEngine, 
  VoiceConfig, 
  MemoryEngine, 
  UserMemoryProfile,
  SettingsEngine, 
  PromptEngine, 
  QuickAssistantCard,
  AnalyticsEngine,
  CreatorEngine,
  ModerationEngine,
  RecommendationEngine,
  SearchEngine,
  ProfileEngine,
  NotificationEngine,
  FeedIntelligenceEngine,
  CreatorRankingEngine,
  MediaStreamingEngine,
  SearchDiscoveryEngine,
  TrustSafetyEngine,
  CommunityEngine,
  MessagingEngine,
  VohAiIntelligenceEngine,
  ProfileReputationEngine,
  SearchIndexData,
  NotificationItem,
  CommunityConfig,
  FeedIntelligenceService,
  CreatorRankingService,
  MediaStreamingService,
  SearchDiscoveryService,
  RecommendationService,
  NotificationService,
  CommunityService,
  MessagingService,
  VohAiIntelligenceService,
  ProfileReputationService,
  EngagementService,
  TrendIntelligenceService,
  ContentDistributionService,
  ModerationTrustService,
  AchievementService,
  CreatorStudioService,
  SocialGraphService,
  MediaProcessingService,
  RealTimeSyncService,
  PlatformAnalyticsService,
  SecurityService,
  OfflineService,
  PersonalizationService,
  PlatformHealthService,
  FeatureFlagService,
  ALL_25_ENGINES,
  TERMINOLOGY,
  updateTerminology,
  resetTerminology
} from '../services/voh';

interface VohAiViewProps {
  currentUser: User;
  posts: Post[];
  onAddPost: (content: string, imageUrl?: string, tagsString?: string) => void;
  setActiveTab: (tab: any) => void;
}

type AISubView = 'chat' | 'voice' | 'assistants' | 'engines' | 'search' | 'ecosystem' | 'moderation' | 'settings';

export default function VohAiView({ currentUser, posts, onAddPost, setActiveTab }: VohAiViewProps) {
  // Navigation
  const [activeSubView, setActiveSubView] = useState<AISubView>('chat');

  // Engines Data State
  const [sessions, setSessions] = useState<ChatSession[]>(() => ChatEngine.getSessions());
  const [folders, setFolders] = useState<ChatFolder[]>(() => ChatEngine.getFolders());
  const [activeSessionId, setActiveSessionId] = useState<string>(() => sessions[0]?.id || 'default-session');
  const [voiceConfig, setVoiceConfig] = useState<VoiceConfig>(() => VoiceEngine.getConfig());
  const [memoryProfile, setMemoryProfile] = useState<UserMemoryProfile>(() => MemoryEngine.getMemory());
  const [aiSettings, setAiSettings] = useState(() => SettingsEngine.getSettings());

  // Input States
  const [query, setQuery] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [folderName, setFolderName] = useState('');
  const [showFolderModal, setShowFolderModal] = useState(false);
  const [editingMsgId, setEditingMsgId] = useState<string | null>(null);
  const [editMsgText, setEditMsgText] = useState('');

  // Attached Context Awareness States
  const [attachedContextType, setAttachedContextType] = useState<'feed' | 'profile' | 'inbox' | 'none'>('feed');
  const [memoryDNA, setMemoryDNA] = useState<string[]>(['Systems Design', 'Port Harcourt startup nodes', 'Figma SVG layout tokens', 'Wizkid vs Davido football discussions', 'Fira Code typography']);

  // UI state indicators
  const [loadingAi, setLoadingAi] = useState(false);
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [generatingMessageId, setGeneratingMessageId] = useState<string | null>(null);
  const [typingIndicator, setTypingIndicator] = useState(false);

  // Voice AI States
  const [isRecording, setIsRecording] = useState(false);
  const [continuousListening, setContinuousListening] = useState(false);
  const [voiceTimer, setVoiceTimer] = useState(0);
  const [waveformNodes, setWaveformNodes] = useState<number[]>(Array(18).fill(8));
  const [transcription, setTranscription] = useState('');
  const [translation, setTranslation] = useState('');
  const [summarizedText, setSummarizedText] = useState('');
  const [isSynthesizingVoice, setIsSynthesizingVoice] = useState(false);
  const [playbackActive, setPlaybackActive] = useState<string | null>(null);

  // Search Assistant States
  const [aiSearchInput, setAiSearchInput] = useState('');
  const [intelligentResults, setIntelligentResults] = useState<any>(null);

  // Moderation Sandbox States
  const [moderationText, setModerationText] = useState('');
  const [moderationResult, setModerationResult] = useState<any>(null);
  const [reportText, setReportText] = useState('');
  const [reportedContent, setReportedContent] = useState('');
  const [reportedAnalysis, setReportedAnalysis] = useState<string>('');

  // Toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // ─── INTERACTIVE CORE ENGINES CONTROL STATES ───
  const [selectedEngineId, setSelectedEngineId] = useState<string>('feed');

  const [simInputs, setSimInputs] = useState<Record<string, any>>({});

  useEffect(() => {
    const eng = ALL_25_ENGINES.find(e => e.id === selectedEngineId);
    if (eng) {
      const defaults: Record<string, any> = {};
      eng.controls.forEach(c => {
        defaults[c.key] = c.defaultValue;
      });
      setSimInputs(defaults);
    }
  }, [selectedEngineId]);
  
  // Feed Intelligence states
  const [feedWatchTime, setFeedWatchTime] = useState<number>(24);
  const [feedRewatches, setFeedRewatches] = useState<number>(2);
  const [feedLiked, setFeedLiked] = useState<boolean>(true);
  const [feedCommented, setFeedCommented] = useState<boolean>(true);
  const [feedShared, setFeedShared] = useState<boolean>(false);
  const [feedSaved, setFeedSaved] = useState<boolean>(true);
  const [feedFollowed, setFeedFollowed] = useState<boolean>(false);
  const [feedNotInterested, setFeedNotInterested] = useState<boolean>(false);
  const [feedFreshness, setFeedFreshness] = useState<number>(4);

  // Creator Ranking states
  const [creatorPostsCount, setCreatorPostsCount] = useState<number>(18);
  const [creatorRetention, setCreatorRetention] = useState<number>(0.72);
  const [creatorReplyRate, setCreatorReplyRate] = useState<number>(0.85);
  const [creatorOriginal, setCreatorOriginal] = useState<boolean>(true);
  const [creatorSpamFlags, setCreatorSpamFlags] = useState<number>(0);

  // Media Streaming states
  const [streamNetwork, setStreamNetwork] = useState<'slow-2g' | '2g' | '3g' | '4g' | 'wifi'>('wifi');
  const [streamBattery, setStreamBattery] = useState<number>(0.85);
  const [streamMemory, setStreamMemory] = useState<number>(340);

  // Search & Discovery states
  const [searchEngineQuery, setSearchEngineQuery] = useState<string>('football');

  // Notification states
  const [notificationSimType, setNotificationSimType] = useState<'spark' | 'comment' | 'follow'>('spark');
  const [notificationSimCount, setNotificationSimCount] = useState<number>(4);

  // Trust & Safety states
  const [safetyAuditText, setSafetyAuditText] = useState<string>('Earn fast money! Click here for free crypto doubling now!');

  // Community states
  const [communityMemberRole, setCommunityMemberRole] = useState<'founder' | 'moderator' | 'member'>('member');

  // Messaging states
  const [msgSimText, setMsgSimText] = useState<string>('Hey, did you see Nigeria\'s match highlights? Send the video link!');
  const [msgSimIsRead, setMsgSimIsRead] = useState<boolean>(false);
  const [msgSimTyping, setMsgSimTyping] = useState<boolean>(true);

  // VOH AI states
  const [vohAiTopicText, setVohAiTopicText] = useState<string>('Lagos startups networking dinner');

  // Profile & Reputation states
  const [reputationSimType, setReputationSimType] = useState<'spark_received' | 'comment_received' | 'community_post' | 'reported_spam' | 'achievement_completed'>('spark_received');

  // Next-generation engine simulation states
  const [trendCategory, setTrendCategory] = useState<'technology' | 'sports' | 'music' | 'business'>('technology');
  const [distInitialLikes, setDistInitialLikes] = useState<number>(120);
  const [distWatchPct, setDistWatchPct] = useState<number>(75);
  const [distShares, setDistShares] = useState<number>(14);
  const [modReportsCount, setModReportsCount] = useState<number>(0);
  const [modDupAttempts, setModDupAttempts] = useState<number>(0);
  const [syncLocalPackets, setSyncLocalPackets] = useState<number>(12);
  const [syncServerPackets, setSyncServerPackets] = useState<number>(12);
  const [securityIp, setSecurityIp] = useState<string>('192.168.1.45');
  const [securityFingerprintMatch, setSecurityFingerprintMatch] = useState<boolean>(true);
  const [featureFlagTier, setFeatureFlagTier] = useState<'alpha' | 'beta' | 'general'>('beta');

  // Terminology and Copy Dictionary customizer state
  const [terminologyState, setTerminologyState] = useState(() => ({ ...TERMINOLOGY }));

  const handleTerminologyChange = (key: keyof typeof TERMINOLOGY, val: string) => {
    updateTerminology(key, val);
    setTerminologyState({ ...TERMINOLOGY });
  };

  const handleTerminologyReset = () => {
    resetTerminology();
    setTerminologyState({ ...TERMINOLOGY });
  };

  // Chat Sessions refs & sync
  useEffect(() => {
    ChatEngine.saveSessions(sessions);
  }, [sessions]);

  useEffect(() => {
    ChatEngine.saveFolders(folders);
  }, [folders]);

  useEffect(() => {
    VoiceEngine.saveConfig(voiceConfig);
  }, [voiceConfig]);

  useEffect(() => {
    MemoryEngine.saveMemory(memoryProfile);
  }, [memoryProfile]);

  useEffect(() => {
    SettingsEngine.saveSettings(aiSettings);
  }, [aiSettings]);

  const activeSession = sessions.find(s => s.id === activeSessionId) || sessions[0];

  const createNewSession = (initialPrompt?: string, title?: string) => {
    const newSession: ChatSession = {
      id: `session-${Date.now()}`,
      title: title || (initialPrompt ? initialPrompt.slice(0, 24) + '...' : `New Dialogue ${sessions.length + 1}`),
      messages: initialPrompt ? [
        { id: `msg-${Date.now()}-user`, sender: 'user', text: initialPrompt, timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }
      ] : [
        {
          id: `msg-${Date.now()}-welcome`,
          sender: 'voh',
          text: "Let's co-build something spectacular. How can I assist you today?",
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ],
      createdAt: new Date().toISOString(),
      isPinned: false,
      isArchived: false,
      folderId: null
    };

    setSessions(prev => [newSession, ...prev]);
    setActiveSessionId(newSession.id);
    if (initialPrompt) {
      triggerAiResponse(newSession.id, initialPrompt, newSession.messages);
    }
  };

  const deleteSession = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSessions(prev => prev.filter(s => s.id !== id));
    showToast("Session removed.");
  };

  const togglePinSession = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSessions(prev => prev.map(s => s.id === id ? { ...s, isPinned: !s.isPinned } : s));
  };

  const toggleArchiveSession = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSessions(prev => prev.map(s => s.id === id ? { ...s, isArchived: !s.isArchived } : s));
    showToast("Session status updated.");
  };

  // Speech Recognition hook for continuous listening
  const recognitionRef = useRef<any>(null);
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const rec = VoiceEngine.getSpeechRecognition();
      if (rec) {
        rec.onresult = (event: any) => {
          const currentText = event.results[event.results.length - 1][0].transcript;
          setQuery(prev => prev + (prev.endsWith(' ') || prev === '' ? '' : ' ') + currentText);
        };
        rec.onerror = (event: any) => {
          console.error("Speech Recognition Error:", event.error);
        };
        recognitionRef.current = rec;
      }
    }
  }, []);

  const toggleContinuousListening = () => {
    if (!recognitionRef.current) {
      showToast("Speech Recognition API not supported in your browser.");
      return;
    }
    if (continuousListening) {
      recognitionRef.current.stop();
      setContinuousListening(false);
      showToast("Continuous listening standby.");
    } else {
      recognitionRef.current.start();
      setContinuousListening(true);
      showToast("Continuous listening active. Speak freely!");
    }
  };

  // Mic Record Audio Stream Mock & Real handler
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const startMicRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        setIsSynthesizingVoice(true);
        
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = async () => {
          const base64Data = reader.result;
          const base64String = (base64Data as string).split(',')[1];
          try {
            const data = await VoiceEngine.uploadVoice(base64String);
            setIsDemoMode(!!data.isDemo);
            setTranscription(data.transcription);
            setTranslation("Region-aligned translation");
            setSummarizedText("Transcribed voice post");
            showToast("Voice broadcast processed!");
          } catch (err) {
            // Simulated Fallback
            setTranscription("Expanding our local community and adding system design metrics to help co-build the feed!");
            setTranslation("General expansion overview.");
            setSummarizedText("Ecosystem discussion.");
          } finally {
            setIsSynthesizingVoice(false);
          }
        };
      };

      mediaRecorder.start();
      setIsRecording(true);
      setVoiceTimer(0);
      timerRef.current = setInterval(() => {
        setVoiceTimer(prev => prev + 1);
        setWaveformNodes(prev => prev.map(() => Math.floor(Math.random() * 45) + 10));
      }, 100);

    } catch (err) {
      console.warn("Using virtual audio simulator.", err);
      setIsRecording(true);
      setVoiceTimer(0);
      timerRef.current = setInterval(() => {
        setVoiceTimer(prev => prev + 1);
        setWaveformNodes(prev => prev.map(() => Math.floor(Math.random() * 45) + 10));
      }, 100);
    }
  };

  const stopMicRecording = () => {
    setIsRecording(false);
    if (timerRef.current) clearInterval(timerRef.current);
    setWaveformNodes(Array(18).fill(8));

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    } else {
      setIsSynthesizingVoice(true);
      setTimeout(() => {
        setTranscription("We are designing a gorgeous space-glass interface with high-reputation communities in Port Harcourt!");
        setTranslation("Port Harcourt design parameters.");
        setSummarizedText("Design token blueprint.");
        setIsSynthesizingVoice(false);
      }, 1200);
    }
  };

  // Core Dialogue Handler
  const handleSendPrompt = async (e?: React.FormEvent, customPrompt?: string) => {
    if (e) e.preventDefault();
    const textToSend = customPrompt || query;
    if (!textToSend.trim()) return;

    if (!customPrompt) setQuery('');
    setLoadingAi(true);
    setTypingIndicator(true);

    // Update session state with user message
    const userMsgId = `msg-${Date.now()}-user`;
    const updatedMessages: Message[] = [
      ...(activeSession?.messages || []),
      { id: userMsgId, sender: 'user', text: textToSend, timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }
    ];

    setSessions(prev => prev.map(s => s.id === activeSessionId ? { ...s, messages: updatedMessages, title: s.title.startsWith('New Dialogue') ? textToSend.slice(0, 24) + '...' : s.title } : s));

    await triggerAiResponse(activeSessionId, textToSend, updatedMessages);
  };

  const triggerAiResponse = async (sessionId: string, message: string, currentHistory: Message[]) => {
    const aiMsgId = `msg-${Date.now()}-voh`;
    setGeneratingMessageId(aiMsgId);

    try {
      // Map helper formats
      const mappedHistory = currentHistory.map(m => ({ sender: m.sender, text: m.text }));
      
      // Smart dynamic context inject based on attachedContextType
      let contextualMessage = message;
      if (attachedContextType === 'feed') {
        const feedCount = posts ? posts.length : 15;
        contextualMessage = `[SYSTEM CONTEXT: The user is currently reading their Home Feed. There are ${feedCount} active posts in their timeline. The regional trend node is Rivers State/Port Harcourt, Niger Delta, Nigeria. Top hashtags: #SpaceGlass, #SystemsDesign.]\n\nUser query: ${message}`;
      } else if (attachedContextType === 'profile') {
        contextualMessage = `[SYSTEM CONTEXT: The user is checking their Creator Profile dashboard. Username: @${currentUser.username}, Display: ${currentUser.name}, Reputation Points: ${currentUser.reputationPoints} PR, Wallet: ${currentUser.nexBalance || 0} NEX, Earned This Week: ${currentUser.thisWeekEarnedNex || 0} NEX, Bio: ${currentUser.bio || 'Co-building Nexora network'}.]\n\nUser query: ${message}`;
      } else if (attachedContextType === 'inbox') {
        contextualMessage = `[SYSTEM CONTEXT: The user is browsing their Direct Messages and Community Alerts. Security sync: Encrypted tunnel is ACTIVE. Active communities joined: 4 spaces.]\n\nUser query: ${message}`;
      }

      const response = await ChatEngine.sendChatMessage(contextualMessage, mappedHistory, currentUser);
      setIsDemoMode(!!response.isDemo);

      const responseText = response.text;
      const responseMessage: Message = {
        id: aiMsgId,
        sender: 'voh',
        text: '', // Start empty for typing stream effect
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        reactions: []
      };

      // Add the empty message to state first
      setSessions(prev => prev.map(s => s.id === sessionId ? { ...s, messages: [...s.messages, responseMessage] } : s));

      // Typewriter stream effect - split by words for visual fluidity
      const words = responseText.split(' ');
      let currentTypedText = '';
      let wordIndex = 0;

      // Disable typing indicator once streaming begins
      setTypingIndicator(false);

      const streamTimer = setInterval(() => {
        if (wordIndex < words.length) {
          currentTypedText += (wordIndex === 0 ? '' : ' ') + words[wordIndex];
          setSessions(prev => prev.map(s => s.id === sessionId ? {
            ...s,
            messages: s.messages.map(m => m.id === aiMsgId ? { ...m, text: currentTypedText } : m)
          } : s));
          wordIndex++;
        } else {
          clearInterval(streamTimer);
          // Auto TTS if voice config auto-read is on
          if (voiceConfig.autoRead) {
            VoiceEngine.speak(responseText, voiceConfig);
          }
        }
      }, 30); // 30ms per word reveal

    } catch (err) {
      console.error(err);
      const failedMessage: Message = {
        id: aiMsgId,
        sender: 'voh',
        text: "❌ **Response Error**: We couldn't connect to VOH AI. Please try again in a moment.",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isFailed: true
      };
      setSessions(prev => prev.map(s => s.id === sessionId ? { ...s, messages: [...s.messages, failedMessage] } : s));
    } finally {
      setLoadingAi(false);
      setTypingIndicator(false);
      setGeneratingMessageId(null);
    }
  };

  // Global Context Aware Listener Hook
  useEffect(() => {
    const handleTriggerPrompt = (e: any) => {
      if (e.detail) {
        const { prompt, contextType } = e.detail;
        setActiveSubView('chat');
        if (contextType) {
          setAttachedContextType(contextType);
        }
        setQuery(prompt);
        // Dispatch send action after state settles
        setTimeout(() => {
          handleSendPrompt(undefined, prompt);
        }, 150);
      }
    };
    window.addEventListener('voh-ai-trigger-prompt' as any, handleTriggerPrompt);
    return () => window.removeEventListener('voh-ai-trigger-prompt' as any, handleTriggerPrompt);
  }, [sessions, activeSessionId, attachedContextType]);

  const handleImprovePostQuery = async () => {
    if (!query.trim()) return;
    setLoadingAi(true);
    showToast("Polishing your command...");
    try {
      const res = await fetch('/api/voh-ai/improve-post', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: query })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.improved) {
          setQuery(data.improved);
          showToast("Command polished successfully! ✨");
        }
      } else {
        throw new Error("Local fallback");
      }
    } catch (err) {
      console.warn("Using localized command expansions.", err);
      setQuery(`Analyze the current system details regarding: "${query}". Provide a highly detailed breakdown referencing regional pulse and decentralized database synchronization logs.`);
      showToast("Expanded query structure.");
    } finally {
      setLoadingAi(false);
    }
  };

  // Regenerate Response
  const handleRegenerate = async (msgId: string) => {
    const sessionToFix = sessions.find(s => s.id === activeSessionId);
    if (!sessionToFix) return;
    
    // Find the message index, remove it and all following messages
    const idx = sessionToFix.messages.findIndex(m => m.id === msgId);
    if (idx === -1) return;

    // Get prompt immediately preceding this
    const userPromptMsg = sessionToFix.messages[idx - 1];
    if (!userPromptMsg || userPromptMsg.sender !== 'user') return;

    const trimmedHistory = sessionToFix.messages.slice(0, idx);
    setSessions(prev => prev.map(s => s.id === activeSessionId ? { ...s, messages: trimmedHistory } : s));
    setLoadingAi(true);
    setTypingIndicator(true);

    await triggerAiResponse(activeSessionId, userPromptMsg.text, trimmedHistory);
  };

  // Edit Prompt
  const handleEditPrompt = (msgId: string, newText: string) => {
    const session = sessions.find(s => s.id === activeSessionId);
    if (!session) return;
    
    const idx = session.messages.findIndex(m => m.id === msgId);
    if (idx === -1) return;

    const trimmedHistory = session.messages.slice(0, idx);
    const updatedUserMsg: Message = {
      ...session.messages[idx],
      text: newText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    const newHistory = [...trimmedHistory, updatedUserMsg];
    setSessions(prev => prev.map(s => s.id === activeSessionId ? { ...s, messages: newHistory } : s));
    setLoadingAi(true);
    setTypingIndicator(true);

    triggerAiResponse(activeSessionId, newText, newHistory);
    setEditingMsgId(null);
  };

  // Message Reaction toggle
  const handleReactToMessage = (msgId: string, emoji: string) => {
    setSessions(prev => prev.map(s => s.id === activeSessionId ? {
      ...s,
      messages: s.messages.map(m => m.id === msgId ? {
        ...m,
        reactions: m.reactions?.includes(emoji) 
          ? m.reactions.filter(r => r !== emoji) 
          : [...(m.reactions || []), emoji]
      } : m)
    } : s));
  };

  // Intelligent Search Assistant Trigger
  const runAIsuggestedSearch = () => {
    if (!aiSearchInput.trim()) return;
    const allUsers = [currentUser]; // Expandable in real context
    const allCircles: Circle[] = JSON.parse(localStorage.getItem('nexora_db_joined_circles') || '[]');
    
    const results = SearchEngine.getSuggestions(aiSearchInput, allUsers, posts, allCircles);
    setIntelligentResults(results);
    showToast("Parsed Search DNA!");
  };

  // Moderation Analysis triggers
  const runModerationAssessment = () => {
    if (!moderationText.trim()) return;
    const result = ModerationEngine.analyzeContent(moderationText);
    setModerationResult(result);
  };

  const runReportAssessment = () => {
    if (!reportText.trim() || !reportedContent.trim()) return;
    const analysis = ModerationEngine.suggestReportReview(reportText, reportedContent);
    setReportedAnalysis(analysis);
  };

  // Dynamic Markdown rendering
  const renderMarkdown = (text: string) => {
    const lines = text.split('\n');
    return lines.map((line, idx) => {
      let trimmed = line.trim();
      if (trimmed.startsWith('###')) {
        return <h4 key={idx} className="text-sm font-bold font-sans text-violet-300 mt-3 mb-1.5 flex items-center gap-1.5">{trimmed.replace(/^###\s*/, '')}</h4>;
      }
      if (trimmed.startsWith('##')) {
        return <h3 key={idx} className="text-base font-bold font-sans text-violet-400 mt-4 mb-2 flex items-center gap-1.5">{trimmed.replace(/^##\s*/, '')}</h3>;
      }
      if (trimmed.startsWith('#')) {
        return <h2 key={idx} className="text-lg font-black font-sans text-white mt-5 mb-2.5 flex items-center gap-1.5">{trimmed.replace(/^#\s*/, '')}</h2>;
      }
      if (trimmed.startsWith('-') || trimmed.startsWith('*')) {
        const cleanLine = trimmed.replace(/^[-*]\s*/, '');
        return <li key={idx} className="text-xs text-current/80 list-disc ml-4 my-1 leading-relaxed">{parseBold(cleanLine)}</li>;
      }
      if (trimmed.startsWith('>')) {
        return (
          <blockquote key={idx} className="border-l-2 border-violet-500 bg-violet-950/25 p-2 rounded-r-lg my-2 text-[11px] italic text-violet-200">
            {parseBold(trimmed.replace(/^>\s*/, ''))}
          </blockquote>
        );
      }
      if (trimmed === '') {
        return <div key={idx} className="h-2" />;
      }
      return <p key={idx} className="text-xs text-current/80 leading-relaxed my-1.5">{parseBold(trimmed)}</p>;
    });
  };

  const parseBold = (text: string) => {
    const parts = text.split(/\*\*([^*]+)\*\*/g);
    return parts.map((part, i) => (i % 2 === 1 ? <strong key={i} className="font-extrabold text-violet-300">{part}</strong> : part));
  };

  return (
    <div id="premium-voh-ai-workspace" className="space-y-6">
      
      {/* Dynamic Toast Alerts */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-6 right-6 z-50 bg-violet-700 text-white font-sans text-[11px] font-black uppercase tracking-widest px-4 py-2.5 rounded-xl shadow-lg shadow-violet-700/20 flex items-center gap-2"
          >
            <VohIcon size={16} animated variant="white" />
            <span>{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Primary Top Panel Row */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-current/10 pb-4">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <VohIcon size={26} animated glow variant="brand" />
            <h1 className="text-2xl font-black font-sans tracking-tight text-current uppercase">
              VOH AI Assistant
            </h1>
          </div>
          <p className="text-xs text-current/60 font-sans leading-relaxed">
            Highly optimized on-chain analytics, direct user profiling match, and automated content generation.
          </p>
        </div>

        {/* Floating Controls */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 bg-violet-950/40 border border-violet-500/20 rounded-xl px-3 py-1.5 text-[10px] font-mono">
            <VohIcon size={15} animated variant="violet" />
            <span className="font-black text-violet-300 uppercase">CORE v3.5-FLASH</span>
          </div>

          <button 
            onClick={() => createNewSession()}
            className="px-3.5 py-1.5 bg-gradient-to-tr from-violet-600 to-pink-600 text-white text-xs font-black font-sans rounded-xl hover:brightness-110 shadow-md flex items-center gap-1 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>NEW CHAT</span>
          </button>
        </div>
      </div>

      {/* Main navigation toolbar */}
      <div className="flex flex-wrap border-b border-current/5 gap-1.5 pb-2">
        {(['chat', 'voice', 'assistants', 'engines', 'search', 'ecosystem', 'moderation', 'settings'] as const).map((view) => (
          <button
            key={view}
            onClick={() => {
              setActiveSubView(view);
              if (view === 'moderation' && currentUser.role !== 'admin' && currentUser.role !== 'founder') {
                showToast("Moderator sandbox loaded.");
              }
            }}
            className={`px-4 py-2 rounded-xl text-xs font-bold font-sans uppercase tracking-wider transition-all cursor-pointer ${
              activeSubView === view 
                ? 'bg-violet-600 text-white shadow-sm' 
                : 'bg-current/5 text-current/60 hover:text-current hover:bg-current/10'
            }`}
          >
            {view}
          </button>
        ))}
      </div>

      {/* Demo warning fallback bar */}
      {isDemoMode && (
        <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex items-start gap-2 text-xs text-amber-200">
          <Info className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
          <p className="font-medium leading-relaxed text-[11px]">
          </p>
        </div>
      )}

      {/* Main Work Area Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* ======================================================== */}
        {/* CHAT MAIN VIEW */}
        {/* ======================================================== */}
        {activeSubView === 'chat' && (
          <>
            {/* Sessions Sidebar Column (Left 4 cols) */}
            <div className="lg:col-span-4 space-y-4">
              <div className="bg-[#03010b] border border-violet-500/15 rounded-3xl p-4 space-y-4 min-h-[420px] max-h-[600px] flex flex-col justify-between">
                
                <div className="space-y-4 overflow-y-auto flex-1">
                  {/* Search sessions */}
                  <div className="relative">
                    <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-current/30" />
                    <input
                      type="text"
                      placeholder="Search dialogues..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-9 pr-3 py-1.5 bg-white/5 border border-white/5 rounded-xl text-xs focus:outline-none focus:border-violet-500/30"
                    />
                  </div>

                  {/* Folders row */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-sans font-black tracking-wider text-violet-400 uppercase">Folders</span>
                      <button 
                        onClick={() => setShowFolderModal(true)}
                        className="p-1 hover:bg-white/5 rounded text-violet-300 cursor-pointer"
                      >
                        <FolderPlus className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="flex flex-wrap gap-1.5">
                      {folders.map(f => (
                        <button
                          key={f.id}
                          className="px-2 py-1 bg-violet-950/30 border border-violet-500/10 rounded-lg text-[9.5px] font-sans font-medium flex items-center gap-1 text-violet-300"
                        >
                          <Folder className="w-3 h-3" style={{ color: f.color }} />
                          <span>{f.name.replace(/[^a-zA-Z ]/g, '')}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Dialogues List */}
                  <div className="space-y-2">
                    <span className="text-[10px] font-sans font-black tracking-wider text-violet-400 uppercase block">Active Dialogues</span>
                    
                    <div className="space-y-1 max-h-[250px] overflow-y-auto">
                      {sessions
                        .filter(s => !s.isArchived && s.title.toLowerCase().includes(searchQuery.toLowerCase()))
                        .map(s => (
                          <div
                            key={s.id}
                            onClick={() => setActiveSessionId(s.id)}
                            className={`group p-2.5 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                              activeSessionId === s.id 
                                ? 'bg-violet-900/20 border-violet-500/30 text-white' 
                                : 'bg-transparent border-transparent text-current/75 hover:bg-white/5'
                            }`}
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <MessageSquare className="w-3.5 h-3.5 shrink-0 text-violet-400" />
                              <span className="text-xs font-medium font-sans truncate pr-2">{s.title}</span>
                            </div>

                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button 
                                onClick={(e) => togglePinSession(s.id, e)}
                                title="Pin chat"
                                className={`p-1 rounded hover:bg-white/10 ${s.isPinned ? 'text-amber-400' : 'text-current/40'}`}
                              >
                                <Pin className="w-3 h-3" />
                              </button>
                              <button 
                                onClick={(e) => toggleArchiveSession(s.id, e)}
                                title="Archive chat"
                                className="p-1 rounded hover:bg-white/10 text-cyan-400"
                              >
                                <Archive className="w-3 h-3" />
                              </button>
                              <button 
                                onClick={(e) => deleteSession(s.id, e)}
                                title="Delete chat"
                                className="p-1 rounded hover:bg-white/10 text-rose-500"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                </div>

                {/* Create folder modal */}
                {showFolderModal && (
                  <div className="border border-white/10 p-3 rounded-2xl bg-slate-950 space-y-2.5">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-sans font-bold text-violet-400 uppercase">Create New Folder</span>
                      <button onClick={() => setShowFolderModal(false)}><X className="w-3.5 h-3.5" /></button>
                    </div>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Folder name..."
                        value={folderName}
                        onChange={(e) => setFolderName(e.target.value)}
                        className="flex-1 px-2.5 py-1 text-xs bg-white/5 border border-white/5 rounded-lg focus:outline-none"
                      />
                      <button
                        onClick={() => {
                          if (folderName.trim()) {
                            setFolders(prev => [...prev, { id: `folder-${Date.now()}`, name: `📁 ${folderName}` }]);
                            setFolderName('');
                            setShowFolderModal(false);
                            showToast("Folder registered.");
                          }
                        }}
                        className="px-3 py-1 bg-violet-600 text-white rounded-lg text-xs"
                      >
                        Add
                      </button>
                    </div>
                  </div>
                )}

              </div>
            </div>

            {/* Chat Conversation Area (Right 8 cols) */}
            <div className="lg:col-span-8 flex flex-col border border-current/10 rounded-3xl bg-current/3 overflow-hidden min-h-[420px] max-h-[600px] justify-between">
              
              {/* Dialogue Header */}
              <div className="p-3 border-b border-current/5 bg-current/5 flex justify-between items-center">
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-xs font-bold text-current">{activeSession?.title || 'Dialogue Session'}</span>
                </div>
                {activeSession?.messages && activeSession.messages.length > 0 && (
                  <button 
                    onClick={() => {
                      setSessions(prev => prev.map(s => s.id === activeSessionId ? { ...s, messages: s.messages.slice(0, 1) } : s));
                      showToast("Chat reset.");
                    }}
                    className="p-1 rounded hover:bg-white/5 text-[10px] font-sans text-current/40 flex items-center gap-1"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>Clear logs</span>
                  </button>
                )}
              </div>

              {/* Messages viewport */}
              <div className="p-4 space-y-4 overflow-y-auto flex-1 max-h-[380px]">
                {activeSession?.messages.map((msg) => (
                  <div 
                    key={msg.id}
                    className={`flex gap-3 max-w-[85%] ${msg.sender === 'user' ? 'ml-auto flex-row-reverse' : ''}`}
                  >
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 border ${
                      msg.sender === 'voh' 
                        ? 'bg-violet-600/10 text-violet-400 border-violet-500/10' 
                        : 'bg-cyan-600/10 text-cyan-400 border-cyan-500/10'
                    }`}>
                      {msg.sender === 'voh' ? <VohIcon size={15} animated variant="brand" /> : <Volume2 className="w-3.5 h-3.5" />}
                    </div>

                    <div className="space-y-1.5 min-w-0">
                      
                      {editingMsgId === msg.id ? (
                        <div className="space-y-2 p-2.5 rounded-2xl bg-white/5 border border-white/10">
                          <textarea
                            value={editMsgText}
                            onChange={(e) => setEditMsgText(e.target.value)}
                            className="w-full p-2 bg-black border border-violet-500/30 text-xs rounded-lg text-white"
                          />
                          <div className="flex gap-1.5 justify-end">
                            <button onClick={() => setEditingMsgId(null)} className="px-2 py-1 bg-white/10 rounded-lg text-[10px]">Cancel</button>
                            <button onClick={() => handleEditPrompt(msg.id, editMsgText)} className="px-2 py-1 bg-violet-600 text-white rounded-lg text-[10px]">Resend</button>
                          </div>
                        </div>
                      ) : (
                        <div className={`p-3 rounded-2xl text-xs leading-relaxed ${
                          msg.sender === 'voh' 
                            ? 'bg-[#0a071c]/90 border border-violet-500/15 text-current' 
                            : 'bg-[#0e2128]/90 border border-cyan-500/15 text-cyan-200'
                        }`}>
                          {renderMarkdown(msg.text)}

                          {/* Message Reactions */}
                          {msg.sender === 'voh' && !msg.isFailed && (
                            <div className="mt-3 flex items-center justify-between border-t border-white/5 pt-2.5">
                              {/* Reactions buttons */}
                              <div className="flex gap-1">
                                {['👍', '❤️', '🔥', '🧠'].map((emoji) => (
                                  <button
                                    key={emoji}
                                    onClick={() => handleReactToMessage(msg.id, emoji)}
                                    className={`px-1.5 py-0.5 rounded text-[10px] hover:bg-white/10 transition-colors ${
                                      msg.reactions?.includes(emoji) ? 'bg-violet-600/30 border border-violet-500/30' : 'bg-transparent'
                                    }`}
                                  >
                                    <span>{emoji}</span>
                                  </button>
                                ))}
                              </div>

                              {/* Controls */}
                              <div className="flex gap-1.5 items-center">
                                <button
                                  onClick={() => {
                                    navigator.clipboard.writeText(msg.text);
                                    showToast("Copied response!");
                                  }}
                                  title="Copy response"
                                  className="p-1 hover:bg-white/5 rounded text-current/40 hover:text-violet-400"
                                >
                                  <ClipboardCopy className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => handleRegenerate(msg.id)}
                                  title="Regenerate"
                                  className="p-1 hover:bg-white/5 rounded text-current/40 hover:text-violet-400 animate-spin-hover"
                                >
                                  <RefreshCw className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          )}

                          {msg.sender === 'user' && (
                            <div className="mt-2 text-right">
                              <button 
                                onClick={() => {
                                  setEditingMsgId(msg.id);
                                  setEditMsgText(msg.text);
                                }}
                                className="text-[9px] text-cyan-400 hover:underline"
                              >
                                Edit prompt
                              </button>
                            </div>
                          )}
                        </div>
                      )}

                      <div className="text-[8px] font-sans text-current/35 text-right px-1">
                        <RelativeTimestamp timestamp={msg.timestamp} />
                      </div>
                    </div>
                  </div>
                ))}

                {(!activeSession?.messages || activeSession.messages.length <= 1) && (
                  <div className="space-y-4 mt-2 animate-fadeIn">
                    
                    {/* Bento Row 1: Suggested Prompt Action Cards (Grid) */}
                    <div>
                      <span className="text-[10px] font-sans font-black tracking-wider text-violet-400 uppercase block mb-2">Suggested Actions</span>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                        
                        <button
                          type="button"
                          onClick={() => handleSendPrompt(undefined, "Summarize my active feed and identify design trends.")}
                          className="p-3 text-left bg-[#05030f] border border-violet-500/15 rounded-2xl hover:border-violet-500/40 hover:bg-violet-950/15 transition-all group cursor-pointer"
                        >
                          <div className="flex items-center gap-2 mb-1">
                            <VohIcon size={16} variant="violet" />
                            <span className="text-xs font-black font-sans text-white group-hover:text-violet-300">Summarize Feed</span>
                          </div>
                          <p className="text-[10.5px] text-current/60 leading-relaxed font-sans">Quickly parse active home feed posts and compile design topics.</p>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleSendPrompt(undefined, "How do I maximize my NEX token tips and reputation points?")}
                          className="p-3 text-left bg-[#05030f] border border-fuchsia-500/15 rounded-2xl hover:border-fuchsia-500/40 hover:bg-fuchsia-950/15 transition-all group cursor-pointer"
                        >
                          <div className="flex items-center gap-2 mb-1">
                            <TrendingUp className="w-4 h-4 text-fuchsia-400" />
                            <span className="text-xs font-black font-sans text-white group-hover:text-fuchsia-300">Optimize NEX Earnings</span>
                          </div>
                          <p className="text-[10.5px] text-current/60 leading-relaxed font-sans">Learn about tips, engagement weighting, and reputation rules.</p>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleSendPrompt(undefined, "What topics are popular around Port Harcourt node right now?")}
                          className="p-3 text-left bg-[#05030f] border border-cyan-500/15 rounded-2xl hover:border-cyan-500/40 hover:bg-cyan-950/15 transition-all group cursor-pointer"
                        >
                          <div className="flex items-center gap-2 mb-1">
                            <Compass className="w-4 h-4 text-cyan-400" />
                            <span className="text-xs font-black font-sans text-white group-hover:text-cyan-300">Regional Node Pulse</span>
                          </div>
                          <p className="text-[10.5px] text-current/60 leading-relaxed font-sans">Explore startup discussions and hashtags active in Nigeria.</p>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleSendPrompt(undefined, "Review my account security setup.")}
                          className="p-3 text-left bg-[#05030f] border border-emerald-500/15 rounded-2xl hover:border-emerald-500/40 hover:bg-emerald-950/15 transition-all group cursor-pointer"
                        >
                          <div className="flex items-center gap-2 mb-1">
                            <ShieldCheck className="w-4 h-4 text-emerald-400" />
                            <span className="text-xs font-black font-sans text-white group-hover:text-emerald-300">Security Guard</span>
                          </div>
                          <p className="text-[10.5px] text-current/60 leading-relaxed font-sans">Validate localized session logs and encrypted transaction syncs.</p>
                        </button>

                      </div>
                    </div>

                    {/* Bento Row 2: Learned Memory DNA capsules */}
                    <div className="p-4 bg-white/3 border border-white/5 rounded-2xl space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <BrainCircuit className="w-4 h-4 text-violet-400 animate-pulse" />
                          <span className="text-[10px] font-sans font-black tracking-wider text-violet-300 uppercase">AI Memory DNA Capsule</span>
                        </div>
                        {memoryDNA.length > 0 && (
                          <button 
                            type="button"
                            onClick={() => {
                              setMemoryDNA([]);
                              showToast("AI memory wiped cleanly.");
                            }}
                            className="text-[9px] font-mono text-rose-400 hover:underline cursor-pointer"
                          >
                            Wipe memory DNA
                          </button>
                        )}
                      </div>
                      
                      {memoryDNA.length > 0 ? (
                        <div className="flex flex-wrap gap-1.5">
                          {memoryDNA.map((pref, i) => (
                            <span key={i} className="px-2.5 py-1 text-[9.5px] font-sans bg-violet-500/10 border border-violet-500/20 text-violet-300 rounded-lg flex items-center gap-1">
                              <span className="w-1 h-1 rounded-full bg-violet-400" />
                              {pref}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <p className="text-[10px] text-current/40 italic">No persistent memory logged. Speak or chat with VOH AI to build your profile DNA.</p>
                      )}
                      
                      <p className="text-[9px] text-current/40 font-mono">This context is automatically prepended to queries to preserve personalization without manual prompts.</p>
                    </div>

                    {/* Bento Row 3: Diagnostic Node Metrics */}
                    <div className="grid grid-cols-3 gap-3">
                      <div className="bg-[#05030f] border border-white/5 p-2.5 rounded-xl text-center">
                        <span className="text-[8px] text-current/40 uppercase block mb-0.5">VOH Link Speed</span>
                        <span className="text-xs font-black font-sans text-emerald-400">1.8ms</span>
                      </div>
                      <div className="bg-[#05030f] border border-white/5 p-2.5 rounded-xl text-center">
                        <span className="text-[8px] text-current/40 uppercase block mb-0.5">Linked Engines</span>
                        <span className="text-xs font-black font-sans text-violet-300">25 active</span>
                      </div>
                      <div className="bg-[#05030f] border border-white/5 p-2.5 rounded-xl text-center">
                        <span className="text-[8px] text-current/40 uppercase block mb-0.5">Database Sync</span>
                        <span className="text-xs font-black font-sans text-cyan-400">100% On-Chain</span>
                      </div>
                    </div>

                  </div>
                )}

                {typingIndicator && (
                  <div className="flex gap-3 max-w-[85%]">
                    <div className="w-7 h-7 rounded-lg bg-violet-600/10 text-violet-400 flex items-center justify-center shrink-0 border border-violet-500/10">
                      <VohIcon size={16} animated glow variant="brand" />
                    </div>
                    <div className="p-3 rounded-2xl text-xs bg-[#0a071c] border border-violet-500/15 text-violet-400 italic font-mono flex items-center gap-2 animate-pulse">
                      <VohIcon size={15} animated variant="violet" />
                      <span>VOH AI is thinking...</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Preset Quick Chips */}
              <div className="p-2 border-t border-current/5 bg-current/2 flex flex-wrap gap-1">
                <button
                  onClick={() => handleSendPrompt(undefined, "Summarize my active feed.")}
                  className="px-2.5 py-1 text-[9.5px] font-sans border border-current/10 rounded-lg hover:border-violet-500/30 text-current/70 hover:text-violet-400 transition-all bg-current/5"
                >
                  #SummarizeFeed
                </button>
                <button
                  onClick={() => handleSendPrompt(undefined, "What is currently trending in Nigeria?")}
                  className="px-2.5 py-1 text-[9.5px] font-sans border border-current/10 rounded-lg hover:border-emerald-500/30 text-current/70 hover:text-emerald-400 transition-all bg-current/5"
                >
                  #NigeriaTrends
                </button>
                <button
                  onClick={() => handleSendPrompt(undefined, "Identify job & collaboration opportunities.")}
                  className="px-2.5 py-1 text-[9.5px] font-sans border border-current/10 rounded-lg hover:border-amber-500/30 text-current/70 hover:text-amber-400 transition-all bg-current/5"
                >
                  #FindOpportunities
                </button>
              </div>

              {/* Redesigned Smart Input form */}
              <div className="border-t border-current/10 bg-[#06040f] p-3 space-y-2.5">
                
                {/* Context Attachment Bar & Quick Helper Badge Row */}
                <div className="flex flex-wrap items-center justify-between gap-2 bg-[#0a071c] border border-violet-500/10 rounded-2xl p-2 px-3 select-none">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        const cycle: Record<typeof attachedContextType, typeof attachedContextType> = {
                          feed: 'profile',
                          profile: 'inbox',
                          inbox: 'none',
                          none: 'feed'
                        };
                        setAttachedContextType(cycle[attachedContextType]);
                        showToast(`Switched context to ${cycle[attachedContextType].toUpperCase()}`);
                      }}
                      className="px-2.5 py-1 rounded-xl bg-violet-500/10 hover:bg-violet-500/20 border border-violet-500/20 text-[10px] font-sans font-extrabold text-violet-300 transition-colors flex items-center gap-1.5 cursor-pointer active:scale-95"
                    >
                      {attachedContextType === 'feed' && <Layers className="w-3 h-3 text-violet-400" />}
                      {attachedContextType === 'profile' && <UserCheck className="w-3 h-3 text-cyan-400" />}
                      {attachedContextType === 'inbox' && <MessageSquare className="w-3 h-3 text-fuchsia-400" />}
                      {attachedContextType === 'none' && <Sparkle className="w-3 h-3 text-amber-400" />}
                      <span>CYCLE DATA CONTEXT</span>
                    </button>

                    <span className="text-[10px] text-current/60 font-sans hidden sm:inline">
                      {attachedContextType === 'feed' && "📎 Connected: Active Home Feed & Regional Pulse databases (15 feed packets online)"}
                      {attachedContextType === 'profile' && `👤 Connected: User Identity context, NEX Wallet Balance & reputation index`}
                      {attachedContextType === 'inbox' && "💬 Connected: Direct messages metadata, circles notifications & active channels"}
                      {attachedContextType === 'none' && "🌐 Connected: Global VOH AI general knowledge index"}
                    </span>
                    <span className="text-[10px] text-current/60 font-sans sm:hidden inline">
                      {attachedContextType === 'feed' && "📎 Feed Context"}
                      {attachedContextType === 'profile' && "👤 Profile Context"}
                      {attachedContextType === 'inbox' && "💬 DM/Inbox Context"}
                      {attachedContextType === 'none' && "🌐 General Index"}
                    </span>
                  </div>

                  {query.trim().length > 0 && (
                    <button
                      type="button"
                      onClick={handleImprovePostQuery}
                      className="px-2.5 py-1 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 text-[10px] font-sans font-extrabold text-amber-300 transition-colors flex items-center gap-1.5 cursor-pointer active:scale-95 animate-pulse"
                    >
                      <Sparkles className="w-3 h-3 text-amber-400 animate-spin" />
                      <span>POLISH COMMAND</span>
                    </button>
                  )}
                </div>

                <form onSubmit={handleSendPrompt} className="flex gap-2">
                  <button
                    type="button"
                    onClick={toggleContinuousListening}
                    className={`p-2.5 rounded-xl border flex items-center justify-center transition-all ${
                      continuousListening 
                        ? 'bg-rose-600 border-rose-500 text-white animate-pulse' 
                        : 'bg-white/5 border-white/5 text-current/60 hover:text-violet-400'
                    }`}
                    title={continuousListening ? "Continuous Listening Active" : "Enable continuous voice listening"}
                  >
                    <Mic className="w-4 h-4" />
                  </button>

                  <input
                    type="text"
                    placeholder={loadingAi ? "VOH AI is thinking..." : "Ask VOH AI: summarize feed, find job..."}
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    disabled={loadingAi}
                    className="flex-1 px-4 py-2 bg-current/5 border border-current/5 rounded-xl font-sans text-xs text-current focus:outline-none focus:border-violet-500/30 disabled:opacity-40"
                  />

                  <button
                    type="submit"
                    disabled={!query.trim() || loadingAi}
                    className="p-2.5 rounded-xl bg-violet-700 hover:bg-violet-600 text-white disabled:opacity-50 active:scale-95 transition-all cursor-pointer flex items-center justify-center shrink-0"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </form>
              </div>

            </div>
          </>
        )}

        {/* ======================================================== */}
        {/* VOICE STUDIO SUBVIEW */}
        {/* ======================================================== */}
        {activeSubView === 'voice' && (
          <div className="lg:col-span-12 space-y-4">
            <div className="bg-[#03010b] border border-violet-500/15 rounded-3xl p-6 grid grid-cols-1 md:grid-cols-12 gap-6 relative overflow-hidden">
              
              {/* Left Column: Recording Controls */}
              <div className="md:col-span-5 flex flex-col justify-between border border-white/5 bg-white/2 p-5 rounded-2xl min-h-[350px]">
                <div>
                  <span className="text-[10px] font-sans font-black text-violet-400 uppercase tracking-widest block mb-1">VOICE TRANSMITTING MODULE</span>
                  <h3 className="text-sm font-black font-sans text-white mb-2">Speak to publish or translate</h3>
                  <p className="text-xs text-current/60 leading-relaxed">Toggle the transmitter and say what is on your mind. VOH AI automatically structures your dialetical stream.</p>
                </div>

                <div className="my-6 flex flex-col items-center justify-center space-y-4">
                  {/* Waveform Nodes */}
                  <div className="flex items-center gap-1 h-14">
                    {waveformNodes.map((h, i) => (
                      <div
                        key={i}
                        style={{ height: `${h}px` }}
                        className={`w-1 rounded-full ${
                          isRecording 
                            ? 'bg-gradient-to-t from-violet-500 to-pink-500' 
                            : 'bg-violet-950/40'
                        }`}
                      />
                    ))}
                  </div>

                  <button
                    onClick={isRecording ? stopMicRecording : startMicRecording}
                    className={`w-14 h-14 rounded-full flex items-center justify-center transition-all ${
                      isRecording ? 'bg-rose-600' : 'bg-gradient-to-tr from-violet-600 to-pink-600 text-white shadow-lg shadow-violet-600/20'
                    }`}
                  >
                    {isRecording ? <MicOff className="w-5 h-5 animate-pulse" /> : <Mic className="w-5 h-5" />}
                  </button>
                  <span className="text-[10px] text-current/40 uppercase tracking-wider">{isRecording ? `Recording...` : 'Transmitter Standby'}</span>
                </div>

                <div className="border-t border-white/5 pt-3 flex gap-2">
                  <div className="flex-1 bg-white/5 rounded-xl p-2.5">
                    <span className="text-[8px] text-current/40 uppercase block mb-0.5">Language Node</span>
                    <select 
                      value={voiceConfig.language}
                      onChange={(e) => setVoiceConfig(prev => ({ ...prev, language: e.target.value }))}
                      className="bg-transparent border-none text-[11px] font-bold focus:outline-none text-violet-300"
                    >
                      <option value="en-US">English (US)</option>
                      <option value="en-NG">English (Nigerian Dialect)</option>
                      <option value="fr-FR">French</option>
                      <option value="de-DE">German</option>
                    </select>
                  </div>

                  <div className="flex-1 bg-white/5 rounded-xl p-2.5 flex items-center justify-between">
                    <div>
                      <span className="text-[8px] text-current/40 uppercase block mb-0.5">Auto Voice Play</span>
                      <span className="text-[11px] font-bold text-violet-300">{voiceConfig.autoRead ? 'ON' : 'OFF'}</span>
                    </div>
                    <input 
                      type="checkbox"
                      checked={voiceConfig.autoRead}
                      onChange={(e) => setVoiceConfig(prev => ({ ...prev, autoRead: e.target.checked }))}
                      className="w-4 h-4 accent-violet-600"
                    />
                  </div>
                </div>
              </div>

              {/* Right Column: Interactive transcription outcomes */}
              <div className="md:col-span-7 border border-white/5 bg-[#010104] p-5 rounded-2xl flex flex-col justify-between min-h-[350px]">
                <div className="space-y-4">
                  <div className="flex justify-between items-center border-b border-white/5 pb-2">
                    <span className="text-[10px] font-sans font-black tracking-widest text-violet-400 uppercase">AUDIO TRANSCRIPTION</span>
                    <Award className="w-4 h-4 text-violet-400" />
                  </div>

                  {isSynthesizingVoice ? (
                    <div className="py-12 flex flex-col items-center justify-center space-y-2">
                      <NexoraLoader size="lg" center={true} />
                      <p className="text-xs font-mono italic text-violet-300">VOH AI is thinking...</p>
                    </div>
                  ) : transcription ? (
                    <div className="space-y-4">
                      <div>
                        <span className="text-[9px] text-current/40 uppercase font-mono block mb-1">Structured Transcription</span>
                        <p className="text-xs text-white leading-relaxed bg-white/5 p-3 rounded-xl border border-white/5 italic">
                          "{transcription}"
                        </p>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="bg-white/5 p-2.5 rounded-xl">
                          <span className="text-[8px] text-current/40 uppercase block mb-0.5">Dialect Translation Match</span>
                          <span className="text-xs font-bold text-cyan-400">{translation}</span>
                        </div>
                        <div className="bg-white/5 p-2.5 rounded-xl">
                          <span className="text-[8px] text-current/40 uppercase block mb-0.5">Topic Summary</span>
                          <span className="text-xs font-bold text-fuchsia-400">{summarizedText}</span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="py-12 flex flex-col items-center justify-center text-center text-current/30 space-y-2">
                      <Volume2 className="w-10 h-10" />
                      <p className="text-xs">Your transcriptions and sound analysis metrics will populate here.</p>
                    </div>
                  )}
                </div>

                {transcription && (
                  <div className="flex gap-2 border-t border-white/5 pt-4">
                    <button
                      onClick={() => {
                        onAddPost(transcription, undefined, "VohSpeech, AudioBroadcast");
                        setTranscription('');
                        setTranslation('');
                        setSummarizedText('');
                        showToast("Voice broadcast posted to feed!");
                      }}
                      className="flex-1 py-2 text-xs font-black bg-gradient-to-r from-violet-600 to-pink-500 text-white rounded-xl hover:opacity-95 active:scale-98 cursor-pointer"
                    >
                      PUBLISH DIRECTLY TO FEED
                    </button>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(transcription);
                        showToast("Copied to clipboard!");
                      }}
                      className="p-2.5 bg-white/5 border border-white/10 rounded-xl hover:text-violet-400"
                    >
                      <ClipboardCopy className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>

            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* NEXORA ASSISTANTS SUBVIEW */}
        {/* ======================================================== */}
        {activeSubView === 'assistants' && (
          <div className="lg:col-span-12 space-y-4">
            <span className="text-[10px] font-sans font-black tracking-widest text-violet-400 uppercase block">SELECT ASSISTANT BLUEPRINT</span>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {PromptEngine.getAssistantCards().map((card) => (
                <div
                  key={card.id}
                  onClick={() => {
                    createNewSession(card.promptTemplate, card.name);
                    setActiveSubView('chat');
                    showToast(`${card.name} loaded.`);
                  }}
                  className="bg-[#03010b] border border-violet-500/15 rounded-2xl p-4 space-y-2 cursor-pointer hover:border-violet-500/40 transition-all hover:scale-[1.01] flex flex-col justify-between"
                >
                  <div className="space-y-1">
                    <span className="text-[10px] font-sans font-bold text-violet-400 uppercase tracking-wide block">
                      {card.category} assistant
                    </span>
                    <h3 className="text-xs font-black font-sans text-white uppercase">{card.name}</h3>
                    <p className="text-[11px] text-current/60 leading-relaxed">{card.description}</p>
                  </div>

                  <div className="pt-2 border-t border-white/5 flex items-center justify-between">
                    <span className="text-[9px] font-mono text-current/40">Blueprint loaded</span>
                    <span className="text-[10px] text-violet-300 font-bold font-sans">LOAD →</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* INTELLIGENT SEARCH ASSISTANT SUBVIEW */}
        {/* ======================================================== */}
        {activeSubView === 'search' && (
          <div className="lg:col-span-12 space-y-4">
            <div className="bg-[#03010b] border border-violet-500/15 rounded-3xl p-6 space-y-6">
              
              <div className="space-y-2">
                <span className="text-[10px] font-sans font-black tracking-widest text-violet-400 uppercase block">INTUITIVE ENGINE SEARCH</span>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3.5 top-3.5 w-4 h-4 text-current/40" />
                    <input
                      type="text"
                      placeholder={`Search Users, Posts, ${TERMINOLOGY.communitiesCapitalized}, or tags...`}
                      value={aiSearchInput}
                      onChange={(e) => setAiSearchInput(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') runAIsuggestedSearch(); }}
                      className="w-full pl-11 pr-4 py-3 bg-white/5 border border-white/5 rounded-2xl font-sans text-xs text-white focus:outline-none focus:border-violet-500/30"
                    />
                  </div>
                  <button
                    onClick={runAIsuggestedSearch}
                    className="px-5 py-3 bg-violet-600 hover:bg-violet-500 text-white font-sans text-xs font-black rounded-2xl cursor-pointer"
                  >
                    SEARCH
                  </button>
                </div>
              </div>

              {/* Suggestions chips */}
              <div className="flex flex-wrap gap-2 items-center">
                <span className="text-[10px] font-sans text-current/40 uppercase">Autocomplete hints:</span>
                {['Football Nigeria', 'Design Tokens', 'AI Builders', '#SpaceGlass', 'Lagos Startups'].map((tag) => (
                  <button
                    key={tag}
                    onClick={() => {
                      setAiSearchInput(tag);
                      showToast("Autocompleted!");
                    }}
                    className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-[10.5px] text-current/70 border border-white/5"
                  >
                    {tag}
                  </button>
                ))}
              </div>

              {/* Output */}
              {intelligentResults && (
                <div className="border-t border-white/5 pt-5 space-y-4">
                  <h4 className="text-xs font-black font-sans uppercase tracking-widest text-violet-300">Match suggestions outcome</h4>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Creators matching */}
                    <div className="bg-white/2 border border-white/5 p-4 rounded-2xl space-y-3">
                      <span className="text-[9px] font-black text-cyan-400 block uppercase font-mono">Matched Users</span>
                      {intelligentResults.suggestedUsers && intelligentResults.suggestedUsers.length > 0 ? (
                        intelligentResults.suggestedUsers.map((u: User) => (
                          <div key={u.id} className="flex items-center gap-2">
                            <img src={u.avatar} className="w-8 h-8 rounded-lg object-cover" />
                            <div>
                              <p className="text-xs font-black text-white">{u.name}</p>
                              <p className="text-[10px] text-current/40">@{u.username}</p>
                            </div>
                          </div>
                        ))
                      ) : (
                        <p className="text-[10.5px] text-current/40 italic">No precise user match found.</p>
                      )}
                    </div>

                    {/* Communities matching */}
                    <div className="bg-white/2 border border-white/5 p-4 rounded-2xl space-y-3">
                      <span className="text-[9px] font-black text-fuchsia-400 block uppercase font-mono">{`Matched ${TERMINOLOGY.communitiesCapitalized}`}</span>
                      {intelligentResults.suggestedCircles && intelligentResults.suggestedCircles.length > 0 ? (
                        intelligentResults.suggestedCircles.map((c: Circle) => (
                          <div key={c.id} className="flex items-center justify-between border-b border-white/5 pb-2">
                            <div>
                              <p className="text-xs font-black text-white">{c.name}</p>
                              <p className="text-[10px] text-current/40">{c.membersCount} active members</p>
                            </div>
                          </div>
                        ))
                      ) : (
                        <p className="text-[10.5px] text-current/40 italic">No precise community matches in current databases.</p>
                      )}
                    </div>
                  </div>
                </div>
              )}

            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* NEXORA CORE PLATFORM ENGINES VIEW */}
        {/* ======================================================== */}
        {activeSubView === 'engines' && (() => {
          const activeEngine = ALL_25_ENGINES.find(e => e.id === selectedEngineId) || ALL_25_ENGINES[0];
          const simulationResult = activeEngine.run(simInputs, posts);

          const getIconComponent = (name) => {
            switch (name) {
              case 'Cpu': return Cpu;
              case 'TrendingUp': return TrendingUp;
              case 'HardDrive': return HardDrive;
              case 'Search': return Search;
              case 'Bell': return Bell;
              case 'ShieldCheck': return ShieldCheck;
              case 'Users': return Users;
              case 'MessageSquare': return MessageSquare;
              case 'BrainCircuit': return BrainCircuit;
              case 'Award': return Award;
              case 'Activity': return Activity;
              case 'Share': return Forward;
              case 'Lock': return Lock;
              case 'Folder': return Folder;
              case 'RefreshCw': return RefreshCw;
              case 'Settings': return Settings;
              case 'Pin': return Pin;
              case 'PenSquare': return PenSquare;
              case 'Layers': return Layers;
              default: return Cpu;
            }
          };

          return (
            <div className="lg:col-span-12 space-y-4">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 text-left animate-fade-in">
                
                {/* Left Column: 25 Engines Grouped List */}
                <div className="lg:col-span-4 bg-[#03010b]/85 border border-violet-500/15 rounded-3xl p-4 space-y-4 max-h-[800px] overflow-y-auto custom-scrollbar">
                  <div className="pb-2 border-b border-white/5">
                    <span className="text-[10px] font-sans font-black tracking-widest text-violet-400 uppercase block">NEXORA NEXT-GEN PLATFORM ENGINES</span>
                    <p className="text-[11px] text-current/50 leading-relaxed">25 Specialized Services & Core System Frameworks</p>
                  </div>

                  <div className="space-y-4">
                    {[
                      {
                        name: '🧠 Core Personalization',
                        engines: [
                          { id: 'feed', name: 'Feed Intelligence', desc: 'Ranks and personalizes the Home Feed', iconName: 'Cpu', badge: 'Active' },
                          { id: 'creator', name: 'Creator Ranking', desc: 'Calculates organic spread visibility', iconName: 'TrendingUp', badge: 'Active' },
                          { id: 'recommendation', name: 'Recommendation Engine', desc: 'Suggests creators, communities & topics', iconName: 'Cpu', badge: 'Active' },
                          { id: 'personalization', name: 'Personalization Engine', desc: 'Learns preferences from user actions', iconName: 'Settings', badge: 'Active' },
                          { id: 'voh_ai', name: 'VOH AI Intelligence', desc: 'Powers discussions, tags & assist helpers', iconName: 'BrainCircuit', badge: 'AI Native' }
                        ]
                      },
                      {
                        name: '🎬 Content & Media',
                        engines: [
                          { id: 'stream', name: 'Media Streaming', desc: 'Adaptive quality & memory preloading', iconName: 'HardDrive', badge: 'Optimized' },
                          { id: 'distribution', name: 'Content Distribution', desc: 'Balances freshness with follower spread', iconName: 'Forward', badge: 'Active' },
                          { id: 'media_processing', name: 'Media Processing', desc: 'Transcodes videos & compresses images', iconName: 'HardDrive', badge: 'Automated' }
                        ]
                      },
                      {
                        name: '📡 Communication & Network',
                        engines: [
                          { id: 'search', name: 'Search & Discovery', desc: 'Indexes & ranks cross-platform results', iconName: 'Search', badge: 'Ready' },
                          { id: 'notification', name: 'Notification Engine', desc: 'Batches and clusters incoming sparks', iconName: 'Bell', badge: 'Batched' },
                          { id: 'community', name: 'Community Engine', desc: 'Calculates roles & moderator permissions', iconName: 'Users', badge: 'Online' },
                          { id: 'messaging', name: 'Messaging Engine', desc: 'Controls DM receipts & typing loops', iconName: 'MessageSquare', badge: 'Encrypted' },
                          { id: 'social_graph', name: 'Social Graph Engine', desc: 'Maps mutual follows & shared interests', iconName: 'Layers', badge: 'Connected' }
                        ]
                      },
                      {
                        name: '📈 Creator Growth & Studio',
                        engines: [
                          { id: 'engagement', name: 'Engagement Engine', desc: 'Aggregates Sparks, views and retention', iconName: 'Activity', badge: 'Live' },
                          { id: 'trend', name: 'Trend Intelligence', desc: 'Calculates real viral topics & hashtags', iconName: 'TrendingUp', badge: 'Dynamic' },
                          { id: 'achievement', name: 'Achievement Engine', desc: 'Awards milestones based on progress', iconName: 'Award', badge: 'Active' },
                          { id: 'studio', name: 'Nexora Studio', desc: 'Provides advanced audience analytics', iconName: 'PenSquare', badge: 'Studio' }
                        ]
                      },
                      {
                        name: '🛡 Security & Infrastructure',
                        engines: [
                          { id: 'moderation', name: 'Moderation & Trust', desc: 'Filters spam, reports, and fake posts', iconName: 'ShieldCheck', badge: 'Secured' },
                          { id: 'security', name: 'Security Engine', desc: 'Protects sessions, IP audits & alerts', iconName: 'Lock', badge: 'Shielded' },
                          { id: 'offline', name: 'Offline Engine', desc: 'Supports caching, drafts and queues', iconName: 'Folder', badge: 'Cached' },
                          { id: 'sync', name: 'Real-Time Sync', desc: 'Synchronizes activity across devices', iconName: 'RefreshCw', badge: 'Live Sync' },
                          { id: 'analytics', name: 'Platform Analytics', desc: 'Provides platform DAU & system graphs', iconName: 'Activity', badge: 'Admin Only' },
                          { id: 'health', name: 'Platform Health', desc: 'Monitors latency & memory diagnostics', iconName: 'Activity', badge: 'Healthy' },
                          { id: 'flags', name: 'Feature Flag Engine', desc: 'Gradually rolls out features to cohorts', iconName: 'Pin', badge: 'Configured' }
                        ]
                      }
                    ].map((cat) => (
                      <div key={cat.name} className="space-y-1 pt-1 text-left">
                        <span className="text-[9px] font-sans font-black tracking-wider text-violet-400/80 uppercase block px-1">{cat.name}</span>
                        {cat.engines.map((eng) => {
                          const EngIcon = getIconComponent(eng.iconName);
                          const isActive = selectedEngineId === eng.id;
                          return (
                            <button
                              key={eng.id}
                              onClick={() => setSelectedEngineId(eng.id)}
                              className={`w-full text-left p-2.5 rounded-xl border transition-all flex items-start gap-2.5 cursor-pointer ${
                                isActive 
                                  ? 'bg-violet-600/15 border-violet-500/50 shadow-md shadow-violet-500/5 text-white' 
                                  : 'bg-white/2 border-white/5 text-current/70 hover:bg-white/5 hover:text-white'
                              }`}
                            >
                              <div className={`p-1.5 rounded-lg shrink-0 mt-0.5 ${isActive ? 'bg-violet-600 text-white' : 'bg-white/5 text-violet-400'}`}>
                                <EngIcon className="w-3.5 h-3.5" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between gap-1">
                                  <span className="text-[11px] font-bold truncate font-sans">{eng.name}</span>
                                  <span className={`text-[7px] font-mono font-black uppercase px-1 py-0.5 rounded ${
                                    isActive ? 'bg-violet-500 text-white' : 'bg-violet-950 text-violet-300 border border-violet-500/10'
                                  }`}>
                                    {eng.badge}
                                  </span>
                                </div>
                                <p className="text-[9px] text-current/40 truncate leading-normal">{eng.desc}</p>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Right Column: Dynamic Engine Simulation Sandbox */}
                <div className="lg:col-span-8 bg-[#03010b]/80 border border-violet-500/15 rounded-3xl p-6 flex flex-col justify-between min-h-[550px]">
                  
                  {/* Header */}
                  <div className="border-b border-white/5 pb-4 mb-4 flex items-center gap-3">
                    <div className="p-2.5 bg-violet-600/20 text-violet-400 rounded-2xl">
                      {React.createElement(getIconComponent(activeEngine.iconName), { className: "w-5 h-5 text-violet-400" })}
                    </div>
                    <div>
                      <h3 className="text-sm font-sans font-black uppercase text-white">{activeEngine.name} Service</h3>
                      <p className="text-[11px] text-current/50 leading-relaxed">{activeEngine.desc}</p>
                    </div>
                  </div>

                  {/* Sandbox Content Split */}
                  <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
                    
                    {/* Controls (Left) */}
                    <div className="space-y-4 bg-white/2 p-4 rounded-2xl border border-white/5 text-left flex flex-col justify-center">
                      <span className="text-[10px] font-mono font-black text-violet-400 uppercase">Input parameters</span>
                      
                      {activeEngine.controls.length > 0 ? (
                        <div className="space-y-3">
                          {activeEngine.controls.map((ctrl) => (
                            <div key={ctrl.key} className="space-y-1">
                              <div className="flex justify-between text-[11px]">
                                <span className="text-current/60">{ctrl.label}:</span>
                                <span className="font-bold text-white">
                                  {simInputs[ctrl.key] === true ? 'TRUE' : simInputs[ctrl.key] === false ? 'FALSE' : simInputs[ctrl.key]}
                                </span>
                              </div>
                              
                              {ctrl.type === 'slider' && (
                                <input 
                                  type="range" 
                                  min={ctrl.min} 
                                  max={ctrl.max} 
                                  step={ctrl.step} 
                                  value={simInputs[ctrl.key] || ctrl.defaultValue} 
                                  onChange={(e) => setSimInputs(prev => ({ ...prev, [ctrl.key]: Number(e.target.value) }))}
                                  className="w-full accent-violet-600 cursor-pointer h-1 bg-white/5 rounded-lg appearance-none"
                                />
                              )}

                              {ctrl.type === 'toggle' && (
                                <button
                                  onClick={() => setSimInputs(prev => ({ ...prev, [ctrl.key]: !prev[ctrl.key] }))}
                                  className={`w-full py-1.5 px-3 rounded-lg text-[10px] font-mono font-black border transition-all ${
                                    simInputs[ctrl.key] 
                                      ? 'bg-violet-600/20 border-violet-500 text-violet-300' 
                                      : 'bg-white/2 border-white/5 text-current/50 hover:bg-white/5'
                                  }`}
                                >
                                  {simInputs[ctrl.key] ? 'ENABLED' : 'DISABLED'}
                                </button>
                              )}

                              {ctrl.type === 'text' && (
                                <input 
                                  type="text" 
                                  value={simInputs[ctrl.key] || ''} 
                                  onChange={(e) => setSimInputs(prev => ({ ...prev, [ctrl.key]: e.target.value }))}
                                  className="w-full bg-black/40 border border-white/10 rounded-lg text-xs p-2 text-violet-300 focus:outline-hidden"
                                />
                              )}

                              {ctrl.type === 'select' && (
                                <select 
                                  value={simInputs[ctrl.key] || ctrl.defaultValue} 
                                  onChange={(e) => setSimInputs(prev => ({ ...prev, [ctrl.key]: e.target.value }))}
                                  className="w-full bg-black/40 border border-white/10 rounded-lg text-xs p-2 text-violet-300 focus:outline-hidden"
                                >
                                  {ctrl.options.map(opt => (
                                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                                  ))}
                                </select>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-[10.5px] text-current/40 italic">This diagnostic service runs autonomously on aggregated host parameters. No user inputs required.</p>
                      )}
                    </div>

                    {/* Simulation Result (Right) */}
                    <div className="bg-[#05030f]/60 border border-violet-500/10 p-4 rounded-2xl flex flex-col justify-between text-left">
                      <div className="space-y-3">
                        <span className="text-[10px] font-mono font-black text-violet-400 uppercase tracking-wider block">Real-time Service Outputs</span>
                        
                        <div className="space-y-2">
                          {simulationResult.metrics.map((met, i) => (
                            <div key={i} className="bg-white/2 p-2.5 rounded-xl border border-white/5">
                              <span className="text-[9px] font-mono text-current/40 uppercase block">{met.label}</span>
                              <span className={`text-xs font-sans font-black ${met.accent ? 'text-violet-300' : 'text-white'}`}>{met.value}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="border-t border-white/5 pt-3 mt-3 text-[10.5px] leading-relaxed text-current/50">
                        <span className="font-mono text-[9px] font-black text-violet-400 uppercase block mb-1">Service Insight</span>
                        {simulationResult.insights}
                      </div>
                    </div>

                  </div>

                  {/* Footer status line */}
                  <div className="border-t border-white/5 pt-3 mt-4 flex items-center justify-between text-[10px] font-mono text-violet-400/80">
                    <span className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                      <span>NEXORA CORE ENGINES ON-CHAIN HEALTH: READY (100%)</span>
                    </span>
                    <span>VERSION 1.0.0</span>
                  </div>

                </div>

              </div>
            </div>
          );
        })()}

        {/* ======================================================== */}
        {/* ECOSYSTEM & MONETIZATION SUBVIEW */}
        {/* ======================================================== */}
        {activeSubView === 'ecosystem' && (
          <div className="lg:col-span-12 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
              
              {/* Left Column: Direct Metrics dashboard (NOT fake) */}
              <div className="md:col-span-4 bg-[#03010b] border border-violet-500/15 rounded-3xl p-5 space-y-5">
                <span className="text-[10px] font-sans font-black tracking-widest text-violet-400 uppercase block">ON-CHAIN MONETIZATION</span>
                
                <div className="space-y-4">
                  <div className="bg-white/2 border border-white/5 rounded-2xl p-4 text-center space-y-1">
                    <span className="text-[9px] text-current/40 uppercase">Real NEX Wallet Balance</span>
                    <h3 className="text-2xl font-black font-sans text-violet-300">{(currentUser.nexBalance || 0).toLocaleString()} NEX</h3>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-white/2 border border-white/5 rounded-xl p-3 text-center">
                      <span className="text-[8px] text-current/40 block">This week earned</span>
                      <span className="text-sm font-black text-white">{(currentUser.thisWeekEarnedNex || 0).toLocaleString()}</span>
                    </div>
                    <div className="bg-white/2 border border-white/5 rounded-xl p-3 text-center">
                      <span className="text-[8px] text-current/40 block">Pending Rewards</span>
                      <span className="text-sm font-black text-white">{(currentUser.pendingNex || 0).toLocaleString()}</span>
                    </div>
                  </div>

                  <div className="border-t border-white/5 pt-3">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-current/60">Living Reputation:</span>
                      <span className="font-extrabold text-violet-300">{currentUser.reputationPoints.toLocaleString()} PR</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column: AI Earning Recommendations */}
              <div className="md:col-span-8 bg-[#03010b] border border-violet-500/15 rounded-3xl p-5 space-y-4">
                <div className="flex justify-between items-center border-b border-white/5 pb-2">
                  <span className="text-[10px] font-sans font-black text-violet-400 uppercase tracking-widest">NEX REWARDS INSIGHTS ENGINE</span>
                  <DollarSign className="w-4 h-4 text-violet-400" />
                </div>

                <div className="space-y-4 text-xs leading-relaxed text-current/80">
                  {renderMarkdown(CreatorEngine.getMonetizationRecommendations(currentUser))}
                  {renderMarkdown(CreatorEngine.getEarningsExplanations(currentUser))}
                </div>
              </div>

            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* ADMIN MODERATION SANDBOX SUBVIEW */}
        {/* ======================================================== */}
        {activeSubView === 'moderation' && (
          <div className="lg:col-span-12 space-y-4">
            <div className="bg-[#03010b] border border-violet-500/15 rounded-3xl p-6 space-y-6">
              
              <div>
                <span className="text-[10px] font-sans font-black tracking-widest text-violet-400 uppercase block mb-1">MODERATION & SECURITY INTELLIGENCE</span>
                <p className="text-xs text-current/60">Test content safety, filter promotional spam, and prepare report review summaries.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Spam analyzer */}
                <div className="space-y-3 bg-white/2 border border-white/5 p-4 rounded-2xl">
                  <span className="text-[9.5px] font-black text-cyan-400 uppercase block">Content Spam Scanner</span>
                  <textarea
                    placeholder="Type or paste post text to check spam score (e.g. 'earn money quickly! click here')..."
                    value={moderationText}
                    onChange={(e) => setModerationText(e.target.value)}
                    className="w-full h-24 p-2 bg-black border border-white/10 rounded-xl text-xs focus:outline-none"
                  />
                  <button
                    onClick={runModerationAssessment}
                    className="w-full py-2 bg-cyan-600 hover:bg-cyan-500 text-white font-sans text-xs font-black rounded-lg"
                  >
                    SCAN CONTENT
                  </button>

                  {moderationResult && (
                    <div className="mt-3 bg-black/40 border border-white/5 p-3 rounded-lg text-[11px] space-y-1.5">
                      <p className="font-bold flex items-center justify-between">
                        <span>Spam Risk Level:</span>
                        <span className={moderationResult.isFlagged ? 'text-rose-400' : 'text-emerald-400'}>
                          {(moderationResult.score * 100).toFixed(0)}% Match
                        </span>
                      </p>
                      {moderationResult.reasons.length > 0 && (
                        <p className="text-current/60">Flags: {moderationResult.reasons.join(', ')}</p>
                      )}
                      <p className="text-violet-300 italic">{moderationResult.recommendation}</p>
                    </div>
                  )}
                </div>

                {/* Report Assessor */}
                <div className="space-y-3 bg-white/2 border border-white/5 p-4 rounded-2xl">
                  <span className="text-[9.5px] font-black text-fuchsia-400 uppercase block">Report Review Assessor</span>
                  <input
                    type="text"
                    placeholder="Reporter claim (e.g. Spreading scam links)..."
                    value={reportText}
                    onChange={(e) => setReportText(e.target.value)}
                    className="w-full px-2 py-1.5 bg-black border border-white/10 rounded-lg text-xs"
                  />
                  <textarea
                    placeholder="Reported post content here..."
                    value={reportedContent}
                    onChange={(e) => setReportedContent(e.target.value)}
                    className="w-full h-16 p-2 bg-black border border-white/10 rounded-lg text-xs"
                  />
                  <button
                    onClick={runReportAssessment}
                    className="w-full py-2 bg-violet-600 hover:bg-violet-500 text-white font-sans text-xs font-black rounded-lg"
                  >
                    SYNTHESIZE ASSESSMENT
                  </button>

                  {reportedAnalysis && (
                    <div className="mt-3 bg-black/40 border border-white/5 p-3 rounded-lg text-[10.5px] text-current/80 leading-relaxed">
                      {renderMarkdown(reportedAnalysis)}
                    </div>
                  )}
                </div>

              </div>

            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* SETTINGS SUBVIEW */}
        {/* ======================================================== */}
        {activeSubView === 'settings' && (
          <div className="lg:col-span-12 space-y-4">
            <div className="bg-[#03010b] border border-violet-500/15 rounded-3xl p-6 space-y-6">
              <div>
                <span className="text-[10px] font-sans font-black tracking-widest text-violet-400 uppercase block mb-1">VOH AI PARAMETERS CONTROL</span>
                <p className="text-xs text-current/60">Customize systemic instructions, temperature, rate limit thresholds and memory DNA preferences.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Advanced parameters */}
                <div className="bg-white/2 border border-white/5 p-4 rounded-2xl space-y-4">
                  <span className="text-[9.5px] font-black text-violet-400 uppercase block">Engine Thresholds</span>
                  
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span>Creative Temperature</span>
                        <span className="font-bold text-violet-300">{aiSettings.temperature}</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.1"
                        value={aiSettings.temperature}
                        onChange={(e) => setAiSettings(prev => ({ ...prev, temperature: parseFloat(e.target.value) }))}
                        className="w-full accent-violet-600"
                      />
                    </div>

                    <div className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span>Max Response Tokens</span>
                        <span className="font-bold text-violet-300">{aiSettings.maxTokens}</span>
                      </div>
                      <input
                        type="range"
                        min="256"
                        max="2048"
                        step="128"
                        value={aiSettings.maxTokens}
                        onChange={(e) => setAiSettings(prev => ({ ...prev, maxTokens: parseInt(e.target.value) }))}
                        className="w-full accent-violet-600"
                      />
                    </div>
                  </div>
                </div>

                {/* Memory Profile Edit */}
                <div className="bg-white/2 border border-white/5 p-4 rounded-2xl space-y-4">
                  <span className="text-[9.5px] font-black text-cyan-400 uppercase block">AI Tone Preference</span>
                  
                  <div className="space-y-3">
                    <div className="flex gap-1.5 flex-wrap">
                      {(['futuristic', 'concise', 'educational', 'humorous'] as const).map((tone) => (
                        <button
                          key={tone}
                          onClick={() => {
                            setMemoryProfile(prev => ({
                              ...prev,
                              preferences: { ...prev.preferences, aiTone: tone }
                            }));
                            showToast(`Tone preference: ${tone}`);
                          }}
                          className={`px-3 py-1.5 rounded-xl text-xs uppercase tracking-wider font-bold ${
                            memoryProfile.preferences.aiTone === tone 
                              ? 'bg-cyan-600 text-white' 
                              : 'bg-white/5 text-current/60'
                          }`}
                        >
                          {tone}
                        </button>
                      ))}
                    </div>

                    <p className="text-[10.5px] text-current/50 leading-relaxed mt-2">
                      VOH AI utilizes this preference as an active system modifier to custom align its generated layouts.
                    </p>
                  </div>
                </div>
              </div>

              {/* Global Terminology Customizer Section */}
              <div className="bg-white/2 border border-white/5 p-5 rounded-2xl space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/5 pb-3">
                  <div>
                    <span className="text-[10px] font-black text-violet-400 uppercase block tracking-wider">Global Terminology Registry</span>
                    <p className="text-[11px] text-current/60">Customize core branding terms. Changes propagate in real-time across the platform and VOH AI engines.</p>
                  </div>
                  <button
                    onClick={() => {
                      handleTerminologyReset();
                      showToast('Terminology reset to system defaults.');
                    }}
                    className="text-[10px] font-mono uppercase bg-white/5 hover:bg-white/10 text-zinc-300 px-3 py-1.5 rounded-lg transition-all cursor-pointer border border-white/5 self-start sm:self-auto"
                  >
                    Reset Defaults
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Category 1: Followers & Relationships */}
                  <div className="space-y-3 bg-[#03010b]/50 p-3.5 rounded-xl border border-white/5">
                    <span className="text-[9px] font-mono text-cyan-400 uppercase font-black tracking-widest block">👥 Relationships</span>
                    
                    <div className="space-y-2">
                      <div className="space-y-1">
                        <label className="text-[10px] text-zinc-400">Followers Plural</label>
                        <input
                          type="text"
                          value={terminologyState.followersCapitalized}
                          onChange={(e) => {
                            handleTerminologyChange('followersCapitalized', e.target.value);
                            handleTerminologyChange('followers', e.target.value.toLowerCase());
                            handleTerminologyChange('followersUpper', e.target.value.toUpperCase());
                          }}
                          className="w-full bg-[#0d0a26] border border-white/10 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-violet-500 font-bold"
                          placeholder="Followers"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] text-zinc-400">Follower Singular</label>
                        <input
                          type="text"
                          value={terminologyState.followerCapitalized}
                          onChange={(e) => {
                            handleTerminologyChange('followerCapitalized', e.target.value);
                            handleTerminologyChange('follower', e.target.value.toLowerCase());
                          }}
                          className="w-full bg-[#0d0a26] border border-white/10 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-violet-500 font-bold"
                          placeholder="Follower"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] text-zinc-400">Following Label</label>
                        <input
                          type="text"
                          value={terminologyState.followingCapitalized}
                          onChange={(e) => {
                            handleTerminologyChange('followingCapitalized', e.target.value);
                            handleTerminologyChange('following', e.target.value.toLowerCase());
                            handleTerminologyChange('followingUpper', e.target.value.toUpperCase());
                          }}
                          className="w-full bg-[#0d0a26] border border-white/10 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-violet-500 font-bold"
                          placeholder="Following"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Category 2: Communities & Nodes */}
                  <div className="space-y-3 bg-[#03010b]/50 p-3.5 rounded-xl border border-white/5">
                    <span className="text-[9px] font-mono text-cyan-400 uppercase font-black tracking-widest block">🏟️ Spaces & Nodes</span>

                    <div className="space-y-2">
                      <div className="space-y-1">
                        <label className="text-[10px] text-zinc-400">Communities Plural</label>
                        <input
                          type="text"
                          value={terminologyState.communitiesCapitalized}
                          onChange={(e) => {
                            handleTerminologyChange('communitiesCapitalized', e.target.value);
                            handleTerminologyChange('communities', e.target.value.toLowerCase());
                            handleTerminologyChange('communitiesUpper', e.target.value.toUpperCase());
                          }}
                          className="w-full bg-[#0d0a26] border border-white/10 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-violet-500 font-bold"
                          placeholder="Communities"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] text-zinc-400">Community Singular</label>
                        <input
                          type="text"
                          value={terminologyState.communityCapitalized}
                          onChange={(e) => {
                            handleTerminologyChange('communityCapitalized', e.target.value);
                            handleTerminologyChange('community', e.target.value.toLowerCase());
                            handleTerminologyChange('communityUpper', e.target.value.toUpperCase());
                          }}
                          className="w-full bg-[#0d0a26] border border-white/10 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-violet-500 font-bold"
                          placeholder="Community"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] text-zinc-400">Locations (Nodes)</label>
                        <input
                          type="text"
                          value={terminologyState.nodesCapitalized}
                          onChange={(e) => {
                            handleTerminologyChange('nodesCapitalized', e.target.value);
                            handleTerminologyChange('nodes', e.target.value.toLowerCase());
                            handleTerminologyChange('nodesUpper', e.target.value.toUpperCase());
                          }}
                          className="w-full bg-[#0d0a26] border border-white/10 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-violet-500 font-bold"
                          placeholder="Locations"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Category 3: Content Interaction */}
                  <div className="space-y-3 bg-[#03010b]/50 p-3.5 rounded-xl border border-white/5">
                    <span className="text-[9px] font-mono text-cyan-400 uppercase font-black tracking-widest block">⚡ Sparks & Loops</span>

                    <div className="space-y-2">
                      <div className="space-y-1">
                        <label className="text-[10px] text-zinc-400">Likes (Sparks)</label>
                        <input
                          type="text"
                          value={terminologyState.sparksCapitalized}
                          onChange={(e) => {
                            handleTerminologyChange('sparksCapitalized', e.target.value);
                            handleTerminologyChange('sparks', e.target.value.toLowerCase());
                            handleTerminologyChange('sparksUpper', e.target.value.toUpperCase());
                          }}
                          className="w-full bg-[#0d0a26] border border-white/10 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-violet-500 font-bold"
                          placeholder="Sparks"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] text-zinc-400">Videos (Loops)</label>
                        <input
                          type="text"
                          value={terminologyState.loopsCapitalized}
                          onChange={(e) => {
                            handleTerminologyChange('loopsCapitalized', e.target.value);
                            handleTerminologyChange('loops', e.target.value.toLowerCase());
                            handleTerminologyChange('loopsUpper', e.target.value.toUpperCase());
                          }}
                          className="w-full bg-[#0d0a26] border border-white/10 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-violet-500 font-bold"
                          placeholder="Loops"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </div>
        )}

      </div>
    </div>
  );
}
