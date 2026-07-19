import React from 'react';
import { Bell } from 'lucide-react';

export default function InboxHeader() {
  return (
    <div className="px-4 py-3 border-b border-zinc-800 bg-[#0A0A0A] sticky top-0 z-10">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-white">Inbox</h2>
      </div>
    </div>
  );
}
