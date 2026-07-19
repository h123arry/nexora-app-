import React from 'react';
import NexoraPremiumLogo from './NexoraPremiumLogo';

interface BrandingProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showSubtitle?: boolean;
  className?: string;
  onClick?: () => void;
}

export default function NexoraBranding({ size = 'md', showSubtitle = true, className = '', onClick }: BrandingProps) {
  // Define sizing logic
  const sizes = {
    sm: { n: 'w-10 h-10', text: 'text-base', sub: 'text-[9px]', gap: 'gap-0.5', y: '' },
    md: { n: 'w-14 h-14', text: 'text-lg', sub: 'text-xs', gap: 'gap-1', y: '' },
    lg: { n: 'w-20 h-20', text: 'text-2xl', sub: 'text-sm', gap: 'gap-2', y: '' },
    xl: { n: 'w-28 h-28', text: 'text-4xl', sub: 'text-base', gap: 'gap-3', y: '' },
  };

  const s = sizes[size];

  return (
    <div className={`flex flex-col ${className}`} onClick={onClick} style={{ cursor: onClick ? 'pointer' : 'default' }}>
      <div className={`flex items-baseline ${s.gap}`}>
        {/* The large stylized N */}
        <NexoraPremiumLogo className={`${s.n} shrink-0`} glow={true} />
        {/* EXORA text */}
        <span className={`${s.text} font-medium tracking-widest text-zinc-300 font-sans uppercase leading-none`}>
          EXORA
        </span>
      </div>
      {/* Subtitle */}
      {showSubtitle && (
        <div className={`${s.sub} font-sans text-zinc-500 font-medium tracking-wide text-left mt-1 ml-1.5`}>
          The World's Living Social Network
        </div>
      )}
    </div>
  );
}
