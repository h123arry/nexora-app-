import React, { useEffect, useState } from 'react';
import { ShieldCheck, UserCog, Link2, Copy, Ban } from 'lucide-react';
import { CommunityService } from '../services/firebase/communityService';
import type { CircleMemberCursor } from '../services/firebase/communityService';

type CircleMember = {
  userId: string;
  name: string;
  username: string;
  avatar: string;
  role: string;
};

export default function CircleGovernancePanel({
  communityId,
  currentUserId,
  isOwner,
  canManage = isOwner,
}: {
  communityId: string;
  currentUserId: string;
  isOwner: boolean;
  canManage?: boolean;
}) {
  const [members, setMembers] = useState<CircleMember[]>([]);
  const [reasonByUser, setReasonByUser] = useState<Record<string, string>>({});
  const [roleByUser, setRoleByUser] = useState<Record<string, 'admin' | 'moderator' | 'member'>>({});
  const [loading, setLoading] = useState(true);
  const [memberCount, setMemberCount] = useState<number | null>(null);
  const [nextCursor, setNextCursor] = useState<CircleMemberCursor | undefined>(undefined);
  const [loadingMore, setLoadingMore] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [inviteLink, setInviteLink] = useState('');
  const [inviteToken, setInviteToken] = useState('');
  const [inviteBusy, setInviteBusy] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setMembers([]);
    setNextCursor(undefined);
    Promise.all([
      CommunityService.listActiveMembersPage(communityId, 40),
      CommunityService.getActiveMemberCount(communityId),
    ])
      .then(([page, count]) => {
        if (!active) return;
        setMembers(page.members);
        setNextCursor(page.nextCursor);
        setMemberCount(count);
      })
      .catch(() => { if (active) setError('Circle members could not be loaded.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [communityId]);

  const loadMoreMembers = async () => {
    if (!nextCursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const page = await CommunityService.listActiveMembersPage(communityId, 40, nextCursor);
      setMembers(previous => [...previous, ...page.members]);
      setNextCursor(page.nextCursor);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'More Circle members could not be loaded.');
    } finally {
      setLoadingMore(false);
    }
  };

  const createInvite = async () => {
    if (!canManage || inviteBusy) return;
    setInviteBusy(true);
    setError('');
    setNotice('');
    try {
      const invite = await CommunityService.createInvite(communityId, 7, 25);
      const link = `${window.location.origin}/#circleInvite=${encodeURIComponent(invite.token)}`;
      setInviteToken(invite.token);
      setInviteLink(link);
      setNotice('Invitation created. Copy and share this link; the token is shown only once.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'The invitation could not be created.');
    } finally {
      setInviteBusy(false);
    }
  };

  const revokeInvite = async () => {
    if (!inviteToken || inviteBusy) return;
    setInviteBusy(true);
    setError('');
    try {
      await CommunityService.revokeInvite(inviteToken);
      setInviteLink('');
      setInviteToken('');
      setNotice('Invitation revoked.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'The invitation could not be revoked.');
    } finally {
      setInviteBusy(false);
    }
  };

  const saveRole = async (member: CircleMember) => {
    const role = roleByUser[member.userId] || 'member';
    const reason = reasonByUser[member.userId] || '';
    if (!isOwner || member.userId === currentUserId || savingId) return;
    setSavingId(member.userId);
    setError('');
    setNotice('');
    try {
      await CommunityService.setMemberRole(communityId, member.userId, role, reason);
      setMembers(previous => previous.map(item => item.userId === member.userId ? { ...item, role } : item));
      setNotice(`Updated ${member.name}'s Circle role.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'The member role could not be updated.');
    } finally {
      setSavingId(null);
    }
  };

  return (
    <section className="space-y-4 text-left">
      <div className="flex items-center gap-2">
        <ShieldCheck className="h-4 w-4 text-violet-400" />
        <div>
          <h3 className="text-xs font-mono uppercase tracking-wider text-violet-400 font-bold">Circle governance</h3>
          <p className="text-[11px] text-violet-200/50">Manage trusted roles with server-verified permissions and an audit trail.</p>\n          {memberCount !== null && <p className="text-[10px] text-violet-300/70">{memberCount.toLocaleString()} active members · showing {members.length}</p>}
        </div>
      </div>
      {error && <p role="alert" className="rounded-xl border border-rose-400/20 bg-rose-950/20 p-3 text-xs text-rose-200">{error}</p>}
      {notice && <p role="status" className="rounded-xl border border-emerald-400/20 bg-emerald-950/20 p-3 text-xs text-emerald-200">{notice}</p>}
      {canManage && (
        <div className="rounded-2xl border border-violet-400/20 bg-violet-950/10 p-4 space-y-3">
          <div className="flex items-center gap-2"><Link2 className="h-4 w-4 text-violet-300" /><p className="text-xs font-bold text-white">Circle invitations</p></div>
          <p className="text-[11px] text-violet-200/60">Create a single-use-token link that expires after 7 days or 25 successful joins. You can revoke it at any time.</p>
          <button type="button" onClick={() => void createInvite()} disabled={inviteBusy} className="rounded-xl bg-violet-600 px-3 py-2 text-xs font-bold text-white disabled:opacity-40">{inviteBusy ? 'Working...' : 'Create invite link'}</button>
          {inviteLink && (
            <div className="space-y-2">
              <input readOnly value={inviteLink} aria-label="Circle invitation link" className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-[10px] text-violet-100" />
              <div className="flex gap-2">
                <button type="button" onClick={() => { void navigator.clipboard.writeText(inviteLink).then(() => setNotice('Invitation link copied.')).catch(() => setError('Copy failed. Select and copy the link manually.')); }} className="flex items-center gap-1 rounded-lg border border-white/10 px-3 py-2 text-xs text-white"><Copy className="h-3 w-3" /> Copy link</button>
                <button type="button" onClick={() => void revokeInvite()} disabled={inviteBusy} className="flex items-center gap-1 rounded-lg border border-rose-400/20 px-3 py-2 text-xs text-rose-200 disabled:opacity-40"><Ban className="h-3 w-3" /> Revoke</button>
              </div>
            </div>
          )}
        </div>
      )}
      {loading ? <p className="text-xs text-violet-200/50">Loading active members...</p> : members.length === 0 ? (
        <p className="rounded-xl border border-dashed border-white/10 p-5 text-center text-xs text-violet-200/50">No active members found.</p>
      ) : (
        <div className="space-y-3">
          {members.map(member => {
            const selectedRole = roleByUser[member.userId] || (['admin', 'moderator'].includes(member.role) ? member.role as 'admin' | 'moderator' : 'member');
            return (
              <article key={member.userId} className="rounded-2xl border border-white/10 bg-black/20 p-3">
                <div className="flex items-center gap-3">
                  {member.avatar ? <img src={member.avatar} alt="" className="h-9 w-9 rounded-xl object-cover" /> : <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-500/15"><UserCog className="h-4 w-4 text-violet-300" /></div>}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-bold text-white">{member.name}</p>
                    <p className="truncate text-[10px] text-violet-200/50">{member.username ? `@${member.username}` : member.userId}</p>
                  </div>
                  <span className="rounded-lg border border-white/10 px-2 py-1 text-[9px] uppercase text-violet-200/70">{member.role}</span>
                </div>
                {isOwner && member.userId !== currentUserId && member.role !== 'owner' && (
                  <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-[1fr_1.5fr_auto]">
                    <select value={selectedRole} onChange={event => setRoleByUser(previous => ({ ...previous, [member.userId]: event.target.value as 'admin' | 'moderator' | 'member' }))} className="min-w-0 rounded-lg border border-white/10 bg-[#0b1020] px-2 py-2 text-xs text-white">
                      <option value="member">Member</option>
                      <option value="moderator">Moderator</option>
                      <option value="admin">Admin</option>
                    </select>
                    <input value={reasonByUser[member.userId] || ''} onChange={event => setReasonByUser(previous => ({ ...previous, [member.userId]: event.target.value }))} maxLength={500} placeholder="Reason for role change" className="min-w-0 rounded-lg border border-white/10 bg-white/5 px-2 py-2 text-xs text-white" />
                    <button type="button" onClick={() => void saveRole(member)} disabled={savingId !== null || !reasonByUser[member.userId]?.trim()} className="rounded-lg bg-violet-600 px-3 py-2 text-xs font-bold text-white disabled:opacity-40">{savingId === member.userId ? 'Saving...' : 'Save role'}</button>
                  </div>
                )}
              </article>
            );
          })}
          {nextCursor && <button type="button" onClick={() => void loadMoreMembers()} disabled={loadingMore}
            className="w-full rounded-xl border border-violet-400/20 bg-violet-500/5 px-4 py-3 text-xs font-bold text-violet-200 disabled:opacity-40">
            {loadingMore ? 'Loading members...' : 'Load more members'}
          </button>}
        </div>
      )}
      {!isOwner && <p className="text-[10px] text-violet-200/40">Role delegation is reserved for the Circle owner. Active managers can create invitations; the server verifies every action.</p>}
    </section>
  );
}
