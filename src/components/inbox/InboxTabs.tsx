import React from 'react';

interface InboxTabsProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export default function InboxTabs({ activeTab, onTabChange }: InboxTabsProps) {
  const tabs = [
    { id: 'all', label: 'All' },
    { id: 'primary', label: 'Primary' },
    { id: 'groups', label: 'Groups' },
    { id: 'broadcasts', label: 'Broadcasts' },
    { id: 'requests', label: 'Requests' },
    { id: 'archived', label: 'Archived' }
  ];

  return (
    <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-thin px-4">
      {tabs.map(tab => (
        <button
          key={tab.id}
          type="button"
          onClick={() => onTabChange(tab.id)}
          className={`px-4 py-1.5 text-xs font-medium rounded-full transition-all cursor-pointer shrink-0 ${
            activeTab === tab.id 
              ? 'bg-zinc-100 text-black' 
              : 'bg-zinc-900 text-zinc-400 hover:text-white'
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
