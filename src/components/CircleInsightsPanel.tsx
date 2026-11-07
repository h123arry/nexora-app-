import React, { useCallback, useEffect, useState } from 'react';
import { Activity, CalendarDays, Megaphone, MessageSquare, RefreshCw, Users } from 'lucide-react';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../lib/firebase';

type Insights = {
  communityId: string; windowDays: number; source: string; activeMembers: number; recentJoins: number;
  eventsCreated: number; upcomingEvents: number; eventRsvps: number; pollsCreated: number;
  pollVotes: number; announcementsPublished: number;
  truncated: { members: boolean; events: boolean; polls: boolean; announcements: boolean };
};

const number = (value: number) => Number.isSafeInteger(value) && value >= 0 ? value.toLocaleString() : '—';

export default function CircleInsightsPanel({ communityId }: { communityId: string }) {
  const [data, setData] = useState<Insights | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const refresh = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const call = httpsCallable<{ communityId: string }, Insights>(functions, 'getCommunityInsights');
      const result = await call({ communityId });
      setData(result.data);
    } catch (cause) {
      const code = (cause as { code?: string })?.code || '';
      setError(code.includes('permission-denied') ? 'Only active Circle owners, admins and moderators can view these insights.' : 'Community insights could not be loaded. Retry when connected.');
    } finally { setLoading(false); }
  }, [communityId]);
  useEffect(() => { void refresh(); }, [refresh]);

  const cards = data ? [
    { label: 'Active members', value: data.activeMembers, detail: '+'+number(data.recentJoins)+' joined in 30 days', icon: Users },
    { label: 'Upcoming events', value: data.upcomingEvents, detail: number(data.eventsCreated)+' created in 30 days', icon: CalendarDays },
    { label: 'Event RSVPs', value: data.eventRsvps, detail: 'Across recent event records', icon: Activity },
    { label: 'Poll participation', value: data.pollVotes, detail: number(data.pollsCreated)+' polls created in 30 days', icon: MessageSquare },
    { label: 'Announcements', value: data.announcementsPublished, detail: 'Published in 30 days', icon: Megaphone },
  ] : [];

  return <section className="mx-auto max-w-4xl space-y-4 text-left">
    <div className="flex items-center justify-between gap-3"><div><h3 className="text-xs font-mono font-bold uppercase tracking-wider text-violet-400">Circle health and activity</h3><p className="mt-1 text-[11px] text-violet-200/50">Server-aggregated community activity over the last 30 days.</p></div><button type="button" onClick={()=>void refresh()} disabled={loading} className="inline-flex min-h-9 items-center gap-2 rounded-xl border border-white/10 px-3 text-[10px] font-bold text-white disabled:opacity-40"><RefreshCw size={12} className={loading?'animate-spin':''}/> Refresh</button></div>
    {error && <p role="alert" className="rounded-xl border border-rose-400/20 bg-rose-950/20 p-3 text-xs text-rose-200">{error}</p>}
    {loading && !data ? <p className="py-8 text-center text-xs text-white/40">Calculating trusted Circle activity…</p>
      : data && <><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{cards.map(item=>{const Icon=item.icon;return <article key={item.label} className="rounded-2xl border border-white/10 bg-[#0b0920] p-4"><div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-violet-200/65"><Icon size={14}/>{item.label}</div><p className="mt-3 text-2xl font-black text-white">{number(item.value)}</p><p className="mt-1 text-[10px] text-white/40">{item.detail}</p></article>;})}</div>
        {Object.values(data.truncated).some(Boolean) && <p className="rounded-xl border border-amber-300/20 bg-amber-400/5 p-3 text-[10px] leading-5 text-amber-100">At least one activity stream reached its reporting cap. Those activity counts are partial; the active-member count remains an exact aggregate.</p>}
        <p className="text-[10px] text-white/30">Source: trusted Circle membership, event, poll and announcement records. No inferred engagement or estimated audience metrics.</p>
      </>}
  </section>;
}
