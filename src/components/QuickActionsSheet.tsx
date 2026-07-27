import React from 'react';
import { Download, EyeOff, Flag, UserMinus, Bookmark, Copy, Link, X } from 'lucide-react';

interface QuickActionsSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onAction: (action: string) => void;
}

export default function QuickActionsSheet({ isOpen, onClose, onAction }: QuickActionsSheetProps) {
  if (!isOpen) return null;

  const actions = [
    { id: 'download', label: 'Download', icon: Download },
    { id: 'not-interested', label: 'Not Interested', icon: EyeOff },
    { id: 'report', label: 'Report', icon: Flag },
    { id: 'hide-creator', label: 'Hide Creator', icon: UserMinus },
    { id: 'save', label: 'Save Video', icon: Bookmark },
    { id: 'copy-link', label: 'Copy Link', icon: Link },
  ];

  return (
    <div className="fixed inset-0 z-[1000] flex items-end justify-center bg-black/50" onClick={onClose}>
      <div className="w-full max-w-sm rounded-t-3xl bg-zinc-900 p-6 shadow-md" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-semibold text-white">Quick Actions</h3>
          <button onClick={onClose}><X className="text-zinc-400" /></button>
        </div>
        <div className="grid grid-cols-2 gap-4">
          {actions.map((action) => (
            <button
              key={action.id}
              onClick={() => { onAction(action.id); onClose(); }}
              className="flex items-center gap-3 rounded-xl bg-zinc-800 p-4 text-left text-sm text-white hover:bg-zinc-700"
            >
              <action.icon className="h-5 w-5 text-zinc-400" />
              {action.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
