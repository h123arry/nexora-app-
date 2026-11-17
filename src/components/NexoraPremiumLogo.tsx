import React from 'react';

type Props = { className?: string };

/**
 * Render the repository's approved NEXORA mark as a luminance mask.
 * The source PNG is RGB with a black canvas, so using its luminance as the
 * mask removes that canvas without redrawing or changing the original mark.
 */
export default function NexoraPremiumLogo({ className = '' }: Props) {
  return (
    <span
      role="img"
      aria-label="NEXORA"
      className={`nx-brand-mark ${className}`}
    />
  );
}
