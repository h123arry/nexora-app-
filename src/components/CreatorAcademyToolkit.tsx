import React, { useEffect, useMemo, useState } from 'react';
import { collection, deleteDoc, doc, getDocs, limit, query, serverTimestamp, setDoc, where } from 'firebase/firestore';
import { db } from '../lib/firebase';

type TemplateField = { id: string; label: string; prompt: string; multiline?: boolean };
type CreatorTemplate = { id: string; title: string; category: string; description: string; outcome: string; fields: TemplateField[] };

const TEMPLATES: CreatorTemplate[] = [
  { id: 'content-brief', title: 'Content brief', category: 'Creation', description: 'Turn a loose idea into a clear piece of content with a defined audience outcome.', outcome: 'A focused production brief you can use before scripting or recording.', fields: [
    { id: 'audience', label: 'Who is this for?', prompt: 'Describe the people this piece should help.' },
    { id: 'goal', label: 'Audience outcome', prompt: 'What should someone understand, feel or be able to do afterwards?', multiline: true },
    { id: 'core-message', label: 'One central message', prompt: 'Write the single point this content must communicate.', multiline: true },
    { id: 'hook', label: 'Opening hook', prompt: 'Write a truthful opening that earns attention.', multiline: true },
    { id: 'proof', label: 'Examples or evidence', prompt: 'List examples, sources or demonstrations that support the message.', multiline: true },
    { id: 'call-to-action', label: 'Useful next step', prompt: 'What is the most relevant next action for the audience?' },
  ]},
  { id: 'publishing-plan', title: 'Two-week publishing plan', category: 'Planning', description: 'Build a manageable publishing rhythm around your real capacity.', outcome: 'A two-week plan with formats, production windows and recovery space.', fields: [
    { id: 'focus', label: 'Two-week focus', prompt: 'What theme or audience need will connect the work?' },
    { id: 'cadence', label: 'Realistic cadence', prompt: 'How many pieces can you publish without sacrificing quality?' },
    { id: 'formats', label: 'Repeatable formats', prompt: 'List the formats you can produce consistently.', multiline: true },
    { id: 'production', label: 'Production windows', prompt: 'When will you research, create, edit and publish?', multiline: true },
    { id: 'buffer', label: 'Buffer and rest', prompt: 'Where is your recovery time and contingency space?' },
    { id: 'review', label: 'Review date and signal', prompt: 'When will you review the plan, and what evidence will matter?' },
  ]},
  { id: 'audience-interview', title: 'Audience interview guide', category: 'Research', description: 'Learn from real audience needs instead of relying on assumptions.', outcome: 'A short interview plan and a structured record of what you learn.', fields: [
    { id: 'participant', label: 'Participant context', prompt: 'Describe the relevant audience context without recording unnecessary private data.' },
    { id: 'opening', label: 'Opening question', prompt: 'What open question will help the person describe their experience?', multiline: true },
    { id: 'challenge', label: 'Current challenge', prompt: 'What difficulty or unmet need did they describe?', multiline: true },
    { id: 'exact-words', label: 'Useful exact wording', prompt: 'Record a short quote only with permission. Otherwise paraphrase.' , multiline: true},
    { id: 'workaround', label: 'Current workaround', prompt: 'What do they do today, and what is frustrating about it?', multiline: true },
    { id: 'next-test', label: 'Follow-up hypothesis', prompt: 'What should you investigate next? Separate evidence from assumptions.' , multiline: true},
  ]},
  { id: 'partnership-proposal', title: 'Brand partnership proposal', category: 'Business', description: 'Prepare a transparent, professional partnership outline before negotiating.', outcome: 'A proposal brief that makes scope, value and obligations clear.', fields: [
    { id: 'brand-fit', label: 'Why this brand fits', prompt: 'Explain the genuine connection between the brand and your work.', multiline: true },
    { id: 'audience-fit', label: 'Audience relevance', prompt: 'What audience need does the partnership serve?' , multiline: true},
    { id: 'deliverables', label: 'Deliverables and dates', prompt: 'List the content, formats, deadlines and revision limits.', multiline: true },
    { id: 'usage-rights', label: 'Usage and licensing', prompt: 'Define where, how long and in what formats the brand may reuse the work.', multiline: true },
    { id: 'disclosure', label: 'Disclosure plan', prompt: 'How will the commercial relationship be clearly disclosed?' },
    { id: 'commercials', label: 'Commercial terms to agree', prompt: 'Record proposed fee, payment milestones, expenses and cancellation terms.', multiline: true },
  ]},
  { id: 'live-run-sheet', title: 'Live session run sheet', category: 'Live', description: 'Plan a structured live session with clear roles and contingency steps.', outcome: 'A timed show plan that helps hosts and moderators work together.', fields: [
    { id: 'purpose', label: 'Session purpose', prompt: 'What should viewers take away?' },
    { id: 'opening', label: 'Opening and context', prompt: 'How will you welcome viewers and explain the topic?', multiline: true },
    { id: 'segments', label: 'Timed segments', prompt: 'List segments, durations, hosts and transition cues.', multiline: true },
    { id: 'participation', label: 'Audience participation', prompt: 'How will questions or contributions be selected fairly?' , multiline: true},
    { id: 'moderation', label: 'Moderator responsibilities', prompt: 'Who handles reports, guest support and escalation?' },
    { id: 'contingency', label: 'Technical and safety fallback', prompt: 'What happens if a guest drops, harassment occurs or the stream fails?', multiline: true },
  ]},
  { id: 'community-charter', title: 'Community charter', category: 'Community', description: 'Set clear expectations for participation, moderation and member safety.', outcome: 'A concise charter that members can understand and moderators can apply.', fields: [
    { id: 'purpose', label: 'Community purpose', prompt: 'What brings members together?' , multiline: true},
    { id: 'welcome', label: 'Welcome promise', prompt: 'What should a new member expect?' , multiline: true},
    { id: 'positive-behaviour', label: 'What good participation looks like', prompt: 'List behaviours that make the space useful and welcoming.', multiline: true },
    { id: 'boundaries', label: 'Unacceptable behaviour', prompt: 'Describe harassment, privacy violations, spam and other prohibited conduct.', multiline: true },
    { id: 'moderation', label: 'Moderation and escalation', prompt: 'Describe warnings, content removal, restrictions and urgent escalation.', multiline: true },
    { id: 'reporting', label: 'How members can seek help', prompt: 'Explain the reporting route and what information to include.' },
  ]},
  { id: 'content-experiment', title: 'Content experiment tracker', category: 'Analytics', description: 'Test a specific creative hypothesis without overreacting to one result.', outcome: 'A fair experiment with a defined variable, measures and decision rule.', fields: [
    { id: 'question', label: 'Question to investigate', prompt: 'What do you want to understand?' },
    { id: 'hypothesis', label: 'Hypothesis', prompt: 'What do you expect to happen, and why?', multiline: true },
    { id: 'variable', label: 'One main variable', prompt: 'What will change while other factors remain as comparable as possible?' },
    { id: 'comparison', label: 'Comparable posts or baseline', prompt: 'Which examples will you compare?', multiline: true },
    { id: 'measure', label: 'Primary and guardrail measures', prompt: 'Which metric matters, and what quality or wellbeing signal must not worsen?' },
    { id: 'decision', label: 'Review window and decision rule', prompt: 'When will you review, and what result would support or weaken the hypothesis?', multiline: true },
  ]},
  { id: 'portfolio-case-study', title: 'Portfolio case study', category: 'Professional', description: 'Show your contribution and evidence without exaggerating outcomes.', outcome: 'A concise case study suitable for a portfolio or professional introduction.', fields: [
    { id: 'brief', label: 'Project brief', prompt: 'What was the objective and context?', multiline: true },
    { id: 'role', label: 'Your contribution', prompt: 'What did you personally own or deliver?' , multiline: true},
    { id: 'constraints', label: 'Constraints and decisions', prompt: 'What limits shaped your approach, and what choices did you make?', multiline: true },
    { id: 'process', label: 'Process', prompt: 'Describe the important steps and collaboration.', multiline: true },
    { id: 'result', label: 'Result and evidence', prompt: 'Use only outcomes you can substantiate. Include timeframe and source.', multiline: true },
    { id: 'permission', label: 'Permission and privacy check', prompt: 'Confirm what can be shared and remove confidential information.' },
  ]},
];

type Draft = Record<string, string>;

export default function CreatorAcademyToolkit({ userId }: { userId: string }) {
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [selectedId, setSelectedId] = useState(TEMPLATES[0].id);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const selected = useMemo(() => TEMPLATES.find(template => template.id === selectedId) || TEMPLATES[0], [selectedId]);
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
            const template = TEMPLATES.find(entry => entry.id === data.templateId);
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
      await deleteDoc(doc(db, 'academyCreatorWorkbooks', userId + '_' + selected.id));
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
      <span className="rounded-full border border-white/10 px-3 py-1 text-[10px] text-white/45">{TEMPLATES.length} workbooks</span>
    </div>
    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
      {TEMPLATES.map(template => <button key={template.id} type="button" onClick={() => { setSelectedId(template.id); setNotice(''); setError(''); }} className={'rounded-xl border p-3 text-left transition-colors ' + (selectedId === template.id ? 'border-violet-400/40 bg-violet-500/10' : 'border-white/10 bg-white/[0.02] hover:border-white/20')}>
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
