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
          {/* Official Premium Gradient Flow: Purple -> Pink -> Blue */}
          <linearGradient id="nexoraGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#8B5CF6" />
            <stop offset="50%" stopColor="#D946EF" />
            <stop offset="100%" stopColor="#3B82F6" />
          </linearGradient>

          {/* 3D Glass-like volumetric reflection */}
          <linearGradient id="glassReflection" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.7" />
            <stop offset="20%" stopColor="#FFFFFF" stopOpacity="0.1" />
            <stop offset="80%" stopColor="#000000" stopOpacity="0.1" />
            <stop offset="100%" stopColor="#000000" stopOpacity="0.5" />
          </linearGradient>
        </defs>

        {/* Ambient Neon Glow */}
        {glow && (
          <path
            d="M 50 190 L 50 80 Q 50 50 80 80 L 160 160 Q 190 190 190 160 L 190 50"
            fill="none"
            stroke="url(#nexoraGrad)"
            strokeWidth="44"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="opacity-50 blur-[14px]"
          />
        )}

        {/* Base Gradient Ribbon */}
        <path
          d="M 50 190 L 50 80 Q 50 50 80 80 L 160 160 Q 190 190 190 160 L 190 50"
          fill="none"
          stroke="url(#nexoraGrad)"
          strokeWidth="60"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* 3D Glass Highlight Overlay */}
        <path
          d="M 50 190 L 50 80 Q 50 50 80 80 L 160 160 Q 190 190 190 160 L 190 50"
          fill="none"
          stroke="url(#glassReflection)"
          strokeWidth="60"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Inner Core Tube Reflection (Soft specular glint) */}
        <path
          d="M 50 190 L 50 80 Q 50 50 80 80 L 160 160 Q 190 190 190 160 L 190 50"
          fill="none"
          stroke="#FFFFFF"
          strokeWidth="10"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="opacity-30 mix-blend-overlay"
        />
      </svg>
    </div>
  );
}
