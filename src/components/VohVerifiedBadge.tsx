import React from 'react';

interface PurpleVerifiedBadgeProps {
  className?: string;
  type?: 'founder' | 'organization' | 'figure' | 'creator' | 'leader' | 'default';
}

export default function PurpleVerifiedBadge({
  className = 'w-4 h-4 ml-1 inline-block',
  type = 'default',
}: PurpleVerifiedBadgeProps) {
  const getBadgeTooltip = () => {
    switch (type) {
      case 'founder':
        return '🟣✓ Creator/Founder Verified';
      case 'organization':
        return '🟣✓ Verified Organization';
      case 'figure':
        return '🟣✓ Verified Public Figure';
      case 'creator':
        return '🟣✓ Verified Creator';
      case 'leader':
        return '🟣✓ Verified Community Leader';
      default:
        return '🟣✓ Verified on NEXORA';
    }
  };

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();

    window.dispatchEvent(
      new CustomEvent('show-voh-verification-modal', {
        detail: {
          type,
          tooltip: getBadgeTooltip(),
        },
      })
    );
  };

  return (
    <span
      className={`${className} inline-flex items-center justify-center shrink-0 cursor-pointer select-none transition-all duration-300 hover:scale-110 active:scale-95`}
      title={`${getBadgeTooltip()} (Click to verify details)`}
      id="voh-verified-badge-element"
      onClick={handleClick}
    >
      <svg
        viewBox="0 0 24 24"
        className="w-full h-full"
        xmlns="http://www.w3.org/2000/svg"
        style={{
          filter:
            'drop-shadow(0 0 6px rgba(139,92,246,.30)) drop-shadow(0 2px 8px rgba(0,0,0,.25))',
        }}
      >
        <defs>
          <radialGradient id="nexoraBadgeGradient" cx="35%" cy="30%">
            <stop offset="0%" stopColor="#C4B5FD" />
            <stop offset="45%" stopColor="#A78BFA" />
            <stop offset="78%" stopColor="#8B5CF6" />
            <stop offset="100%" stopColor="#6D28D9" />
          </radialGradient>

          <linearGradient id="nexoraBadgeGloss" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.65" />
            <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Outer Glow Ring */}
        <circle
          cx="12"
          cy="12"
          r="10.3"
          fill="rgba(139,92,246,.14)"
        />

        {/* Main Circle */}
        <circle
          cx="12"
          cy="12"
          r="10"
          fill="url(#nexoraBadgeGradient)"
        />

        {/* Inner Ring */}
        <circle
          cx="12"
          cy="12"
          r="9.15"
          fill="none"
          stroke="rgba(255,255,255,.18)"
          strokeWidth="0.8"
        />

        {/* Gloss */}
        <ellipse
          cx="9"
          cy="7"
          rx="5"
          ry="2.1"
          fill="url(#nexoraBadgeGloss)"
          opacity="0.5"
        />

        {/* Check */}
        <path
          d="M9.6 12.4L11.4 14.2L15.9 9.7"
          fill="none"
          stroke="#FFFFFF"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}
