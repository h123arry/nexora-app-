import { useEffect, useState } from 'react';
import { Download, X } from 'lucide-react';

export default function PwaUpdatePrompt() {
  const [isReady, setIsReady] = useState(false);
  const [isApplying, setIsApplying] = useState(false);

  useEffect(() => {
    const handleReady = () => setIsReady(true);
    const handleApplied = () => setIsApplying(false);
    window.addEventListener('nexora-sw-update-ready', handleReady);
    window.addEventListener('nexora-sw-update-applied', handleApplied);
    return () => {
      window.removeEventListener('nexora-sw-update-ready', handleReady);
      window.removeEventListener('nexora-sw-update-applied', handleApplied);
    };
  }, []);

  if (!isReady) return null;

  return (
    <div className="fixed inset-x-3 bottom-4 z-[110] md:left-auto md:right-6 md:w-96" role="status" aria-live="polite">
      <div className="flex items-start gap-3 rounded-2xl border border-violet-400/30 bg-[#0b0718]/95 p-4 text-white shadow-2xl backdrop-blur-xl">
        <div className="mt-0.5 rounded-xl bg-violet-500/15 p-2 text-violet-300">
          <Download className="h-4 w-4" aria-hidden="true" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold">A Nexora update is ready</p>
          <p className="mt-1 text-xs leading-relaxed text-zinc-300">Update when convenient. Your current draft and active work will not be interrupted until you choose to continue.</p>
          <button
            type="button"
            disabled={isApplying}
            onClick={() => {
              setIsApplying(true);
              window.dispatchEvent(new CustomEvent('nexora-apply-sw-update'));
            }}
            className="mt-3 rounded-xl bg-violet-600 px-3 py-2 text-xs font-bold text-white transition hover:bg-violet-500 disabled:opacity-60"
          >
            {isApplying ? 'Applying update…' : 'Update now'}
          </button>
        </div>
        <button type="button" aria-label="Dismiss update notice" onClick={() => setIsReady(false)} className="rounded-lg p-1 text-zinc-400 hover:bg-white/10 hover:text-white">
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
