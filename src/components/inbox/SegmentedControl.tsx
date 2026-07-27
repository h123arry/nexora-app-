import React from 'react';

interface SegmentedControlProps {
  activeTab: 'messages' | 'activity';
  onTabChange: (tab: 'messages' | 'activity') => void;
}

export default function SegmentedControl({ activeTab, onTabChange }: SegmentedControlProps) {
  return (
    <div className="flex bg-[#060417] p-1 rounded-xl border border-white/10">
      <button
        onClick={() => onTabChange('messages')}
        className={`flex-1 py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-all ${
          activeTab === 'messages' ? 'bg-violet-600/20 text-violet-300 shadow-inner' : 'text-zinc-500 hover:text-white'
        }`}
      >
        Messages
      </button>
      <button
        onClick={() => onTabChange('activity')}
        className={`flex-1 py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-all ${
          activeTab === 'activity' ? 'bg-violet-600/20 text-violet-300 shadow-inner' : 'text-zinc-500 hover:text-white'
        }`}
      >
        Activity
      </button>
    </div>
  );
}
