import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Phone, Video, PhoneOff, VolumeX, Volume2, Mic, MicOff, Camera, Sparkles, UserPlus, Grid } from 'lucide-react';

interface CallScreenProps {
  isOpen: boolean;
  type: 'voice' | 'video';
  partnerName: string;
  partnerAvatar: string;
  onClose: () => void;
}

export default function CallScreen({
  isOpen,
  type,
  partnerName,
  partnerAvatar,
  onClose
}: CallScreenProps) {
  const [callStatus, setCallStatus] = useState<'ringing' | 'connected'>('ringing');
  const [callTimer, setCallTimer] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeaker, setIsSpeaker] = useState(true);
  const [isVideoOff, setIsVideoOff] = useState(false);

  // Auto connect call after 2.5 seconds
  useEffect(() => {
    if (!isOpen) return;
    setCallStatus('ringing');
    setCallTimer(0);
    
    const connectTimer = setTimeout(() => {
      setCallStatus('connected');
    }, 2500);

    return () => clearTimeout(connectTimer);
  }, [isOpen, type]);

  // Call duration counter
  useEffect(() => {
    if (callStatus !== 'connected' || !isOpen) return;
    
    const interval = setInterval(() => {
      setCallTimer(prev => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [callStatus, isOpen]);

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 1.1 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="fixed inset-0 z-50 flex flex-col items-center justify-between p-6 bg-slate-950/95 backdrop-blur-2xl text-white select-none"
      >
        {/* Glow ambient background elements */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full bg-violet-600/15 blur-3xl pointer-events-none" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full bg-pink-500/10 blur-3xl pointer-events-none" />

        {/* Top Header info */}
        <div className="w-full flex items-center justify-between z-10">
          <div className="flex items-center gap-2 bg-white/5 px-3 py-1.5 rounded-full border border-white/10">
            <Sparkles className="w-3.5 h-3.5 text-violet-400 animate-pulse" />
            <span className="text-[10px] font-mono tracking-widest uppercase font-bold text-violet-300">
              Nexora Secured Crypto-Channel
            </span>
          </div>
          <div className="text-[11px] font-mono text-zinc-400 bg-black/40 px-3 py-1 rounded-full">
            E2EE Active
          </div>
        </div>

        {/* Main interactive call display */}
        <div className="flex-1 flex flex-col items-center justify-center gap-6 z-10 w-full max-w-md">
          {type === 'video' && callStatus === 'connected' && !isVideoOff ? (
            <div className="w-full aspect-video rounded-3xl bg-zinc-900 border border-violet-500/30 shadow-2xl relative overflow-hidden group">
              {/* Simulated camera track */}
              <img 
                src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=600" 
                alt="My Camera Stream" 
                className="w-full h-full object-cover brightness-95"
                referrerPolicy="no-referrer"
              />
              {/* Overlay partner stream */}
              <div className="absolute bottom-4 right-4 w-28 aspect-[3/4] rounded-2xl border border-white/20 overflow-hidden shadow-lg bg-zinc-950">
                <img 
                  src={partnerAvatar} 
                  alt={partnerName} 
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              </div>
              <div className="absolute top-3 left-3 bg-black/50 px-2 py-1 rounded-lg text-[9px] font-mono uppercase text-violet-300">
                Main Broadcaster
              </div>
            </div>
          ) : (
            <div className="relative flex flex-col items-center">
              {/* Ringing waves circles */}
              {callStatus === 'ringing' && (
                <>
                  <div className="absolute inset-0 w-36 h-36 rounded-full border border-violet-500/30 animate-ping opacity-75" />
                  <div className="absolute inset-0 w-36 h-36 rounded-full border border-pink-500/20 animate-[ping_3s_infinite] opacity-40" />
                </>
              )}
              
              <div className="relative">
                <img 
                  src={partnerAvatar} 
                  alt={partnerName} 
                  className="w-32 h-32 rounded-full object-cover border-4 border-violet-500/20 shadow-2xl" 
                  referrerPolicy="no-referrer"
                />
                <div className="absolute -bottom-2 -right-2 bg-violet-600 p-2.5 rounded-full shadow-lg border border-violet-400/30">
                  {type === 'video' ? <Video className="w-5 h-5 text-white" /> : <Phone className="w-5 h-5 text-white" />}
                </div>
              </div>
            </div>
          )}

          {/* Partner identification */}
          <div className="text-center space-y-1">
            <h2 className="text-xl font-sans font-black text-white tracking-tight">
              {partnerName}
            </h2>
            <p className="text-xs font-mono text-violet-300 tracking-widest uppercase font-extrabold animate-pulse">
              {callStatus === 'ringing' ? '☎️ Ringing...' : '⚡ Session Connected'}
            </p>
            {callStatus === 'connected' && (
              <p className="text-xl font-mono font-black text-emerald-400 mt-2">
                {formatTimer(callTimer)}
              </p>
            )}
          </div>
        </div>

        {/* Action button menu panel */}
        <div className="w-full max-w-md bg-white/5 border border-white/10 rounded-3xl p-5 flex flex-col gap-4 z-10 shadow-xl backdrop-blur-md">
          {callStatus === 'connected' && (
            <div className="flex items-center justify-around">
              <button 
                onClick={() => setIsMuted(!isMuted)}
                className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
                  isMuted 
                    ? 'bg-amber-500/20 border-amber-500 text-amber-300' 
                    : 'bg-white/5 border-white/10 text-zinc-300 hover:bg-white/10 hover:text-white'
                }`}
                title="Mute Mic"
              >
                {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
              </button>

              <button 
                onClick={() => setIsSpeaker(!isSpeaker)}
                className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
                  !isSpeaker 
                    ? 'bg-zinc-800 border-zinc-700 text-zinc-500' 
                    : 'bg-white/5 border-white/10 text-zinc-300 hover:bg-white/10 hover:text-white'
                }`}
                title="Toggle Speaker"
              >
                {isSpeaker ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
              </button>

              {type === 'video' && (
                <button 
                  onClick={() => setIsVideoOff(!isVideoOff)}
                  className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
                    isVideoOff 
                      ? 'bg-red-500/20 border-red-500 text-red-300' 
                      : 'bg-white/5 border-white/10 text-zinc-300 hover:bg-white/10 hover:text-white'
                  }`}
                  title="Toggle Camera"
                >
                  <Camera className="w-5 h-5" />
                </button>
              )}

              <button className="p-3.5 bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-300 hover:text-white rounded-2xl transition-all cursor-pointer">
                <UserPlus className="w-5 h-5" />
              </button>
            </div>
          )}

          {/* End Call row */}
          <div className="flex items-center justify-center pt-2">
            <button
              onClick={onClose}
              className="w-full max-w-xs py-3 px-6 bg-red-600 hover:bg-red-500 active:scale-95 text-white rounded-2xl transition-all font-mono font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2.5 shadow-lg shadow-red-950/40 cursor-pointer"
            >
              <PhoneOff className="w-4 h-4" />
              <span>Decline / End Session</span>
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
