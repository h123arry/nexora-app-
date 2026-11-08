import React, { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, CalendarPlus, RefreshCw, ShieldCheck } from 'lucide-react';
import { createGiftCompetition, getGiftRiskReviewQueue, resolveGiftRiskSignal, getCreatorPayoutComplianceQueue, getNgnPayoutPolicyForFinance, configureNgnPayoutPolicy, reviewCreatorPayoutCompliance, type CreatorPayoutComplianceRecord } from '../services/giftEconomyService';

type RiskRecord = {id:string;senderId:string;creatorId:string;grossNex:number;score:number;tier:string;reasons:string[];createdAt:string|null};
export default function GiftEconomyOperationsPanel(){
 const [records,setRecords]=useState<RiskRecord[]>([]);
 const [title,setTitle]=useState('');
 const [liveSessionId,setLiveSessionId]=useState('');
 const [startsAt,setStartsAt]=useState('');
 const [endsAt,setEndsAt]=useState('');
 const [loading,setLoading]=useState(true);
 const [saving,setSaving]=useState(false);
 const [reviewNotes,setReviewNotes]=useState<Record<string,string>>({});
 const [complianceRecords,setComplianceRecords]=useState<CreatorPayoutComplianceRecord[]>([]);
 const [evidenceRefs,setEvidenceRefs]=useState<Record<string,string>>({});
 const [nameMatches,setNameMatches]=useState<Record<string,boolean>>({});
 const [payoutMode,setPayoutMode]=useState('unknown');
 const [payoutEnabled,setPayoutEnabled]=useState(false);
 const [koboPerNex,setKoboPerNex]=useState('');
 const [feeBuffer,setFeeBuffer]=useState('');
 const [minimumNex,setMinimumNex]=useState('1000');
 const [maximumNex,setMaximumNex]=useState('10000000');
 const [liveEvidenceReference,setLiveEvidenceReference]=useState('');
 const [liveApprovals,setLiveApprovals]=useState({liveSettlementApproved:false,providerBusinessVerified:false,settlementFundingVerified:false,complianceApproved:false,webhookVerified:false,liveTestTransferVerified:false});
 const [error,setError]=useState('');
 const [notice,setNotice]=useState('');
 const refresh=useCallback(async()=>{
  setLoading(true);setError('');
  const [riskResult,queueResult,policyResult]=await Promise.allSettled([getGiftRiskReviewQueue(),getCreatorPayoutComplianceQueue(),getNgnPayoutPolicyForFinance()]);
  if(riskResult.status==='fulfilled')setRecords(riskResult.value);
  if(queueResult.status==='fulfilled')setComplianceRecords(queueResult.value);
  if(policyResult.status==='fulfilled'){
   const p=policyResult.value;setPayoutMode(p.mode);setPayoutEnabled(p.enabled);
   setKoboPerNex(p.koboPerNex===null?'':String(p.koboPerNex));setFeeBuffer(p.providerFeeBufferKobo===null?'':String(p.providerFeeBufferKobo));
   setMinimumNex(p.minimumNex===null?'1000':String(p.minimumNex));setMaximumNex(p.maximumNex===null?'10000000':String(p.maximumNex));
   setLiveEvidenceReference(p.liveEvidenceReference||'');
   setLiveApprovals({liveSettlementApproved:p.liveSettlementApproved,providerBusinessVerified:p.providerBusinessVerified,
    settlementFundingVerified:p.settlementFundingVerified,complianceApproved:p.complianceApproved,
    webhookVerified:p.webhookVerified,liveTestTransferVerified:p.liveTestTransferVerified});
  }
  if(riskResult.status==='rejected'||queueResult.status==='rejected'||policyResult.status==='rejected'){
   const reason=[riskResult,queueResult,policyResult].find(x=>x.status==='rejected');
   const code=reason?.status==='rejected'?(reason.reason as {code?:string})?.code||'':'';
   setError(code.includes('permission-denied')?'Finance administrator claim required.':'Some payout or gift-operations data could not be loaded. Check provider secrets and retry.');
  }
  setLoading(false);
 },[]);
 useEffect(()=>{void refresh();},[refresh]);
 const review=async(id:string,outcome:'cleared'|'escalated')=>{const note=reviewNotes[id]||'';try{await resolveGiftRiskSignal(id,outcome,note);setNotice('Risk signal '+outcome+'. An immutable audit record was saved.');setReviewNotes(prev=>({...prev,[id]:''}));await refresh();}catch{setError('Risk decision could not be saved. Add a review note and retry.');}};
 const reviewBeneficiary=async(row:CreatorPayoutComplianceRecord,decision:'approved'|'rejected')=>{
  const evidenceReference=evidenceRefs[row.creatorId]||'';
  const bankAccountNameMatched=nameMatches[row.creatorId]===true;
  if(evidenceReference.trim().length<4||(decision==='approved'&&!bankAccountNameMatched)){setError('Add an evidence reference and confirm the bank-account name matches verified creator identity.');return;}
  setSaving(true);setError('');setNotice('');
  try{await reviewCreatorPayoutCompliance({creatorId:row.creatorId,beneficiaryRef:row.beneficiaryRef,decision,evidenceReference:evidenceReference.trim(),bankAccountNameMatched});
   setNotice('Creator beneficiary compliance '+decision+'. The decision is audit-logged.');await refresh();}
  catch{setError('Creator beneficiary compliance review could not be saved.');}
  finally{setSaving(false);}
 };
 const savePayoutPolicy=async()=>{
  const rate=Number(koboPerNex),fee=Number(feeBuffer),min=Number(minimumNex),max=Number(maximumNex);
  if(!Number.isSafeInteger(rate)||!Number.isSafeInteger(fee)||!Number.isSafeInteger(min)||!Number.isSafeInteger(max)){setError('Use whole-number kobo and NEX policy values.');return;}
  setSaving(true);setError('');setNotice('');
  try{const result=await configureNgnPayoutPolicy({enabled:payoutEnabled,koboPerNex:rate,providerFeeBufferKobo:fee,minimumNex:min,maximumNex:max,
   liveSettlementApproved:liveApprovals.liveSettlementApproved,liveEvidenceReference,
   providerBusinessVerified:liveApprovals.providerBusinessVerified,settlementFundingVerified:liveApprovals.settlementFundingVerified,
   complianceApproved:liveApprovals.complianceApproved,webhookVerified:liveApprovals.webhookVerified,liveTestTransferVerified:liveApprovals.liveTestTransferVerified});
   setNotice('Paystack '+result.mode+' payout policy saved.');await refresh();}
  catch{setError('Payout policy was rejected. Live mode requires every approval gate, a fee reserve and an evidence reference.');}
  finally{setSaving(false);}
 };
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
   {loading?<p className="py-4 text-xs text-slate-500">Loading risk signals…</p>:records.length===0?<p className="py-4 text-xs text-slate-500">No elevated gift-risk signals require review.</p>:<div className="mt-3 space-y-2">{records.map(row=><article key={row.id} className="rounded-xl bg-white/[.03] p-3"><div className="flex items-center justify-between"><span className="text-xs font-bold text-white">{row.tier.toUpperCase()} · score {row.score}/100</span><span className="text-xs text-amber-200">{row.grossNex.toLocaleString()} NEX</span></div><p className="mt-1 break-all text-[10px] text-slate-500">Sender {row.senderId} · Creator {row.creatorId}</p><p className="mt-1 text-[10px] text-slate-400">{row.reasons.join(' · ')}</p><textarea value={reviewNotes[row.id]||''} onChange={e=>setReviewNotes(prev=>({...prev,[row.id]:e.target.value}))} placeholder="Required review note (8–500 characters)" className="mt-2 min-h-16 w-full rounded-lg border border-white/10 bg-[#15102a] p-2 text-[10px] text-white"/><div className="mt-2 flex gap-2"><button type="button" disabled={(reviewNotes[row.id]||'').trim().length<8} onClick={()=>void review(row.id,'cleared')} className="rounded-lg border border-emerald-300/20 px-3 py-2 text-[10px] font-bold text-emerald-200 disabled:opacity-40">Clear signal</button><button type="button" disabled={(reviewNotes[row.id]||'').trim().length<8} onClick={()=>void review(row.id,'escalated')} className="rounded-lg border border-amber-300/20 px-3 py-2 text-[10px] font-bold text-amber-200 disabled:opacity-40">Escalate</button></div></article>)}</div>}
   <p className="mt-3 flex items-start gap-2 text-[10px] leading-5 text-slate-500"><ShieldCheck size={13} className="mt-0.5 shrink-0"/> Risk scores prioritize human review. They do not automatically accuse users, reverse gifts or seize balances.</p>
  </div>
  <div className="rounded-xl border border-white/10 p-4">
   <h4 className="text-sm font-bold text-white">Paystack NGN payout policy</h4>
   <p className="mt-1 text-[10px] leading-5 text-slate-500">Provider mode: {payoutMode.toUpperCase()}. Enter only a finance-approved integer kobo-per-NEX rate and provider-fee reserve. Live mode stays locked until every evidence gate is checked.</p>
   <div className="mt-3 grid gap-3 sm:grid-cols-2">
    <label className="text-[10px] text-slate-400">Kobo per NEX<input inputMode="numeric" value={koboPerNex} onChange={e=>setKoboPerNex(e.target.value.replace(/\D/g,''))} className="mt-1 min-h-10 w-full rounded-xl border border-white/10 bg-[#15102a] px-3 text-xs text-white"/></label>
    <label className="text-[10px] text-slate-400">Provider fee reserve (kobo)<input inputMode="numeric" value={feeBuffer} onChange={e=>setFeeBuffer(e.target.value.replace(/\D/g,''))} className="mt-1 min-h-10 w-full rounded-xl border border-white/10 bg-[#15102a] px-3 text-xs text-white"/></label>
    <label className="text-[10px] text-slate-400">Minimum NEX<input inputMode="numeric" value={minimumNex} onChange={e=>setMinimumNex(e.target.value.replace(/\D/g,''))} className="mt-1 min-h-10 w-full rounded-xl border border-white/10 bg-[#15102a] px-3 text-xs text-white"/></label>
    <label className="text-[10px] text-slate-400">Maximum NEX<input inputMode="numeric" value={maximumNex} onChange={e=>setMaximumNex(e.target.value.replace(/\D/g,''))} className="mt-1 min-h-10 w-full rounded-xl border border-white/10 bg-[#15102a] px-3 text-xs text-white"/></label>
   </div>
   <label className="mt-3 flex items-center gap-2 text-xs text-slate-300"><input type="checkbox" checked={payoutEnabled} onChange={e=>setPayoutEnabled(e.target.checked)}/> Enable payout requests for this provider environment</label>
   {payoutMode==='live'&&<div className="mt-3 space-y-2 rounded-xl border border-amber-300/20 bg-amber-400/5 p-3">
    <p className="text-xs font-bold text-amber-100">Live settlement attestations</p>
    {([['providerBusinessVerified','Paystack registered-business transfer access verified'],['settlementFundingVerified','Live NGN settlement balance funded'],['complianceApproved','Platform legal/compliance approval complete'],['webhookVerified','Production signed webhook verified end to end'],['liveTestTransferVerified','Controlled live bank transfer confirmed by receiving bank'],['liveSettlementApproved','Finance explicitly approves live withdrawals']] as const).map(([key,label])=><label key={key} className="flex items-start gap-2 text-[10px] text-slate-300"><input type="checkbox" checked={liveApprovals[key]} onChange={e=>setLiveApprovals(prev=>({...prev,[key]:e.target.checked}))}/>{label}</label>)}
    <input value={liveEvidenceReference} onChange={e=>setLiveEvidenceReference(e.target.value)} placeholder="Evidence bundle / approval reference" className="min-h-10 w-full rounded-xl border border-white/10 bg-[#15102a] px-3 text-xs text-white"/>
   </div>}
   <button type="button" disabled={saving||!koboPerNex||!minimumNex||!maximumNex} onClick={()=>void savePayoutPolicy()} className="mt-3 min-h-10 w-full rounded-xl bg-violet-600 px-4 text-xs font-bold text-white disabled:opacity-40">{saving?'Saving…':'Save payout policy'}</button>
  </div>
  <div className="rounded-xl border border-white/10 p-4">
   <h4 className="text-sm font-bold text-white">Creator beneficiary compliance review</h4>
   <p className="mt-1 text-[10px] leading-5 text-slate-500">Review the provider-verified account against the creator's identity/KYC evidence outside NEXORA. Store only an evidence reference, never identity documents or raw bank details.</p>
   {complianceRecords.length===0?<p className="mt-3 text-xs text-slate-500">No verified bank beneficiaries are waiting for compliance review.</p>:<div className="mt-3 space-y-3">{complianceRecords.map(row=><article key={row.creatorId} className="rounded-xl bg-white/[.03] p-3">
    <p className="text-xs font-bold text-white">{row.accountName} · {row.bankName} •••• {row.accountNumberLast4}</p><p className="mt-1 break-all text-[10px] text-slate-500">Creator {row.creatorId} · {row.complianceStatus}</p>
    <input value={evidenceRefs[row.creatorId]||''} onChange={e=>setEvidenceRefs(prev=>({...prev,[row.creatorId]:e.target.value}))} placeholder="KYC evidence reference" className="mt-2 min-h-10 w-full rounded-lg border border-white/10 bg-[#15102a] px-3 text-xs text-white"/>
    <label className="mt-2 flex items-start gap-2 text-[10px] text-slate-300"><input type="checkbox" checked={nameMatches[row.creatorId]===true} onChange={e=>setNameMatches(prev=>({...prev,[row.creatorId]:e.target.checked}))}/> Bank account holder name matches the verified creator identity</label>
    <div className="mt-2 flex gap-2"><button type="button" disabled={saving||!evidenceRefs[row.creatorId]?.trim()||!nameMatches[row.creatorId]} onClick={()=>void reviewBeneficiary(row,'approved')} className="rounded-lg border border-emerald-300/20 px-3 py-2 text-[10px] font-bold text-emerald-200 disabled:opacity-40">Approve beneficiary</button><button type="button" disabled={saving||!evidenceRefs[row.creatorId]?.trim()} onClick={()=>void reviewBeneficiary(row,'rejected')} className="rounded-lg border border-rose-300/20 px-3 py-2 text-[10px] font-bold text-rose-200 disabled:opacity-40">Reject</button></div>
   </article>)}</div>}
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
