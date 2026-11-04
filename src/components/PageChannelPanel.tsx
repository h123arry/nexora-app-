import React, { useEffect, useState } from 'react';
import { Megaphone, Send, Trash2 } from 'lucide-react';
import {
  deletePageChannelUpdate, publishPageChannelUpdate, watchPageChannelUpdates,
  type PageChannelUpdate,
} from '../services/firebase/pageChannelUpdatesService';

interface Props { pageId: string; ownerId: string; currentUserId: string; isFollowing: boolean; }

export default function PageChannelPanel({ pageId, ownerId, currentUserId, isFollowing }: Props) {
  const isOwner = currentUserId === ownerId;
  const canRead = isOwner || isFollowing;
  const [updates, setUpdates] = useState<PageChannelUpdate[]>([]);
  const [content, setContent] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    setUpdates([]);
    if (!canRead) return;
    return watchPageChannelUpdates(pageId, setUpdates, () => setError('Channel updates could not be loaded.'));
  }, [pageId, canRead]);

  const publish = async (event: React.FormEvent) => {
    event.preventDefault();
    if (busy || !content.trim()) return;
    setBusy(true); setError(''); setNotice('');
    try { await publishPageChannelUpdate(pageId, content); setContent(''); setNotice('Your update was published to Page followers.'); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'The update could not be published.'); }
    finally { setBusy(false); }
  };

  const remove = async (updateId: string) => {
    setBusy(true); setError('');
    try { await deletePageChannelUpdate(pageId, updateId); setNotice('Channel update removed.'); }
    catch { setError('The update could not be removed.'); }
    finally { setBusy(false); }
  };

  return <section className="mt-6 rounded-2xl border border-violet-400/20 bg-[#0b1020] p-4 sm:p-5 space-y-4" aria-label="Official Page channel">
    <div className="flex items-center gap-2"><Megaphone className="h-5 w-5 text-violet-300" /><div><h3 className="text-sm font-bold text-white">Official channel</h3><p className="text-xs text-slate-400">Direct updates from this Page to its followers</p></div></div>
    {!canRead && <p className="rounded-xl border border-white/10 p-3 text-xs text-slate-300">Follow this Page to read its official channel updates.</p>}
    {isOwner && <form onSubmit={publish} className="space-y-2">
      <label htmlFor="page-channel-update" className="block text-xs font-semibold text-slate-300">Publish an update</label>
      <textarea id="page-channel-update" value={content} onChange={event => setContent(event.target.value)} maxLength={2000} rows={3} placeholder="Share an update with your Page followers..." className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-sm text-white placeholder:text-slate-500" />
      <div className="flex items-center justify-between"><span className="text-[10px] text-slate-500">{content.length}/2000</span><button type="submit" disabled={busy || !content.trim()} className="inline-flex items-center gap-2 rounded-lg bg-violet-600 px-3 py-2 text-xs font-semibold text-white disabled:opacity-40"><Send className="h-3.5 w-3.5" />Publish</button></div>
    </form>}
    {canRead && updates.length === 0 && <p className="text-xs text-slate-400">No official channel updates yet.</p>}
    {canRead && updates.map(update => <article key={update.id} className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
      <p className="whitespace-pre-wrap break-words text-sm text-slate-100">{update.content}</p>
      <div className="mt-3 flex items-center justify-between border-t border-white/5 pt-2"><span className="text-[10px] text-slate-500">{update.createdAt && typeof (update.createdAt as any).toDate === 'function' ? (update.createdAt as any).toDate().toLocaleString() : 'Recently published'}</span>{isOwner && <button type="button" disabled={busy} onClick={() => void remove(update.id)} aria-label="Delete channel update" className="text-rose-300"><Trash2 className="h-3.5 w-3.5" /></button>}</div>
    </article>)}
    {error && <p role="alert" className="text-xs text-rose-300">{error}</p>}
    {notice && <p role="status" className="text-xs text-emerald-300">{notice}</p>}
  </section>;
}
