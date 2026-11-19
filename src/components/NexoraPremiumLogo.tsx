import React from 'react';

type Props = { className?: string };

/**
 * Reuse the founder-approved NEXORA mark everywhere.
 * The build pipeline serves the original transparent artwork for this UI asset;
 * generated platform icons with solid backgrounds are kept separate.
 */
export default function NexoraPremiumLogo({ className = '' }: Props) {
  return (
    <img
      src="/nexora-mark.png"
      alt="NEXORA"
      aria-label="NEXORA"
      className={className}
      style={{ backgroundColor: 'transparent' }}
      loading="eager"
      decoding="async"
      draggable={false}
    />
  );
}
