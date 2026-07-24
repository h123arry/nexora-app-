import React from 'react';
import { motion } from 'motion/react';

export interface VohIconProps extends React.SVGProps<SVGSVGElement> {
  size?: number | string;
  className?: string;
  animated?: boolean;
  glow?: boolean;
  variant?: 'brand' | 'violet' | 'pink' | 'cyan' | 'white' | 'current' | 'monochrome';
}

/**
 * Official VOH AI Brand Icon for Nexora.
 * 
 * Visual Concept:
 * Four smooth, rounded signal petals arranged in a circular orbit with a central glowing orb.
 * Symbolizes intelligence radiating outward and living network connections flowing inward.
 */
export const VohIcon: React.FC<VohIconProps> = ({
  size = 20,
  className = '',
  animated = false,
  glow = false,
  variant = 'brand',
  style,
  ...props
}) => {
  // Generate unique IDs for gradients to prevent clashes when multiple icons are rendered
  const idSuffix = React.useId().replace(/:/g, '_');
  const gradBrandId = `voh_grad_brand_${idSuffix}`;
  const gradCoreId = `voh_grad_core_${idSuffix}`;
  const glowFilterId = `voh_glow_${idSuffix}`;

  // Variant color mappings
  const getGradientStops = () => {
    switch (variant) {
      case 'cyan':
        return {
          start: '#22d3ee', // cyan-400
          middle: '#3b82f6', // blue-500
          end: '#06b6d4',   // cyan-500
          core: '#67e8f9'
        };
      case 'pink':
        return {
          start: '#f43f5e', // rose-500
          middle: '#ec4899', // pink-500
          end: '#a855f7',   // purple-500
          core: '#f472b6'
        };
      case 'violet':
        return {
          start: '#a855f7', // purple-500
          middle: '#8b5cf6', // violet-500
          end: '#6366f1',   // indigo-500
          core: '#c084fc'
        };
      case 'white':
        return {
          start: '#ffffff',
          middle: '#e2e8f0',
          end: '#cbd5e1',
          core: '#ffffff'
        };
      case 'monochrome':
      case 'current':
        return null; // Uses stroke="currentColor" and fill="currentColor"
      case 'brand':
      default:
        return {
          start: '#c084fc', // purple-400
          middle: '#ec4899', // pink-500
          end: '#38bdf8',   // sky-400
          core: '#f472b6'
        };
    }
  };

  const stops = getGradientStops();
  const isCurrentColor = variant === 'current' || variant === 'monochrome';

  // Numerical dimension or string
  const widthVal = typeof size === 'number' ? `${size}px` : size;
  const heightVal = typeof size === 'number' ? `${size}px` : size;

  // Signal petal shape definition at 12 o'clock, relative to (12,12) center
  // Outer radius ~10, Inner radius ~4.0. Smooth rounded leaf/petal curve.
  const topPetal = "M 12 2 C 14.1 2 15.6 3.6 15.2 6 C 14.8 8.1 13.4 9.5 12 9.5 C 10.6 9.5 9.2 8.1 8.8 6 C 8.4 3.6 9.9 2 12 2 Z";

  return (
    <div
      className={`relative inline-flex items-center justify-center shrink-0 select-none ${className}`}
      style={{ width: widthVal, height: heightVal, ...style }}
    >
      {/* Optional Soft Ambient Aura Glow for Hero/Active states */}
      {glow && (
        <div 
          className="absolute inset-0 rounded-full blur-md opacity-50 transition-opacity duration-300 pointer-events-none"
          style={{
            background: stops
              ? `radial-gradient(circle, ${stops.start} 0%, ${stops.middle} 50%, transparent 80%)`
              : 'radial-gradient(circle, rgba(139,92,246,0.6) 0%, rgba(236,72,153,0.3) 60%, transparent 100%)'
          }}
        />
      )}

      <svg
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full relative z-10 overflow-visible"
        {...props}
      >
        <defs>
          {stops && (
            <>
              {/* Linear gradient for signal petals */}
              <linearGradient id={gradBrandId} x1="2" y1="2" x2="22" y2="22" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor={stops.start} />
                <stop offset="50%" stopColor={stops.middle} />
                <stop offset="100%" stopColor={stops.end} />
              </linearGradient>

              {/* Radial gradient for central intelligent core */}
              <radialGradient id={gradCoreId} cx="12" cy="12" r="4" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#ffffff" />
                <stop offset="60%" stopColor={stops.core} />
                <stop offset="100%" stopColor={stops.middle} stopOpacity="0.8" />
              </radialGradient>
            </>
          )}

          {glow && (
            <filter id={glowFilterId} x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="0.8" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          )}
        </defs>

        {/* 
          Orbiting Group containing the 4 signal petals.
          Rotated 45 degrees so they form an orbital X/cross balance.
        */}
        <motion.g
          animate={animated ? { rotate: [0, 360] } : { rotate: 0 }}
          transition={
            animated
              ? { duration: 20, ease: 'linear', repeat: Infinity }
              : { duration: 0 }
          }
          style={{ transformOrigin: '12px 12px' }}
        >
          {/* Petal 1: 0° (Top) */}
          <path
            d={topPetal}
            fill={stops ? `url(#${gradBrandId})` : 'currentColor'}
            fillOpacity={isCurrentColor ? 0.85 : 0.9}
          />

          {/* Petal 2: 90° (Right) */}
          <path
            d={topPetal}
            transform="rotate(90 12 12)"
            fill={stops ? `url(#${gradBrandId})` : 'currentColor'}
            fillOpacity={isCurrentColor ? 0.85 : 0.9}
          />

          {/* Petal 3: 180° (Bottom) */}
          <path
            d={topPetal}
            transform="rotate(180 12 12)"
            fill={stops ? `url(#${gradBrandId})` : 'currentColor'}
            fillOpacity={isCurrentColor ? 0.85 : 0.9}
          />

          {/* Petal 4: 270° (Left) */}
          <path
            d={topPetal}
            transform="rotate(270 12 12)"
            fill={stops ? `url(#${gradBrandId})` : 'currentColor'}
            fillOpacity={isCurrentColor ? 0.85 : 0.9}
          />

          {/* Connecting Orbital Ring Path (Living Network Ring) */}
          <circle
            cx="12"
            cy="12"
            r="8.5"
            stroke={stops ? `url(#${gradBrandId})` : 'currentColor'}
            strokeWidth="0.8"
            strokeDasharray="2 3"
            strokeOpacity={isCurrentColor ? 0.4 : 0.55}
          />
        </motion.g>

        {/* Central Intelligent Core (Radiating Pulse) */}
        <motion.circle
          cx="12"
          cy="12"
          r="2.2"
          fill={stops ? `url(#${gradCoreId})` : 'currentColor'}
          animate={
            animated
              ? { scale: [0.9, 1.25, 0.9], opacity: [0.85, 1, 0.85] }
              : { scale: 1, opacity: 1 }
          }
          transition={
            animated
              ? { duration: 3, ease: 'easeInOut', repeat: Infinity }
              : { duration: 0 }
          }
          style={{ transformOrigin: '12px 12px' }}
        />

        {/* Central Core Inner Glow Point */}
        <circle
          cx="12"
          cy="12"
          r="0.9"
          fill="#ffffff"
          fillOpacity={0.9}
        />
      </svg>
    </div>
  );
};

export default VohIcon;
