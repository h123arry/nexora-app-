import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { ArrowLeft, Camera, Globe2, LockKeyhole, Mic, Plus, Send, Sparkles, Trash2, Users, X } from 'lucide-react';
import type { User } from '../types';
import {
  addWorldWeaveMediaMoment, addWorldWeaveTextMoment, createWorldWeave, deleteWorldWeaveMoment, fetchOlderWorldWeaveMoments, updateWorldWeaveDetails,
  acceptWorldWeaveInvite, declineWorldWeaveInvite, inviteToWorldWeaveByUsername, joinPublicWorldWeave, revokeWorldWeaveInvite, subscribeToWorldWeaveInvites, subscribeToMyWorldWeaveInvites,
  subscribeToMyWorldWeaves, subscribeToPublicWorldWeaves, subscribeToWorldWeaveMoments,
  MAX_WORLDWEAVE_MEMBERS, listWorldWeaveContributors, leaveWorldWeave, removeWorldWeaveContributor, transferWorldWeaveOwnership, subscribeToWorldWeaveActivity,
  toggleWorldWeaveMomentPin, fetchWorldWeavePinnedMoments, subscribeToWorldWeaveMomentReplies, addWorldWeaveMomentReply, deleteWorldWeaveMomentReply,
  type WorldWeave, type WorldWeaveInvite, type WorldWeaveMoment, type WorldWeaveContributor, type WorldWeaveActivity, type WorldWeaveReaction, type WorldWeaveReply, setWorldWeaveMomentReaction,
} from '../services/firebase/worldWeaveService';

interface Props { currentUser: User; }
const timeLabel = (value: unknown) => {
  if (!value) return 'Just now';
  const date = typeof value === 'object' && value && 'toDate' in value && typeof (value as {toDate?: unknown}).toDate === 'function'
    ? (value as {toDate: () => Date}).toDate() : new Date(value as string | number);
  return Number.isNaN(date.getTime()) ? 'Just now' : new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(date);
};

export default function WorldWeaveView({ currentUser }: Props) {
  const [myWeaves, setMyWeaves] = useState<WorldWeave[]>([]);
  const [publicWeaves, setPublicWeaves] = useState<WorldWeave[]>([]);
  const [invitations, setInvitations] = useState<WorldWeaveInvite[]>([]);
  const [sentInvitations, setSentInvitations] = useState<WorldWeaveInvite[]>([]);
  const [contributors, setContributors] = useState<WorldWeaveContributor[]>([]);
  const [selectedContributorId, setSelectedContributorId] = useState('');
  const [activity, setActivity] = useState<WorldWeaveActivity[]>([]);
  const [pinnedMoments, setPinnedMoments] = useState<WorldWeaveMoment[]>([]);
  const [expandedReplyMomentId, setExpandedReplyMomentId] = useState<string | null>(null);
  const [momentReplies, setMomentReplies] = useState<WorldWeaveReply[]>([]);
  const [replyDraft, setReplyDraft] = useState('');
  const [discoveryQuery, setDiscoveryQuery] = useState('');
  const [selected, setSelected] = useState<WorldWeave | null>(null);
  const [moments, setMoments] = useState<WorldWeaveMoment[]>([]);
  const [hasMoreMoments, setHasMoreMoments] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [editingDetails, setEditingDetails] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editVisibility, setEditVisibility] = useState<'public' | 'private'>('public');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [visibility, setVisibility] = useState<'public' | 'private'>('public');
  const [momentText, setMomentText] = useState('');
  const [momentFile, setMomentFile] = useState<File | null>(null);
  const [inviteUsername, setInviteUsername] = useState('');
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [notice, setNotice] = useState('');

  useEffect(() => {
    let active = true;
    setLoading(true);
    const stopMine = subscribeToMyWorldWeaves(currentUser.id, items => {
      if (active) { setMyWeaves(items); setLoading(false); }
    }, err => { if (active) { setError(err.message); setLoading(false); } });
    const stopPublic = subscribeToPublicWorldWeaves(items => {
      if (active) { setPublicWeaves(items); setLoading(false); }
    }, err => { if (active) { setError(err.message); setLoading(false); } });
    const stopInvites = subscribeToMyWorldWeaveInvites(currentUser.id, items => { if (active) setInvitations(items); }, err => { if (active) setError(err.message); });
    return () => { active = false; stopMine(); stopPublic(); stopInvites(); };
  }, [currentUser.id]);

  useEffect(() => {
    if (!selected || selected.ownerId !== currentUser.id) { setSentInvitations([]); return; }
    return subscribeToWorldWeaveInvites(selected.id, setSentInvitations, err => setError(err.message));
  }, [selected?.id, selected?.ownerId, currentUser.id]);

  useEffect(() => {
    let active = true;
    if (!selected || (selected.ownerId !== currentUser.id && !selected.participantIds?.includes(currentUser.id))) {
      setContributors([]);
      setSelectedContributorId('');
      return;
    }
    listWorldWeaveContributors(selected.id).then(items => {
      if (active) {
        setContributors(items);
        setSelectedContributorId(current => items.some(item => item.userId === current && item.role === 'contributor')
          ? current : (items.find(item => item.role === 'contributor')?.userId || ''));
      }
    }).catch(err => { if (active) setError(err instanceof Error ? err.message : 'Could not load contributors.'); });
    return () => { active = false; };
  }, [selected?.id, selected?.ownerId, selected?.participantIds?.length]);

  useEffect(() => {
    let active = true;
    if (!selected || (selected.ownerId !== currentUser.id && !selected.participantIds?.includes(currentUser.id))) {
      setPinnedMoments([]);
      return;
    }
    fetchWorldWeavePinnedMoments(selected.id).then(items => { if (active) setPinnedMoments(items); })
      .catch(err => { if (active) setError(err instanceof Error ? err.message : 'Could not load pinned moments.'); });
    return () => { active = false; };
  }, [selected?.id, selected?.ownerId, selected?.pinnedMomentIds?.join('|'), currentUser.id]);

  useEffect(() => {
    if (!selected || !expandedReplyMomentId) {
      setMomentReplies([]);
      return;
    }
    return subscribeToWorldWeaveMomentReplies(selected.id, expandedReplyMomentId, setMomentReplies, err => setError(err.message));
  }, [selected?.id, expandedReplyMomentId]);

  useEffect(() => {
    if (!selected || (selected.ownerId !== currentUser.id && !selected.participantIds?.includes(currentUser.id))) {
      setActivity([]);
      return;
    }
    return subscribeToWorldWeaveActivity(selected.id, setActivity, err => setError(err.message));
  }, [selected?.id, selected?.ownerId, selected?.participantIds?.length, currentUser.id]);

  useEffect(() => {
    if (!selected) { setMoments([]); setHasMoreMoments(false); return; }
    return subscribeToWorldWeaveMoments(selected.id, items => {
      setMoments(current => {
        const liveIds = new Set(items.map(item => item.id));
        const older = current.filter(item => !liveIds.has(item.id));
        return [...older, ...items].sort((a, b) => {
          const aTime = a.createdAt && typeof a.createdAt === 'object' && 'toMillis' in a.createdAt ? (a.createdAt as {toMillis:()=>number}).toMillis() : 0;
          const bTime = b.createdAt && typeof b.createdAt === 'object' && 'toMillis' in b.createdAt ? (b.createdAt as {toMillis:()=>number}).toMillis() : 0;
          return aTime - bTime || a.id.localeCompare(b.id);
        });
      });
      setHasMoreMoments(items.length === 100);
    }, err => setError(err.message));
  }, [selected?.id]);

  useEffect(() => {
    if (!selected) return;
    const latest = [...myWeaves, ...publicWeaves].find(item => item.id === selected.id);
    if (latest) setSelected(current => current?.id === latest.id ? { ...current, ...latest } : current);
  }, [myWeaves, publicWeaves, selected?.id]);

  const weaves = useMemo(() => {
    const unique = new Map<string, WorldWeave>();
    [...myWeaves, ...publicWeaves].forEach(item => unique.set(item.id, item));
    return [...unique.values()].sort((a, b) => {
      const aTime = a.updatedAt && typeof a.updatedAt === 'object' && 'toMillis' in a.updatedAt ? (a.updatedAt as {toMillis:()=>number}).toMillis() : 0;
      const bTime = b.updatedAt && typeof b.updatedAt === 'object' && 'toMillis' in b.updatedAt ? (b.updatedAt as {toMillis:()=>number}).toMillis() : 0;
      return bTime - aTime;
    });
  }, [myWeaves, publicWeaves]);

  const visibleWeaves = useMemo(() => {
    const term = discoveryQuery.trim().toLowerCase();
    if (!term) return weaves;
    return weaves.filter(item => [item.title, item.description, item.ownerName].some(value => value.toLowerCase().includes(term)));
  }, [weaves, discoveryQuery]);

  const handleJoinPublic = async () => {
    if (!selected) return;
    setBusy(true); setError(''); setNotice('');
    try {
      const joined = await joinPublicWorldWeave(selected.id);
      setSelected(joined); setNotice('You are now a contributor. Add your perspective to the shared timeline.');
    } catch (err) { setError(err instanceof Error ? err.message : 'Could not join this WorldWeave.'); }
    finally { setBusy(false); }
  };

  const handleAcceptInvite = async (invite: WorldWeaveInvite) => {
    setBusy(true); setError(''); setNotice('');
    try {
      const weave = await acceptWorldWeaveInvite(invite.weaveId);
      setSelected(weave); setNotice('You joined the WorldWeave. Add your perspective to the timeline.');
    } catch (err) { setError(err instanceof Error ? err.message : 'Could not accept this invitation.'); }
    finally { setBusy(false); }
  };

  const handleDeclineInvite = async (invite: WorldWeaveInvite) => {
    setBusy(true); setError(''); setNotice('');
    try {
      await declineWorldWeaveInvite(invite.weaveId);
      setNotice('Invitation declined.');
    } catch (err) { setError(err instanceof Error ? err.message : 'Could not decline this invitation.'); }
    finally { setBusy(false); }
  };

  const handleRevokeInvite = async (invite: WorldWeaveInvite) => {
    if (!selected) return;
    setBusy(true); setError(''); setNotice('');
    try {
      await revokeWorldWeaveInvite(selected.id, invite.inviteeId);
      setNotice('Invitation revoked.');
    } catch (err) { setError(err instanceof Error ? err.message : 'Could not revoke this invitation.'); }
    finally { setBusy(false); }
  };

  const handleLeaveWorldWeave = async () => {
    if (!selected || selected.ownerId === currentUser.id || !window.confirm('Leave this WorldWeave? Your past moments will remain in the story.')) return;
    setBusy(true); setError(''); setNotice('');
    try { await leaveWorldWeave(selected.id); setSelected(null); setNotice('You left the WorldWeave. Your published moments remain in its history.'); }
    catch (err) { setError(err instanceof Error ? err.message : 'Could not leave this WorldWeave.'); }
    finally { setBusy(false); }
  };

  const handleRemoveContributor = async () => {
    if (!selected || selected.ownerId !== currentUser.id || !selectedContributorId) return;
    const target = contributors.find(item => item.userId === selectedContributorId);
    if (!target || target.role !== 'contributor' || !window.confirm('Remove ' + target.name + ' from this WorldWeave? Their past moments will remain.')) return;
    setBusy(true); setError(''); setNotice('');
    try {
      await removeWorldWeaveContributor(selected.id, target.userId);
      setSelected(current => current ? { ...current, participantIds: current.participantIds.filter(id => id !== target.userId), memberCount: Math.max(1, current.memberCount - 1) } : current);
      setContributors(current => current.filter(item => item.userId !== target.userId));
      setSelectedContributorId('');
      setNotice(target.name + ' was removed. Their published moments remain in the story.');
    } catch (err) { setError(err instanceof Error ? err.message : 'Could not remove this contributor.'); }
    finally { setBusy(false); }
  };

  const handleTransferOwnership = async () => {
    if (!selected || selected.ownerId !== currentUser.id || !selectedContributorId) return;
    const target = contributors.find(item => item.userId === selectedContributorId);
    if (!target || target.role !== 'contributor' || !window.confirm('Transfer ownership to ' + target.name + '? You will remain a contributor.')) return;
    setBusy(true); setError(''); setNotice('');
    try {
      await transferWorldWeaveOwnership(selected.id, target.userId);
      setSelected(current => current ? { ...current, ownerId: target.userId, ownerName: target.name } : current);
      setNotice('Ownership transferred to ' + target.name + '. You remain a contributor.');
    } catch (err) { setError(err instanceof Error ? err.message : 'Could not transfer ownership.'); }
    finally { setBusy(false); }
  };

  const handleCreate = async (event: React.FormEvent) => {
    event.preventDefault(); setBusy(true); setError(''); setNotice('');
    try {
      const id = await createWorldWeave({ title, description, visibility, ownerName: currentUser.name });
      setTitle(''); setDescription(''); setShowCreate(false);
      setSelected({ id, ownerId: currentUser.id, ownerName: currentUser.name, title: title.trim(), description: description.trim(),
        visibility, participantIds: [currentUser.id], memberCount: 1, momentCount: 0 });
      setNotice('Your WorldWeave is ready. Add the first moment to bring it to life.');
    } catch (err) { setError(err instanceof Error ? err.message : 'Could not create this WorldWeave.'); }
    finally { setBusy(false); }
  };

  const handleUpdateDetails = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selected) return;
    setBusy(true); setError(''); setNotice('');
    try {
      await updateWorldWeaveDetails(selected.id, { title: editTitle, description: editDescription, visibility: editVisibility });
      setSelected(current => current ? { ...current, title: editTitle.trim(), description: editDescription.trim(), visibility: editVisibility } : current);
      setEditingDetails(false);
      setNotice('WorldWeave details updated.');
    } catch (err) { setError(err instanceof Error ? err.message : 'Could not update this WorldWeave.'); }
    finally { setBusy(false); }
  };

  const handleMoment = async (event: React.FormEvent) => {
    event.preventDefault(); if (!selected) return;
    setBusy(true); setError(''); setNotice(''); setProgress(0);
    const author = { id: currentUser.id, name: currentUser.name, username: currentUser.username, avatar: currentUser.avatar };
    try {
      if (momentFile) await addWorldWeaveMediaMoment(selected.id, author, momentFile, momentText, setProgress);
      else await addWorldWeaveTextMoment(selected.id, author, momentText);
      setMomentText(''); setMomentFile(null); setNotice('Moment added to the shared timeline.');
      const input = document.getElementById('worldweave-media') as HTMLInputElement | null;
      if (input) input.value = '';
    } catch (err) { setError(err instanceof Error ? err.message : 'Your moment could not be added.'); }
    finally { setBusy(false); setProgress(0); }
  };

  const handleLoadOlderMoments = async () => {
    if (!selected || !moments.length || loadingOlder) return;
    setLoadingOlder(true); setError('');
    try {
      const older = await fetchOlderWorldWeaveMoments(selected.id, moments[0]);
      setMoments(current => [...older.filter(item => !current.some(existing => existing.id === item.id)), ...current]);
      setHasMoreMoments(older.length === 100);
    } catch (err) { setError(err instanceof Error ? err.message : 'Could not load older moments.'); }
    finally { setLoadingOlder(false); }
  };

  const handleSubmitMomentReply = async (event: React.FormEvent, moment: WorldWeaveMoment) => {
    event.preventDefault();
    if (!selected || !replyDraft.trim() || busy) return;
    setBusy(true); setError(''); setNotice('');
    try {
      await addWorldWeaveMomentReply(selected.id, moment.id, replyDraft);
      setReplyDraft('');
      setNotice('Your reply was added to the conversation.');
    } catch (err) { setError(err instanceof Error ? err.message : 'Could not add your reply.'); }
    finally { setBusy(false); }
  };

  const handleDeleteMomentReply = async (reply: WorldWeaveReply) => {
    if (!selected || !window.confirm('Remove this reply?')) return;
    setBusy(true); setError(''); setNotice('');
    try {
      await deleteWorldWeaveMomentReply(selected.id, reply.momentId, reply.id);
      setNotice('Reply removed.');
    } catch (err) { setError(err instanceof Error ? err.message : 'Could not remove this reply.'); }
    finally { setBusy(false); }
  };

  const handleToggleMomentPin = async (moment: WorldWeaveMoment) => {
    if (!selected || selected.ownerId !== currentUser.id || busy) return;
    setBusy(true); setError(''); setNotice('');
    try {
      const result = await toggleWorldWeaveMomentPin(selected.id, moment.id);
      setSelected(current => current ? { ...current, pinnedMomentIds: result.pinnedMomentIds } : current);
      setPinnedMoments(await fetchWorldWeavePinnedMoments(selected.id));
      setNotice(result.pinned ? 'Moment pinned to the WorldWeave story.' : 'Moment unpinned from the story.');
    } catch (err) { setError(err instanceof Error ? err.message : 'Could not update pinned moments.'); }
    finally { setBusy(false); }
  };

  const handleMomentReaction = async (moment: WorldWeaveMoment, reaction: WorldWeaveReaction) => {
    if (!selected || busy) return;
    setBusy(true); setError('');
    try { await setWorldWeaveMomentReaction(selected.id, moment.id, reaction); }
    catch (err) { setError(err instanceof Error ? err.message : 'Could not update your reaction.'); }
    finally { setBusy(false); }
  };

  const handleDeleteMoment = async (moment: WorldWeaveMoment) => {
    if (!selected || !window.confirm('Remove this moment from the shared timeline?')) return;
    setBusy(true); setError(''); setNotice('');
    try {
      await deleteWorldWeaveMoment(selected.id, moment);
      setMoments(current => current.filter(item => item.id !== moment.id));
      setNotice('Moment removed from the timeline.');
    } catch (err) { setError(err instanceof Error ? err.message : 'Could not remove this moment.'); }
    finally { setBusy(false); }
  };

  const handleInvite = async (event: React.FormEvent) => {
    event.preventDefault(); if (!selected) return;
    setBusy(true); setError(''); setNotice('');
    try {
      await inviteToWorldWeaveByUsername(selected.id, inviteUsername);
      setInviteUsername(''); setNotice('Invitation created for that NEXORA member.');
    } catch (err) { setError(err instanceof Error ? err.message : 'Could not send invitation.'); }
    finally { setBusy(false); }
  };

  if (selected) {
    const isMember = selected.participantIds?.includes(currentUser.id) || selected.ownerId === currentUser.id;
    return (
      <div className="mx-auto w-full max-w-5xl space-y-5 pb-10">
        <button onClick={() => { setSelected(null); setError(''); setNotice(''); }} className="inline-flex items-center gap-2 text-sm text-violet-200 hover:text-white"><ArrowLeft size={16}/> All WorldWeaves</button>
        <section className="overflow-hidden rounded-[28px] border border-violet-400/20 bg-[radial-gradient(circle_at_top_right,rgba(113,56,255,.28),transparent_42%),linear-gradient(145deg,#100c25,#080d19)] p-6 md:p-8">
          <div className="flex flex-wrap items-center gap-2 text-[10px] font-bold uppercase tracking-[.2em] text-violet-200"><Sparkles size={13}/> NEXORA WORLDWEAVE <span className="text-white/30">·</span>{selected.visibility === 'public' ? 'Public experience' : 'Private experience'}</div>
          <h1 className="mt-3 text-3xl font-black tracking-tight text-white md:text-4xl">{selected.title}</h1>
          {selected.description && <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-300">{selected.description}</p>}
          <div className="mt-5 flex flex-wrap gap-4 text-xs text-slate-300"><span className="inline-flex items-center gap-1.5"><Users size={14}/>{selected.memberCount || selected.participantIds?.length || 1}/{MAX_WORLDWEAVE_MEMBERS} contributors</span><span>{moments.length} loaded · {selected.momentCount || moments.length} moments published</span><span>Started by {selected.ownerName}</span></div>
        </section>
        {selected.ownerId === currentUser.id && <div className="flex justify-end"><button type="button" onClick={() => { setEditTitle(selected.title); setEditDescription(selected.description); setEditVisibility(selected.visibility); setEditingDetails(value => !value); }} className="rounded-xl border border-violet-400/20 px-3 py-2 text-xs font-semibold text-violet-200 hover:bg-violet-500/10">{editingDetails ? 'Close settings' : 'Edit experience'}</button></div>}
        {selected.ownerId !== currentUser.id && isMember && <div className="flex justify-end"><button type="button" disabled={busy} onClick={() => void handleLeaveWorldWeave()} className="rounded-xl border border-red-400/20 px-3 py-2 text-xs font-semibold text-red-200 hover:bg-red-500/10 disabled:opacity-40">Leave WorldWeave</button></div>}
        {editingDetails && selected.ownerId === currentUser.id && <form onSubmit={handleUpdateDetails} className="rounded-3xl border border-violet-400/20 bg-[#0b1221] p-4">
          <div className="grid gap-3 md:grid-cols-2"><input value={editTitle} onChange={e => setEditTitle(e.target.value)} minLength={3} maxLength={90} required className="rounded-xl border border-white/10 bg-[#070d19] px-3 py-3 text-sm text-white outline-none focus:border-violet-400/60" aria-label="WorldWeave title"/><select value={editVisibility} onChange={e => setEditVisibility(e.target.value as 'public'|'private')} className="rounded-xl border border-white/10 bg-[#070d19] px-3 py-3 text-sm text-white"><option value="public">Public</option><option value="private">Private</option></select></div>
          <textarea value={editDescription} onChange={e => setEditDescription(e.target.value)} maxLength={500} rows={2} className="mt-3 w-full rounded-xl border border-white/10 bg-[#070d19] px-3 py-3 text-sm text-white outline-none focus:border-violet-400/60" aria-label="WorldWeave description"/>
          <div className="mt-3 flex justify-end"><button disabled={busy || editTitle.trim().length < 3} className="rounded-xl bg-violet-600 px-4 py-2.5 text-xs font-bold text-white disabled:opacity-40">Save changes</button></div>
        </form>}
        {notice && <p role="status" className="rounded-xl border border-violet-400/20 bg-violet-500/10 px-4 py-3 text-sm text-violet-100">{notice}</p>}
        {error && <p role="alert" className="rounded-xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">{error}</p>}
        {!isMember && selected.visibility === 'public' && <div className="rounded-3xl border border-violet-400/20 bg-violet-500/[.06] p-5">
          <p className="text-sm text-slate-300">You can follow this public experience or join its contributors to add your own perspective.</p>
          {selected.memberCount >= MAX_WORLDWEAVE_MEMBERS && <p className="mt-2 text-xs text-amber-200">This WorldWeave has reached its contributor limit.</p>}
          <button disabled={busy || selected.memberCount >= MAX_WORLDWEAVE_MEMBERS} onClick={() => void handleJoinPublic()} className="mt-3 rounded-xl bg-violet-600 px-4 py-2.5 text-xs font-bold text-white disabled:opacity-40">Join this WorldWeave</button>
        </div>}
        {isMember && <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_300px]">
          <form onSubmit={handleMoment} className="rounded-3xl border border-white/10 bg-[#0b1221] p-4 md:p-5">
            <div className="mb-3 flex items-center gap-2 text-sm font-bold text-white"><Plus size={16} className="text-violet-300"/> Add your perspective</div>
            <textarea value={momentText} onChange={e => setMomentText(e.target.value)} maxLength={2000} rows={3} placeholder="What happened from where you stood?" className="w-full resize-y rounded-2xl border border-white/10 bg-[#070d19] p-3 text-sm text-white outline-none placeholder:text-slate-500 focus:border-violet-400/60"/>
            <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
              <label htmlFor="worldweave-media" className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-white/10 px-3 py-2 text-xs text-slate-300 hover:border-violet-400/50"><Camera size={15}/> Add photo, video or voice note<input id="worldweave-media" type="file" accept="image/jpeg,image/png,image/webp,image/avif,image/gif,video/mp4,video/webm,video/quicktime,audio/mpeg,audio/mp4,audio/wav,audio/webm,audio/ogg,audio/aac" className="hidden" onChange={e => setMomentFile(e.target.files?.[0] || null)}/></label>
              <span className="text-[10px] text-slate-500">{momentText.length}/2000</span>
              <button disabled={busy || (!momentText.trim() && !momentFile)} className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-xs font-bold text-white disabled:cursor-not-allowed disabled:opacity-40"><Send size={14}/> Share moment</button>
            </div>
            {momentFile && <p className="mt-2 truncate text-xs text-violet-200">{momentFile.name}</p>}
            {busy && progress > 0 && <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-violet-400 transition-all" style={{width: progress+'%'}}/></div>}
          </form>
          {selected.ownerId === currentUser.id && (
          <div className="space-y-3">
            <form onSubmit={handleInvite} className="h-fit rounded-3xl border border-white/10 bg-[#0b1221] p-4">
              <div className="mb-3 text-sm font-bold text-white">Bring someone in</div>
              <p className="mb-3 text-xs leading-5 text-slate-400">Invite another NEXORA member to add their own perspective.</p>
              {selected.memberCount >= MAX_WORLDWEAVE_MEMBERS && <p className="mb-2 text-xs text-amber-200">Contributor capacity reached. New invitations are paused.</p>}
              <input value={inviteUsername} onChange={e => setInviteUsername(e.target.value)} placeholder="@username" className="w-full rounded-xl border border-white/10 bg-[#070d19] px-3 py-2.5 text-sm text-white outline-none placeholder:text-slate-500 focus:border-violet-400/60"/>
              <button disabled={busy || !inviteUsername.trim() || selected.memberCount >= MAX_WORLDWEAVE_MEMBERS} className="mt-2 w-full rounded-xl border border-violet-400/30 bg-violet-500/10 px-3 py-2.5 text-xs font-bold text-violet-100 disabled:opacity-40">Send invitation</button>
            </form>
            <section className="rounded-3xl border border-violet-400/15 bg-[#0b1221] p-4">
              <div className="mb-3 flex items-center justify-between"><h3 className="text-sm font-bold text-white">Contributor management</h3><span className="text-[10px] text-slate-500">{contributors.length} loaded</span></div>
              <p className="mb-3 text-xs leading-5 text-slate-400">Remove a contributor or transfer ownership. Previous moments are preserved.</p>
              <select value={selectedContributorId} onChange={event => setSelectedContributorId(event.target.value)} className="w-full rounded-xl border border-white/10 bg-[#070d19] px-3 py-2.5 text-xs text-white">
                <option value="">Choose a contributor</option>
                {contributors.filter(item => item.role === 'contributor').map(item => <option key={item.userId} value={item.userId}>{item.name}{item.username ? ' (@' + item.username + ')' : ''}</option>)}
              </select>
              <div className="mt-2 grid grid-cols-2 gap-2">
                <button type="button" disabled={busy || !selectedContributorId} onClick={() => void handleRemoveContributor()} className="rounded-xl border border-red-400/20 px-2 py-2.5 text-[11px] font-bold text-red-200 disabled:opacity-40">Remove</button>
                <button type="button" disabled={busy || !selectedContributorId} onClick={() => void handleTransferOwnership()} className="rounded-xl bg-violet-600 px-2 py-2.5 text-[11px] font-bold text-white disabled:opacity-40">Transfer ownership</button>
              </div>
              {selected.participantIds.length > 100 && <p className="mt-2 text-[10px] text-amber-200">Showing the first 100 contributors. Larger member directories will be paginated in Membership V2.</p>}
            </section>
            <section className="rounded-3xl border border-white/10 bg-[#0b1221] p-4">
              <div className="mb-3 flex items-center justify-between"><h3 className="text-sm font-bold text-white">Pending invitations</h3><span className="text-[10px] text-slate-500">{sentInvitations.length}/50</span></div>
              {sentInvitations.length === 0 ? <p className="text-xs text-slate-500">No pending invitations.</p> : <div className="space-y-2">
                {sentInvitations.map(invite => <div key={invite.inviteeId} className="flex items-center justify-between gap-2 rounded-xl border border-white/5 bg-black/10 px-3 py-2">
                  <span className="truncate text-xs text-slate-300">Pending member invitation</span>
                  <button type="button" disabled={busy} onClick={() => void handleRevokeInvite(invite)} className="shrink-0 rounded-lg px-2 py-1 text-[10px] font-semibold text-red-300 hover:bg-red-500/10 disabled:opacity-40">Revoke</button>
                </div>)}
              </div>}
            </section>
          </div>
          )}
        </div>}
        {isMember && <section className="rounded-3xl border border-violet-400/20 bg-violet-500/[.05] p-4">
          <div className="mb-3 flex items-center justify-between"><h2 className="text-sm font-bold text-white">Pinned story moments</h2><span className="text-[10px] text-slate-500">{pinnedMoments.length}/3 featured</span></div>
          {pinnedMoments.length === 0 ? <p className="text-xs text-slate-500">The owner can pin up to three defining moments to the story.</p> : <div className="grid gap-3 md:grid-cols-3">
            {pinnedMoments.map(moment => <article key={moment.id} className="overflow-hidden rounded-2xl border border-white/10 bg-[#090e1b]">
              {moment.mediaType === 'image' && moment.mediaUrl && <img src={moment.mediaUrl} alt="Pinned WorldWeave moment" loading="lazy" className="h-28 w-full object-cover"/>}
              <div className="p-3"><p className="text-[10px] font-bold text-violet-200">{moment.authorName}</p><p className="mt-1 line-clamp-3 text-xs leading-5 text-slate-300">{moment.text || (moment.mediaType === 'video' ? 'Featured video moment' : moment.mediaType === 'audio' ? 'Featured voice note' : 'Featured story moment')}</p></div>
            </article>)}
          </div>}
        </section>}
        {isMember && <section className="rounded-3xl border border-white/10 bg-[#0b1221] p-4">
          <div className="mb-3 flex items-center justify-between"><h2 className="text-sm font-bold text-white">WorldWeave activity</h2><span className="text-[10px] text-slate-500">Latest 20 events</span></div>
          {activity.length === 0 ? <p className="text-xs text-slate-500">Membership changes will appear here.</p> : <div className="space-y-2">
            {activity.map(event => {
              const actor = event.actorUid === currentUser.id ? 'You' : 'A contributor';
              const target = event.targetUid === currentUser.id ? 'you' : 'a contributor';
              const description = event.action === 'ownership_transferred' ? actor + ' transferred ownership to ' + target
                : event.action === 'member_removed' ? actor + ' removed ' + target
                : event.action === 'member_left' ? actor + ' left the WorldWeave'
                : event.action === 'moment_pinned' ? actor + ' pinned a moment to the story'
                : event.action === 'moment_unpinned' ? actor + ' unpinned a moment from the story'
                : 'A membership update occurred';
              return <div key={event.id} className="flex items-center justify-between gap-3 rounded-xl border border-white/5 px-3 py-2">
                <span className="text-xs text-slate-300">{description}</span>
                <time className="shrink-0 text-[10px] text-slate-500">{timeLabel(event.createdAt)}</time>
              </div>;
            })}
          </div>}
        </section>}
        <section className="space-y-4">
          <div className="flex items-center justify-between"><h2 className="text-lg font-bold text-white">The shared timeline</h2><span className="text-xs text-slate-500">Latest 100 · chronological</span></div>
          {hasMoreMoments && <div className="flex justify-center"><button type="button" disabled={loadingOlder} onClick={() => void handleLoadOlderMoments()} className="rounded-xl border border-violet-400/20 bg-violet-500/[.06] px-4 py-2.5 text-xs font-semibold text-violet-100 disabled:opacity-40">{loadingOlder ? 'Loading older moments…' : 'Load older moments'}</button></div>}
          {moments.length === 0 ? <div className="rounded-3xl border border-dashed border-white/10 p-8 text-center text-sm text-slate-400">No moments yet. The first perspective starts the story.</div> :
            <div className="relative space-y-4 before:absolute before:bottom-4 before:left-[19px] before:top-4 before:w-px before:bg-violet-400/20">
              {moments.map(moment => <motion.article key={moment.id} initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} className="relative ml-1 rounded-3xl border border-white/10 bg-[#0b1221] p-4 pl-12 md:p-5 md:pl-14">
                <span className="absolute left-[12px] top-6 h-3.5 w-3.5 rounded-full border-2 border-[#0b1221] bg-violet-400 shadow-[0_0_14px_rgba(139,92,246,.7)]"/>
                <div className="flex items-center justify-between gap-2"><div className="flex min-w-0 items-center gap-2"><img src={moment.authorAvatar || '/logo.svg'} alt="" className="h-8 w-8 rounded-full object-cover"/><div className="min-w-0"><p className="truncate text-xs font-bold text-white">{moment.authorName}</p><p className="text-[10px] text-slate-500">@{moment.authorUsername} · {timeLabel(moment.createdAt)}</p></div></div>{(moment.authorId === currentUser.id || selected.ownerId === currentUser.id) && <button type="button" disabled={busy} onClick={() => void handleDeleteMoment(moment)} aria-label="Remove moment" title="Remove moment" className="rounded-lg p-2 text-slate-500 transition hover:bg-red-500/10 hover:text-red-300 disabled:opacity-40"><Trash2 size={14}/></button>}</div>
                {moment.text && <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-200">{moment.text}</p>}
                {moment.mediaType === 'image' && moment.mediaUrl && <img src={moment.mediaUrl} alt="WorldWeave contribution" loading="lazy" className="mt-3 max-h-[520px] w-full rounded-2xl object-cover"/>}
                {moment.mediaType === 'video' && moment.mediaUrl && <video src={moment.mediaUrl} controls playsInline preload="metadata" className="mt-3 max-h-[520px] w-full rounded-2xl bg-black"/>}
                {moment.mediaType === 'audio' && moment.mediaUrl && <div className="mt-3 rounded-2xl border border-violet-400/15 bg-violet-500/[.06] p-3"><div className="mb-2 flex items-center gap-2 text-xs font-semibold text-violet-200"><Mic size={14}/> Voice note</div><audio src={moment.mediaUrl} controls preload="metadata" className="w-full"/></div>}
                {selected.ownerId === currentUser.id && <button type="button" disabled={busy || (!(selected.pinnedMomentIds || []).includes(moment.id) && (selected.pinnedMomentIds || []).length >= 3)} onClick={() => void handleToggleMomentPin(moment)} className="mt-3 rounded-full border border-violet-400/20 px-3 py-1.5 text-xs font-semibold text-violet-200 hover:bg-violet-500/10 disabled:opacity-40">{(selected.pinnedMomentIds || []).includes(moment.id) ? 'Unpin from story' : 'Pin to story'}</button>}
                {isMember && <div className="mt-3 border-t border-white/5 pt-3">
                  <button type="button" onClick={() => { setExpandedReplyMomentId(current => current === moment.id ? null : moment.id); setReplyDraft(''); }} className="rounded-full border border-white/10 px-3 py-1.5 text-xs text-slate-300 hover:border-violet-400/30 hover:bg-violet-500/10">💬 {moment.replyCount || 0} replies {expandedReplyMomentId === moment.id ? '· Close' : '· View'}</button>
                  {expandedReplyMomentId === moment.id && <div className="mt-3 space-y-3 rounded-2xl border border-white/5 bg-black/10 p-3">
                    {momentReplies.length === 0 ? <p className="text-xs text-slate-500">Start the conversation with a thoughtful reply.</p> : <div className="max-h-72 space-y-3 overflow-y-auto">
                      {momentReplies.map(reply => <div key={reply.id} className="flex items-start justify-between gap-3">
                        <div className="min-w-0"><p className="text-[11px] font-bold text-violet-200">{reply.authorName} <span className="font-normal text-slate-500">@{reply.authorUsername} · {timeLabel(reply.createdAt)}</span></p><p className="mt-1 whitespace-pre-wrap text-xs leading-5 text-slate-300">{reply.text}</p></div>
                        {(reply.authorId === currentUser.id || selected.ownerId === currentUser.id) && <button type="button" disabled={busy} onClick={() => void handleDeleteMomentReply(reply)} className="shrink-0 rounded-lg px-2 py-1 text-[10px] text-red-300 hover:bg-red-500/10 disabled:opacity-40">Remove</button>}
                      </div>)}
                    </div>}
                    <form onSubmit={event => void handleSubmitMomentReply(event, moment)} className="flex gap-2">
                      <input value={replyDraft} onChange={event => setReplyDraft(event.target.value)} maxLength={1000} placeholder="Add to the conversation…" className="min-w-0 flex-1 rounded-xl border border-white/10 bg-[#070d19] px-3 py-2.5 text-xs text-white outline-none placeholder:text-slate-500 focus:border-violet-400/50"/>
                      <button disabled={busy || !replyDraft.trim()} className="rounded-xl bg-violet-600 px-3 py-2.5 text-xs font-bold text-white disabled:opacity-40">Reply</button>
                    </form>
                    <p className="text-right text-[10px] text-slate-500">{replyDraft.length}/1000</p>
                  </div>}
                </div>}
                {isMember && <div className="mt-4 flex flex-wrap gap-2 border-t border-white/5 pt-3">
                  <button type="button" disabled={busy} onClick={() => void handleMomentReaction(moment, 'heart')} aria-label="React with heart" className="rounded-full border border-white/10 px-3 py-1.5 text-xs text-slate-300 transition hover:border-pink-400/30 hover:bg-pink-500/10 disabled:opacity-40">❤️ {moment.reactionCounts?.heart || 0}</button>
                  <button type="button" disabled={busy} onClick={() => void handleMomentReaction(moment, 'applause')} aria-label="React with applause" className="rounded-full border border-white/10 px-3 py-1.5 text-xs text-slate-300 transition hover:border-violet-400/30 hover:bg-violet-500/10 disabled:opacity-40">🙌 {moment.reactionCounts?.applause || 0}</button>
                  <button type="button" disabled={busy} onClick={() => void handleMomentReaction(moment, 'insight')} aria-label="React with insight" className="rounded-full border border-white/10 px-3 py-1.5 text-xs text-slate-300 transition hover:border-amber-400/30 hover:bg-amber-500/10 disabled:opacity-40">💡 {moment.reactionCounts?.insight || 0}</button>
                  <button type="button" disabled={busy} onClick={() => void handleMomentReaction(moment, 'laugh')} aria-label="React with laughter" className="rounded-full border border-white/10 px-3 py-1.5 text-xs text-slate-300 transition hover:border-emerald-400/30 hover:bg-emerald-500/10 disabled:opacity-40">😂 {moment.reactionCounts?.laugh || 0}</button>
                </div>}
              </motion.article>)}
            </div>}
        </section>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 pb-10">
      <section className="relative overflow-hidden rounded-[30px] border border-violet-400/20 bg-[radial-gradient(circle_at_80%_0%,rgba(138,63,252,.3),transparent_40%),linear-gradient(140deg,#100c25,#080d19_65%,#0d1230)] p-6 md:p-9">
        <div className="absolute -right-8 -top-12 h-52 w-52 rounded-full border border-violet-300/10"/><div className="absolute -right-2 -top-6 h-40 w-40 rounded-full border border-violet-300/10"/>
        <div className="relative max-w-2xl"><div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[.24em] text-violet-200"><Sparkles size={14}/> A NEXORA original experience</div>
          <h1 className="mt-4 text-4xl font-black tracking-tight text-white md:text-5xl">World<span className="text-violet-300">Weave</span></h1>
          <p className="mt-3 text-sm leading-7 text-slate-300 md:text-base">One moment in the world. Many people who lived it. One evolving story told from every perspective.</p>
          <button onClick={() => setShowCreate(true)} className="mt-6 inline-flex items-center gap-2 rounded-xl bg-violet-600 px-5 py-3 text-sm font-bold text-white shadow-[0_10px_30px_rgba(113,56,255,.28)] hover:bg-violet-500"><Plus size={17}/> Start a WorldWeave</button>
        </div>
      </section>
      {notice && <p role="status" className="rounded-xl border border-violet-400/20 bg-violet-500/10 px-4 py-3 text-sm text-violet-100">{notice}</p>}
      {error && <p role="alert" className="rounded-xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">{error}</p>}
      {invitations.length > 0 && <section className="rounded-3xl border border-violet-400/20 bg-violet-500/[.06] p-5">
        <div className="mb-3 flex items-center gap-2 text-sm font-bold text-white"><Users size={16} className="text-violet-300"/> WorldWeave invitations <span className="rounded-full bg-violet-500/20 px-2 py-0.5 text-[10px] text-violet-100">{invitations.length}</span></div>
        <div className="space-y-2">{invitations.map(invite => <div key={`${invite.weaveId}:${invite.id}`} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-[#090e1b] p-3">
          <div><p className="text-sm font-semibold text-white">{invite.weaveTitle}</p><p className="mt-1 text-xs text-slate-400">Invited by {invite.ownerName}</p></div>
          <div className="flex items-center gap-2"><button disabled={busy} onClick={() => void handleDeclineInvite(invite)} className="rounded-xl border border-white/10 px-3 py-2 text-xs font-semibold text-slate-300 disabled:opacity-40">Decline</button><button disabled={busy} onClick={() => void handleAcceptInvite(invite)} className="rounded-xl bg-violet-600 px-4 py-2 text-xs font-bold text-white disabled:opacity-40">Accept invitation</button></div>
        </div>)}</div>
      </section>}
      {showCreate && <form onSubmit={handleCreate} className="rounded-3xl border border-violet-400/20 bg-[#0b1221] p-5">
        <div className="mb-4 flex items-center justify-between"><h2 className="font-bold text-white">Create a shared experience</h2><button type="button" onClick={() => setShowCreate(false)} aria-label="Close" className="text-slate-400"><X size={18}/></button></div>
        <div className="grid gap-3 md:grid-cols-2"><input value={title} onChange={e => setTitle(e.target.value)} minLength={3} maxLength={90} required placeholder="Give this moment a name" className="rounded-xl border border-white/10 bg-[#070d19] px-3 py-3 text-sm text-white outline-none focus:border-violet-400/60"/><select value={visibility} onChange={e => setVisibility(e.target.value as 'public'|'private')} className="rounded-xl border border-white/10 bg-[#070d19] px-3 py-3 text-sm text-white"><option value="public">Public · Anyone can follow the story</option><option value="private">Private · Invited contributors only</option></select></div>
        <textarea value={description} onChange={e => setDescription(e.target.value)} maxLength={500} rows={2} placeholder="What is this experience about?" className="mt-3 w-full rounded-xl border border-white/10 bg-[#070d19] px-3 py-3 text-sm text-white outline-none focus:border-violet-400/60"/>
        <div className="mt-3 flex justify-end"><button disabled={busy || title.trim().length < 3} className="rounded-xl bg-violet-600 px-5 py-2.5 text-xs font-bold text-white disabled:opacity-40">{busy ? 'Creating…' : 'Create WorldWeave'}</button></div>
      </form>}
      <div className="flex items-center justify-between"><div><h2 className="text-lg font-bold text-white">Experiences unfolding</h2><p className="mt-1 text-xs text-slate-500">Your contributions and public stories from the NEXORA community</p></div><span className="rounded-full border border-white/10 px-3 py-1 text-[10px] text-slate-400">{visibleWeaves.length} shown</span></div>
      <input value={discoveryQuery} onChange={event => setDiscoveryQuery(event.target.value)} placeholder="Search experiences, descriptions or hosts…" aria-label="Search WorldWeave experiences" className="w-full rounded-2xl border border-white/10 bg-[#0b1221] px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500 focus:border-violet-400/50"/>
      {loading && <div className="py-10 text-center text-sm text-slate-400">Loading WorldWeaves…</div>}
      {!loading && weaves.length === 0 && <div className="rounded-3xl border border-dashed border-white/10 p-10 text-center"><Globe2 className="mx-auto mb-3 text-violet-300" size={28}/><p className="font-semibold text-white">Your next great story starts here.</p><p className="mt-2 text-sm text-slate-400">Create an experience and invite the people who saw it differently.</p></div>}
      {!loading && weaves.length > 0 && visibleWeaves.length === 0 && <div className="rounded-2xl border border-white/10 p-6 text-center text-sm text-slate-400">No experiences match that search. Try another title or host.</div>}
      <div className="grid gap-4 md:grid-cols-2">
        {visibleWeaves.map(weave => <button key={weave.id} onClick={() => { setSelected(weave); setNotice(''); setError(''); }} className="group rounded-3xl border border-white/10 bg-[#0b1221] p-5 text-left transition hover:-translate-y-0.5 hover:border-violet-400/35 hover:bg-[#100d23]">
          <div className="flex items-start justify-between gap-3"><div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[.18em] text-violet-200"><Sparkles size={13}/>{weave.visibility === 'public' ? <Globe2 size={13}/> : <LockKeyhole size={13}/>} {weave.visibility}</div><span className="text-[10px] text-slate-500">{weave.ownerName}</span></div>
          <h3 className="mt-4 text-xl font-bold text-white group-hover:text-violet-100">{weave.title}</h3><p className="mt-2 line-clamp-2 min-h-10 text-sm leading-6 text-slate-400">{weave.description || 'A shared experience, told from multiple perspectives.'}</p>
          <div className="mt-5 flex items-center gap-4 text-xs text-slate-500"><span className="inline-flex items-center gap-1.5"><Users size={14}/>{weave.memberCount || 1} contributors</span><span>{weave.momentCount || 0} moments</span></div>
        </button>)}
      </div>
    </div>
  );
}
