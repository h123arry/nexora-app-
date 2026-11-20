import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowDown, ArrowUp, FileAudio, FileText, Image as ImageIcon, Loader2, Play, Search, Video, X, Download } from 'lucide-react';
import { ExtendedMessage } from '../types';
import { resolvePrivateChatMedia } from '../services/firebase/storageService';

interface MediaGalleryProps {
  isOpen: boolean;
  onClose: () => void;
  chatId: string;
  chatPartnerName: string;
  currentUserId: string;
  messages: ExtendedMessage[];
  hasMoreHistory: boolean;
  isLoadingOlder: boolean;
  onLoadOlder: () => void;
}

type AttachmentType = 'image' | 'video' | 'audio' | 'document';
type FilterType = 'all' | AttachmentType;

function formatDate(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? 'Date unavailable'
    : new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(date);
}

function attachmentType(message: ExtendedMessage): AttachmentType | null {
  if (message.mediaType) return message.mediaType;
  if (message.customMediaType === 'voice' || message.voiceDuration) return 'audio';
  return null;
}

function attachmentPath(message: ExtendedMessage): string {
  return message.mediaStoragePath || message.voiceAudioUrl || '';
}

export default function MediaGallery({
  isOpen, onClose, chatId, chatPartnerName, currentUserId, messages,
  hasMoreHistory, isLoadingOlder, onLoadOlder,
}: MediaGalleryProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest'>('newest');
  const [filter, setFilter] = useState<FilterType>('all');
  const [mediaUrls, setMediaUrls] = useState<Record<string, string>>({});
  const [loadingMessageId, setLoadingMessageId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const objectUrls = useRef<Set<string>>(new Set());

  useEffect(() => () => {
    objectUrls.current.forEach(url => URL.revokeObjectURL(url));
    objectUrls.current.clear();
  }, []);

  const attachments = useMemo(() => messages
    .filter(message => {
      const type = attachmentType(message);
      const path = attachmentPath(message);
      return Boolean(type && path.startsWith('chats/') && !message.isOfflineUnsent
        && message.status !== 'failed' && message.status !== 'sending');
    })
    .filter(message => filter === 'all' || attachmentType(message) === filter)
    .filter(message => {
      const sender = message.senderId === currentUserId ? 'you' : chatPartnerName.toLowerCase();
      const fileName = (message.fileName || '').toLowerCase();
      const query = searchQuery.trim().toLowerCase();
      return !query || sender.includes(query) || fileName.includes(query)
        || (message.voiceDuration || '').toLowerCase().includes(query);
    })
    .sort((a, b) => {
      const difference = new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
      return sortBy === 'newest' ? -difference : difference;
    }), [messages, currentUserId, chatPartnerName, searchQuery, sortBy, filter]);

  const loadMedia = async (message: ExtendedMessage) => {
    const path = attachmentPath(message);
    if (!path || loadingMessageId) return;
    setLoadingMessageId(message.id);
    setErrorMessage('');
    try {
      const url = await resolvePrivateChatMedia(path);
      objectUrls.current.add(url);
      setMediaUrls(previous => ({ ...previous, [message.id]: url }));
    } catch {
      setErrorMessage('This attachment could not be loaded. Check your connection and conversation access, then retry.');
    } finally {
      setLoadingMessageId(null);
    }
  };

  if (!isOpen) return null;

  const filters: { id: FilterType; label: string }[] = [
    { id: 'all', label: 'All' }, { id: 'image', label: 'Photos' }, { id: 'video', label: 'Videos' },
    { id: 'audio', label: 'Audio' }, { id: 'document', label: 'Files' },
  ];

  return (
    <div className="absolute inset-0 z-40 flex h-full flex-col border-l border-violet-500/10 bg-[#06040f]/95 backdrop-blur-2xl">
      <header className="flex items-center justify-between border-b border-violet-500/10 bg-[#09071c]/80 p-4">
        <div>
          <span className="block text-[9px] font-mono font-black uppercase tracking-widest text-violet-400">Conversation archive</span>
          <h3 className="mt-0.5 flex items-center gap-2 text-sm font-black text-white">
            Media & files <span className="text-xs font-normal text-white/40">· {chatPartnerName}</span>
          </h3>
          <p className="mt-1 text-[10px] text-white/35">Private attachments shared in this conversation. Files are fetched only when opened.</p>
        </div>
        <button type="button" onClick={onClose} aria-label="Close conversation media" className="rounded-xl border border-white/15 p-2 text-white/50 transition hover:bg-white/5 hover:text-white">
          <X className="h-4 w-4"/>
        </button>
      </header>

      <div className="space-y-3 border-b border-violet-500/5 bg-[#05030d] p-3">
        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-violet-400/50"/>
          <input value={searchQuery} onChange={event => setSearchQuery(event.target.value)} placeholder="Search media and files…" aria-label="Search media and files" className="w-full rounded-xl border border-violet-500/10 bg-slate-950 py-2 pl-8 pr-3 text-xs text-white placeholder-violet-400/25 focus:border-violet-500 focus:outline-none"/>
        </div>
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          {filters.map(item => <button key={item.id} type="button" onClick={() => setFilter(item.id)} aria-pressed={filter === item.id} className={`shrink-0 rounded-full border px-3 py-1.5 text-[10px] font-bold transition ${filter === item.id ? 'border-violet-400/40 bg-violet-500/20 text-violet-100' : 'border-white/10 text-white/45'}`}>{item.label}</button>)}
        </div>
        <div className="flex items-center justify-between gap-3">
          <span className="text-[10px] text-white/40">{attachments.length} attachment{attachments.length === 1 ? '' : 's'} in loaded history</span>
          <button type="button" onClick={() => setSortBy(value => value === 'newest' ? 'oldest' : 'newest')} className="flex items-center gap-1.5 rounded-lg border border-white/10 px-2.5 py-1.5 text-[10px] font-bold text-white/60">
            {sortBy === 'newest' ? <ArrowDown className="h-3 w-3"/> : <ArrowUp className="h-3 w-3"/>}
            {sortBy === 'newest' ? 'Newest first' : 'Oldest first'}
          </button>
        </div>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        {errorMessage && <p role="alert" className="rounded-xl border border-rose-400/20 bg-rose-500/5 p-3 text-xs text-rose-200">{errorMessage}</p>}
        {attachments.length === 0 ? (
          <div className="flex min-h-48 flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 p-6 text-center">
            <FileText className="h-8 w-8 text-violet-300/50"/>
            <p className="mt-3 text-sm font-bold text-white/70">{searchQuery ? 'No matching attachments' : 'No attachments in this loaded history'}</p>
            <p className="mt-1 max-w-xs text-xs leading-5 text-white/35">Photos, videos, documents, imported audio and recorded voice notes appear here after they are sent.</p>
          </div>
        ) : attachments.map(message => {
          const type = attachmentType(message)!;
          const url = mediaUrls[message.id];
          const sender = message.senderId === currentUserId ? 'You' : chatPartnerName;
          const Icon = type === 'image' ? ImageIcon : type === 'video' ? Video : type === 'audio' ? FileAudio : FileText;
          return <article key={message.id} className="rounded-2xl border border-white/10 bg-[#09071c] p-3">
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 items-center gap-2">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-violet-400/15 bg-violet-500/10"><Icon className="h-4 w-4 text-violet-300"/></span>
                <div className="min-w-0"><p className="truncate text-xs font-bold text-white">{message.fileName || (type === 'audio' ? 'Voice note' : type === 'image' ? 'Photo' : type === 'video' ? 'Video' : 'Document')}</p><p className="mt-0.5 text-[10px] text-violet-200/65">{sender} · {message.voiceDuration || formatDate(message.timestamp)}</p></div>
              </div>
              <time className="shrink-0 text-[9px] text-white/35">{formatDate(message.timestamp)}</time>
            </div>
            {url ? (
              type === 'image' ? <img src={url} alt={message.fileName || 'Shared photo'} className="mt-3 max-h-72 w-full rounded-xl bg-black object-contain"/>
              : type === 'video' ? <video controls playsInline preload="metadata" src={url} className="mt-3 max-h-72 w-full rounded-xl bg-black"/>
              : type === 'audio' ? <audio controls preload="none" src={url} className="mt-3 w-full"/>
              : <a href={url} download={message.fileName || 'attachment'} className="mt-3 flex min-h-10 items-center justify-center gap-2 rounded-xl border border-violet-400/20 bg-violet-500/10 text-xs font-bold text-violet-100"><Download className="h-4 w-4"/>Download {message.fileName || 'file'}</a>
            ) : (
              <button type="button" disabled={loadingMessageId !== null} onClick={() => void loadMedia(message)} className="mt-3 flex min-h-10 w-full items-center justify-center gap-2 rounded-xl border border-violet-400/20 bg-violet-500/10 text-xs font-bold text-violet-100 disabled:opacity-40">
                {loadingMessageId === message.id ? <><Loader2 className="h-3.5 w-3.5 animate-spin"/>Loading privately…</> : <><Play className="h-3.5 w-3.5"/>Open attachment</>}
              </button>
            )}
          </article>;
        })}
        {hasMoreHistory && <button type="button" disabled={isLoadingOlder} onClick={onLoadOlder} className="flex min-h-10 w-full items-center justify-center rounded-xl border border-white/10 text-xs font-bold text-white/65 disabled:opacity-40">
          {isLoadingOlder ? 'Loading older messages…' : 'Load older conversation history'}
        </button>}
      </div>
    </div>
  );
}
