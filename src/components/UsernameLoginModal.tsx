import React, { useState } from 'react';
import { X } from 'lucide-react';

interface UsernameLoginModalProps {
  onClose: () => void;
  onLogin: (username: string, password: string) => Promise<void>;
}

export default function UsernameLoginModal({ onClose, onLogin }: UsernameLoginModalProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!username.trim() || !password) { setError('Enter your username and password.'); return; }
    setBusy(true);
    setError('');
    try { await onLogin(username.trim(), password); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'We could not sign you in. Check your details and try again.'); }
    finally { setBusy(false); }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#050914]/95 p-4 backdrop-blur-xl">
      <form onSubmit={submit} className="relative w-full max-w-md rounded-3xl border border-violet-400/20 bg-[#0B1424] p-6 shadow-2xl sm:p-8">
        <button type="button" onClick={onClose} aria-label="Close login" className="absolute right-4 top-4 rounded-full p-2 text-slate-400 hover:bg-white/10 hover:text-white"><X className="h-4 w-4" /></button>
        <p className="mb-2 text-center text-xs font-bold uppercase tracking-[0.25em] text-violet-300">Welcome back</p>
        <h1 className="text-center text-2xl font-black text-white">Log in to NEXORA</h1>
        <p className="mb-6 mt-2 text-center text-sm text-slate-300">Your account and conversations are waiting.</p>
        <label className="mb-2 block text-xs font-semibold text-slate-200">Username</label>
        <div className="mb-4 flex items-center rounded-xl border border-white/10 bg-[#101B2E] px-4 focus-within:border-violet-500">
          <span className="text-violet-300">@</span>
          <input value={username} onChange={event => setUsername(event.target.value.toLowerCase().replace(/\s/g, ''))} autoComplete="username" required maxLength={20} placeholder="yourusername" className="w-full bg-transparent px-2 py-3 text-sm text-white outline-none" />
        </div>
        <label className="mb-2 block text-xs font-semibold text-slate-200">Password</label>
        <input type="password" value={password} onChange={event => setPassword(event.target.value)} autoComplete="current-password" required placeholder="Your password" className="mb-5 w-full rounded-xl border border-white/10 bg-[#101B2E] px-4 py-3 text-sm text-white outline-none focus:border-violet-500" />
        {error && <p role="alert" className="mb-4 rounded-xl border border-red-400/20 bg-red-500/10 p-3 text-xs text-red-200">{error}</p>}
        <button disabled={busy} type="submit" className="w-full rounded-xl bg-violet-600 px-4 py-3.5 text-sm font-bold text-white hover:bg-violet-500 disabled:cursor-wait disabled:opacity-60">{busy ? 'Logging in…' : 'Log in'}</button>
      </form>
    </div>
  );
}
