import React from 'react';

interface LogoProps {
  className?: string;
  glow?: boolean;
}

export default function NexoraPremiumLogo({
  className = "w-10 h-10",
  glow = true,
}: LogoProps) {
  return (
    <div className={`relative ${className}`}>
      {glow && (
        <div
          className="absolute inset-0 rounded-full blur-xl opacity-50"
          style={{
            background:
              "radial-gradient(circle, rgba(139,92,246,.45) 0%, rgba(59,130,246,.25) 45%, rgba(34,211,238,0) 75%)",
          }}
        />
      )}

      <svg
        viewBox="0 0 256 256"
        xmlns="http://www.w3.org/2000/svg"
        className="relative w-full h-full"
        fill="none"
      >
        <defs>
          <linearGradient
            id="nxGradient"
            x1="32"
            y1="32"
            x2="224"
            y2="224"
            gradientUnits="userSpaceOnUse"
          >
            <stop offset="0%" stopColor="#D946EF" />
            <stop offset="35%" stopColor="#8B5CF6" />
            <stop offset="70%" stopColor="#3B82F6" />
            <stop offset="100%" stopColor="#22D3EE" />
          </linearGradient>

          <linearGradient
            id="nxHighlight"
            x1="0"
            y1="0"
            x2="1"
            y2="1"
          >
            <stop offset="0%" stopColor="white" stopOpacity=".45" />
            <stop offset="100%" stopColor="white" stopOpacity="0" />
          </linearGradient>
        </defs>

        <path
          d="
          M52 214
          L52 58
          Q52 36 74 36
          Q90 36 104 52

          L168 122

          Q182 138 182 156

          L182 52

          Q182 36 198 36

          Q214 36 214 52

          L214 198

          Q214 220 192 220

          Q174 220 160 204

          L96 134

          Q84 120 84 104

          L84 214
          Z
          "
          fill="url(#nxGradient)"
        />

        <path
          d="
          M66 50
          Q84 40 100 56
          L165 126
          "
          stroke="url(#nxHighlight)"
          strokeWidth="10"
          strokeLinecap="round"
          opacity=".7"
        />
      </svg>
    </div>
  );
}
