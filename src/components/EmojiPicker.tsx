import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Search, X } from 'lucide-react';

const CATEGORIES = [
  { id: 'smileys', label: '😀', emojis: ['😀', '😃', '😄', '😁', '😆', '😅', '😂', '🤣', '🥹', '😊', '😇', '🙂'] },
  { id: 'animals', label: '🐻', emojis: ['🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯', '🦁', '🐮'] },
  { id: 'food', label: '🍔', emojis: ['🍏', '🍎', '🍐', '🍊', '🍋', '🍌', '🍉', '🍇', '🍓', '🫐', '🍈', '🍒'] },
];

interface EmojiPickerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (emoji: string) => void;
}

export default function EmojiPicker({ isOpen, onClose, onSelect }: EmojiPickerProps) {
  const [searchTerm, setSearchTerm] = useState('');

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-40"
          />
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 z-50 bg-[#09071c] rounded-t-3xl border-t border-white/10 shadow-md p-4 h-[40vh] flex flex-col"
          >
            <div className="flex items-center gap-2 mb-4 bg-violet-950/20 p-2 rounded-xl">
              <Search className="w-4 h-4 text-zinc-400" />
              <input
                type="text"
                placeholder="Search emoji..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-transparent text-white placeholder-zinc-500 outline-none w-full text-sm"
              />
              <button onClick={onClose}><X className="w-4 h-4 text-zinc-400" /></button>
            </div>

            <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
              {CATEGORIES.map(cat => (
                <button key={cat.id} className="text-xl px-2">{cat.label}</button>
              ))}
            </div>

            <div className="grid grid-cols-8 gap-2 overflow-y-auto">
              {CATEGORIES.flatMap(c => c.emojis).filter(e => e.includes(searchTerm)).map((emoji, i) => (
                <button key={i} onClick={() => onSelect(emoji)} className="text-2xl hover:bg-violet-600/20 p-1 rounded-lg">
                  {emoji}
                </button>
              ))}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
