import React from 'react';
import { ShieldCheck, X } from 'lucide-react';
import { User } from '../types';

interface PublicAccountSetupProps {
  user: User;
  onCancel?: () => void;
  onSwitchToEmailSignup: () => void;
}

export default function PublicAccountSetup({ user, onCancel, onSwitchToEmailSignup }: PublicAccountSetupProps) {
  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center overflow-y-auto bg-[#050914]/95 p-4 backdrop-blur-xl">
      <section role="dialog" aria-modal="true" aria-labelledby="public-account-setup-title" aria-describedby="public-account-setup-description" className="relative w-full max-w-md rounded-3xl border border-violet-400/20 bg-[#0B1424] p-6 text-center shadow-2xl sm:p-8">
        {onCancel && <button type="button" onClick={onCancel} aria-label="Not now" className="absolute right-4 top-4 rounded-full p-2 text-slate-400 transition hover:bg-white/10 hover:text-white"><X className="h-4 w-4" /></button>}
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl border border-violet-400/20 bg-violet-500/10 text-violet-200"><ShieldCheck className="h-7 w-7" /></div>
        <p className="mb-2 text-xs font-bold uppercase tracking-[0.25em] text-violet-300">Secure your NEXORA account</p>
        <h1 id="public-account-setup-title" className="text-2xl font-black text-white">Keep your profile yours.</h1>
        <p id="public-account-setup-description" className="mt-3 text-sm leading-relaxed text-slate-300">
          {user.name && user.name !== 'NEXORA Member' ? `Your profile is currently signed in as ${user.name}. ` : ''}
          Connect email and password, Google, or a verified phone number so you can recover this same account on another device.
        </p>
        <button type="button" onClick={onSwitchToEmailSignup} className="mt-6 w-full rounded-xl bg-violet-600 px-4 py-3.5 text-sm font-bold text-white transition hover:bg-violet-500">
          Continue with email, Google or phone
        </button>
        {onCancel && <button type="button" onClick={onCancel} className="mt-3 w-full rounded-xl px-4 py-2 text-xs font-semibold text-slate-400 transition hover:bg-white/5 hover:text-white">Not now, keep browsing</button>}
      </section>
    </div>
  );
}
