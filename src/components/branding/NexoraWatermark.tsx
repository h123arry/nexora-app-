import React from 'react';
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
  opacity = 0.85,
  className = ''
}: NexoraWatermarkProps) {
  const sizeClasses = {
    sm: 'text-[10px] py-1 px-2.5 gap-1.5',
    md: 'text-xs py-1.5 px-3.5 gap-2',
    lg: 'text-sm py-2 px-4 gap-2.5',
  };

  const logoSizes = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5',
  };

  const formattedUsername = username.startsWith('@') ? username : `@${username}`;

  return (
    <div 
      className={`inline-flex items-center rounded-full bg-black/60 backdrop-blur-md border border-white/10 text-white font-sans shadow-lg select-none ${sizeClasses[size]} ${className}`}
      style={{ opacity }}
      id="nexora-creator-watermark"
    >
      <div className={`rounded-full overflow-hidden bg-gradient-to-tr from-violet-600 to-indigo-500 flex items-center justify-center shrink-0 ${logoSizes[size]} shadow-sm`}>
        <span className="font-black text-[9px] text-white">N</span>
      </div>
      <span className="font-semibold text-zinc-200 tracking-tight">{formattedUsername}</span>
      {isVerified && (
        <span className="inline-flex items-center">
          <PurpleVerifiedBadge className={size === 'sm' ? 'w-3 h-3 ml-0.5' : size === 'lg' ? 'w-5 h-5 ml-1' : 'w-4 h-4 ml-0.5'} />
        </span>
      )}
      <span className="text-[9px] text-violet-300 font-bold uppercase tracking-wider pl-1 border-l border-white/15 ml-0.5">NEXORA</span>
    </div>
  );
}
