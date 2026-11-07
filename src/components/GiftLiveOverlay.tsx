import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { subscribeToLiveGiftEvents, type LiveGiftEvent } from '../services/giftDeliveryService';

interface GiftLiveOverlayProps { streamId: string; soundEnabled?: boolean; audioContext?: AudioContext | null; }
export default function GiftLiveOverlay({ streamId, soundEnabled = false, audioContext = null }: GiftLiveOverlayProps) {
  const reduceMotion = useReducedMotion();
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
  const category = active.giftId.split('-')[0];
  const artMotion = reduceMotion ? {} :
    category === 'dragon' ? { x: [-100, 0, 80, 0], y: [35, -35, 0, 0], rotate: [-14, 5, -3, 0], scale: [.55, 1.18, 1, 1] } :
    category === 'floral' ? { scale: [.12, 1.22, 1], rotate: [-22, 8, 0], y: [35, 0, 0] } :
    category === 'wildlife' ? { x: [-34, -8, 24, 0], y: [0, -5, 0, -2], rotate: [-4, 2, -2, 0] } :
    category === 'royal' || category === 'luxury' ? { y: [75, -10, 0], rotate: [-12, 3, 0], scale: [.45, 1.15, 1] } :
    category === 'celestial' || category === 'tech' ? { rotate: [-35, 12, 360], scale: [.65, 1.12, 1] } :
    category === 'music' ? { y: [0, -14, 0, -7, 0], scale: [1, 1.08, 1] } :
    { y: [70, -10, 0], scale: [.45, 1.15, 1] };
  useEffect(() => {
    if (!active || !soundEnabled || !audioContext || audioContext.state !== 'running') return;
    const base = active.rarity === 'legendary' ? 660 : active.rarity === 'epic' ? 554 : 440;
    [0, 0.13, 0.26].forEach((offset, index) => {
      const oscillator = audioContext.createOscillator();
      const gain = audioContext.createGain();
      oscillator.type = 'sine';
      oscillator.frequency.value = base * (index === 1 ? 1.25 : index === 2 ? 1.5 : 1);
      gain.gain.setValueAtTime(0.0001, audioContext.currentTime + offset);
      gain.gain.exponentialRampToValueAtTime(0.075, audioContext.currentTime + offset + 0.025);
      gain.gain.exponentialRampToValueAtTime(0.0001, audioContext.currentTime + offset + 0.22);
      oscillator.connect(gain); gain.connect(audioContext.destination);
      oscillator.start(audioContext.currentTime + offset);
      oscillator.stop(audioContext.currentTime + offset + 0.24);
    });
  }, [active, soundEnabled, audioContext, reduceMotion]);
  return <div className="pointer-events-none absolute inset-0 z-[80] flex items-center justify-center overflow-hidden" aria-live="polite" aria-atomic="true">
    <AnimatePresence mode="wait">
      <motion.div key={active.transactionId}
        initial={reduceMotion ? false : { opacity: 0, scale: .45, y: 80, rotate: -8 }}
        animate={reduceMotion ? { opacity: 1 } : { opacity: 1, scale: 1, y: 0, rotate: 0 }}
        exit={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: .72, y: -70, filter: 'blur(12px)' }}
        transition={reduceMotion ? { duration: .12 } : { type: 'spring', stiffness: 150, damping: 17 }}
        className={'relative flex w-[min(88vw,420px)] flex-col items-center rounded-[28px] border p-5 text-center shadow-2xl backdrop-blur-xl ' +
          (active.animation === 'legendary' ? 'border-amber-200/60 bg-[#17102c]/95 shadow-amber-300/20' :
          cinematic ? 'border-violet-200/50 bg-[#100b27]/90 shadow-violet-500/30' : 'border-white/15 bg-black/75')}>
        {cinematic && <div className="gift-live-aura absolute inset-0 rounded-[28px]" />}
        <div className="relative mb-2 text-[10px] font-black uppercase tracking-[.28em] text-violet-200">{active.animation === 'legendary' ? 'A legendary arrival' : 'A gift for the creator'}</div>
        <motion.img src={active.giftImage} alt={active.giftName} className="relative h-36 w-36 object-contain drop-shadow-[0_12px_28px_rgba(139,92,246,.55)]"
          animate={artMotion}
          transition={{ duration: cinematic ? 3.4 : 2.4, ease: 'easeInOut' }} />
        {active.quantity > 1 && <div className="relative mb-1 rounded-full border border-amber-200/30 bg-amber-300/10 px-3 py-1 text-[10px] font-black uppercase tracking-[.2em] text-amber-100">Gift combo ×{active.quantity}</div>}
        <div className="relative mt-1 text-xl font-black text-white">{active.giftName}</div>
        <div className="relative mt-2 text-sm text-violet-100"><strong>{active.senderName}</strong> sent a gift to <strong>{active.creatorName}</strong></div>
        <div className="relative mt-2 text-xs font-bold text-amber-200">{active.totalNex.toLocaleString()} NEX</div>
      </motion.div>
    </AnimatePresence>
    <style>{`@keyframes gift-live-aura{0%,100%{opacity:.25;transform:scale(.92)}50%{opacity:.9;transform:scale(1.06)}}.gift-live-aura{background:radial-gradient(circle,rgba(139,92,246,.24),transparent 70%);animation:gift-live-aura 2.4s ease-in-out infinite}@media(prefers-reduced-motion:reduce){.gift-live-aura{animation:none}}`}</style>
  </div>;
}
