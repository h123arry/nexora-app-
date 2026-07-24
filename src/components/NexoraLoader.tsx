import React from 'react';
import { motion } from 'motion/react';

interface NexoraLoaderProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  center?: boolean;
}

export default function NexoraLoader({ size = 'md', className = '', center = false }: NexoraLoaderProps) {
  const sizeMap = {
    sm: { container: 'w-8 h-8', node: 'w-1.5 h-1.5', radius: 10, stroke: 1.5, offset: -3 },
    md: { container: 'w-12 h-12', node: 'w-2 h-2', radius: 16, stroke: 2, offset: -4 },
    lg: { container: 'w-16 h-16', node: 'w-2.5 h-2.5', radius: 24, stroke: 2.5, offset: -5 },
    xl: { container: 'w-24 h-24', node: 'w-3.5 h-3.5', radius: 36, stroke: 3, offset: -7 },
  };

  const { container, node, radius, stroke, offset } = sizeMap[size];

  // Equilateral triangle points from center
  const points = [
    { x: 0, y: -radius }, // Top
    { x: radius * 0.866, y: radius * 0.5 }, // Bottom Right
    { x: -radius * 0.866, y: radius * 0.5 } // Bottom Left
  ];

  const content = (
    <div className={`relative flex items-center justify-center ${container} ${className}`}>
      <motion.div 
        className="relative flex items-center justify-center w-full h-full"
        animate={{ rotate: 360 }}
        transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
      >
        <svg className="absolute inset-0 w-full h-full overflow-visible" style={{ left: '50%', top: '50%' }}>
          {/* Static faint background lines */}
          <path
            d={`M ${points[0].x} ${points[0].y} L ${points[1].x} ${points[1].y} L ${points[2].x} ${points[2].y} Z`}
            fill="none"
            stroke="rgba(139, 92, 246, 0.15)"
            strokeWidth={stroke}
          />
          
          {/* Animated flowing light lines */}
          <motion.path
            d={`M ${points[0].x} ${points[0].y} L ${points[1].x} ${points[1].y} L ${points[2].x} ${points[2].y} Z`}
            fill="none"
            stroke="rgba(192, 132, 252, 0.9)" // pinkish/violet light
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeLinejoin="round"
            initial={{ pathLength: 0, pathOffset: 0, opacity: 0 }}
            animate={{
              pathLength: [0, 0.5, 0],
              pathOffset: [0, 1, 2],
              opacity: [0, 1, 0]
            }}
            transition={{
              duration: 2.5,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
        </svg>

        {/* Nodes */}
        {points.map((p, i) => (
          <motion.div
            key={i}
            className={`absolute rounded-full bg-violet-400 ${node}`}
            style={{ 
              x: p.x, 
              y: p.y,
              marginLeft: offset,
              marginTop: offset,
            }}
            animate={{
              scale: [1, 1.4, 1],
              opacity: [0.6, 1, 0.6],
              boxShadow: [
                '0 0 6px rgba(139,92,246,0.3)',
                '0 0 14px rgba(167,139,250,0.9)',
                '0 0 6px rgba(139,92,246,0.3)'
              ]
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut",
              delay: i * (2 / 3) // Stagger the pulses
            }}
          />
        ))}
      </motion.div>
    </div>
  );

  if (center) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center min-h-[100px] flex-1">
        {content}
      </div>
    );
  }

  return content;
}
