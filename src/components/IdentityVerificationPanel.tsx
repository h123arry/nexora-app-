import React, { useCallback, useEffect, useRef, useState } from 'react';
import { httpsCallable } from 'firebase/functions';
import { CheckCircle2, Clock3, ShieldCheck, AlertCircle, ExternalLink } from 'lucide-react';
import { functions } from '../lib/firebase';

type IdentityType = 'individual' | 'creator' | 'public_figure' | 'organization';
type Application = {
  status: string;
  identityType: IdentityType;
  displayName: string;
  evidenceSummary: string;
  evidenceUrls: string[];
  reviewNote: string;
  version: number;
};

interface Props { initialDisplayName: string; userId: string; }

export default function IdentityVerificationPanel({ initialDisplayName, userId }: Props) {
  const [application, setApplication] = useState<Application | null>(null);
  const [identityType, setIdentityType] = useState<IdentityType>('creator');
  const [displayName, setDisplayName] = useState(initialDisplayName);
  const [evidenceSummary, setEvidenceSummary] = useState('');
  const [evidenceLinks, setEvidenceLinks] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const refreshGeneration = useRef(0);

  const refresh = useCallback(async () => {
    const generation = ++refreshGeneration.current;
    setLoading(true);
    try {
      const callable = httpsCallable<undefined, { application: Application | null }>(functions, 'getMyIdentityVerificationApplication');
      const result = await callable();
      if (generation !== refreshGeneration.current) return;
      const next = result.data.application;
      setApplication(next);
      if (next) {
        setIdentityType(next.identityType);
        setDisplayName(next.displayName);
        setEvidenceSummary(next.evidenceSummary);
        setEvidenceLinks(next.evidenceUrls.join('\n'));
      } else {
        setIdentityType('creator');
        setDisplayName(initialDisplayName);
        setEvidenceSummary('');
        setEvidenceLinks('');
      }
    } catch {
      if (generation === refreshGeneration.current) {
        setError('Could not load identity review status. Try again when your connection is stable.');
      }
    } finally {
      if (generation === refreshGeneration.current) setLoading(false);
    }
  }, [initialDisplayName, userId]);

  useEffect(() => {
    void refresh();
    return () => { refreshGeneration.current += 1; };
  }, [refresh, userId]);

  const canApply = !application || ['rejected', 'needs_more_info', 'revoked'].includes(application.status);
  const evidenceCount = evidenceLinks.split('\n').map(value => value.trim()).filter(Boolean).length;
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setSuccess('');
    const evidenceUrls = evidenceLinks.split('\n').map(value => value.trim()).filter(Boolean);
    setSubmitting(true);
    try {
      const callable = httpsCallable(functions, 'submitIdentityVerificationApplication');
      await callable({ identityType, displayName, evidenceSummary, evidenceUrls });
      setSuccess('Your identity application has been submitted for review.');
      await refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'The application could not be submitted.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="rounded-2xl border border-violet-400/20 bg-[#0b0a1d] p-4 space-y-3">
      <div className="flex items-start gap-3">
        <div className="rounded-xl border border-violet-400/20 bg-violet-500/10 p-2 text-violet-300"><ShieldCheck className="h-5 w-5" /></div>
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-black text-white">Identity verification</h3>
          <p className="mt-1 text-[11px] leading-relaxed text-zinc-400">Apply for a public identity badge using official links and supporting context. Email or phone verification alone does not qualify.</p>
        </div>
      </div>

      {loading ? <p className="text-xs text-zinc-400">Checking your application…</p> : null}

      {!loading && application?.status === 'approved' ? (
        <div className="rounded-xl border border-emerald-400/20 bg-emerald-400/5 p-3">
          <div className="flex items-center gap-2 text-sm font-bold text-emerald-300"><CheckCircle2 className="h-4 w-4" /> Identity verified</div>
          <p className="mt-1 text-xs text-zinc-300">{application.displayName} is verified as {application.identityType.replace('_', ' ')}.</p>
        </div>
      ) : null}

      {!loading && application?.status === 'under_review' ? (
        <div className="rounded-xl border border-amber-400/20 bg-amber-400/5 p-3">
          <div className="flex items-center gap-2 text-sm font-bold text-amber-200"><ShieldCheck className="h-4 w-4" /> Temporary identity review hold</div>
          <p className="mt-1 text-xs text-zinc-400">A senior NEXORA reviewer has temporarily paused your public identity badge while an impersonation concern is investigated. Your account is not suspended, and you do not need to submit another application. You will be notified when the review is resolved.</p>
          {application.reviewNote ? <p className="mt-2 text-xs text-zinc-300">{application.reviewNote}</p> : null}
        </div>
      ) : null}

      {!loading && application?.status === 'pending_review' ? (
        <div className="rounded-xl border border-amber-400/20 bg-amber-400/5 p-3">
          <div className="flex items-center gap-2 text-sm font-bold text-amber-200"><Clock3 className="h-4 w-4" /> Application under review</div>
          <p className="mt-1 text-xs text-zinc-400">Your evidence is private to you and authorized NEXORA reviewers. You cannot submit another application while this one is pending.</p>
        </div>
      ) : null}

      {!loading && application && ['rejected', 'needs_more_info', 'revoked'].includes(application.status) ? (
        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
          <p className="text-xs font-bold text-white">Review update: {application.status.replaceAll('_', ' ')}</p>
          {application.reviewNote ? <p className="mt-1 text-xs text-zinc-400">{application.reviewNote}</p> : null}
          <p className="mt-1 text-[10px] text-zinc-500">You may update your evidence and submit again.</p>
        </div>
      ) : null}

      {!loading && canApply ? (
        <form onSubmit={submit} className="space-y-3">
          <label className="block space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Identity category</span>
            <select value={identityType} onChange={event => setIdentityType(event.target.value as IdentityType)} className="w-full rounded-xl border border-white/10 bg-[#121027] px-3 py-2.5 text-sm text-white">
              <option value="individual">Individual</option>
              <option value="creator">Creator</option>
              <option value="public_figure">Public figure</option>
              <option value="organization">Organization</option>
            </select>
          </label>
          <label className="block space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Public identity name</span>
            <input value={displayName} onChange={event => setDisplayName(event.target.value)} minLength={2} maxLength={120} required className="w-full rounded-xl border border-white/10 bg-[#121027] px-3 py-2.5 text-sm text-white outline-none focus:border-violet-400/60" />
          </label>
          <label className="block space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Why should this identity be verified?</span>
            <textarea value={evidenceSummary} onChange={event => setEvidenceSummary(event.target.value)} minLength={20} maxLength={1000} rows={3} required placeholder="Explain who this account represents and how the evidence connects it to the identity." className="w-full resize-y rounded-xl border border-white/10 bg-[#121027] px-3 py-2.5 text-xs text-white outline-none focus:border-violet-400/60" />
          </label>
          <label className="block space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Official evidence links (one HTTPS URL per line, up to 5)</span>
            <textarea value={evidenceLinks} onChange={event => setEvidenceLinks(event.target.value)} rows={4} required placeholder={'https://official-website.example\nhttps://verified-social-profile.example'} className="w-full resize-y rounded-xl border border-white/10 bg-[#121027] px-3 py-2.5 text-xs text-white outline-none focus:border-violet-400/60" />
            <span className="flex items-center gap-1 text-[10px] text-zinc-500"><ExternalLink className="h-3 w-3" /> Public links only. Do not upload passports, IDs, or private documents. {evidenceCount}/5 links</span>
          </label>
          <button type="submit" disabled={submitting || displayName.trim().length < 2 || evidenceSummary.trim().length < 20 || evidenceCount < 1 || evidenceCount > 5} className="w-full rounded-xl bg-violet-600 px-4 py-3 text-xs font-black text-white transition hover:bg-violet-500 disabled:opacity-50">
            {submitting ? 'Submitting…' : application ? 'Resubmit for review' : 'Submit identity application'}
          </button>
        </form>
      ) : null}

      {error ? <p role="alert" className="flex items-start gap-2 text-xs text-rose-300"><AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />{error}</p> : null}
      {success ? <p role="status" className="text-xs text-emerald-300">{success}</p> : null}
    </section>
  );
}
