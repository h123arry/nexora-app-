import React from 'react';
import { Bell } from 'lucide-react';

interface InboxHeaderProps {
  showNotificationDrawer: () => void;
  hasUnreadNotifications: boolean;
}

export default function InboxHeader({ 
  showNotificationDrawer, 
  hasUnreadNotifications
}: InboxHeaderProps) {
  return (
    <div className="px-4 py-3 border-b border-zinc-800 bg-[#0A0A0A] sticky top-0 z-10">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-white">Inbox</h2>
        <button
          type="button"
          onClick={showNotificationDrawer}
          className="p-2 hover:bg-zinc-800 rounded-full text-zinc-400 hover:text-white relative transition-colors"
        >
          <Bell className="w-5 h-5" />
          {hasUnreadNotifications && (
            <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full" />
          )}
        </button>
      </div>
    </div>
  );
}
