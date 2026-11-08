import React, { useCallback, useEffect, useState } from 'react';
import { AlertCircle, CheckCircle2, RefreshCw, ShieldCheck, Wallet } from 'lucide-react';
import { getPendingGiftEarningsForFinance, settleGiftCreatorEarning, type PendingGiftEarningForFinance } from '../services/creatorEarningsService';

function dateLabel(value: string | null): string {
  if (!value) return 'Date unavailable';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Date unavailable' : date.toLocaleString();
}
function riskLabel(disposition: PendingGiftEarningForFinance['riskDisposition']): string {
  if (disposition === 'auto_cleared') return 'Low risk · auto-cleared';
  if (disposition === 'cleared') return 'Finance-cleared';
  if (disposition === 'escalated') return 'Escalated · settlement blocked';
  if (disposition === 'legacy_manual_review') return 'Legacy record · finance review';
  return 'Risk review required';
}
function canSettle(record: PendingGiftEarningForFinance): boolean {
  return record.riskDisposition === 'auto_cleared'
    || record.riskDisposition === 'cleared'
    || record.riskDisposition === 'legacy_manual_review';
}
export default function GiftEarningsFinancePanel() {
  const [records, setRecords] = useState<PendingGiftEarningForFinance[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [hasMore, setHasMore] = useState(false);
  const [denied, setDenied] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true); setError(''); setDenied(false); setNotice('');
    try {
      const result = await getPendingGiftEarningsForFinance();
      setRecords(result.records); setHasMore(result.hasMore);
    } catch (cause) {
      const code = (cause as { code?: string })?.code || '';
      if (code.includes('permission-denied')) setDenied(true);
      else setError('The GIFTVERSE finance queue could not be loaded. Retry when connected.');
    } finally { setLoading(false); }
  }, []);
  useEffect(() => { void refresh(); }, [refresh]);

  const settle = async (record: PendingGiftEarningForFinance) => {
    if (busyId) return;
    setBusyId(record.transactionId); setError(''); setNotice('');
    try {
      const result = await settleGiftCreatorEarning(record.transactionId);
      const successMessage = result.replayed ? 'This gift was already settled. The ledger was not charged again.' : `Settled ${result.creatorShareNex?.toLocaleString() || '0'} NEX to the creator and ${result.platformShareNex?.toLocaleString() || '0'} NEX to the platform treasury.`;
      await refresh();
      setNotice(successMessage);
    } catch (cause) {
      const code = (cause as { code?: string })?.code || '';
      setError(code.includes('permission-denied') ? 'Your finance permission is no longer active.' : 'Settlement was not confirmed. Check the ledger before retrying.');
    } finally { setBusyId(''); }
  };

  if (denied) return <section className="rounded-2xl border border-white/10 bg-[#0a071f]/80 p-5">
    <div className="flex items-center gap-2 text-sm font-bold text-white"><ShieldCheck size={17} className="text-violet-300" /> Finance review</div>
    <p className="mt-2 text-sm text-slate-400">This queue is restricted to trusted finance administrators. Your account does not currently have that claim.</p>
  </section>;

  return <section className="space-y-4 rounded-2xl border border-white/10 bg-[#0a071f]/80 p-5">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div><p className="text-[10px] font-black uppercase tracking-[.2em] text-violet-300">Restricted operations</p><h3 className="mt-1 text-lg font-black text-white">GIFTVERSE settlement queue</h3><p className="mt-1 text-xs text-slate-400">Approve escrow-backed gift earnings into creator NEX wallets.</p></div>
      <button type="button" onClick={() => void refresh()} disabled={loading || !!busyId} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-white/10 px-3 text-xs font-bold text-white disabled:opacity-50"><RefreshCw size={14} className={loading ? 'animate-spin' : ''}/> Refresh</button>
    </div>
    {error && <p role="alert" className="rounded-xl border border-rose-400/20 bg-rose-500/10 p-3 text-xs text-rose-200"><AlertCircle size={14} className="mr-2 inline"/> {error}</p>}
    {notice && <p role="status" className="rounded-xl border border-emerald-400/20 bg-emerald-500/10 p-3 text-xs text-emerald-200"><CheckCircle2 size={14} className="mr-2 inline"/> {notice}</p>}
    {loading ? <p className="p-6 text-center text-sm text-slate-500">Loading finance queue…</p>
      : records.length === 0 ? <p className="p-8 text-center text-sm text-slate-400">No gift earnings are waiting for review.</p>
      : <div className="space-y-3">{records.map(record => <article key={record.transactionId} className="rounded-xl border border-white/10 bg-black/15 p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0"><p className="font-bold text-white">{record.giftName || 'GIFTVERSE gift'}{record.quantity > 1 ? ` ×${record.quantity}` : ''}</p><p className="mt-1 text-[10px] text-slate-500">{dateLabel(record.createdAt)}</p><p className="mt-1 break-all text-[10px] text-slate-600">Creator {record.creatorId} · Sender {record.senderId}</p></div>
          <div className="text-right"><p className="text-lg font-black tabular-nums text-white">{record.grossNex.toLocaleString()} NEX</p><p className="text-[10px] text-amber-200">Held in escrow</p></div>
        </div>
        <div className="mt-3 rounded-lg border border-white/10 bg-white/[.03] p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-[10px] font-bold text-violet-200">{riskLabel(record.riskDisposition)}</span>
            <span className="text-[10px] text-slate-500">{record.riskTier ? record.riskTier.toUpperCase() + ' risk' : 'No risk signal'}</span>
          </div>
          {record.riskReasons.length > 0 && <p className="mt-1 text-[10px] leading-4 text-slate-400">{record.riskReasons.join(' · ')}</p>}
          {record.riskDisposition === 'review_only' && <p className="mt-1 text-[10px] text-amber-200">Clear this signal in Gift Economy Operations before settling.</p>}
          {record.riskDisposition === 'escalated' && <p className="mt-1 text-[10px] text-rose-200">This gift cannot be settled while the risk decision is escalated.</p>}
        </div>
        <button type="button" disabled={!!busyId || !canSettle(record)} onClick={() => void settle(record)} className="mt-3 inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-4 text-xs font-bold text-white disabled:opacity-50">
          {busyId === record.transactionId ? <RefreshCw size={14} className="animate-spin"/> : <Wallet size={14}/>} {busyId === record.transactionId ? 'Settling securely…' : canSettle(record) ? 'Approve and settle 70/30' : 'Risk clearance required'}
        </button>
      </article>)}</div>}
    {hasMore && <p className="text-[10px] text-slate-500">Showing the latest 100 pending records. Older queue items require a subsequent page.</p>}
    <p className="text-[10px] leading-5 text-slate-500">Every approval is finance-claim protected and posts a balanced, idempotent NEX ledger settlement. This control does not initiate bank withdrawals.</p>
  </section>;
}
