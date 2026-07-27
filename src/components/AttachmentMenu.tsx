import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Camera, Image, FileText, Music, User, BarChart, Gift, Smile, MapPin, X } from 'lucide-react';

interface AttachmentOption {
  id: string;
  label: string;
  icon: React.ElementType;
}

const options: AttachmentOption[] = [
  { id: 'camera', label: 'Camera', icon: Camera },
  { id: 'gallery', label: 'Gallery', icon: Image },
  { id: 'document', label: 'Document', icon: FileText },
  { id: 'audio', label: 'Audio', icon: Music },
  { id: 'contact', label: 'Contact', icon: User },
  { id: 'poll', label: 'Poll', icon: BarChart },
  { id: 'gif', label: 'GIF', icon: Gift },
  { id: 'sticker', label: 'Stickers', icon: Smile },
  { id: 'location', label: 'Location', icon: MapPin },
];

interface AttachmentMenuProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (id: string) => void;
}

export default function AttachmentMenu({ isOpen, onClose, onSelect }: AttachmentMenuProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 z-40 backdrop-blur-sm"
          />
          {/* Menu Panel */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 z-50 bg-[#09071c] rounded-t-3xl p-6 border-t border-white/10 shadow-md"
          >
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-white font-sans font-bold text-lg">Attachment</h3>
              <button onClick={onClose} className="p-2 rounded-full bg-violet-950/30 text-violet-300">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="grid grid-cols-3 gap-6">
              {options.map((option) => (
                <button
                  key={option.id}
                  onClick={() => {
                    onSelect(option.id);
                    onClose();
                  }}
                  className="flex flex-col items-center gap-2 group"
                >
                  <div className="p-4 rounded-2xl bg-violet-950/20 text-violet-300 group-hover:bg-violet-600/30 group-hover:text-white transition-all">
                    <option.icon className="w-6 h-6" />
                  </div>
                  <span className="text-xs text-zinc-400 font-sans font-medium">{option.label}</span>
                </button>
              ))}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
