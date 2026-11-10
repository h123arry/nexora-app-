import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowDown, ArrowUp, FileAudio, Loader2, Search, X } from 'lucide-react';
import { ExtendedMessage } from '../types';
import { resolvePrivateChatAudio } from '../services/firebase/storageService';

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

function formatDate(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? 'Date unavailable'
    : new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(date);
}

export default function MediaGallery({
  isOpen, onClose, chatId, chatPartnerName, currentUserId, messages,
  hasMoreHistory, isLoadingOlder, onLoadOlder,
}: MediaGalleryProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest'>('newest');
  const [audioUrls, setAudioUrls] = useState<Record<string, string>>({});
  const [loadingMessageId, setLoadingMessageId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const objectUrls = useRef<Set<string>>(new Set());

  useEffect(() => () => {
    objectUrls.current.forEach(url => URL.revokeObjectURL(url));
    objectUrls.current.clear();
  }, []);

  const voiceMessages = useMemo(() => messages
    .filter(message => message.customMediaType === 'voice'
      && typeof message.voiceAudioUrl === 'string'
      && message.voiceAudioUrl.startsWith('chats/')
      && !message.isOfflineUnsent
      && message.status !== 'failed'
      && message.status !== 'sending')
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
    }), [messages, currentUserId, chatPartnerName, searchQuery, sortBy]);

  const loadAudio = async (message: ExtendedMessage) => {
    if (!message.voiceAudioUrl || loadingMessageId) return;
    setLoadingMessageId(message.id);
    setErrorMessage('');
    try {
      const url = await resolvePrivateChatAudio(message.voiceAudioUrl);
      objectUrls.current.add(url);
      setAudioUrls(previous => ({ ...previous, [message.id]: url }));
    } catch {
      setErrorMessage('This voice note could not be loaded. It may have expired or you may no longer have access to this conversation.');
    } finally {
      setLoadingMessageId(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="absolute inset-0 z-40 flex h-full flex-col border-l border-violet-500/10 bg-[#06040f]/95 backdrop-blur-2xl">
      <header className="flex items-center justify-between border-b border-violet-500/10 bg-[#09071c]/80 p-4">
        <div>
          <span className="block text-[9px] font-mono font-black uppercase tracking-widest text-violet-400">Conversation archive</span>
          <h3 className="mt-0.5 flex items-center gap-2 text-sm font-black text-white">
            Voice notes <span className="text-xs font-normal text-white/40">· {chatPartnerName}</span>
          </h3>
          <p className="mt-1 text-[10px] text-white/35">Real voice messages shared in this conversation. Private audio is fetched only when you choose to play it.</p>
        </div>
        <button type="button" onClick={onClose} aria-label="Close conversation media" className="rounded-xl border border-white/15 p-2 text-white/50 transition hover:bg-white/5 hover:text-white">
          <X className="h-4 w-4"/>
        </button>
      </header>

      <div className="space-y-3 border-b border-violet-500/5 bg-[#05030d] p-3">
        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-violet-400/50"/>
          <input value={searchQuery} onChange={event => setSearchQuery(event.target.value)} placeholder="Search voice notes…" aria-label="Search voice notes" className="w-full rounded-xl border border-violet-500/10 bg-slate-950 py-2 pl-8 pr-3 text-xs text-white placeholder-violet-400/25 focus:border-violet-500 focus:outline-none"/>
        </div>
        <div className="flex items-center justify-between gap-3">
          <span className="text-[10px] text-white/40">{voiceMessages.length} voice notes in loaded history</span>
          <button type="button" onClick={() => setSortBy(value => value === 'newest' ? 'oldest' : 'newest')} className="flex items-center gap-1.5 rounded-lg border border-white/10 px-2.5 py-1.5 text-[10px] font-bold text-white/60">
            {sortBy === 'newest' ? <ArrowDown className="h-3 w-3"/> : <ArrowUp className="h-3 w-3"/>}
            {sortBy === 'newest' ? 'Newest first' : 'Oldest first'}
          </button>
        </div>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        {errorMessage && <p role="alert" className="rounded-xl border border-rose-400/20 bg-rose-500/5 p-3 text-xs text-rose-200">{errorMessage}</p>}
        {voiceMessages.length === 0 ? (
          <div className="flex min-h-48 flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 p-6 text-center">
            <FileAudio className="h-8 w-8 text-violet-300/50"/>
            <p className="mt-3 text-sm font-bold text-white/70">{searchQuery ? 'No matching voice notes' : 'No voice notes in this loaded history'}</p>
            <p className="mt-1 max-w-xs text-xs leading-5 text-white/35">Only attachments that were actually sent in this conversation appear here. Images, videos and documents are not listed unless messaging supports and stores them.</p>
          </div>
        ) : voiceMessages.map(message => {
          const sender = message.senderId === currentUserId ? 'You' : chatPartnerName;
          return <article key={message.id} className="rounded-2xl border border-white/10 bg-[#09071c] p-3">
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 items-center gap-2">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-violet-400/15 bg-violet-500/10"><FileAudio className="h-4 w-4 text-violet-300"/></span>
                <div className="min-w-0"><p className="truncate text-xs font-bold text-white">{message.fileName || 'Voice note'}</p><p className="mt-0.5 text-[10px] text-violet-200/65">{sender} · {message.voiceDuration || 'Duration unavailable'}</p></div>
              </div>
              <time className="shrink-0 text-[9px] text-white/35">{formatDate(message.timestamp)}</time>
            </div>
            {audioUrls[message.id] ? (
              <audio controls preload="none" src={audioUrls[message.id]} className="mt-3 w-full" aria-label={'Play voice note from ' + sender}/>
            ) : (
              <button type="button" disabled={loadingMessageId !== null} onClick={() => void loadAudio(message)} className="mt-3 flex min-h-10 w-full items-center justify-center gap-2 rounded-xl border border-violet-400/20 bg-violet-500/10 text-xs font-bold text-violet-100 disabled:opacity-40">
                {loadingMessageId === message.id ? <><Loader2 className="h-3.5 w-3.5 animate-spin"/>Loading private audio…</> : 'Load voice note'}
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
