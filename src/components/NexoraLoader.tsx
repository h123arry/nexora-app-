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
    xs: 'w-4 h-4',
    sm: 'w-5 h-5',
    md: 'w-7 h-7',
    lg: 'w-9 h-9',
    xl: 'w-12 h-12',
  };

  const content = (
    <div
      role="status"
      aria-live="polite"
      aria-label={label || 'Loading NEXORA'}
      className={`inline-flex flex-col items-center justify-center gap-2 ${className}`}
    >
      <NexoraPremiumLogo className={`nx-loader-mark ${sizeMap[size] || sizeMap.md}`} />
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
