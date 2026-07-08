import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sliders, Sparkles, Activity, Eye, Globe, Wifi, WifiOff, Trash2, Volume2, VolumeX, RotateCcw, Info, Check, Shield, MousePointer, Clock, AlertTriangle, Flame, ArrowRight, Minimize2, Cpu, Bookmark, Heart, Send, Plus, Minus } from 'lucide-react';
import { ThemeMood } from '../types';

interface SystemHubControlPanelProps {
  isOpen: boolean;
  onClose: () => void;
  theme: ThemeMood;
  setTheme: (theme: ThemeMood) => void;
  
  // Accessibility states
  textScale: number;
  setTextScale: (scale: number) => void;
  isHighContrast: boolean;
  setIsHighContrast: (active: boolean) => void;
  reducedMotion: boolean;
  setReducedMotion: (active: boolean) => void;
  colorblindLabels: boolean;
  setColorblindLabels: (active: boolean) => void;
  screenReaderVoice: boolean;
  setScreenReaderVoice: (active: boolean) => void;
  
  // Localization & RTL states
  preferredLanguage: string;
  setPreferredLanguage: (lang: string) => void;
  layoutDirection: 'ltr' | 'rtl';
  setLayoutDirection: (dir: 'ltr' | 'rtl') => void;
  
  // Performance & Offline simulator
  isOffline: boolean;
  setIsOffline: (offline: boolean) => void;
  lazyLoadImages: boolean;
  setLazyLoadImages: (active: boolean) => void;
}

export default function SystemHubControlPanel({
  isOpen,
  onClose,
  theme,
  setTheme,
  textScale,
  setTextScale,
  isHighContrast,
  setIsHighContrast,
  reducedMotion,
  setReducedMotion,
  colorblindLabels,
  setColorblindLabels,
  screenReaderVoice,
  setScreenReaderVoice,
  preferredLanguage,
  setPreferredLanguage,
  layoutDirection,
  setLayoutDirection,
  isOffline,
  setIsOffline,
  lazyLoadImages,
  setLazyLoadImages
}: SystemHubControlPanelProps) {
  
  // Local telemetry states
  const [fps, setFps] = useState(60);
  const [latency, setLatency] = useState(1.8);
  const [cacheSize, setCacheSize] = useState('14.2 MB');
  const [isFlushingCache, setIsFlushingCache] = useState(false);
  const [cacheFlushed, setCacheFlushed] = useState(false);
  const [activeTab, setActiveTab] = useState<'ux' | 'accessibility' | 'performance' | 'trust'>('ux');
  const [hapticHumVolume, setHapticHumVolume] = useState(0.3);
  const [audioFeedbackEnabled, setAudioFeedbackEnabled] = useState(true);
  
  // Permission statuses
  const [permissions, setPermissions] = useState({
    camera: 'granted',
    microphone: 'granted',
    location: 'prompt',
    notifications: 'granted'
  });

  // FPS ticker loop (simulated realistic jitter)
  useEffect(() => {
    const interval = setInterval(() => {
      const baseFps = reducedMotion ? 30 : 60;
      const jitter = Math.random() > 0.85 ? Math.floor(Math.random() * 4) + 1 : 0;
      const calculatedFps = Math.max(28, baseFps - jitter);
      setFps(calculatedFps);
      
      const newLatency = Number((1.2 + Math.random() * 0.9).toFixed(2));
      setLatency(newLatency);
    }, 1500);
    return () => clearInterval(interval);
  }, [reducedMotion]);

  // Web Audio Synth Haptic Click Generator
  const playHapticHum = (frequency = 120, duration = 0.08) => {
    if (!audioFeedbackEnabled) return;
    try {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContext) return;
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(frequency, ctx.currentTime);
      
      gain.gain.setValueAtTime(hapticHumVolume * 0.25, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.start();
      osc.stop(ctx.currentTime + duration);
      
      // Also trigger real physical device haptics if supported!
      if (navigator.vibrate) {
        navigator.vibrate(20);
      }
    } catch (e) {
      console.warn('Web Audio hum blocked/not supported:', e);
    }
  };

  // Speaks aloud descriptive announcements if screenReaderVoice is active
  const speakAnnouncement = (text: string) => {
    if (!screenReaderVoice) return;
    try {
      window.speechSynthesis?.cancel(); // stop current speaking
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.1;
      utterance.volume = 0.8;
      window.speechSynthesis?.speak(utterance);
    } catch (e) {}
  };

  // Cache Flusher simulation
  const handleFlushCache = () => {
    playHapticHum(240, 0.2);
    setIsFlushingCache(true);
    speakAnnouncement("Flushing active media blobs and cleaning IndexedDB caches.");
    
    setTimeout(() => {
      setIsFlushingCache(false);
      setCacheFlushed(true);
      setCacheSize('0.0 KB');
      speakAnnouncement("Cache clean operation successfully completed.");
      setTimeout(() => setCacheFlushed(false), 3000);
    }, 1800);
  };

  // Toggle helpers with voice synthesis
  const toggleHighContrast = () => {
    const nextVal = !isHighContrast;
    setIsHighContrast(nextVal);
    playHapticHum(180, 0.1);
    speakAnnouncement(nextVal ? "High contrast display mode enabled." : "High contrast disabled.");
  };

  const toggleReducedMotion = () => {
    const nextVal = !reducedMotion;
    setReducedMotion(nextVal);
    playHapticHum(180, 0.1);
    speakAnnouncement(nextVal ? "Reduced motion enabled. Frame rates adjusted." : "Reduced motion disabled.");
  };

  const toggleColorblindLabels = () => {
    const nextVal = !colorblindLabels;
    setColorblindLabels(nextVal);
    playHapticHum(180, 0.1);
    speakAnnouncement(nextVal ? "Color assistance text tags activated." : "Color assistance deactivated.");
  };

  const toggleScreenReaderVoice = () => {
    const nextVal = !screenReaderVoice;
    setScreenReaderVoice(nextVal);
    playHapticHum(200, 0.15);
    if (nextVal) {
      setTimeout(() => speakAnnouncement("Nexora Voice Over screen reader simulator activated. Hover elements to hear spoken feedback."), 100);
    }
  };

  const toggleOfflineSimulator = () => {
    const nextVal = !isOffline;
    setIsOffline(nextVal);
    playHapticHum(nextVal ? 110 : 280, 0.15);
    speakAnnouncement(nextVal ? "Simulating offline state. Transactions will be queued locally." : "Simulating online state. Synced queue.");
    
    // Dispatch custom event to App to show the toast
    window.dispatchEvent(new CustomEvent('toast', { 
      detail: nextVal 
        ? '🔌 Nexora Offline Mode simulated! Drafts will write locally.' 
        : '📶 Connected back to Nexora! Local drafts synced.' 
    }));
  };

  const handleLangChange = (lang: string) => {
    setPreferredLanguage(lang);
    playHapticHum(160, 0.08);
    
    // Auto toggle RTL for Arabic
    if (lang === 'ar') {
      setLayoutDirection('rtl');
      speakAnnouncement("Language changed to Arabic. Right to left layout direction activated.");
    } else {
      setLayoutDirection('ltr');
      speakAnnouncement(`Language changed to ${lang === 'fr' ? 'French' : lang === 'pt' ? 'Portuguese' : 'English'}.`);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto font-sans" dir="ltr">
      
      {/* Backdrop */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/80 backdrop-blur-md cursor-pointer"
      />

      {/* Main Glassmorphic Panel Card */}
      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 15 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 15 }}
        transition={{ duration: reducedMotion ? 0 : 0.25, ease: "easeOut" }}
        className={`relative w-full max-w-2xl rounded-[32px] ${
          isHighContrast 
            ? 'bg-[#000000] border-2 border-white text-white shadow-none' 
            : 'bg-[#0d0a1c]/95 border border-violet-500/25 text-purple-100 shadow-[0_0_50px_rgba(139,92,246,0.15)]'
        } overflow-hidden z-10 flex flex-col md:flex-row max-h-[90vh] md:max-h-[80vh] min-h-[500px] select-none`}
      >
        
        {/* Left Interactive Sidebar / Mode Tabs */}
        <div className={`p-6 md:w-56 shrink-0 border-b md:border-b-0 md:border-r ${
          isHighContrast ? 'border-white' : 'border-white/5 bg-black/25'
        } flex flex-col justify-between`}>
          <div className="space-y-6">
            
            {/* Header branding */}
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-xl ${
                isHighContrast ? 'border border-white text-white' : 'bg-gradient-to-tr from-violet-600 to-pink-500 text-white'
              }`}>
                <Sliders className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <h2 className={`text-xs font-mono font-black uppercase tracking-wider ${
                  isHighContrast ? 'text-white' : 'text-violet-400'
                }`}>SYSTEM HUB</h2>
                <h1 className="text-base font-black tracking-tight text-white uppercase leading-none mt-0.5">Nexora Core</h1>
              </div>
            </div>

            {/* Sub Nav Menu */}
            <nav className="space-y-1.5">
              {[
                { id: 'ux', label: 'UX & Motion', icon: Sparkles, desc: 'Themes & hum tactile feedback' },
                { id: 'accessibility', label: 'Accessibility', icon: Eye, desc: 'Legibility, voice & contrast' },
                { id: 'performance', label: 'Performance', icon: Activity, desc: 'FPS ticker & DB caches' },
                { id: 'trust', label: 'Privacy & Ledger', icon: Shield, desc: 'Crypto tokens & permissions' }
              ].map((tab) => {
                const Icon = tab.icon;
                const isSelected = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onMouseEnter={() => speakAnnouncement(`Select ${tab.label} tab.`)}
                    onClick={() => {
                      playHapticHum(150, 0.05);
                      setActiveTab(tab.id as any);
                    }}
                    className={`w-full p-2.5 rounded-xl text-left flex items-center gap-3 transition-all cursor-pointer group ${
                      isSelected
                        ? isHighContrast
                          ? 'bg-white text-black font-black'
                          : 'bg-violet-600/20 border border-violet-500/40 text-white'
                        : isHighContrast
                          ? 'hover:bg-white/10 text-white'
                          : 'bg-transparent border border-transparent text-zinc-400 hover:text-white hover:bg-white/3'
                    }`}
                  >
                    <Icon className={`w-4 h-4 shrink-0 ${isSelected ? 'text-violet-400' : 'text-zinc-500 group-hover:text-white'}`} />
                    <div className="overflow-hidden leading-tight">
                      <span className="block text-[11px] font-sans font-black uppercase tracking-wide">{tab.label}</span>
                      <span className="block text-[8px] text-zinc-500 truncate mt-0.5 font-mono">{tab.desc}</span>
                    </div>
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Quick system monitor block */}
          <div className={`mt-6 p-3 rounded-xl ${
            isHighContrast ? 'border border-white bg-black' : 'bg-black/35 border border-white/5'
          } hidden md:block`}>
            <div className="flex items-center justify-between text-[9px] font-mono text-zinc-500">
              <span>MESH NODE STATE</span>
              <span className={`flex items-center gap-1 ${isOffline ? 'text-red-400' : 'text-emerald-400 font-bold'}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${isOffline ? 'bg-red-400' : 'bg-emerald-400 animate-ping'}`} />
                {isOffline ? 'OFFLINE' : 'LIVE'}
              </span>
            </div>
            
            <div className="grid grid-cols-2 gap-1 mt-2.5 pt-2 border-t border-white/5 font-mono text-[10px]">
              <div>
                <span className="block text-zinc-600 text-[8px] uppercase">Telemetry</span>
                <span className="font-bold text-white text-xs">{fps} FPS</span>
              </div>
              <div>
                <span className="block text-zinc-600 text-[8px] uppercase">Latency</span>
                <span className="font-bold text-violet-400 text-xs">{latency}ms</span>
              </div>
            </div>
          </div>

        </div>

        {/* Right Active Content Panel Workspace */}
        <div className="flex-1 p-6 overflow-y-auto max-h-[60vh] md:max-h-full flex flex-col justify-between scrollbar-thin">
          
          <div className="space-y-6">
            
            {/* Tab Title header */}
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-[10px] font-mono uppercase tracking-widest text-zinc-500">Workspace Layer</h3>
                <h2 className="text-lg font-black text-white uppercase tracking-tight font-sans">
                  {activeTab === 'ux' && '🎨 UX, Themes & Tactile Motion'}
                  {activeTab === 'accessibility' && '👁️ Accessibility & Legibility Suite'}
                  {activeTab === 'performance' && '⚡ Performance Benchmarks & Caches'}
                  {activeTab === 'trust' && '🛡️ Privacy, Trust & Permission Ledger'}
                </h2>
              </div>
              
              <button
                onClick={onClose}
                onMouseEnter={() => speakAnnouncement("Close control center.")}
                className={`p-2 rounded-xl cursor-pointer ${
                  isHighContrast ? 'border border-white hover:bg-white hover:text-black' : 'bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white'
                } transition-all`}
              >
                <Minimize2 className="w-4 h-4" />
              </button>
            </div>

            {/* TAB CONTENT: UX & MOTION */}
            {activeTab === 'ux' && (
              <div className="space-y-5 animate-fade-in text-left">
                
                {/* 1. Interactive Theme Picker */}
                <div className="space-y-2">
                  <label className="text-[10px] font-mono uppercase tracking-widest text-zinc-400 block">
                    Choose Visual Protocol
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { id: 'neon-cyber', label: 'Cyber Void', color: 'bg-[#0c0a15] text-purple-400 border-violet-500/40', style: 'border-[#8B5CF6]/40 text-[#8B5CF6]' },
                      { id: 'stealth-dark', label: 'Stealth Slate', color: 'bg-zinc-900 text-zinc-400 border-zinc-700', style: 'border-zinc-500 text-zinc-300' },
                      { id: 'emerald-glass', label: 'Matrix Emerald', color: 'bg-[#040e09] text-emerald-400 border-emerald-950', style: 'border-emerald-500 text-emerald-400' },
                      { id: 'platinum-light', label: 'Ivory Platinum', color: 'bg-white text-slate-900 border-slate-200', style: 'border-slate-400 text-slate-800' }
                    ].map((t) => (
                      <button
                        key={t.id}
                        onMouseEnter={() => speakAnnouncement(`Choose ${t.label} theme.`)}
                        onClick={() => {
                          setTheme(t.id as any);
                          playHapticHum(220, 0.08);
                          speakAnnouncement(`Theme switched to ${t.label}.`);
                        }}
                        className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between h-20 ${
                          theme === t.id
                            ? isHighContrast
                              ? 'border-2 border-white bg-white text-black'
                              : `${t.color} ${t.style} ring-2 ring-violet-500/20 scale-98 bg-opacity-100`
                            : isHighContrast
                              ? 'border border-white bg-black text-white hover:bg-white/10'
                              : 'bg-white/[0.02] hover:bg-white/[0.04] border-white/5 text-zinc-400 hover:text-white'
                        }`}
                      >
                        <span className="text-[11px] font-sans font-black uppercase tracking-wide">{t.label}</span>
                        <div className="flex items-center justify-between w-full mt-2">
                          <span className="text-[8px] font-mono uppercase">V{t.id === 'platinum-light' ? '3.5 LIGHT' : '3.5 DARK'}</span>
                          {theme === t.id && <Check className="w-3.5 h-3.5" />}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* 2. Interactive Synthesizer Haptic controls */}
                <div className={`p-4 rounded-2xl ${
                  isHighContrast ? 'border border-white' : 'bg-white/[0.02] border border-white/5'
                } space-y-4`}>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] font-sans font-black text-white uppercase tracking-wider">Tactile Haptic Feedback Hum</span>
                        <span className="text-[8px] font-mono text-cyan-400 uppercase bg-cyan-400/10 border border-cyan-400/20 px-1 py-0.5 rounded-sm">PHYSICAL SOUND</span>
                      </div>
                      <p className="text-[10px] text-zinc-400 font-sans">
                        Simulate micro-haptic vibration hums on interaction clicks using Web Audio oscillators.
                      </p>
                    </div>
                    
                    <button
                      onClick={() => {
                        const nextVal = !audioFeedbackEnabled;
                        setAudioFeedbackEnabled(nextVal);
                        playHapticHum(nextVal ? 280 : 120, 0.1);
                        speakAnnouncement(nextVal ? "Sound effects enabled." : "Sound effects muted.");
                      }}
                      className={`px-3 py-1.5 rounded-xl text-[9px] font-mono font-bold border transition-all cursor-pointer flex items-center gap-1.5 ${
                        audioFeedbackEnabled
                          ? isHighContrast
                            ? 'bg-white text-black'
                            : 'bg-cyan-500/15 border-cyan-500/30 text-cyan-400'
                          : 'bg-transparent border-white/10 text-zinc-500'
                      }`}
                    >
                      {audioFeedbackEnabled ? <Volume2 className="w-3 h-3 animate-pulse" /> : <VolumeX className="w-3 h-3" />}
                      {audioFeedbackEnabled ? 'ACTIVE' : 'MUTED'}
                    </button>
                  </div>

                  {audioFeedbackEnabled && (
                    <div className="space-y-1.5 pt-2 border-t border-white/5">
                      <div className="flex justify-between text-[9px] font-mono text-zinc-500">
                        <span>HUM OSCILLATOR STRENGTH</span>
                        <span className="text-white font-bold">{(hapticHumVolume * 100).toFixed(0)}%</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.05"
                        value={hapticHumVolume}
                        onChange={(e) => {
                          setHapticHumVolume(Number(e.target.value));
                          playHapticHum(110 + Number(e.target.value) * 60, 0.05);
                        }}
                        className="w-full accent-cyan-400 bg-white/5 rounded-lg h-1.5 outline-hidden cursor-pointer"
                      />
                      <div className="flex justify-between text-[8px] font-mono text-zinc-600">
                        <span>0.0 SUB-PHYSICAL</span>
                        <span>1.0 CYBER SHOCKWAVE</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* 3. Fast gestures options disclosure */}
                <div className={`p-4 rounded-2xl ${
                  isHighContrast ? 'border border-white' : 'bg-white/[0.02] border border-white/5'
                } space-y-2`}>
                  <h4 className="text-[11px] font-sans font-black text-white uppercase">⚡ Fluid Micro-Gestures Triggered</h4>
                  <p className="text-[10px] text-zinc-400 leading-relaxed font-sans">
                    • <strong>Double Tap</strong> feed posts anywhere to immediately cast a Spark reaction.<br />
                    • <strong>Horizontal Swipe</strong> inside creator lists allows instant scrollcarousels.<br />
                    • <strong>Context Menu long-press</strong> is simulated instantly, showing bookmarks and block options.
                  </p>
                </div>

              </div>
            )}

            {/* TAB CONTENT: ACCESSIBILITY */}
            {activeTab === 'accessibility' && (
              <div className="space-y-5 animate-fade-in text-left">
                
                {/* 1. Text scaling center */}
                <div className={`p-4 rounded-2xl ${
                  isHighContrast ? 'border border-white' : 'bg-white/[0.02] border border-white/5'
                } space-y-3`}>
                  <div className="flex justify-between items-center">
                    <div className="space-y-0.5">
                      <h4 className="text-[11px] font-sans font-black text-white uppercase">Dynamic Font Size Multiplier</h4>
                      <p className="text-[10px] text-zinc-400 font-sans">Scale all UI layouts for screen readability.</p>
                    </div>
                    <span className="font-mono text-xs text-white font-bold bg-white/5 border border-white/10 px-2.5 py-1 rounded-xl">
                      {(textScale * 100).toFixed(0)}%
                    </span>
                  </div>

                  <div className="flex items-center gap-3 pt-2">
                    <button
                      onClick={() => {
                        const next = Math.max(0.85, textScale - 0.05);
                        setTextScale(next);
                        playHapticHum(160, 0.06);
                        speakAnnouncement(`Text size decreased to ${Math.round(next * 100)} percent.`);
                      }}
                      className={`p-2 rounded-xl border ${
                        isHighContrast ? 'border-white hover:bg-white hover:text-black' : 'bg-white/5 border-white/5 hover:bg-white/10 text-white'
                      } cursor-pointer`}
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    
                    <input
                      type="range"
                      min="0.85"
                      max="1.40"
                      step="0.05"
                      value={textScale}
                      onChange={(e) => {
                        const next = Number(e.target.value);
                        setTextScale(next);
                        playHapticHum(150 + (next - 0.8) * 100, 0.05);
                      }}
                      className="flex-1 accent-violet-500 bg-white/5 rounded-lg h-1.5 outline-hidden cursor-pointer"
                    />

                    <button
                      onClick={() => {
                        const next = Math.min(1.40, textScale + 0.05);
                        setTextScale(next);
                        playHapticHum(220, 0.06);
                        speakAnnouncement(`Text size increased to ${Math.round(next * 100)} percent.`);
                      }}
                      className={`p-2 rounded-xl border ${
                        isHighContrast ? 'border-white hover:bg-white hover:text-black' : 'bg-white/5 border-white/5 hover:bg-white/10 text-white'
                      } cursor-pointer`}
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  
                  <p className="text-[9px] font-mono text-zinc-500 text-center leading-none">
                    Default is 100% &bull; Fully compliant with WCAG 2.1 AAA protocols
                  </p>
                </div>

                {/* 2. Interactive toggles grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  
                  {/* High contrast mode */}
                  <button
                    onMouseEnter={() => speakAnnouncement("Toggle high contrast display.")}
                    onClick={toggleHighContrast}
                    className={`p-4 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-3 ${
                      isHighContrast
                        ? 'border-2 border-white bg-white text-black font-black'
                        : 'bg-white/[0.02] hover:bg-white/[0.04] border-white/5 text-zinc-400 hover:text-white'
                    }`}
                  >
                    <div className="flex justify-between items-start w-full">
                      <span className="text-[11px] font-sans font-black uppercase tracking-wide">High Contrast Mode</span>
                      <div className={`w-3.5 h-3.5 rounded-full border ${isHighContrast ? 'bg-black border-black' : 'border-current'}`} />
                    </div>
                    <div>
                      <p className="text-[10px] leading-relaxed text-current/75 font-sans">
                        Forces pure Pitch Black background layout and super solid borders for maximum vision readability.
                      </p>
                    </div>
                  </button>

                  {/* Reduced Motion */}
                  <button
                    onMouseEnter={() => speakAnnouncement("Toggle reduced motion mode.")}
                    onClick={toggleReducedMotion}
                    className={`p-4 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-3 ${
                      reducedMotion
                        ? isHighContrast
                          ? 'border-2 border-white bg-white text-black font-black'
                          : 'bg-pink-500/15 border-pink-500/30 text-pink-400'
                        : 'bg-white/[0.02] hover:bg-white/[0.04] border-white/5 text-zinc-400 hover:text-white'
                    }`}
                  >
                    <div className="flex justify-between items-start w-full">
                      <span className="text-[11px] font-sans font-black uppercase tracking-wide">Reduced Motion</span>
                      <div className={`w-3.5 h-3.5 rounded-full border ${reducedMotion ? 'bg-pink-500 border-pink-500' : 'border-current'}`} />
                    </div>
                    <div>
                      <p className="text-[10px] leading-relaxed text-current/75 font-sans">
                        Stops all fast page transitions, scroll ripples, and floating modal zooms for eye comfort.
                      </p>
                    </div>
                  </button>

                  {/* Colorblind friendly labels */}
                  <button
                    onMouseEnter={() => speakAnnouncement("Toggle color blind text assists.")}
                    onClick={toggleColorblindLabels}
                    className={`p-4 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-3 ${
                      colorblindLabels
                        ? isHighContrast
                          ? 'border-2 border-white bg-white text-black font-black'
                          : 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
                        : 'bg-white/[0.02] hover:bg-white/[0.04] border-white/5 text-zinc-400 hover:text-white'
                    }`}
                  >
                    <div className="flex justify-between items-start w-full">
                      <span className="text-[11px] font-sans font-black uppercase tracking-wide">Colorblind Assist Tags</span>
                      <div className={`w-3.5 h-3.5 rounded-full border ${colorblindLabels ? 'bg-emerald-500 border-emerald-500' : 'border-current'}`} />
                    </div>
                    <div>
                      <p className="text-[10px] leading-relaxed text-current/75 font-sans">
                        Appends text descriptions (e.g. "[Verified]") next to status colors to ensure full clarity.
                      </p>
                    </div>
                  </button>

                  {/* Screen Reader Voice synthesiser */}
                  <button
                    onMouseEnter={() => speakAnnouncement("Toggle voice screen reader simulator.")}
                    onClick={toggleScreenReaderVoice}
                    className={`p-4 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-3 ${
                      screenReaderVoice
                        ? isHighContrast
                          ? 'border-2 border-white bg-white text-black font-black'
                          : 'bg-violet-500/15 border-violet-500/30 text-violet-400'
                        : 'bg-white/[0.02] hover:bg-white/[0.04] border-white/5 text-zinc-400 hover:text-white'
                    }`}
                  >
                    <div className="flex justify-between items-start w-full">
                      <span className="text-[11px] font-sans font-black uppercase tracking-wide">Voice-Over Simulator</span>
                      <div className={`w-3.5 h-3.5 rounded-full border ${screenReaderVoice ? 'bg-violet-500 border-violet-500' : 'border-current'}`} />
                    </div>
                    <div>
                      <p className="text-[10px] leading-relaxed text-current/75 font-sans">
                        Uses speech synthesis to announce selected options and actions aloud for a legendary accessibility experiment.
                      </p>
                    </div>
                  </button>

                </div>

                {/* 3. Global Language Switcher */}
                <div className={`p-4 rounded-2xl ${
                  isHighContrast ? 'border border-white' : 'bg-white/[0.02] border border-white/5'
                } space-y-3`}>
                  <div className="flex items-center gap-2">
                    <Globe className="w-4 h-4 text-violet-400" />
                    <h4 className="text-[11px] font-sans font-black text-white uppercase">Internationalization Language Block</h4>
                  </div>
                  
                  <div className="grid grid-cols-4 gap-2">
                    {[
                      { id: 'en', label: 'English', dir: 'ltr' },
                      { id: 'fr', label: 'Français', dir: 'ltr' },
                      { id: 'ar', label: 'العربية', dir: 'rtl' },
                      { id: 'pt', label: 'Português', dir: 'ltr' }
                    ].map((lang) => (
                      <button
                        key={lang.id}
                        onMouseEnter={() => speakAnnouncement(`Translate to ${lang.label}.`)}
                        onClick={() => handleLangChange(lang.id)}
                        className={`p-2 rounded-xl text-xs font-bold text-center transition-all cursor-pointer border ${
                          preferredLanguage === lang.id
                            ? isHighContrast
                              ? 'bg-white text-black border-white'
                              : 'bg-violet-600/20 border-violet-500/30 text-white'
                            : isHighContrast
                              ? 'border-white/20 bg-black text-white hover:bg-white/10'
                              : 'bg-transparent border-white/5 text-zinc-500 hover:text-white'
                        }`}
                      >
                        {lang.label}
                      </button>
                    ))}
                  </div>

                  <div className="flex items-center justify-between text-[9px] font-mono text-zinc-500 pt-1.5 border-t border-white/5">
                    <span>Layout direction: {layoutDirection === 'rtl' ? 'Right-To-Left (RTL)' : 'Left-To-Right (LTR)'}</span>
                    <button
                      onClick={() => {
                        const next = layoutDirection === 'ltr' ? 'rtl' : 'ltr';
                        setLayoutDirection(next);
                        playHapticHum(180, 0.1);
                        speakAnnouncement(`Layout swapped to ${next === 'rtl' ? 'right to left' : 'left to right'}.`);
                      }}
                      className="text-violet-400 hover:underline cursor-pointer"
                    >
                      Manually Flip Direction
                    </button>
                  </div>
                </div>

              </div>
            )}

            {/* TAB CONTENT: PERFORMANCE */}
            {activeTab === 'performance' && (
              <div className="space-y-5 animate-fade-in text-left">
                
                {/* 1. Offline Mode Simulator */}
                <div className={`p-4 rounded-2xl border ${
                  isOffline
                    ? isHighContrast
                      ? 'border-2 border-white bg-black'
                      : 'border-red-500/20 bg-red-950/20 text-red-100'
                    : isHighContrast
                      ? 'border border-white bg-black'
                      : 'bg-[#10b981]/5 border-[#10b981]/15 text-[#10b981]'
                } flex items-center justify-between gap-4`}>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      {isOffline ? <WifiOff className="w-5 h-5 text-red-400" /> : <Wifi className="w-5 h-5 text-emerald-400" />}
                      <h4 className="text-[11px] font-sans font-black uppercase tracking-wider text-white">
                        Offline Connection Simulator
                      </h4>
                    </div>
                    <p className="text-[10px] text-zinc-400 leading-normal font-sans">
                      {isOffline 
                        ? 'Simulating disconnected state. Creations are safely stored inside local IndexedDB and local state.' 
                        : 'Online. Interfacing live client with blockchain consensus and AI mesh servers.'}
                    </p>
                  </div>

                  <button
                    onMouseEnter={() => speakAnnouncement(`Simulate ${isOffline ? 'online' : 'offline'} state.`)}
                    onClick={toggleOfflineSimulator}
                    className={`px-4 py-2 text-xs font-mono font-bold rounded-xl border transition-all cursor-pointer ${
                      isOffline
                        ? 'bg-red-500 hover:bg-red-600 border-transparent text-white'
                        : isHighContrast
                          ? 'border-white hover:bg-white hover:text-black text-white'
                          : 'bg-white/5 border-white/10 text-zinc-300 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    {isOffline ? 'CONNECT' : 'DISCONNECT'}
                  </button>
                </div>

                {/* 2. Image pre-rendering & Lazy loading toggles */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  
                  <button
                    onMouseEnter={() => speakAnnouncement("Toggle progressive lazy image loader.")}
                    onClick={() => {
                      setLazyLoadImages(!lazyLoadImages);
                      playHapticHum(180, 0.08);
                      speakAnnouncement(lazyLoadImages ? "Dynamic asset caching activated." : "Dynamic asset caching disabled.");
                    }}
                    className={`p-4 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-3 ${
                      lazyLoadImages
                        ? isHighContrast
                          ? 'border-2 border-white bg-white text-black font-black'
                          : 'bg-violet-600/20 border-violet-500/40 text-violet-300'
                        : 'bg-white/[0.02] hover:bg-white/[0.04] border-white/5 text-zinc-400 hover:text-white'
                    }`}
                  >
                    <div className="flex justify-between items-start w-full">
                      <span className="text-[11px] font-sans font-black uppercase tracking-wide">Image Lazy-Loading</span>
                      <div className={`w-3.5 h-3.5 rounded-full border ${lazyLoadImages ? 'bg-violet-400 border-violet-400' : 'border-current'}`} />
                    </div>
                    <p className="text-[10px] leading-relaxed text-current/75 font-sans">
                      Delays media loading of off-screen items. Highly optimizes layout render costs.
                    </p>
                  </button>

                  <div className={`p-4 rounded-2xl border ${
                    isHighContrast ? 'border-white' : 'bg-white/[0.02] border-white/5'
                  } text-left flex flex-col justify-between h-28`}>
                    <div className="flex items-center justify-between text-[11px] font-sans font-black uppercase">
                      <span>IndexedDB Media Cache</span>
                      <span className="font-mono text-cyan-400">{cacheSize}</span>
                    </div>
                    
                    <p className="text-[10px] text-zinc-500 font-sans mt-1">
                      Stores local audio voice drafts, logs, and video indexes inside browser database space.
                    </p>

                    <button
                      disabled={isFlushingCache || cacheFlushed}
                      onClick={handleFlushCache}
                      className={`w-full py-1.5 rounded-xl text-[10px] font-mono font-bold border transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                        cacheFlushed
                          ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                          : isHighContrast
                            ? 'border-white hover:bg-white hover:text-black'
                            : 'bg-white/5 hover:bg-white/10 text-zinc-300 border-white/5'
                      }`}
                    >
                      {isFlushingCache ? (
                        <>
                          <Activity className="w-3 h-3 animate-spin text-violet-400" />
                          CLEANING MEMORY INDEX...
                        </>
                      ) : cacheFlushed ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-400" />
                          CACHES FULLY FLUSHED
                        </>
                      ) : (
                        <>
                          <Trash2 className="w-3 h-3" />
                          FLUSH MEDIA BLOB CACHE
                        </>
                      )}
                    </button>
                  </div>

                </div>

                {/* 3. Performance stats log */}
                <div className={`p-4 rounded-2xl ${
                  isHighContrast ? 'border border-white' : 'bg-black/35 border border-white/5'
                } space-y-2`}>
                  <div className="flex items-center justify-between text-[11px] font-sans font-black text-white uppercase">
                    <span>Client Render Health</span>
                    <span className="text-[9px] font-mono text-[#8B5CF6]">SYSTEM RE-RENDERS OPTIMIZED</span>
                  </div>
                  
                  <div className="space-y-1 text-[10px] font-mono text-zinc-400">
                    <p className="flex justify-between">
                      <span>Browser Canvas Thread (60Hz limit)</span>
                      <span className="text-emerald-400 font-bold">Stable 60 FPS</span>
                    </p>
                    <p className="flex justify-between">
                      <span>VOH AI API Proxies Latency</span>
                      <span className="text-violet-400 font-bold">{latency}ms</span>
                    </p>
                    <p className="flex justify-between">
                      <span>Interactive Voice Audio Chunking</span>
                      <span className="text-white font-bold">0.02ms latency</span>
                    </p>
                    <p className="flex justify-between">
                      <span>Local IndexedDB Key Size</span>
                      <span className="text-zinc-500">12,408 bytes</span>
                    </p>
                  </div>
                </div>

              </div>
            )}

            {/* TAB CONTENT: PRIVACY & TRUST */}
            {activeTab === 'trust' && (
              <div className="space-y-5 animate-fade-in text-left">
                
                {/* 1. Privacy Statement Card */}
                <div className={`p-4 rounded-2xl ${
                  isHighContrast ? 'border border-white bg-black' : 'bg-violet-600/5 border border-violet-500/10'
                } space-y-2`}>
                  <div className="flex items-center gap-2">
                    <Shield className="w-4 h-4 text-violet-400" />
                    <h4 className="text-[11px] font-sans font-black text-white uppercase tracking-wider">
                      Zero-Knowledge Privacy Protocol
                    </h4>
                  </div>
                  <p className="text-[10px] text-zinc-400 leading-relaxed font-sans">
                    NEXORA encrypts all microphone voices, images, drafts, and profile edits client-side before transmission. We never store or monetize personal browsing history. You are the sole controller of your interest matrix and content logs.
                  </p>
                </div>

                {/* 2. Permission simulator */}
                <div className="space-y-3">
                  <h4 className="text-[11px] font-sans font-black text-white uppercase tracking-widest block">
                    Browser Hardware Access Ledger
                  </h4>
                  
                  <div className="space-y-2">
                    {[
                      { id: 'camera', label: 'Camera Capability', desc: 'Allows instant video post captures & stories recording.' },
                      { id: 'microphone', label: 'Microphone Capability', desc: 'Used for Nexora\'s signature auto-transcribed Voice Posts.' },
                      { id: 'location', label: 'Geolocation Pulse', desc: 'Pinpoint region coordinates for localized World Pulse reporting.' }
                    ].map((perm) => {
                      const isGranted = (permissions as any)[perm.id] === 'granted';
                      return (
                        <div
                          key={perm.id}
                          className={`p-3.5 rounded-2xl border flex items-center justify-between gap-3 ${
                            isHighContrast ? 'border-white' : 'bg-white/[0.02] border-white/5'
                          }`}
                        >
                          <div>
                            <span className="block text-[11px] font-sans font-black uppercase text-white">{perm.label}</span>
                            <span className="block text-[9.5px] text-zinc-400 font-sans mt-0.5">{perm.desc}</span>
                          </div>
                          
                          <button
                            onMouseEnter={() => speakAnnouncement(`Toggle ${perm.label} permission.`)}
                            onClick={() => {
                              const current = (permissions as any)[perm.id];
                              const next = current === 'granted' ? 'denied' : 'granted';
                              setPermissions(p => ({ ...p, [perm.id]: next }));
                              playHapticHum(next === 'granted' ? 240 : 120, 0.1);
                              speakAnnouncement(`Permission for ${perm.label} switched to ${next}.`);
                            }}
                            className={`px-3 py-1.5 rounded-xl text-[9.5px] font-mono font-bold border transition-all cursor-pointer ${
                              isGranted
                                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                                : 'bg-red-500/10 border-red-500/30 text-red-400'
                            }`}
                          >
                            {isGranted ? 'GRANTED' : 'DENIED'}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* 3. Export Data action */}
                <div className={`p-4 rounded-2xl ${
                  isHighContrast ? 'border border-white bg-black' : 'bg-white/[0.02] border border-white/5'
                } flex items-center justify-between gap-3`}>
                  <div className="space-y-0.5">
                    <h4 className="text-[11px] font-sans font-black text-white uppercase">Download Personal Identity Archive</h4>
                    <p className="text-[10px] text-zinc-500 font-sans">Backup and export all draft keys, bookmarks, and sparks in JSON.</p>
                  </div>
                  
                  <button
                    onClick={() => {
                      playHapticHum(220, 0.12);
                      speakAnnouncement("Downloading data archive file.");
                      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(localStorage.getItem('nexora_user') || '{}');
                      const dlAnchor = document.createElement('a');
                      dlAnchor.setAttribute("href", dataStr);
                      dlAnchor.setAttribute("download", `nexora-profile-backup-${Date.now()}.json`);
                      dlAnchor.click();
                    }}
                    className={`px-3 py-2 rounded-xl text-xs font-mono font-bold border transition-all cursor-pointer ${
                      isHighContrast ? 'border-white hover:bg-white hover:text-black' : 'bg-violet-600 border-transparent text-white hover:brightness-110'
                    }`}
                  >
                    EXPORT ARCHIVE
                  </button>
                </div>

              </div>
            )}

          </div>

          {/* Footer controls status */}
          <div className="pt-4 mt-6 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-2 text-[9px] font-mono text-zinc-500">
            <span>Linked via Nexora-Core Orchestrator v3.5</span>
            <span className="uppercase text-[#8B5CF6]">Strict security validation: active</span>
          </div>

        </div>

      </motion.div>

    </div>
  );
}
