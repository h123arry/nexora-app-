import React from 'react';

type Props = { className?: string };

/** Reuse the approved NEXORA mark from public/nexora-mark.png everywhere in the app. */
export default function NexoraPremiumLogo({ className = '' }: Props) {
  return (
    <img
      src="/nexora-mark.png"
      alt="NEXORA"
      aria-label="NEXORA"
      className={className}
      loading="eager"
      decoding="async"
      draggable={false}
    />
  );
}
