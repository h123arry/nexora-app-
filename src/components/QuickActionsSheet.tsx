import React, { useEffect } from 'react';
import { Download, EyeOff, Flag, Bookmark, Link, X, Edit3, Archive, Trash, Ban } from 'lucide-react';

interface QuickActionsSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onAction: (action: string) => void;
  isOwnPost?: boolean;
  isArchived?: boolean;
}

export default function QuickActionsSheet({
  isOpen, onClose, onAction, isOwnPost = false, isArchived = false,
}: QuickActionsSheetProps) {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
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

  return (
    <div className="pointer-events-none absolute inset-0 z-[70]" aria-label="Video actions">
      <button type="button" tabIndex={-1} aria-label="Close video actions" className="pointer-events-auto absolute inset-0 h-full w-full cursor-default bg-transparent" onClick={onClose} />
      <section
        role="menu"
        aria-label="Video post options"
        className="pointer-events-auto absolute bottom-[calc(env(safe-area-inset-bottom,0px)+4.5rem)] right-[4.25rem] max-h-[min(62%,22rem)] w-56 max-w-[calc(100%-5rem)] overflow-y-auto rounded-2xl border border-white/12 bg-[#0c091f]/[.98] p-2 shadow-2xl shadow-black/50 backdrop-blur-xl"
        onClick={event => event.stopPropagation()}
      >
        <div className="mb-1 flex items-center justify-between border-b border-white/10 px-2 pb-2">
          <p className="text-[11px] font-bold text-white">Post options</p>
          <button type="button" onClick={onClose} aria-label="Close menu" className="rounded-lg p-1 text-zinc-400 hover:bg-white/10 hover:text-white"><X className="h-4 w-4"/></button>
        </div>
        {actions.map(action => (
          <button key={action.id} type="button" role="menuitem" onClick={() => { onAction(action.id); onClose(); }}
            className="flex min-h-10 w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-xs font-semibold text-zinc-100 transition-colors hover:bg-white/[.08] active:bg-violet-500/15">
            <action.icon className={`h-4 w-4 shrink-0 ${action.color}`}/>
            <span>{action.label}</span>
          </button>
        ))}
      </section>
    </div>
  );
}
