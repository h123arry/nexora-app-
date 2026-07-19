import React from 'react';
import { Plus } from 'lucide-react';

export default function NotesRow() {
  return (
    <div className="flex gap-4 p-4 overflow-x-auto scrollbar-hide">
      {/* Your Note */}
      <div className="flex flex-col items-center gap-1.5 shrink-0">
        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-violet-600 to-pink-600 p-0.5 relative">
          <div className="w-full h-full rounded-full bg-[#0A0A0A] p-1">
             <img src="https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=120" className="w-full h-full rounded-full" alt="Me" />
          </div>
          <button className="absolute bottom-0 right-0 w-6 h-6 bg-violet-600 rounded-full flex items-center justify-center border-2 border-[#0A0A0A] text-white">
            <Plus className="w-4 h-4" />
          </button>
        </div>
        <span className="text-[10px] text-zinc-400">Your Note</span>
      </div>
    </div>
  );
}
