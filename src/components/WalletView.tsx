import React, { useCallback, useEffect, useState } from 'react';
import {
  Wallet, Coins, Zap, History, ShieldCheck, RefreshCw,
  ArrowDownLeft, ArrowUpRight, AlertCircle,
} from 'lucide-react';
import type { User } from '../types';
import { getNexWalletSnapshot, type NexWalletSnapshot } from '../services/nexWalletService';

interface WalletViewProps { currentUser: User }

function formatUnits(value: unknown): string {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0
    ? value.toLocaleString()
    : '0';
}

function formatDate(value: string | null): string {
  if (!value) return 'Date unavailable';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Date unavailable' : date.toLocaleString();
}

export default function WalletView({ currentUser }: WalletViewProps) {
  const [snapshot, setSnapshot] = useState<NexWalletSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refreshWallet = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await getNexWalletSnapshot();
      setSnapshot(result);
    } catch {
      setError('We could not securely load your wallet. Check your connection and try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setSnapshot(null);
    void refreshWallet();
  }, [refreshWallet, currentUser.id]);

  const sparks = typeof currentUser.sparks === 'number' && Number.isFinite(currentUser.sparks)
    ? currentUser.sparks.toLocaleString()
    : '0';

  return (
    <main className="nx-page-shell mx-auto w-full max-w-4xl space-y-6 px-4 pb-28 pt-6 sm:px-6 sm:pb-12" aria-labelledby="wallet-title">
      <header className="flex flex-col gap-3 rounded-2xl border border-[var(--nx-edge)] bg-[var(--nx-surface)] p-5 text-left sm:flex-row sm:items-center">
        <span className="flex h-12 w-12 items-center justify-center rounded-xl border border-[var(--nx-edge)] bg-[var(--nx-surface-2)] text-[var(--nx-violet-bright)]"><Wallet aria-hidden="true" /></span>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-[.14em] text-[var(--nx-muted)]">Your account</p>
          <h1 id="wallet-title" className="text-xl font-bold text-white">Nexora Wallet</h1>
          <p className="mt-1 text-sm text-[var(--nx-muted)]">Your NEX balance is loaded from the trusted wallet ledger, not from editable profile data.</p>
        </div>
        <button type="button" onClick={() => void refreshWallet()} disabled={loading} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-[var(--nx-edge)] px-3 text-sm font-semibold text-white transition hover:bg-[var(--nx-surface-2)] disabled:opacity-50" aria-label="Refresh wallet">
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} aria-hidden="true" />Refresh
        </button>
      </header>

      <section className="grid gap-4 sm:grid-cols-2" aria-label="Current balances">
        <article className="rounded-2xl border border-[var(--nx-edge)] bg-[var(--nx-surface)] p-5 text-left">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-[var(--nx-muted)]"><Coins className="h-4 w-4 text-[var(--nx-violet-bright)]" aria-hidden="true" />Nex Coin balance</h2>
          <p className="mt-5 text-3xl font-bold tracking-tight text-white">{loading ? '…' : snapshot ? formatUnits(snapshot.availableBalance) : '—'}<span className="ml-2 text-base text-[var(--nx-muted)]">NEX</span></p>
          <p className="mt-2 text-xs text-[var(--nx-muted)]">Server-confirmed available balance</p>
        </article>
        <article className="rounded-2xl border border-[var(--nx-edge)] bg-[var(--nx-surface)] p-5 text-left">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-[var(--nx-muted)]"><Zap className="h-4 w-4 text-[var(--nx-violet-bright)]" aria-hidden="true" />Sparks</h2>
          <p className="mt-5 text-3xl font-bold tracking-tight text-white">{sparks}<span className="ml-2 text-base text-[var(--nx-muted)]">Sparks</span></p>
          <p className="mt-2 text-xs text-[var(--nx-muted)]">Separate from Nex Coin</p>
        </article>
      </section>

      {error && (
        <div role="alert" className="flex items-start gap-3 rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 text-left">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-400" aria-hidden="true" />
          <p className="text-sm text-[var(--nx-muted)]">{error}</p>
        </div>
      )}

      {snapshot && (
        <section className="grid gap-3 sm:grid-cols-2" aria-label="Wallet totals">
          <div className="rounded-xl border border-[var(--nx-edge)] bg-[var(--nx-surface)] p-4 text-left">
            <p className="text-xs text-[var(--nx-muted)]">Lifetime credited</p>
            <p className="mt-1 text-lg font-semibold text-white">{formatUnits(snapshot.lifetimeCredited)} NEX</p>
          </div>
          <div className="rounded-xl border border-[var(--nx-edge)] bg-[var(--nx-surface)] p-4 text-left">
            <p className="text-xs text-[var(--nx-muted)]">Lifetime debited</p>
            <p className="mt-1 text-lg font-semibold text-white">{formatUnits(snapshot.lifetimeDebited)} NEX</p>
          </div>
        </section>
      )}

      <section className="rounded-2xl border border-[var(--nx-edge)] bg-[var(--nx-surface)] p-5 text-left" aria-labelledby="ledger-title">
        <div className="flex items-center justify-between gap-3">
          <h2 id="ledger-title" className="flex items-center gap-2 text-sm font-semibold text-white"><History className="h-4 w-4 text-[var(--nx-violet-bright)]" aria-hidden="true" />Transaction history</h2>
          <span className="text-xs text-[var(--nx-muted)]">Latest 25</span>
        </div>
        {loading ? (
          <p className="mt-4 text-sm text-[var(--nx-muted)]">Loading verified wallet activity…</p>
        ) : snapshot?.transactions.length ? (
          <ul className="mt-3 divide-y divide-[var(--nx-edge)]">
            {snapshot.transactions.map((entry) => (
              <li key={entry.id} className="flex items-center gap-3 py-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--nx-surface-2)] text-[var(--nx-violet-bright)]">
                  {entry.direction === 'credit' ? <ArrowDownLeft className="h-4 w-4" aria-hidden="true" /> : <ArrowUpRight className="h-4 w-4" aria-hidden="true" />}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-white">{entry.description || 'Nex Coin activity'}</p>
                  <p className="mt-0.5 text-xs text-[var(--nx-muted)]">{formatDate(entry.createdAt)}</p>
                </div>
                <p className={`shrink-0 text-sm font-semibold ${entry.direction === 'credit' ? 'text-emerald-400' : 'text-white'}`}>
                  {entry.direction === 'credit' ? '+' : '−'}{formatUnits(entry.units)} NEX
                </p>
              </li>
            ))}
          </ul>
        ) : (
          <div className="mt-4 rounded-xl border border-[var(--nx-edge)] bg-[var(--nx-surface-2)] p-4">
            <div className="flex items-center gap-2 text-sm font-medium text-white"><ShieldCheck className="h-4 w-4 text-[var(--nx-violet-bright)]" aria-hidden="true" />Your wallet is ready</div>
            <p className="mt-2 text-sm leading-relaxed text-[var(--nx-muted)]">Your verified ledger starts at zero. Coin purchases and gifting will be enabled in later Phase 5 stages after their payment and transaction flows are connected.</p>
          </div>
        )}
      </section>
    </main>
  );
}
