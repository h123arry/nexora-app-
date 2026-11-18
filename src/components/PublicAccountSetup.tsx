import React, { useState } from 'react';
import { X } from 'lucide-react';
import { User } from '../types';
import { ProfileService } from '../services/firebase/profileService';
import { checkUsernameStatus } from '../utils/username';

interface PublicAccountSetupProps {
  user: User;
  onComplete: (user: User) => void;
  onCancel?: () => void;
}

export default function PublicAccountSetup({ user, onComplete, onCancel }: PublicAccountSetupProps) {
  const [name, setName] = useState(user.name === 'NEXORA Member' ? '' : user.name);
  const [dateOfBirth, setDateOfBirth] = useState(user.dateOfBirth || '');
  const [username, setUsername] = useState(user.username.startsWith('member_') ? '' : user.username);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    const cleanName = name.trim();
    const cleanUsername = username.trim().toLowerCase();
    if (cleanName.length < 2 || cleanName.length > 80) {
      setError('Your preferred name must be between 2 and 80 characters.');
      return;
    }
    const usernameStatus = checkUsernameStatus(cleanUsername, user.id);
    if (usernameStatus.status !== 'available' && cleanUsername !== user.username) {
      setError(usernameStatus.message);
      return;
    }
    if (!dateOfBirth) {
      setError('Please enter your date of birth.');
      return;
    }
    const birthDate = new Date(dateOfBirth + 'T00:00:00');
    const age = new Date().getFullYear() - birthDate.getFullYear()
      - (new Date() < new Date(new Date().getFullYear(), birthDate.getMonth(), birthDate.getDate()) ? 1 : 0);
    if (!Number.isFinite(birthDate.getTime()) || birthDate > new Date() || age < 13 || age > 120) {
      setError('You must be at least 13 years old and enter a valid date of birth.');
      return;
    }

    setBusy(true);
    try {
      if (cleanUsername !== user.username) {
        if (await ProfileService.checkUsernameExists(cleanUsername)) {
          throw new Error('That username is already taken. Choose another one.');
        }
        await ProfileService.reserveUsername(user.id, cleanUsername);
      }
      await ProfileService.updateProfile(user.id, {
        name: cleanName,
        username: cleanUsername,
        dateOfBirth,
      });
      onComplete({ ...user, name: cleanName, username: cleanUsername, dateOfBirth });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'We could not save your profile. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center overflow-y-auto bg-[#050914]/95 p-4 backdrop-blur-xl">
      <form onSubmit={submit} className="relative w-full max-w-md rounded-3xl border border-violet-400/20 bg-[#0B1424] p-6 shadow-2xl sm:p-8">
        {onCancel && <button type="button" onClick={onCancel} aria-label="Not now" className="absolute right-4 top-4 rounded-full p-2 text-slate-400 transition hover:bg-white/10 hover:text-white"><X className="h-4 w-4" /></button>}
        <div className="mb-6 text-center">
          <p className="mb-2 text-xs font-bold uppercase tracking-[0.25em] text-violet-300">Welcome to NEXORA</p>
          <h1 className="text-2xl font-black text-white">Make it yours.</h1>
          <p className="mt-2 text-sm text-slate-300">Choose your preferred name, date of birth and unique username. No email or password needed.</p>
        </div>
        <label className="mb-2 block text-xs font-semibold text-slate-200">Preferred name</label>
        <input value={name} onChange={event => setName(event.target.value)} maxLength={80} autoComplete="name" required placeholder="What should people call you?" className="mb-4 w-full rounded-xl border border-white/10 bg-[#101B2E] px-4 py-3 text-sm text-white outline-none focus:border-violet-500" />
        <label className="mb-2 block text-xs font-semibold text-slate-200">Date of birth</label>
        <input type="date" value={dateOfBirth} onChange={event => setDateOfBirth(event.target.value)} max={new Date().toISOString().slice(0, 10)} required className="mb-1 w-full rounded-xl border border-white/10 bg-[#101B2E] px-4 py-3 text-sm text-white outline-none focus:border-violet-500" />
        <p className="mb-4 text-[11px] text-slate-400">Your date of birth is private and will not appear on your profile.</p>
        <label className="mb-2 block text-xs font-semibold text-slate-200">Username</label>
        <div className="mb-5 flex items-center rounded-xl border border-white/10 bg-[#101B2E] px-4 focus-within:border-violet-500">
          <span className="text-violet-300">@</span>
          <input value={username} onChange={event => setUsername(event.target.value.toLowerCase().replace(/\s/g, ''))} maxLength={20} autoComplete="username" required placeholder="yourusername" className="w-full bg-transparent px-2 py-3 text-sm text-white outline-none" />
        </div>
        {error && <p role="alert" className="mb-4 rounded-xl border border-red-400/20 bg-red-500/10 p-3 text-xs text-red-200">{error}</p>}
        <button disabled={busy} type="submit" className="w-full rounded-xl bg-violet-600 px-4 py-3.5 text-sm font-bold text-white transition hover:bg-violet-500 disabled:cursor-wait disabled:opacity-60">{busy ? 'Setting up your profile…' : 'Enter NEXORA'}</button>
        <p className="mt-4 text-center text-[11px] text-slate-500">No email, phone number or password required to get started.</p>
        {onCancel && <button type="button" onClick={onCancel} className="mt-3 w-full rounded-xl px-4 py-2 text-xs font-semibold text-slate-400 transition hover:bg-white/5 hover:text-white">Not now, keep browsing</button>}
      </form>
    </div>
  );
}
