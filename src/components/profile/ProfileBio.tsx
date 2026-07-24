import React from 'react';
import { motion } from 'motion/react';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface ProfileBioProps {
  bio?: string;
  expanded: boolean;
  onToggle: () => void;
}

export default function ProfileBio({
  bio,
  expanded,
  onToggle,
}: ProfileBioProps) {
  const text = bio?.trim() || 'No bio yet.';

  const shouldCollapse =
    text.length > 90 || text.split('\n').length > 2;

  return (
    <div className="mb-4">
      <motion.div
        animate={{
          height: expanded ? 'auto' : '3.2rem',
        }}
        transition={{
          duration: 0.25,
        }}
        className="overflow-hidden"
      >
        <p className="text-[13px] leading-6 text-zinc-300 whitespace-pre-wrap">
          {text}
        </p>
      </motion.div>

      {shouldCollapse && (
        <button
          onClick={onToggle}
          className="mt-2 inline-flex items-center gap-1 text-[11px] font-semibold text-violet-400 hover:text-violet-300 transition-colors"
        >
          {expanded ? (
            <>
              <ChevronUp className="w-3 h-3" />
              Show less
            </>
          ) : (
            <>
              <ChevronDown className="w-3 h-3" />
              Show more
            </>
          )}
        </button>
      )}
    </div>
  );
}
