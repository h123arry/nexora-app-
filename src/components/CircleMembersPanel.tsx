import React, { useEffect, useState } from 'react';
import { Ban, UserMinus } from 'lucide-react';
import CircleReportButton from './CircleReportButton';
import { CommunityService, type CircleMemberCursor } from '../services/firebase/communityService';

type Member = { userId: string; name: string; username: string; avatar: string; role: string };
type BannedMember = { userId: string; name: string; username: string; reason: string; bannedAt: string };
type MutedMember = { userId: string; name: string; username: string; reason: string; mutedAt: string; expiresAt: string };

export default function CircleMembersPanel({ communityId, currentUserId, canManage = false }: { communityId: string; currentUserId: string; canManage?: boolean }) {
  const [members, setMembers] = useState<Member[]>([]);
  const [memberCount, setMemberCount] = useState<number | null>(null);
  const [nextCursor, setNextCursor] = useState<CircleMemberCursor | undefined>();
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');
  const [reason, setReason] = useState('');
  const [moderatingUid, setModeratingUid] = useState('');
  const [bannedMembers, setBannedMembers] = useState<BannedMember[]>([]);
  const [mutedMembers, setMutedMembers] = useState<MutedMember[]>([]);
  const [muteDuration, setMuteDuration] = useState(60);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setMembers([]);
    setNextCursor(undefined);
    setError('');
    Promise.all([
      CommunityService.listActiveMembersPage(communityId, 40),
      CommunityService.getActiveMemberCount(communityId),
      canManage ? CommunityService.listBannedMembers(communityId) : Promise.resolve([] as BannedMember[]),
      canManage ? CommunityService.listMutedMembers(communityId) : Promise.resolve([] as MutedMember[]),
    ]).then(([page, count, banned, muted]) => {
      if (cancelled) return;
      setMembers(page.members);
      setNextCursor(page.nextCursor);
      setMemberCount(count);
      setBannedMembers(banned);
      setMutedMembers(muted);
    }).catch(err => {
      if (!cancelled) setError(err instanceof Error ? err.message : 'Members could not be loaded.');
    }).finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [communityId, canManage]);

  const moderate = async (targetUid: string, action: 'remove' | 'ban' | 'mute') => {
    if (!canManage || moderatingUid || reason.trim().length < 3) return;
    const actionLabel = action === 'ban' ? 'ban this member from the Circle' : action === 'mute' ? 'temporarily mute this member' : 'remove this member from the Circle';
    if (!window.confirm(`Are you sure you want to ${actionLabel}?`)) return;
    setModeratingUid(targetUid);
    setError('');
    try {
      await CommunityService.moderateMember(communityId, targetUid, action, reason, muteDuration);
      if (action !== 'mute') {
        setMembers(previous => previous.filter(member => member.userId !== targetUid));
        setMemberCount(previous => previous === null ? null : Math.max(0, previous - 1));
      }
      if (action === 'ban') setBannedMembers(await CommunityService.listBannedMembers(communityId));
      setMutedMembers(await CommunityService.listMutedMembers(communityId));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'The moderation action could not be completed.');
    } finally {
      setModeratingUid('');
    }
  };

  const unban = async (targetUid: string) => {
    if (!canManage || moderatingUid || reason.trim().length < 3) return;
    setModeratingUid(targetUid);
    setError('');
    try {
      await CommunityService.moderateMember(communityId, targetUid, 'unban', reason);
      setBannedMembers(previous => previous.filter(member => member.userId !== targetUid));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'The member could not be unbanned.');
    } finally {
      setModeratingUid('');
    }
  };

  const unmute = async (targetUid: string) => {
    if (!canManage || moderatingUid || reason.trim().length < 3) return;
    setModeratingUid(targetUid);
    setError('');
    try {
      await CommunityService.moderateMember(communityId, targetUid, 'unmute', reason);
      setMutedMembers(previous => previous.filter(member => member.userId !== targetUid));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'The member could not be unmuted.');
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
      <div className="flex items-center justify-between gap-2">
        <label htmlFor="circle-mute-duration" className="text-[10px] text-white/45">Mute duration</label>
        <select id="circle-mute-duration" value={muteDuration} onChange={event => setMuteDuration(Number(event.target.value))} className="rounded-lg border border-white/10 bg-black/30 px-2 py-1.5 text-[10px] text-white">
          <option value={60}>1 hour</option>
          <option value={1440}>24 hours</option>
          <option value={10080}>7 days</option>
        </select>
      </div>
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
            {member.userId !== currentUserId && <CircleReportButton communityId={communityId} targetType="member" targetId={member.userId}/>}
            {canManage && member.userId !== currentUserId && <div className="flex flex-wrap justify-end gap-1">
              <button type="button" onClick={() => void moderate(member.userId, 'remove')} disabled={Boolean(moderatingUid) || reason.trim().length < 3}
                className="inline-flex items-center gap-1 rounded-lg border border-white/10 px-2 py-1 text-[9px] font-bold text-white/65 disabled:opacity-30"><UserMinus size={11}/>{moderatingUid === member.userId ? 'Working…' : 'Remove'}</button>
              <button type="button" onClick={() => void moderate(member.userId, 'ban')} disabled={Boolean(moderatingUid) || reason.trim().length < 3}
                className="inline-flex items-center gap-1 rounded-lg border border-rose-400/20 px-2 py-1 text-[9px] font-bold text-rose-200 disabled:opacity-30"><Ban size={11}/>Ban</button>
              {mutedMembers.some(item => item.userId === member.userId)
                ? <button type="button" onClick={() => void unmute(member.userId)} disabled={Boolean(moderatingUid) || reason.trim().length < 3}
                    className="rounded-lg border border-amber-400/20 px-2 py-1 text-[9px] font-bold text-amber-200 disabled:opacity-30">{moderatingUid === member.userId ? 'Working…' : 'Unmute'}</button>
                : <button type="button" onClick={() => void moderate(member.userId, 'mute')} disabled={Boolean(moderatingUid) || reason.trim().length < 3}
                    className="rounded-lg border border-amber-400/20 px-2 py-1 text-[9px] font-bold text-amber-200 disabled:opacity-30">Mute</button>}
            </div>}
          </div>
        </div>)}
      </div>
    )}
    {nextCursor && <button type="button" onClick={() => void loadMore()} disabled={loadingMore}
      className="w-full rounded-xl border border-violet-400/20 bg-violet-500/5 px-4 py-3 text-xs font-bold text-violet-200 disabled:opacity-40">
      {loadingMore ? 'Loading members...' : 'Load more members'}
    </button>}
    {canManage && <div className="space-y-3 border-t border-white/10 pt-4">
      <div>
        <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-rose-200/80">Circle ban list</h4>
        <p className="mt-1 text-[10px] text-white/35">Private moderation records. Only Circle managers can retrieve this list.</p>
      </div>
      {bannedMembers.length === 0 ? <p className="rounded-xl border border-dashed border-white/10 p-4 text-center text-xs text-white/35">No members are currently banned.</p>
        : <div className="space-y-2">{bannedMembers.map(member => <div key={member.userId} className="flex items-center justify-between gap-3 rounded-xl border border-rose-400/10 bg-rose-500/[0.03] p-3">
          <div className="min-w-0">
            <p className="truncate text-xs font-bold text-white">{member.name}{member.username ? <span className="ml-2 text-[10px] font-normal text-white/35">@{member.username}</span> : null}</p>
            <p className="mt-1 break-words text-[10px] text-white/45">{member.reason}</p>
            {member.bannedAt && <p className="mt-1 text-[9px] text-white/25">{new Date(member.bannedAt).toLocaleDateString()}</p>}
          </div>
          <button type="button" onClick={() => void unban(member.userId)} disabled={Boolean(moderatingUid) || reason.trim().length < 3}
            className="shrink-0 rounded-lg border border-violet-400/20 px-3 py-2 text-[10px] font-bold text-violet-200 disabled:opacity-30">
            {moderatingUid === member.userId ? 'Working…' : 'Unban'}
          </button>
        </div>)}</div>}
    </div>}
    {canManage && <div className="space-y-3 border-t border-white/10 pt-4">
      <div>
        <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-amber-200/80">Active timed mutes</h4>
        <p className="mt-1 text-[10px] text-white/35">Muted members remain in the Circle. Their posting and chat restrictions expire automatically.</p>
      </div>
      {mutedMembers.length === 0 ? <p className="rounded-xl border border-dashed border-white/10 p-4 text-center text-xs text-white/35">No active timed mutes.</p>
        : <div className="space-y-2">{mutedMembers.map(member => <div key={member.userId} className="flex items-center justify-between gap-3 rounded-xl border border-amber-400/10 bg-amber-500/[0.03] p-3">
          <div className="min-w-0">
            <p className="truncate text-xs font-bold text-white">{member.name}{member.username ? <span className="ml-2 text-[10px] font-normal text-white/35">@{member.username}</span> : null}</p>
            <p className="mt-1 break-words text-[10px] text-white/45">{member.reason}</p>
            {member.expiresAt && <p className="mt-1 text-[9px] text-amber-200/60">Expires {new Date(member.expiresAt).toLocaleString()}</p>}
          </div>
          <button type="button" onClick={() => void unmute(member.userId)} disabled={Boolean(moderatingUid) || reason.trim().length < 3}
            className="shrink-0 rounded-lg border border-violet-400/20 px-3 py-2 text-[10px] font-bold text-violet-200 disabled:opacity-30">Unmute</button>
        </div>)}</div>}
    </div>}
  </section>;
}
