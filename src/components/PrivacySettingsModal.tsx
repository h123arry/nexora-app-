import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, ShieldCheck, Eye, EyeOff, Check, AlertCircle, HardDrive, Sparkles } from 'lucide-react';

interface PrivacySettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  privacy: {
    visibility: 'everyone' | 'contacts' | 'nobody';
    lastSeen: 'everyone' | 'contacts' | 'nobody';
    readReceipts: boolean;
    mediaQuality: 'hd' | 'saver';
  };
  onSavePrivacy: (next: {
    visibility: 'everyone' | 'contacts' | 'nobody';
    lastSeen: 'everyone' | 'contacts' | 'nobody';
    readReceipts: boolean;
    mediaQuality: 'hd' | 'saver';
  }) => void;
}

export default function PrivacySettingsModal({ isOpen, onClose, privacy, onSavePrivacy }: PrivacySettingsModalProps) {
  const [visibility, setVisibility] = useState(privacy.visibility);
  const [lastSeen, setLastSeen] = useState(privacy.lastSeen);
  const [readReceipts, setReadReceipts] = useState(privacy.readReceipts);
  const [mediaQuality, setMediaQuality] = useState(privacy.mediaQuality);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSavePrivacy({
      visibility,
      lastSeen,
      readReceipts,
      mediaQuality
    });
    window.dispatchEvent(new CustomEvent('toast', { detail: "🔒 Security protocol configurations saved!" }));
    onClose();
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="w-full max-w-md bg-[#080516]/98 border border-violet-500/20 rounded-3xl p-6 text-white shadow-2xl relative overflow-hidden"
        >
          {/* Top subtle lightbar */}
          <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-violet-600 via-pink-500 to-indigo-500" />

          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-indigo-400" />
              <h3 className="text-sm font-mono uppercase tracking-wider font-extrabold text-white">Privacy & Visibility Protocol</h3>
            </div>
            <button 
              onClick={onClose}
              className="p-1 hover:bg-white/5 border border-white/10 rounded-lg text-zinc-400 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5 text-left">
            {/* Online Visibility */}
            <div className="space-y-1.5">
              <label className="text-[9px] font-mono uppercase tracking-widest text-violet-300 font-black flex items-center gap-1.5">
                <Eye className="w-3.5 h-3.5 text-indigo-400" /> Who Can See My Online Status
              </label>
              <div className="grid grid-cols-3 gap-2 bg-slate-950 p-1.5 rounded-xl border border-white/5">
                {(['everyone', 'contacts', 'nobody'] as const).map(option => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => setVisibility(option)}
                    className={`py-1.5 rounded-lg text-[9.5px] font-mono uppercase tracking-wider transition-all cursor-pointer ${
                      visibility === option 
                        ? 'bg-violet-600/20 border border-violet-500/40 text-violet-200 font-extrabold' 
                        : 'text-zinc-500 hover:text-zinc-300 border border-transparent'
                    }`}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </div>

            {/* Last Seen Visibility */}
            <div className="space-y-1.5">
              <label className="text-[9px] font-mono uppercase tracking-widest text-violet-300 font-black flex items-center gap-1.5">
                <EyeOff className="w-3.5 h-3.5 text-indigo-400" /> Who Can See My "Last Seen"
              </label>
              <div className="grid grid-cols-3 gap-2 bg-slate-950 p-1.5 rounded-xl border border-white/5">
                {(['everyone', 'contacts', 'nobody'] as const).map(option => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => setLastSeen(option)}
                    className={`py-1.5 rounded-lg text-[9.5px] font-mono uppercase tracking-wider transition-all cursor-pointer ${
                      lastSeen === option 
                        ? 'bg-violet-600/20 border border-violet-500/40 text-violet-200 font-extrabold' 
                        : 'text-zinc-500 hover:text-zinc-300 border border-transparent'
                    }`}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </div>

            {/* Read Receipts */}
            <div className="flex items-center justify-between p-3.5 bg-slate-950 rounded-xl border border-white/5">
              <div className="text-left leading-none max-w-[80%]">
                <span className="text-[10px] font-bold block text-white mb-1">Interactive Read Receipts</span>
                <p className="text-[9px] text-zinc-500 font-mono leading-tight">If disabled, peers won't see blue tick receipts when you view messages, and you won't see theirs either.</p>
              </div>
              <button
                type="button"
                onClick={() => setReadReceipts(!readReceipts)}
                className={`w-10 h-6 rounded-full transition-all flex items-center p-0.5 cursor-pointer ${
                  readReceipts ? 'bg-indigo-500 justify-end' : 'bg-zinc-800 justify-start'
                }`}
              >
                <motion.span layout className="w-5 h-5 bg-white rounded-full shadow-lg" />
              </button>
            </div>

            {/* Media Optimization & Quality */}
            <div className="space-y-1.5">
              <label className="text-[9px] font-mono uppercase tracking-widest text-violet-300 font-black flex items-center gap-1.5">
                <HardDrive className="w-3.5 h-3.5 text-indigo-400" /> Media Compression & Optimizations
              </label>
              <div className="grid grid-cols-2 gap-2 bg-slate-950 p-1.5 rounded-xl border border-white/5">
                {[
                  { id: 'saver', label: 'Data Saver (Compressed)', desc: 'Fast client-side pre-rendering' },
                  { id: 'hd', label: 'HD Quality (Raw Files)', desc: 'Slow high-density wireframes' }
                ].map(opt => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setMediaQuality(opt.id as any)}
                    className={`p-2.5 rounded-lg text-left border transition-all cursor-pointer ${
                      mediaQuality === opt.id 
                        ? 'bg-violet-600/10 border-violet-500/35 text-white' 
                        : 'bg-black/30 border-transparent text-zinc-500 hover:text-zinc-300'
                    }`}
                  >
                    <span className="text-[9.5px] font-bold block mb-0.5">{opt.label}</span>
                    <span className="text-[8px] font-mono text-zinc-600 leading-none block">{opt.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-3 bg-gradient-to-r from-indigo-600 via-violet-600 to-pink-500 hover:brightness-110 active:scale-98 text-white rounded-xl font-mono text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-lg shadow-indigo-950/40"
            >
              <Check className="w-3.5 h-3.5 stroke-[3]" />
              <span>Apply Guard Protocol</span>
            </button>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
