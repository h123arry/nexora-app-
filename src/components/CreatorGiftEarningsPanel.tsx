import React, { useCallback, useEffect, useState } from 'react';
import { AlertCircle, Gift, RefreshCw, Wallet, TrendingUp, ShieldCheck, Loader2, ChevronDown } from 'lucide-react';
import { getCreatorEarningsSnapshot, type CreatorEarningsSnapshot, type CreatorGiftEarning } from '../services/creatorEarningsService';

function formatNex(value: number): string {
  return Number.isSafeInteger(value) && value >= 0 ? value.toLocaleString() : '—';
}
function formatDate(value: string | null): string {
  if (!value) return 'Date unavailable';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Date unavailable' : date.toLocaleString();
}

export default function CreatorGiftEarningsPanel() {
  const [snapshot, setSnapshot] = useState<CreatorEarningsSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [history, setHistory] = useState<CreatorGiftEarning[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const firstPage = await getCreatorEarningsSnapshot();
      setSnapshot(firstPage);
      setHistory(firstPage.earnings);
      setNextCursor(firstPage.nextCursor);
      setHasMore(firstPage.hasMoreEarnings);
    } catch {
      setError('Your creator earnings could not be loaded. Please check your connection and retry.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);

  const loadMore = async () => {
    if (!nextCursor || loadingMore) return;
    setLoadingMore(true);
    setError('');
    try {
      const page = await getCreatorEarningsSnapshot(nextCursor);
      setHistory(current => [...current, ...page.earnings]);
      setNextCursor(page.nextCursor);
      setHasMore(page.hasMoreEarnings);
    } catch {
      setError('Older gift earnings could not be loaded. Please retry.');
    } finally {
      setLoadingMore(false);
    }
  };

  return (
    <section className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[.22em] text-violet-300">GIFTVERSE · Creator economy</p>
          <h2 className="mt-1 text-2xl font-black text-white">Your gift earnings</h2>
          <p className="mt-1 text-sm text-slate-400">Transparent NEX earnings from gifts sent to you.</p>
        </div>
        <button type="button" onClick={() => void refresh()} disabled={loading}
          className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 text-xs font-bold text-white disabled:opacity-50">
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
        </button>
      </div>

      {error && <div role="alert" className="flex items-start gap-2 rounded-xl border border-rose-400/20 bg-rose-500/10 p-3 text-sm text-rose-200">
        <AlertCircle size={17} className="mt-0.5 shrink-0" />{error}
      </div>}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <article className="rounded-2xl border border-violet-300/20 bg-[linear-gradient(145deg,rgba(91,33,182,.22),rgba(10,7,31,.85))] p-4">
          <div className="flex items-center gap-2 text-xs text-violet-200"><Wallet size={15} /> Available NEX wallet</div>
          <p className="mt-3 text-2xl font-black tabular-nums text-white">{loading ? '—' : snapshot ? formatNex(snapshot.walletAvailableNex) : '—'} <span className="text-xs text-violet-200">NEX</span></p>
          <p className="mt-1 text-[10px] text-slate-400">Your current internal wallet balance</p>
        </article>
        <article className="rounded-2xl border border-white/10 bg-[#100d20] p-4">
          <div className="flex items-center gap-2 text-xs text-slate-300"><Gift size={15} /> Pending gift review</div>
          <p className="mt-3 text-2xl font-black tabular-nums text-white">{loading ? '—' : snapshot ? formatNex(snapshot.pendingReviewGrossNex) : '—'} <span className="text-xs text-slate-400">NEX</span></p>
          <p className="mt-1 text-[10px] text-slate-500">Held in escrow, not yet spendable</p>
        </article>
        <article className="rounded-2xl border border-white/10 bg-[#100d20] p-4">
          <div className="flex items-center gap-2 text-xs text-slate-300"><TrendingUp size={15} /> Recent creator share</div>
          <p className="mt-3 text-2xl font-black tabular-nums text-white">{loading ? '—' : snapshot ? formatNex(snapshot.recentCreatorShareNex) : '—'} <span className="text-xs text-slate-400">NEX</span></p>
          <p className="mt-1 text-[10px] text-slate-500">Settled share in the first 100 gift records</p>
        </article>
      </div>

      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-violet-300/15 bg-violet-500/[.06] p-4 text-xs">
        <span className="font-bold text-white">Revenue sharing</span>
        <span className="rounded-full border border-emerald-300/20 bg-emerald-400/10 px-3 py-1 text-emerald-200">Creator 70%</span>
        <span className="rounded-full border border-violet-300/20 bg-violet-400/10 px-3 py-1 text-violet-200">NEXORA 30%</span>
        <span className="text-slate-500">Policy {snapshot?.policyVersion || 'gift-revenue-v1'}</span>
      </div>

      <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#0a071f]/75">
        <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
          <h3 className="text-sm font-bold text-white">Gift earnings history</h3>
          <span className="text-[10px] text-slate-500">{history.length.toLocaleString()} records loaded</span>
        </div>
        {loading ? <div className="p-8 text-center text-sm text-slate-500">Loading verified earnings…</div>
          : !history.length ? <div className="p-8 text-center">
            <Gift size={24} className="mx-auto text-violet-300/60" />
            <p className="mt-3 text-sm font-semibold text-white">Your gift earnings will appear here</p>
            <p className="mt-1 text-xs text-slate-500">When people send you GIFTVERSE gifts, their verified records will show here.</p>
          </div> : <div className="divide-y divide-white/[.06]">
            {history.map(earning => <div key={earning.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
              <div className="flex min-w-0 items-center gap-3">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-violet-500/10 text-violet-200"><Gift size={17} /></span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-white">{earning.giftName || 'GIFTVERSE gift'}{earning.quantity > 1 ? ` ×${earning.quantity}` : ''}</p>
                  <p className="mt-1 text-[10px] text-slate-500">{formatDate(earning.createdAt)}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold tabular-nums text-white">{formatNex(earning.creatorShareNex ?? earning.grossNex)} NEX</p>
                <p className="text-[9px] text-slate-500">{earning.status === 'available' ? 'Creator share' : 'Gift gross'}</p>
                <p className={'mt-1 text-[10px] font-bold ' + (earning.status === 'available' ? 'text-emerald-300' : earning.status === 'pending_review' ? 'text-amber-200' : 'text-slate-400')}>
                  {earning.status === 'available' ? 'Available' : earning.status === 'pending_review' ? 'Pending review' : earning.status}
                </p>
              </div>
            </div>)}
          </div>}
        {hasMore && <div className="border-t border-white/10 p-3 text-center"><button type="button" onClick={() => void loadMore()} disabled={loadingMore} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-violet-300/20 bg-violet-500/10 px-4 text-xs font-bold text-violet-100 disabled:opacity-50">{loadingMore ? <Loader2 size={14} className="animate-spin"/> : <ChevronDown size={14}/>} {loadingMore ? 'Loading older earnings…' : 'Load older earnings'}</button></div>}
      </div>

      <div className="flex items-start gap-2 rounded-xl border border-white/10 bg-black/15 p-3 text-[11px] leading-5 text-slate-400">
        <ShieldCheck size={16} className="mt-0.5 shrink-0 text-violet-300" />
        Earnings settle into your NEX wallet only after trusted finance review. NEX-to-naira conversion and bank withdrawals are not enabled, so this dashboard never represents a bank payout as completed.
      </div>
    </section>
  );
}
