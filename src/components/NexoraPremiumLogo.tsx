import React from 'react';

interface LogoProps {
  className?: string;
  glow?: boolean;
}

export default function NexoraPremiumLogo({ className = "w-10 h-10", glow = true }: LogoProps) {
  return (
    <div className={`relative flex items-center justify-center ${className}`}>
      <svg 
        viewBox="0 0 240 240" 
        fill="none" 
        xmlns="http://www.w3.org/2000/svg" 
        className="w-full h-full select-none"
        aria-hidden="true"
      >
        <defs>
          {/* The signature premium gradient flow: Fuchsia -> Violet -> Royal Blue -> Vibrant Cyan */}
          <linearGradient id="nexoraGrad" x1="12%" y1="12%" x2="88%" y2="88%">
            <stop offset="0%" stopColor="#E24FF3" />
            <stop offset="30%" stopColor="#8B5CF6" />
            <stop offset="65%" stopColor="#2563EB" />
            <stop offset="100%" stopColor="#06B6D4" />
          </linearGradient>

          {/* Deep glass shade highlight that gives it the glossy, overlapping volumetric cylinder look */}
          <linearGradient id="glassOverlay" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.45" />
            <stop offset="45%" stopColor="#FFFFFF" stopOpacity="0.05" />
            <stop offset="70%" stopColor="#000000" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#000000" stopOpacity="0.85" />
          </linearGradient>

          {/* Focused vibrant Cyan light sweep for the right-hand curved tail */}
          <linearGradient id="cyanAccent" x1="0%" y1="100%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#06B6D4" />
            <stop offset="100%" stopColor="#3B82F6" />
          </linearGradient>

          {/* Focused Fuchsia spotlight for the left curve to make the colors glow selectively */}
          <linearGradient id="fuchsiaAccent" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#F43F5E" />
            <stop offset="50%" stopColor="#EC4899" />
            <stop offset="100%" stopColor="#8B5CF6" />
          </linearGradient>

          {/* Ambient drop shadow matching the dark background vibe */}
          <filter id="premiumAmbientGlow" x="-15%" y="-15%" width="130%" height="130%">
            <feGaussianBlur stdDeviation="15" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* Outer neon radiation/glow effect */}
        {glow && (
          <path
            d="M 62 185 C 44 185, 42 110, 48 85 C 55 58, 88 56, 108 85 L 140 135 C 150 152, 178 175, 194 140 C 198 120, 194 85, 190 75"
            fill="none"
            stroke="url(#nexoraGrad)"
            strokeWidth="38"
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity="0.45"
            filter="blur(16px)"
          />
        )}

        {/* Master Sculpted volumetric 3D Ribbon "N" */}
        <path
          d="M 62 185 C 44 185, 42 110, 48 85 C 55 58, 88 56, 108 85 L 140 135 C 150 152, 178 175, 194 140 C 198 120, 194 85, 190 75"
          fill="none"
          stroke="url(#nexoraGrad)"
          strokeWidth="30"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Highlights layer to reflect light & provide matching glass curvature */}
        <path
          d="M 62 185 C 44 185, 42 110, 48 85 C 55 58, 88 56, 108 85 L 140 135 C 150 152, 178 175, 194 140 C 198 120, 194 85, 190 75"
          fill="none"
          stroke="url(#glassOverlay)"
          strokeWidth="11"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity="0.8"
        />

        {/* Specular glint on left curve */}
        <path
          d="M 50 120 C 44 100, 48 82, 60 72 C 72 62, 85 64, 98 80"
          fill="none"
          stroke="url(#fuchsiaAccent)"
          strokeWidth="20"
          strokeLinecap="round"
          opacity="0.85"
          style={{ mixBlendMode: 'plus-lighter' }}
        />

        {/* Specular glint on right curve */}
        <path
          d="M 134 125 C 144 145, 165 164, 182 155 C 194 145, 196 115, 190 75"
          fill="none"
          stroke="url(#cyanAccent)"
          strokeWidth="18"
          strokeLinecap="round"
          opacity="0.9"
          style={{ mixBlendMode: 'plus-lighter' }}
        />

        {/* Soft center shine core */}
        <path
          d="M 108 85 L 140 135"
          fill="none"
          stroke="white"
          strokeWidth="4"
          strokeLinecap="round"
          opacity="0.35"
        />
      </svg>
    </div>
  );
}
