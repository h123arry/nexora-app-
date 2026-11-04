import React, { useEffect, useState } from 'react';
import { CommunityService } from '../services/firebase/communityService';
import SaveToCollectionButton from './SaveToCollectionButton';

type CircleEvent = { id: string; title: string; startsAt: string; location: string; attendeeCount: number; createdBy: string; myRsvp: boolean };

export default function CircleEventsPanel({ communityId, currentUserId }: { communityId: string; currentUserId: string }) {
  const [events, setEvents] = useState<CircleEvent[]>([]);
  const [error, setError] = useState('');
  const [title, setTitle] = useState('');
  const [startsAt, setStartsAt] = useState('');
  const [location, setLocation] = useState('');
  const [saving, setSaving] = useState(false);
  const [pending, setPending] = useState('');

  useEffect(() => CommunityService.watchEvents(communityId, currentUserId, setEvents, err => setError(err.message)), [communityId, currentUserId]);

  const create = async (event: React.FormEvent) => {
    event.preventDefault();
    if (saving || !title.trim() || !startsAt) return;
    setSaving(true);
    setError('');
    try {
      await CommunityService.createEvent(communityId, title, new Date(startsAt).toISOString(), location);
      setTitle(''); setStartsAt(''); setLocation('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'The event could not be saved.');
    } finally { setSaving(false); }
  };

  const respond = async (item: CircleEvent) => {
    if (pending) return;
    setPending(item.id); setError('');
    try { await CommunityService.rsvpEvent(communityId, item.id, !item.myRsvp); }
    catch (err) { setError(err instanceof Error ? err.message : 'Your RSVP could not be saved.'); }
    finally { setPending(''); }
  };

  return <section className="space-y-4 text-left max-w-2xl">
    <div>
      <h3 className="text-xs font-mono uppercase tracking-wider text-violet-400 font-bold">Circle events</h3>
      <p className="mt-1 text-[11px] text-violet-200/50">Events and registrations are saved to this Circle. Only active members can view or RSVP.</p>
    </div>
    {error && <p role="status" className="rounded-xl border border-rose-400/20 bg-rose-950/20 p-3 text-xs text-rose-200">{error}</p>}
    <form onSubmit={create} className="rounded-2xl border border-white/10 bg-[#03010b]/50 p-4 space-y-3">
      <label htmlFor="circle-event-title" className="block text-xs font-bold text-white">Create an event</label>
      <input id="circle-event-title" value={title} onChange={e => setTitle(e.target.value)} maxLength={120} required placeholder="Event title" className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-xs text-white outline-none" />
      <input type="datetime-local" value={startsAt} onChange={e => setStartsAt(e.target.value)} required className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-xs text-white outline-none" />
      <input value={location} onChange={e => setLocation(e.target.value)} maxLength={180} placeholder="Location or meeting link (optional)" className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-xs text-white outline-none" />
      <div className="flex justify-end"><button type="submit" disabled={saving || !title.trim() || !startsAt} className="rounded-lg bg-violet-600 px-4 py-2 text-[11px] font-bold text-white disabled:opacity-50">{saving ? 'Saving...' : 'Publish event'}</button></div>
    </form>
    {events.length === 0 ? <div className="rounded-2xl border border-dashed border-white/10 p-6 text-center text-xs text-violet-200/50">No events have been scheduled in this Circle yet.</div> : events.map(item => <div key={item.id} className="p-4 rounded-2xl bg-white/[0.01] border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
      <div className="space-y-1"><h4 className="text-sm font-bold text-white">{item.title}</h4><p className="text-[10.5px] text-violet-300/80">{item.startsAt}</p>{item.location && <p className="text-[9.5px] text-violet-300/50 font-mono">{item.location}</p>}<p className="text-[10px] text-violet-200/50">{item.attendeeCount} attending</p></div>
      <div className="flex flex-wrap items-center gap-2"><SaveToCollectionButton userId={currentUserId} itemType="event" itemId={item.id} parentId={communityId} /><button type="button" disabled={pending === item.id} onClick={() => respond(item)} className="px-3 py-1.5 rounded-lg text-[9.5px] font-mono font-bold uppercase disabled:opacity-50">{pending === item.id ? 'Saving...' : item.myRsvp ? 'Cancel RSVP' : 'Attend'}</button></div>
    </div>)}
  </section>;
}
