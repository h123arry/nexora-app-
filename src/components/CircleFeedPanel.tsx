import React, { useEffect, useState } from 'react';
import { Send, RefreshCw, Users } from 'lucide-react';
import { CommunityService } from '../services/firebase/communityService';
import CircleReportButton from './CircleReportButton';

type CirclePost = {
  id: string; authorId: string; authorName: string; authorUsername: string;
  authorAvatar: string; content: string; createdAt: string;
};

export default function CircleFeedPanel({ communityId, currentUserId }: { communityId: string; currentUserId: string }) {
  const [posts, setPosts] = useState<CirclePost[]>([]);
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true);
    return CommunityService.watchPosts(communityId, currentUserId, items => {
      setPosts(items);
      setLoading(false);
    }, cause => {
      setError(cause.message || 'The Circle feed could not be loaded.');
      setLoading(false);
    });
  }, [communityId, currentUserId]);

  const publish = async (event: React.FormEvent) => {
    event.preventDefault();
    if (saving || !content.trim()) return;
    setSaving(true);
    setError('');
    try {
      await CommunityService.createPost(communityId, content);
      setContent('');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Your post could not be published.');
    } finally {
      setSaving(false);
    }
  };

  return <section className="mx-auto max-w-3xl space-y-4 text-left">
    <div>
      <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-violet-400">Circle discussion feed</h3>
      <p className="mt-1 text-[11px] text-violet-200/50">Posts are stored in this Circle and visible only to its active members.</p>
    </div>
    {error && <p role="alert" className="rounded-xl border border-rose-400/20 bg-rose-950/20 p-3 text-xs text-rose-200">{error}</p>}
    <form onSubmit={publish} className="space-y-3 rounded-2xl border border-violet-400/20 bg-[#080617]/80 p-4">
      <label htmlFor="circle-feed-post" className="text-xs font-bold text-white">Share an update with members</label>
      <textarea id="circle-feed-post" value={content} onChange={event => setContent(event.target.value)} maxLength={3000} rows={4} placeholder="What would you like to share with this Circle?" className="w-full resize-y rounded-xl border border-white/10 bg-black/30 p-3 text-sm text-white placeholder:text-white/30 focus:border-violet-400/40 focus:outline-none"/>
      <div className="flex items-center justify-between gap-3">
        <span className="text-[10px] text-white/35">{content.length.toLocaleString()}/3,000</span>
        <button type="submit" disabled={saving || !content.trim()} className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-violet-600 px-4 text-xs font-bold text-white disabled:opacity-40"><Send size={13}/>{saving ? 'Publishing…' : 'Publish post'}</button>
      </div>
    </form>
    {loading ? <p className="py-8 text-center text-xs text-white/40">Loading Circle posts…</p>
      : posts.length === 0 ? <div className="rounded-2xl border border-dashed border-white/10 p-8 text-center"><Users size={22} className="mx-auto text-violet-300/60"/><p className="mt-3 text-sm font-bold text-white">Your Circle feed is ready</p><p className="mt-1 text-xs text-white/40">There are no posts yet. Start the first real conversation.</p></div>
      : <div className="space-y-3">{posts.map(post => <article key={post.id} className="rounded-2xl border border-white/10 bg-white/[0.025] p-4">
        <div className="flex items-center gap-3">
          {post.authorAvatar ? <img src={post.authorAvatar} alt="" className="h-9 w-9 rounded-full object-cover"/> : <div className="flex h-9 w-9 items-center justify-center rounded-full bg-violet-500/15 text-xs font-black text-violet-200">{post.authorName.slice(0,1).toUpperCase()}</div>}
          <div className="min-w-0"><p className="truncate text-xs font-bold text-white">{post.authorName}</p><p className="truncate text-[10px] text-white/40">{post.authorUsername ? '@'+post.authorUsername+' · ' : ''}{post.createdAt}</p></div>
        </div>
        <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-6 text-white/85">{post.content}</p>
        {post.authorId !== currentUserId && <div className="mt-3 border-t border-white/5 pt-2">
          <CircleReportButton communityId={communityId} targetType="post" targetId={post.id}/>
        </div>}
      </article>)}</div>}
    <div className="flex items-center justify-center gap-2 text-[10px] text-white/30"><RefreshCw size={11}/> New posts appear automatically</div>
  </section>;
}
