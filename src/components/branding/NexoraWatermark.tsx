import React from 'react';
import NexoraPremiumLogo from '../NexoraPremiumLogo';
import PurpleVerifiedBadge from '../VohVerifiedBadge';

interface NexoraWatermarkProps {
  username?: string;
  isVerified?: boolean;
  size?: 'sm' | 'md' | 'lg';
  opacity?: number;
  className?: string;
}

export default function NexoraWatermark({
  username = 'nexora_user',
  isVerified = false,
  size = 'md',
  opacity = 0.86,
  className = ''
}: NexoraWatermarkProps) {
  const sizeClasses = {
    sm: 'text-[10px] py-1 px-2 gap-1.5',
    md: 'text-xs py-1.5 px-2.5 gap-1.5',
    lg: 'text-sm py-2 px-3 gap-2',
  };
  const logoSizes = { sm: 'w-4 h-4', md: 'w-5 h-5', lg: 'w-6 h-6' };
  const badgeSizes = { sm: 'w-3 h-3', md: 'w-3.5 h-3.5', lg: 'w-4 h-4' };
  const formattedUsername = username.startsWith('@') ? username : `@${username}`;

  return (
    <div
      className={`inline-flex items-center rounded-full bg-black/55 backdrop-blur-md border border-white/10 text-white font-sans shadow-lg select-none ${sizeClasses[size]} ${className}`}
      style={{ opacity }}
      aria-label={`Nexora watermark for ${formattedUsername}${isVerified ? ', verified' : ''}`}
    >
      <NexoraPremiumLogo className={`${logoSizes[size]} shrink-0`} />
      <span className="font-semibold text-zinc-100 tracking-tight">{formattedUsername}</span>
      {isVerified && <PurpleVerifiedBadge className={`${badgeSizes[size]} shrink-0`} />}
    </div>
  );
}
