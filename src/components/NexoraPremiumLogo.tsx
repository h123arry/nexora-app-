import React from 'react';

type Props = { className?: string };

/** Nexora's living-network mark: two connected orbital ribbons around a shared node. */
export default function NexoraPremiumLogo({ className = '' }: Props) {
  return (
    <svg
      className={className}
      viewBox="0 0 240 240"
      role="img"
      aria-label="Nexora"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="nexoraMarkViolet" x1="20" y1="30" x2="220" y2="210" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#A78BFA" />
          <stop offset="0.52" stopColor="#7138FF" />
          <stop offset="1" stopColor="#4D22BD" />
        </linearGradient>
      </defs>
      <ellipse
        cx="120"
        cy="120"
        rx="84"
        ry="45"
        transform="rotate(45 120 120)"
        fill="none"
        stroke="url(#nexoraMarkViolet)"
        strokeWidth="22"
        strokeLinecap="round"
      />
      <ellipse
        cx="120"
        cy="120"
        rx="84"
        ry="45"
        transform="rotate(-45 120 120)"
        fill="none"
        stroke="#FFFFFF"
        strokeWidth="22"
        strokeLinecap="round"
      />
      <circle cx="120" cy="120" r="22" fill="#050505" stroke="#FFFFFF" strokeWidth="8" />
      <circle cx="120" cy="120" r="10" fill="#8B5CF6" />
    </svg>
  );
}
