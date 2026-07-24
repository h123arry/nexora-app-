import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Phone, Video, PhoneOff, VolumeX, Volume2, Mic, MicOff, Camera, 
  Sparkles, UserPlus, Grid, X, ArrowLeft, Heart, Smile, Wifi, 
  RefreshCw, Layers, ShieldAlert, MonitorUp, Eye, Sliders, 
  ChevronDown, HelpCircle, GripVertical, Check, MessageSquare, 
  Maximize2, Minimize2, Sparkle, AlertTriangle, UserMinus, Shield
} from 'lucide-react';
import { User, ExtendedMessage } from '../types';

interface Participant {
  id: string;
  name: string;
  username: string;
  avatar: string;
  isSpeaking: boolean;
  isVideoEnabled: boolean;
  isMuted: boolean;
}

interface CallScreenProps {
  isOpen: boolean;
  type: 'voice' | 'video';
  direction: 'incoming' | 'outgoing';
  partnerName: string;
  partnerAvatar: string;
  partnerUsername?: string;
  onClose: (completedDuration: string, endState: 'completed' | 'missed' | 'declined') => void;
  currentUser: User;
  onSendMessage?: (content: string) => void;
}

export default function CallScreen({
  isOpen,
  type,
  direction,
  partnerName,
  partnerAvatar,
  partnerUsername = `@${partnerName.toLowerCase().replace(/\s+/g, '_')}_cyber`,
  onClose,
  currentUser,
  onSendMessage
}: CallScreenProps) {
  
  // Call State machine
  // incoming starts as 'ringing' (incoming_ringing)
  // outgoing starts as 'calling' -> 'connecting' -> 'ringing' -> 'active'
  const [callState, setCallState] = useState<'calling' | 'connecting' | 'ringing' | 'active' | 'ended'>('calling');
  const [callTimer, setCallTimer] = useState(0);
  
  // Audio / Video device states
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeaker, setIsSpeaker] = useState(true);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isCameraFlipped, setIsCameraFlipped] = useState(false);
  const [isBeautyFilter, setIsBeautyFilter] = useState(false);
  
  // Network simulation states
  const [networkQuality, setNetworkQuality] = useState<'excellent' | 'poor' | 'reconnecting'>('excellent');
  
  // Draggable floating PIP corner for local camera stream
  // 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'
  const [localCameraCorner, setLocalCameraCorner] = useState<'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'>('top-right');
  const [isDraggingLocalCamera, setIsDraggingLocalCamera] = useState(false);
  
  // Controls overlay auto-hide timer for video calls
  const [controlsVisible, setControlsVisible] = useState(true);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // In-App Picture-in-Picture mode (Minimized state)
  const [isMiniPip, setIsMiniPip] = useState(false);

  // Quick Reply drawer/bottom sheet
  const [quickReplyOpen, setQuickReplyOpen] = useState(false);

  // Group call participants simulation
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [activeSpeakerId, setActiveSpeakerId] = useState<string>('partner');

  // Swipe gesture variables for answering/declining
  const [swipeOffset, setSwipeOffset] = useState(0);
  const swipeTrackRef = useRef<HTMLDivElement>(null);

  // Initialize and state transitions
  useEffect(() => {
    if (!isOpen) {
      setCallState('calling');
      setCallTimer(0);
      setNetworkQuality('excellent');
      setIsMiniPip(false);
      setParticipants([]);
      return;
    }

    if (direction === 'incoming') {
      setCallState('ringing'); // Incoming call directly ring
    } else {
      // Outgoing call sequence: Calling -> Connecting -> Ringing -> Active
      setCallState('calling');
      
      const toConnecting = setTimeout(() => {
        setCallState('connecting');
      }, 1500);

      const toRinging = setTimeout(() => {
        setCallState('ringing');
      }, 3000);

      const toActive = setTimeout(() => {
        setCallState('active');
      }, 5000);

      return () => {
        clearTimeout(toConnecting);
        clearTimeout(toRinging);
        clearTimeout(toActive);
      };
    }
  }, [isOpen, direction]);

  // Call active timer
  useEffect(() => {
    if (callState !== 'active' || !isOpen) return;

    const timer = setInterval(() => {
      setCallTimer(prev => prev + 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [callState, isOpen]);

  // Network quality fluctuation simulation
  // Every 12 seconds, fluctuate connection to poor for 4 seconds to show high-fidelity banners
  useEffect(() => {
    if (callState !== 'active' || !isOpen) return;

    const interval = setInterval(() => {
      setNetworkQuality('poor');
      
      const recovery = setTimeout(() => {
        setNetworkQuality('reconnecting');
        
        const restored = setTimeout(() => {
          setNetworkQuality('excellent');
        }, 2000);
        
        return () => clearTimeout(restored);
      }, 3500);

      return () => clearTimeout(recovery);
    }, 15000);

    return () => clearInterval(interval);
  }, [callState, isOpen]);

  // Active speaker shifting simulation for Group Calls
  useEffect(() => {
    if (participants.length === 0 || callState !== 'active') return;

    const speakerInterval = setInterval(() => {
      const allIds = ['partner', ...participants.map(p => p.id)];
      const randomId = allIds[Math.floor(Math.random() * allIds.length)];
      setActiveSpeakerId(randomId);
    }, 4500);

    return () => clearInterval(speakerInterval);
  }, [participants, callState]);

  // Auto hide controls for video call
  const resetControlsTimer = () => {
    if (type !== 'video' || callState !== 'active') return;
    setControlsVisible(true);
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    controlsTimeoutRef.current = setTimeout(() => {
      setControlsVisible(false);
    }, 4000);
  };

  useEffect(() => {
    if (type === 'video' && callState === 'active') {
      resetControlsTimer();
    }
    return () => {
      if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    };
  }, [type, callState]);

  // Format Call Timer
  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Quick reply messages list
  const quickReplies = [
    "Busy right now, will call you back shortly.",
    "In a secure meeting, can't talk right now.",
    "Can't talk now. Message me instead.",
    "I'll call you back in 10 minutes.",
    "Custom response..."
  ];

  const handleQuickReply = (messageText: string) => {
    if (onSendMessage) {
      onSendMessage(`[Quick Reply] ${messageText}`);
    } else {
      window.dispatchEvent(new CustomEvent('toast', { detail: `💬 Quick reply sent: "${messageText}"` }));
    }
    setQuickReplyOpen(false);
    handleDecline();
  };

  const handleAccept = () => {
    setCallState('active');
    if (navigator.vibrate) navigator.vibrate([40, 40]);
    window.dispatchEvent(new CustomEvent('toast', { detail: "📞 Secure Call Connected" }));
  };

  const handleDecline = () => {
    if (navigator.vibrate) navigator.vibrate(80);
    onClose('00:00', 'declined');
  };

  const handleHangUp = () => {
    if (navigator.vibrate) navigator.vibrate(50);
    onClose(formatTimer(callTimer), 'completed');
  };

  const handleAddParticipant = () => {
    if (participants.length >= 3) {
      window.dispatchEvent(new CustomEvent('toast', { detail: "🔒 Participant capacity limit reached." }));
      return;
    }

    const availableUsers = [
      {
        id: 'alex',
        name: 'Alex Mercer',
        username: '@alex_mercer',
        avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200',
        isSpeaking: false,
        isVideoEnabled: true,
        isMuted: false
      },
      {
        id: 'sarah',
        name: 'Sarah Connor',
        username: '@sarah_c',
        avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=200',
        isSpeaking: false,
        isVideoEnabled: true,
        isMuted: false
      },
      {
        id: 'marcus',
        name: 'Marcus Aurelius',
        username: '@marcus_stoic',
        avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200',
        isSpeaking: false,
        isVideoEnabled: false,
        isMuted: true
      }
    ];

    const nextParticipant = availableUsers[participants.length];
    if (nextParticipant) {
      setParticipants(prev => [...prev, nextParticipant]);
      window.dispatchEvent(new CustomEvent('toast', { detail: `👤 Added ${nextParticipant.name} to the group call` }));
    }
  };

  // Interactive Long Press state for group participants
  const [selectedGroupParticipant, setSelectedGroupParticipant] = useState<Participant | null>(null);

  if (!isOpen) return null;

  // Render Pip position classes
  const getPipCornerClass = () => {
    switch (localCameraCorner) {
      case 'top-left': return 'top-4 left-4';
      case 'top-right': return 'top-4 right-4';
      case 'bottom-left': return 'bottom-24 left-4';
      case 'bottom-right': return 'bottom-24 right-4';
    }
  };

  // Render in-app PiP mode (Floating call bubble widget)
  if (isMiniPip) {
    return (
      <motion.div
        drag
        dragMomentum={false}
        initial={{ scale: 0.8, opacity: 0, y: 100 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        className="fixed bottom-20 right-4 w-60 bg-[#0c0926]/95 border-2 border-violet-500/40 rounded-2xl z-50 p-3 shadow-2xl flex flex-col justify-between cursor-move select-none"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="relative">
              <img src={partnerAvatar} alt={partnerName} className="w-9 h-9 rounded-xl object-cover border border-violet-500/20" />
              <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-violet-600 rounded-full flex items-center justify-center">
                {type === 'video' ? <Video className="w-2 h-2 text-white" /> : <Phone className="w-2 h-2 text-white" />}
              </div>
            </div>
            <div className="text-left">
              <p className="text-[10px] font-bold text-white leading-tight truncate w-24">{partnerName}</p>
              <p className="text-[8px] font-mono text-emerald-400">
                {callState === 'active' ? formatTimer(callTimer) : 'Connecting...'}
              </p>
            </div>
          </div>
          <button 
            onClick={() => setIsMiniPip(false)}
            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-violet-400 hover:text-white transition-colors cursor-pointer"
            title="Expand Call View"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Dynamic Mini connection quality */}
        <div className="my-2 text-[8px] font-mono text-zinc-500 uppercase tracking-widest flex items-center justify-between">
          <span>Pipeline State</span>
          <span className="text-violet-400 font-bold flex items-center gap-1">
            <Wifi className="w-2.5 h-2.5 text-emerald-400" /> Secure
          </span>
        </div>

        <div className="flex items-center justify-around bg-black/40 p-1.5 rounded-xl border border-white/5 gap-2">
          <button 
            onClick={() => setIsMuted(!isMuted)} 
            className={`p-1.5 rounded-lg border transition-colors ${isMuted ? 'bg-amber-500/10 border-amber-500 text-amber-300' : 'bg-white/5 border-transparent text-zinc-400'}`}
          >
            {isMuted ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
          </button>
          {type === 'video' && (
            <button 
              onClick={() => setIsVideoOff(!isVideoOff)} 
              className={`p-1.5 rounded-lg border transition-colors ${isVideoOff ? 'bg-red-500/10 border-red-500 text-red-300' : 'bg-white/5 border-transparent text-zinc-400'}`}
            >
              <Camera className="w-3.5 h-3.5" />
            </button>
          )}
          <button 
            onClick={handleHangUp}
            className="p-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white cursor-pointer ml-auto flex items-center justify-center"
          >
            <PhoneOff className="w-3.5 h-3.5" />
          </button>
        </div>
      </motion.div>
    );
  }

  // Active call layouts (Voice vs Video, Solo vs Group)
  const isGroupActive = participants.length > 0;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 1.05 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ type: 'spring', damping: 26, stiffness: 180 }}
        className="fixed inset-0 z-50 flex flex-col justify-between bg-[#04020a] text-white select-none overflow-hidden"
      >
        {/* ========================================== */}
        {/* BACKGROUND RENDER (Blur profile picture or premium dark gradient) */}
        {/* ========================================== */}
        <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
          {partnerAvatar ? (
            <motion.div 
              initial={{ scale: 1.15 }}
              animate={{ scale: 1.05 }}
              className="absolute inset-0 bg-cover bg-center filter blur-3xl brightness-[0.25] saturate-150"
              style={{ backgroundImage: `url(${partnerAvatar})` }}
            />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-b from-[#0b081e] via-[#040209] to-[#04020a]" />
          )}
          {/* Subtle colored cyber grid overlays */}
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-violet-500/10 via-transparent to-transparent opacity-60" />
          <div className="absolute inset-0 bg-black/40" />
        </div>

        {/* ========================================== */}
        {/* TOP STATUS ROW */}
        {/* ========================================== */}
        <div className="relative z-10 w-full flex items-center justify-between p-5 shrink-0">
          <div className="flex items-center gap-3">
            {callState === 'active' && (
              <button 
                onClick={() => setIsMiniPip(true)}
                className="p-2.5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-zinc-300 hover:text-white transition-colors cursor-pointer"
                title="Minimize Call Session (In-App PiP)"
              >
                <Minimize2 className="w-4 h-4" />
              </button>
            )}
            <div className="flex items-center gap-2 bg-black/40 backdrop-blur-xl border border-violet-500/20 px-3.5 py-1.5 rounded-full">
              <Shield className="w-3.5 h-3.5 text-violet-400 animate-pulse" />
              <span className="text-[9px] font-mono tracking-widest uppercase font-black text-violet-300">
                E2EE Channel Active
              </span>
            </div>
          </div>

          {/* Network signal/quality indicator in top right */}
          {callState === 'active' && (
            <div className="flex items-center gap-2 bg-black/40 border border-white/5 px-3 py-1.5 rounded-full text-[9px] font-mono">
              <span className="text-zinc-400">SECURE NODE</span>
              <div className="flex gap-0.5 items-end h-3">
                <div className={`w-0.5 h-1.5 rounded-full ${networkQuality === 'poor' ? 'bg-red-500' : 'bg-emerald-400'}`} />
                <div className={`w-0.5 h-2.5 rounded-full ${networkQuality === 'poor' ? 'bg-zinc-600' : 'bg-emerald-400'}`} />
                <div className={`w-0.5 h-3 rounded-full ${networkQuality === 'excellent' ? 'bg-emerald-400' : 'bg-zinc-600'}`} />
              </div>
            </div>
          )}
        </div>

        {/* ========================================== */}
        {/* UNSTABLE CONNECTION Elegant Banner */}
        {/* ========================================== */}
        <AnimatePresence>
          {callState === 'active' && networkQuality !== 'excellent' && (
            <motion.div 
              initial={{ y: -50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -50, opacity: 0 }}
              className="absolute top-20 left-1/2 -translate-x-1/2 z-30 w-full max-w-sm px-4 pointer-events-none"
            >
              <div className="bg-amber-500/10 backdrop-blur-xl border border-amber-500/30 p-2.5 rounded-2xl flex items-center justify-between text-left shadow-lg">
                <div className="flex items-center gap-3">
                  <div className="p-1.5 bg-amber-500/20 rounded-xl text-amber-400 animate-bounce">
                    <AlertTriangle className="w-4 h-4" />
                  </div>
                  <div>
                    <h5 className="text-[10px] font-mono font-black text-amber-300 uppercase tracking-wider">
                      {networkQuality === 'poor' ? 'Weak Network Signal' : 'Pipeline Reconnecting'}
                    </h5>
                    <p className="text-[8.5px] text-zinc-300 leading-normal">
                      {networkQuality === 'poor' ? 'Fluctuating data packet streams...' : 'Synchronizing crypto-channels...'}
                    </p>
                  </div>
                </div>
                <RefreshCw className="w-3.5 h-3.5 text-amber-400 animate-spin" />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ========================================== */}
        {/* MAIN BODY: VIEW SWITCHER */}
        {/* ========================================== */}
        <div className="relative z-10 flex-1 flex flex-col items-center justify-center w-full px-6 max-h-[70vh]">
          
          {/* A. OUTGOING RINGING SCREEN (Calling, Connecting, Ringing, etc.) */}
          {direction === 'outgoing' && callState !== 'active' && (
            <div className="flex flex-col items-center gap-6">
              <div className="relative flex items-center justify-center">
                {/* Ripples */}
                <div className="absolute inset-0 w-32 h-32 rounded-full border border-violet-500/30 animate-ping opacity-75" />
                <div className="absolute inset-0 w-32 h-32 rounded-full border border-pink-500/20 animate-[ping_3s_infinite] opacity-40" />
                
                <img 
                  src={partnerAvatar} 
                  alt={partnerName} 
                  className="w-32 h-32 rounded-full object-cover border-4 border-[#0c0926] shadow-2xl relative z-10" 
                  referrerPolicy="no-referrer"
                />
              </div>

              <div className="text-center space-y-1 z-10">
                <h2 className="text-2xl font-black text-white tracking-tight leading-none mb-1">{partnerName}</h2>
                <p className="text-xs font-mono text-violet-400 font-semibold tracking-wider">{partnerUsername}</p>
                
                {/* Outgoing call states */}
                <div className="h-6 pt-3">
                  <AnimatePresence mode="wait">
                    <motion.p 
                      key={callState}
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -5 }}
                      className="text-xs font-mono text-pink-400 tracking-widest uppercase font-extrabold animate-pulse"
                    >
                      {callState === 'calling' && '📡 Calling...'}
                      {callState === 'connecting' && '⚡ Connecting Secure Port...'}
                      {callState === 'ringing' && '🔔 Ringing...'}
                    </motion.p>
                  </AnimatePresence>
                </div>
              </div>
            </div>
          )}

          {/* B. INCOMING RINGING SCREEN */}
          {direction === 'incoming' && callState !== 'active' && (
            <div className="flex flex-col items-center justify-between h-full py-8 w-full max-w-md">
              <div className="flex flex-col items-center gap-6 mt-12">
                <div className="relative">
                  {/* Glowing halo circles */}
                  <div className="absolute -inset-4 rounded-full bg-violet-600/20 blur-xl animate-pulse" />
                  <img 
                    src={partnerAvatar} 
                    alt={partnerName} 
                    className="w-36 h-36 rounded-full object-cover border-4 border-violet-500/30 shadow-2xl relative z-10" 
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute bottom-1 right-1 bg-violet-600 p-3 rounded-full shadow-lg border border-violet-400/30 z-20">
                    {type === 'video' ? <Video className="w-5 h-5 text-white" /> : <Phone className="w-5 h-5 text-white" />}
                  </div>
                </div>

                <div className="text-center space-y-1.5">
                  <span className="text-[9px] font-mono font-extrabold tracking-widest bg-violet-500/20 border border-violet-500/30 text-violet-300 px-3 py-1 rounded-full uppercase">
                    INCOMING {type.toUpperCase()} CALL
                  </span>
                  <h2 className="text-3xl font-black text-white tracking-tight leading-none mt-2">{partnerName}</h2>
                  <p className="text-xs font-mono text-violet-400">{partnerUsername}</p>
                </div>
              </div>

              {/* Swipe Accept or quick reply container */}
              <div className="w-full space-y-6 mt-auto">
                <div className="flex justify-center">
                  <button 
                    onClick={() => setQuickReplyOpen(true)}
                    className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full text-zinc-300 hover:text-white text-xs font-mono flex items-center gap-2 transition-all cursor-pointer"
                  >
                    <MessageSquare className="w-3.5 h-3.5 text-violet-400" />
                    <span>Reply instead</span>
                  </button>
                </div>

                {/* Gesture Swipe Track for answering */}
                <div 
                  ref={swipeTrackRef}
                  className="relative w-full h-16 bg-black/40 border border-white/10 rounded-full p-1.5 flex items-center justify-between overflow-hidden shadow-inner select-none"
                >
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <span className="text-[10px] font-mono tracking-widest uppercase text-zinc-500 font-extrabold animate-[pulse_1.5s_infinite]">
                      ← Swipe Left / Swipe Right →
                    </span>
                  </div>

                  {/* Swipe Interactive Handle Slider */}
                  <motion.div
                    drag="x"
                    dragConstraints={{ left: -110, right: 110 }}
                    dragElastic={0.15}
                    onDrag={(e, info) => setSwipeOffset(info.offset.x)}
                    onDragEnd={(e, info) => {
                      if (info.offset.x > 80) {
                        handleAccept();
                      } else if (info.offset.x < -80) {
                        handleDecline();
                      }
                      setSwipeOffset(0);
                    }}
                    className={`w-12 h-12 rounded-full flex items-center justify-center cursor-grab active:cursor-grabbing shadow-lg z-10 transition-colors ${
                      swipeOffset > 20 
                        ? 'bg-emerald-500' 
                        : swipeOffset < -20 
                          ? 'bg-red-500' 
                          : 'bg-violet-600'
                    }`}
                    style={{ x: swipeOffset }}
                  >
                    <GripVertical className="w-5 h-5 text-white" />
                  </motion.div>

                  <div className="flex gap-4 pr-3.5">
                    <button 
                      onClick={handleDecline} 
                      className="w-11 h-11 rounded-full bg-red-600/20 border border-red-500/30 flex items-center justify-center text-red-400 hover:bg-red-600 hover:text-white transition-colors cursor-pointer"
                      title="Tap Decline"
                    >
                      <PhoneOff className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={handleAccept}
                      className="w-11 h-11 rounded-full bg-emerald-600/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 hover:bg-emerald-600 hover:text-white transition-colors cursor-pointer"
                      title="Tap Accept"
                    >
                      <Phone className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* C. ACTIVE CALL (Voice vs Video, Solo vs Group) */}
          {callState === 'active' && (
            <div className="w-full h-full flex flex-col justify-between items-center py-4 relative">
              
              {/* VIDEO ACTIVE DISPLAY */}
              {type === 'video' ? (
                <div 
                  className="w-full flex-1 rounded-3xl bg-[#09071c] border border-violet-500/20 shadow-2xl relative overflow-hidden flex flex-col"
                  onClick={resetControlsTimer}
                >
                  {/* MAIN VIDEO STREAM LAYOUT GRID (Solo vs Group) */}
                  {!isGroupActive ? (
                    // SOLO Video Layout
                    <div className="w-full h-full relative">
                      {isVideoOff ? (
                        <div className="w-full h-full flex flex-col items-center justify-center bg-zinc-950/90 p-4">
                          <img 
                            src={partnerAvatar} 
                            alt={partnerName} 
                            className="w-24 h-24 rounded-full object-cover border-2 border-violet-500/20 mb-3"
                          />
                          <p className="text-xs text-zinc-400">Camera Feed Paused</p>
                        </div>
                      ) : (
                        <img 
                          src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=900" 
                          alt="Remote Feed" 
                          className="w-full h-full object-cover brightness-95"
                          referrerPolicy="no-referrer"
                        />
                      )}

                      {/* Floating local camera stream (PiP Window) */}
                      <AnimatePresence>
                        {!isVideoOff && (
                          <motion.div
                            drag
                            dragMomentum={false}
                            className={`absolute ${getPipCornerClass()} w-28 aspect-[3/4] rounded-2xl border-2 border-violet-500/40 overflow-hidden shadow-2xl bg-black z-20 cursor-move`}
                            whileHover={{ scale: 1.05 }}
                            onDragStart={() => setIsDraggingLocalCamera(true)}
                            onDragEnd={(e, info) => {
                              setIsDraggingLocalCamera(false);
                              // Calculate snap corner based on relative window coordinate
                              const x = info.point.x;
                              const y = info.point.y;
                              const width = window.innerWidth;
                              const height = window.innerHeight;
                              
                              if (x < width / 2) {
                                if (y < height / 2) setLocalCameraCorner('top-left');
                                else setLocalCameraCorner('bottom-left');
                              } else {
                                if (y < height / 2) setLocalCameraCorner('top-right');
                                else setLocalCameraCorner('bottom-right');
                              }
                            }}
                          >
                            <img 
                              src={currentUser.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100'} 
                              alt="Me" 
                              className="w-full h-full object-cover"
                              referrerPolicy="no-referrer"
                            />
                            <div className="absolute bottom-1 left-1 bg-black/60 px-1.5 py-0.5 rounded-md text-[7px] font-mono text-zinc-300">
                              Me
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  ) : (
                    // GROUP Video Grid
                    <div className="w-full h-full p-3 grid gap-3 select-none" style={{
                      gridTemplateColumns: participants.length === 1 ? '1fr' : '1fr 1fr',
                      gridTemplateRows: participants.length <= 2 ? '1fr' : '1fr 1fr'
                    }}>
                      {/* Active Caller (Main Partner) */}
                      <div 
                        onContextMenu={(e) => {
                          e.preventDefault();
                          setSelectedGroupParticipant({ id: 'partner', name: partnerName, username: partnerUsername, avatar: partnerAvatar, isSpeaking: false, isVideoEnabled: true, isMuted: false });
                        }}
                        className={`rounded-2xl overflow-hidden relative border transition-all ${
                          activeSpeakerId === 'partner' 
                            ? 'border-violet-500 shadow-[0_0_15px_rgba(139,92,246,0.3)] ring-2 ring-violet-500' 
                            : 'border-white/10'
                        }`}
                      >
                        <img src={partnerAvatar} alt={partnerName} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        <div className="absolute bottom-2 left-2 bg-black/60 px-2.5 py-1 rounded-lg flex items-center gap-1.5 text-[9px]">
                          <span className="font-bold text-white">{partnerName}</span>
                          {activeSpeakerId === 'partner' && <span className="text-[8px] font-mono text-violet-400 font-extrabold uppercase animate-pulse">● Speaking</span>}
                        </div>
                      </div>

                      {/* Loop participants */}
                      {participants.map(p => (
                        <div 
                          key={p.id}
                          onContextMenu={(e) => {
                            e.preventDefault();
                            setSelectedGroupParticipant(p);
                          }}
                          className={`rounded-2xl overflow-hidden relative border transition-all ${
                            activeSpeakerId === p.id 
                              ? 'border-violet-500 shadow-[0_0_15px_rgba(139,92,246,0.3)] ring-2 ring-violet-500' 
                              : 'border-white/10'
                          }`}
                        >
                          {p.isVideoEnabled ? (
                            <img src={p.avatar} alt={p.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                          ) : (
                            <div className="w-full h-full flex flex-col items-center justify-center bg-zinc-950 p-2">
                              <img src={p.avatar} alt={p.name} className="w-12 h-12 rounded-full object-cover border border-violet-500/20 mb-1" />
                              <span className="text-[9px] text-zinc-500">Camera Off</span>
                            </div>
                          )}
                          <div className="absolute bottom-2 left-2 bg-black/60 px-2.5 py-1 rounded-lg flex items-center gap-1.5 text-[9px]">
                            <span className="font-bold text-white">{p.name}</span>
                            {activeSpeakerId === p.id && <span className="text-[8px] font-mono text-violet-400 font-extrabold uppercase animate-pulse">● Speaking</span>}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Top overlay info inside video call */}
                  <div className="absolute top-4 left-4 z-20 flex flex-col gap-1.5 text-left bg-black/45 backdrop-blur-md p-2.5 rounded-xl border border-white/5 pointer-events-none">
                    <h4 className="text-xs font-bold text-white leading-none">{partnerName}</h4>
                    <p className="text-[9px] font-mono text-violet-400 flex items-center gap-1">
                      <span>Live Stream Connected</span>
                      <span>•</span>
                      <span className="text-emerald-400 font-bold">{formatTimer(callTimer)}</span>
                    </p>
                  </div>
                </div>
              ) : (
                // VOICE ACTIVE DISPLAY
                <div className="flex flex-col items-center justify-center gap-8 py-10 w-full max-w-sm">
                  {/* Large visual avatar with speaking pulses */}
                  <div className="relative">
                    <motion.div 
                      animate={{ scale: activeSpeakerId === 'partner' ? [1, 1.1, 1] : 1 }}
                      transition={{ repeat: Infinity, duration: 2.5 }}
                      className={`absolute inset-0 rounded-full bg-violet-600/10 blur-xl ${activeSpeakerId === 'partner' ? 'opacity-100' : 'opacity-0'}`} 
                    />
                    <div className={`relative rounded-full p-1.5 border-4 transition-all ${
                      activeSpeakerId === 'partner' 
                        ? 'border-violet-500 shadow-[0_0_20px_rgba(139,92,246,0.4)]' 
                        : 'border-white/10'
                    }`}>
                      <img 
                        src={partnerAvatar} 
                        alt={partnerName} 
                        className="w-32 h-32 rounded-full object-cover" 
                        referrerPolicy="no-referrer"
                      />
                    </div>
                  </div>

                  <div className="text-center space-y-2">
                    <div className="flex items-center justify-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      <span className="text-[9px] font-mono tracking-widest text-zinc-500 uppercase">Crypto-Voice Link</span>
                    </div>
                    <h2 className="text-2xl font-black text-white leading-none tracking-tight">{partnerName}</h2>
                    <p className="text-xs font-mono text-violet-400">{partnerUsername}</p>
                    
                    {/* Active Timer */}
                    <p className="text-2xl font-mono font-black text-emerald-400 pt-2 tracking-widest">
                      {formatTimer(callTimer)}
                    </p>
                  </div>

                  {/* Group Call Mini-Ledger in voice call */}
                  {isGroupActive && (
                    <div className="w-full bg-black/40 border border-white/5 p-3 rounded-2xl flex flex-col gap-2">
                      <span className="text-[8.5px] font-mono text-zinc-500 uppercase tracking-wider text-left">Active Participants ({1 + participants.length})</span>
                      <div className="flex flex-wrap gap-2">
                        <div className="flex items-center gap-1.5 bg-violet-600/20 border border-violet-500/20 px-2 py-1 rounded-xl">
                          <img src={partnerAvatar} className="w-4.5 h-4.5 rounded-full object-cover" />
                          <span className="text-[9px] text-zinc-300 font-bold">{partnerName}</span>
                        </div>
                        {participants.map(p => (
                          <div key={p.id} className="flex items-center gap-1.5 bg-white/5 border border-white/5 px-2 py-1 rounded-xl">
                            <img src={p.avatar} className="w-4.5 h-4.5 rounded-full object-cover" />
                            <span className="text-[9px] text-zinc-400 font-medium">{p.name}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* ========================================== */}
        {/* BOTTOM ACTIVE CONTROLS BOARD */}
        {/* ========================================== */}
        {callState === 'active' && (
          <div className="relative z-20 w-full p-6 shrink-0 flex flex-col items-center">
            <AnimatePresence>
              {(controlsVisible || type === 'voice') && (
                <motion.div 
                  initial={{ y: 50, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: 50, opacity: 0 }}
                  className="w-full max-w-md bg-black/50 backdrop-blur-2xl border border-white/10 rounded-3xl p-5 shadow-2xl flex flex-col gap-4"
                >
                  <div className="flex items-center justify-around gap-2">
                    <button 
                      onClick={() => setIsMuted(!isMuted)}
                      className={`w-12 h-12 rounded-full border flex items-center justify-center transition-all cursor-pointer ${
                        isMuted 
                          ? 'bg-amber-500/20 border-amber-500 text-amber-300 shadow-lg shadow-amber-950/20' 
                          : 'bg-white/5 border-white/10 text-zinc-300 hover:bg-white/10 hover:text-white'
                      }`}
                      title={isMuted ? "Unmute" : "Mute"}
                    >
                      {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                    </button>

                    <button 
                      onClick={() => setIsSpeaker(!isSpeaker)}
                      className={`w-12 h-12 rounded-full border flex items-center justify-center transition-all cursor-pointer ${
                        isSpeaker 
                          ? 'bg-violet-600/20 border-violet-500 text-violet-300 shadow-lg shadow-violet-950/20' 
                          : 'bg-white/5 border-white/10 text-zinc-300 hover:bg-white/10 hover:text-white'
                      }`}
                      title="Toggle Speaker"
                    >
                      {isSpeaker ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
                    </button>

                    {type === 'video' && (
                      <>
                        <button 
                          onClick={() => setIsVideoOff(!isVideoOff)}
                          className={`w-12 h-12 rounded-full border flex items-center justify-center transition-all cursor-pointer ${
                            isVideoOff 
                              ? 'bg-red-500/20 border-red-500 text-red-300 shadow-lg shadow-red-950/20' 
                              : 'bg-white/5 border-white/10 text-zinc-300 hover:bg-white/10 hover:text-white'
                          }`}
                          title="Toggle Video"
                        >
                          {isVideoOff ? <Camera className="w-5 h-5 text-red-400" /> : <Camera className="w-5 h-5" />}
                        </button>

                        <button 
                          onClick={() => setIsCameraFlipped(!isCameraFlipped)}
                          className={`w-12 h-12 rounded-full border flex items-center justify-center transition-all cursor-pointer ${
                            isCameraFlipped 
                              ? 'bg-violet-600/20 border-violet-500 text-violet-300' 
                              : 'bg-white/5 border-white/10 text-zinc-300 hover:bg-white/10 hover:text-white'
                          }`}
                          title="Flip Camera"
                        >
                          <RefreshCw className="w-5 h-5" />
                        </button>
                      </>
                    )}

                    {/* Add Participant Trigger */}
                    <button 
                      onClick={handleAddParticipant}
                      className="w-12 h-12 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-300 hover:text-white flex items-center justify-center transition-all cursor-pointer"
                      title="Add Participant"
                    >
                      <UserPlus className="w-5 h-5" />
                    </button>
                  </div>

                  {/* Unified Hangup Centered Button */}
                  <div className="flex justify-center pt-2 border-t border-white/5">
                    <button
                      onClick={handleHangUp}
                      className="w-full py-3 bg-red-600 hover:bg-red-500 active:scale-95 text-white rounded-2xl transition-all font-mono font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg shadow-red-950/40 cursor-pointer"
                    >
                      <PhoneOff className="w-4 h-4" />
                      <span>End call session</span>
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* ========================================== */}
        {/* QUICK REPLY BOTTOM SHEET (Incoming) */}
        {/* ========================================== */}
        <AnimatePresence>
          {quickReplyOpen && (
            <div className="fixed inset-0 z-50 flex items-end justify-center">
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.6 }}
                exit={{ opacity: 0 }}
                onClick={() => setQuickReplyOpen(false)}
                className="absolute inset-0 bg-slate-950/80 cursor-pointer"
              />
              <motion.div 
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                className="relative w-full max-w-md bg-[#09071c] border-t border-violet-500/30 rounded-t-3xl shadow-2xl p-6 z-10 flex flex-col gap-4"
              >
                <div className="w-12 h-1 bg-violet-500/20 rounded-full mx-auto mb-2" />
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-mono font-black text-violet-100 uppercase tracking-wider">Select Quick Reply Response</h3>
                  <button onClick={() => setQuickReplyOpen(false)} className="p-1 text-zinc-400 hover:text-white"><X className="w-4 h-4" /></button>
                </div>
                <div className="flex flex-col gap-2.5 my-2">
                  {quickReplies.map((reply, i) => (
                    <button
                      key={i}
                      onClick={() => handleQuickReply(reply)}
                      className="w-full p-3 bg-white/5 hover:bg-violet-600/20 border border-white/5 hover:border-violet-500/30 text-left text-zinc-300 hover:text-white text-xs font-medium rounded-xl transition-all cursor-pointer"
                    >
                      {reply}
                    </button>
                  ))}
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* ========================================== */}
        {/* GROUP PARTICIPANT ACTION SHEET (Long-press) */}
        {/* ========================================== */}
        <AnimatePresence>
          {selectedGroupParticipant && (
            <div className="fixed inset-0 z-50 flex items-end justify-center">
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.6 }}
                exit={{ opacity: 0 }}
                onClick={() => setSelectedGroupParticipant(null)}
                className="absolute inset-0 bg-slate-950/80 cursor-pointer"
              />
              <motion.div 
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                className="relative w-full max-w-md bg-[#09071c] border-t border-violet-500/30 rounded-t-3xl shadow-2xl p-6 z-10 flex flex-col gap-4"
              >
                <div className="w-12 h-1 bg-violet-500/20 rounded-full mx-auto mb-2" />
                <div className="flex items-center gap-3">
                  <img src={selectedGroupParticipant.avatar} alt={selectedGroupParticipant.name} className="w-11 h-11 rounded-xl object-cover border border-violet-500/20" />
                  <div className="text-left">
                    <h4 className="text-sm font-bold text-white">{selectedGroupParticipant.name}</h4>
                    <p className="text-xs font-mono text-violet-400">{selectedGroupParticipant.username}</p>
                  </div>
                </div>

                <div className="flex flex-col gap-2 mt-2">
                  <button 
                    onClick={() => {
                      window.dispatchEvent(new CustomEvent('toast', { detail: `🔇 Muted ${selectedGroupParticipant.name} for me` }));
                      setSelectedGroupParticipant(null);
                    }}
                    className="w-full p-3 bg-white/5 hover:bg-violet-600/10 text-left text-xs font-mono text-zinc-300 hover:text-white rounded-xl transition-colors cursor-pointer"
                  >
                    Mute for Me
                  </button>
                  <button 
                    onClick={() => {
                      window.dispatchEvent(new CustomEvent('toast', { detail: `🔍 Viewing profile of ${selectedGroupParticipant.name}` }));
                      setSelectedGroupParticipant(null);
                    }}
                    className="w-full p-3 bg-white/5 hover:bg-violet-600/10 text-left text-xs font-mono text-zinc-300 hover:text-white rounded-xl transition-colors cursor-pointer"
                  >
                    View Profile
                  </button>
                  <button 
                    onClick={() => {
                      window.dispatchEvent(new CustomEvent('toast', { detail: `🚨 Reported participant ${selectedGroupParticipant.name}` }));
                      setSelectedGroupParticipant(null);
                    }}
                    className="w-full p-3 bg-white/5 hover:bg-red-500/10 text-left text-xs font-mono text-red-400 hover:text-red-300 rounded-xl transition-colors cursor-pointer"
                  >
                    Report Participant
                  </button>
                  <button 
                    onClick={() => {
                      window.dispatchEvent(new CustomEvent('toast', { detail: `🚫 Blocked participant ${selectedGroupParticipant.name}` }));
                      setSelectedGroupParticipant(null);
                    }}
                    className="w-full p-3 bg-white/5 hover:bg-red-500/10 text-left text-xs font-mono text-red-400 hover:text-red-300 rounded-xl transition-colors cursor-pointer"
                  >
                    Block Participant
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </motion.div>
    </AnimatePresence>
  );
}
