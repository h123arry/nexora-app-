import React, { useEffect, useState } from 'react';
import { httpsCallable } from 'firebase/functions';
import { GitBranch, LoaderCircle, ShieldAlert, X } from 'lucide-react';
import { functions } from '../lib/firebase';

type OriginSource = {
  index: number;
  available: boolean;
  postId?: string;
  username?: string;
  displayName?: string;
  avatar?: string;
};
type OriginResult = { hasLineage: boolean; sources: OriginSource[] };

export default function OriginAttributionViewer({ postId, onClose }: { postId: string; onClose: () => void }) {
  const [result, setResult] = useState<OriginResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    setLoading(true); setError(''); setResult(null);
    void httpsCallable(functions, 'getPublicOriginAttribution')({ postId })
      .then(response => { if (active) setResult(response.data as OriginResult); })
      .catch((reason: any) => { if (active) setError(reason?.message || 'Origin attribution could not be loaded.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [postId]);

  return (
    <div className="fixed inset-0 z-[140] flex items-center justify-center bg-black/80 backdrop-blur-sm p-3 sm:p-6" onClick={onClose}>
      <section role="dialog" aria-modal="true" aria-labelledby="origin-viewer-title" onClick={event => event.stopPropagation()} className="w-full max-w-lg max-h-[82vh] overflow-y-auto rounded-3xl border border-violet-400/20 bg-[#090714] shadow-2xl shadow-black/60">
        <header className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-white/10 bg-[#090714]/95 px-5 py-4 backdrop-blur">
          <div className="flex items-center gap-3 min-w-0">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-violet-400/25 bg-violet-500/10 text-violet-200"><GitBranch className="h-5 w-5" /></span>
            <div className="min-w-0"><h2 id="origin-viewer-title" className="text-sm font-bold text-white">NEXORA Origin</h2><p className="text-[11px] text-zinc-400">Recorded source attribution</p></div>
          </div>
          <button type="button" onClick={onClose} aria-label="Close Origin viewer" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-zinc-400 hover:bg-white/10 hover:text-white"><X className="h-4 w-4" /></button>
        </header>
        <div className="space-y-4 p-5">
          {loading && <div className="flex items-center justify-center gap-2 py-12 text-sm text-zinc-400"><LoaderCircle className="h-4 w-4 animate-spin" />Checking source visibility…</div>}
          {!loading && error && <div className="flex items-start gap-3 rounded-2xl border border-amber-400/20 bg-amber-500/5 p-4 text-sm text-amber-200"><ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" /><p>{error}</p></div>}
          {!loading && !error && result && !result.hasLineage && <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-8 text-center"><GitBranch className="mx-auto mb-3 h-7 w-7 text-violet-300" /><p className="text-sm font-semibold text-white">No recorded remix lineage</p><p className="mt-1 text-xs text-zinc-400">This post has no saved source-attribution record.</p></div>}
          {!loading && !error && result?.hasLineage && <div className="space-y-3">
            <p className="text-xs leading-relaxed text-zinc-400">These are the source posts recorded when this remix was created. Source details are checked again before they are shown.</p>
            {result.sources.map(source => source.available ? (
              <a key={source.index} href={`/post/${source.postId}`} className="flex items-center gap-3 rounded-2xl border border-violet-400/15 bg-violet-500/[0.04] p-3 transition-colors hover:bg-violet-500/10">
                {source.avatar?.startsWith('https://') ? <img src={source.avatar} alt="" className="h-10 w-10 rounded-full object-cover bg-white/5" /> : <span className="flex h-10 w-10 items-center justify-center rounded-full bg-violet-500/15 text-sm font-bold text-violet-200">{(source.displayName || 'C').slice(0, 1).toUpperCase()}</span>}
                <span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold text-white">{source.displayName || 'NEXORA creator'}</span><span className="block truncate text-xs text-zinc-400">@{source.username || 'creator'}</span></span>
                <span className="text-[10px] font-semibold text-violet-300">View source</span>
              </a>
            ) : (
              <div key={source.index} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.02] p-3"><span className="flex h-10 w-10 items-center justify-center rounded-full bg-white/5 text-zinc-500"><ShieldAlert className="h-4 w-4" /></span><span><span className="block text-sm font-semibold text-zinc-300">Source unavailable</span><span className="block text-xs text-zinc-500">This source is no longer public or cannot be shown to this account.</span></span></div>
            ))}
          </div>}
          <p className="border-t border-white/10 pt-3 text-[11px] leading-relaxed text-zinc-500">Origin records document platform-observed source links. They do not prove who created the original work, who owns its rights, or whether its content is factually true.</p>
        </div>
      </section>
    </div>
  );
}
