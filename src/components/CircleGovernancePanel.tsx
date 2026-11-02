import React, { useEffect, useState } from 'react';
import { ShieldCheck, UserCog } from 'lucide-react';
import { CommunityService } from '../services/firebase/communityService';

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
}: {
  communityId: string;
  currentUserId: string;
  isOwner: boolean;
}) {
  const [members, setMembers] = useState<CircleMember[]>([]);
  const [reasonByUser, setReasonByUser] = useState<Record<string, string>>({});
  const [roleByUser, setRoleByUser] = useState<Record<string, 'admin' | 'moderator' | 'member'>>({});
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    let active = true;
    setLoading(true);
    CommunityService.listActiveMembers(communityId)
      .then(result => { if (active) setMembers(result); })
      .catch(() => { if (active) setError('Circle members could not be loaded.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [communityId]);

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
          <p className="text-[11px] text-violet-200/50">Manage trusted roles with server-verified permissions and an audit trail.</p>
        </div>
      </div>
      {error && <p role="alert" className="rounded-xl border border-rose-400/20 bg-rose-950/20 p-3 text-xs text-rose-200">{error}</p>}
      {notice && <p role="status" className="rounded-xl border border-emerald-400/20 bg-emerald-950/20 p-3 text-xs text-emerald-200">{notice}</p>}
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
        </div>
      )}
      {!isOwner && <p className="text-[10px] text-violet-200/40">Only the Circle owner can delegate roles. All changes are checked and recorded by the server.</p>}
    </section>
  );
}
