import React, { useEffect, useState } from 'react';
import { collection, getDocs, limit, orderBy, query } from 'firebase/firestore';
import { Gift, Sparkles } from 'lucide-react';
import { db } from '../lib/firebase';

interface GalleryGift {
  id: string;
  giftName?: string;
  image?: string;
  rarity?: string;
  quantity?: number;
  senderName?: string;
}
export default function CreatorGiftGallery({ userId }: { userId: string }) {
  const [gifts, setGifts] = useState<GalleryGift[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let active = true;
    setLoading(true);
    getDocs(query(collection(db, 'users', userId, 'giftGallery'), orderBy('receivedAt', 'desc'), limit(60)))
      .then(snapshot => { if (active) setGifts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as GalleryGift))); })
      .catch(() => { if (active) setGifts([]); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [userId]);
  if (loading) return <div className="mx-auto grid max-w-4xl grid-cols-2 gap-3 px-3 sm:grid-cols-4"><div className="aspect-square animate-pulse rounded-2xl bg-white/5"/><div className="aspect-square animate-pulse rounded-2xl bg-white/5"/></div>;
  if (!gifts.length) return <div className="mx-auto max-w-md py-16 text-center"><Gift className="mx-auto mb-3 h-9 w-9 text-violet-300"/><p className="font-bold text-zinc-200">No gifts in this gallery yet</p><p className="mt-1 text-xs text-zinc-500">Thoughtful gifts from the NEXORA community will be kept here.</p></div>;
  return <section className="mx-auto w-full max-w-4xl px-3 pb-8" aria-label="Creator gift gallery">
    <div className="mb-4 flex items-center gap-2"><Sparkles className="h-4 w-4 text-violet-300"/><h3 className="text-sm font-bold text-white">Gift gallery</h3><span className="text-xs text-zinc-500">{gifts.length} keepsakes</span></div>
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {gifts.map(gift => <article key={gift.id} className="overflow-hidden rounded-2xl border border-white/10 bg-[#100d20]">
        <div className="aspect-square bg-[radial-gradient(circle,rgba(124,58,237,.18),transparent_72%)] p-4"><img src={gift.image?.startsWith('/giftverse/gifts/') ? gift.image : '/giftverse/gifts/royal-01.svg'} alt={gift.giftName || 'NEXORA gift'} loading="lazy" decoding="async" className="h-full w-full object-contain"/></div>
        <div className="p-3"><p className="truncate text-xs font-bold text-white">{gift.giftName || 'NEXORA gift'}</p><p className="mt-1 text-[10px] text-zinc-500">From {gift.senderName || 'A supporter'}{gift.quantity && gift.quantity > 1 ? ' · ×' + gift.quantity : ''}</p></div>
      </article>)}
    </div>
  </section>;
}
