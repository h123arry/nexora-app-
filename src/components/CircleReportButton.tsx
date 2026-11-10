import React, { useState } from 'react';
import { Flag, Send, X } from 'lucide-react';
import { CommunityService } from '../services/firebase/communityService';

export default function CircleReportButton({
  communityId,
  targetType,
  targetId,
}: {
  communityId: string;
  targetType: 'member' | 'post' | 'message';
  targetId: string;
}) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (saving || reason.trim().length < 10) return;
    setSaving(true);
    setError('');
    try {
      await CommunityService.reportContent(communityId, targetType, targetId, reason);
      setSubmitted(true);
      setOpen(false);
      setReason('');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Your report could not be submitted.');
    } finally {
      setSaving(false);
    }
  };

  if (submitted) return <span className="text-[10px] font-medium text-emerald-300/70">Report received</span>;

  return <div className="space-y-2">
    <button type="button" onClick={() => setOpen(value => !value)}
      className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[10px] font-semibold text-white/40 hover:bg-white/5 hover:text-white/75">
      {open ? <X size={11}/> : <Flag size={11}/>} {open ? 'Cancel' : 'Report'}
    </button>
    {open && <form onSubmit={submit} className="min-w-0 space-y-2 rounded-xl border border-rose-400/15 bg-rose-950/10 p-3">
      <label className="block text-[10px] font-bold text-rose-100/75">Why should the Circle moderators review this?</label>
      <textarea value={reason} onChange={event => setReason(event.target.value)} rows={3} maxLength={1000}
        placeholder="Describe the safety or conduct concern..." className="w-full resize-y rounded-lg border border-white/10 bg-black/30 p-2 text-xs text-white placeholder:text-white/30 focus:border-rose-300/30 focus:outline-none"/>
      {error && <p role="alert" className="text-[10px] text-rose-200">{error}</p>}
      <div className="flex items-center justify-between gap-2">
        <span className="text-[9px] text-white/30">{reason.trim().length}/1,000 · minimum 10</span>
        <button type="submit" disabled={saving || reason.trim().length < 10}
          className="inline-flex items-center gap-1 rounded-lg bg-rose-500/80 px-3 py-2 text-[10px] font-bold text-white disabled:opacity-30">
          <Send size={10}/>{saving ? 'Sending…' : 'Submit report'}
        </button>
      </div>
    </form>}
  </div>;
}
