import React, { useState } from 'react';
import { AlertTriangle, X, ShieldAlert, CheckCircle, Flame } from 'lucide-react';
import { Post, User } from '../types';

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetType: 'post' | 'comment' | 'user' | 'community';
  targetId: string;
  targetContent: string;
  reporterUsername: string;
  onSubmitSuccess?: () => void;
}

export type ReportReason = 
  | 'Spam' 
  | 'Harassment' 
  | 'Hate' 
  | 'Violence' 
  | 'Impersonation' 
  | 'Copyright' 
  | 'Misinformation' 
  | 'Other';

export default function ReportModal({
  isOpen,
  onClose,
  targetType,
  targetId,
  targetContent,
  reporterUsername,
  onSubmitSuccess
}: ReportModalProps) {
  const [selectedReason, setSelectedReason] = useState<ReportReason>('Spam');
  const [comments, setComments] = useState('');
  const [isDone, setIsDone] = useState(false);

  if (!isOpen) return null;

  const reasons: ReportReason[] = [
    'Spam',
    'Harassment',
    'Hate',
    'Violence',
    'Impersonation',
    'Copyright',
    'Misinformation',
    'Other'
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const newReport = {
      id: `rep-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      reporterUsername,
      targetType,
      targetId,
      targetContent,
      reason: selectedReason,
      comment: comments.trim() || 'No additional comments provided.',
      timestamp: 'Just now',
      status: 'pending' as const
    };

    try {
      const existingStr = localStorage.getItem('nexora_reports') || '[]';
      const existing = JSON.parse(existingStr);
      const updated = [newReport, ...existing];
      localStorage.setItem('nexora_reports', JSON.stringify(updated));
    } catch (e) {
      console.error(e);
    }

    setIsDone(true);
    
    // Dispatch a global event so any active screens can update
    window.dispatchEvent(new CustomEvent('toast', { 
      detail: `🛡️ Security Alert logged! Reported target for ${selectedReason}.` 
    }));
    window.dispatchEvent(new CustomEvent('reports-updated'));

    setTimeout(() => {
      onClose();
      setIsDone(false);
      setComments('');
      setSelectedReason('Spam');
      if (onSubmitSuccess) onSubmitSuccess();
    }, 1500);
  };

  return (
    <div id="report-modal-overlay" className="fixed inset-0 bg-black/80 backdrop-blur-md z-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-[#0d0a1b]/98 border border-red-500/20 rounded-[28px] overflow-hidden shadow-2xl relative text-left">
        
        {/* Glowing border accents */}
        <span className="absolute top-0 inset-x-0 h-[1.5px] bg-gradient-to-r from-red-500 via-pink-500 to-amber-400" />

        <div className="p-6 relative space-y-4">
          <button 
            onClick={onClose}
            className="absolute top-6 right-6 p-2 bg-white/5 hover:bg-white/10 rounded-xl text-zinc-400 hover:text-white transition-all cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>

          {!isDone ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="flex items-center gap-2.5 text-red-400">
                <ShieldAlert className="w-5 h-5 animate-pulse" />
                <h3 className="text-base font-black uppercase font-mono tracking-wider">
                  Report Post
                </h3>
              </div>

              <div className="p-3 bg-red-950/20 border border-red-500/10 rounded-2xl">
                <span className="text-[10px] uppercase font-mono text-rose-400 font-bold block mb-1">Target to Moderate Category:</span>
                <p className="text-xs text-zinc-300 italic max-h-16 overflow-y-auto font-sans leading-relaxed">
                  "{targetContent || targetId}"
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-zinc-300 block font-mono">
                  Select Violation Classification:
                </label>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {reasons.map((reason) => (
                    <button
                      key={reason}
                      type="button"
                      onClick={() => setSelectedReason(reason)}
                      className={`px-3 py-2 rounded-xl text-left border font-sans font-semibold transition-all cursor-pointer ${selectedReason === reason ? 'bg-red-900/30 text-red-200 border-red-500/40 font-bold shadow-md shadow-red-500/5' : 'bg-black/30 border-white/5 text-zinc-400 hover:text-zinc-200 hover:border-white/10'}`}
                    >
                      {reason}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-300 block font-mono">
                  Synthesize additional comments (Optional):
                </label>
                <textarea
                  value={comments}
                  onChange={(e) => setComments(e.target.value)}
                  placeholder="Provide precise context so moderators can act immediately..."
                  rows={3}
                  className="w-full p-3 bg-black/40 border border-white/5 font-sans text-xs focus:outline-hidden focus:border-red-500/40 rounded-xl text-white placeholder-zinc-600 resize-none"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-gradient-to-r from-red-600 to-rose-600 hover:brightness-110 text-white font-mono text-xs font-black tracking-widest uppercase rounded-xl cursor-pointer shadow-lg active:scale-98 transition-all"
              >
                SUBMIT REPORT FOR REVIEW
              </button>
            </form>
          ) : (
            <div className="py-8 flex flex-col items-center justify-center text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-emerald-500/15 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
                <CheckCircle className="w-6 h-6 animate-bounce" />
              </div>
              <div>
                <h4 className="text-sm font-black text-white font-mono uppercase tracking-widest">
                  REPORT SUBMITTED
                </h4>
                <p className="text-[11px] text-zinc-400 max-w-xs mt-1 leading-normal font-sans">
                  Thank you for reporting. Our moderation team will review this post within 5 minutes.
                </p>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
