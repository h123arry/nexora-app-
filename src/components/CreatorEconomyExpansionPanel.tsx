import React, { useCallback, useEffect, useState } from 'react';
import { AlertCircle, BarChart3, CalendarDays, Globe2, RefreshCw, ShieldCheck, Trophy, Wallet } from 'lucide-react';
import { getActiveGiftCompetitions, getCreatorGiftAnalytics, getCreatorPayoutReadiness, getGiftCompetitionLeaderboard, setCreatorEconomyDisplayCurrency, getNgnBanks, resolveNgnBankAccount, setCreatorPayoutBeneficiary, requestCreatorPayout, type NgnBank, type CreatorGiftAnalytics, type CreatorPayoutReadiness, type GiftCompetition } from '../services/giftEconomyService';

const currencies = ['NGN','USD','GBP','EUR','GHS','KES','ZAR','CAD','AUD'];
const number = (value:number) => Number.isSafeInteger(value) && value >= 0 ? value.toLocaleString() : '—';
export default function CreatorEconomyExpansionPanel() {
  const [analytics,setAnalytics] = useState<CreatorGiftAnalytics|null>(null);
  const [payout,setPayout] = useState<CreatorPayoutReadiness|null>(null);
  const [competitions,setCompetitions] = useState<GiftCompetition[]>([]);
  const [leaderboard,setLeaderboard] = useState<Array<{rank:number;creatorId:string;grossNex:number}>>([]);
  const [selected,setSelected] = useState('');
  const [currency,setCurrency] = useState('NGN');
  const [loading,setLoading] = useState(true);
  const [saving,setSaving] = useState(false);
  const [error,setError] = useState('');
  const [message,setMessage] = useState('');
  const [banks,setBanks] = useState<NgnBank[]>([]);
  const [bankCode,setBankCode] = useState('');
  const [accountNumber,setAccountNumber] = useState('');
  const [resolvedAccountName,setResolvedAccountName] = useState('');
  const [bankBusy,setBankBusy] = useState(false);
  const [amountNex,setAmountNex] = useState('');
  const [payoutBusy,setPayoutBusy] = useState(false);
  const [payoutMessage,setPayoutMessage] = useState('');
  const refresh = useCallback(async()=>{
    setLoading(true);setError('');
    try {
      const [a,p,c] = await Promise.all([getCreatorGiftAnalytics(30),getCreatorPayoutReadiness(),getActiveGiftCompetitions()]);
      setAnalytics(a);setPayout(p);setCurrency(p.displayCurrency);setCompetitions(c);
      const first = c[0]?.id || ''; setSelected(first);
      if(first){const board=await getGiftCompetitionLeaderboard(first);setLeaderboard(board.leaderboard);}
      else setLeaderboard([]);
    } catch {setError('Creator economy data could not be loaded. Retry when connected.');}
    finally {setLoading(false);}
  },[]);
  useEffect(()=>{void refresh();},[refresh]);
  useEffect(()=>{void getNgnBanks().then(items=>{setBanks(items);if(items[0])setBankCode(items[0].code);}).catch(()=>{});},[]);
  const changeCompetition=async(id:string)=>{
    setSelected(id);setLeaderboard([]);
    if(!id)return;
    try{const board=await getGiftCompetitionLeaderboard(id);setLeaderboard(board.leaderboard);}
    catch{setError('The competition leaderboard is temporarily unavailable.');}
  };
  const resolveBank=async()=>{
    setBankBusy(true);setError('');setResolvedAccountName('');
    try{const result=await resolveNgnBankAccount(accountNumber,bankCode);setResolvedAccountName(result.accountName);}
    catch{setError('Paystack could not verify that account. Check the bank and 10-digit account number.');}
    finally{setBankBusy(false);}
  };
  const saveBeneficiary=async()=>{
    setBankBusy(true);setError('');
    try{const result=await setCreatorPayoutBeneficiary(accountNumber,bankCode,resolvedAccountName);setPayoutMessage('Verified bank account saved: '+result.accountName+' •••• '+result.accountNumberLast4+'.');setResolvedAccountName('');setAccountNumber('');await refresh();}
    catch{setError('The verified bank account could not be saved. Please retry.');}
    finally{setBankBusy(false);}
  };
  const submitWithdrawal=async()=>{
    const amount=Number(amountNex);
    if(!Number.isSafeInteger(amount)||amount<=0){setError('Enter a whole-number NEX withdrawal amount.');return;}
    setPayoutBusy(true);setError('');setPayoutMessage('');
    try{const result=await requestCreatorPayout(amount,crypto.randomUUID());setPayoutMessage('Withdrawal '+result.status.replaceAll('_',' ')+'. Reference: '+result.reference+'. '+(result.status==='submission_unknown'?'Your NEX remains reserved while Paystack is checked.':''));setAmountNex('');await refresh();}
    catch{setError('The withdrawal could not be submitted. Your NEX balance was not changed unless a request was confirmed.');}
    finally{setPayoutBusy(false);}
  };
  const saveCurrency=async()=>{
    setSaving(true);setError('');setMessage('');
    try{const result=await setCreatorEconomyDisplayCurrency(currency);setMessage(result.note);}
    catch{setError('Your display currency preference could not be saved.');}
    finally{setSaving(false);}
  };
  return <section className="mt-5 space-y-5">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-[10px] font-black uppercase tracking-[.2em] text-violet-300">Phase 5.6–5.10</p><h3 className="mt-1 text-xl font-black text-white">Creator economy intelligence</h3><p className="mt-1 text-xs text-slate-400">Verified gift performance, payout readiness and live competition activity.</p></div><button type="button" onClick={()=>void refresh()} disabled={loading} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-white/10 px-3 text-xs font-bold text-white disabled:opacity-50"><RefreshCw size={14} className={loading?'animate-spin':''}/> Refresh</button></div>
    {error&&<p role="alert" className="rounded-xl border border-rose-400/20 bg-rose-500/10 p-3 text-xs text-rose-200"><AlertCircle size={14} className="mr-2 inline"/>{error}</p>}
    {message&&<p role="status" className="rounded-xl border border-violet-400/20 bg-violet-500/10 p-3 text-xs text-violet-100">{message}</p>}
    <div className="grid gap-3 sm:grid-cols-3">
      <article className="rounded-2xl border border-white/10 bg-[#100d20] p-4"><div className="flex items-center gap-2 text-xs text-slate-300"><BarChart3 size={15}/> Gift gross · 30 days</div><p className="mt-3 text-2xl font-black text-white">{loading?'—':number(analytics?.totals.grossNex??0)} <span className="text-xs text-slate-400">NEX</span></p></article>
      <article className="rounded-2xl border border-white/10 bg-[#100d20] p-4"><div className="flex items-center gap-2 text-xs text-slate-300"><Wallet size={15}/> Settled creator share</div><p className="mt-3 text-2xl font-black text-white">{loading?'—':number(analytics?.totals.creatorShareNex??0)} <span className="text-xs text-slate-400">NEX</span></p></article>
      <article className="rounded-2xl border border-white/10 bg-[#100d20] p-4"><div className="flex items-center gap-2 text-xs text-slate-300"><Trophy size={15}/> Gifts delivered</div><p className="mt-3 text-2xl font-black text-white">{loading?'—':number(analytics?.totals.gifts??0)}</p></article>
    </div>
    <div className="rounded-2xl border border-white/10 bg-[#0a071f]/75 p-4">
      <h4 className="text-sm font-bold text-white">Daily gift performance</h4>
      <p className="mt-1 text-xs text-slate-400">Server-recorded gift volume, grouped by UTC day.</p>
      {!analytics?.daily.length?<p className="mt-3 text-xs text-slate-500">Daily performance will appear when verified gifts are received.</p>:<div className="mt-4 space-y-2">{analytics.daily.slice(-14).map(day=>{const peak=Math.max(1,...analytics.daily.map(item=>item.grossNex));return <div key={day.day} className="grid grid-cols-[76px_1fr_86px] items-center gap-2 text-[10px]"><span className="text-slate-500">{day.day.slice(5)}</span><div className="h-2 overflow-hidden rounded-full bg-white/[.06]"><div className="h-full rounded-full bg-gradient-to-r from-violet-600 to-indigo-400" style={{width:(day.grossNex/peak*100)+'%'}}/></div><strong className="text-right text-slate-300">{number(day.grossNex)} NEX</strong></div>})}</div>}
      {analytics?.truncated&&<p className="mt-3 text-[10px] text-amber-200">This report reached its 1,000-record limit. Totals are partial.</p>}
    </div>
    <div className="rounded-2xl border border-white/10 bg-[#0a071f]/75 p-4">
      <div className="flex items-center gap-2 text-sm font-bold text-white"><Globe2 size={16} className="text-violet-300"/> Global display currency</div>
      <p className="mt-1 text-xs text-slate-400">Choose how future financial summaries are labelled. This does not convert NEX or create an exchange rate.</p>
      <div className="mt-3 flex flex-wrap gap-2"><select value={currency} onChange={e=>setCurrency(e.target.value)} className="min-h-10 rounded-xl border border-white/10 bg-[#15102a] px-3 text-sm text-white">{currencies.map(code=><option key={code} value={code}>{code}</option>)}</select><button type="button" onClick={()=>void saveCurrency()} disabled={saving||loading} className="min-h-10 rounded-xl bg-violet-600 px-4 text-xs font-bold text-white disabled:opacity-50">{saving?'Saving…':'Save preference'}</button></div>
    </div>
    <div className="rounded-2xl border border-violet-400/20 bg-[#0a071f]/75 p-4">
      <div className="flex items-center gap-2 text-sm font-bold text-white"><Wallet size={16} className="text-violet-300"/> Nigerian bank withdrawals</div>
      <div className="mt-3 flex flex-wrap gap-2 text-[10px]">
        <span className="rounded-full border border-white/10 px-3 py-1 text-slate-300">Provider: {payout?.providerConfigured?'Paystack connected':'Not connected'}</span>
        <span className="rounded-full border border-white/10 px-3 py-1 text-slate-300">Mode: {(payout?.providerMode||'checking').toUpperCase()}</span>
        <span className="rounded-full border border-white/10 px-3 py-1 text-slate-300">Beneficiary: {payout?.beneficiaryStatus||'checking'}</span>
      </div>
      {payout?.providerMode==='test'&&<p className="mt-3 rounded-xl border border-amber-300/20 bg-amber-400/10 p-3 text-xs text-amber-100">Paystack test mode is connected. Test transfers do not send real money and do not count as completed NGN withdrawals.</p>}
      {payout?.providerMode==='live'&&!payout?.cashWithdrawalEnabled&&<p className="mt-3 rounded-xl border border-amber-300/20 bg-amber-400/10 p-3 text-xs text-amber-100">Live credentials are present, but withdrawals remain locked until the rate, business approval, compliance, webhook and live-settlement checks are complete.</p>}
      {payout?.beneficiary&&<p className="mt-3 text-xs text-slate-300">Saved account: <strong>{payout.beneficiary.accountName}</strong>, {payout.beneficiary.bankName}, ending {payout.beneficiary.accountNumberLast4}</p>}
      {payout?.beneficiary&&payout.complianceStatus!=='approved'&&<p className="mt-3 rounded-xl border border-amber-300/20 bg-amber-400/10 p-3 text-xs text-amber-100">Your bank account is provider-verified. Finance must still complete the creator identity and beneficiary review before withdrawals can be requested.</p>}
      {!payout?.beneficiary&&<div className="mt-4 space-y-2">
        <p className="text-xs text-slate-400">Add a Nigerian bank account. NEXORA asks Paystack to resolve the account name before registering it. Your full account number is not stored in NEXORA.</p>
        <select value={bankCode} onChange={e=>{setBankCode(e.target.value);setResolvedAccountName('');}} className="min-h-11 w-full rounded-xl border border-white/10 bg-[#15102a] px-3 text-sm text-white"><option value="">Choose bank</option>{banks.map(bank=><option key={bank.code} value={bank.code}>{bank.name}</option>)}</select>
        <input inputMode="numeric" maxLength={10} value={accountNumber} onChange={e=>{setAccountNumber(e.target.value.replace(/\D/g,'').slice(0,10));setResolvedAccountName('');}} placeholder="10-digit account number" className="min-h-11 w-full rounded-xl border border-white/10 bg-[#15102a] px-3 text-sm text-white placeholder:text-slate-500"/>
        {!resolvedAccountName?<button type="button" onClick={()=>void resolveBank()} disabled={bankBusy||accountNumber.length!==10||!bankCode} className="min-h-11 rounded-xl bg-violet-600 px-4 text-xs font-bold text-white disabled:opacity-50">{bankBusy?'Checking…':'Verify bank account'}</button>:<div className="rounded-xl border border-emerald-400/20 bg-emerald-400/10 p-3"><p className="text-xs text-emerald-100">Paystack verified account name</p><p className="mt-1 text-sm font-bold text-white">{resolvedAccountName}</p><button type="button" onClick={()=>void saveBeneficiary()} disabled={bankBusy} className="mt-3 min-h-10 rounded-xl bg-violet-600 px-4 text-xs font-bold text-white disabled:opacity-50">{bankBusy?'Saving…':'Confirm and save this account'}</button></div>}
      </div>}
      {(payout?.payoutEnabled||payout?.testModeAvailable)&&payout?.beneficiary&&<div className="mt-4 border-t border-white/10 pt-4">
        <p className="text-xs text-slate-400">Approved rate: {payout.koboPerNex??'—'} kobo per NEX · Provider fee reserve: {payout.providerFeeBufferKobo??'—'} kobo · Limits: {number(payout.minimumNex??0)} to {number(payout.maximumNex??0)} NEX</p>
        <input inputMode="numeric" value={amountNex} onChange={e=>setAmountNex(e.target.value.replace(/\D/g,''))} placeholder="Amount in NEX" className="mt-3 min-h-11 w-full rounded-xl border border-white/10 bg-[#15102a] px-3 text-sm text-white placeholder:text-slate-500"/>
        {Number(amountNex)>0&&payout.koboPerNex&&<p className="mt-2 text-xs text-slate-300">Estimated transfer: ₦{(Number(amountNex)*payout.koboPerNex/100).toLocaleString('en-NG',{minimumFractionDigits:2,maximumFractionDigits:2})}</p>}
        <button type="button" onClick={()=>void submitWithdrawal()} disabled={payoutBusy||!Number.isSafeInteger(Number(amountNex))||Number(amountNex)<=0} className="mt-3 min-h-11 rounded-xl bg-violet-600 px-4 text-xs font-bold text-white disabled:opacity-50">{payoutBusy?'Submitting…':payout.providerMode==='test'?'Run sandbox withdrawal':'Request NGN withdrawal'}</button>
      </div>}
      <p className="mt-3 text-[10px] text-slate-500">Status: {payout?.blocker||'checking'} · Real bank withdrawals: {payout?.cashWithdrawalEnabled?'enabled':'disabled'}</p>
      {payoutMessage&&<p role="status" className="mt-3 rounded-xl border border-violet-400/20 bg-violet-500/10 p-3 text-xs text-violet-100">{payoutMessage}</p>}
    </div>
    <div className="rounded-2xl border border-white/10 bg-[#0a071f]/75 p-4">
      <div className="flex items-center gap-2 text-sm font-bold text-white"><Trophy size={16} className="text-violet-300"/> GIFTVERSE live competitions</div>
      {!competitions.length?<p className="mt-3 text-xs text-slate-500">No scheduled or active gift competitions yet.</p>:<>
        <select value={selected} onChange={e=>void changeCompetition(e.target.value)} className="mt-3 min-h-10 w-full rounded-xl border border-white/10 bg-[#15102a] px-3 text-sm text-white">{competitions.map(item=><option key={item.id} value={item.id}>{item.title} · {item.status}</option>)}</select>
        <div className="mt-3 space-y-2">{leaderboard.length?leaderboard.map(row=><div key={row.creatorId} className="flex items-center justify-between rounded-xl bg-white/[.03] px-3 py-2 text-xs"><span className="text-slate-300">#{row.rank} · {row.creatorId}</span><strong className="text-white">{number(row.grossNex)} NEX</strong></div>):<p className="text-xs text-slate-500">No qualifying gifts recorded for this competition yet.</p>}</div>
      </>}
      <p className="mt-3 flex items-center gap-2 text-[10px] text-slate-500"><CalendarDays size={13}/> Competition scoring counts server-verified gifts sent during the live session window.</p>
    </div>
    <p className="flex items-start gap-2 text-[10px] leading-5 text-slate-500"><ShieldCheck size={14} className="mt-0.5 shrink-0 text-violet-300"/> Analytics are calculated from server-created gift records. Competition rankings are provisional gift-volume rankings, not cash prizes or guaranteed rewards.</p>
  </section>;
}
