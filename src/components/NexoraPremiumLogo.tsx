import React from 'react';

type Props = { className?: string };

/** A geometric N: white for clarity, with one violet connection cut across its diagonal. */
export default function NexoraPremiumLogo({ className = '' }: Props) {
  return (
    <svg className={className} viewBox="0 0 240 240" role="img" aria-label="Nexora" xmlns="http://www.w3.org/2000/svg">
      <path d="M48 196V44h42l101 116V44h42v152h-41L90 78v118H48Z" fill="#fff" />
      <path d="m117 110 17 20" fill="none" stroke="#8B5CF6" strokeWidth="9" strokeLinecap="round" />
    </svg>
  );
}
