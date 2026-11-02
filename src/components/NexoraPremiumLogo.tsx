import React from 'react';

type Props = { className?: string };

/** Reuse the approved NEXORA mark from public/logo.svg everywhere in the app. */
export default function NexoraPremiumLogo({ className = '' }: Props) {
  return (
    <img
      src="/logo.svg"
      alt="NEXORA"
      aria-label="NEXORA"
      className={className}
      loading="eager"
      decoding="async"
      draggable={false}
    />
  );
}
