import React, { useEffect, useState } from 'react';
import { httpsCallable } from 'firebase/functions';
import { X, ShieldCheck, AlertCircle, Loader2 } from 'lucide-react';
import { functions } from '../lib/firebase';

type Preview = {
  hasLineage: boolean;
  credentialState: 'absent' | 'verified' | 'untrusted' | 'invalid' | 'unsupported' | 'pending';
  credentialValidationCodes: string[];
  attribution: { sourceAssetId: string; creatorUid: string; permissionSnapshot: string }[];
};

const credentialLabel: Record<Preview['credentialState'], string> = {
  verified: 'Trusted credential',
  untrusted: 'Valid credential, signer not trusted',
  invalid: 'Credential validation failed',
  absent: 'No embedded credential found',
  unsupported: 'Credential could not be inspected',
  pending: 'Credential inspection pending',
};

export default function OriginAttributionPreviewModal({ assetId, onClose }: { assetId: string; onClose: () => void }) {
  const [preview, setPreview] = useState<Preview | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const getPreview = httpsCallable(functions, 'getMyOriginAttributionPreview');
        const result = await getPreview({ assetId });
        if (active) setPreview(result.data as Preview);
      } catch {
        if (active) setError('Origin attribution is not available for this media yet.');
      } finally {
        if (active) setLoading(false);
      }
    };
    void load();
    return () => { active = false; };
  }, [assetId]);

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm" role="presentation" onClick={onClose}>
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="origin-post-preview-title"
        className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-violet-400/20 bg-[#090714] p-5 shadow-2xl shadow-black/50"
        onClick={event => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 id="origin-post-preview-title" className="flex items-center gap-2 text-sm font-bold text-white"><ShieldCheck className="h-4 w-4 text-violet-300" /> NEXORA Origin</h2>
            <p className="mt-1 text-[11px] text-zinc-400">Saved attribution for this uploaded post media</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close Origin attribution preview" className="rounded-lg p-2 text-zinc-400 hover:bg-white/10 hover:text-white"><X className="h-4 w-4" /></button>
        </div>
        {loading ? <p role="status" className="mt-5 flex items-center gap-2 text-xs text-zinc-400"><Loader2 className="h-4 w-4 animate-spin" />Loading the saved provenance record…</p>
          : error ? <p role="alert" className="mt-5 flex items-center gap-2 text-xs text-rose-300"><AlertCircle className="h-4 w-4" />{error}</p>
            : preview && <>
              <div className="mt-4 rounded-xl border border-white/10 bg-white/[0.03] p-3">
                <p className="text-[10px] font-bold uppercase tracking-wide text-zinc-400">Credential inspection</p>
                <p className={`mt-1 text-xs font-semibold ${preview.credentialState === 'verified' ? 'text-emerald-300' : preview.credentialState === 'invalid' ? 'text-rose-300' : preview.credentialState === 'untrusted' ? 'text-amber-300' : 'text-zinc-200'}`}>{credentialLabel[preview.credentialState]}</p>
                <p className="mt-2 text-[10px] leading-relaxed text-zinc-500">A credential check is not proof that depicted events are true or that the uploader owns the rights. Missing credentials do not imply misconduct.</p>
                {preview.credentialValidationCodes.length > 0 && <p className="mt-2 break-all text-[10px] text-zinc-500">Validation: {preview.credentialValidationCodes.join(', ')}</p>}
              </div>
              <div className="mt-3 space-y-2">
                <p className="text-[10px] font-bold uppercase tracking-wide text-zinc-400">Recorded remix lineage</p>
                {!preview.hasLineage || preview.attribution.length === 0
                  ? <p className="text-xs text-zinc-500">No remix lineage is recorded for this media.</p>
                  : preview.attribution.map((item, index) => <div key={item.sourceAssetId + index} className="rounded-lg border border-violet-400/15 bg-violet-500/5 p-3 text-[11px] text-zinc-300"><p className="break-all">Source asset: {item.sourceAssetId}</p><p className="mt-1 break-all">Original creator: {item.creatorUid}</p><p className="mt-1">Permission: {item.permissionSnapshot}</p></div>)}
              </div>
            </>}
      </section>
    </div>
  );
}
