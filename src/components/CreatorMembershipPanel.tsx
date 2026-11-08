import React, { useCallback, useEffect, useState } from 'react';
import { Archive, Check, Crown, Loader2, Plus, RefreshCw, Save, ShieldCheck } from 'lucide-react';
import { archiveCreatorMembershipTier, createCreatorMembershipTier, listCreatorMembershipTiers, updateCreatorMembershipTier, type CreatorMembershipTier, type CreatorMembershipTierInput } from '../services/creatorMembershipService';

const empty: CreatorMembershipTierInput = { name: '', description: '', benefits: [''] };
export default function CreatorMembershipPanel() {
  const [tiers,setTiers] = useState<CreatorMembershipTier[]>([]);
  const [form,setForm] = useState<CreatorMembershipTierInput>(empty);
  const [editing,setEditing] = useState<string|null>(null);
  const [loading,setLoading] = useState(true);
  const [saving,setSaving] = useState(false);
  const [error,setError] = useState('');
  const [notice,setNotice] = useState('');
  const refresh = useCallback(async()=>{
    setLoading(true);setError('');
    try { const result=await listCreatorMembershipTiers();setTiers(result.tiers); }
    catch { setError('Membership drafts could not be loaded. Check your connection and retry.'); }
    finally { setLoading(false); }
  },[]);
  useEffect(()=>{void refresh();},[refresh]);
  const reset=()=>{setForm(empty);setEditing(null);};
  const edit=(tier:CreatorMembershipTier)=>{setEditing(tier.id);setForm({name:tier.name,description:tier.description,benefits:tier.benefits});setNotice('');};
  const save=async()=>{
    const benefits=form.benefits.map(x=>x.trim()).filter(Boolean);
    setSaving(true);setError('');setNotice('');
    try {
      const input={...form,benefits};
      if(editing) await updateCreatorMembershipTier(editing,input); else await createCreatorMembershipTier(input);
      reset();setNotice('Membership tier draft saved securely.');await refresh();
    } catch (e:any) { setError(e?.message?.replace(/^FirebaseError:\s*/,'') || 'The membership tier could not be saved.'); }
    finally { setSaving(false); }
  };
  const archive=async(id:string)=>{
    setError('');setNotice('');
    try { await archiveCreatorMembershipTier(id);if(editing===id)reset();setNotice('Membership tier archived.');await refresh(); }
    catch { setError('This membership tier could not be archived.'); }
  };
  const active=tiers.filter(t=>t.status!=='archived');
  return <section className="mt-5 space-y-4 rounded-3xl border border-violet-400/15 bg-[#0b081b]/90 p-4 sm:p-5">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-[10px] font-black uppercase tracking-[.2em] text-violet-300">Creator business tools</p><h3 className="mt-1 flex items-center gap-2 text-lg font-black text-white"><Crown size={18} className="text-violet-300"/> Membership tier studio</h3><p className="mt-1 max-w-xl text-xs leading-relaxed text-slate-400">Design up to three membership offers and the benefits your community would receive.</p></div><button type="button" onClick={()=>void refresh()} disabled={loading} className="inline-flex min-h-9 items-center gap-2 rounded-xl border border-white/10 px-3 text-xs font-bold text-white disabled:opacity-50"><RefreshCw size={13} className={loading?'animate-spin':''}/> Refresh</button></div>
    <div className="flex items-start gap-2 rounded-xl border border-amber-400/15 bg-amber-500/[.06] p-3 text-[11px] leading-relaxed text-amber-100"><ShieldCheck size={15} className="mt-0.5 shrink-0"/><span>Saved tiers are drafts only. Paid checkout, recurring charges and membership access are not enabled yet. No money is collected and no benefits are automatically granted.</span></div>
    {error&&<p role="alert" className="rounded-xl border border-rose-400/20 bg-rose-500/10 p-3 text-xs text-rose-200">{error}</p>}
    {notice&&<p role="status" className="rounded-xl border border-violet-400/20 bg-violet-500/10 p-3 text-xs text-violet-100">{notice}</p>}
    <div className="grid gap-3 md:grid-cols-2">
      <div className="space-y-3 rounded-2xl border border-white/10 bg-black/20 p-4">
        <div className="flex items-center justify-between"><h4 className="text-sm font-bold text-white">{editing?'Edit tier draft':'Create a tier draft'}</h4><span className="text-[10px] text-slate-500">{active.length}/3 tiers</span></div>
        <label className="block space-y-1"><span className="text-[10px] font-bold text-slate-400">Tier name</span><input maxLength={40} value={form.name} onChange={e=>setForm(v=>({...v,name:e.target.value}))} placeholder="e.g. Inner Circle" className="min-h-10 w-full rounded-xl border border-white/10 bg-[#100d20] px-3 text-sm text-white outline-none focus:border-violet-400/50"/></label>
        <label className="block space-y-1"><span className="text-[10px] font-bold text-slate-400">Description</span><textarea maxLength={300} rows={3} value={form.description} onChange={e=>setForm(v=>({...v,description:e.target.value}))} placeholder="Describe the community experience..." className="w-full rounded-xl border border-white/10 bg-[#100d20] p-3 text-sm text-white outline-none focus:border-violet-400/50"/></label>
        <div className="space-y-2"><div className="flex items-center justify-between"><span className="text-[10px] font-bold text-slate-400">Benefits (up to five)</span><button type="button" disabled={form.benefits.length>=5} onClick={()=>setForm(v=>({...v,benefits:[...v.benefits,'']}))} className="text-[10px] font-bold text-violet-300 disabled:opacity-40">+ Add benefit</button></div>{form.benefits.map((benefit,i)=><div key={i} className="flex gap-2"><input maxLength={80} value={benefit} onChange={e=>setForm(v=>({...v,benefits:v.benefits.map((b,j)=>j===i?e.target.value:b)}))} placeholder={i===0?'Monthly members-only Q&A':'Another member benefit'} className="min-h-9 min-w-0 flex-1 rounded-lg border border-white/10 bg-[#100d20] px-3 text-xs text-white outline-none focus:border-violet-400/50"/>{form.benefits.length>1&&<button type="button" aria-label="Remove benefit" onClick={()=>setForm(v=>({...v,benefits:v.benefits.filter((_,j)=>j!==i)}))} className="px-2 text-slate-500 hover:text-white">×</button>}</div>)}</div>
        <div className="flex gap-2 pt-1"><button type="button" onClick={()=>void save()} disabled={saving||loading||(!editing&&active.length>=3)} className="inline-flex min-h-10 flex-1 items-center justify-center gap-2 rounded-xl bg-violet-600 px-3 text-xs font-bold text-white disabled:opacity-40">{saving?<Loader2 size={14} className="animate-spin"/>:<Save size={14}/>} {editing?'Save changes':'Save tier draft'}</button>{editing&&<button type="button" onClick={reset} className="rounded-xl border border-white/10 px-3 text-xs font-bold text-slate-300">Cancel</button>}</div>
        {!editing&&active.length>=3&&<p className="text-[10px] text-amber-200">You have reached the three-tier limit. Archive a draft to create another.</p>}
      </div>
      <div className="space-y-3"><div className="flex items-center justify-between"><h4 className="text-sm font-bold text-white">Your membership drafts</h4><span className="text-[10px] text-slate-500">Owner-only</span></div>{loading?<div className="rounded-xl border border-white/10 p-5 text-center text-xs text-slate-400">Loading saved tiers…</div>:tiers.length===0?<div className="rounded-xl border border-dashed border-white/10 p-5 text-center"><Crown size={22} className="mx-auto text-slate-600"/><p className="mt-2 text-xs font-bold text-white">No membership tiers yet</p><p className="mt-1 text-[10px] text-slate-500">Your saved tier drafts will appear here.</p></div>:tiers.map(tier=><article key={tier.id} className="rounded-xl border border-white/10 bg-black/20 p-3"><div className="flex items-start justify-between gap-2"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h5 className="text-sm font-bold text-white">{tier.name}</h5><span className={'rounded-full px-2 py-0.5 text-[9px] font-bold '+(tier.status==='archived'?'bg-white/5 text-slate-500':'bg-violet-500/15 text-violet-200')}>{tier.status}</span></div><p className="mt-1 text-[11px] leading-relaxed text-slate-400">{tier.description}</p></div></div><ul className="mt-2 space-y-1">{tier.benefits.map((benefit,i)=><li key={i} className="flex items-start gap-2 text-[10px] text-slate-300"><Check size={12} className="mt-0.5 shrink-0 text-violet-300"/>{benefit}</li>)}</ul>{tier.status!=='archived'&&<div className="mt-3 flex justify-end gap-2"><button type="button" onClick={()=>edit(tier)} className="rounded-lg border border-white/10 px-3 py-1.5 text-[10px] font-bold text-slate-200">Edit</button><button type="button" onClick={()=>void archive(tier.id)} className="inline-flex items-center gap-1 rounded-lg border border-white/10 px-3 py-1.5 text-[10px] font-bold text-slate-400"><Archive size={11}/> Archive</button></div>}</article>)}</div>}
    </div>
  </section>;
}
