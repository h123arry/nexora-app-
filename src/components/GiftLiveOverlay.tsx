import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { subscribeToLiveGiftEvents, type LiveGiftEvent } from '../services/giftDeliveryService';
import GiftAnimationStage from './GiftAnimationStage';

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
  }, [active, soundEnabled, audioContext]);
  if (!active) return null;
  const cinematic = active.animation === 'cinematic' || active.animation === 'legendary';
  return <div className="pointer-events-none absolute inset-0 z-[80] flex items-center justify-center overflow-hidden" aria-live="polite" aria-atomic="true">
    <AnimatePresence mode="wait">
      <motion.div key={active.transactionId}
        initial={reduceMotion ? false : { opacity: 0, scale: .82, y: 50 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: .88, y: -45, filter: 'blur(10px)' }}
        transition={reduceMotion ? { duration: .12 } : { type: 'spring', stiffness: 125, damping: 18 }}
        className={'relative flex w-[min(92vw,480px)] flex-col items-center rounded-[30px] border p-4 text-center shadow-2xl backdrop-blur-xl ' +
          (active.animation === 'legendary' ? 'border-amber-200/60 bg-[#17102c]/90 shadow-amber-300/20' :
          cinematic ? 'border-violet-200/50 bg-[#100b27]/85 shadow-violet-500/30' : 'border-white/15 bg-black/70')}>
        <div className="relative z-10 mb-1 text-[10px] font-black uppercase tracking-[.28em] text-violet-200">{active.animation === 'legendary' ? 'A legendary arrival' : cinematic ? 'A cinematic gift arrival' : 'A gift for the creator'}</div>
        <GiftAnimationStage giftId={active.giftId} giftImage={active.giftImage} giftName={active.giftName}
          animation={active.animation} rarity={active.rarity} reducedMotion={!!reduceMotion} size="live" />
        {active.quantity > 1 && <div className="relative z-10 mb-1 rounded-full border border-amber-200/30 bg-amber-300/10 px-3 py-1 text-[10px] font-black uppercase tracking-[.2em] text-amber-100">Gift combo ×{active.quantity}</div>}
        <div className="relative z-10 mt-1 text-xl font-black text-white">{active.giftName}</div>
        <div className="relative z-10 mt-2 text-sm text-violet-100"><strong>{active.senderName}</strong> sent a gift to <strong>{active.creatorName}</strong></div>
        <div className="relative z-10 mt-2 text-xs font-bold text-amber-200">{active.totalNex.toLocaleString()} NEX</div>
      </motion.div>
    </AnimatePresence>
  </div>;
}
