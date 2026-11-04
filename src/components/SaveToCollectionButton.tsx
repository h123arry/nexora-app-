import React, { useState } from 'react';
import { BookmarkPlus, Check, ChevronDown } from 'lucide-react';
import { addContentToSavedCollection, type SavedContentType } from '../services/firebase/savedCollectionContentService';
import { listSavedCollections, type SavedCollection } from '../services/firebase/savedCollectionService';

interface Props {
  userId: string;
  itemType: SavedContentType;
  itemId: string;
  parentId?: string;
  disabled?: boolean;
}

export default function SaveToCollectionButton({ userId, itemType, itemId, parentId, disabled = false }: Props) {
  const [open, setOpen] = useState(false);
  const [collections, setCollections] = useState<SavedCollection[]>([]);
  const [selected, setSelected] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  const showCollections = async () => {
    setMessage('');
    if (!open && collections.length === 0) {
      try {
        const next = await listSavedCollections(userId);
        setCollections(next);
        setSelected(next[0]?.id || '');
        if (!next.length) setMessage('Create a collection in Saved first.');
      } catch { setMessage('Your saved collections could not be loaded.'); }
    }
    setOpen(value => !value);
  };

  const save = async () => {
    if (!selected || busy) return;
    setBusy(true); setMessage('');
    try {
      const added = await addContentToSavedCollection(userId, selected, itemType, itemId, parentId);
      setMessage(added ? 'Saved to your collection.' : 'Already saved in this collection.');
    } catch (error) { setMessage(error instanceof Error ? error.message : 'This item could not be saved.'); }
    finally { setBusy(false); }
  };

  return <div className="inline-flex flex-col items-start gap-1">
    <button type="button" disabled={disabled || busy} onClick={() => void showCollections()} aria-expanded={open}
      className="inline-flex items-center gap-1 rounded-lg border border-violet-400/25 px-3 py-2 text-[10px] font-semibold text-violet-200 disabled:opacity-40">
      <BookmarkPlus className="h-3.5 w-3.5" /> Save <ChevronDown className="h-3 w-3" />
    </button>
    {open && <div className="flex flex-wrap items-center gap-2 rounded-xl border border-white/10 bg-[#0b1020] p-2">
      {collections.length > 0 && <>
        <select value={selected} onChange={event => setSelected(event.target.value)} aria-label="Choose saved collection" className="max-w-40 rounded-lg border border-white/10 bg-black/40 px-2 py-2 text-xs text-white">
          {collections.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
        </select>
        <button type="button" disabled={!selected || busy} onClick={() => void save()} className="rounded-lg bg-violet-600 px-3 py-2 text-xs font-semibold text-white disabled:opacity-40">{busy ? 'Saving…' : <><Check className="mr-1 inline h-3 w-3" />Save</>}</button>
      </>}
      {message && <span role="status" className="max-w-48 text-[10px] text-violet-200">{message}</span>}
    </div>}
  </div>;
}
