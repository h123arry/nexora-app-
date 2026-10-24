import React from 'react';
import { Wallet, Coins, Zap, History, ShieldCheck } from 'lucide-react';
import { User } from '../types';

interface WalletViewProps { currentUser: User }

function balance(value: unknown): string {
  return typeof value === 'number' && Number.isFinite(value)
    ? value.toLocaleString(undefined, { maximumFractionDigits: 2 })
    : 'Not available';
}

export default function WalletView({ currentUser }: WalletViewProps) {
  const nexBalance = balance(currentUser.nexBalance);
  const sparks = balance(currentUser.sparks);
  const hasTrustedLedger = false;

  return (
    <main className="nx-page-shell mx-auto w-full max-w-4xl space-y-6 px-4 pb-28 pt-6 sm:px-6 sm:pb-12" aria-labelledby="wallet-title">
      <header className="flex flex-col gap-3 rounded-2xl border border-[var(--nx-edge)] bg-[var(--nx-surface)] p-5 text-left sm:flex-row sm:items-center">
        <span className="flex h-12 w-12 items-center justify-center rounded-xl border border-[var(--nx-edge)] bg-[var(--nx-surface-2)] text-[var(--nx-violet-bright)]"><Wallet aria-hidden="true" /></span>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[.14em] text-[var(--nx-muted)]">Account balances</p>
          <h1 id="wallet-title" className="text-xl font-bold text-white">Nexora Wallet</h1>
          <p className="mt-1 text-sm text-[var(--nx-muted)]">Only account values currently stored for @{currentUser.username} are shown. No cash conversion is implied.</p>
        </div>
      </header>

      <section className="grid gap-4 sm:grid-cols-2" aria-label="Current balances">
        <article className="rounded-2xl border border-[var(--nx-edge)] bg-[var(--nx-surface)] p-5 text-left">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-[var(--nx-muted)]"><Coins className="h-4 w-4 text-[var(--nx-violet-bright)]" aria-hidden="true" />NEX balance</h2>
          <p className="mt-5 text-3xl font-bold tracking-tight text-white">{nexBalance}<span className="ml-2 text-base text-[var(--nx-muted)]">NEX</span></p>
        </article>
        <article className="rounded-2xl border border-[var(--nx-edge)] bg-[var(--nx-surface)] p-5 text-left">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-[var(--nx-muted)]"><Zap className="h-4 w-4 text-[var(--nx-violet-bright)]" aria-hidden="true" />Sparks</h2>
          <p className="mt-5 text-3xl font-bold tracking-tight text-white">{sparks}<span className="ml-2 text-base text-[var(--nx-muted)]">Sparks</span></p>
        </article>
      </section>

      <section className="rounded-2xl border border-[var(--nx-edge)] bg-[var(--nx-surface)] p-5 text-left" aria-labelledby="ledger-title">
        <h2 id="ledger-title" className="flex items-center gap-2 text-sm font-semibold text-white"><History className="h-4 w-4 text-[var(--nx-violet-bright)]" aria-hidden="true" />Transaction history</h2>
        {hasTrustedLedger ? null : (
          <div className="mt-4 rounded-xl border border-[var(--nx-edge)] bg-[var(--nx-surface-2)] p-4">
            <div className="flex items-center gap-2 text-sm font-medium text-white"><ShieldCheck className="h-4 w-4 text-[var(--nx-muted)]" aria-hidden="true" />No verified ledger connected</div>
            <p className="mt-2 text-sm leading-relaxed text-[var(--nx-muted)]">Transfers, payouts, and transaction history are not available from the current backend. This page will not show sample balances, fabricated transactions, or non-functional transfer controls.</p>
          </div>
        )}
      </section>
    </main>
  );
}
