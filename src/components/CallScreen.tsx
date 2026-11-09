import React from 'react';
import { AlertTriangle, PhoneOff } from 'lucide-react';

interface CallScreenProps {
  isOpen: boolean;
  type: 'voice' | 'video';
  partnerName: string;
  onClose: () => void;
}

/**
 * Calling is intentionally unavailable until a verified real-time call transport
 * is connected. Never show a simulated ringing, connected state, timer or call log.
 */
export default function CallScreen({ isOpen, type, partnerName, onClose }: CallScreenProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#03020b]/90 p-4 backdrop-blur-md" role="dialog" aria-modal="true" aria-labelledby="call-unavailable-title">
      <section className="w-full max-w-sm rounded-3xl border border-violet-400/20 bg-[#0b0920] p-6 text-center shadow-2xl">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-amber-400/20 bg-amber-400/10 text-amber-300">
          <AlertTriangle className="h-6 w-6" aria-hidden="true" />
        </div>
        <h2 id="call-unavailable-title" className="mt-4 text-base font-bold text-white">
          {type === 'video' ? 'Video calling' : 'Voice calling'} isn't connected yet
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-zinc-400">
          A secure real-time call service has not been connected. No call has been placed to {partnerName || 'this person'}.
        </p>
        <p className="mt-3 text-xs text-zinc-500">
          NEXORA will enable calling when connection, media and call-history handling are verified end to end.
        </p>
        <button type="button" onClick={onClose} className="mt-6 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 text-sm font-semibold text-white transition hover:bg-violet-500 focus-visible:outline-2 focus-visible:outline-violet-300">
          <PhoneOff className="h-4 w-4" aria-hidden="true" />
          Close
        </button>
      </section>
    </div>
  );
}
