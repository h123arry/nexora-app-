import React from 'react';
import NexoraPremiumLogo from './NexoraPremiumLogo';

interface NexoraLoaderProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  center?: boolean;
  label?: string;
}

export default function NexoraLoader({ size = 'md', className = '', center = false, label }: NexoraLoaderProps) {
  const sizeMap = {
    xs: 'w-5 h-5',
    sm: 'w-6 h-6',
    md: 'w-8 h-8',
    lg: 'w-10 h-10',
    xl: 'w-14 h-14',
  };

  const content = (
    <div
      role="status"
      aria-live="polite"
      aria-label={label || 'Loading NEXORA'}
      className={`inline-flex flex-col items-center justify-center gap-2 ${className}`}
    >
      {/* The N stays still; the surrounding signal ring makes this a clear loading state. */}
      <span className={`nx-loader-orbit relative inline-flex items-center justify-center rounded-full ${sizeMap[size] || sizeMap.md}`} aria-hidden="true">
        <NexoraPremiumLogo className="nx-loader-mark relative z-10 h-[58%] w-[58%]" />
      </span>
      {label && (
        <span className="text-[10px] font-mono font-medium text-violet-300/80 tracking-wider uppercase">
          {label}
        </span>
      )}
    </div>
  );

  if (center) {
    return (
      <div className="w-full flex flex-col items-center justify-center py-6 flex-1 select-none">
        {content}
      </div>
    );
  }

  return content;
}
