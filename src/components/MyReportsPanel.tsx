import React, { useCallback, useEffect, useState } from 'react';
import { RefreshCw, ShieldCheck, Clock3, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
import { getMyModerationReports, type MyModerationReport } from '../services/dataService';

interface Props { userId: string; }

const STATUS: Record<MyModerationReport['status'], { label: string; description: string; icon: React.ElementType }> = {
  pending: { label: 'Submitted', description: 'Your report has been received.', icon: Clock3 },
  under_review: { label: 'Under review', description: 'A moderator is reviewing this report.', icon: Clock3 },
  escalated: { label: 'Escalated', description: 'This report needs additional review.', icon: AlertCircle },
  resolved: { label: 'Resolved', description: 'The review is complete.', icon: CheckCircle2 },
  dismissed: { label: 'Closed', description: 'The review is complete and no action was taken.', icon: XCircle },
};

function formatDate(value: string | null): string {
  if (!value) return 'Date unavailable';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Date unavailable' : date.toLocaleString();
}

export default function MyReportsPanel({ userId }: Props) {
  const [reports, setReports] = useState<MyModerationReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const refresh = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setReports(await getMyModerationReports(userId));
    } catch {
      setError('Your report history could not be loaded. Please retry.');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => { void refresh(); }, [refresh]);
  useEffect(() => {
    const onUpdated = () => { void refresh(); };
    window.addEventListener('reports-updated', onUpdated);
    return () => window.removeEventListener('reports-updated', onUpdated);
  }, [refresh]);

  return <section className="rounded-2xl border border-violet-400/15 bg-[#090714] p-4 space-y-3">
    <div className="flex items-center gap-3">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-violet-400/20 bg-violet-500/10 text-violet-200"><ShieldCheck className="h-5 w-5" /></div>
      <div className="min-w-0 flex-1"><h4 className="text-sm font-bold text-white">My safety reports</h4><p className="text-[11px] text-zinc-400">Private status updates for reports you submitted.</p></div>
      <button type="button" onClick={() => void refresh()} disabled={loading} aria-label="Refresh report history" className="rounded-lg border border-white/10 p-2 text-zinc-300 disabled:opacity-50"><RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /></button>
    </div>
    {error && <p role="alert" className="rounded-xl border border-rose-400/20 bg-rose-500/5 p-3 text-xs text-rose-200">{error}</p>}
    {loading ? <p className="py-4 text-center text-xs text-zinc-500">Loading your reports…</p> :
      reports.length === 0 ? <p className="rounded-xl border border-white/5 p-4 text-center text-xs text-zinc-500">You haven't submitted any reports yet.</p> :
      <div className="space-y-2">{reports.map(report => {
        const meta = STATUS[report.status];
        const Icon = meta.icon;
        return <article key={report.id} className="rounded-xl border border-white/5 bg-white/[0.025] p-3">
          <div className="flex items-start gap-2.5">
            <Icon className="mt-0.5 h-4 w-4 shrink-0 text-violet-300" />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center justify-between gap-2"><span className="text-xs font-semibold text-white">{meta.label}</span><span className="text-[10px] text-zinc-500">{formatDate(report.createdAt)}</span></div>
              <p className="mt-1 text-[11px] text-zinc-400">{meta.description}</p>
              <p className="mt-1 text-[10px] text-zinc-500">{report.targetType} · {report.category.replaceAll('_', ' ')}</p>
            </div>
          </div>
        </article>;
      })}</div>}
  </section>;
}
