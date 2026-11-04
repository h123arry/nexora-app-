import React, { useMemo, useState } from 'react';
import { Search, Users, X, Plus, Check } from 'lucide-react';
import type { User } from '../types';
import { getTranslations } from '../utils/translations';

interface Props {
  isOpen: boolean;
  currentUserId: string;
  creators: User[];
  onClose: () => void;
  onCreate: (name: string, description: string, participantIds: string[]) => Promise<void>;
  locale?: string;
}

export default function CreateGroupChatModal({ isOpen, currentUserId, creators, onClose, onCreate, locale = 'en' }: Props) {
  const copy = getTranslations(locale);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const candidates = useMemo(() => creators
    .filter(user => user.id !== currentUserId)
    .filter(user => !search.trim() || user.name.toLowerCase().includes(search.toLowerCase()) || user.username.toLowerCase().includes(search.toLowerCase()))
    .slice(0, 60), [creators, currentUserId, search]);

  if (!isOpen) return null;

  const toggleMember = (id: string) => setSelected(current => current.includes(id)
    ? current.filter(item => item !== id)
    : current.length < 49 ? [...current, id] : current);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (busy || name.trim().length < 2 || selected.length < 2) return;
    setBusy(true);
    setError('');
    try {
      await onCreate(name.trim(), description.trim(), selected);
      setName('');
      setDescription('');
      setSearch('');
      setSelected([]);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'The group could not be created.');
    } finally {
      setBusy(false);
    }
  };

  return <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="create-group-heading">
    <form onSubmit={submit} className="w-full max-w-lg rounded-3xl border border-violet-400/20 bg-[#090714] p-5 shadow-2xl">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2"><Users className="h-5 w-5 text-violet-300" /><div><h2 id="create-group-heading" className="text-sm font-bold text-white">{copy.inboxCreateGroupHeading}</h2><p className="text-[10px] text-zinc-400">{copy.inboxGroupIntro}</p></div></div>
        <button type="button" onClick={onClose} disabled={busy} aria-label="Close group creation" className="nx-icon-button"><X className="h-4 w-4" /></button>
      </div>
      <label className="mb-3 block text-xs text-zinc-300">{copy.inboxGroupName}<input value={name} onChange={event => setName(event.target.value)} minLength={2} maxLength={80} required className="nx-field mt-1 w-full px-3 py-2" placeholder="e.g. NEXORA Creators" /></label>
      <label className="mb-4 block text-xs text-zinc-300">{copy.inboxGroupDescription}<textarea value={description} onChange={event => setDescription(event.target.value)} maxLength={500} rows={2} className="nx-field mt-1 w-full px-3 py-2" placeholder="What is this group for?" /></label>
      <div className="mb-2 flex items-center justify-between"><label htmlFor="group-member-search" className="text-xs font-semibold text-zinc-300">{copy.inboxInviteMembers} ({selected.length}/49)</label><span className="text-[10px] text-zinc-500">{copy.inboxSelectAtLeastTwo}</span></div>
      <div className="relative mb-3"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" /><input id="group-member-search" value={search} onChange={event => setSearch(event.target.value)} className="nx-field w-full pl-9 pr-3 py-2 text-xs" placeholder={copy.inboxSearchPeople} /></div>
      <div className="max-h-64 space-y-1 overflow-y-auto rounded-xl border border-white/10 p-1">
        {candidates.length === 0 ? <p className="p-4 text-center text-xs text-zinc-500">{copy.inboxNoAccounts}</p> : candidates.map(user => {
          const active = selected.includes(user.id);
          return <button key={user.id} type="button" onClick={() => toggleMember(user.id)} aria-pressed={active} className="flex w-full items-center gap-3 rounded-lg p-2 text-left hover:bg-white/5 focus-visible:outline-2 focus-visible:outline-violet-300">
            <img src={user.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100'} alt="" className="h-9 w-9 rounded-xl bg-white/5 object-cover" />
            <span className="min-w-0 flex-1"><span className="block truncate text-xs font-semibold text-white">{user.name}</span><span className="block truncate text-[10px] text-zinc-500">@{user.username}</span></span>
            <span className={`flex h-5 w-5 items-center justify-center rounded-md border ${active ? 'border-violet-400 bg-violet-600 text-white' : 'border-white/20 text-transparent'}`}><Check className="h-3 w-3" /></span>
          </button>;
        })}
      </div>
      {error && <p role="alert" className="mt-3 text-xs text-rose-300">{error}</p>}
      <div className="mt-4 flex justify-end gap-2"><button type="button" onClick={onClose} disabled={busy} className="rounded-xl border border-white/10 px-4 py-2 text-xs text-zinc-300">{copy.inboxCancel}</button><button type="submit" disabled={busy || name.trim().length < 2 || selected.length < 2} className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2 text-xs font-bold text-white disabled:opacity-40">{busy ? copy.inboxCreating : <><Plus className="h-3.5 w-3.5" />{copy.inboxCreateGroupButton}</>}</button></div>
    </form>
  </div>;
}
