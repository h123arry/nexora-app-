import React, { useEffect, useState } from 'react';
import { CommunityService } from '../services/firebase/communityService';

type Member = { userId: string; name: string; username: string; avatar: string; role: string };

export default function CircleMembersPanel({ communityId }: { communityId: string }) {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    CommunityService.listActiveMembers(communityId)
      .then(items => { if (!cancelled) { setMembers(items); setError(''); } })
      .catch(err => { if (!cancelled) setError(err instanceof Error ? err.message : 'Members could not be loaded.'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [communityId]);

  return <section className="space-y-3 text-left">
    <div className="flex items-center justify-between gap-2">
      <h3 className="text-xs font-mono uppercase tracking-wider text-violet-400 font-bold">Active Circle members</h3>
      <span className="text-[10px] text-violet-200/50">{members.length} shown · max 100</span>
    </div>
    {error && <p role="status" className="rounded-xl border border-rose-400/20 bg-rose-950/20 p-3 text-xs text-rose-200">{error}</p>}
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
          <span className="text-[8px] font-mono font-bold bg-violet-600/20 text-violet-300 border border-white/10 px-2 py-0.5 rounded uppercase">{member.role}</span>
        </div>)}
      </div>
    )}
  </section>;
}
