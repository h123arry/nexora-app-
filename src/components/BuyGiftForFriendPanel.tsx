import React, { useMemo, useState } from 'react';
import { Gift, Search, RefreshCw, UserRound, CheckCircle2 } from 'lucide-react';
import { buyGiftForFriend, searchGiftFriends, type GiftFriendPerson } from '../services/giftFriendPurchaseService';
import type { NexoraGift } from '../services/giftCatalogService';

function requestKey() {
  if (typeof crypto === 'undefined' || typeof crypto.randomUUID !== 'function') {
    throw new Error('Secure purchase requests are unavailable in this browser.');
  }
  return crypto.randomUUID();
}

export default function BuyGiftForFriendPanel({ gifts, isLoggedIn }: { gifts: NexoraGift[]; isLoggedIn: boolean }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [people, setPeople] = useState<GiftFriendPerson[]>([]);
  const [person, setPerson] = useState<GiftFriendPerson | null>(null);
  const [giftId, setGiftId] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const gift = useMemo(() => gifts.find(item => item.id === giftId) || null, [gifts, giftId]);

  const search = async () => {
    setBusy(true); setError(''); setMessage(''); setPerson(null);
    try { setPeople(await searchGiftFriends(query.trim())); }
    catch { setError('We couldn’t find members right now. Check the name or username and retry.'); }
    finally { setBusy(false); }
  };

  const buy = async () => {
    if (!person || !gift) return;
    setBusy(true); setError(''); setMessage('');
    try {
      await buyGiftForFriend(gift.id, person.id, requestKey());
      setMessage(gift.name + ' was added to ' + person.name + '’s collection.');
      setPerson(null); setPeople([]); setQuery(''); setGiftId('');
    } catch (cause) {
      const code = typeof cause === 'object' && cause !== null && 'code' in cause ? String((cause as {code?: unknown}).code) : '';
      setError(code.includes('failed-precondition') ? 'Your NEX balance may be too low, or this purchase is unavailable.' : 'We couldn’t confirm the purchase. Check your wallet before trying again.');
    } finally { setBusy(false); }
  };

  return <section className="rounded-2xl border border-violet-300/15 bg-[#100d20] p-4 sm:p-5">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div><p className="text-sm font-bold">Buy a gift for a friend</p><p className="mt-1 text-xs text-slate-400">Pay with your NEX. The gift goes straight into their collection.</p></div>
      <button type="button" onClick={() => setOpen(value => !value)} className="rounded-xl border border-violet-300/30 bg-violet-500/10 px-4 py-2 text-xs font-bold text-violet-100">{open ? 'Close' : 'Buy for a friend'}</button>
    </div>
    {open && <div className="mt-4 space-y-4">
      {!isLoggedIn ? <p className="text-sm text-slate-400">Sign in to buy a gift for a friend.</p> : <>
        <div className="flex gap-2">
          <label className="min-w-0 flex-1"><span className="sr-only">Friend’s name or username</span><input value={query} onChange={event => setQuery(event.target.value)} onKeyDown={event => { if (event.key === 'Enter') void search(); }} placeholder="Search by name or username" className="h-11 w-full rounded-xl border border-white/10 bg-black/20 px-3 text-sm outline-none focus:border-violet-400/50" /></label>
          <button type="button" onClick={() => void search()} disabled={busy || query.trim().length < 2} className="flex h-11 items-center gap-2 rounded-xl bg-violet-600 px-4 text-xs font-bold disabled:opacity-50">{busy ? <RefreshCw size={14} className="animate-spin"/> : <Search size={14}/>} Search</button>
        </div>
        {people.length > 0 && <div className="grid gap-2 sm:grid-cols-2">{people.map(item => <button key={item.id} type="button" onClick={() => setPerson(item)} className={'flex items-center gap-3 rounded-xl border p-3 text-left ' + (person?.id === item.id ? 'border-violet-300/60 bg-violet-500/10' : 'border-white/10 bg-black/10')}>
          {item.avatar ? <img src={item.avatar} alt="" className="h-10 w-10 rounded-full object-cover"/> : <span className="grid h-10 w-10 place-items-center rounded-full bg-violet-500/15"><UserRound size={18}/></span>}
          <span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold">{item.name}</span><span className="block truncate text-xs text-slate-400">@{item.username}</span></span>
          {person?.id === item.id && <CheckCircle2 size={17} className="text-violet-300"/>}
        </button>)}</div>}
        {person && <div className="space-y-3 rounded-xl border border-violet-300/20 bg-violet-500/5 p-3">
          <p className="text-xs text-violet-100">Gift recipient: <strong>{person.name}</strong> (@{person.username})</p>
          <label className="block text-xs text-slate-400">Choose a gift from GiftVerse<select value={giftId} onChange={event => setGiftId(event.target.value)} className="mt-2 h-11 w-full rounded-xl border border-white/10 bg-[#090714] px-3 text-sm text-white"><option value="">Select a gift</option>{gifts.filter(item => !item.subscriptionExclusive).map(item => <option key={item.id} value={item.id}>{item.name} · {item.priceNex} NEX · {item.rarity}</option>)}</select></label>
          {gift && <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-black/20 p-3"><img src={gift.image} alt={gift.name} className="h-16 w-16 rounded-lg object-contain"/><div><p className="text-sm font-bold">{gift.name}</p><p className="text-xs text-violet-200">{gift.priceNex.toLocaleString()} NEX</p><p className="text-[11px] text-slate-400">Added to their collection, not creator earnings.</p></div></div>}
          <button type="button" disabled={!gift || busy} onClick={() => void buy()} className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 text-sm font-bold disabled:opacity-50">{busy ? <RefreshCw size={15} className="animate-spin"/> : <Gift size={15}/>} Buy for {person.name}</button>
        </div>}
      </>}
      {message && <p role="status" className="rounded-xl border border-emerald-400/20 bg-emerald-500/10 p-3 text-xs text-emerald-100">{message}</p>}
      {error && <p role="alert" className="rounded-xl border border-rose-400/20 bg-rose-500/10 p-3 text-xs text-rose-100">{error}</p>}
    </div>}
  </section>;
}
