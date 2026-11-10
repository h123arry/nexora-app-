import React, { useId } from 'react';
import { motion, useReducedMotion } from 'motion/react';

interface NexoraLoaderProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  center?: boolean;
  label?: string;
}

export default function NexoraLoader({ size = 'md', className = '', center = false, label }: NexoraLoaderProps) {
  const reduceMotion = useReducedMotion();
  const gradientId = `nexora-loader-${useId().replace(/:/g, '')}`;
  const sizeMap = {
    xs: { box: 'w-4 h-4', stroke: 2, ring: 'w-4 h-4' },
    sm: { box: 'w-5 h-5', stroke: 2.2, ring: 'w-5 h-5' },
    md: { box: 'w-7 h-7', stroke: 2.5, ring: 'w-7 h-7' },
    lg: { box: 'w-9 h-9', stroke: 3, ring: 'w-9 h-9' },
    xl: { box: 'w-12 h-12', stroke: 3.5, ring: 'w-12 h-12' },
  };

  const { box, stroke } = sizeMap[size] || sizeMap.md;

  const content = (
    <div role="status" aria-live="polite" aria-label={label || "Loading NEXORA"} className={`inline-flex flex-col items-center justify-center gap-2 ${className}`}>
      <div className={`relative flex items-center justify-center ${box}`}>
        {/* Outer glowing track ring */}
        <div className="absolute inset-0 rounded-full border border-white/10 shadow-[0_0_12px_rgba(139,92,246,0.15)]" />
        
        {/* Rotating gradient arc */}
        <motion.div
          className="absolute inset-0 rounded-full"
          animate={reduceMotion ? { rotate: 0 } : { rotate: 360 }}
          transition={reduceMotion ? { duration: 0 } : { duration: 0.85, repeat: Infinity, ease: "linear" }}
        >
          <svg className="w-full h-full overflow-visible" viewBox="0 0 32 32">
            <defs>
              <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#8b5cf6" stopOpacity="1" />
                <stop offset="50%" stopColor="#7138FF" stopOpacity="0.8" />
                <stop offset="100%" stopColor="#a855f7" stopOpacity="0" />
              </linearGradient>
            </defs>
            <circle
              cx="16"
              cy="16"
              r="13"
              fill="none"
              stroke={`url(#${gradientId})`}
              strokeWidth={stroke}
              strokeLinecap="round"
              strokeDasharray="50 25"
            />
          </svg>
        </motion.div>

        {/* Keep the approved NEXORA mark at the center of the loading indicator. */}
        <img
          src="/logo.svg"
          alt=""
          aria-hidden="true"
          className="relative z-10 h-3.5 w-3.5 rounded-[3px] object-contain"
          loading="eager"
          decoding="async"
          draggable={false}
        />
      </div>

      {label && (
        <span className="text-[10px] font-mono font-medium text-violet-300/80 tracking-wider uppercase">
          {label}
        </span>
      )}
    </div>
  );

  if (center) {
    return (
      <div className="w-full flex flex-col items-center justify-center py-6 flex-1 select-none">
        {content}
      </div>
    );
  }

  return content;
}

