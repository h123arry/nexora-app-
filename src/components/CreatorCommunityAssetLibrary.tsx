import React, { useMemo, useState } from 'react';
import { Check, Copy, Download, Search, Sparkles, UserRound, Users, Award, Radio, Image as ImageIcon } from 'lucide-react';
import type { User } from '../types';
import { CREATOR_COMMUNITY_ASSETS, type CreatorAssetCategory, type CreatorCommunityAsset } from '../content/creatorCommunityAssets';

interface Props { currentUser: User; onUpdateProfile?: (data: Partial<User>) => void; }
const categories: Array<{ id: CreatorAssetCategory; label: string; icon: React.ElementType; hint: string }> = [
  { id: 'profile-frame', label: 'Profile frames', icon: UserRound, hint: 'Give your portrait a distinctive border.' },
  { id: 'profile-badge', label: 'Creator badges', icon: Award, hint: 'Showcase a creator identity emblem.' },
  { id: 'circle-cover', label: 'Circle covers', icon: Users, hint: 'Choose a visual identity for a community.' },
  { id: 'milestone-art', label: 'Milestone art', icon: Sparkles, hint: 'Celebrate meaningful creator achievements.' },
  { id: 'live-overlay', label: 'Live overlays', icon: Radio, hint: 'Frame live sessions, events and premieres.' },
];
export default function CreatorCommunityAssetLibrary({ currentUser, onUpdateProfile }: Props) {
  const [category, setCategory] = useState<CreatorAssetCategory>('profile-frame');
  const [search, setSearch] = useState('');
  const [notice, setNotice] = useState('');
  const assets = useMemo(() => CREATOR_COMMUNITY_ASSETS.filter(asset => asset.category === category && (!search.trim() || (asset.title + ' ' + asset.description + ' ' + asset.rarity).toLowerCase().includes(search.trim().toLowerCase()))), [category, search]);
  const apply = (asset: CreatorCommunityAsset) => {
    if (!asset.applyField || !onUpdateProfile) return;
    onUpdateProfile({ [asset.applyField]: asset.id } as Partial<User>);
    setNotice(asset.category === 'profile-frame' ? 'Profile frame applied to your account.' : 'Creator badge applied to your account.');
  };
  const copyLink = async (asset: CreatorCommunityAsset) => {
    try { await navigator.clipboard.writeText(new URL(asset.path, window.location.origin).toString()); setNotice('Asset link copied.'); }
    catch { setNotice('Copy is unavailable in this browser. Use Download SVG instead.'); }
  };
  const download = (asset: CreatorCommunityAsset) => {
    const link = document.createElement('a'); link.href = asset.path; link.download = asset.id + '.svg'; link.rel = 'noopener'; document.body.appendChild(link); link.click(); link.remove();
    setNotice(asset.title + ' downloaded.');
  };
  return <section className="space-y-5 text-white">
    <div className="rounded-3xl border border-violet-400/15 bg-gradient-to-br from-[#171039] via-[#0d0a22] to-[#080713] p-5 sm:p-6">
      <div className="flex items-center gap-2 text-violet-200"><ImageIcon className="h-4 w-4"/><span className="text-[10px] font-black uppercase tracking-[.22em]">NEXORA creative collection</span></div>
      <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div><h2 className="text-xl sm:text-2xl font-black">Creator & Community Asset Library</h2><p className="mt-1 max-w-2xl text-xs leading-relaxed text-violet-100/65">Original, lightweight vector artwork for identity, community spaces, milestones and live productions.</p></div>
        <span className="w-fit rounded-full border border-violet-300/20 bg-violet-400/10 px-3 py-1.5 text-[10px] font-bold text-violet-200">{CREATOR_COMMUNITY_ASSETS.length} original assets</span>
      </div>
      <div className="mt-4 grid grid-cols-2 sm:grid-cols-5 gap-2">
        {categories.map(item => { const Icon = item.icon; const active = category === item.id; return <button key={item.id} type="button" onClick={() => { setCategory(item.id); setNotice(''); }} className={`rounded-xl border px-3 py-3 text-left transition-colors ${active ? 'border-violet-300/40 bg-violet-500/15 text-white' : 'border-white/8 bg-black/20 text-zinc-400 hover:text-white'}`}><Icon className="mb-2 h-4 w-4"/><span className="block text-[11px] font-bold">{item.label}</span><span className="mt-1 block text-[9px] text-zinc-500">8 assets</span></button>; })}
      </div>
    </div>
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-xs text-zinc-400">{categories.find(item => item.id === category)?.hint}</p>
      <label className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2"><Search className="h-3.5 w-3.5 text-zinc-500"/><input value={search} onChange={event => setSearch(event.target.value)} placeholder="Search this collection" className="w-full bg-transparent text-xs text-white outline-none sm:w-48"/></label>
    </div>
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {assets.map(asset => {
        const selected = asset.id === currentUser.profileFrameId || asset.id === currentUser.profileBadgeId;
        return <article key={asset.id} className="overflow-hidden rounded-2xl border border-white/10 bg-[#0c0a1b]">
          <div className={`relative flex items-center justify-center overflow-hidden bg-[radial-gradient(circle_at_50%_40%,#261b55,#080713_72%)] p-3 ${asset.aspectRatio === '16:9' ? 'aspect-video' : 'aspect-square'}`}>
            <img src={asset.path} alt={asset.title} loading="lazy" className={asset.category === 'profile-frame' || asset.category === 'profile-badge' || asset.category === 'milestone-art' ? 'h-full w-full object-contain' : 'h-full w-full object-cover'}/>
            {selected && <span className="absolute right-2 top-2 flex items-center gap-1 rounded-full bg-violet-500 px-2 py-1 text-[9px] font-black"><Check className="h-3 w-3"/> Applied</span>}
          </div>
          <div className="space-y-2 p-3">
            <div className="flex items-start justify-between gap-2"><h3 className="text-xs font-bold leading-tight">{asset.title}</h3><span className="shrink-0 rounded-md bg-white/5 px-1.5 py-1 text-[8px] font-bold uppercase tracking-wider text-violet-200">{asset.rarity}</span></div>
            <p className="min-h-8 text-[10px] leading-relaxed text-zinc-500">{asset.description}</p>
            <div className="flex flex-wrap gap-1.5">
              {asset.applyField ? <button type="button" onClick={() => apply(asset)} disabled={!onUpdateProfile || selected} className="flex-1 rounded-lg bg-violet-600 px-2 py-2 text-[9px] font-black disabled:cursor-default disabled:opacity-50">{selected ? 'Applied' : asset.applyField === 'profileFrameId' ? 'Apply frame' : 'Apply badge'}</button> : <button type="button" onClick={() => void copyLink(asset)} className="flex-1 rounded-lg border border-white/10 px-2 py-2 text-[9px] font-bold text-zinc-300"><Copy className="mr-1 inline h-3 w-3"/>Copy link</button>}
              <button type="button" onClick={() => download(asset)} className="rounded-lg border border-white/10 px-2 py-2 text-[9px] font-bold text-zinc-300" aria-label={`Download ${asset.title}`}><Download className="h-3 w-3"/></button>
            </div>
          </div>
        </article>;
      })}
    </div>
    {assets.length === 0 && <div className="rounded-2xl border border-white/10 p-8 text-center text-xs text-zinc-500">No assets match that search.</div>}
    {notice && <p role="status" className="rounded-xl border border-violet-300/15 bg-violet-500/10 px-3 py-2 text-xs text-violet-200">{notice}</p>}
  </section>;
}
