import React from 'react';

type Props = { className?: string };

/** Nexora's connected ribbon N: a flowing violet-to-cyan path with a crisp white inner edge. */
export default function NexoraPremiumLogo({ className = '' }: Props) {
  return (
    <svg className={className} viewBox="0 0 240 240" role="img" aria-label="Nexora" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="nexora-ribbon" x1="48" y1="192" x2="194" y2="54" gradientUnits="userSpaceOnUse">
          <stop stopColor="#8A20FF" />
          <stop offset=".48" stopColor="#173BFF" />
          <stop offset=".78" stopColor="#00C8F4" />
          <stop offset="1" stopColor="#17D7E5" />
        </linearGradient>
      </defs>
      <path d="M48 194V86C48 48 83 30 116 52c12 8 22 19 33 33l43 56V50" fill="none" stroke="url(#nexora-ribbon)" strokeWidth="48" strokeLinecap="butt" strokeLinejoin="round" />
      <path d="M48 194c25-16 51-35 57-66l2-20c2-18 12-29 24-28 7 0 14 5 22 15l42 52c12 14 27 18 42 5" fill="none" stroke="#fff" strokeWidth="14" strokeLinecap="butt" strokeLinejoin="round" />
      <path d="M194 50v95c0 19-8 36-21 47-11 9-24 12-38 10-17-2-32-14-46-33L48 108" fill="none" stroke="url(#nexora-ribbon)" strokeWidth="48" strokeLinecap="butt" strokeLinejoin="round" />
      <path d="M48 194c24-17 51-36 57-66l2-20" fill="none" stroke="#fff" strokeWidth="13" strokeLinecap="butt" />
    </svg>
  );
}
