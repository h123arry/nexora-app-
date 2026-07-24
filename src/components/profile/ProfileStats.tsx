import React from 'react';
import { motion } from 'motion/react';

interface Stat {
  label: string;
  value: string | number;
}

interface ProfileStatsProps {
  stats: Stat[];
}

export default function ProfileStats({
  stats,
}: ProfileStatsProps) {
  return (
    <div className="py-2 mb-1 select-none">
      <div className="grid grid-cols-3 gap-y-3">
        {stats.map((stat) => {
          const isInteractive =
            stat.label === 'Followers' || stat.label === 'Following';

          return (
            <motion.div
              key={stat.label}
              whileTap={isInteractive ? { scale: 0.97 } : undefined}
              className={`flex flex-col items-center justify-center rounded-xl transition-colors ${
                isInteractive
                  ? 'cursor-pointer active:bg-white/5'
                  : 'cursor-default'
              }`}
            >
              <span className="text-[16px] font-extrabold text-white leading-none tracking-tight">
                {stat.value}
              </span>

              <span className="mt-1 text-[11px] font-bold text-zinc-300 leading-none">
                {stat.label}
              </span>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
