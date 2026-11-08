import React from 'react';
import { Target, ShieldAlert } from 'lucide-react';
import { User } from '../types';

interface SocialMissionsViewProps {
  currentUser: User;
  onAddLogAlert?: (type: string, message: string) => void;
}

export default function SocialMissionsView(_props: SocialMissionsViewProps) {
  return (
    <section id="social-missions-layout" className="mx-auto max-w-2xl rounded-3xl border border-white/10 bg-[#090714] p-6 text-center">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-violet-400/20 bg-violet-500/10 text-violet-300">
        <Target className="h-7 w-7" />
      </div>
      <h2 className="mt-4 text-lg font-bold text-white">Social Missions</h2>
      <p className="mt-2 text-sm leading-6 text-violet-100/65">
        Community missions are not available yet. There is currently no server-backed campaign catalogue or verified contribution ledger.
      </p>
      <div className="mt-5 flex items-start gap-2 rounded-xl border border-amber-400/15 bg-amber-500/5 p-3 text-left text-xs leading-5 text-amber-100/75">
        <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
        <span>No sample campaigns, invented member totals, or simulated rewards are displayed. Mission participation will return when contributions can be securely recorded and verified across devices.</span>
      </div>
    </section>
  );
}
