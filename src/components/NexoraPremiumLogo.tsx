import React from 'react';

type Props = { className?: string };

/**
 * Reuse the founder-approved NEXORA mark everywhere.
 * The source PNG intentionally retains its original black matte; screen blending
 * makes that matte disappear against the current surface without editing the artwork.
 */
export default function NexoraPremiumLogo({ className = '' }: Props) {
  return (
    <img
      src="/nexora-mark.png"
      alt="NEXORA"
      aria-label="NEXORA"
      className={className}
      style={{ mixBlendMode: 'screen', backgroundColor: 'transparent' }}
      loading="eager"
      decoding="async"
      draggable={false}
    />
  );
}
