import React from 'react';

interface PurpleVerifiedBadgeProps {
  className?: string;
  type?: 'founder' | 'organization' | 'figure' | 'creator' | 'leader' | 'default';
}

/** Compact NEXORA violet identity marker. It is intentionally non-interactive. */
export default function PurpleVerifiedBadge({
  className = "h-4 w-4 inline-flex shrink-0",
  type = 'default',
}: PurpleVerifiedBadgeProps) {
  const title = type === 'leader'
    ? 'NEXORA Early Community Member'
    : type === 'organization'
      ? 'Verified Organization on NEXORA'
      : type === 'figure'
        ? 'Verified Public Figure on NEXORA'
        : type === 'creator'
          ? 'Verified Creator on NEXORA'
          : type === 'founder'
            ? 'NEXORA Founder'
            : 'Verified on NEXORA';

  return (
    <span
      className={`${className} inline-flex items-center justify-center select-none rounded-full`}
      role="img"
      aria-label={title}
      title={title}
      data-nexora-verification-badge="true"
    >
      <svg viewBox="0 0 20 20" className="h-full w-full" fill="none" aria-hidden="true">
        <circle cx="10" cy="10" r="9.25" fill="#7138FF" />
        <path d="m5.7 10.1 2.75 2.75 5.9-6" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  );
}
