import React, { useCallback, useEffect, useState } from 'react';
import { Target, ShieldAlert, Plus, Users, Copy, RefreshCw, CalendarDays, MapPin } from 'lucide-react';
import { httpsCallable } from 'firebase/functions';
import { User } from '../types';
import { functions } from '../lib/firebase';

interface Props { currentUser: User; onAddLogAlert?: (type: string, message: string) => void; }
interface Challenge { id: string; title: string; description: string; topic: string; participantCount: number; contributionCount: number; targetPosts: number; joinedByMe: boolean; myContributionCount: number; }
interface SeasonalEvent { id: string; title: string; description: string; category: string; location: string; startsAt: string | null; endsAt: string | null; capacity: number | null; attendeeCount: number; attending: boolean; status: string; }

export default function SocialMissionsView({ currentUser }: Props) {
  const [items, setItems] = useState<Challenge[]>([]);
  const [events, setEvents] = useState<SeasonalEvent[]>([]);
  const [canManageEvents, setCanManageEvents] = useState(false);
  const [eventTitle, setEventTitle] = useState('');
  const [eventDescription, setEventDescription] = useState('');
  const [eventCategory, setEventCategory] = useState('Community');
  const [eventStartsAt, setEventStartsAt] = useState('');
  const [eventEndsAt, setEventEndsAt] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [topic, setTopic] = useState('');

  const refresh = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const call = httpsCallable<Record<string, never>, { challenges: Challenge[] }>(functions, 'listSocialChallenges');
      const result = await call({});
      setItems(result.data.challenges || []);
      const eventCall = httpsCallable<Record<string, never>, { events: SeasonalEvent[]; canManage?: boolean }>(functions, 'listSeasonalCommunityEvents');
      const eventResult = await eventCall({});
      setEvents(eventResult.data.events || []);
      setCanManageEvents(Boolean(eventResult.data.canManage));
    } catch { setError('Challenges are temporarily unavailable. Please retry.'); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void refresh(); }, [refresh, currentUser.id]);

  const create = async (event: React.FormEvent) => {
    event.preventDefault(); if (busy) return;
    setBusy('create'); setError('');
    try {
      const call = httpsCallable<any, { challengeId: string; postTag: string }>(functions, 'createSocialChallenge');
      const result = await call({ title, description, topic, durationDays: 7, targetPosts: 1 });
      setTitle(''); setDescription(''); setTopic('');
      await navigator.clipboard.writeText(result.data.postTag).catch(() => undefined);
      await refresh();
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Challenge creation failed.'); }
    finally { setBusy(''); }
  };

  const rsvp = async (eventId: string, attending: boolean) => {
    if (busy) return;
    setBusy('event:' + eventId); setError('');
    try {
      const call = httpsCallable<{ eventId: string; attending: boolean }, { attending: boolean; attendeeCount: number }>(functions, 'respondToSeasonalCommunityEvent');
      const result = await call({ eventId, attending });
      setEvents(previous => previous.map(event => event.id === eventId ? { ...event, attending: result.data.attending, attendeeCount: result.data.attendeeCount } : event));
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Your RSVP could not be saved.'); }
    finally { setBusy(''); }
  };
  const createEvent = async (event: React.FormEvent) => {
    event.preventDefault(); if (busy || !canManageEvents) return;
    setBusy('event-create'); setError('');
    try {
      const call = httpsCallable<any, { eventId: string }>(functions, 'createSeasonalCommunityEvent');
      await call({ title: eventTitle, description: eventDescription, category: eventCategory, startsAt: new Date(eventStartsAt).toISOString(), endsAt: new Date(eventEndsAt).toISOString() });
      setEventTitle(''); setEventDescription(''); setEventStartsAt(''); setEventEndsAt('');
      await refresh();
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'The seasonal event could not be created.'); }
    finally { setBusy(''); }
  };

  const join = async (id: string) => {
    if (busy) return;
    setBusy(id); setError('');
    try {
      const call = httpsCallable<{ challengeId: string }, { joined: boolean }>(functions, 'joinSocialChallenge');
      await call({ challengeId: id });
      await navigator.clipboard.writeText('#nxchallenge_' + id).catch(() => undefined);
      window.dispatchEvent(new CustomEvent('toast', { detail: 'Joined. The challenge tag has been copied for your next public post.' }));
      await refresh();
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Could not join this challenge.'); }
    finally { setBusy(''); }
  };

  return <section id="social-missions-layout" className="mx-auto max-w-3xl space-y-5 rounded-3xl border border-white/10 bg-[#090714] p-4 sm:p-6">
    <header className="flex items-center gap-3"><div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-violet-400/20 bg-violet-500/10 text-violet-300"><Target className="h-6 w-6" /></div><div className="min-w-0 flex-1"><h2 className="text-lg font-bold text-white">Community Challenges</h2><p className="text-xs text-violet-100/60">Create something together. Public posts with a challenge tag count as contributions.</p></div><button onClick={() => void refresh()} disabled={loading} aria-label="Refresh challenges" className="rounded-xl border border-white/10 p-2 text-zinc-300"><RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /></button></header>
    <form onSubmit={create} className="space-y-3 rounded-2xl border border-violet-400/20 bg-violet-500/5 p-4">
      <div className="flex items-center gap-2 text-sm font-bold text-white"><Plus className="h-4 w-4 text-violet-300" /> Start a 7-day challenge</div>
      <input value={title} onChange={e => setTitle(e.target.value)} minLength={4} maxLength={80} required placeholder="Challenge title" className="w-full rounded-xl border border-white/10 bg-black/25 px-3 py-3 text-sm text-white" />
      <textarea value={description} onChange={e => setDescription(e.target.value)} minLength={12} maxLength={600} required rows={3} placeholder="What should people create or do?" className="w-full rounded-xl border border-white/10 bg-black/25 px-3 py-3 text-sm text-white" />
      <div className="flex gap-2"><input value={topic} onChange={e => setTopic(e.target.value)} minLength={2} maxLength={40} required placeholder="Topic" className="min-w-0 flex-1 rounded-xl border border-white/10 bg-black/25 px-3 py-3 text-sm text-white" /><button type="submit" disabled={!!busy} className="rounded-xl bg-violet-600 px-4 py-3 text-xs font-bold text-white disabled:opacity-50">{busy === 'create' ? 'Creating…' : 'Create'}</button></div>
      <p className="text-[11px] text-zinc-500">Every participant must join first. Each public post counts once. No artificial rewards or member counts.</p>
    </form>

    <section className="space-y-3 rounded-2xl border border-violet-400/20 bg-violet-500/[0.04] p-4">
      <header className="flex items-center gap-2"><CalendarDays className="h-5 w-5 text-violet-300" /><div><h3 className="font-bold text-white">NEXORA Seasonal Events</h3><p className="text-xs text-zinc-500">Official community moments and shared experiences.</p></div></header>
      {canManageEvents && <form onSubmit={createEvent} className="space-y-2 rounded-xl border border-white/10 p-3">
        <p className="text-xs font-bold text-violet-200">Platform event manager</p>
        <input required minLength={4} maxLength={100} value={eventTitle} onChange={e => setEventTitle(e.target.value)} placeholder="Event title" className="w-full rounded-lg border border-white/10 bg-black/25 p-2 text-sm text-white" />
        <textarea required minLength={20} maxLength={800} value={eventDescription} onChange={e => setEventDescription(e.target.value)} placeholder="What is this event about?" className="w-full rounded-lg border border-white/10 bg-black/25 p-2 text-sm text-white" />
        <div className="grid grid-cols-2 gap-2"><label className="text-[11px] text-zinc-400">Starts<input required type="datetime-local" value={eventStartsAt} onChange={e => setEventStartsAt(e.target.value)} className="mt-1 w-full rounded-lg bg-black/30 p-2 text-white" /></label><label className="text-[11px] text-zinc-400">Ends<input required type="datetime-local" value={eventEndsAt} onChange={e => setEventEndsAt(e.target.value)} className="mt-1 w-full rounded-lg bg-black/30 p-2 text-white" /></label></div>
        <button disabled={!!busy} className="rounded-lg bg-violet-600 px-3 py-2 text-xs font-bold text-white disabled:opacity-50">{busy === 'event-create' ? 'Publishing…' : 'Publish seasonal event'}</button>
      </form>}
      {events.length === 0 ? <p className="rounded-xl border border-white/5 p-4 text-center text-xs text-zinc-500">No official seasonal events are scheduled right now.</p> : <div className="space-y-2">{events.map(event => <article key={event.id} className="rounded-xl border border-white/10 bg-black/20 p-3"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h4 className="font-semibold text-white">{event.title}</h4><span className="rounded-full bg-violet-500/10 px-2 py-1 text-[10px] text-violet-200">{event.category}</span></div><p className="mt-1 text-xs leading-5 text-zinc-400">{event.description}</p><p className="mt-2 text-[11px] text-zinc-500">{event.startsAt ? new Date(event.startsAt).toLocaleString() : 'Date to be announced'} · {event.attendeeCount} attending{event.capacity ? ' / ' + event.capacity : ''}</p>{event.location && <p className="mt-1 flex items-center gap-1 text-[11px] text-zinc-500"><MapPin className="h-3 w-3" />{event.location}</p>}</div><button onClick={() => void rsvp(event.id, !event.attending)} disabled={!!busy || event.status === 'active' && !event.attending} className="shrink-0 rounded-lg border border-violet-400/30 px-3 py-2 text-xs font-bold text-violet-100 disabled:opacity-50">{busy === 'event:' + event.id ? 'Saving…' : event.attending ? 'Going' : 'Attend'}</button></div></article>)}</div>}
    </section>
    {error && <p role="alert" className="rounded-xl border border-rose-400/20 bg-rose-500/5 p-3 text-xs text-rose-200">{error}</p>}
    {loading ? <p className="py-8 text-center text-sm text-zinc-500">Loading challenges…</p> : items.length === 0 ? <div className="rounded-2xl border border-white/10 p-6 text-center"><ShieldAlert className="mx-auto h-7 w-7 text-violet-300" /><p className="mt-3 text-sm font-semibold text-white">No active challenges yet</p><p className="mt-1 text-xs text-zinc-500">Start the first one and invite the community.</p></div> :
      <div className="space-y-3">{items.map(item => <article key={item.id} className="rounded-2xl border border-white/10 bg-white/[0.025] p-4"><div className="flex items-start gap-3"><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h3 className="font-bold text-white">{item.title}</h3><span className="rounded-full bg-violet-500/10 px-2 py-1 text-[10px] text-violet-200">{item.topic}</span></div><p className="mt-2 text-sm leading-6 text-zinc-300">{item.description}</p><div className="mt-3 flex flex-wrap gap-3 text-[11px] text-zinc-500"><span className="inline-flex items-center gap-1"><Users className="h-3 w-3" />{item.participantCount} joined</span><span>{item.contributionCount} contributions</span><span>Goal: {item.targetPosts}</span>{item.joinedByMe && <span className="text-violet-200">You: {item.myContributionCount} contributions</span>}</div></div><button onClick={() => void join(item.id)} disabled={!!busy || item.joinedByMe} className="shrink-0 rounded-xl border border-violet-400/30 bg-violet-500/10 px-3 py-2 text-xs font-bold text-violet-100 disabled:opacity-50">{busy === item.id ? 'Joining…' : item.joinedByMe ? 'Joined' : 'Join'}</button></div><div className="mt-3 flex items-center justify-between gap-2 border-t border-white/5 pt-3"><code className="truncate text-[10px] text-violet-200/70">#nxchallenge_{item.id}</code><button onClick={() => void navigator.clipboard.writeText('#nxchallenge_' + item.id)} className="inline-flex shrink-0 items-center gap-1 rounded-lg px-2 py-1 text-[11px] text-zinc-300"><Copy className="h-3 w-3" />Copy tag</button></div></article>)}</div>}
  </section>;
}
