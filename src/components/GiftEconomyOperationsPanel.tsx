import React, { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, CalendarPlus, RefreshCw, ShieldCheck } from 'lucide-react';
import { createGiftCompetition, getGiftRiskReviewQueue } from '../services/giftEconomyService';

type RiskRecord = {id:string;senderId:string;creatorId:string;grossNex:number;score:number;tier:string;reasons:string[];createdAt:string|null};
export default function GiftEconomyOperationsPanel(){
 const [records,setRecords]=useState<RiskRecord[]>([]);
 const [title,setTitle]=useState('');
 const [liveSessionId,setLiveSessionId]=useState('');
 const [startsAt,setStartsAt]=useState('');
 const [endsAt,setEndsAt]=useState('');
 const [loading,setLoading]=useState(true);
 const [saving,setSaving]=useState(false);
 const [error,setError]=useState('');
 const [notice,setNotice]=useState('');
 const refresh=useCallback(async()=>{setLoading(true);setError('');try{setRecords(await getGiftRiskReviewQueue());}catch(e){const code=(e as {code?:string})?.code||'';setError(code.includes('permission-denied')?'Finance administrator claim required.':'Gift risk review queue is temporarily unavailable.');}finally{setLoading(false);}},[]);
 useEffect(()=>{void refresh();},[refresh]);
 const publish=async()=>{
  setSaving(true);setError('');setNotice('');
  try{const result=await createGiftCompetition({title,liveSessionId,startsAt:new Date(startsAt).toISOString(),endsAt:new Date(endsAt).toISOString()});setNotice('Competition created: '+result.competitionId);setTitle('');setLiveSessionId('');setStartsAt('');setEndsAt('');}
  catch(e){const code=(e as {code?:string})?.code||'';setError(code.includes('permission-denied')?'Finance administrator claim required.':'Competition could not be created. Verify the live session and dates.');}
  finally{setSaving(false);}
 };
 return <section className="mt-4 space-y-5 rounded-2xl border border-white/10 bg-[#0a071f]/80 p-5">
  <div><p className="text-[10px] font-black uppercase tracking-[.2em] text-violet-300">GIFTVERSE · Trust and events</p><h3 className="mt-1 text-lg font-black text-white">Gift economy operations</h3><p className="mt-1 text-xs text-slate-400">Restricted finance controls for risk triage and live gift competitions.</p></div>
  {error&&<p role="alert" className="rounded-xl border border-rose-400/20 bg-rose-500/10 p-3 text-xs text-rose-200">{error}</p>}
  {notice&&<p role="status" className="rounded-xl border border-emerald-400/20 bg-emerald-500/10 p-3 text-xs text-emerald-200">{notice}</p>}
  <div className="rounded-xl border border-white/10 p-4">
   <div className="flex items-center justify-between gap-2"><h4 className="flex items-center gap-2 text-sm font-bold text-white"><AlertTriangle size={15} className="text-amber-300"/> Gift risk review</h4><button type="button" onClick={()=>void refresh()} disabled={loading} className="inline-flex items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-[10px] font-bold text-white"><RefreshCw size={12} className={loading?'animate-spin':''}/> Refresh</button></div>
   {loading?<p className="py-4 text-xs text-slate-500">Loading risk signals…</p>:records.length===0?<p className="py-4 text-xs text-slate-500">No elevated gift-risk signals require review.</p>:<div className="mt-3 space-y-2">{records.map(row=><article key={row.id} className="rounded-xl bg-white/[.03] p-3"><div className="flex items-center justify-between"><span className="text-xs font-bold text-white">{row.tier.toUpperCase()} · score {row.score}/100</span><span className="text-xs text-amber-200">{row.grossNex.toLocaleString()} NEX</span></div><p className="mt-1 break-all text-[10px] text-slate-500">Sender {row.senderId} · Creator {row.creatorId}</p><p className="mt-1 text-[10px] text-slate-400">{row.reasons.join(' · ')}</p></article>)}</div>}
   <p className="mt-3 flex items-start gap-2 text-[10px] leading-5 text-slate-500"><ShieldCheck size={13} className="mt-0.5 shrink-0"/> Risk scores prioritize human review. They do not automatically accuse users, reverse gifts or seize balances.</p>
  </div>
  <div className="rounded-xl border border-white/10 p-4">
   <h4 className="flex items-center gap-2 text-sm font-bold text-white"><CalendarPlus size={15} className="text-violet-300"/> Schedule a live gift competition</h4>
   <div className="mt-3 grid gap-3 sm:grid-cols-2">
    <input value={title} onChange={e=>setTitle(e.target.value)} placeholder="Competition title" className="min-h-10 rounded-xl border border-white/10 bg-[#15102a] px-3 text-xs text-white placeholder:text-slate-500"/>
    <input value={liveSessionId} onChange={e=>setLiveSessionId(e.target.value)} placeholder="Existing live session ID" className="min-h-10 rounded-xl border border-white/10 bg-[#15102a] px-3 text-xs text-white placeholder:text-slate-500"/>
    <label className="text-[10px] text-slate-400">Starts at<input type="datetime-local" value={startsAt} onChange={e=>setStartsAt(e.target.value)} className="mt-1 block min-h-10 w-full rounded-xl border border-white/10 bg-[#15102a] px-3 text-xs text-white"/></label>
    <label className="text-[10px] text-slate-400">Ends at<input type="datetime-local" value={endsAt} onChange={e=>setEndsAt(e.target.value)} className="mt-1 block min-h-10 w-full rounded-xl border border-white/10 bg-[#15102a] px-3 text-xs text-white"/></label>
   </div>
   <button type="button" disabled={saving||!title.trim()||!liveSessionId.trim()||!startsAt||!endsAt} onClick={()=>void publish()} className="mt-3 min-h-10 w-full rounded-xl bg-violet-600 px-4 text-xs font-bold text-white disabled:opacity-40">{saving?'Publishing…':'Create competition'}</button>
   <p className="mt-2 text-[10px] leading-5 text-slate-500">Requires a trusted finance claim and an existing live session. Competitions track actual server-verified gifts only; no fictional prize pool or cash reward is created.</p>
  </div>
 </section>;
}
