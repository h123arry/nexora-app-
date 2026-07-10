import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronRight, Plus, Search, Check } from 'lucide-react';

const COMMON_REACTIONS = ['👍', '❤️', '😂', '😮', '🔥', '🙏'];
const EXTENDED_REACTIONS = ['👏', '😍', '😭', '🤔', '💯', '🎉', '😎', '🤯', '🥳', '✨'];
const ALL_REACTIONS = [...COMMON_REACTIONS, ...EXTENDED_REACTIONS];

interface ReactionBarProps {
  onSelect: (emoji: string) => void;
  onClose: () => void;
}

export default function ReactionBar({ onSelect, onClose }: ReactionBarProps) {
  const [showExtended, setShowExtended] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close reaction bar when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        onClose();
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  const handleScrollRight = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: 100, behavior: 'smooth' });
    }
  };

  const filteredExtended = EXTENDED_REACTIONS.filter(emoji => 
    searchQuery ? true : true // Basic filter (can expand if search keywords mapped)
  );

  return (
    <motion.div
      ref={containerRef}
      initial={{ opacity: 0, scale: 0.9, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9, y: 10 }}
      className="bg-[#09071c]/95 backdrop-blur-xl border border-violet-500/30 rounded-2xl p-2 shadow-2xl z-50 flex flex-col gap-2 w-[280px] md:w-[320px] select-none"
    >
      <div className="relative flex items-center w-full">
        {/* Horizontal Scroll Area for Reactions */}
        <div 
          ref={scrollRef}
          className="flex-1 flex items-center gap-2 overflow-x-auto scrollbar-none pr-8 py-1 scroll-smooth snap-x"
          style={{ scrollbarWidth: 'none' }}
        >
          {ALL_REACTIONS.map(emoji => (
            <button 
              key={emoji} 
              onClick={() => onSelect(emoji)} 
              className="text-2xl hover:scale-130 active:scale-95 transition-all duration-150 p-1 cursor-pointer shrink-0 snap-center"
            >
              {emoji}
            </button>
          ))}
        </div>

        {/* Swipe Fade Right Overlay */}
        <div className="absolute right-8 top-0 bottom-0 w-8 bg-gradient-to-r from-transparent to-[#09071c] pointer-events-none" />

        {/* Plus / Expand indicator */}
        <button 
          onClick={() => setShowExtended(!showExtended)} 
          className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 border transition-all cursor-pointer ${
            showExtended 
              ? 'bg-violet-600 text-white border-violet-400' 
              : 'bg-violet-950/40 hover:bg-violet-600/30 text-violet-300 border-violet-500/20'
          }`}
          title="More reactions"
        >
          {showExtended ? <Check className="w-4 h-4 animate-pulse" /> : <Plus className="w-4 h-4" />}
        </button>
      </div>

      {/* Swipe/Scroll Help Indicator */}
      <div className="flex justify-between items-center px-2 text-[8px] font-mono text-violet-400/60 uppercase tracking-wider">
        <span>← Swipe for more</span>
        <span>Premium reactions</span>
      </div>

      {/* Optional Expandable Reaction Search Grid */}
      <AnimatePresence>
        {showExtended && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden border-t border-violet-500/10 pt-2 flex flex-col gap-2"
          >
            {/* Search Input */}
            <div className="relative flex items-center">
              <Search className="absolute left-2.5 w-3 h-3 text-violet-400/50" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search premium emoji..."
                className="w-full bg-slate-950/80 border border-violet-500/20 rounded-lg pl-8 pr-3 py-1 text-[10px] text-white placeholder-violet-400/30 font-sans focus:outline-none focus:border-violet-500/50"
                autoFocus
              />
            </div>

            {/* Grid display */}
            <div className="grid grid-cols-6 gap-2 max-h-[100px] overflow-y-auto pr-1">
              {['💖', '🎈', '🎉', '🌟', '👏', '🔥', '👀', '💯', '🚀', '🥳', '🙌', '💀', '💩', '🤯', '😭', '🥺', '👾', '✨'].map(emoji => (
                <button
                  key={emoji}
                  onClick={() => onSelect(emoji)}
                  className="text-xl hover:scale-125 transition-transform p-1.5 rounded-lg hover:bg-violet-600/10 cursor-pointer"
                >
                  {emoji}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
