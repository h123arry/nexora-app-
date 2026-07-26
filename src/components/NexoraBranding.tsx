import React from 'react';

interface BrandingProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showSubtitle?: boolean;
  className?: string;
  onClick?: () => void;
}

export default function NexoraBranding({ size = 'md', showSubtitle = true, className = '', onClick }: BrandingProps) {
  const sizes = {
    sm: { text: 'text-lg', sub: 'text-[10px]' },
    md: { text: 'text-[22px]', sub: 'text-[11px]' },
    lg: { text: 'text-3xl', sub: 'text-xs' },
    xl: { text: 'text-5xl', sub: 'text-sm' },
  };

  const s = sizes[size];

  return (
    <div className={`flex flex-col select-none ${className}`} onClick={onClick} style={{ cursor: onClick ? 'pointer' : 'default' }}>
      <span className={`${s.text} font-extrabold tracking-tight text-white font-sans leading-none`}>
        Nexora
      </span>
      {showSubtitle && (
        <span className={`${s.sub} font-sans text-zinc-400 font-normal tracking-wide text-left mt-0.5`}>
          The World's Living Social Network
        </span>
      )}
    </div>
  );
}
