import React, { useEffect, useMemo, useState } from 'react';
import { collection, deleteDoc, doc, getDoc, getDocs, limit, query, serverTimestamp, setDoc, where } from 'firebase/firestore';
import { db } from '../lib/firebase';

import { CREATOR_ACADEMY_TOOLKITS } from '../content/creatorAcademyToolkits';
type Draft = Record<string, string>;

export default function CreatorAcademyToolkit({ userId }: { userId: string }) {
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [selectedId, setSelectedId] = useState(CREATOR_ACADEMY_TOOLKITS[0].id);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const selected = useMemo(() => CREATOR_ACADEMY_TOOLKITS.find(template => template.id === selectedId) || CREATOR_ACADEMY_TOOLKITS[0], [selectedId]);
  const values = drafts[selected.id] || {};

  useEffect(() => {
    let active = true;
    setDrafts({});
    setLoading(true);
    setError('');
    getDocs(query(collection(db, 'academyCreatorWorkbooks'), where('userId', '==', userId), limit(20)))
      .then(snapshot => {
        if (!active) return;
        const next: Record<string, Draft> = {};
        snapshot.docs.forEach(item => {
          const data = item.data();
          if (typeof data.templateId !== 'string' || typeof data.content !== 'string') return;
          try {
            const parsed = JSON.parse(data.content) as Record<string, unknown>;
            const template = CREATOR_ACADEMY_TOOLKITS.find(entry => entry.id === data.templateId);
            if (!template || !parsed || typeof parsed !== 'object') return;
            next[template.id] = Object.fromEntries(template.fields.map(field => [field.id, typeof parsed[field.id] === 'string' ? String(parsed[field.id]).slice(0, 2000) : '']));
          } catch { /* Ignore malformed legacy records rather than displaying untrusted shapes. */ }
        });
        setDrafts(next);
      })
      .catch(() => { if (active) setError('Your saved creator workbooks could not be loaded.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [userId]);

  const save = async () => {
    if (busy) return;
    setBusy(true); setNotice(''); setError('');
    try {
      const content = JSON.stringify(Object.fromEntries(selected.fields.map(field => [field.id, String(values[field.id] || '').slice(0, 2000)])));
      await setDoc(doc(db, 'academyCreatorWorkbooks', userId + '_' + selected.id), {
        userId, templateId: selected.id, content, updatedAt: serverTimestamp(), schemaVersion: 1,
      });
      setNotice('Your workbook has been saved to your NEXORA account.');
    } catch {
      setError('The workbook could not be saved. Please try again.');
    } finally { setBusy(false); }
  };

  const clear = async () => {
    if (busy) return;
    setBusy(true); setNotice(''); setError('');
    try {
      const ref = doc(db, 'academyCreatorWorkbooks', userId + '_' + selected.id);
      const existing = await getDoc(ref);
      if (existing.exists()) await deleteDoc(ref);
      setDrafts(previous => ({ ...previous, [selected.id]: {} }));
      setNotice('This workbook has been cleared.');
    } catch {
      setError('The workbook could not be cleared. Please try again.');
    } finally { setBusy(false); }
  };

  const copy = async () => {
    const text = [selected.title, selected.description, ...selected.fields.map(field => field.label + '\n' + (values[field.id] || 'Not completed'))].join('\n\n');
    try {
      await navigator.clipboard.writeText(text);
      setNotice('Workbook copied to your clipboard.');
    } catch { setError('Clipboard access is unavailable in this browser.'); }
  };

  return <section className="space-y-5 rounded-3xl border border-violet-400/15 bg-[#090d1b] p-5 md:p-6">
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div><p className="text-[10px] font-black uppercase tracking-[0.2em] text-violet-300">Creator workbench</p><h3 className="mt-2 text-xl font-black text-white">Practical creator toolkits</h3><p className="mt-1 max-w-2xl text-xs leading-5 text-white/50">Eight reusable workbooks for planning content, researching your audience, building partnerships and running a safer creator business. Drafts are private to your account.</p></div>
      <span className="rounded-full border border-white/10 px-3 py-1 text-[10px] text-white/45">{CREATOR_ACADEMY_TOOLKITS.length} workbooks</span>
    </div>
    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
      {CREATOR_ACADEMY_TOOLKITS.map(template => <button key={template.id} type="button" onClick={() => { setSelectedId(template.id); setNotice(''); setError(''); }} className={'rounded-xl border p-3 text-left transition-colors ' + (selectedId === template.id ? 'border-violet-400/40 bg-violet-500/10' : 'border-white/10 bg-white/[0.02] hover:border-white/20')}>
        <span className="text-[9px] font-black uppercase tracking-wider text-violet-300">{template.category}</span><span className="mt-1 block text-xs font-bold text-white">{template.title}</span><span className="mt-1 block text-[10px] leading-4 text-white/40">{template.outcome}</span>
      </button>)}
    </div>
    <div className="rounded-2xl border border-white/10 bg-black/20 p-4 md:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3"><div><h4 className="text-base font-black text-white">{selected.title}</h4><p className="mt-1 text-xs leading-5 text-white/50">{selected.description}</p></div><span className="text-[10px] text-violet-200">{selected.category}</span></div>
      {loading ? <p className="mt-4 text-xs text-white/40">Loading your saved workbooks…</p> : <div className="mt-4 grid gap-3 md:grid-cols-2">
        {selected.fields.map(field => <label key={field.id} className="block"><span className="text-xs font-bold text-white/75">{field.label}</span><span className="mt-1 block text-[10px] leading-4 text-white/35">{field.prompt}</span>
          {field.multiline ? <textarea rows={3} maxLength={2000} value={values[field.id] || ''} onChange={event => setDrafts(previous => ({ ...previous, [selected.id]: { ...(previous[selected.id] || {}), [field.id]: event.target.value } }))} className="mt-2 w-full resize-y rounded-xl border border-white/10 bg-[#070b15] p-3 text-xs leading-5 text-white placeholder:text-white/25 focus:border-violet-400/40 focus:outline-none"/> : <input maxLength={2000} value={values[field.id] || ''} onChange={event => setDrafts(previous => ({ ...previous, [selected.id]: { ...(previous[selected.id] || {}), [field.id]: event.target.value } }))} className="mt-2 w-full rounded-xl border border-white/10 bg-[#070b15] p-3 text-xs text-white focus:border-violet-400/40 focus:outline-none"/>}
        </label>)}
      </div>}
      {error && <p role="alert" className="mt-3 text-xs text-rose-200">{error}</p>}
      {notice && <p role="status" className="mt-3 text-xs text-emerald-200">{notice}</p>}
      <div className="mt-4 flex flex-wrap gap-2 border-t border-white/10 pt-4">
        <button type="button" disabled={busy || loading} onClick={() => void save()} className="rounded-xl bg-violet-600 px-4 py-2.5 text-xs font-bold text-white disabled:opacity-40">{busy ? 'Saving…' : 'Save workbook'}</button>
        <button type="button" disabled={busy || loading} onClick={() => void copy()} className="rounded-xl border border-white/10 px-4 py-2.5 text-xs font-bold text-white/70 disabled:opacity-40">Copy as text</button>
        <button type="button" disabled={busy || loading} onClick={() => void clear()} className="rounded-xl border border-white/10 px-4 py-2.5 text-xs font-bold text-white/45 disabled:opacity-40">Clear workbook</button>
      </div>
    </div>
  </section>;
}
