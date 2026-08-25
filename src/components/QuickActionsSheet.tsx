import React, { useEffect } from 'react';
import { Download, EyeOff, Flag, UserMinus, Bookmark, Link, X, Edit3, Archive, Trash } from 'lucide-react';

interface QuickActionsSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onAction: (action: string) => void;
  isOwnPost?: boolean;
  isArchived?: boolean;
}

export default function QuickActionsSheet({
  isOpen,
  onClose,
  onAction,
  isOwnPost = false,
  isArchived = false
}: QuickActionsSheetProps) {
  // Handle Escape key and Android Back (popstate)
  useEffect(() => {
    if (!isOpen) return;

    // Push history state so Android Back / Escape closes sheet instead of navigating away
    window.history.pushState({ nexora_sheet_open: true }, '');

    const handlePopState = () => {
      onClose();
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener('popstate', handlePopState);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('popstate', handlePopState);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const actions = [
    { id: 'download', label: 'Download Video', icon: Download, color: 'text-violet-400' },
    { id: 'save', label: 'Save to Collection', icon: Bookmark, color: 'text-pink-400' },
    { id: 'copy-link', label: 'Copy Link', icon: Link, color: 'text-emerald-400' },
    ...(isOwnPost ? [
      { id: 'edit-caption', label: 'Edit Caption', icon: Edit3, color: 'text-amber-400' },
      { id: 'archive', label: isArchived ? 'Restore Post' : 'Archive Post', icon: Archive, color: 'text-fuchsia-400' },
      { id: 'delete', label: 'Delete Post', icon: Trash, color: 'text-red-400' },
    ] : [
      { id: 'not-interested', label: 'Not Interested', icon: EyeOff, color: 'text-zinc-400' },
      { id: 'report', label: 'Report Post', icon: Flag, color: 'text-red-400' },
      { id: 'hide-creator', label: 'Hide Creator', icon: UserMinus, color: 'text-cyan-400' },
    ]),
  ];

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-end justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg max-h-[80vh] flex flex-col rounded-t-3xl bg-[#0c091f] border-t border-white/10 p-6 shadow-2xl overflow-y-auto font-sans"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between pb-3 border-b border-white/10 shrink-0">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-violet-500 animate-pulse" />
            <h3 className="font-bold text-white text-base">Quick Actions</h3>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-white/10 text-zinc-400 hover:text-white transition-colors cursor-pointer"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 py-2">
          {actions.map((action) => (
            <button
              key={action.id}
              onClick={() => {
                onAction(action.id);
                onClose();
              }}
              className="flex items-center gap-3.5 rounded-xl bg-white/[0.04] border border-white/5 p-4 text-left text-sm font-semibold text-white hover:bg-white/[0.08] hover:border-white/10 transition-all cursor-pointer active:scale-[0.98]"
            >
              <div className={`p-2.5 rounded-lg bg-black/30 border border-white/5 ${action.color}`}>
                <action.icon className="h-4 w-4" />
              </div>
              <span className="truncate">{action.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
