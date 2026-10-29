import React from 'react';
import { motion } from 'motion/react';
import NexoraPremiumLogo from '../NexoraPremiumLogo';
import PurpleVerifiedBadge from '../VohVerifiedBadge';

interface NexoraPostRollCardProps {
  username: string;
  isVerified?: boolean;
  avatar?: string;
}

export default function NexoraPostRollCard({ username, isVerified = false, avatar }: NexoraPostRollCardProps) {
  const formattedUsername = username.startsWith('@') ? username : `@${username}`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 14, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -8, scale: 1.02 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
      className="pointer-events-none absolute inset-x-0 bottom-[calc(env(safe-area-inset-bottom,0px)+5.5rem)] z-[25] flex justify-center px-4"
      aria-live="polite"
    >
      <div className="flex min-w-[190px] items-center gap-3 rounded-2xl border border-white/15 bg-[#09071d]/88 px-4 py-3 shadow-[0_18px_48px_rgba(0,0,0,0.5)] backdrop-blur-xl">
        <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-full border border-violet-300/30 bg-black/70 p-1 shadow-[0_0_24px_rgba(113,56,255,0.4)]">
          {avatar ? <img src={avatar} alt="" className="h-full w-full rounded-full object-cover" /> : <NexoraPremiumLogo className="h-full w-full" />}
        </div>
        <div className="min-w-0">
          <div className="mb-1 flex items-center gap-1.5">
            <NexoraPremiumLogo className="h-4 w-4" />
            <span className="font-mono text-[9px] font-bold uppercase tracking-[0.18em] text-violet-200">Nexora</span>
          </div>
          <div className="flex items-center gap-1.5 text-sm font-bold text-white">
            <span className="truncate">{formattedUsername}</span>
            {isVerified && <PurpleVerifiedBadge className="h-4 w-4 shrink-0" />}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
