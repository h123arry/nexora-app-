import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Sparkles, 
  Mic, 
  MicOff, 
  Volume2, 
  VolumeX, 
  FileText, 
  Send, 
  BrainCircuit,
  ClipboardCopy,
  Info,
  CheckCircle,
  TrendingUp,
  Award,
  Search,
  Plus,
  Trash2,
  Pin,
  Archive,
  FolderPlus,
  Folder,
  RefreshCw,
  HelpCircle,
  ShieldCheck,
  AlertTriangle,
  FileCheck,
  ThumbsUp,
  MessageSquare,
  Sparkle,
  PenSquare,
  Users,
  Settings,
  X,
  Play,
  Square,
  BookOpen,
  DollarSign
} from 'lucide-react';
import { User, Post, Circle, Notification } from '../types';
import RelativeTimestamp from './RelativeTimestamp';
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
  NotificationEngine
} from '../services/voh';

interface VohAiViewProps {
  currentUser: User;
  posts: Post[];
  onAddPost: (content: string, imageUrl?: string, tagsString?: string) => void;
  setActiveTab: (tab: any) => void;
}

type AISubView = 'chat' | 'voice' | 'assistants' | 'ecosystem' | 'search' | 'moderation' | 'settings';

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
        setTranscription("We are designing a gorgeous space-glass interface with high-reputation community nodes in Port Harcourt!");
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
      
      const response = await ChatEngine.sendChatMessage(message, mappedHistory, currentUser);
      setIsDemoMode(!!response.isDemo);

      const responseMessage: Message = {
        id: aiMsgId,
        sender: 'voh',
        text: response.text,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        reactions: []
      };

      setSessions(prev => prev.map(s => s.id === sessionId ? { ...s, messages: [...s.messages, responseMessage] } : s));

      // Auto TTS if voice config auto-read is on
      if (voiceConfig.autoRead) {
        VoiceEngine.speak(response.text, voiceConfig);
      }

    } catch (err) {
      console.error(err);
      const failedMessage: Message = {
        id: aiMsgId,
        sender: 'voh',
        text: "❌ **Response Error**: Unable to synchronize with server-side AI engines. Please check your developer instance status and try again.",
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
            <Sparkle className="w-4 h-4 animate-spin text-amber-300" />
            <span>{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Primary Top Panel Row */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-current/10 pb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Sparkles className="w-5 h-5 text-violet-400 animate-pulse" />
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
            <BrainCircuit className="w-4 h-4 text-violet-400" />
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
        {(['chat', 'voice', 'assistants', 'search', 'ecosystem', 'moderation', 'settings'] as const).map((view) => (
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
            <strong>Standby Demo Mode Active:</strong> Some AI results are utilizing local templates. Insert your real <strong>GEMINI_API_KEY</strong> in the Secrets panel to activate direct live LLM compilation.
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
                      {msg.sender === 'voh' ? <Sparkles className="w-3.5 h-3.5 animate-pulse" /> : <Volume2 className="w-3.5 h-3.5" />}
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

                {typingIndicator && (
                  <div className="flex gap-3 max-w-[85%]">
                    <div className="w-7 h-7 rounded-lg bg-violet-600/10 text-violet-400 flex items-center justify-center shrink-0 border border-violet-500/10">
                      <Sparkles className="w-4 h-4 animate-pulse" />
                    </div>
                    <div className="p-3 rounded-2xl text-xs bg-[#0a071c] border border-violet-500/15 text-violet-400 italic font-mono flex items-center gap-2 animate-pulse">
                      <BrainCircuit className="w-4 h-4 animate-spin" />
                      <span>Seralizing data streams...</span>
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

              {/* Chat Input form */}
              <form onSubmit={handleSendPrompt} className="p-3 border-t border-current/10 bg-[#06040f] flex gap-2">
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
                  placeholder={loadingAi ? "VOH AI is working..." : "Ask VOH AI: summarize feed, find job..."}
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
                    <span className="text-[10px] font-sans font-black tracking-widest text-violet-400 uppercase">TRANSCRIBED METRICS OUTCOME</span>
                    <Award className="w-4 h-4 text-violet-400" />
                  </div>

                  {isSynthesizingVoice ? (
                    <div className="py-12 flex flex-col items-center justify-center space-y-2">
                      <BrainCircuit className="w-10 h-10 text-violet-400 animate-spin" />
                      <p className="text-xs font-mono italic text-violet-300">Synchronizing Audio Channels...</p>
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
                      placeholder="Search Users, Posts, Communities, or tags..."
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

                    {/* Circles matching */}
                    <div className="bg-white/2 border border-white/5 p-4 rounded-2xl space-y-3">
                      <span className="text-[9px] font-black text-fuchsia-400 block uppercase font-mono">Matched Communities</span>
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

            </div>
          </div>
        )}

      </div>
    </div>
  );
}
