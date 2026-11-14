import React, { useCallback, useEffect, useState } from 'react';
import { httpsCallable } from 'firebase/functions';
import { Activity, RefreshCw, Users, Repeat2, GitBranch, AlertTriangle } from 'lucide-react';
import { auth, functions } from '../lib/firebase';

type Insights = {
  remixesCreatedByYou: number; sourceUsesAttributedToYou: number; uniqueRemixers: number;
  selfRemixUses: number; deepLineageUses: number; repeatedSourceUsePatterns: number;
  sampleSize: number; sampleLimit: number; sampleCapped: boolean; sampledAt: string; methodology: string;
};
const metrics = [
  { key: 'sourceUsesAttributedToYou', label: 'Attributed source uses', icon: GitBranch, note: 'Recorded remix uses that credit your media' },
  { key: 'uniqueRemixers', label: 'Distinct remixers', icon: Users, note: 'Different creator accounts in this sample' },
  { key: 'remixesCreatedByYou', label: 'Remixes you created', icon: Repeat2, note: 'Your own recorded remix events' },
] as const;

export default function OriginCreatorInsightsPanel() {
  const [insights, setInsights] = useState<Insights | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const load = useCallback(async () => {
    if (!auth.currentUser) { setError('Sign in to view Origin insights.'); setLoading(false); return; }
    setLoading(true); setError('');
    try {
      const result = await httpsCallable(functions, 'getMyOriginCreatorInsights')({});
      setInsights(result.data as Insights);
    } catch { setError('Origin insights could not be loaded. Try again shortly.'); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);
  return <section aria-label="Origin creator insights" className="space-y-3 rounded-2xl border border-violet-400/15 bg-[#0d0a20] p-4">
    <div className="flex items-center justify-between gap-3">
      <div><div className="flex items-center gap-2 text-sm font-bold text-white"><Activity className="h-4 w-4 text-violet-300" /> Creator recognition</div><p className="mt-1 text-xs text-zinc-500">Measured attribution activity from recorded remix lineage.</p></div>
      <button type="button" onClick={() => void load()} disabled={loading} aria-label="Refresh Origin insights" className="rounded-lg border border-white/10 p-2 text-zinc-300 disabled:opacity-50"><RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /></button>
    </div>
    {error && <p role="alert" className="text-xs text-rose-300">{error}</p>}
    {loading && <p className="text-xs text-zinc-500">Measuring recorded lineage…</p>}
    {!loading && insights && <>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        {metrics.map(metric => { const Icon = metric.icon; return <div key={metric.key} className="rounded-xl border border-white/10 bg-white/[0.025] p-3">
          <div className="flex items-center justify-between"><span className="text-[11px] font-semibold text-zinc-400">{metric.label}</span><Icon className="h-4 w-4 text-violet-300" /></div>
          <p className="mt-2 text-2xl font-black tabular-nums text-white">{insights[metric.key].toLocaleString()}</p><p className="mt-1 text-[10px] text-zinc-500">{metric.note}</p>
        </div>; })}
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-xl border border-white/10 p-3"><p className="text-[10px] text-zinc-500">Self-remix uses</p><p className="mt-1 text-lg font-bold text-white">{insights.selfRemixUses}</p></div>
        <div className="rounded-xl border border-white/10 p-3"><p className="text-[10px] text-zinc-500">Deep lineage uses (depth 6+)</p><p className="mt-1 text-lg font-bold text-white">{insights.deepLineageUses}</p></div>
      </div>
      {(insights.repeatedSourceUsePatterns > 0 || insights.deepLineageUses > 0) && <p className="flex items-start gap-2 text-[11px] leading-relaxed text-amber-200"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />Some repeated-source or deep-lineage patterns merit context review. These signals are not findings of copying, fraud or rights violations.</p>}
      <p className="text-[10px] leading-relaxed text-zinc-500">{insights.methodology} Sample: {insights.sampleSize}/{insights.sampleLimit}{insights.sampleCapped ? '+' : ''} events. No financial rewards are calculated from these counts.</p>
    </>}
  </section>;
}
