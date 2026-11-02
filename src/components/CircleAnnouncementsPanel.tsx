import React, { useEffect, useState } from 'react';
import { Megaphone, Pin, PinOff, Send } from 'lucide-react';
import { CommunityService } from '../services/firebase/communityService';

type Announcement = {
  id: string;
  title: string;
  body: string;
  createdAt: string;
  pinned: boolean;
};

export default function CircleAnnouncementsPanel({
  communityId,
  currentUserId,
  canManage,
}: {
  communityId: string;
  currentUserId: string;
  canManage: boolean;
}) {
  const [items, setItems] = useState<Announcement[]>([]);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  useEffect(() => CommunityService.watchAnnouncements(communityId, currentUserId, setItems, err => setError(err.message)), [communityId, currentUserId]);

  const publish = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!canManage || saving) return;
    setSaving(true);
    setError('');
    try {
      await CommunityService.publishAnnouncement(communityId, title, body);
      setTitle('');
      setBody('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'The announcement could not be published.');
    } finally {
      setSaving(false);
    }
  };

  const togglePin = async (item: Announcement) => {
    if (!canManage || updatingId) return;
    setUpdatingId(item.id);
    setError('');
    try {
      await CommunityService.setAnnouncementPinned(communityId, item.id, !item.pinned);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'The announcement could not be updated.');
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <section className="space-y-4 text-left">
      <div className="flex items-center gap-2">
        <Megaphone className="h-4 w-4 text-violet-400" />
        <div>
          <h3 className="text-xs font-mono uppercase tracking-wider text-violet-400 font-bold">Circle announcements</h3>
          <p className="text-[11px] text-violet-200/50">Important updates from Circle leadership.</p>
        </div>
      </div>

      {error && <p role="status" className="rounded-xl border border-rose-400/20 bg-rose-950/20 p-3 text-xs text-rose-200">{error}</p>}

      {canManage && (
        <form onSubmit={publish} className="space-y-3 rounded-2xl border border-violet-400/20 bg-violet-950/10 p-4">
          <label htmlFor="circle-announcement-title" className="block text-xs font-bold text-white">Publish an update</label>
          <input id="circle-announcement-title" value={title} onChange={event => setTitle(event.target.value)} maxLength={120} required placeholder="Announcement title" className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-xs text-white outline-none focus:border-violet-500" />
          <textarea value={body} onChange={event => setBody(event.target.value)} maxLength={2000} required rows={3} placeholder="Write an important update for your members..." className="w-full resize-y rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-xs text-white outline-none focus:border-violet-500" />
          <div className="flex items-center justify-between gap-3">
            <span className="text-[10px] text-violet-200/40">{body.length}/2000</span>
            <button type="submit" disabled={saving || !title.trim() || !body.trim()} className="inline-flex items-center gap-2 rounded-lg bg-violet-600 px-4 py-2 text-[11px] font-bold text-white disabled:opacity-50">
              <Send className="h-3.5 w-3.5" />{saving ? 'Publishing...' : 'Publish announcement'}
            </button>
          </div>
        </form>
      )}

      {items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/10 p-6 text-center text-xs text-violet-200/50">No announcements yet.</div>
      ) : items.map(item => (
        <article key={item.id} className="space-y-2 rounded-2xl border border-amber-400/20 bg-amber-500/[0.04] p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="mb-1 flex items-center gap-2 text-[9px] font-bold uppercase tracking-wider text-amber-300">
                <Megaphone className="h-3.5 w-3.5" />{item.pinned ? 'Pinned announcement' : 'Announcement'}
              </div>
              <h4 className="text-sm font-bold text-white">{item.title}</h4>
            </div>
            {isOwner && (
              <button type="button" onClick={() => void togglePin(item)} disabled={updatingId !== null} aria-label={item.pinned ? 'Unpin announcement' : 'Pin announcement'} className="shrink-0 rounded-lg border border-white/10 p-2 text-violet-200 disabled:opacity-50">
                {item.pinned ? <PinOff className="h-4 w-4" /> : <Pin className="h-4 w-4" />}
              </button>
            )}
          </div>
          <p className="whitespace-pre-wrap break-words text-xs leading-relaxed text-violet-50/85">{item.body}</p>
          <p className="text-[10px] text-violet-200/40">{item.createdAt}</p>
        </article>
      ))}
    </section>
  );
}
