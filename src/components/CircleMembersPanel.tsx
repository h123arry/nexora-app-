import React, { useEffect, useState } from 'react';
import { Ban, UserMinus } from 'lucide-react';
import { CommunityService, type CircleMemberCursor } from '../services/firebase/communityService';

type Member = { userId: string; name: string; username: string; avatar: string; role: string };

export default function CircleMembersPanel({ communityId, currentUserId, canManage = false }: { communityId: string; currentUserId: string; canManage?: boolean }) {
  const [members, setMembers] = useState<Member[]>([]);
  const [memberCount, setMemberCount] = useState<number | null>(null);
  const [nextCursor, setNextCursor] = useState<CircleMemberCursor | undefined>();
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');
  const [reason, setReason] = useState('');
  const [moderatingUid, setModeratingUid] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setMembers([]);
    setNextCursor(undefined);
    setError('');
    Promise.all([
      CommunityService.listActiveMembersPage(communityId, 40),
      CommunityService.getActiveMemberCount(communityId),
    ]).then(([page, count]) => {
      if (cancelled) return;
      setMembers(page.members);
      setNextCursor(page.nextCursor);
      setMemberCount(count);
    }).catch(err => {
      if (!cancelled) setError(err instanceof Error ? err.message : 'Members could not be loaded.');
    }).finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [communityId]);

  const moderate = async (targetUid: string, action: 'remove' | 'ban') => {
    if (!canManage || moderatingUid || reason.trim().length < 3) return;
    const actionLabel = action === 'ban' ? 'ban this member from the Circle' : 'remove this member from the Circle';
    if (!window.confirm(`Are you sure you want to ${actionLabel}?`)) return;
    setModeratingUid(targetUid);
    setError('');
    try {
      await CommunityService.moderateMember(communityId, targetUid, action, reason);
      setMembers(previous => previous.filter(member => member.userId !== targetUid));
      setMemberCount(previous => previous === null ? null : Math.max(0, previous - 1));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'The moderation action could not be completed.');
    } finally {
      setModeratingUid('');
    }
  };

  const loadMore = async () => {
    if (!nextCursor || loadingMore) return;
    setLoadingMore(true);
    setError('');
    try {
      const page = await CommunityService.listActiveMembersPage(communityId, 40, nextCursor);
      setMembers(previous => [...previous, ...page.members]);
      setNextCursor(page.nextCursor);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'More members could not be loaded.');
    } finally {
      setLoadingMore(false);
    }
  };

  return <section className="space-y-3 text-left">
    <div className="flex items-center justify-between gap-2">
      <div>
        <h3 className="text-xs font-mono uppercase tracking-wider text-violet-400 font-bold">Active Circle members</h3>
        <p className="text-[10px] text-violet-200/50">{memberCount === null ? 'Count unavailable' : memberCount.toLocaleString() + ' active members'} · showing {members.length}</p>
      </div>
    </div>
    {error && <p role="alert" className="rounded-xl border border-rose-400/20 bg-rose-950/20 p-3 text-xs text-rose-200">{error}</p>}
    {canManage && <div className="rounded-xl border border-violet-400/15 bg-violet-500/[0.04] p-3 space-y-2">
      <label htmlFor="circle-moderation-reason" className="block text-[10px] font-bold uppercase tracking-wider text-violet-200/70">Moderation reason (recorded in the Circle audit log)</label>
      <input id="circle-moderation-reason" value={reason} onChange={event => setReason(event.target.value)} maxLength={500} placeholder="Explain the rule or safety concern..." className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-xs text-white placeholder:text-white/30 focus:border-violet-400/40 focus:outline-none"/>
    </div>}
    {loading ? <p className="text-xs text-violet-200/50">Loading members...</p> : members.length === 0 ? <p className="rounded-2xl border border-dashed border-white/10 p-6 text-center text-xs text-violet-200/50">No active members found.</p> : (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {members.map(member => <div key={member.userId} className="p-3 bg-white/[0.01] border border-white/5 rounded-2xl flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <img src={member.avatar || '/logo.svg'} alt="" className="w-8 h-8 rounded-xl object-cover shrink-0" />
            <div className="min-w-0">
              <p className="text-xs font-bold text-white truncate">{member.name}</p>
              {member.username && <p className="text-[10px] text-violet-300/60 truncate">@{member.username}</p>}
            </div>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-2">
            <span className="text-[8px] font-mono font-bold bg-violet-600/20 text-violet-300 border border-white/10 px-2 py-0.5 rounded uppercase">{member.role}</span>
            {canManage && member.userId !== currentUserId && <div className="flex gap-1">
              <button type="button" onClick={() => void moderate(member.userId, 'remove')} disabled={Boolean(moderatingUid) || reason.trim().length < 3}
                className="inline-flex items-center gap-1 rounded-lg border border-white/10 px-2 py-1 text-[9px] font-bold text-white/65 disabled:opacity-30"><UserMinus size={11}/>{moderatingUid === member.userId ? 'Working…' : 'Remove'}</button>
              <button type="button" onClick={() => void moderate(member.userId, 'ban')} disabled={Boolean(moderatingUid) || reason.trim().length < 3}
                className="inline-flex items-center gap-1 rounded-lg border border-rose-400/20 px-2 py-1 text-[9px] font-bold text-rose-200 disabled:opacity-30"><Ban size={11}/>Ban</button>
            </div>}
          </div>
        </div>)}
      </div>
    )}
    {nextCursor && <button type="button" onClick={() => void loadMore()} disabled={loadingMore}
      className="w-full rounded-xl border border-violet-400/20 bg-violet-500/5 px-4 py-3 text-xs font-bold text-violet-200 disabled:opacity-40">
      {loadingMore ? 'Loading members...' : 'Load more members'}
    </button>}
  </section>;
}
