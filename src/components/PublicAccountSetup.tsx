import React, { useState } from 'react';
import { User } from '../types';
import { checkUsernameStatus } from '../utils/username';
import { AuthService } from '../services/firebase/authService';

interface PublicAccountSetupProps {
  user: User;
  onComplete: (user: User) => void;
}

export default function PublicAccountSetup({ user, onComplete }: PublicAccountSetupProps) {
  const [mode, setMode] = useState<'signup' | 'login'>('signup');
  const [name, setName] = useState(user.name === 'NEXORA Member' ? '' : user.name);
  const [dateOfBirth, setDateOfBirth] = useState(user.dateOfBirth || '');
  const [username, setUsername] = useState(user.username.startsWith('member_') ? '' : user.username);
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submitSignup = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    const cleanName = name.trim();
    const cleanUsername = username.trim().toLowerCase().replace(/^@/, '');
    if (cleanName.length < 2 || cleanName.length > 80) {
      setError('Your preferred name must be between 2 and 80 characters.');
      return;
    }
    const usernameStatus = checkUsernameStatus(cleanUsername, user.id);
    if (usernameStatus.status !== 'available' && cleanUsername !== user.username) {
      setError(usernameStatus.message);
      return;
    }
    if (!/^\\d{4}-\\d{2}-\\d{2}$/.test(dateOfBirth)) {
      setError('Please enter a valid date of birth.');
      return;
    }
    const birthDate = new Date(dateOfBirth + 'T00:00:00');
    const today = new Date();
    const age = today.getFullYear() - birthDate.getFullYear()
      - (today < new Date(today.getFullYear(), birthDate.getMonth(), birthDate.getDate()) ? 1 : 0);
    if (!Number.isFinite(birthDate.getTime()) || birthDate > today || age < 13 || age > 120) {
      setError('You must be at least 13 years old and enter a valid date of birth.');
      return;
    }
    if (password.length < 8) {
      setError('Your password must contain at least 8 characters.');
      return;
    }

    setBusy(true);
    try {
      const result = await AuthService.completeUsernameRegistration({
        username: cleanUsername,
        password,
        preferredName: cleanName,
        dateOfBirth,
      });
      onComplete({ ...result.user, name: cleanName, username: cleanUsername, dateOfBirth });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'We could not create your account. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const submitLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    const cleanUsername = username.trim().toLowerCase().replace(/^@/, '');
    if (!cleanUsername || !password) {
      setError('Enter your username and password to log in.');
      return;
    }
    setBusy(true);
    try {
      const result = await AuthService.loginWithUsername(cleanUsername, password, true);
      onComplete(result.user);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'We could not log you in. Please check your details and try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center overflow-y-auto bg-[#050914]/95 p-4 backdrop-blur-xl">
      <section className="relative w-full max-w-md rounded-3xl border border-violet-400/20 bg-[#0B1424] p-6 shadow-2xl sm:p-8">
        <div className="mb-6 text-center">
          <p className="mb-2 text-xs font-bold uppercase tracking-[0.25em] text-violet-300">Welcome to NEXORA</p>
          <h1 className="text-2xl font-black text-white">{mode === 'signup' ? 'Create your account' : 'Welcome back'}</h1>
          <p className="mt-2 text-sm text-slate-300">
            {mode === 'signup'
              ? 'Four details. Then you are straight into NEXORA.'
              : 'Log in with your NEXORA username and password.'}
          </p>
        </div>

        <form onSubmit={mode === 'signup' ? submitSignup : submitLogin}>
          {mode === 'signup' && (
            <>
              <label htmlFor="nexora-preferred-name" className="mb-2 block text-xs font-semibold text-slate-200">Preferred name</label>
              <input id="nexora-preferred-name" value={name} onChange={event => setName(event.target.value)} maxLength={80} autoComplete="name" required placeholder="What should people call you?" className="mb-4 w-full rounded-xl border border-white/10 bg-[#101B2E] px-4 py-3 text-sm text-white outline-none focus:border-violet-500" />

              <label htmlFor="nexora-date-of-birth" className="mb-2 block text-xs font-semibold text-slate-200">Date of birth</label>
              <input id="nexora-date-of-birth" type="date" value={dateOfBirth} onChange={event => setDateOfBirth(event.target.value)} max={new Date().toISOString().slice(0, 10)} required className="mb-1 w-full rounded-xl border border-white/10 bg-[#101B2E] px-4 py-3 text-sm text-white outline-none focus:border-violet-500" />
              <p className="mb-4 text-[11px] text-slate-400">Your date of birth is private and will not appear on your profile.</p>
            </>
          )}

          <label htmlFor="nexora-username" className="mb-2 block text-xs font-semibold text-slate-200">Username</label>
          <div className="mb-4 flex items-center rounded-xl border border-white/10 bg-[#101B2E] px-4 focus-within:border-violet-500">
            <span className="text-violet-300">@</span>
            <input id="nexora-username" value={username} onChange={event => setUsername(event.target.value.toLowerCase().replace(/\\s/g, ''))} maxLength={20} autoComplete="username" required placeholder="yourusername" className="w-full bg-transparent px-2 py-3 text-sm text-white outline-none" />
          </div>

          <label htmlFor="nexora-password" className="mb-2 block text-xs font-semibold text-slate-200">Password</label>
          <input id="nexora-password" type="password" value={password} onChange={event => setPassword(event.target.value)} minLength={mode === 'signup' ? 8 : undefined} autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} required placeholder={mode === 'signup' ? 'Create a password (at least 8 characters)' : 'Enter your password'} className="mb-5 w-full rounded-xl border border-white/10 bg-[#101B2E] px-4 py-3 text-sm text-white outline-none focus:border-violet-500" />

          {error && <p role="alert" className="mb-4 rounded-xl border border-red-400/20 bg-red-500/10 p-3 text-xs text-red-200">{error}</p>}

          <button disabled={busy} type="submit" className="w-full rounded-xl bg-violet-600 px-4 py-3.5 text-sm font-bold text-white transition hover:bg-violet-500 disabled:cursor-wait disabled:opacity-60">
            {busy ? (mode === 'signup' ? 'Creating your account…' : 'Logging you in…') : (mode === 'signup' ? 'Create account' : 'Log in')}
          </button>
        </form>

        <p className="mt-5 text-center text-xs text-slate-400">
          {mode === 'signup' ? 'Already have a NEXORA account?' : 'New to NEXORA?'}{' '}
          <button type="button" disabled={busy} onClick={() => { setMode(mode === 'signup' ? 'login' : 'signup'); setPassword(''); setError(''); }} className="font-bold text-violet-300 hover:text-white disabled:opacity-50">
            {mode === 'signup' ? 'Log in' : 'Create account'}
          </button>
        </p>
        <p className="mt-3 text-center text-[11px] text-slate-500">Your username is your sign-in ID. Keep your password private.</p>
      </section>
    </div>
  );
}
