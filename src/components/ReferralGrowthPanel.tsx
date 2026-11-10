import React, { useCallback, useEffect, useState } from 'react';
import { Users, Link2, RefreshCw, Share2, Sparkles } from 'lucide-react';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../lib/firebase';
import type { User } from '../types';

interface Summary { codeCount: number; totalInvites: number; pending: number; qualified: number; rewardsNex: number; }
interface Props { currentUser: User; }

export default function ReferralGrowthPanel({ currentUser }: Props) {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const [inviteUrl, setInviteUrl] = useState('');

  const refresh = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const call = httpsCallable<Record<string, never>, Summary>(functions, 'getMyReferralSummary');
      const result = await call({});
      setSummary(result.data);
    } catch { setError('Referral activity could not be loaded.'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { void refresh(); }, [refresh, currentUser.id]);

  const createInvite = async () => {
    if (creating) return;
    setCreating(true); setError('');
    try {
      const call = httpsCallable<Record<string, never>, { code: string }>(functions, 'createMyReferralCode');
      const result = await call({});
      const url = new URL(window.location.origin + '/');
      url.searchParams.set('ref', result.data.code);
      setInviteUrl(url.toString());
      if (navigator.share) await navigator.share({ title: 'Join me on NEXORA', text: 'Join me on NEXORA, the world’s living social network.', url: url.toString() });
      else await navigator.clipboard.writeText(url.toString());
      window.dispatchEvent(new CustomEvent('toast', { detail: 'Your personal NEXORA invitation link is ready.' }));
      await refresh();
    } catch (reason) {
      if (!(reason instanceof Error && reason.name === 'AbortError')) {
        setError(reason instanceof Error && reason.message.includes('not currently available')
          ? 'The referral programme is not activated yet. Treasury funding and programme configuration are required first.'
          : 'Your invitation link could not be created. Please retry.');
      }
    } finally { setCreating(false); }
  };

  const copyInvite = async () => {
    if (!inviteUrl) return;
    try { await navigator.clipboard.writeText(inviteUrl); window.dispatchEvent(new CustomEvent('toast', { detail: 'Referral link copied.' })); }
    catch { setError('The invitation link could not be copied on this device.'); }
  };

  return <section className="space-y-5 rounded-3xl border border-white/10 bg-[#090714] p-4 sm:p-6">
    <header className="flex items-center gap-3"><div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-violet-400/20 bg-violet-500/10 text-violet-300"><Users className="h-6 w-6" /></div><div className="min-w-0 flex-1"><h3 className="text-lg font-bold text-white">NEXORA Growth Programme</h3><p className="text-xs text-violet-100/60">Invite new members and track verified referrals.</p></div><button onClick={() => void refresh()} disabled={loading} aria-label="Refresh referral activity" className="rounded-xl border border-white/10 p-2 text-zinc-300"><RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /></button></header>
    <div className="rounded-2xl border border-violet-400/20 bg-violet-500/5 p-4"><div className="flex items-center gap-2 text-sm font-bold text-white"><Sparkles className="h-4 w-4 text-violet-300" /> Your invitation link</div><p className="mt-2 text-xs leading-5 text-zinc-400">Your code is private and expires after 30 days. Referrals qualify after a new member verifies their account and publishes a public post.</p><button onClick={() => void createInvite()} disabled={creating} className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 py-3 text-xs font-bold text-white hover:bg-violet-500 disabled:opacity-50"><Share2 className="h-4 w-4" />{creating ? 'Preparing invitation…' : 'Create and share invitation'}</button>{inviteUrl && <button onClick={() => void copyInvite()} className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 px-4 py-3 text-xs font-semibold text-violet-100"><Link2 className="h-4 w-4" />Copy latest link</button>}</div>
    {error && <p role="alert" className="rounded-xl border border-amber-400/20 bg-amber-500/5 p-3 text-xs text-amber-100">{error}</p>}
    {loading ? <p className="py-5 text-center text-xs text-zinc-500">Loading referral activity…</p> : summary ? <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">{[
      ['Invites claimed', summary.totalInvites], ['Awaiting qualification', summary.pending], ['Verified referrals', summary.qualified], ['NEX earned', summary.rewardsNex], ['Codes created', summary.codeCount],
    ].map(([label, value]) => <div key={String(label)} className="rounded-xl border border-white/10 bg-white/[0.025] p-3"><span className="text-[10px] text-zinc-500">{label}</span><strong className="mt-1 block text-xl font-bold tabular-nums text-white">{Number(value).toLocaleString()}</strong></div>)}</div> : <p className="text-xs text-zinc-500">Referral activity is not available yet.</p>}
    <p className="text-[10px] leading-5 text-zinc-500">Rewards are controlled by NEXORA’s server configuration and paid only from a funded promotional wallet. The programme remains unavailable until the treasury and reward policy are provisioned.</p>
  </section>;
}
