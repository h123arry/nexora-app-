import React from 'react';
import { motion } from 'motion/react';

export const Skeleton = ({ className }: { className?: string }) => {
  return (
    <motion.div
      initial={{ opacity: 0.5 }}
      animate={{ opacity: 1 }}
      transition={{ repeat: Infinity, repeatType: 'reverse', duration: 1.5 }}
      className={`bg-zinc-800 rounded-lg ${className}`}
    />
  );
};
