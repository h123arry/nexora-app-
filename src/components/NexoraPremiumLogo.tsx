import React from 'react';

type Props = { className?: string };

/**
 * Reuse the founder-approved NEXORA mark everywhere.
 * The source PNG retains its original black matte; screen blending makes that matte
 * visually disappear against the current midnight/violet surface without editing the artwork.
 */
export default function NexoraPremiumLogo({ className = '' }: Props) {
  return (
    <img
      src="/nexora-mark.png"
      alt="NEXORA"
      aria-label="NEXORA"
      className={className}
      style={{ mixBlendMode: 'screen', WebkitMixBlendMode: 'screen', backgroundColor: 'transparent', isolation: 'auto' }}
      loading="eager"
      decoding="async"
      draggable={false}
    />
  );
}
