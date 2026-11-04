import React from 'react';
import { Activity, Bookmark, BriefcaseBusiness, CalendarDays, CircleDot, MessageCircle, RadioTower, Sparkles, Users } from 'lucide-react';

export type NexoraMiniServiceId =
  | 'world-pulse' | 'circles' | 'creator-channel' | 'business-services'
  | 'saved-library' | 'messaging' | 'voh-workspace' | 'events';

const ICONS = {
  'world-pulse': Activity,
  circles: Users,
  'creator-channel': RadioTower,
  'business-services': BriefcaseBusiness,
  'saved-library': Bookmark,
  messaging: MessageCircle,
  'voh-workspace': Sparkles,
  events: CalendarDays,
} as const;

const SERVICE_ROUTES: Record<NexoraMiniServiceId, string> = {
  'world-pulse': 'pulse',
  circles: 'matrix',
  'creator-channel': 'communities',
  'business-services': 'communities',
  'saved-library': 'saved',
  messaging: 'inbox',
  'voh-workspace': 'voh',
  events: 'matrix',
};

const SERVICES: Array<{ id: NexoraMiniServiceId; title: string; description: string; category: string }> = [
  { id: 'world-pulse', title: 'World Pulse', description: 'Explore live topics and what is happening across NEXORA.', category: 'Discover' },
  { id: 'circles', title: 'Circles', description: 'Find your people, join discussions and take part in Circle life.', category: 'Connect' },
  { id: 'creator-channel', title: 'Creator channels', description: 'Follow Pages and read official updates from creators and organisations.', category: 'Creators' },
  { id: 'business-services', title: 'Business services', description: 'Explore business Pages, listed services and booking requests.', category: 'Business' },
  { id: 'events', title: 'Events', description: 'Discover and RSVP to events hosted inside your Circles.', category: 'Discover' },
  { id: 'messaging', title: 'Messaging', description: 'Continue private and group conversations in your inbox.', category: 'Connect' },
  { id: 'saved-library', title: 'Saved library', description: 'Organise posts, Pages, Circles and events into private collections.', category: 'Personal' },
  { id: 'voh-workspace', title: 'VOH AI workspace', description: 'Open your connected AI workspace and saved conversations.', category: 'Tools' },
];

interface Props {
  onOpen: (tab: string) => void;
  signedIn: boolean;
}

export default function MiniServicesHub({ onOpen, signedIn }: Props) {
  return <section className="space-y-3" aria-labelledby="mini-services-title">
    <div className="flex items-end justify-between gap-3 px-1">
      <div><p className="text-[10px] font-mono uppercase tracking-[0.2em] text-violet-400">NEXORA ecosystem</p><h2 id="mini-services-title" className="text-lg font-bold text-white">Mini Services</h2><p className="text-xs text-slate-400">Connected tools, one account, consistent permissions.</p></div>
      <CircleDot className="h-5 w-5 text-violet-300" aria-hidden="true" />
    </div>
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      {SERVICES.map(service => {
        const Icon = ICONS[service.id];
        return <button key={service.id} type="button" disabled={!signedIn} onClick={() => onOpen(SERVICE_ROUTES[service.id])}
          className="group min-h-32 rounded-2xl border border-violet-400/15 bg-[#0b1020] p-3 text-left transition-colors hover:border-violet-400/40 hover:bg-violet-500/[0.06] disabled:cursor-not-allowed disabled:opacity-50">
          <span className="mb-3 inline-flex h-9 w-9 items-center justify-center rounded-xl bg-violet-500/15 text-violet-200"><Icon className="h-4 w-4" /></span>
          <span className="block text-[9px] font-mono uppercase tracking-wider text-violet-300/70">{service.category}</span>
          <span className="mt-1 block text-sm font-bold text-white">{service.title}</span>
          <span className="mt-1 block text-[10px] leading-relaxed text-slate-400">{service.description}</span>
        </button>;
      })}
    </div>
    {!signedIn && <p className="text-xs text-slate-400">Sign in to open NEXORA mini services.</p>}
  </section>;
}
