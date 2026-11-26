import React, { useEffect } from 'react';
import { Download, EyeOff, Flag, Bookmark, Link, X, Edit3, Archive, Trash, Ban } from 'lucide-react';

interface QuickActionsSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onAction: (action: string) => void;
  isOwnPost?: boolean;
  isArchived?: boolean;
  compact?: boolean;
}

export default function QuickActionsSheet({
  isOpen,
  onClose,
  onAction,
  isOwnPost = false,
  isArchived = false,
  compact = false
}: QuickActionsSheetProps) {
  // Overlay dismissal is coordinated by the app-level back-navigation controller.
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const actions = [
    { id: 'download', label: 'Download Video', icon: Download, color: 'text-violet-300' },
    { id: 'save', label: 'Save to Collection', icon: Bookmark, color: 'text-violet-200' },
    { id: 'copy-link', label: 'Copy Link', icon: Link, color: 'text-emerald-300' },
    ...(isOwnPost ? [
      { id: 'edit-caption', label: 'Edit Caption', icon: Edit3, color: 'text-amber-300' },
      { id: 'archive', label: isArchived ? 'Restore Post' : 'Archive Post', icon: Archive, color: 'text-violet-200' },
      { id: 'delete', label: 'Delete Post', icon: Trash, color: 'text-red-300' },
    ] : [
      { id: 'hide-post', label: 'Hide Post', icon: EyeOff, color: 'text-zinc-200' },
      { id: 'not-interested', label: 'Not Interested', icon: Ban, color: 'text-zinc-300' },
      { id: 'report', label: 'Report Post', icon: Flag, color: 'text-red-300' },
    ]),
  ];

  return compact ? (
    <div className="fixed inset-0 z-[9999]" onClick={onClose}>
      <div
        role="menu"
        aria-label="Video options"
        className="absolute right-3 top-16 w-56 max-h-[min(70vh,28rem)] overflow-y-auto rounded-2xl border border-white/10 bg-[#0c091f]/[.98] p-1.5 shadow-2xl shadow-black/50 backdrop-blur-xl font-sans"
        onClick={(e) => e.stopPropagation()}
      >
        {actions.map((action) => (
          <button
            key={action.id}
            role="menuitem"
            type="button"
            onClick={() => { onAction(action.id); onClose(); }}
            className="flex min-h-10 w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-xs font-semibold text-zinc-100 transition-colors hover:bg-white/[.08] active:bg-violet-500/15"
          >
            <action.icon className={`h-4 w-4 shrink-0 ${action.color}`} />
            <span className="truncate">{action.label}</span>
          </button>
        ))}
      </div>
    </div>
  ) : (
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
          <button onClick={onClose} className="p-2 rounded-full hover:bg-white/10 text-zinc-400 hover:text-white transition-colors cursor-pointer" title="Close">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 py-2">
          {actions.map((action) => (
            <button key={action.id} onClick={() => { onAction(action.id); onClose(); }} className="flex items-center gap-3.5 rounded-xl bg-white/[0.04] border border-white/5 p-4 text-left text-sm font-semibold text-white hover:bg-white/[0.08] hover:border-white/10 transition-all cursor-pointer active:scale-[0.98]">
              <div className={`p-2.5 rounded-lg bg-black/30 border border-white/5 ${action.color}`}><action.icon className="h-4 w-4" /></div>
              <span className="truncate">{action.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
