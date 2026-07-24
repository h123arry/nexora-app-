import React from 'react';

interface PurpleVerifiedBadgeProps {
  className?: string;
  type?: 'founder' | 'organization' | 'figure' | 'creator' | 'leader' | 'default';
}

export default function PurpleVerifiedBadge({ 
  className = "w-4 h-4 ml-1 inline-block", 
  type = 'default' 
}: PurpleVerifiedBadgeProps) {
  const getBadgeTooltip = () => {
    switch (type) {
      case 'founder':
        return "🟣✓ Creator/Founder Verified";
      case 'organization':
        return "🟣✓ Verified Organization";
      case 'figure':
        return "🟣✓ Verified Public Figure";
      case 'creator':
        return "🟣✓ Verified Creator";
      case 'leader':
        return "🟣✓ Verified Community Leader";
      case 'default':
      default:
        return "🟣✓ Verified on NEXORA";
    }
  };

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    window.dispatchEvent(new CustomEvent('show-voh-verification-modal', { 
      detail: { type, tooltip: getBadgeTooltip() } 
    }));
  };

  return (
    <span 
      className={`${className} inline-flex items-center justify-center select-none shrink-0 group relative cursor-pointer hover:scale-110 active:scale-95 transition-transform`} 
      title={`${getBadgeTooltip()} (Click to verify details)`}
      id="voh-verified-badge-element"
      onClick={handleClick}
    >
      <svg 
        viewBox="0 0 24 24" 
        className="w-full h-full"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ filter: 'drop-shadow(0px 1px 1.5px rgba(139, 92, 246, 0.4))' }}
      >
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z" fill="#8B5CF6"/>
        <path d="M10.5 16.2l-4-4 1.4-1.4 2.6 2.6 5.6-5.6 1.4 1.4-7 7z" fill="white"/>
      </svg>
    </span>
  );
}
