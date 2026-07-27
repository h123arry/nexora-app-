import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import VohIcon from './VohIcon';
import { 
  X, HardDrive, ShieldCheck, Cpu, Battery, Activity, Info, AlertTriangle, 
  Trash2, RefreshCw, Sparkles, Search, Sliders, Check, Download, ChevronRight, 
  Image, Video, Mic, FileText, Globe, Share2, Archive, Star, Play, Pause, 
  Smartphone, Wifi, Eye, Radio, Key, Cloud, Database, BarChart2, Zap, 
  Settings, Lock, Unlock, HelpCircle, FileSpreadsheet, ArrowDownCircle, AlertCircle
} from 'lucide-react';

interface StorageDataCenterModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// Custom mock types for the interactive managers
interface MockConversationStorage {
  id: string;
  name: string;
  username: string;
  avatar: string;
  totalSize: string; // e.g. "1.2 GB"
  sizeBytes: number;
  breakdown: {
    photos: string;
    videos: string;
    voiceNotes: string;
    gifs: string;
    stickers: string;
    documents: string;
    links: string;
    messages: string;
  };
  mediaItems: {
    id: string;
    type: 'photo' | 'video' | 'voice' | 'document' | 'gif' | 'link';
    url: string;
    name: string;
    size: string;
    date: string;
    isFavorite?: boolean;
    isPinned?: boolean;
  }[];
}

export default function StorageDataCenterModal({ isOpen, onClose }: StorageDataCenterModalProps) {
  // Active Tab
  const [activeTab, setActiveTab] = useState<'dashboard' | 'analyzer' | 'conversations' | 'downloads' | 'backups' | 'network' | 'optimization'>('dashboard');
  
  // Localized search inside the sub-panels
  const [panelSearchQuery, setPanelSearchQuery] = useState('');

  // --- STATE PERSISTENCE ---
  const [cacheLevels, setCacheLevels] = useState(() => {
    const saved = localStorage.getItem('nx_storage_cache');
    return saved ? JSON.parse(saved) : {
      image: 342, // MB
      video: 512,
      thumbnail: 45,
      sticker: 12,
      gif: 88,
      emoji: 5,
      search: 3,
      ai: 120,
      temporary: 210,
      database: 15
    };
  });

  // Calculate total cache dynamically
  const totalCacheMB = useMemo(() => {
    const values = Object.values(cacheLevels || {});
    return values.reduce((acc: number, curr: any) => acc + Number(curr || 0), 0) as number;
  }, [cacheLevels]);

  // Download settings
  const [downloads, setDownloads] = useState(() => {
    const saved = localStorage.getItem('nx_storage_downloads');
    return saved ? JSON.parse(saved) : {
      mobile: { images: 'auto', videos: 'ask', gifs: 'auto', voiceNotes: 'auto', audio: 'ask', documents: 'never', stories: 'ask', aiAssets: 'never' },
      wifi: { images: 'auto', videos: 'auto', gifs: 'auto', voiceNotes: 'auto', audio: 'auto', documents: 'auto', stories: 'auto', aiAssets: 'auto' },
      roaming: { images: 'never', videos: 'never', gifs: 'never', voiceNotes: 'ask', audio: 'never', documents: 'never', stories: 'never', aiAssets: 'never' },
      compressionMode: 'balanced' as 'original' | 'hd' | 'balanced' | 'saver' | 'ultrasaver',
      adaptiveDataSaver: false,
      autoSaverTriggers: { lowBattery: true, weakSignal: true, roaming: true, limitedData: false }
    };
  });

  // Backup configurations
  const [backups, setBackups] = useState(() => {
    const saved = localStorage.getItem('nx_storage_backups');
    return saved ? JSON.parse(saved) : {
      enabledItems: { messages: true, media: true, stories: false, groups: true, communities: true, broadcasts: true, settings: true, aiPreferences: true },
      schedule: 'weekly' as 'manual' | 'daily' | 'weekly' | 'monthly' | 'custom',
      encryptionEnabled: true,
      encryptionPassword: '••••••••••••',
      recoveryKey: '4D8F-92B1-0E54-88A2-31C7-F002-99D1-884A-B67D-EEA2-1111-92A3-F6A2',
      destinations: { googleDrive: true, iCloud: false, localDevice: true, nas: false, privateServer: false }
    };
  });

  // State: Active Media Explorer Target Chat
  const [selectedChatForMedia, setSelectedChatForMedia] = useState<MockConversationStorage | null>(null);
  const [mediaFilterTab, setMediaFilterTab] = useState<'all' | 'photo' | 'video' | 'voice' | 'document' | 'gif' | 'link'>('all');
  const [selectedMediaItemIds, setSelectedMediaItemIds] = useState<string[]>([]);
  const [explorerViewType, setExplorerViewType] = useState<'grid' | 'list' | 'timeline'>('grid');

  // Network stats reset timestamp
  const [networkResetTime, setNetworkResetTime] = useState('January 1, 2026');

  // Optimization simulation
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [optimizationScore, setOptimizationScore] = useState(84);
  const [systemMetrics, setSystemMetrics] = useState({
    cpu: 18, // %
    memory: 42, // %
    battery: 89, // %
    storageHealth: 'Excellent (Green Status)',
    tasksCount: 6,
    indexHealth: '100% Calibrated',
    integrityVerified: true
  });

  // Interactive backup restoration state
  const [isRestoring, setIsRestoring] = useState(false);
  const [selectedRestoreBackupId, setSelectedRestoreBackupId] = useState<string | null>(null);

  // --- NEXT-GEN PERFORMANCE OPTIMIZATION ENGINE STATE ---
  const [performanceSubTab, setPerformanceSubTab] = useState<'dashboard' | 'subsystems' | 'queues' | 'ai' | 'analytics'>('dashboard');
  
  // 1. Intelligent Lazy Loading Toggles
  const [lazyLoadingToggles, setLazyLoadingToggles] = useState(() => {
    const saved = localStorage.getItem('nx_lazy_loading_toggles');
    return saved ? JSON.parse(saved) : {
      chatLists: true,
      communities: true,
      broadcastLists: true,
      stories: true,
      notifications: true,
      searchResults: true,
      mediaGallery: true,
      profiles: true,
      comments: true,
      aiChats: true,
    };
  });
  const [recycledComponents, setRecycledComponents] = useState(148);

  // 2. Adaptive Preloading
  const [preloadConditions, setPreloadConditions] = useState({
    idleOnly: true,
    batteryHealthy: true,
    networkStable: true,
    memoryAvailable: true,
  });
  const [preloadedChats, setPreloadedChats] = useState<string[]>(['group-main', 'voh_ai']);
  const [isSimulatingPreload, setIsSimulatingPreload] = useState(false);

  // 3. Progressive Media Loading
  const [progressiveMedium, setProgressiveMedium] = useState<'image' | 'video' | 'voice' | 'doc'>('image');
  const [progressiveLevel, setProgressiveLevel] = useState<number>(3); // 0 = Tiny blur, 1 = Low res, 2 = Medium, 3 = Original

  // 4. Intelligent Cache Engine
  const [cacheTable, setCacheTable] = useState([
    { id: 'memory', name: 'Virtual RAM Cache', size: '28 MB', items: 230, status: 'Active' },
    { id: 'disk', name: 'Persistent IndexedDB Store', size: '899 MB', items: 4120, status: 'Active' },
    { id: 'thumbnail', name: 'Tiny Blur Thumbnails', size: '45 MB', items: 1240, status: 'Optimized' },
    { id: 'media', name: 'Media Cache (Video/Images)', size: '854 MB', items: 820, status: 'Managed' },
    { id: 'ai', name: 'AI Models & Embeddings Cache', size: '120 MB', items: 15, status: 'Active' },
    { id: 'search', name: 'Search Ledger Index', size: '3 MB', items: 450, status: 'Indexed' },
    { id: 'emoji', name: 'Emoji Sprites Cache', size: '5 MB', items: 1400, status: 'Active' },
    { id: 'sticker', name: 'Custom Stickers Cache', size: '12 MB', items: 110, status: 'Optimized' },
    { id: 'story', name: 'Stories Ephemeral Buffer', size: '88 MB', items: 65, status: 'Active' },
  ]);
  const [cacheMaintenanceActive, setCacheMaintenanceActive] = useState(true);
  const [rebuildingCacheId, setRebuildingCacheId] = useState<string | null>(null);

  // 5. Infinite Scrolling Engine Simulator
  const [virtualScrollPosition, setVirtualScrollPosition] = useState(0);
  const totalVirtualRecords = 1250000;
  const visibleVirtualRecords = 15;

  // 6. Offline Queue Engine Simulator
  const [offlineQueue, setOfflineQueue] = useState<any[]>(() => {
    const saved = localStorage.getItem('nx_offline_queue');
    return saved ? JSON.parse(saved) : [
      { id: 'q-1', type: 'Message', payload: 'Encrypting and tunnel-transmitting keys...', status: 'completed', timestamp: '10:41 AM' },
      { id: 'q-2', type: 'Reaction', payload: 'Added Heart reaction to @lucas_cyber', status: 'completed', timestamp: '10:42 AM' },
      { id: 'q-3', type: 'Poll Vote', payload: 'Voted "Option B: Web3 Bridges" in DevCommunity', status: 'pending', timestamp: 'Just now' },
      { id: 'q-4', type: 'AI Request', payload: 'VOH Summary on global security indexes', status: 'pending', timestamp: 'Just now' },
      { id: 'q-5', type: 'Comment', payload: 'Adding commentary block to thread #42', status: 'pending', timestamp: 'Just now' },
    ];
  });
  const [isSimulatedOffline, setIsSimulatedOffline] = useState(() => {
    return localStorage.getItem('nx_is_simulated_offline') === 'true';
  });

  // 7. Background Synchronization
  const [syncSchedule, setSyncSchedule] = useState<'silent' | 'incremental' | 'delta' | 'full'>('incremental');
  const [deltaRate, setDeltaRate] = useState('14.2 KB/s');

  // 8. Adaptive Network Engine
  const [networkHud, setNetworkHud] = useState({
    signal: 'Excellent',
    speed: '48.5 Mbps',
    latency: '24 ms',
    loss: '0.01%',
    dataSaver: false,
    roaming: false,
    battery: '88%',
  });

  // 9. Smart Battery Manager
  const [batterySaverActive, setBatterySaverActive] = useState(() => {
    return localStorage.getItem('nx_battery_saver_active') === 'true';
  });

  // 10. Memory Optimization State
  const [ramStatus, setRamStatus] = useState({
    totalUsed: '234 MB',
    status: 'Healthy',
    level: 28,
  });

  // 11. Database Optimization Index Check
  const [dbOptimizations, setDbOptimizations] = useState({
    indexHealth: '100%',
    queryCaching: 'Enabled',
    syncQueueSize: 0,
    cryptographySeal: 'Verified',
  });

  // 12. AI Performance Assistant Messages
  const [aiAssistantMessages, setAiAssistantMessages] = useState<any[]>([
    { id: 'm-1', sender: 'assistant', text: "Hello! I am Nida's specialized performance subsystem. I monitor memory pages, network tunnels, and filesystem pipelines. Here are your custom diagnostic insights:", timestamp: 'Just now' },
    { id: 'm-2', sender: 'assistant', text: "⚡ Recommendations:\n• Your virtualized RAM is extremely clean, but 854 MB of old video downloads could be compressed to reclaim disk space.\n• Toggle 'Battery Saver Mode' to immediately pause complex viewport canvas shaders.\n• Rebuild your thumbnail index to recover 12 MB of cache leaks.", timestamp: 'Just now', suggestions: true }
  ]);
  const [aiInput, setAiInput] = useState('');

  // 13. Crash Prevention Safeguards
  const [safeguards, setSafeguards] = useState({
    memoryExhaustion: 'Healthy',
    storageExhaustion: 'Healthy',
    infiniteLoops: 'Healthy',
    uiFreezes: 'Healthy',
    slowDbQueries: 'Healthy',
    corruptedCache: 'Healthy'
  });

  // 14. Performance Analytics History
  const [performanceHistory, setPerformanceHistory] = useState([
    { name: '08:00', startup: 135, fps: 59, latency: 45 },
    { name: '09:00', startup: 122, fps: 60, latency: 32 },
    { name: '10:00', startup: 118, fps: 58, latency: 28 },
    { name: '11:00', startup: 120, fps: 60, latency: 24 },
  ]);

  // 15. Developer Diagnostics Overlay State
  const [diagnosticsActive, setDiagnosticsActive] = useState(() => {
    return localStorage.getItem('nx_diagnostics_overlay') === 'true';
  });

  // 16. Dynamic Telemetry Data Array for Graphing
  const [liveTelemetry, setLiveTelemetry] = useState(() => {
    return Array.from({ length: 15 }).map((_, i) => ({
      cpu: Math.floor(15 + Math.random() * 10),
      ram: Math.floor(35 + Math.random() * 5),
      battery: 89 - i * 0.1
    }));
  });

  // --- TELEMETRY FLUCTUATOR AND SIMULATION CYCLE ---
  useEffect(() => {
    if (!isOpen) return;

    const interval = setInterval(() => {
      // 1. System Metrics Fluctuations
      setSystemMetrics(prev => ({
        ...prev,
        cpu: Math.max(5, Math.min(65, prev.cpu + Math.floor(Math.random() * 11) - 5)),
        memory: Math.max(10, Math.min(80, prev.memory + Math.floor(Math.random() * 7) - 3)),
        battery: Math.max(1, Math.min(100, prev.battery - (batterySaverActive ? 0.02 : 0.08))),
      }));

      // 2. Append to Graphing Telemetry
      setLiveTelemetry(prev => {
        const cpuVal = Math.max(5, Math.min(75, (prev[prev.length - 1]?.cpu || 15) + Math.floor(Math.random() * 15) - 7));
        const ramVal = Math.max(15, Math.min(85, (prev[prev.length - 1]?.ram || 42) + Math.floor(Math.random() * 9) - 4));
        return [...prev.slice(1), { cpu: cpuVal, ram: ramVal, battery: 80 }];
      });

      // 3. Network HUD updates
      setNetworkHud(prev => ({
        ...prev,
        speed: `${(40 + Math.random() * 15).toFixed(1)} Mbps`,
        latency: `${Math.floor(20 + Math.random() * 10)} ms`,
        loss: `${(0.01 + Math.random() * 0.04).toFixed(3)}%`,
      }));

      // 4. Ram Footprint updates
      setRamStatus(prev => {
        const numeric = parseInt(prev.totalUsed) + Math.floor(Math.random() * 9) - 4;
        return {
          totalUsed: `${numeric} MB`,
          status: numeric > 320 ? 'Warning' : 'Healthy',
          level: Math.floor((numeric / 800) * 100),
        };
      });

      // 5. Offline Queue Processing (P2P syncing)
      setOfflineQueue(prev => {
        if (isSimulatedOffline) return prev;
        const pendingIdx = prev.findIndex(item => item.status === 'pending' || item.status === 'retrying');
        if (pendingIdx !== -1) {
          const updated = [...prev];
          updated[pendingIdx] = { ...updated[pendingIdx], status: 'uploading' };
          
          setTimeout(() => {
            setOfflineQueue(current => {
              const next = [...current];
              const itemIdx = next.findIndex(x => x.id === updated[pendingIdx].id);
              if (itemIdx !== -1) {
                next[itemIdx] = { ...next[itemIdx], status: 'completed', timestamp: 'Just now' };
                window.dispatchEvent(new CustomEvent('toast', { detail: `⚡ Offline Queue: ${next[itemIdx].type} successfully synchronized!` }));
              }
              return next;
            });
          }, 1500);

          return updated;
        }
        return prev;
      });

      // 6. Recycled DOM Components Ticker
      setRecycledComponents(prev => prev + Math.floor(Math.random() * 3));

    }, 2500);

    return () => clearInterval(interval);
  }, [isOpen, batterySaverActive, isSimulatedOffline]);

  // Save Offline Queue to LocalStorage on updates
  useEffect(() => {
    localStorage.setItem('nx_offline_queue', JSON.stringify(offlineQueue));
  }, [offlineQueue]);

  // Helper: Trigger Rebuild Cache
  const triggerRebuildCache = (cacheId: string) => {
    setRebuildingCacheId(cacheId);
    setTimeout(() => {
      setCacheTable(prev => {
        return prev.map(item => {
          if (item.id === cacheId) {
            return {
              ...item,
              size: cacheId === 'thumbnail' ? '4 MB' : '0 B',
              items: cacheId === 'thumbnail' ? 120 : 0,
              status: 'Rebuilt & Sealed'
            };
          }
          return item;
        });
      });
      setRebuildingCacheId(null);
      window.dispatchEvent(new CustomEvent('toast', { detail: `🧹 Cache Rebuilt: Cleared leaked pages in ${cacheId} cache!` }));
    }, 1500);
  };

  // Helper: Handle toggling diagnostic FPS overlay
  const handleToggleDiagnostics = (active: boolean) => {
    setDiagnosticsActive(active);
    localStorage.setItem('nx_diagnostics_overlay', active ? 'true' : 'false');
    window.dispatchEvent(new CustomEvent('nx-diagnostics-toggle', { detail: active }));
    window.dispatchEvent(new CustomEvent('toast', { detail: active ? '🛠️ Floating developer diagnostics overlay enabled!' : '🛠️ Floating overlay disabled.' }));
  };

  // Helper: Queue Simulated Offline Message
  const handleQueueSimulatedMessage = () => {
    const types = ['Message', 'Reaction', 'Comment', 'AI Request', 'Poll Vote'];
    const payloads = [
      'Encrypted message payload transmitted over node...',
      'Added Fire reaction to community thread',
      'Comment payload #812 indexed local-side',
      'VOH Request: summarize global network parameters',
      'Voted "Option A: Rust microservices" in ledger poll'
    ];
    const randIdx = Math.floor(Math.random() * types.length);
    const newQueueItem = {
      id: `q-${Date.now()}`,
      type: types[randIdx],
      payload: payloads[randIdx],
      status: 'pending',
      timestamp: 'Just now'
    };
    setOfflineQueue(prev => [...prev, newQueueItem]);
    window.dispatchEvent(new CustomEvent('toast', { detail: `📥 Local Queue: Added simulated ${types[randIdx]}!` }));
  };

  // Helper: Execute AI Assistant Action Recommendations
  const executeAiAction = (actionId: string) => {
    if (actionId === 'battery') {
      setBatterySaverActive(true);
      localStorage.setItem('nx_battery_saver_active', 'true');
      window.dispatchEvent(new CustomEvent('toast', { detail: '⚡ Smart Battery Saver enabled. Background polling throttled.' }));
      setAiAssistantMessages(prev => [...prev, {
        id: `action-${Date.now()}`,
        sender: 'assistant',
        text: "🔋 Smart Battery Saver Mode has been enabled. I have adjusted the polling scheduler, suspended viewport shader threads, and deferred background sync payloads. Savings rate: +2.4h estimated battery life."
      }]);
    } else if (actionId === 'rebuild_thumbnail') {
      triggerRebuildCache('thumbnail');
      setAiAssistantMessages(prev => [...prev, {
        id: `action-${Date.now()}`,
        sender: 'assistant',
        text: "🧹 Rebuilding tiny thumbnail index cache... Completed! Recovered 41 MB of leaked RAM blocks."
      }]);
    } else if (actionId === 'compress_media') {
      setCacheLevels(prev => {
        const next = { ...prev, video: Math.floor(prev.video * 0.4), image: Math.floor(prev.image * 0.5) };
        localStorage.setItem('nx_storage_cache', JSON.stringify(next));
        return next;
      });
      window.dispatchEvent(new CustomEvent('toast', { detail: '📦 Media compressed: Recovered 432 MB of disk space!' }));
      setAiAssistantMessages(prev => [...prev, {
        id: `action-${Date.now()}`,
        sender: 'assistant',
        text: "📦 Media compression complete! Recompressed older media blocks using high-efficiency WebP/H.265. Recovered 432 MB without visible quality loss."
      }]);
    }
  };

  // Helper: AI chatbot submission handler
  const handleSendAiMessage = () => {
    if (!aiInput.trim()) return;
    const userMsg = { id: `user-${Date.now()}`, sender: 'user', text: aiInput, timestamp: 'Just now' };
    setAiAssistantMessages(prev => [...prev, userMsg]);
    const currentInput = aiInput;
    setAiInput('');

    setTimeout(() => {
      let replyText = "I've analyzed Nexora's active memory pages. Your device pipeline is operating smoothly at 60 FPS.";
      const query = currentInput.toLowerCase();
      
      if (query.includes('battery') || query.includes('power') || query.includes('drain')) {
        replyText = "🔋 Power Management: Nexora is currently running at normal frequency. Activating 'Battery Saver Mode' will throttle non-critical database sync cycles and pause floating canvas particles, reducing battery consumption by 35%.";
      } else if (query.includes('cache') || query.includes('clean') || query.includes('purge')) {
        replyText = "🧹 Cache Engine Scan: Found 12 MB of stale thumbnail assets. Click the 'Rebuild' button next to the Tiny Blur Thumbnails cache block to reclaim memory leakage.";
      } else if (query.includes('slow') || query.includes('lag') || query.includes('speed')) {
        replyText = "⚡ Telemetry Audit: Low-end devices are fully protected via virtual list rendering (reducing active DOM nodes to only 15 components for 1.25M rows) and asset lazy-loading. Make sure 'Intelligent Lazy Loading' is checked.";
      } else if (query.includes('database') || query.includes('db') || query.includes('indexing')) {
        replyText = "🗄️ Database Optimizations: All tables are properly keyed. Running 'Background Indexing' in the Database Integrity panel will speed up keyword searches on historical channels.";
      } else if (query.includes('offline') || query.includes('sync') || query.includes('queue')) {
        replyText = "📡 Offline Synchronization: Nexora maintains a local FIFO offline queue. Once connectivity resumes, delta sync packets are batch-processed under conflict resolution rules.";
      }

      setAiAssistantMessages(prev => [...prev, {
        id: `reply-${Date.now()}`,
        sender: 'assistant',
        text: replyText,
        timestamp: 'Just now'
      }]);
    }, 1000);
  };

  // Backup restoration records
  const availableBackupsList = [
    { id: 'bak-1', deviceName: 'Nexora Core Node Alpha', date: 'Jul 09, 2026 04:00', size: '2.4 GB', includeItems: 'Messages, Media, Settings', secure: true },
    { id: 'bak-2', deviceName: 'Nexora Mobile Client (iOS)', date: 'Jul 02, 2026 12:15', size: '1.1 GB', includeItems: 'Messages, Bookmarks, AI Memory', secure: true },
    { id: 'bak-3', deviceName: 'London Ledger Hub NAS', date: 'Jun 28, 2026 23:59', size: '14.8 GB', includeItems: 'All Media, Broadcast Archives, Settings', secure: true }
  ];

  // Conversation storage list
  const [conversationsList, setConversationsList] = useState<MockConversationStorage[]>([
    {
      id: 'chat-1',
      name: 'Sophia Sterling',
      username: '@sophia_sterling',
      avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
      totalSize: '1.24 GB',
      sizeBytes: 1240000000,
      breakdown: { photos: '210 MB', videos: '840 MB', voiceNotes: '92 MB', gifs: '25 MB', stickers: '14 MB', documents: '54 MB', links: '4 MB', messages: '1 MB' },
      mediaItems: [
        { id: 'm-1-1', type: 'photo', url: 'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=300', name: 'Security_Flowchart.png', size: '4.2 MB', date: 'Jul 09, 2026', isFavorite: true, isPinned: true },
        { id: 'm-1-2', type: 'video', url: 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=300', name: 'Nexora_Launch_Video.mp4', size: '112.5 MB', date: 'Jul 08, 2026', isFavorite: true },
        { id: 'm-1-3', type: 'voice', url: '', name: 'Encrypted_Voice_Note_09.ogg', size: '1.8 MB', date: 'Jul 07, 2026' },
        { id: 'm-1-4', type: 'document', url: '', name: 'Whitepaper_Draft_v4.pdf', size: '18.4 MB', date: 'Jul 05, 2026', isPinned: true },
        { id: 'm-1-5', type: 'gif', url: 'https://media.giphy.com/media/t3ki06DCH9fQA/giphy.gif', name: ' celebratory_wave.gif', size: '3.4 MB', date: 'Jul 03, 2026' },
        { id: 'm-1-6', type: 'photo', url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=300', name: 'NFT_Banner_Art.jpg', size: '8.9 MB', date: 'Jul 01, 2026' }
      ]
    },
    {
      id: 'chat-2',
      name: 'Lucas Cyber',
      username: '@lucas_cyber',
      avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150',
      totalSize: '654 MB',
      sizeBytes: 654000000,
      breakdown: { photos: '120 MB', videos: '390 MB', voiceNotes: '42 MB', gifs: '12 MB', stickers: '6 MB', documents: '82 MB', links: '1.5 MB', messages: '0.5 MB' },
      mediaItems: [
        { id: 'm-2-1', type: 'video', url: '', name: 'Database_Sync_Screencast.mp4', size: '78.2 MB', date: 'Jul 08, 2026' },
        { id: 'm-2-2', type: 'photo', url: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=300', name: 'Terminal_Theme_Preview.jpg', size: '1.2 MB', date: 'Jul 07, 2026', isFavorite: true },
        { id: 'm-2-3', type: 'document', url: '', name: 'Drizzle_Schema_Draft.ts', size: '24 KB', date: 'Jul 06, 2026', isPinned: true },
        { id: 'm-2-4', type: 'voice', url: '', name: 'Voice_Briefing_July.ogg', size: '14.5 MB', date: 'Jul 04, 2026' }
      ]
    },
    {
      id: 'chat-3',
      name: 'Luna Stellar',
      username: '@luna_stellar',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
      totalSize: '412 MB',
      sizeBytes: 412000000,
      breakdown: { photos: '185 MB', videos: '120 MB', voiceNotes: '31 MB', gifs: '18 MB', stickers: '8 MB', documents: '48 MB', links: '1 MB', messages: '1 MB' },
      mediaItems: [
        { id: 'm-3-1', type: 'photo', url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=300', name: 'Ambient_Background_Mockup.jpg', size: '12.4 MB', date: 'Jul 09, 2026', isFavorite: true },
        { id: 'm-3-2', type: 'document', url: '', name: 'Interface_Style_Tokens.json', size: '145 KB', date: 'Jul 08, 2026', isPinned: true },
        { id: 'm-3-3', type: 'gif', url: '', name: 'smooth_loading_spinner.gif', size: '1.2 MB', date: 'Jul 05, 2026' }
      ]
    },
    {
      id: 'chat-4',
      name: 'Global Dev Community',
      username: 'group-main',
      avatar: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=150',
      totalSize: '2.84 GB',
      sizeBytes: 2840000000,
      breakdown: { photos: '812 MB', videos: '1.45 GB', voiceNotes: '142 MB', gifs: '95 MB', stickers: '34 MB', documents: '310 MB', links: '12 MB', messages: '5 MB' },
      mediaItems: [
        { id: 'm-4-1', type: 'video', url: '', name: 'Build_Process_Recording.mov', size: '345.0 MB', date: 'Jul 09, 2026' },
        { id: 'm-4-2', type: 'photo', url: 'https://images.unsplash.com/photo-1531297484001-80022131f5a1?w=300', name: 'Workstation_Photo.png', size: '6.4 MB', date: 'Jul 08, 2026' },
        { id: 'm-4-3', type: 'document', url: '', name: 'Docker-Compose.yml', size: '12 KB', date: 'Jul 07, 2026', isPinned: true },
        { id: 'm-4-4', type: 'document', url: '', name: 'Kubernetes_Configuration.yaml', size: '84 KB', date: 'Jul 06, 2026' }
      ]
    }
  ]);

  // Sync back state modifications to local storages
  useEffect(() => {
    localStorage.setItem('nx_storage_cache', JSON.stringify(cacheLevels));
  }, [cacheLevels]);

  useEffect(() => {
    localStorage.setItem('nx_storage_downloads', JSON.stringify(downloads));
  }, [downloads]);

  useEffect(() => {
    localStorage.setItem('nx_storage_backups', JSON.stringify(backups));
  }, [backups]);

  // AI-Assisted Scan Recommendations State
  const [recommendations, setRecommendations] = useState([
    { id: 'rec-1', title: 'Duplicate Assets Detected', desc: '4 copies of the Nexora whitepaper draft and 2 identical high-res banners.', size: '412 MB', risk: 'Safe to Delete', itemsCount: 6, type: 'duplicate' },
    { id: 'rec-2', title: 'Large Videos (Older than 30 Days)', desc: 'Large raw videos, screen recordings and test assets not viewed recently.', size: '1.42 GB', risk: 'Medium Risk (Media archived)', itemsCount: 3, type: 'large_files' },
    { id: 'rec-3', title: 'Old/Expired Temporary Files', desc: 'Unused client update segments, cached sticker sets, and old audio buffers.', size: '680 MB', risk: 'Safe to Delete', itemsCount: 140, type: 'temp' },
    { id: 'rec-4', title: 'Forwarded Video Spams', desc: 'Media files forwarded multiple times across community channels.', size: '350 MB', risk: 'Review Before Deleting', itemsCount: 18, type: 'forwarded' }
  ]);

  // Calculations for total Nexora Storage
  const totalMediaBytes = useMemo(() => {
    return conversationsList.reduce((acc, chat) => acc + chat.sizeBytes, 0);
  }, [conversationsList]);

  const totalNexoraSpaceGB = useMemo(() => {
    const mediaGB = totalMediaBytes / 1000000000;
    const cacheGB = Number(totalCacheMB) / 1000;
    const dbSizeGB = 0.25; // Constant base db size
    return (mediaGB + cacheGB + dbSizeGB).toFixed(2);
  }, [totalMediaBytes, totalCacheMB]);

  // Handle single recommendation cleanup
  const handleCleanupRecommendation = (id: string, size: string) => {
    setRecommendations(prev => prev.filter(r => r.id !== id));
    window.dispatchEvent(new CustomEvent('toast', { 
      detail: `✨ Cleaned recommendation! Safely recovered ${size} of device storage.` 
    }));
  };

  // One-tap total recovery trigger
  const handleOneTapCleanup = () => {
    setRecommendations([]);
    window.dispatchEvent(new CustomEvent('toast', { 
      detail: `🚀 Intelligent Cleanup: Cleared duplicates & temp files. Safely recovered 2.84 GB!` 
    }));
  };

  // Handle caching clears
  const handleClearSpecificCache = (key: keyof typeof cacheLevels, name: string) => {
    setCacheLevels((prev: any) => ({ ...prev, [key]: 0 }));
    window.dispatchEvent(new CustomEvent('toast', { 
      detail: `🧹 Cleared Nexora ${name}. Reclaimed ${cacheLevels[key]} MB.` 
    }));
  };

  // Clear all cache
  const handleClearAllCache = () => {
    setCacheLevels({
      image: 0, video: 0, thumbnail: 0, sticker: 0, gif: 0, emoji: 0, search: 0, ai: 0, temporary: 0, database: 0
    });
    window.dispatchEvent(new CustomEvent('toast', { 
      detail: "✨ All Nexora temporary asset cache tables cleared successfully!" 
    }));
  };

  // Toggle download parameters
  const toggleDownloadOption = (network: 'mobile' | 'wifi' | 'roaming', media: string, value: string) => {
    setDownloads((prev: any) => ({
      ...prev,
      [network]: {
        ...prev[network],
        [media]: value
      }
    }));
  };

  // Sort and filter Conversation lists
  const filteredConversations = useMemo(() => {
    return conversationsList
      .filter(chat => 
        chat.name.toLowerCase().includes(panelSearchQuery.toLowerCase()) || 
        chat.username.toLowerCase().includes(panelSearchQuery.toLowerCase())
      )
      .sort((a, b) => b.sizeBytes - a.sizeBytes);
  }, [conversationsList, panelSearchQuery]);

  // Selected chat filtered media explorer
  const explorerFilteredMedia = useMemo(() => {
    if (!selectedChatForMedia) return [];
    return selectedChatForMedia.mediaItems.filter(item => {
      if (mediaFilterTab === 'all') return true;
      return item.type === mediaFilterTab;
    });
  }, [selectedChatForMedia, mediaFilterTab]);

  // Multi-select actions in Media Explorer
  const handleToggleSelectMedia = (id: string) => {
    setSelectedMediaItemIds(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleSelectAllMedia = () => {
    if (!selectedChatForMedia) return;
    const allIds = explorerFilteredMedia.map(m => m.id);
    setSelectedMediaItemIds(prev => prev.length === allIds.length ? [] : allIds);
  };

  const handleDeleteSelectedMedia = () => {
    if (!selectedChatForMedia) return;
    const remainingItems = selectedChatForMedia.mediaItems.filter(
      item => !selectedMediaItemIds.includes(item.id)
    );
    
    // Recalculate chat size
    const deletedCount = selectedMediaItemIds.length;
    
    setConversationsList(prev => prev.map(chat => {
      if (chat.id === selectedChatForMedia.id) {
        return {
          ...chat,
          mediaItems: remainingItems,
          totalSize: remainingItems.length > 0 ? `${(remainingItems.length * 12.4).toFixed(1)} MB` : '0.0 B',
          sizeBytes: remainingItems.length * 12400000
        };
      }
      return chat;
    }));

    // Update active view details
    setSelectedChatForMedia(prev => prev ? {
      ...prev,
      mediaItems: remainingItems,
      totalSize: remainingItems.length > 0 ? `${(remainingItems.length * 12.4).toFixed(1)} MB` : '0.0 B',
      sizeBytes: remainingItems.length * 12400000
    } : null);

    setSelectedMediaItemIds([]);
    window.dispatchEvent(new CustomEvent('toast', { 
      detail: `🗑️ Deleted ${deletedCount} media files from chat storage.` 
    }));
  };

  // Archive selected
  const handleArchiveSelectedMedia = () => {
    window.dispatchEvent(new CustomEvent('toast', { 
      detail: `📦 Archived ${selectedMediaItemIds.length} media items onto encrypted private cloud.` 
    }));
    setSelectedMediaItemIds([]);
  };

  // Clean conversation completely with granular option modes
  const handleClearConversationDetailed = (chatId: string, mode: 'all' | 'media' | 'docs' | 'messages') => {
    setConversationsList(prev => prev.map(chat => {
      if (chat.id === chatId) {
        if (mode === 'all') {
          return { ...chat, totalSize: '0.0 B', sizeBytes: 0, mediaItems: [] };
        } else if (mode === 'media') {
          const remaining = chat.mediaItems.filter(m => m.type !== 'photo' && m.type !== 'video' && m.type !== 'gif');
          return { ...chat, mediaItems: remaining, totalSize: `${(remaining.length * 5).toFixed(1)} MB`, sizeBytes: remaining.length * 5000000 };
        } else if (mode === 'docs') {
          const remaining = chat.mediaItems.filter(m => m.type !== 'document');
          return { ...chat, mediaItems: remaining, totalSize: `${(remaining.length * 10).toFixed(1)} MB`, sizeBytes: remaining.length * 10000000 };
        }
      }
      return chat;
    }));
    window.dispatchEvent(new CustomEvent('toast', { 
      detail: `🧹 Conversation storage cleaned (Mode: ${mode})` 
    }));
  };

  // Device Optimization execution
  const runDeviceOptimization = () => {
    setIsOptimizing(true);
    setTimeout(() => {
      setIsOptimizing(false);
      setOptimizationScore(99);
      setSystemMetrics(prev => ({
        ...prev,
        cpu: 8,
        memory: 24,
        tasksCount: 2,
        integrityVerified: true
      }));
      window.dispatchEvent(new CustomEvent('toast', { 
        detail: "⚡ Nexora Engine Calibrated! Battery draw reduced and file structures defragmented." 
      }));
    }, 2000);
  };

  // Backup simulation execution
  const triggerManualBackup = () => {
    window.dispatchEvent(new CustomEvent('toast', { 
      detail: "🔐 Packing encrypted transaction history logs..." 
    }));
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent('toast', { 
        detail: "🚀 Dispatched backup block to Google Drive & local nodes." 
      }));
    }, 1500);
  };

  // Restore simulation execution
  const triggerBackupRestore = (id: string) => {
    setIsRestoring(true);
    setSelectedRestoreBackupId(id);
    setTimeout(() => {
      setIsRestoring(false);
      setSelectedRestoreBackupId(null);
      window.dispatchEvent(new CustomEvent('toast', { 
        detail: "✨ Recovery Succeeded: All messages and media verified & restored!" 
      }));
    }, 2000);
  };

  // Reset Statistics
  const resetNetworkStats = () => {
    const today = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    setNetworkResetTime(today);
    window.dispatchEvent(new CustomEvent('toast', { 
      detail: "📊 Network database counters reset to zero." 
    }));
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/85 backdrop-blur-md overflow-hidden">
        <motion.div
          initial={{ opacity: 0, scale: 0.97, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.97, y: 20 }}
          className="w-full max-w-6xl h-[88vh] bg-[#05030f] border border-white/10 rounded-3xl text-white shadow-md relative flex flex-col overflow-hidden"
        >
          {/* Header Bar */}
          <div className="p-5 border-b border-white/5 flex items-center justify-between bg-black/40">
            <div className="flex items-center gap-3 text-left">
              <div className="w-10 h-10 rounded-xl bg-violet-600/10 border border-white/10 flex items-center justify-center">
                <HardDrive className="w-5 h-5 text-violet-400" />
              </div>
              <div>
                <h3 className="text-sm font-black font-sans uppercase tracking-wider text-white">Storage & Data Management Center</h3>
                <p className="text-[10px] font-mono text-cyan-400 leading-none mt-0.5">Automated Asset Optimization & Bandwidth Control</p>
              </div>
            </div>

            {/* Quick Filter Search inside modal */}
            {activeTab === 'conversations' && !selectedChatForMedia && (
              <div className="hidden md:flex items-center gap-2 max-w-xs flex-1 px-3 py-1.5 bg-slate-950/80 border border-white/5 rounded-xl">
                <Search className="w-3.5 h-3.5 text-zinc-400" />
                <input 
                  type="text" 
                  placeholder="Search chats by username..." 
                  value={panelSearchQuery}
                  onChange={(e) => setPanelSearchQuery(e.target.value)}
                  className="w-full bg-transparent text-xs text-zinc-200 outline-none placeholder-zinc-500"
                />
                {panelSearchQuery && (
                  <button onClick={() => setPanelSearchQuery('')} className="text-zinc-500 hover:text-white text-[10px]">Clear</button>
                )}
              </div>
            )}

            <button 
              onClick={onClose}
              className="p-1.5 hover:bg-white/5 border border-white/10 rounded-xl text-zinc-400 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Modal Grid Body */}
          <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
            
            {/* Left Sidebar Tab selectors */}
            <div className="w-full md:w-64 border-r border-white/5 bg-black/20 overflow-y-auto p-3 space-y-1 shrink-0">
              {[
                { id: 'dashboard', label: 'Storage Dashboard', icon: HardDrive, badge: `${totalNexoraSpaceGB} GB` },
                { id: 'analyzer', label: 'AI Storage Scanner', icon: Sparkles, badge: recommendations.length > 0 ? `${recommendations.length} items` : '' },
                { id: 'conversations', label: 'Conversations Ledger', icon: Database, count: conversationsList.length },
                { id: 'downloads', label: 'Auto-Download Control', icon: Download, badge: downloads.adaptiveDataSaver ? 'Saver On' : '' },
                { id: 'backups', label: 'Encrypted Backups', icon: ShieldCheck },
                { id: 'network', label: 'Network & Bandwidth', icon: BarChart2 },
                { id: 'optimization', label: 'Performance Center ⚡', icon: Cpu, badge: `${optimizationScore}%` }
              ].map(tab => {
                const Icon = tab.icon;
                const isSelected = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => {
                      setActiveTab(tab.id as any);
                      setSelectedChatForMedia(null); // Clear active chat media view
                    }}
                    className={`w-full p-2.5 rounded-xl flex items-center justify-between text-left transition-all text-xs cursor-pointer ${
                      isSelected 
                        ? 'bg-violet-600/15 border border-white/10 text-violet-200 font-bold' 
                        : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/5 border border-transparent'
                    }`}
                  >
                    <span className="flex items-center gap-2.5 min-w-0">
                      <Icon className={`w-4 h-4 shrink-0 ${isSelected ? 'text-violet-400' : 'text-zinc-500'}`} />
                      <span className="truncate">{tab.label}</span>
                    </span>
                    {tab.count !== undefined && (
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-md bg-zinc-900 border border-white/5 text-zinc-500">{tab.count}</span>
                    )}
                    {tab.badge && (
                      <span className={`text-[8px] font-mono font-black uppercase px-1.5 py-0.5 rounded ${
                        tab.badge.includes('GB') ? 'bg-zinc-800 text-zinc-300' : (tab.badge.includes('items') ? 'bg-amber-500/20 text-amber-300' : 'bg-emerald-500/20 text-emerald-400 animate-pulse')
                      }`}>{tab.badge}</span>
                    )}
                  </button>
                );
              })}

              {/* Master Data Saver Toggle inside left menu */}
              <div className="pt-4 mt-4 border-t border-white/5 px-2">
                <div className="p-3 bg-zinc-950/80 border border-white/5 rounded-2xl">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-zinc-300 flex items-center gap-1">
                      <Zap className="w-3.5 h-3.5 text-amber-400" /> Adaptive Data Saver
                    </span>
                    <button
                      onClick={() => {
                        setDownloads((prev: any) => ({ ...prev, adaptiveDataSaver: !prev.adaptiveDataSaver }));
                        window.dispatchEvent(new CustomEvent('toast', { 
                          detail: !downloads.adaptiveDataSaver ? "📶 Data Saver Active: High-res images & video preload delayed." : "📶 Standard Data Routing Active" 
                        }));
                      }}
                      className={`w-8 h-4 rounded-full p-0.5 transition-all flex items-center cursor-pointer ${
                        downloads.adaptiveDataSaver ? 'bg-amber-400 justify-end' : 'bg-zinc-800 justify-start'
                      }`}
                    >
                      <span className="w-3 h-3 bg-black rounded-full" />
                    </button>
                  </div>
                  <p className="text-[9px] text-zinc-500 mt-1.5 leading-tight">Delays downloads, preloads, and reduces quality dynamically to prevent excessive data plan usage.</p>
                </div>
              </div>
            </div>

            {/* Right Pane Area */}
            <div className="flex-1 flex flex-col bg-[#03010b] overflow-y-auto p-6 relative">
              
              {/* DASHBOARD TAB */}
              {activeTab === 'dashboard' && (
                <div className="space-y-6 text-left">
                  {/* Top quick stats cards */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    
                    {/* Ring indicator block */}
                    <div className="p-4 bg-slate-950/70 border border-white/5 rounded-2xl flex items-center gap-4">
                      {/* Animated circular meter */}
                      <div className="relative w-16 h-16 flex items-center justify-center shrink-0">
                        <svg className="w-full h-full transform -rotate-90">
                          <circle cx="32" cy="32" r="28" fill="transparent" stroke="rgba(255,255,255,0.05)" strokeWidth="6" />
                          <circle cx="32" cy="32" r="28" fill="transparent" stroke="url(#violetGradient)" strokeWidth="6" strokeDasharray={175} strokeDashoffset={175 - (175 * (Number(totalNexoraSpaceGB) / 10))} className="transition-all duration-1000" />
                          <defs>
                            <linearGradient id="violetGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                              <stop offset="0%" stopColor="#8b5cf6" />
                              <stop offset="100%" stopColor="#ec4899" />
                            </linearGradient>
                          </defs>
                        </svg>
                        <div className="absolute text-center">
                          <span className="text-[10px] font-mono text-zinc-500 block leading-none">Usage</span>
                          <span className="text-xs font-black text-white">{totalNexoraSpaceGB}G</span>
                        </div>
                      </div>
                      <div>
                        <h4 className="text-xs font-black text-zinc-400 uppercase tracking-wider font-mono">Nexora Size</h4>
                        <p className="text-lg font-black text-white mt-1">{totalNexoraSpaceGB} GB</p>
                        <span className="text-[9px] font-mono text-emerald-400">Total verified on-device blockchain cache</span>
                      </div>
                    </div>

                    <div className="p-4 bg-slate-950/70 border border-white/5 rounded-2xl">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black text-zinc-400 uppercase font-mono">System Cache</span>
                        <span title="Clear cache log" className="cursor-pointer text-zinc-500 hover:text-white" onClick={handleClearAllCache}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </span>
                      </div>
                      <p className="text-lg font-black text-white mt-2">{totalCacheMB} MB</p>
                      <div className="w-full bg-white/5 h-1.5 rounded-full mt-2 overflow-hidden">
                        <div className="bg-pink-500 h-full rounded-full" style={{ width: `${Math.min(100, (Number(totalCacheMB)/1000)*100)}%` }} />
                      </div>
                      <span className="text-[9px] text-zinc-500 mt-1.5 block leading-none">Temporary imagery, database journals and indices.</span>
                    </div>

                    <div className="p-4 bg-slate-950/70 border border-white/5 rounded-2xl">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black text-zinc-400 uppercase font-mono">Cloud Backup Sync</span>
                        <span className="text-[8px] font-mono uppercase px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-bold">Encrypted</span>
                      </div>
                      <p className="text-lg font-black text-white mt-2">2.4 GB</p>
                      <p className="text-[9px] text-zinc-500 mt-1 leading-normal">Last synchronized: <b className="text-zinc-300">Today at 04:00 AM</b></p>
                      <button onClick={triggerManualBackup} className="text-[9px] text-violet-400 hover:underline hover:text-violet-300 font-mono flex items-center gap-1 mt-2 cursor-pointer">
                        <RefreshCw className="w-2.5 h-2.5 animate-spin" /> Sync Cloud Ledger Now
                      </button>
                    </div>

                  </div>

                  {/* Complete categorized breakdown progress strip */}
                  <div className="p-5 bg-slate-950/60 border border-white/5 rounded-2xl space-y-4">
                    <div>
                      <h4 className="text-xs font-black text-zinc-300 uppercase tracking-wider font-mono">Ledger Category Breakdown</h4>
                      <p className="text-[10px] text-zinc-500 mt-0.5">Understand how different media formats and data packets occupy space on your system partition.</p>
                    </div>

                    {/* Integrated visual progressive bar */}
                    <div className="w-full bg-white/5 h-4 rounded-lg flex overflow-hidden">
                      <div className="bg-violet-600 h-full" style={{ width: '45%' }} title="Videos (45%)" />
                      <div className="bg-pink-500 h-full" style={{ width: '22%' }} title="Images (22%)" />
                      <div className="bg-amber-500 h-full" style={{ width: '12%' }} title="Voice Notes (12%)" />
                      <div className="bg-emerald-500 h-full" style={{ width: '10%' }} title="Documents (10%)" />
                      <div className="bg-cyan-500 h-full" style={{ width: '6%' }} title="Database / Temp (6%)" />
                      <div className="bg-indigo-500 h-full" style={{ width: '5%' }} title="Gifs / Stickers (5%)" />
                    </div>

                    {/* Legend keys */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                      {[
                        { label: 'Videos', color: 'bg-violet-600', size: '1.45 GB', percent: '45%' },
                        { label: 'Images', color: 'bg-pink-500', size: '515 MB', percent: '22%' },
                        { label: 'Voice Notes', color: 'bg-amber-500', size: '165 MB', percent: '12%' },
                        { label: 'Documents', color: 'bg-emerald-500', size: '184 MB', percent: '10%' },
                        { label: 'Database & DB Cache', color: 'bg-cyan-500', size: '265 MB', percent: '6%' },
                        { label: 'Gifs / Stickers', color: 'bg-indigo-500', size: '94 MB', percent: '5%' }
                      ].map(leg => (
                        <div key={leg.label} className="p-2.5 bg-black/40 border border-white/5 rounded-xl space-y-1">
                          <div className="flex items-center gap-1.5">
                            <span className={`w-2 h-2 rounded-full ${leg.color}`} />
                            <span className="text-[10px] text-zinc-400 font-bold truncate">{leg.label}</span>
                          </div>
                          <div className="flex justify-between text-[9px] font-mono leading-none pt-0.5">
                            <span className="text-white font-bold">{leg.size}</span>
                            <span className="text-zinc-600">{leg.percent}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Cache Manager segment */}
                  <div className="p-5 bg-slate-950/60 border border-white/5 rounded-2xl space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-xs font-black text-zinc-300 uppercase tracking-wider font-mono">Asset Cache Controller</h4>
                        <p className="text-[10px] text-zinc-500 mt-0.5">Asset cache speeds up message retrieval and avatars but is entirely safe to clear anytime.</p>
                      </div>
                      <button 
                        onClick={handleClearAllCache}
                        className="px-3 py-1 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 rounded-lg text-[10px] font-mono cursor-pointer"
                      >
                        Clear All Temporary Asset Tables
                      </button>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                      {[
                        { key: 'image', label: 'Images Cache', size: `${cacheLevels.image} MB`, effect: 'Avatars and profile photos will re-download as you scroll.' },
                        { key: 'video', label: 'Videos Cache', size: `${cacheLevels.video} MB`, effect: 'Cached video file segments will be cleared from memory.' },
                        { key: 'thumbnail', label: 'Thumbnails', size: `${cacheLevels.thumbnail} MB`, effect: 'Small chat and status preview images will be regenerated.' },
                        { key: 'sticker', label: 'Sticker Cache', size: `${cacheLevels.sticker} MB`, effect: 'Animated and custom stickers will load from files.' },
                        { key: 'gif', label: 'GIF Indices', size: `${cacheLevels.gif} MB`, effect: 'Clears preview GIFs and trending results cache.' },
                        { key: 'emoji', label: 'Emoji Cache', size: `${cacheLevels.emoji} MB`, effect: 'Clears recent search and usage frequency indicators.' },
                        { key: 'search', label: 'Search Index', size: `${cacheLevels.search} MB`, effect: 'Rebuilds database search catalog when query runs.' },
                        { key: 'ai', label: 'AI Memory Cache', size: `${cacheLevels.ai} MB`, effect: 'Temporary workspace arrays for Nida & VOH AI assistant agents.' },
                        { key: 'temporary', label: 'Temp Exports', size: `${cacheLevels.temporary} MB`, effect: 'Unsent media drafts and temporary voice records deleted.' },
                        { key: 'database', label: 'Database Cache', size: `${cacheLevels.database} MB`, effect: 'Clears local journals. Message index remains fully preserved.' }
                      ].map(cache => (
                        <div key={cache.key} className="p-3 bg-black/40 border border-white/5 rounded-xl flex flex-col justify-between text-left space-y-2 group">
                          <div>
                            <span className="text-[10px] font-bold text-zinc-300 block">{cache.label}</span>
                            <span className="text-[11px] font-mono font-black text-pink-400 mt-0.5 block">{cache.size}</span>
                          </div>
                          
                          {/* Cache descriptive details popup */}
                          <div className="text-[8px] text-zinc-600 line-clamp-2 leading-tight group-hover:text-zinc-400 transition-colors">
                            {cache.effect}
                          </div>

                          <button
                            onClick={() => handleClearSpecificCache(cache.key as any, cache.label)}
                            className="w-full py-1 text-[8px] font-mono bg-zinc-900 border border-white/10 rounded-md text-zinc-400 hover:text-white hover:bg-zinc-800 cursor-pointer"
                          >
                            Flush Table
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* AI STORAGE SCANNER TAB */}
              {activeTab === 'analyzer' && (
                <div className="space-y-6 text-left">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-bold text-white flex items-center gap-2">
                        <VohIcon size={16} animated variant="brand" /> AI-Powered Storage Analyzer & Optimizer
                      </h4>
                      <p className="text-[11px] text-zinc-400 mt-1">Smart algorithms index your node database to identify heavy, duplicate, or stale media blocks safely.</p>
                    </div>

                    {recommendations.length > 0 && (
                      <button 
                        onClick={handleOneTapCleanup}
                        className="px-4 py-2 bg-violet-600 hover:bg-violet-500 font-bold text-white text-xs rounded-xl flex items-center gap-1.5 transition-all shadow-md cursor-pointer"
                      >
                        <Zap className="w-3.5 h-3.5" /> One-Tap Safe Optimization (Reclaim 2.84 GB)
                      </button>
                    )}
                  </div>

                  {/* Recommendation list cards */}
                  {recommendations.length === 0 ? (
                    <div className="p-8 text-center bg-emerald-500/5 border border-emerald-500/20 rounded-2xl space-y-3">
                      <div className="w-12 h-12 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center mx-auto">
                        <Check className="w-6 h-6 animate-pulse" />
                      </div>
                      <h4 className="text-sm font-black text-emerald-400 uppercase tracking-widest">Storage Calibrated & Optimized</h4>
                      <p className="text-xs text-zinc-400 max-w-md mx-auto leading-relaxed">No duplicate files, broken buffers or stale media detected. Your Nexora storage is running at absolute peak efficiency parameters.</p>
                      <button onClick={() => setRecommendations([
                        { id: 'rec-1', title: 'Duplicate Assets Detected', desc: '4 copies of the Nexora whitepaper draft and 2 identical high-res banners.', size: '412 MB', risk: 'Safe to Delete', itemsCount: 6, type: 'duplicate' },
                        { id: 'rec-2', title: 'Large Videos (Older than 30 Days)', desc: 'Large raw videos, screen recordings and test assets not viewed recently.', size: '1.42 GB', risk: 'Medium Risk (Media archived)', itemsCount: 3, type: 'large_files' }
                      ])} className="text-xs text-violet-400 underline font-mono cursor-pointer">Simulate Scanner Refresh</button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {recommendations.map(rec => (
                        <div key={rec.id} className="p-4 bg-slate-950/70 border border-white/5 rounded-2xl flex flex-col justify-between space-y-4">
                          <div className="space-y-1.5">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-black text-white font-mono flex items-center gap-1.5">
                                <Sparkles className="w-3.5 h-3.5 text-violet-400" /> {rec.title}
                              </span>
                              <span className="text-xs font-bold text-pink-400 font-mono">{rec.size}</span>
                            </div>
                            <p className="text-[11px] text-zinc-400 leading-normal">{rec.desc}</p>
                            <div className="flex items-center gap-2 pt-1 text-[9px] font-mono">
                              <span className="px-2 py-0.5 rounded bg-zinc-900 border border-white/5 text-zinc-500">{rec.itemsCount} elements detected</span>
                              <span className={`px-2 py-0.5 rounded ${
                                rec.risk === 'Safe to Delete' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                              }`}>{rec.risk}</span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <button 
                              onClick={() => handleCleanupRecommendation(rec.id, rec.size)}
                              className="flex-1 py-2 bg-rose-600/25 hover:bg-rose-500/35 border border-rose-500/20 rounded-xl text-rose-300 text-[10px] font-mono font-black uppercase tracking-wider transition-colors cursor-pointer"
                            >
                              Safely Delete elements
                            </button>
                            <button 
                              onClick={() => {
                                window.dispatchEvent(new CustomEvent('toast', { detail: '📦 Backup Dispatcher: Archiving items before purging.' }));
                                handleCleanupRecommendation(rec.id, rec.size);
                              }}
                              className="px-3 py-2 bg-[#121029] border border-white/10 hover:bg-zinc-800 rounded-xl text-[10px] font-mono text-zinc-400 cursor-pointer"
                              title="Archive files to Private Server before purging"
                            >
                              Archive & Purge
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Instant Smart Cleanup Suggestion Boxes */}
                  <div className="p-5 bg-slate-950/60 border border-white/5 rounded-2xl space-y-4">
                    <div>
                      <h4 className="text-xs font-black text-zinc-300 uppercase tracking-wider font-mono">Granular Purge Templates</h4>
                      <p className="text-[10px] text-zinc-500 mt-0.5">Quickly clear isolated elements based on storage size profiles.</p>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {[
                        { title: 'Files larger than 100 MB', items: '8 items', saved: '1.14 GB', risk: 'Medium Risk' },
                        { title: 'Duplicate Images', items: '24 items', saved: '42 MB', risk: 'Safe' },
                        { title: 'Old Voice Notes (>6 mos)', items: '150 voice blocks', saved: '110 MB', risk: 'Safe' },
                        { title: 'Viewed video downloads', items: '12 items', saved: '450 MB', risk: 'Safe' }
                      ].map((item, idx) => (
                        <div key={idx} className="p-3 bg-black/40 border border-white/5 rounded-xl flex flex-col justify-between text-left space-y-3">
                          <div>
                            <span className="text-[10.5px] font-bold text-zinc-300 block leading-tight">{item.title}</span>
                            <div className="flex justify-between items-center mt-1 text-[9px] font-mono">
                              <span className="text-zinc-500">{item.items}</span>
                              <span className="text-pink-400 font-bold">{item.saved} Saved</span>
                            </div>
                          </div>
                          <button 
                            onClick={() => {
                              window.dispatchEvent(new CustomEvent('toast', { detail: `🧹 Quick Purge active: Safely recovered ${item.saved}!` }));
                            }}
                            className="w-full py-1.5 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/25 rounded-lg text-[9px] text-rose-400 font-mono cursor-pointer"
                          >
                            Instant Purge
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* CONVERSATIONS LEDGER & MEDIA EXPLORER */}
              {activeTab === 'conversations' && (
                <div className="space-y-6 text-left">
                  
                  {!selectedChatForMedia ? (
                    <>
                      <div>
                        <h4 className="text-sm font-bold text-white flex items-center gap-2">
                          <Database className="w-4 h-4 text-violet-400" /> Conversation Storage Ledger
                        </h4>
                        <p className="text-[11px] text-zinc-400 mt-1">List of chat communication bridges sorted by absolute disk storage allocation. Click any conversation card to open the complete media browser.</p>
                      </div>

                      {/* Conversations listing */}
                      <div className="space-y-3">
                        {filteredConversations.map(chat => (
                          <div key={chat.id} className="p-4 bg-slate-950/70 border border-white/5 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 hover:border-white/10 transition-all">
                            
                            {/* Avatar / details */}
                            <div className="flex items-center gap-3">
                              <img src={chat.avatar} alt={chat.name} className="w-10 h-10 rounded-xl object-cover border border-white/10 shrink-0" />
                              <div>
                                <h5 className="text-xs font-bold text-white flex items-center gap-1.5">
                                  {chat.name}
                                  {chat.username === 'group-main' && <span className="text-[8px] font-mono px-1 bg-zinc-900 border border-white/5 text-zinc-400">GROUP</span>}
                                </h5>
                                <p className="text-[10px] font-mono text-zinc-500 mt-0.5">{chat.username === 'group-main' ? 'main_dev_community_bridge' : chat.username}</p>
                              </div>
                            </div>

                            {/* Breakdown summary metrics */}
                            <div className="grid grid-cols-4 sm:grid-cols-8 gap-2 bg-black/40 p-2 rounded-xl border border-white/5 text-center">
                              <div className="px-1"><span className="text-[8px] font-mono uppercase text-zinc-500 block">Photo</span><span className="text-[9.5px] text-white font-mono">{chat.breakdown.photos}</span></div>
                              <div className="px-1"><span className="text-[8px] font-mono uppercase text-zinc-500 block">Video</span><span className="text-[9.5px] text-white font-mono">{chat.breakdown.videos}</span></div>
                              <div className="px-1"><span className="text-[8px] font-mono uppercase text-zinc-500 block">Audio</span><span className="text-[9.5px] text-white font-mono">{chat.breakdown.voiceNotes}</span></div>
                              <div className="px-1"><span className="text-[8px] font-mono uppercase text-zinc-500 block">Docs</span><span className="text-[9.5px] text-white font-mono">{chat.breakdown.documents}</span></div>
                            </div>

                            {/* Action block */}
                            <div className="flex items-center gap-2">
                              <div className="text-right pr-2">
                                <span className="text-xs font-black text-pink-400 font-mono block">{chat.totalSize}</span>
                                <span className="text-[8px] font-mono text-zinc-500">{chat.mediaItems.length} files indexed</span>
                              </div>

                              <button 
                                onClick={() => {
                                  setSelectedChatForMedia(chat);
                                  setSelectedMediaItemIds([]);
                                }}
                                className="px-3 py-1.5 bg-violet-600 hover:bg-violet-500 text-white text-[10px] font-mono rounded-lg flex items-center gap-1 cursor-pointer"
                              >
                                Browse Media <ChevronRight className="w-3.5 h-3.5" />
                              </button>

                              {/* Granular clear selector */}
                              <button
                                onClick={() => {
                                  const promptType = window.confirm(`🧹 Clear conversation data for ${chat.name}?\nClick OK to purge files.`);
                                  if (promptType) {
                                    handleClearConversationDetailed(chat.id, 'all');
                                  }
                                }}
                                className="p-1.5 hover:bg-rose-500/20 text-zinc-500 hover:text-rose-400 rounded-lg cursor-pointer"
                                title="Clear conversations"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>

                          </div>
                        ))}
                      </div>
                    </>
                  ) : (
                    // Conversation's Interactive Media Explorer Screen!
                    <div className="space-y-5">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/5 pb-4">
                        <div className="flex items-center gap-2.5">
                          <button 
                            onClick={() => setSelectedChatForMedia(null)}
                            className="p-1 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-white mr-1 cursor-pointer"
                          >
                            ← Back
                          </button>
                          <img src={selectedChatForMedia.avatar} alt="" className="w-8 h-8 rounded-lg object-cover" />
                          <div className="text-left">
                            <h5 className="text-xs font-bold text-white">{selectedChatForMedia.name}</h5>
                            <p className="text-[9px] font-mono text-zinc-500 mt-0.5">Media vault size: <b className="text-pink-400">{selectedChatForMedia.totalSize}</b></p>
                          </div>
                        </div>

                        {/* Right quick actions selector */}
                        <div className="flex items-center gap-2">
                          <button 
                            onClick={handleSelectAllMedia}
                            className="px-2.5 py-1.5 bg-zinc-900 border border-white/10 text-zinc-300 text-[10px] font-mono rounded-lg hover:text-white cursor-pointer"
                          >
                            {selectedMediaItemIds.length === explorerFilteredMedia.length ? 'Deselect All' : 'Select All'}
                          </button>

                          {selectedMediaItemIds.length > 0 && (
                            <div className="flex items-center gap-1.5 animate-pulse">
                              <button 
                                onClick={handleDeleteSelectedMedia}
                                className="px-2.5 py-1.5 bg-rose-600 hover:bg-rose-500 text-white text-[10px] font-mono rounded-lg flex items-center gap-1 cursor-pointer"
                              >
                                <Trash2 className="w-3 h-3" /> Delete ({selectedMediaItemIds.length})
                              </button>
                              <button 
                                onClick={handleArchiveSelectedMedia}
                                className="px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-mono rounded-lg flex items-center gap-1 cursor-pointer"
                              >
                                <Archive className="w-3 h-3" /> Move to Archive
                              </button>
                            </div>
                          )}

                          {/* View Switchers */}
                          <div className="flex items-center bg-black rounded-lg p-1 border border-white/5">
                            {(['grid', 'list'] as const).map(vt => (
                              <button
                                key={vt}
                                onClick={() => setExplorerViewType(vt)}
                                className={`px-2 py-0.5 rounded text-[8px] font-mono capitalize cursor-pointer ${
                                  explorerViewType === vt ? 'bg-violet-600 text-white' : 'text-zinc-500'
                                }`}
                              >
                                {vt}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Explorer Media Filters */}
                      <div className="flex flex-wrap gap-1 bg-black/40 p-1 rounded-xl border border-white/5">
                        {[
                          { id: 'all', label: 'All Files', icon: Database },
                          { id: 'photo', label: 'Photos', icon: Image },
                          { id: 'video', label: 'Videos', icon: Video },
                          { id: 'voice', label: 'Voice Notes', icon: Mic },
                          { id: 'document', label: 'Documents', icon: FileText },
                          { id: 'gif', label: 'GIFs', icon: Globe }
                        ].map(f => (
                          <button
                            key={f.id}
                            onClick={() => {
                              setMediaFilterTab(f.id as any);
                              setSelectedMediaItemIds([]);
                            }}
                            className={`px-3 py-1 rounded-lg text-[10px] font-mono flex items-center gap-1.5 cursor-pointer ${
                              mediaFilterTab === f.id 
                                ? 'bg-violet-600 text-white font-bold' 
                                : 'text-zinc-500 hover:text-zinc-300'
                            }`}
                          >
                            <f.icon className="w-3 h-3" />
                            {f.label}
                          </button>
                        ))}
                      </div>

                      {/* Display Vault Grid / List */}
                      {explorerFilteredMedia.length === 0 ? (
                        <div className="p-8 text-center bg-zinc-950/40 border border-dashed border-white/10 rounded-2xl text-zinc-500 font-mono text-xs">
                          No media blocks matching current filter in vault.
                        </div>
                      ) : (
                        explorerViewType === 'grid' ? (
                          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                            {explorerFilteredMedia.map(item => {
                              const isSelected = selectedMediaItemIds.includes(item.id);
                              return (
                                <div 
                                  key={item.id}
                                  onClick={() => handleToggleSelectMedia(item.id)}
                                  className={`p-2 bg-slate-950/70 border rounded-2xl relative cursor-pointer select-none transition-all ${
                                    isSelected ? 'border-violet-500 bg-violet-600/10' : 'border-white/5 hover:border-white/10'
                                  }`}
                                >
                                  {/* Thumbnail Preview Area */}
                                  <div className="h-24 bg-zinc-900 rounded-xl relative overflow-hidden flex items-center justify-center">
                                    {item.type === 'photo' || item.type === 'gif' ? (
                                      <img src={item.url} alt={item.name} className="w-full h-full object-cover" />
                                    ) : item.type === 'video' ? (
                                      <div className="w-full h-full bg-slate-900/80 flex items-center justify-center relative">
                                        {item.url && <img src={item.url} alt="" className="absolute inset-0 w-full h-full object-cover opacity-50" />}
                                        <Play className="w-6 h-6 text-violet-400 relative z-10" />
                                      </div>
                                    ) : item.type === 'voice' ? (
                                      <Mic className="w-8 h-8 text-amber-400" />
                                    ) : (
                                      <FileText className="w-8 h-8 text-cyan-400" />
                                    )}

                                    {/* Selected Indicator */}
                                    {isSelected && (
                                      <div className="absolute top-1.5 right-1.5 w-5 h-5 bg-violet-600 border-2 border-white rounded-full flex items-center justify-center text-white text-[9px] font-bold">✓</div>
                                    )}

                                    {/* Starred / Pinned Flags */}
                                    <div className="absolute bottom-1 left-1.5 flex gap-1">
                                      {item.isFavorite && <span className="p-0.5 bg-black/60 rounded text-amber-400" title="Starred"><Star className="w-2.5 h-2.5 fill-amber-400" /></span>}
                                      {item.isPinned && <span className="p-0.5 bg-black/60 rounded text-cyan-400" title="Pinned"><Sliders className="w-2.5 h-2.5" /></span>}
                                    </div>
                                  </div>

                                  <div className="mt-2 text-left space-y-0.5">
                                    <span className="text-[10px] font-bold text-zinc-200 block truncate" title={item.name}>{item.name}</span>
                                    <div className="flex justify-between items-center text-[8.5px] font-mono text-zinc-500">
                                      <span>{item.size}</span>
                                      <span>{item.date}</span>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          // List view representation
                          <div className="space-y-2">
                            {explorerFilteredMedia.map(item => {
                              const isSelected = selectedMediaItemIds.includes(item.id);
                              return (
                                <div 
                                  key={item.id}
                                  onClick={() => handleToggleSelectMedia(item.id)}
                                  className={`p-3 rounded-xl border flex items-center justify-between gap-4 cursor-pointer transition-all select-none ${
                                    isSelected ? 'bg-violet-600/10 border-violet-500' : 'bg-black/30 border-white/5 hover:border-white/10'
                                  }`}
                                >
                                  <div className="flex items-center gap-3">
                                    {item.type === 'photo' || item.type === 'gif' ? (
                                      <Image className="w-4 h-4 text-pink-400 shrink-0" />
                                    ) : item.type === 'video' ? (
                                      <Video className="w-4 h-4 text-violet-400 shrink-0" />
                                    ) : item.type === 'voice' ? (
                                      <Mic className="w-4 h-4 text-amber-400 shrink-0" />
                                    ) : (
                                      <FileText className="w-4 h-4 text-cyan-400 shrink-0" />
                                    )}
                                    <span className="text-xs font-bold text-zinc-300 truncate max-w-xs">{item.name}</span>
                                  </div>

                                  <div className="flex items-center gap-4 text-right">
                                    <span className="text-[10px] font-mono text-zinc-500">{item.date}</span>
                                    <span className="text-xs font-mono font-black text-white">{item.size}</span>
                                    {isSelected ? (
                                      <div className="w-4 h-4 bg-violet-600 rounded-full flex items-center justify-center text-white text-[8px] font-bold">✓</div>
                                    ) : (
                                      <div className="w-4 h-4 rounded-full border border-zinc-700" />
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )
                      )}
                    </div>
                  )}

                </div>
              )}

              {/* AUTO-DOWNLOAD & COMPRESSION CONTROLLER */}
              {activeTab === 'downloads' && (
                <div className="space-y-6 text-left">
                  <div>
                    <h4 className="text-sm font-bold text-white flex items-center gap-2">
                      <Download className="w-4 h-4 text-violet-400" /> Granular Auto-Download Preferences
                    </h4>
                    <p className="text-[11px] text-zinc-400 mt-1">Dictate which media files are cached automatically depending on active routing transport protocols.</p>
                  </div>

                  {/* Network parameters matrix */}
                  <div className="p-4 bg-slate-950/70 border border-white/5 rounded-2xl space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      
                      {/* Mobile Data config */}
                      <div className="bg-black/40 border border-white/5 rounded-xl p-4 space-y-3">
                        <span className="text-xs font-black text-amber-400 font-mono uppercase flex items-center gap-1.5">
                          <Smartphone className="w-4 h-4" /> Mobile Carrier Connection
                        </span>
                        
                        <div className="space-y-2">
                          {[
                            { key: 'images', label: 'Images' },
                            { key: 'videos', label: 'Videos' },
                            { key: 'voiceNotes', label: 'Voice Notes' },
                            { key: 'documents', label: 'Documents' }
                          ].map(row => {
                            const val = downloads.mobile[row.key as keyof typeof downloads.mobile];
                            return (
                              <div key={row.key} className="flex justify-between items-center text-xs">
                                <span className="text-zinc-400">{row.label}</span>
                                <select 
                                  value={val}
                                  onChange={(e) => toggleDownloadOption('mobile', row.key, e.target.value)}
                                  className="bg-zinc-950 border border-white/10 rounded px-1.5 py-0.5 text-[10px] text-zinc-300 font-mono outline-none"
                                >
                                  <option value="auto">Auto</option>
                                  <option value="ask">Ask</option>
                                  <option value="never">Never</option>
                                </select>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Wi-Fi Connection Config */}
                      <div className="bg-black/40 border border-white/5 rounded-xl p-4 space-y-3">
                        <span className="text-xs font-black text-violet-400 font-mono uppercase flex items-center gap-1.5">
                          <Wifi className="w-4 h-4" /> Wi-Fi Networks
                        </span>
                        
                        <div className="space-y-2">
                          {[
                            { key: 'images', label: 'Images' },
                            { key: 'videos', label: 'Videos' },
                            { key: 'voiceNotes', label: 'Voice Notes' },
                            { key: 'documents', label: 'Documents' }
                          ].map(row => {
                            const val = downloads.wifi[row.key as keyof typeof downloads.wifi];
                            return (
                              <div key={row.key} className="flex justify-between items-center text-xs">
                                <span className="text-zinc-400">{row.label}</span>
                                <select 
                                  value={val}
                                  onChange={(e) => toggleDownloadOption('wifi', row.key, e.target.value)}
                                  className="bg-zinc-950 border border-white/10 rounded px-1.5 py-0.5 text-[10px] text-zinc-300 font-mono outline-none"
                                >
                                  <option value="auto">Auto</option>
                                  <option value="ask">Ask</option>
                                  <option value="never">Never</option>
                                </select>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Roaming config */}
                      <div className="bg-black/40 border border-white/5 rounded-xl p-4 space-y-3">
                        <span className="text-xs font-black text-rose-400 font-mono uppercase flex items-center gap-1.5">
                          <Globe className="w-4 h-4" /> Roaming / International
                        </span>
                        
                        <div className="space-y-2">
                          {[
                            { key: 'images', label: 'Images' },
                            { key: 'videos', label: 'Videos' },
                            { key: 'voiceNotes', label: 'Voice Notes' },
                            { key: 'documents', label: 'Documents' }
                          ].map(row => {
                            const val = downloads.roaming[row.key as keyof typeof downloads.roaming];
                            return (
                              <div key={row.key} className="flex justify-between items-center text-xs">
                                <span className="text-zinc-400">{row.label}</span>
                                <select 
                                  value={val}
                                  onChange={(e) => toggleDownloadOption('roaming', row.key, e.target.value)}
                                  className="bg-zinc-950 border border-white/10 rounded px-1.5 py-0.5 text-[10px] text-zinc-300 font-mono outline-none"
                                >
                                  <option value="auto">Auto</option>
                                  <option value="ask">Ask</option>
                                  <option value="never">Never</option>
                                </select>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                    </div>
                  </div>

                  {/* Multimedia compression selections */}
                  <div className="p-4 bg-slate-950/70 border border-white/5 rounded-2xl space-y-4">
                    <div>
                      <span className="text-xs font-black text-violet-400 uppercase font-mono block">Intelligent Media Compression Preset</span>
                      <p className="text-[10px] text-zinc-500 mt-0.5">Control image and video bitrates prior to dispatcher sending on peer routing.</p>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                      {[
                        { id: 'original', label: 'Original Quality', desc: 'No compression' },
                        { id: 'hd', label: 'HD Pro Quality', desc: 'Slight scale down' },
                        { id: 'balanced', label: 'Balanced (Standard)', desc: 'Optimized speed' },
                        { id: 'saver', label: 'Bandwidth Saver', desc: 'Compressed size' },
                        { id: 'ultrasaver', label: 'Ultra Saver Mode', desc: 'Strict low-bitrate' }
                      ].map(opt => (
                        <button
                          key={opt.id}
                          onClick={() => {
                            setDownloads((prev: any) => ({ ...prev, compressionMode: opt.id }));
                            window.dispatchEvent(new CustomEvent('toast', { detail: `⚙️ Preset set to: ${opt.label}` }));
                          }}
                          className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                            downloads.compressionMode === opt.id 
                              ? 'bg-violet-600/15 border-white/10 text-white' 
                              : 'bg-black/40 border-transparent text-zinc-500 hover:text-zinc-300'
                          }`}
                        >
                          <span className="text-[11px] font-bold block">{opt.label}</span>
                          <span className="text-[9px] text-zinc-500 font-mono leading-none mt-1 block">{opt.desc}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* ENCRYPTED BACKUP CENTER & RESTORATION */}
              {activeTab === 'backups' && (
                <div className="space-y-6 text-left">
                  <div>
                    <h4 className="text-sm font-bold text-white flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-violet-400" /> Decentralized End-to-End Encrypted Backups
                    </h4>
                    <p className="text-[11px] text-zinc-400 mt-1">Secure your transaction databases, keys, messages and media folders across multiple nodes with 64-character verification code seals.</p>
                  </div>

                  {/* Backup detail dashboard */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    
                    {/* Settings card */}
                    <div className="p-4 bg-slate-950/70 border border-white/5 rounded-2xl space-y-4 col-span-2">
                      <span className="text-xs font-black text-violet-400 font-mono uppercase block">Protected Configuration Parameters</span>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                        <div className="flex items-center justify-between p-2.5 bg-black/40 border border-white/5 rounded-xl">
                          <div>
                            <span className="font-bold text-zinc-300 block">Backup Schedule</span>
                            <span className="text-[9px] text-zinc-500 leading-none">Automated background triggers</span>
                          </div>
                          <select 
                            value={backups.schedule}
                            onChange={(e) => setBackups((prev: any) => ({ ...prev, schedule: e.target.value }))}
                            className="bg-zinc-950 text-white text-[10px] border border-white/10 rounded px-1.5 py-1"
                          >
                            <option value="manual">Manual Only</option>
                            <option value="daily">Daily Cycle</option>
                            <option value="weekly">Weekly Cycle</option>
                            <option value="monthly">Monthly Cycle</option>
                          </select>
                        </div>

                        <div className="flex items-center justify-between p-2.5 bg-black/40 border border-white/5 rounded-xl">
                          <div>
                            <span className="font-bold text-zinc-300 block">End-to-End Seal</span>
                            <span className="text-[9px] text-zinc-500 leading-none">Password encryption seal</span>
                          </div>
                          <button
                            onClick={() => {
                              const promptPass = window.prompt("Enter new Encryption Password for local backups (Do not lose this!):", backups.encryptionPassword);
                              if (promptPass) {
                                setBackups((prev: any) => ({ ...prev, encryptionPassword: promptPass }));
                                window.dispatchEvent(new CustomEvent('toast', { detail: '🔑 E2E Seal Password updated successfully!' }));
                              }
                            }}
                            className="px-2 py-1 bg-violet-600/20 text-violet-300 text-[10px] rounded hover:bg-violet-600/30 font-mono"
                          >
                            Configure Password
                          </button>
                        </div>
                      </div>

                      {/* Dest block */}
                      <div className="space-y-2">
                        <span className="text-[10px] font-bold text-zinc-400 block font-mono uppercase">Simultaneous Replication Target Channels</span>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                          {[
                            { key: 'googleDrive', label: 'Google Drive' },
                            { key: 'iCloud', label: 'Apple iCloud' },
                            { key: 'localDevice', label: 'Local Disk' },
                            { key: 'nas', label: 'Private NAS Hub' }
                          ].map(dest => {
                            const val = backups.destinations[dest.key as keyof typeof backups.destinations];
                            return (
                              <button
                                key={dest.key}
                                onClick={() => setBackups((prev: any) => ({
                                  ...prev,
                                  destinations: { ...prev.destinations, [dest.key]: !val }
                                }))}
                                className={`p-2 rounded-xl text-left border text-[10.5px] transition-all cursor-pointer ${
                                  val ? 'bg-violet-600/10 border-white/10 text-white' : 'bg-black/30 border-transparent text-zinc-500 hover:text-zinc-400'
                                }`}
                              >
                                {dest.label}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Backup item checklist */}
                      <div className="space-y-1.5 pt-1">
                        <span className="text-[10px] font-bold text-zinc-400 block font-mono uppercase">Ledger Pack Include Filter</span>
                        <div className="flex flex-wrap gap-2">
                          {[
                            { key: 'messages', label: 'Conversations text' },
                            { key: 'media', label: 'Videos & Images' },
                            { key: 'groups', label: 'Group Channels' },
                            { key: 'settings', label: 'Preferences' }
                          ].map(it => {
                            const val = backups.enabledItems[it.key as keyof typeof backups.enabledItems];
                            return (
                              <button
                                key={it.key}
                                onClick={() => setBackups((prev: any) => ({
                                  ...prev,
                                  enabledItems: { ...prev.enabledItems, [it.key]: !val }
                                }))}
                                className={`px-2 py-1 rounded-lg border text-[9px] font-mono capitalize transition-all cursor-pointer ${
                                  val ? 'bg-zinc-800 text-white border-zinc-700' : 'text-zinc-600 border-transparent bg-black/20'
                                }`}
                              >
                                {it.label}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                    </div>

                    {/* Key box */}
                    <div className="p-4 bg-slate-950/70 border border-white/5 rounded-2xl flex flex-col justify-between space-y-3">
                      <div>
                        <span className="text-xs font-black text-rose-400 font-mono uppercase block">Recovery key</span>
                        <p className="text-[9px] text-zinc-500 mt-1.5 leading-normal">Your 64-character master cryptographic block seal. It is required to index database backups on alternative ledger devices.</p>
                      </div>

                      <div className="p-2 bg-black/60 border border-white/5 rounded-xl font-mono text-[9px] break-all text-zinc-400 select-all select-none">
                        {backups.recoveryKey}
                      </div>

                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(backups.recoveryKey);
                          window.dispatchEvent(new CustomEvent('toast', { detail: '📋 Cryptographic key copied to clipboard' }));
                        }}
                        className="w-full py-2 bg-zinc-900 border border-white/10 hover:bg-zinc-800 text-zinc-300 text-[10px] font-mono rounded-lg cursor-pointer"
                      >
                        Copy Block Key
                      </button>
                    </div>

                  </div>

                  {/* Interactive Restore Experience Simulation */}
                  <div className="p-5 bg-slate-950/60 border border-white/5 rounded-2xl space-y-4">
                    <div>
                      <h4 className="text-xs font-black text-zinc-300 uppercase tracking-wider font-mono">Simulate Restoration & Migration</h4>
                      <p className="text-[10px] text-zinc-500 mt-0.5">Select a historical encrypted snapshot to populate your active node database.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      {availableBackupsList.map(bak => {
                        const activeRestoring = isRestoring && selectedRestoreBackupId === bak.id;
                        return (
                          <div key={bak.id} className="p-3.5 bg-black/40 border border-white/5 rounded-xl flex flex-col justify-between text-left space-y-3">
                            <div>
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-bold text-zinc-200 truncate">{bak.deviceName}</span>
                                <span className="text-[10px] font-mono text-cyan-400 font-black">{bak.size}</span>
                              </div>
                              <span className="text-[9px] font-mono text-zinc-500 mt-1 block">Saved: {bak.date}</span>
                              <span className="text-[9px] text-zinc-400 mt-2 block leading-snug">Includes: {bak.includeItems}</span>
                            </div>

                            <button
                              onClick={() => triggerBackupRestore(bak.id)}
                              disabled={isRestoring}
                              className="w-full py-1.5 bg-violet-600 hover:bg-violet-500 text-white text-[10px] font-mono rounded-lg transition-all flex items-center justify-center gap-1 cursor-pointer disabled:opacity-50"
                            >
                              {activeRestoring ? (
                                <>
                                  <RefreshCw className="w-3 h-3 animate-spin" /> Unsealing blocks...
                                </>
                              ) : 'Restore snap'}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* NETWORK & BANDWIDTH STATISTICS */}
              {activeTab === 'network' && (
                <div className="space-y-6 text-left">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-bold text-white flex items-center gap-2">
                        <BarChart2 className="w-4 h-4 text-violet-400" /> Decentralized Network Telemetry
                      </h4>
                      <p className="text-[11px] text-zinc-400 mt-1">Live analytics monitoring data payloads traversing peer-to-peer tunnels since resetting counter ledger records.</p>
                    </div>

                    <button 
                      onClick={resetNetworkStats}
                      className="px-3 py-1 bg-zinc-900 border border-white/10 text-zinc-400 hover:text-white rounded-lg text-[10px] font-mono cursor-pointer"
                    >
                      Reset statistics
                    </button>
                  </div>

                  {/* Network stats grid */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[
                      { label: 'Conversations (E2EE)', sent: '41,240 pkts', rec: '110,845 pkts', data: '1.24 GB' },
                      { label: 'Media upload / down', sent: '14.5 GB', rec: '41.2 GB', data: '55.7 GB' },
                      { label: 'Dynamic Stories preloading', sent: '112 MB', rec: '1.45 GB', data: '1.56 GB' },
                      { label: 'Voice / Video calls', sent: '42.5 hrs', rec: '31.2 hrs', data: '22.8 GB' },
                      { label: 'AI Assistance Requests', sent: '150 msgs', rec: '150 msgs', data: '14.5 MB' },
                      { label: 'Cloud Replication cycles', sent: '410 MB', rec: '2.4 GB', data: '2.81 GB' },
                      { label: 'Active Group Communities', sent: '4,100 pkts', rec: '98,000 pkts', data: '4.85 GB' },
                      { label: 'Live Streams metadata', sent: '0 B', rec: '5.12 GB', data: '5.12 GB' }
                    ].map((stat, i) => (
                      <div key={i} className="p-4 bg-slate-950/70 border border-white/5 rounded-2xl text-left space-y-2">
                        <span className="text-[10.5px] font-bold text-zinc-300 block truncate leading-tight">{stat.label}</span>
                        <p className="text-lg font-black text-pink-400 font-mono leading-none">{stat.data}</p>
                        
                        <div className="pt-1 flex justify-between text-[8px] font-mono text-zinc-500 leading-none border-t border-white/5 pt-2">
                          <span>Sent: {stat.sent}</span>
                          <span>Recv: {stat.rec}</span>
                        </div>
                      </div>
                    ))}
                  </div>

                  <p className="text-[10px] font-mono text-zinc-600 text-center">
                    Ledger monitoring active since: <b>{networkResetTime}</b>
                  </p>
                </div>
              )}

              {/* DEVICE OPTIMIZATION & DIAGNOSTICS */}
              {activeTab === 'optimization' && (
                <div className="space-y-6 text-left">
                  {/* Dynamic Performance Header */}
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/5 pb-4">
                    <div>
                      <h4 className="text-sm font-black text-white flex items-center gap-2">
                        <Cpu className="w-4 h-4 text-cyan-400 animate-pulse" /> Next-Gen Performance Optimization Engine
                      </h4>
                      <p className="text-[11px] text-zinc-400 mt-1">
                        Active pipeline: calibrate memory, toggle viewport virtualization multipliers, sync peer nodes, and consult AI Performance Subsystems.
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-1 bg-black/40 border border-white/5 rounded-xl p-1 shrink-0">
                      {[
                        { id: 'dashboard', label: 'Engine Dashboard', icon: Cpu },
                        { id: 'subsystems', label: 'Subsystems', icon: Sliders },
                        { id: 'queues', label: 'Offline Queue', icon: Radio },
                        { id: 'ai', label: 'AI Advisor', icon: Sparkles },
                        { id: 'analytics', label: 'Analytics', icon: BarChart2 }
                      ].map(subTab => {
                        const SubIcon = subTab.icon;
                        const isSelected = performanceSubTab === subTab.id;
                        return (
                          <button
                            key={subTab.id}
                            onClick={() => setPerformanceSubTab(subTab.id as any)}
                            className={`px-3 py-1.5 rounded-lg text-[10px] font-mono flex items-center gap-1.5 transition-all cursor-pointer ${
                              isSelected 
                                ? 'bg-cyan-500/15 border border-cyan-500/20 text-cyan-300 font-bold' 
                                : 'text-zinc-500 hover:text-zinc-300 border border-transparent'
                            }`}
                          >
                            <SubIcon className={`w-3.5 h-3.5 ${isSelected ? 'text-cyan-400' : 'text-zinc-600'}`} />
                            {subTab.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* 1. ENGINE DASHBOARD SUB-TAB */}
                  {performanceSubTab === 'dashboard' && (
                    <div className="space-y-6">
                      {/* Grid 1: Hero Metrics */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {/* Score Indicator */}
                        <div className="p-5 bg-gradient-to-br from-cyan-950/20 to-black border border-cyan-500/20 rounded-2xl flex items-center gap-4">
                          <div className="relative w-16 h-16 flex items-center justify-center shrink-0">
                            <svg className="w-full h-full transform -rotate-90">
                              <circle cx="32" cy="32" r="28" fill="transparent" stroke="rgba(255,255,255,0.02)" strokeWidth="5" />
                              <circle cx="32" cy="32" r="28" fill="transparent" stroke="#22d3ee" strokeWidth="5" strokeDasharray={175} strokeDashoffset={175 - (175 * 0.99)} />
                            </svg>
                            <div className="absolute text-center">
                              <span className="text-sm font-black text-cyan-400 font-mono">99</span>
                            </div>
                          </div>
                          <div className="text-left">
                            <span className="text-[9px] font-mono uppercase text-cyan-500 font-bold block">Engine Rating</span>
                            <h4 className="text-sm font-black text-white mt-0.5">Absolute Peak</h4>
                            <span className="text-[8.5px] font-mono text-zinc-500 block">System performance: 100% stable</span>
                          </div>
                        </div>

                        {/* Startup Speed Card */}
                        <div className="p-5 bg-gradient-to-br from-violet-950/20 to-black border border-white/10 rounded-2xl flex items-center gap-4">
                          <div className="w-12 h-12 rounded-xl bg-violet-600/10 border border-white/10 flex items-center justify-center shrink-0">
                            <Activity className="w-5 h-5 text-violet-400 animate-pulse" />
                          </div>
                          <div className="text-left">
                            <span className="text-[9px] font-mono uppercase text-violet-400 font-bold block">App Launch Duration</span>
                            <h4 className="text-sm font-black text-white mt-0.5">118 ms</h4>
                            <span className="text-[8.5px] font-mono text-zinc-500 block">Fastest 1% on mobile runtimes</span>
                          </div>
                        </div>

                        {/* Diagnostics Toggle Card */}
                        <div className="p-5 bg-black/40 border border-white/5 rounded-2xl flex items-center justify-between">
                          <div className="text-left flex gap-3 items-center min-w-0">
                            <div className="w-12 h-12 rounded-xl bg-pink-500/10 border border-pink-500/25 flex items-center justify-center shrink-0">
                              <Settings className="w-5 h-5 text-pink-400" />
                            </div>
                            <div className="min-w-0">
                              <span className="text-[9px] font-mono uppercase text-pink-400 font-bold block">Developer Overlay</span>
                              <h4 className="text-xs font-bold text-white mt-0.5 truncate">Floating Diagnostics</h4>
                              <span className="text-[8.5px] text-zinc-500 block truncate">Overlay real-time FPS metric</span>
                            </div>
                          </div>
                          <button
                            onClick={() => handleToggleDiagnostics(!diagnosticsActive)}
                            className={`w-10 h-5 rounded-full p-0.5 transition-all flex items-center cursor-pointer shrink-0 ${
                              diagnosticsActive ? 'bg-cyan-400 justify-end' : 'bg-zinc-800 justify-start'
                            }`}
                          >
                            <span className="w-4 h-4 bg-black rounded-full" />
                          </button>
                        </div>
                      </div>

                      {/* Grid 2: Resource Footprint */}
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        {/* CPU */}
                        <div className="p-4 bg-slate-950/60 border border-white/5 rounded-2xl space-y-2.5 text-left">
                          <div className="flex justify-between items-center">
                            <span className="text-[10px] font-mono text-zinc-400 flex items-center gap-1">
                              <Cpu className="w-3.5 h-3.5 text-cyan-400" /> CPU Allocation
                            </span>
                            <span className="font-mono text-xs text-white font-bold">{systemMetrics.cpu}%</span>
                          </div>
                          <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
                            <motion.div 
                              className="bg-cyan-400 h-full rounded-full" 
                              animate={{ width: `${systemMetrics.cpu}%` }}
                              transition={{ type: "spring", stiffness: 100 }}
                            />
                          </div>
                          <div className="flex justify-between text-[8px] font-mono text-zinc-600">
                            <span>Indexing Tunnels</span>
                            <span>Scale-to-Zero</span>
                          </div>
                        </div>

                        {/* RAM */}
                        <div className="p-4 bg-slate-950/60 border border-white/5 rounded-2xl space-y-2.5 text-left">
                          <div className="flex justify-between items-center">
                            <span className="text-[10px] font-mono text-zinc-400 flex items-center gap-1">
                              <Smartphone className="w-3.5 h-3.5 text-violet-400" /> RAM Page Footprint
                            </span>
                            <div className="text-right">
                              <span className="font-mono text-xs text-white font-bold block leading-none">{ramStatus.totalUsed}</span>
                              <span className="text-[8px] font-mono text-emerald-400 uppercase font-black">{ramStatus.status}</span>
                            </div>
                          </div>
                          <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
                            <motion.div 
                              className="bg-violet-500 h-full rounded-full" 
                              animate={{ width: `${ramStatus.level}%` }}
                              transition={{ type: "spring", stiffness: 100 }}
                            />
                          </div>
                          <div className="flex justify-between text-[8px] font-mono text-zinc-600">
                            <span>Collector Active</span>
                            <span>Limit: 800MB</span>
                          </div>
                        </div>

                        {/* Virtual Scroll Row Capacity */}
                        <div className="p-4 bg-slate-950/60 border border-white/5 rounded-2xl space-y-2.5 text-left">
                          <div className="flex justify-between items-center">
                            <span className="text-[10px] font-mono text-zinc-400 flex items-center gap-1">
                              <Database className="w-3.5 h-3.5 text-pink-400" /> Virtualized Engine
                            </span>
                            <span className="font-mono text-xs text-pink-400 font-bold">1.25M Rows</span>
                          </div>
                          {/* Simulated position sliding bar */}
                          <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden relative">
                            <motion.div 
                              className="bg-pink-500 h-1.5 w-4 absolute rounded-full" 
                              animate={{ left: `${virtualScrollPosition}%` }}
                              style={{ top: '-1px' }}
                            />
                          </div>
                          <div className="flex justify-between items-center text-[8px] font-mono text-zinc-600">
                            <span>DOM nodes: <b>{visibleVirtualRecords} active</b></span>
                            <span className="text-pink-500 font-black">100% Recycled ({recycledComponents})</span>
                          </div>
                        </div>

                        {/* Battery & Power Saver */}
                        <div className="p-4 bg-slate-950/60 border border-white/5 rounded-2xl space-y-2.5 text-left">
                          <div className="flex justify-between items-center">
                            <span className="text-[10px] font-mono text-zinc-400 flex items-center gap-1">
                              <Battery className="w-3.5 h-3.5 text-emerald-400" /> Smart Battery
                            </span>
                            <span className="font-mono text-xs text-white font-bold">{Math.floor(systemMetrics.battery)}%</span>
                          </div>
                          <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
                            <motion.div 
                              className="bg-emerald-400 h-full rounded-full" 
                              animate={{ width: `${systemMetrics.battery}%` }}
                            />
                          </div>
                          <div className="flex justify-between items-center text-[8.5px] font-mono">
                            <span className="text-zinc-600">Saver: {batterySaverActive ? 'ON' : 'OFF'}</span>
                            <button
                              onClick={() => {
                                setBatterySaverActive(!batterySaverActive);
                                localStorage.setItem('nx_battery_saver_active', (!batterySaverActive).toString());
                                window.dispatchEvent(new CustomEvent('toast', { detail: !batterySaverActive ? '🔋 Smart Power Saver Enabled: Framer particle triggers suspended.' : '🔋 Standard Power Settings Active' }));
                              }}
                              className="text-[9px] text-cyan-400 font-black hover:underline cursor-pointer"
                            >
                              Toggle Saver
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Safeguard Grid */}
                      <div className="p-5 bg-slate-950/60 border border-white/5 rounded-2xl space-y-4">
                        <div>
                          <h5 className="text-xs font-black text-cyan-400 font-mono uppercase tracking-wider flex items-center gap-1.5">
                            <ShieldCheck className="w-4 h-4 text-cyan-400" /> Client Safeguards & Anti-Crash Systems
                          </h5>
                          <p className="text-[9px] text-zinc-500 mt-1">
                            Nexora runs protective watchdog threads that guard memory heap thresholds, capture recursive loops, and intercept UI locking scripts automatically.
                          </p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          {[
                            { title: 'Memory Exhaustion Guard', status: safeguards.memoryExhaustion, desc: 'Auto-purges old cache rows before heap boundary hit.' },
                            { title: 'Storage Safekeeper Engine', status: safeguards.storageExhaustion, desc: 'Stops preloads dynamically if disk drops below 50MB.' },
                            { title: 'Anti-Infinite Loop Watcher', status: safeguards.infiniteLoops, desc: 'Intercepts state loop iterations and safely releases execution.' },
                            { title: 'UI Freeze Guard (WebWorker)', status: safeguards.uiFreezes, desc: 'Offloads complex cryptography pipelines to secondary threads.' },
                            { title: 'Slow DB Index Interceptor', status: safeguards.slowDbQueries, desc: 'Pre-compiles index keys for SQLite/IndexedDB lookup shortcuts.' },
                            { title: 'Corrupted Cache Auto-Sanitizer', status: safeguards.corruptedCache, desc: 'Validates integrity hashes and auto-rebuilds broken assets.' }
                          ].map((safe, idx) => (
                            <div key={idx} className="p-3 bg-black/40 border border-white/5 rounded-xl flex flex-col justify-between text-left space-y-1.5">
                              <div className="flex items-center justify-between gap-1">
                                <span className="text-[10px] font-bold text-zinc-300 truncate">{safe.title}</span>
                                <span className="px-1.5 py-0.5 rounded text-[8px] font-mono font-black uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shrink-0">
                                  {safe.status}
                                </span>
                              </div>
                              <p className="text-[8.5px] text-zinc-500 leading-snug">{safe.desc}</p>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Live Telemetry Sparkline SVG */}
                      <div className="p-5 bg-slate-950/60 border border-white/5 rounded-2xl">
                        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2">
                          <div>
                            <h5 className="text-xs font-black text-zinc-300 font-mono uppercase tracking-wider">Dynamic CPU / RAM Telemetry Sparkline</h5>
                            <p className="text-[9px] text-zinc-500 mt-0.5">Real-time graphing of core threads. Updates every 2.5 seconds.</p>
                          </div>
                          <div className="flex items-center gap-3 text-[9px] font-mono">
                            <span className="flex items-center gap-1 text-cyan-400">
                              <span className="w-2 h-2 rounded-full bg-cyan-400 inline-block animate-pulse" /> CPU Threads
                            </span>
                            <span className="flex items-center gap-1 text-violet-400">
                              <span className="w-2 h-2 rounded-full bg-violet-400 inline-block animate-pulse" /> RAM Pages
                            </span>
                          </div>
                        </div>

                        {/* Sparkline Canvas */}
                        <div className="h-28 w-full mt-4 flex items-end justify-between gap-1 relative overflow-hidden bg-black/50 border border-white/5 p-2 rounded-xl">
                          {/* Live Render Lines using SVG path */}
                          <svg className="absolute inset-0 w-full h-full" preserveAspectRatio="none">
                            {/* CPU Path */}
                            <path
                              d={`M ${liveTelemetry.map((t, idx) => `${(idx / (liveTelemetry.length - 1)) * 100}%,${100 - t.cpu}`).join(' L ')}`}
                              fill="none"
                              stroke="#06b6d4"
                              strokeWidth="2"
                              className="transition-all duration-1000"
                            />
                            {/* RAM Path */}
                            <path
                              d={`M ${liveTelemetry.map((t, idx) => `${(idx / (liveTelemetry.length - 1)) * 100}%,${100 - t.ram}`).join(' L ')}`}
                              fill="none"
                              stroke="#8b5cf6"
                              strokeWidth="2"
                              className="transition-all duration-1000"
                            />
                          </svg>

                          {/* Grid indicators */}
                          <div className="absolute left-2 top-2 text-[8px] font-mono text-zinc-600">Peak Threading</div>
                          <div className="absolute right-2 bottom-2 text-[8px] font-mono text-zinc-600 font-bold">Now</div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* 2. SUBSYSTEMS SUB-TAB */}
                  {performanceSubTab === 'subsystems' && (
                    <div className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* 1. Intelligent Lazy Loading */}
                        <div className="p-5 bg-slate-950/60 border border-white/5 rounded-2xl space-y-4 text-left">
                          <div>
                            <h5 className="text-xs font-black text-cyan-400 font-mono uppercase tracking-wider">
                              Intelligent Lazy Loading Matrix
                            </h5>
                            <p className="text-[9px] text-zinc-500 mt-1 leading-relaxed">
                              Control which viewport layouts are deferred until scroll intercept. Offloading sections reduces active memory pages and DOM depth.
                            </p>
                          </div>

                          <div className="grid grid-cols-2 gap-2 text-xs">
                            {Object.entries(lazyLoadingToggles).map(([key, value]) => (
                              <button
                                key={key}
                                onClick={() => {
                                  const updated = { ...lazyLoadingToggles, [key]: !value };
                                  setLazyLoadingToggles(updated);
                                  localStorage.setItem('nx_lazy_loading_toggles', JSON.stringify(updated));
                                  window.dispatchEvent(new CustomEvent('nx-lazy-load-update'));
                                }}
                                className={`p-2 rounded-xl border text-left flex justify-between items-center transition-all cursor-pointer ${
                                  value 
                                    ? 'bg-cyan-500/10 border-cyan-500/20 text-cyan-200 font-bold' 
                                    : 'bg-black/40 border-transparent text-zinc-500 hover:text-zinc-400'
                                }`}
                              >
                                <span className="font-mono text-[9px] truncate uppercase">{key.replace(/([A-Z])/g, ' $1')}</span>
                                <span className={`text-[8px] font-mono px-1 rounded shrink-0 ${value ? 'bg-cyan-500/20 text-cyan-300' : 'bg-zinc-800 text-zinc-600'}`}>
                                  {value ? 'DEFER' : 'LOAD'}
                                </span>
                              </button>
                            ))}
                          </div>
                          
                          <div className="p-3 bg-cyan-950/10 border border-cyan-500/10 rounded-xl text-[9px] text-cyan-400 font-mono flex items-center gap-2">
                            <Info className="w-3.5 h-3.5 shrink-0" />
                            <span>Viewport Recycler Ticker: <b>{recycledComponents} DOM cells fully recycled</b></span>
                          </div>
                        </div>

                        {/* 2. Adaptive Preloading */}
                        <div className="p-5 bg-slate-950/60 border border-white/5 rounded-2xl space-y-4 text-left">
                          <div>
                            <h5 className="text-xs font-black text-violet-400 font-mono uppercase tracking-wider">
                              Adaptive Channel Preloader
                            </h5>
                            <p className="text-[9px] text-zinc-500 mt-1 leading-relaxed">
                              Nexora smart-preloads adjacent communication key packets based on predictive messaging frequency vectors to ensure instant chat loads.
                            </p>
                          </div>

                          <div className="space-y-2.5">
                            {/* Preload conditions checkboxes */}
                            <div className="grid grid-cols-2 gap-2">
                              {[
                                { key: 'idleOnly', label: 'Idle State Only', desc: 'Preload only when device not in active swipe' },
                                { key: 'batteryHealthy', label: 'Battery Balanced', desc: 'Suspend preload if battery drops under 20%' },
                                { key: 'networkStable', label: 'Stable Network Only', desc: 'Prevent preloads on poor roaming signals' },
                                { key: 'memoryAvailable', label: 'Available Memory Pages', desc: 'Defer preload if system page cache is full' }
                              ].map(cond => (
                                <button
                                  key={cond.key}
                                  onClick={() => setPreloadConditions(prev => ({ ...prev, [cond.key]: !prev[cond.key as keyof typeof preloadConditions] }))}
                                  className={`p-2 rounded-xl border text-left transition-all cursor-pointer ${
                                    preloadConditions[cond.key as keyof typeof preloadConditions]
                                      ? 'bg-violet-500/10 border-white/10 text-violet-200 font-bold'
                                      : 'bg-black/40 border-transparent text-zinc-500'
                                  }`}
                                >
                                  <span className="text-[10px] block leading-tight">{cond.label}</span>
                                  <span className="text-[8px] text-zinc-500 font-mono leading-none mt-1 block">{cond.desc}</span>
                                </button>
                              ))}
                            </div>

                            <div className="p-4 bg-black/40 border border-white/5 rounded-xl space-y-3">
                              <div className="flex justify-between items-center text-[10px] font-mono">
                                <span className="text-zinc-400">Preloaded adjacent keys:</span>
                                <span className="text-violet-400 font-black">{preloadedChats.length} Channels</span>
                              </div>
                              <div className="flex flex-wrap gap-1.5">
                                {preloadedChats.map(ch => (
                                  <span key={ch} className="px-2 py-0.5 bg-zinc-900 border border-white/5 rounded-md text-[9px] text-zinc-300 font-mono">
                                    @{ch}
                                  </span>
                                ))}
                              </div>

                              <button
                                onClick={() => {
                                  setIsSimulatingPreload(true);
                                  setTimeout(() => {
                                    setIsSimulatingPreload(false);
                                    const names = ['sophia_sterling', 'lucas_cyber', 'blockchain_ledger', 'broadcast_bravo', 'quantum_chat'];
                                    const randName = names[Math.floor(Math.random() * names.length)];
                                    if (!preloadedChats.includes(randName)) {
                                      setPreloadedChats(prev => [...prev, randName]);
                                    }
                                    window.dispatchEvent(new CustomEvent('toast', { detail: `⚡ Predictive preloader loaded adjacent channel keys for @${randName}!` }));
                                  }, 1200);
                                }}
                                disabled={isSimulatingPreload}
                                className="w-full py-1.5 bg-violet-600 hover:bg-violet-500 text-white text-[10px] font-mono rounded-lg transition-all flex items-center justify-center gap-1 cursor-pointer disabled:opacity-50"
                              >
                                {isSimulatingPreload ? (
                                  <>
                                    <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Analyzing predictive frequency...
                                  </>
                                ) : 'Trigger Predictive Preload'}
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* 3. Progressive Media Slider */}
                        <div className="p-5 bg-slate-950/60 border border-white/5 rounded-2xl space-y-4 text-left">
                          <div>
                            <h5 className="text-xs font-black text-cyan-400 font-mono uppercase tracking-wider">
                              Progressive Asset Loader Settings
                            </h5>
                            <p className="text-[9px] text-zinc-500 mt-1 leading-relaxed">
                              Nexora loads media dynamically starting from tiny unencrypted blur hashes to fully decoded master resolution records as assets enter the viewport.
                            </p>
                          </div>

                          <div className="p-4 bg-black/40 border border-white/5 rounded-xl space-y-4">
                            <div className="flex justify-between items-center text-xs">
                              <span className="text-zinc-400">Selected format:</span>
                              <div className="flex bg-zinc-950 p-1 border border-white/5 rounded-lg">
                                {(['image', 'video', 'voice', 'doc'] as const).map(fmt => (
                                  <button
                                    key={fmt}
                                    onClick={() => setProgressiveMedium(fmt)}
                                    className={`px-2.5 py-1 rounded text-[9px] font-mono capitalize cursor-pointer ${
                                      progressiveMedium === fmt ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/20' : 'text-zinc-500'
                                    }`}
                                  >
                                    {fmt}
                                  </button>
                                ))}
                              </div>
                            </div>

                            <div className="space-y-2">
                              <div className="flex justify-between text-[10px] font-mono">
                                <span className="text-zinc-500 font-bold">Loader depth level:</span>
                                <span className="text-cyan-400 font-black">Level {progressiveLevel} / 3</span>
                              </div>
                              <input
                                type="range"
                                min="0"
                                max="3"
                                value={progressiveLevel}
                                onChange={(e) => {
                                  const val = parseInt(e.target.value);
                                  setProgressiveLevel(val);
                                  window.dispatchEvent(new CustomEvent('toast', { detail: `⚙️ Progressive loading level set to: ${val}` }));
                                }}
                                className="w-full accent-cyan-400 cursor-pointer"
                              />
                              <div className="grid grid-cols-4 gap-1 text-[7px] text-center font-mono text-zinc-600 leading-none">
                                <span>Tiny Blur hash (1KB)</span>
                                <span>Low Res (20KB)</span>
                                <span>WebP Balanced (100KB)</span>
                                <span>Raw Original</span>
                              </div>
                            </div>

                            <div className="p-3 bg-[#0d151c] border border-cyan-500/10 rounded-xl text-left">
                              <span className="text-[10px] font-black text-cyan-300 block">Preview Load Speed simulation:</span>
                              <span className="text-[9px] font-mono text-zinc-400 mt-1 block">
                                {progressiveLevel === 0 && '⚡ Loaded in 2 ms. Displaying 16px compressed vector placeholder.'}
                                {progressiveLevel === 1 && '⚡ Loaded in 12 ms. Displaying sub-sampled 240p image map.'}
                                {progressiveLevel === 2 && '⚡ Loaded in 38 ms. Displaying high-efficiency 720p WebP layout.'}
                                {progressiveLevel === 3 && '⚡ Loaded in 140 ms. Fetching intact uncompressed source binary.'}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* 4. Cache Table list */}
                        <div className="p-5 bg-slate-950/60 border border-white/5 rounded-2xl space-y-4 text-left">
                          <div className="flex justify-between items-center">
                            <div>
                              <h5 className="text-xs font-black text-violet-400 font-mono uppercase tracking-wider">
                                Subsystem Cache Registries
                              </h5>
                              <p className="text-[9px] text-zinc-500 mt-0.5">
                                Granular cache indices managed dynamically. Cleans stale tables safely.
                              </p>
                            </div>
                            <button
                              onClick={handleClearAllCache}
                              className="px-2.5 py-1 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 font-mono border border-rose-500/25 rounded-lg text-[9px] cursor-pointer"
                            >
                              Flush All
                            </button>
                          </div>

                          <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                            {cacheTable.slice(0, 5).map(cacheItem => (
                              <div key={cacheItem.id} className="p-2.5 bg-black/40 border border-white/5 rounded-xl flex items-center justify-between text-xs hover:border-white/10 transition-all">
                                <div>
                                  <span className="font-bold text-zinc-300 block">{cacheItem.name}</span>
                                  <div className="flex gap-2 text-[8px] font-mono text-zinc-500 mt-0.5">
                                    <span>Allocated: <b className="text-pink-400">{cacheItem.size}</b></span>
                                    <span>•</span>
                                    <span>{cacheItem.items} keys</span>
                                  </div>
                                </div>

                                <div className="flex items-center gap-2 shrink-0">
                                  <span className="text-[8px] font-mono bg-zinc-900 px-1 border border-white/5 text-zinc-500 rounded">
                                    {cacheItem.status}
                                  </span>
                                  <button
                                    onClick={() => triggerRebuildCache(cacheItem.id)}
                                    disabled={rebuildingCacheId === cacheItem.id}
                                    className="px-2 py-1 bg-zinc-900 hover:bg-zinc-800 border border-white/10 text-[9px] font-mono rounded-md text-violet-400 cursor-pointer disabled:opacity-50"
                                  >
                                    {rebuildingCacheId === cacheItem.id ? 'Purging...' : 'Rebuild'}
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* 3. OFFLINE QUEUE SUB-TAB */}
                  {performanceSubTab === 'queues' && (
                    <div className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {/* Offline Toggle Card */}
                        <div className="p-4 bg-slate-950/60 border border-white/5 rounded-2xl flex flex-col justify-between space-y-3 text-left">
                          <div>
                            <span className="text-[10px] font-mono text-cyan-400 font-black uppercase block">Network Tunnel Simulator</span>
                            <h5 className="text-xs font-bold text-white mt-1">Simulate Offline Mode</h5>
                            <p className="text-[8.5px] text-zinc-500 mt-1 leading-relaxed">
                              Toggle simulated offline state to test immediate client storage buffering, FIFO queuing, and automatic synchronization resumption once the peer tunnels reconnect!
                            </p>
                          </div>
                          
                          <div className="flex justify-between items-center bg-black/40 p-2.5 border border-white/5 rounded-xl">
                            <span className="text-[10px] font-mono text-zinc-400">Offline State:</span>
                            <button
                              onClick={() => {
                                const nextVal = !isSimulatedOffline;
                                setIsSimulatedOffline(nextVal);
                                localStorage.setItem('nx_is_simulated_offline', nextVal.toString());
                                window.dispatchEvent(new CustomEvent('toast', { 
                                  detail: nextVal 
                                    ? '🔌 Node disconnected. All outgoing payloads will be buffered in offline queue.' 
                                    : '🔌 Resumed connectivity. Initiating batch sync of local queue...' 
                                }));
                              }}
                              className={`px-3 py-1 rounded text-[10px] font-mono font-bold cursor-pointer transition-all ${
                                isSimulatedOffline 
                                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' 
                                  : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              }`}
                            >
                              {isSimulatedOffline ? 'SIMULATE OFFLINE' : 'ONLINE'}
                            </button>
                          </div>
                        </div>

                        {/* Background Synchronizer */}
                        <div className="p-4 bg-slate-950/60 border border-white/5 rounded-2xl flex flex-col justify-between space-y-3 text-left">
                          <div>
                            <span className="text-[10px] font-mono text-violet-400 font-black uppercase block">P2P Synchronizer</span>
                            <h5 className="text-xs font-bold text-white mt-1">Replication Schedule</h5>
                            <p className="text-[8.5px] text-zinc-500 mt-1 leading-relaxed">
                              Select background sync interval algorithm. Incremental delta synchronization minimizes physical radio wake-up cycles.
                            </p>
                          </div>
                          
                          <div className="flex justify-between items-center text-xs">
                            <span className="text-zinc-400 text-[10px] font-mono">Sync Tier:</span>
                            <select
                              value={syncSchedule}
                              onChange={(e) => {
                                setSyncSchedule(e.target.value as any);
                                window.dispatchEvent(new CustomEvent('toast', { detail: `⚙️ Sync schedule set to: ${e.target.value}` }));
                              }}
                              className="bg-zinc-950 border border-white/10 rounded px-1.5 py-0.5 text-[10px] text-zinc-300 font-mono outline-none"
                            >
                              <option value="silent">Deactivated (Silent)</option>
                              <option value="incremental">Incremental Delta</option>
                              <option value="delta">Batch Interval (30s)</option>
                              <option value="full">Full Replication</option>
                            </select>
                          </div>
                        </div>

                        {/* Sync Rate Info */}
                        <div className="p-4 bg-slate-950/60 border border-white/5 rounded-2xl flex flex-col justify-between space-y-3 text-left">
                          <div>
                            <span className="text-[10px] font-mono text-pink-400 font-black uppercase block">Bandwidth Throttle</span>
                            <h5 className="text-xs font-bold text-white mt-1">Live Synchronization rate</h5>
                            <p className="text-[8.5px] text-zinc-500 mt-1 leading-relaxed">
                              Current background socket throughput metrics. Enabling Adaptive Data Saver immediately throttles non-essential assets preloading.
                            </p>
                          </div>

                          <div className="flex justify-between items-center text-[10px] font-mono">
                            <span className="text-zinc-500">Live Delta flow:</span>
                            <span className="text-pink-400 font-black">{isSimulatedOffline ? '0.0 B/s' : deltaRate}</span>
                          </div>
                        </div>
                      </div>

                      {/* FIFO Queue list */}
                      <div className="p-5 bg-slate-950/60 border border-white/5 rounded-2xl space-y-4 text-left">
                        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3">
                          <div>
                            <h5 className="text-xs font-black text-cyan-400 font-mono uppercase tracking-wider flex items-center gap-1.5">
                              <Radio className="w-4 h-4 text-cyan-400" /> Offline Transaction FIFO Buffer
                            </h5>
                            <p className="text-[9px] text-zinc-500 mt-0.5">
                              Unsynchronized message payloads, reactions, comments, and votes held locally until peer connectivity is established.
                            </p>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <button
                              onClick={handleQueueSimulatedMessage}
                              className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 font-bold text-white text-[10px] font-mono rounded-lg transition-all flex items-center gap-1 cursor-pointer"
                            >
                              Queue Simulated Action
                            </button>
                            <button
                              onClick={() => {
                                setOfflineQueue([]);
                                window.dispatchEvent(new CustomEvent('toast', { detail: '🗑️ Cleared local transactions ledger.' }));
                              }}
                              className="px-2.5 py-1.5 bg-zinc-900 hover:bg-zinc-800 border border-white/10 text-zinc-400 text-[10px] font-mono rounded-lg cursor-pointer"
                            >
                              Clear Ledger
                            </button>
                          </div>
                        </div>

                        {/* List cards */}
                        <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                          {offlineQueue.length === 0 ? (
                            <div className="p-8 text-center bg-black/40 border border-white/5 rounded-xl space-y-1.5">
                              <span className="text-xs font-bold text-zinc-400 block">Queue Empty</span>
                              <p className="text-[10px] text-zinc-600 max-w-sm mx-auto">No pending local actions waiting to sync. All transactions are fully synchronized with core nodes!</p>
                            </div>
                          ) : (
                            offlineQueue.map(item => (
                              <div key={item.id} className="p-3 bg-black/40 border border-white/5 rounded-xl flex items-center justify-between text-xs hover:border-cyan-500/20 transition-all">
                                <div className="text-left space-y-1 min-w-0">
                                  <div className="flex items-center gap-2">
                                    <span className="px-1.5 py-0.5 text-[8px] font-mono bg-zinc-900 border border-white/5 text-zinc-300 font-black rounded uppercase shrink-0">
                                      {item.type}
                                    </span>
                                    <span className="text-[9.5px] font-mono text-zinc-500 truncate">{item.timestamp}</span>
                                  </div>
                                  <p className="text-[10.5px] text-zinc-300 font-mono leading-tight truncate">{item.payload}</p>
                                </div>

                                <div className="flex items-center gap-2 shrink-0">
                                  <span className={`px-2 py-0.5 rounded text-[8.5px] font-mono font-black uppercase ${
                                    item.status === 'completed' 
                                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                                      : (item.status === 'uploading' 
                                        ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20 animate-pulse' 
                                        : 'bg-amber-500/10 text-amber-300 border border-amber-500/20')
                                  }`}>
                                    {item.status}
                                  </span>
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* 4. AI PERFORMANCE ASSISTANT SUB-TAB */}
                  {performanceSubTab === 'ai' && (
                    <div className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {/* Conversation Screen */}
                        <div className="md:col-span-2 p-5 bg-slate-950/60 border border-white/5 rounded-2xl flex flex-col justify-between h-[420px]">
                          <div className="flex flex-col min-h-0 flex-1">
                            <div className="flex items-center justify-between border-b border-white/5 pb-3">
                              <div className="flex items-center gap-2">
                                <Sparkles className="w-4 h-4 text-cyan-400" />
                                <div className="text-left">
                                  <h5 className="text-xs font-bold text-white">Nida Performance Subsystem</h5>
                                  <span className="text-[9px] font-mono text-zinc-500">Autonomous hardware indexing active</span>
                                </div>
                              </div>
                              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block animate-pulse" title="System normal" />
                            </div>

                            {/* Scrollable messages area */}
                            <div className="space-y-3.5 flex-1 overflow-y-auto mt-4 pr-1 text-xs">
                              {aiAssistantMessages.map((msg, idx) => (
                                <div 
                                  key={msg.id || idx} 
                                  className={`flex flex-col max-w-[85%] ${msg.sender === 'user' ? 'ml-auto text-right' : 'mr-auto text-left'}`}
                                >
                                  <div className={`p-3 rounded-2xl leading-relaxed whitespace-pre-line ${
                                    msg.sender === 'user' 
                                      ? 'bg-cyan-600/15 border border-cyan-500/25 text-white rounded-br-none' 
                                      : 'bg-black/50 border border-white/5 text-zinc-300 rounded-bl-none'
                                  }`}>
                                    {msg.text}
                                  </div>
                                  <span className="text-[8px] font-mono text-zinc-600 mt-1 uppercase">
                                    {msg.sender === 'user' ? 'User node' : 'Nida Subsystem'} • {msg.timestamp}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Chat Input block */}
                          <div className="flex items-center gap-2 border-t border-white/5 pt-3 shrink-0">
                            <input
                              type="text"
                              value={aiInput}
                              onChange={(e) => setAiInput(e.target.value)}
                              onKeyDown={(e) => e.key === 'Enter' && handleSendAiMessage()}
                              placeholder="Ask Nida regarding RAM, background synchronization, or power drain..."
                              className="w-full bg-black/60 border border-white/5 rounded-xl px-3.5 py-2 text-xs text-zinc-300 placeholder-zinc-600 outline-none focus:border-cyan-500/25 transition-all"
                            />
                            <button
                              onClick={handleSendAiMessage}
                              className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 font-bold text-white text-xs rounded-xl transition-colors cursor-pointer shrink-0"
                            >
                              Send
                            </button>
                          </div>
                        </div>

                        {/* Quick Interactive Actions sidecard */}
                        <div className="p-5 bg-slate-950/60 border border-white/5 rounded-2xl flex flex-col justify-between text-left space-y-4">
                          <div>
                            <span className="text-[10px] font-mono text-cyan-400 font-black uppercase block">One-Tap Recommendations</span>
                            <h5 className="text-xs font-bold text-white mt-1 font-sans">Autonomous Optimizer</h5>
                            <p className="text-[8.5px] text-zinc-500 mt-1 leading-relaxed">
                              Nida is actively monitoring client state and has isolated high-efficiency adjustments. Click below to immediately execute the calibration routine.
                            </p>
                          </div>

                          <div className="space-y-3 flex-1 mt-4 overflow-y-auto pr-1">
                            {[
                              { id: 'battery', title: 'Smart Battery Saver', desc: 'Throttles background sync cycles & suspends canvas shader particles.', actionLabel: 'Enable Saver', metric: '+2.4h life' },
                              { id: 'rebuild_thumbnail', title: 'Rebuild Thumbnail Cache', desc: 'Purges stale thumbnail arrays from local session memory.', actionLabel: 'Purge & Rebuild', metric: 'Recover 41MB' },
                              { id: 'compress_media', title: 'Compress Old Video Media', desc: 'Recompresses raw historic records using high-efficiency WebP/H.265.', actionLabel: 'Defragment Space', metric: 'Recover 432MB' }
                            ].map(rec => (
                              <div key={rec.id} className="p-3 bg-black/40 border border-white/5 rounded-xl text-xs space-y-2 hover:border-cyan-500/25 transition-all">
                                <div className="flex justify-between items-center gap-1">
                                  <span className="font-bold text-zinc-300 truncate">{rec.title}</span>
                                  <span className="text-[8px] font-mono text-cyan-400 font-black shrink-0">{rec.metric}</span>
                                </div>
                                <p className="text-[8.5px] text-zinc-500 leading-snug">{rec.desc}</p>
                                <button
                                  onClick={() => executeAiAction(rec.id)}
                                  className="w-full py-1 bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/25 rounded-lg text-[9px] text-cyan-400 font-mono cursor-pointer"
                                >
                                  {rec.actionLabel}
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* 5. PERFORMANCE ANALYTICS HISTORY SUB-TAB */}
                  {performanceSubTab === 'analytics' && (
                    <div className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {[
                          { title: 'Startup Latency', current: '118 ms', target: '150 ms', desc: 'Active viewport initialization and asset catalog compilation duration.' },
                          { title: 'Dynamic Frame Rate', current: '60 FPS', target: '60 FPS', desc: 'Scrolling stability index tracked across active chat and story feeds.' },
                          { title: 'Tunnels Ping Latency', current: '24 ms', target: '40 ms', desc: 'Response cycle duration on outgoing peer-to-peer ledger sync requests.' }
                        ].map((anal, idx) => (
                          <div key={idx} className="p-4 bg-slate-950/60 border border-white/5 rounded-2xl text-left space-y-2">
                            <span className="text-[10px] font-mono text-cyan-400 font-black uppercase block">{anal.title}</span>
                            <div className="flex items-baseline gap-2">
                              <span className="text-2xl font-black text-white font-mono">{anal.current}</span>
                              <span className="text-[9px] font-mono text-zinc-500">Target: {anal.target}</span>
                            </div>
                            <p className="text-[8.5px] text-zinc-500 leading-snug border-t border-white/5 pt-2">{anal.desc}</p>
                          </div>
                        ))}
                      </div>

                      {/* Historical logs table */}
                      <div className="p-5 bg-slate-950/60 border border-white/5 rounded-2xl space-y-4 text-left">
                        <div>
                          <h5 className="text-xs font-black text-zinc-300 font-mono uppercase tracking-wider flex items-center gap-1.5">
                            <BarChart2 className="w-4 h-4 text-cyan-400" /> Historical Performance Logs
                          </h5>
                          <p className="text-[9px] text-zinc-500 mt-0.5 font-sans">Hour-by-hour telemetry summaries extracted from core logging pages.</p>
                        </div>

                        <div className="border border-white/5 rounded-xl overflow-hidden bg-black/40 overflow-x-auto">
                          <table className="w-full text-left text-[11px] font-mono min-w-[500px]">
                            <thead>
                              <tr className="bg-zinc-950/80 border-b border-white/5 text-zinc-400">
                                <th className="p-3">LOG TIMESTAMP</th>
                                <th className="p-3">STARTUP SPEED</th>
                                <th className="p-3">AVERAGE FPS</th>
                                <th className="p-3">PING LATENCY</th>
                                <th className="p-3">STATUS</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5 text-zinc-300">
                              {performanceHistory.map((row, i) => (
                                <tr key={i} className="hover:bg-white/5">
                                  <td className="p-3 font-bold">{row.name}</td>
                                  <td className="p-3 text-violet-400">{row.startup} ms</td>
                                  <td className="p-3 text-cyan-400">{row.fps} FPS</td>
                                  <td className="p-3 text-pink-400">{row.latency} ms</td>
                                  <td className="p-3">
                                    <span className="px-1.5 py-0.5 rounded text-[8px] font-black uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono">
                                      OPTIMIZED
                                    </span>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

            </div>

          </div>

          {/* Toast Container if any */}
          {isOptimizing && (
            <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center">
              <div className="text-center space-y-4">
                <RefreshCw className="w-12 h-12 text-violet-400 animate-spin mx-auto" />
                <h4 className="text-sm font-black text-white uppercase tracking-widest font-mono">Calibrating Filesystem Indices</h4>
                <p className="text-xs text-zinc-500 max-w-xs leading-relaxed">Defragmenting memory pages, reindexing database blocks, and emptying temporary socket queues.</p>
              </div>
            </div>
          )}

        </motion.div>
      </div>
    </AnimatePresence>
  );
}
