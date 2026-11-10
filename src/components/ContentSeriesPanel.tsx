import React, { useCallback, useEffect, useState } from 'react';
import { BookOpen, Plus, Layers, Link2, RefreshCw } from 'lucide-react';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../lib/firebase';
import type { Post, User } from '../types';

interface Series { id: string; title: string; description: string; category: string; episodeCount: number; }
interface Episode { postId: string; episodeNumber: number; content: string; }
interface Props { currentUser: User; posts: Post[]; }

export default function ContentSeriesPanel({ currentUser, posts }: Props) {
  const [series, setSeries] = useState<Series[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [postId, setPostId] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const refresh = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const call = httpsCallable<Record<string, never>, { series: Series[] }>(functions, 'listMyContentSeries');
      const result = await call({});
      const records = result.data.series || [];
      setSeries(records);
      setSelectedId(previous => records.some(item => item.id === previous) ? previous : records[0]?.id || '');
    } catch { setError('Your content series could not be loaded.'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { void refresh(); }, [refresh, currentUser.id]);

  useEffect(() => {
    if (!selectedId) { setEpisodes([]); return; }
    let active = true;
    const call = httpsCallable<{ seriesId: string }, { episodes: Episode[] }>(functions, 'listMyContentSeriesEpisodes');
    call({ seriesId: selectedId }).then(result => {
      if (active) setEpisodes(result.data.episodes || []);
    }).catch(() => { if (active) setError('Series episodes could not be loaded.'); });
    return () => { active = false; };
  }, [selectedId]);

  const create = async (event: React.FormEvent) => {
    event.preventDefault(); if (busy) return;
    setBusy(true); setError('');
    try {
      const call = httpsCallable<{ title: string; description: string; category: string }, { seriesId: string }>(functions, 'createMyContentSeries');
      const result = await call({ title, description, category });
      setTitle(''); setDescription(''); setCategory('');
      await refresh(); setSelectedId(result.data.seriesId);
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'The series could not be created.'); }
    finally { setBusy(false); }
  };

  const addEpisode = async (event: React.FormEvent) => {
    event.preventDefault(); if (busy || !selectedId || !postId) return;
    setBusy(true); setError('');
    try {
      const call = httpsCallable<{ seriesId: string; postId: string }, { added: boolean; episodeNumber: number }>(functions, 'addPostToMyContentSeries');
      const result = await call({ seriesId: selectedId, postId });
      setPostId('');
      if (!result.data.added) setError(`That post is already episode ${result.data.episodeNumber}.`);
      await refresh();
      const episodesCall = httpsCallable<{ seriesId: string }, { episodes: Episode[] }>(functions, 'listMyContentSeriesEpisodes');
      const latest = await episodesCall({ seriesId: selectedId });
      setEpisodes(latest.data.episodes || []);
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'The post could not be added.'); }
    finally { setBusy(false); }
  };

  const eligiblePosts = posts.filter(post => post.userId === currentUser.id && post.audience === 'public');
  return <section className="space-y-5 rounded-3xl border border-white/10 bg-[#090714] p-4 sm:p-6">
    <header className="flex items-center gap-3"><div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-violet-400/20 bg-violet-500/10 text-violet-300"><BookOpen className="h-6 w-6" /></div><div className="min-w-0 flex-1"><h3 className="text-lg font-bold text-white">Numbered Content Series</h3><p className="text-xs text-violet-100/60">Turn related public posts into an ordered series your audience can follow.</p></div><button onClick={() => void refresh()} disabled={loading} aria-label="Refresh series" className="rounded-xl border border-white/10 p-2 text-zinc-300"><RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /></button></header>
    <form onSubmit={create} className="grid gap-2 rounded-2xl border border-white/10 bg-white/[0.025] p-4">
      <p className="text-xs font-bold uppercase tracking-wider text-violet-200">Create a series</p>
      <input value={title} onChange={e => setTitle(e.target.value)} required minLength={3} maxLength={80} placeholder="Series title" className="rounded-xl border border-white/10 bg-black/25 px-3 py-3 text-sm text-white" />
      <textarea value={description} onChange={e => setDescription(e.target.value)} required minLength={10} maxLength={500} rows={2} placeholder="What will this series cover?" className="rounded-xl border border-white/10 bg-black/25 px-3 py-3 text-sm text-white" />
      <div className="flex gap-2"><input value={category} onChange={e => setCategory(e.target.value)} required minLength={2} maxLength={40} placeholder="Category" className="min-w-0 flex-1 rounded-xl border border-white/10 bg-black/25 px-3 py-3 text-sm text-white" /><button disabled={busy} className="inline-flex items-center gap-1 rounded-xl bg-violet-600 px-4 py-3 text-xs font-bold text-white disabled:opacity-50"><Plus className="h-4 w-4" />Create</button></div>
    </form>
    {error && <p role="alert" className="rounded-xl border border-rose-400/20 bg-rose-500/5 p-3 text-xs text-rose-200">{error}</p>}
    {loading ? <p className="py-6 text-center text-xs text-zinc-500">Loading your series…</p> : series.length === 0 ? <p className="rounded-xl border border-dashed border-white/10 p-5 text-center text-xs text-zinc-500">Your numbered series will appear here once created.</p> : <>
      <div className="flex flex-wrap gap-2">{series.map(item => <button key={item.id} onClick={() => setSelectedId(item.id)} className={`rounded-xl border px-3 py-2 text-xs font-semibold ${selectedId === item.id ? 'border-violet-400/40 bg-violet-500/15 text-violet-100' : 'border-white/10 bg-white/[0.02] text-zinc-400'}`}>{item.title} <span className="ml-1 text-[10px] opacity-60">{item.episodeCount}</span></button>)}</div>
      <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
        <div className="flex items-center gap-2 text-sm font-bold text-white"><Layers className="h-4 w-4 text-violet-300" /> Episodes in order</div>
        <form onSubmit={addEpisode} className="mt-3 flex flex-col gap-2 sm:flex-row"><select value={postId} onChange={e => setPostId(e.target.value)} className="min-w-0 flex-1 rounded-xl border border-white/10 bg-black/30 px-3 py-3 text-xs text-white"><option value="">Choose one of your public posts</option>{eligiblePosts.map(post => <option key={post.id} value={post.id}>{post.content.slice(0, 90) || post.id}</option>)}</select><button disabled={busy || !postId} className="rounded-xl border border-violet-400/30 bg-violet-500/10 px-4 py-3 text-xs font-bold text-violet-100 disabled:opacity-40"><Link2 className="mr-1 inline h-3.5 w-3.5" />Add episode</button></form>
        <ol className="mt-4 space-y-2">{episodes.map(item => <li key={item.postId} className="flex items-start gap-3 rounded-xl bg-black/20 p-3"><span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-violet-500/15 text-xs font-black text-violet-200">{item.episodeNumber}</span><div className="min-w-0"><p className="text-xs font-semibold text-zinc-200">Episode {item.episodeNumber}</p><p className="mt-1 truncate text-[11px] text-zinc-500">{item.content || item.postId}</p></div></li>)}</ol>
      </div>
    </>}
  </section>;
}
