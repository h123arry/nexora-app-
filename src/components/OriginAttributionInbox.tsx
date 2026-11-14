import React, { useCallback, useEffect, useState } from 'react';
import { httpsCallable } from 'firebase/functions';
import { AlertCircle, CheckCircle2, RefreshCw, Scale, ShieldCheck, Send } from 'lucide-react';
import { auth, functions } from '../lib/firebase';

type OriginCase = {
  id: string; derivativeAssetId: string; sourceAssetId: string;
  requesterUid: string; sourceCreatorUid: string; reason: string;
  status: 'open' | 'accepted' | 'rejected' | 'disputed' | 'resolved';
  responseNote?: string | null; disputeReason?: string | null;
  reviewOutcome?: 'upheld' | 'overturned'; reviewNote?: string | null;
};
type QueueCase = Pick<OriginCase, 'id' | 'derivativeAssetId' | 'sourceAssetId' | 'requesterUid' | 'sourceCreatorUid' | 'reason' | 'responseNote' | 'disputeReason'>;

export default function OriginAttributionInbox() {
  const [cases, setCases] = useState<OriginCase[]>([]);
  const [queue, setQueue] = useState<QueueCase[]>([]);
  const [isReviewer, setIsReviewer] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [request, setRequest] = useState({ derivativeAssetId: '', sourceAssetId: '', reason: '' });
  const [showRequest, setShowRequest] = useState(false);

  const load = useCallback(async () => {
    const user = auth.currentUser;
    if (!user) { setError('Sign in to manage attribution cases.'); setLoading(false); return; }
    setLoading(true); setError('');
    try {
      const list = httpsCallable(functions, 'listMyOriginAttributionCases');
      const result = await list({});
      setCases(((result.data as { cases?: OriginCase[] }).cases || []));
      const token = await user.getIdTokenResult();
      const claims = token.claims;
      const role = typeof claims.role === 'string' ? claims.role : '';
      const reviewer = claims.moderator === true || claims.admin === true
        || ['moderator', 'senior_moderator', 'admin', 'founder'].includes(role);
      setIsReviewer(reviewer);
      if (reviewer) {
        const getQueue = httpsCallable(functions, 'getOriginAttributionDisputeQueue');
        const queued = await getQueue({});
        setQueue((queued.data as { cases?: QueueCase[] }).cases || []);
      } else setQueue([]);
    } catch {
      setError('Origin cases could not be loaded. Check your connection and try again.');
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const runAction = async (caseId: string, action: 'respond' | 'dispute', decision?: 'accepted' | 'rejected') => {
    const note = (notes[caseId] || '').trim();
    if (note.length < (action === 'dispute' ? 20 : 10)) { setError(action === 'dispute' ? 'A dispute explanation must contain at least 20 characters.' : 'Add a clear explanation of at least 10 characters.'); return; }
    setBusy(caseId); setError(''); setNotice('');
    try {
      if (action === 'respond') {
        await httpsCallable(functions, 'respondToOriginAttributionCorrection')({ caseId, decision, note });
      } else {
        await httpsCallable(functions, 'disputeOriginAttributionCorrection')({ caseId, reason: note });
      }
      setNotes(prev => ({ ...prev, [caseId]: '' }));
      setNotice(action === 'respond' ? 'Your attribution response was saved.' : 'Your dispute was submitted for review.');
      await load();
    } catch (err: any) { setError(err?.message || 'That action could not be completed.'); }
    finally { setBusy(''); }
  };

  const submitRequest = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy('new'); setError(''); setNotice('');
    try {
      await httpsCallable(functions, 'requestMyOriginAttributionCorrection')({
        derivativeAssetId: request.derivativeAssetId.trim(),
        sourceAssetId: request.sourceAssetId.trim(),
        reason: request.reason.trim(),
      });
      setRequest({ derivativeAssetId: '', sourceAssetId: '', reason: '' });
      setShowRequest(false);
      setNotice('Your attribution correction request was submitted.');
      await load();
    } catch (err: any) { setError(err?.message || 'Your request could not be submitted.'); }
    finally { setBusy(''); }
  };

  const resolve = async (caseId: string, outcome: 'upheld' | 'overturned') => {
    const note = (notes['review:' + caseId] || '').trim();
    if (note.length < 20) { setError('Staff decisions require a reason of at least 20 characters.'); return; }
    setBusy('review:' + caseId); setError(''); setNotice('');
    try {
      await httpsCallable(functions, 'resolveOriginAttributionDispute')({ caseId, outcome, note });
      setNotice('Final review decision recorded and both creators notified.');
      setNotes(prev => ({ ...prev, ['review:' + caseId]: '' }));
      await load();
    } catch (err: any) { setError(err?.message || 'The review decision could not be saved.'); }
    finally { setBusy(''); }
  };

  const inputClass = 'w-full rounded-xl border border-violet-400/20 bg-[#0a0b18] px-3 py-2.5 text-sm text-white placeholder:text-zinc-600 outline-none focus:border-violet-400';
  const panelClass = 'rounded-2xl border border-white/10 bg-[#111022] p-4 space-y-3';
  const statusClass = (status: string) => status === 'resolved' ? 'text-emerald-300' : status === 'disputed' ? 'text-amber-300' : status === 'rejected' ? 'text-rose-300' : 'text-violet-300';

  return <section className="space-y-4 border-b border-white/10 px-3 py-5" aria-label="NEXORA Origin attribution cases">
    <div className="flex items-center justify-between gap-3">
      <div><div className="flex items-center gap-2 text-white font-bold"><Scale className="h-5 w-5 text-violet-300" /> Origin attribution</div><p className="mt-1 text-xs text-zinc-500">Corrections, creator responses and disputes for your media lineage.</p></div>
      <button type="button" onClick={() => void load()} disabled={loading} aria-label="Refresh Origin cases" className="rounded-lg border border-white/10 p-2 text-zinc-300 hover:text-white disabled:opacity-50"><RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /></button>
    </div>
    {error && <p role="alert" className="flex items-center gap-2 text-sm text-rose-300"><AlertCircle className="h-4 w-4 shrink-0" />{error}</p>}
    {notice && <p role="status" className="flex items-center gap-2 text-sm text-emerald-300"><CheckCircle2 className="h-4 w-4 shrink-0" />{notice}</p>}
    <button type="button" onClick={() => setShowRequest(value => !value)} className="rounded-xl bg-violet-600/20 px-3 py-2 text-sm font-semibold text-violet-200 hover:bg-violet-600/30">Request an attribution correction</button>
    {showRequest && <form onSubmit={submitRequest} className={panelClass}>
      <p className="text-sm font-semibold text-white">Submit a correction request</p>
      <input className={inputClass} aria-label="Your derivative asset ID" placeholder="Your derivative asset ID" value={request.derivativeAssetId} onChange={e => setRequest(p => ({ ...p, derivativeAssetId: e.target.value }))} required />
      <input className={inputClass} aria-label="Source asset ID" placeholder="Source asset ID in the recorded lineage" value={request.sourceAssetId} onChange={e => setRequest(p => ({ ...p, sourceAssetId: e.target.value }))} required />
      <textarea className={inputClass} aria-label="Correction explanation" placeholder="Explain what attribution needs correcting (20–1,500 characters)" minLength={20} maxLength={1500} rows={3} value={request.reason} onChange={e => setRequest(p => ({ ...p, reason: e.target.value }))} required />
      <button disabled={busy === 'new'} className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"><Send className="h-4 w-4" />Submit request</button>
    </form>}
    {loading ? <p className="text-sm text-zinc-500">Loading Origin cases…</p> : cases.length === 0 ? <p className="text-sm text-zinc-500">No attribution cases yet.</p> : <div className="space-y-3">
      {cases.map(item => {
        const isSource = item.sourceCreatorUid === auth.currentUser?.uid;
        const isRequester = item.requesterUid === auth.currentUser?.uid;
        return <article key={item.id} className={panelClass}>
          <div className="flex items-center justify-between gap-2"><span className="text-sm font-semibold text-white">Case {item.id.slice(0, 10)}</span><span className={`text-xs font-semibold uppercase ${statusClass(item.status)}`}>{item.status}</span></div>
          <p className="text-xs text-zinc-500 break-all">Derivative {item.derivativeAssetId} · Source {item.sourceAssetId}</p>
          <p className="text-sm text-zinc-300">{item.reason}</p>
          {item.responseNote && <p className="text-xs text-zinc-400">Creator response: {item.responseNote}</p>}
          {item.disputeReason && <p className="text-xs text-amber-200">Dispute: {item.disputeReason}</p>}
          {item.status === 'resolved' && <p className="text-xs text-emerald-200">Final review: {item.reviewOutcome || 'resolved'}{item.reviewNote ? ` · ${item.reviewNote}` : ''}</p>}
          {isSource && item.status === 'open' && <div className="space-y-2"><textarea className={inputClass} rows={2} placeholder="Explain your decision (at least 10 characters)" value={notes[item.id] || ''} onChange={e => setNotes(p => ({ ...p, [item.id]: e.target.value }))} /><div className="flex gap-2"><button type="button" disabled={busy === item.id} onClick={() => void runAction(item.id, 'respond', 'accepted')} className="rounded-lg bg-emerald-600/20 px-3 py-2 text-xs font-semibold text-emerald-200">Accept correction</button><button type="button" disabled={busy === item.id} onClick={() => void runAction(item.id, 'respond', 'rejected')} className="rounded-lg bg-rose-600/20 px-3 py-2 text-xs font-semibold text-rose-200">Reject correction</button></div></div>}
          {isRequester && ['accepted', 'rejected'].includes(item.status) && <div className="space-y-2"><textarea className={inputClass} rows={2} placeholder="Explain why you are disputing this decision (20–1,500 characters)" value={notes[item.id] || ''} onChange={e => setNotes(p => ({ ...p, [item.id]: e.target.value }))} /><button type="button" disabled={busy === item.id} onClick={() => void runAction(item.id, 'dispute')} className="rounded-lg bg-amber-500/20 px-3 py-2 text-xs font-semibold text-amber-200">Escalate as dispute</button></div>}
        </article>;
      })}
    </div>}
    {isReviewer && <div className="space-y-3 border-t border-white/10 pt-4"><div className="flex items-center gap-2 text-sm font-bold text-white"><ShieldCheck className="h-4 w-4 text-amber-300" /> Staff dispute review queue</div>
      {queue.length === 0 ? <p className="text-xs text-zinc-500">No disputed cases waiting for review.</p> : queue.map(item => <article key={item.id} className={panelClass}>
        <p className="text-sm font-semibold text-white">Disputed case {item.id.slice(0, 10)}</p><p className="text-xs text-zinc-400">Requester {item.requesterUid} · Source creator {item.sourceCreatorUid}</p><p className="text-sm text-zinc-300">{item.disputeReason || item.reason}</p>
        <textarea className={inputClass} rows={2} placeholder="Document the independent review (minimum 20 characters)" value={notes['review:' + item.id] || ''} onChange={e => setNotes(p => ({ ...p, ['review:' + item.id]: e.target.value }))} />
        <div className="flex flex-wrap gap-2"><button type="button" disabled={busy === 'review:' + item.id} onClick={() => void resolve(item.id, 'upheld')} className="rounded-lg bg-violet-600/30 px-3 py-2 text-xs font-semibold text-violet-100">Uphold decision</button><button type="button" disabled={busy === 'review:' + item.id} onClick={() => void resolve(item.id, 'overturned')} className="rounded-lg bg-amber-600/20 px-3 py-2 text-xs font-semibold text-amber-100">Overturn decision</button></div>
      </article>)}
    </div>}
  </section>;
}
