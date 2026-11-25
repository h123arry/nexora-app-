import React, { useEffect, useState } from 'react';
import { collection, limit, onSnapshot, orderBy, query } from 'firebase/firestore';
import { Gift, Sparkles, ShoppingBag } from 'lucide-react';
import { db } from '../lib/firebase';
import { getMyGiftInventory, type GiftInventoryItem } from '../services/giftCatalogService';

interface GalleryGift {
  id: string;
  giftName?: string;
  image?: string;
  rarity?: string;
  quantity?: number;
  senderName?: string;
}
function GiftGrid({ gifts, received = false }: { gifts: Array<GiftInventoryItem | GalleryGift>; received?: boolean }) {
  if (!gifts.length) return null;
  return <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
    {gifts.map(gift => {
      const name = 'giftName' in gift ? gift.giftName : gift.giftName;
      const image = gift.image;
      const quantity = gift.quantity || 1;
      return <article key={gift.id} className="overflow-hidden rounded-2xl border border-violet-300/15 bg-[#100d20] shadow-[0_12px_36px_rgba(0,0,0,.18)]">
        <div className="relative flex aspect-square items-center justify-center overflow-hidden bg-[radial-gradient(circle,rgba(124,58,237,.24),transparent_72%)] p-4">
          {image?.startsWith('/giftverse/gifts/') ? <img src={image} alt={name || 'NEXORA gift'} loading="lazy" decoding="async" className="h-full w-full object-contain transition-transform duration-500 hover:scale-105"/> : <Gift className="h-10 w-10 text-violet-300/60" aria-hidden="true"/>}
          <span className="absolute right-2 top-2 rounded-full border border-violet-300/25 bg-black/65 px-2 py-1 text-[10px] font-bold text-violet-100">×{quantity}</span>
        </div>
        <div className="p-3">
          <p className="truncate text-xs font-bold text-white">{name || 'Gift details unavailable'}</p>
          <p className="mt-1 text-[10px] capitalize text-violet-200/65">{gift.rarity || 'Gift'}{received && 'senderName' in gift && gift.senderName ? ' · from ' + gift.senderName : ''}</p>
        </div>
      </article>;
    })}
  </div>;
}
export default function CreatorGiftGallery({ userId, isOwner = false, onExplore }: { userId: string; isOwner?: boolean; onExplore?: () => void }) {
  const [gifts, setGifts] = useState<GalleryGift[]>([]);
  const [inventory, setInventory] = useState<GiftInventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [inventoryLoading, setInventoryLoading] = useState(isOwner);
  const [galleryError, setGalleryError] = useState(false);
  const [inventoryError, setInventoryError] = useState(false);
  const [loadAttempt, setLoadAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    setLoading(true);
    setGalleryError(false);
    const receivedQuery = query(collection(db, 'users', userId, 'giftGallery'), orderBy('receivedAt', 'desc'), limit(100));
    const unsubscribe = onSnapshot(receivedQuery, snapshot => {
      if (!active) return;
      setGifts(snapshot.docs.map(item => ({ id: item.id, ...item.data() } as GalleryGift)));
      setGalleryError(false);
      setLoading(false);
    }, () => {
      if (!active) return;
      setGalleryError(true);
      setLoading(false);
    });

    if (isOwner) {
      setInventoryLoading(true);
      setInventoryError(false);
      getMyGiftInventory()
        .then(items => { if (active) setInventory(items); })
        .catch(() => { if (active) setInventoryError(true); })
        .finally(() => { if (active) setInventoryLoading(false); });
    } else {
      setInventory([]);
      setInventoryLoading(false);
      setInventoryError(false);
    }

    return () => { active = false; unsubscribe(); };
  }, [userId, isOwner, loadAttempt]);
  if (loading) return <div className="mx-auto grid max-w-4xl grid-cols-2 gap-3 px-3 sm:grid-cols-4"><div className="aspect-square animate-pulse rounded-2xl bg-white/5"/><div className="aspect-square animate-pulse rounded-2xl bg-white/5"/></div>;
  return <section className="mx-auto w-full max-w-5xl space-y-8 px-3 pb-8" aria-label="Gift gallery">
    {isOwner && <section>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div><div className="flex items-center gap-2"><Sparkles className="h-4 w-4 text-violet-300"/><h3 className="text-sm font-bold text-white">My Gift Collection</h3><span className="text-xs text-zinc-500">{inventory.reduce((sum, item) => sum + item.quantity, 0)} owned</span></div><p className="mt-1 text-xs text-zinc-500">Your gifts, ready to keep or send to someone.</p></div>
        {onExplore && <button type="button" onClick={onExplore} className="inline-flex items-center gap-2 rounded-xl border border-violet-300/25 bg-violet-500/10 px-3 py-2 text-xs font-semibold text-violet-100 hover:bg-violet-500/20"><ShoppingBag className="h-3.5 w-3.5"/>Explore GiftVerse</button>}
      </div>
      {inventoryLoading ? <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4"><div className="aspect-square animate-pulse rounded-2xl bg-white/5"/><div className="aspect-square animate-pulse rounded-2xl bg-white/5"/></div> : inventoryError ? <div className="rounded-xl border border-rose-300/15 bg-rose-500/5 p-4 text-xs text-rose-200">Your collection could not be loaded. Your gifts are safe. <button type="button" onClick={() => setLoadAttempt(value => value + 1)} className="ml-2 underline underline-offset-2">Retry</button></div> : inventory.length ? <GiftGrid gifts={inventory}/> : <div className="rounded-2xl border border-dashed border-violet-300/15 bg-violet-500/[.035] px-5 py-10 text-center"><Gift className="mx-auto mb-3 h-9 w-9 text-violet-300"/><p className="text-sm font-bold text-white">Your collection is waiting</p><p className="mt-1 text-xs text-zinc-400">Explore GiftVerse, discover something extraordinary, and add your first gift.</p>{onExplore && <button type="button" onClick={onExplore} className="mt-4 rounded-xl bg-violet-600 px-4 py-2.5 text-xs font-bold text-white">Explore the gift catalogue</button>}</div>}
    </section>}
    <section>
      <div className="mb-4 flex items-center gap-2"><Gift className="h-4 w-4 text-violet-300"/><h3 className="text-sm font-bold text-white">{isOwner ? 'Gifts I’ve Received' : 'Gift gallery'}</h3><span className="text-xs text-zinc-500">{gifts.length} keepsakes</span></div>
      {loading ? <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4"><div className="aspect-square animate-pulse rounded-2xl bg-white/5"/><div className="aspect-square animate-pulse rounded-2xl bg-white/5"/></div> : galleryError ? <div className="rounded-2xl border border-amber-300/15 bg-amber-500/[.04] py-10 text-center"><Gift className="mx-auto mb-3 h-8 w-8 text-amber-200/70"/><p className="text-sm font-semibold text-zinc-200">Gift gallery couldn’t load</p><p className="mt-1 text-xs text-zinc-500">Your gifts haven’t been changed. Check your connection and try again.</p><button type="button" onClick={() => setLoadAttempt(value => value + 1)} className="mt-4 rounded-xl border border-violet-300/20 bg-violet-500/10 px-4 py-2 text-xs font-semibold text-violet-100 hover:bg-violet-500/20">Retry</button></div> : gifts.length ? <GiftGrid gifts={gifts} received/> : <div className="rounded-2xl border border-dashed border-white/10 py-12 text-center"><Gift className="mx-auto mb-3 h-8 w-8 text-violet-300/60"/><p className="text-sm font-semibold text-zinc-200">No gifts received yet</p><p className="mt-1 text-xs text-zinc-500">Gifts sent to this profile will appear here.</p></div>}
    </section>
  </section>;
}
