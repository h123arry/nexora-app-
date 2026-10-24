import React from 'react';
import NexoraPremiumLogo from './NexoraPremiumLogo';

interface BrandingProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showSubtitle?: boolean;
  className?: string;
  onClick?: () => void;
}

export default function NexoraBranding({ size = 'md', showSubtitle = true, className = '', onClick }: BrandingProps) {
  const sizes = {
    sm: { mark: 'h-8 w-8', word: 'text-lg', sub: 'text-[9px]' },
    md: { mark: 'h-10 w-10', word: 'text-[22px]', sub: 'text-[10px]' },
    lg: { mark: 'h-12 w-12', word: 'text-3xl', sub: 'text-[11px]' },
    xl: { mark: 'h-16 w-16', word: 'text-5xl', sub: 'text-xs' }
  };
  const s = sizes[size];

  return (
    <div className={`flex items-center gap-3 select-none ${className}`} onClick={onClick} style={{ cursor: onClick ? 'pointer' : 'default' }}>
      <NexoraPremiumLogo className={`${s.mark} nx-brand-mark shrink-0`} />
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className={`${s.word} font-extrabold tracking-[-0.04em] font-sans leading-none`}>NEXORA</span>
          <span className="rounded-full border border-violet-300/20 bg-violet-400/10 px-1.5 py-0.5 text-[7px] font-bold uppercase tracking-[0.14em] text-violet-200">Social</span>
        </div>
        {showSubtitle && <span className={`${s.sub} mt-1 block truncate font-sans font-medium tracking-wide text-slate-400`}>The World&apos;s Living Social Network</span>}
      </div>
    </div>
  );
}
