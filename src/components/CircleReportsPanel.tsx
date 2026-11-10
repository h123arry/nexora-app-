import React, { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, Check, RefreshCw, ShieldCheck, Trash2 } from 'lucide-react';
import { CommunityService } from '../services/firebase/communityService';

type CircleReport = {
  id: string;
  reporterUid: string;
  reporterName: string;
  targetType: 'member' | 'post' | 'message';
  targetId: string;
  targetSummary: string;
  reason: string;
  createdAt: string;
};

export default function CircleReportsPanel({
  communityId,
  canManage,
}: {
  communityId: string;
  canManage: boolean;
}) {
  const [reports, setReports] = useState<CircleReport[]>([]);
  const [reviewReason, setReviewReason] = useState('');
  const [loading, setLoading] = useState(true);
  const [workingId, setWorkingId] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const refresh = useCallback(async () => {
    if (!canManage) return;
    setLoading(true);
    setError('');
    try {
      const items = await CommunityService.listReports(communityId);
      setReports(items);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Circle reports could not be loaded.');
    } finally {
      setLoading(false);
    }
  }, [communityId, canManage]);

  useEffect(() => { void refresh(); }, [refresh]);

  const resolve = async (report: CircleReport, action: 'dismiss' | 'remove_content' | 'ban_member') => {
    if (!canManage || workingId || reviewReason.trim().length < 3) return;
    const label = action === 'ban_member' ? 'ban the reported member'
      : action === 'remove_content' ? 'remove the reported content' : 'dismiss this report';
    if (!window.confirm(`Confirm decision: ${label}?`)) return;
    setWorkingId(report.id);
    setError('');
    setNotice('');
    try {
      await CommunityService.resolveReport(communityId, report.id, action, reviewReason);
      setReports(previous => previous.filter(item => item.id !== report.id));
      setReviewReason('');
      setNotice('The report decision was saved and recorded.');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'The report decision could not be saved.');
    } finally {
      setWorkingId('');
    }
  };

  if (!canManage) return <section className="rounded-2xl border border-white/10 p-5 text-xs text-white/45">Circle report review is available to active moderators, admins and owners.</section>;

  return <section className="space-y-4 text-left">
    <div className="flex items-center justify-between gap-3">
      <div>
        <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-violet-300">Circle safety reports</h3>
        <p className="mt-1 text-[10px] text-white/40">Private reports submitted by Circle members. The queue shows up to 50 open reports.</p>
      </div>
      <button type="button" onClick={() => void refresh()} disabled={loading} className="inline-flex items-center gap-1 rounded-lg border border-white/10 px-3 py-2 text-[10px] font-bold text-white/65 disabled:opacity-30">
        <RefreshCw size={11}/>{loading ? 'Loading' : 'Refresh'}
      </button>
    </div>
    <div className="rounded-xl border border-violet-400/15 bg-violet-500/[0.04] p-3 space-y-2">
      <label htmlFor="circle-report-review-reason" className="block text-[10px] font-bold uppercase tracking-wider text-violet-200/70">Decision reason (required and audit logged)</label>
      <input id="circle-report-review-reason" value={reviewReason} onChange={event => setReviewReason(event.target.value)} maxLength={500}
        placeholder="Explain the moderation decision..." className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-xs text-white placeholder:text-white/30 focus:border-violet-400/40 focus:outline-none"/>
    </div>
    {error && <p role="alert" className="rounded-xl border border-rose-400/20 bg-rose-950/20 p-3 text-xs text-rose-200">{error}</p>}
    {notice && <p role="status" className="rounded-xl border border-emerald-400/15 bg-emerald-950/10 p-3 text-xs text-emerald-200">{notice}</p>}
    {loading ? <p className="py-8 text-center text-xs text-white/40">Loading private reports…</p>
      : reports.length === 0 ? <div className="rounded-2xl border border-dashed border-white/10 p-8 text-center">
        <ShieldCheck size={24} className="mx-auto text-violet-300/60"/>
        <p className="mt-3 text-sm font-bold text-white">No open reports</p>
        <p className="mt-1 text-xs text-white/40">New member reports will appear here for review.</p>
      </div>
      : <div className="space-y-3">{reports.map(report => <article key={report.id} className="space-y-3 rounded-2xl border border-white/10 bg-white/[0.025] p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-md border border-rose-400/20 bg-rose-500/10 px-2 py-1 text-[9px] font-bold uppercase text-rose-200">{report.targetType}</span>
              <span className="text-[10px] text-white/40">Reported by {report.reporterName}</span>
            </div>
            <p className="mt-2 break-words text-xs font-bold text-white">{report.targetSummary || 'Content unavailable'}</p>
            <p className="mt-1 break-all text-[9px] text-white/25">Target: {report.targetId}</p>
            {report.createdAt && <p className="mt-1 text-[9px] text-white/30">{new Date(report.createdAt).toLocaleString()}</p>}
          </div>
          <AlertTriangle size={15} className="shrink-0 text-amber-300/70"/>
        </div>
        <div className="rounded-xl bg-black/20 p-3">
          <p className="text-[9px] font-bold uppercase tracking-wider text-white/35">Report reason</p>
          <p className="mt-1 whitespace-pre-wrap break-words text-xs leading-5 text-white/75">{report.reason}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => void resolve(report, 'dismiss')} disabled={Boolean(workingId) || reviewReason.trim().length < 3}
            className="inline-flex items-center gap-1 rounded-lg border border-white/10 px-3 py-2 text-[10px] font-bold text-white/65 disabled:opacity-30">
            <Check size={11}/>{workingId === report.id ? 'Saving…' : 'Dismiss'}
          </button>
          {report.targetType === 'member'
            ? <button type="button" onClick={() => void resolve(report, 'ban_member')} disabled={Boolean(workingId) || reviewReason.trim().length < 3}
                className="inline-flex items-center gap-1 rounded-lg border border-rose-400/20 px-3 py-2 text-[10px] font-bold text-rose-200 disabled:opacity-30">
                <AlertTriangle size={11}/>Ban member
              </button>
            : <button type="button" onClick={() => void resolve(report, 'remove_content')} disabled={Boolean(workingId) || reviewReason.trim().length < 3}
                className="inline-flex items-center gap-1 rounded-lg border border-rose-400/20 px-3 py-2 text-[10px] font-bold text-rose-200 disabled:opacity-30">
                <Trash2 size={11}/>Remove content
              </button>}
        </div>
      </article>)}</div>}
  </section>;
}
