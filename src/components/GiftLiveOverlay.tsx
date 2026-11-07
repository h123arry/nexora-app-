import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { subscribeToLiveGiftEvents, type LiveGiftEvent } from '../services/giftDeliveryService';

interface GiftLiveOverlayProps { streamId: string; muted?: boolean; }
export default function GiftLiveOverlay({ streamId, muted = true }: GiftLiveOverlayProps) {
  const [queue, setQueue] = useState<LiveGiftEvent[]>([]);
  const [active, setActive] = useState<LiveGiftEvent | null>(null);
  const seen = useRef(new Set<string>());
  useEffect(() => {
    setQueue([]); setActive(null); seen.current.clear();
    return subscribeToLiveGiftEvents(streamId, events => {
      const fresh = events
        .filter(event => !seen.current.has(event.transactionId))
        .filter(event => !event.createdAt?.toMillis || Date.now() - event.createdAt.toMillis() < 60_000)
        .sort((a, b) => (a.createdAt?.toMillis?.() || 0) - (b.createdAt?.toMillis?.() || 0));
      if (!fresh.length) return;
      fresh.forEach(event => seen.current.add(event.transactionId));
      setQueue(current => [...current, ...fresh].slice(-30));
    });
  }, [streamId]);
  useEffect(() => {
    if (active || queue.length === 0) return;
    const [next, ...rest] = queue;
    setActive(next);
    setQueue(rest);
  }, [active, queue]);
  useEffect(() => {
    if (!active) return;
    const duration = active.animation === 'legendary' ? 7200 : active.animation === 'cinematic' ? 5200 : 3600;
    const timer = window.setTimeout(() => setActive(null), duration);
    return () => window.clearTimeout(timer);
  }, [active]);
  if (!active) return null;
  const cinematic = active.animation === 'cinematic' || active.animation === 'legendary';
  return <div className="pointer-events-none absolute inset-0 z-[80] flex items-center justify-center overflow-hidden" aria-live="polite" aria-atomic="true">
    <AnimatePresence mode="wait">
      <motion.div key={active.transactionId}
        initial={{ opacity: 0, scale: .45, y: 80, rotate: -8 }}
        animate={{ opacity: 1, scale: 1, y: 0, rotate: 0 }}
        exit={{ opacity: 0, scale: .72, y: -70, filter: 'blur(12px)' }}
        transition={{ type: 'spring', stiffness: 150, damping: 17 }}
        className={'relative flex w-[min(88vw,420px)] flex-col items-center rounded-[28px] border p-5 text-center shadow-2xl backdrop-blur-xl ' +
          (active.animation === 'legendary' ? 'border-amber-200/60 bg-[#17102c]/95 shadow-amber-300/20' :
          cinematic ? 'border-violet-200/50 bg-[#100b27]/90 shadow-violet-500/30' : 'border-white/15 bg-black/75')}>
        {cinematic && <div className="gift-live-aura absolute inset-0 rounded-[28px]" />}
        <div className="relative mb-2 text-[10px] font-black uppercase tracking-[.28em] text-violet-200">{active.animation === 'legendary' ? 'A legendary arrival' : 'A gift for the creator'}</div>
        <motion.img src={active.giftImage} alt={active.giftName} className="relative h-36 w-36 object-contain drop-shadow-[0_12px_28px_rgba(139,92,246,.55)]"
          animate={active.animation === 'sparkle' ? { y: [0, -8, 0], rotate: [-2, 2, -2] } :
            active.animation === 'reveal' ? { scale: [1, 1.12, 1], rotate: [0, 4, 0] } :
            active.animation === 'cinematic' ? { y: [40, -12, 0], scale: [.7, 1.2, 1] } :
            { y: [80, -16, 0], scale: [.2, 1.25, 1], rotate: [-12, 0, 0] }}
          transition={{ duration: cinematic ? 3.4 : 2.4, ease: 'easeInOut' }} />
        <div className="relative mt-1 text-xl font-black text-white">{active.giftName}{active.quantity > 1 ? ' × ' + active.quantity : ''}</div>
        <div className="relative mt-2 text-sm text-violet-100"><strong>{active.senderName}</strong> sent a gift to <strong>{active.creatorName}</strong></div>
        <div className="relative mt-2 text-xs font-bold text-amber-200">{active.totalNex.toLocaleString()} NEX</div>
        {!muted && <span className="sr-only">Sound effects are enabled in the live player.</span>}
      </motion.div>
    </AnimatePresence>
    <style>{`@keyframes gift-live-aura{0%,100%{opacity:.25;transform:scale(.92)}50%{opacity:.9;transform:scale(1.06)}}.gift-live-aura{background:radial-gradient(circle,rgba(139,92,246,.24),transparent 70%);animation:gift-live-aura 2.4s ease-in-out infinite}@media(prefers-reduced-motion:reduce){.gift-live-aura{animation:none}}`}</style>
  </div>;
}
