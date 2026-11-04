import React from 'react';
import { getTranslations } from '../utils/translations';
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
  'voh-workspace': 'matrix',
  events: 'matrix',
};

function getServices(copy: ReturnType<typeof getTranslations>) {
  return [
    { id: 'world-pulse', title: copy.miniWorldPulseTitle, description: copy.miniWorldPulseDescription, category: copy.miniCategoryDiscover },
    { id: 'circles', title: copy.miniCirclesTitle, description: copy.miniCirclesDescription, category: copy.miniCategoryConnect },
    { id: 'creator-channel', title: copy.miniCreatorChannelsTitle, description: copy.miniCreatorChannelsDescription, category: copy.miniCategoryCreators },
    { id: 'business-services', title: copy.miniBusinessServicesTitle, description: copy.miniBusinessServicesDescription, category: copy.miniCategoryBusiness },
    { id: 'events', title: copy.miniEventsTitle, description: copy.miniEventsDescription, category: copy.miniCategoryDiscover },
    { id: 'messaging', title: copy.miniMessagingTitle, description: copy.miniMessagingDescription, category: copy.miniCategoryConnect },
    { id: 'saved-library', title: copy.miniSavedLibraryTitle, description: copy.miniSavedLibraryDescription, category: copy.miniCategoryPersonal },
    { id: 'voh-workspace', title: copy.miniVohWorkspaceTitle, description: copy.miniVohWorkspaceDescription, category: copy.miniCategoryTools },
  ] as const;
}

interface Props {
  onOpen: (tab: string) => void;
  signedIn: boolean;
  onOpenVohAi: () => void;
  locale?: string;
}

export default function MiniServicesHub({ onOpen, signedIn, onOpenVohAi, locale = 'en' }: Props) {
  const copy = getTranslations(locale);
  const services = getServices(copy);
  return <section className="space-y-3" aria-labelledby="mini-services-title">
    <div className="flex items-end justify-between gap-3 px-1">
      <div><p className="text-[10px] font-mono uppercase tracking-[0.2em] text-violet-400">{copy.miniEcosystem}</p><h2 id="mini-services-title" className="text-lg font-bold text-white">{copy.miniServicesTitle}</h2><p className="text-xs text-slate-400">{copy.miniServicesDescription}</p></div>
      <CircleDot className="h-5 w-5 text-violet-300" aria-hidden="true" />
    </div>
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      {services.map(service => {
        const Icon = ICONS[service.id];
        return <button key={service.id} type="button" disabled={!signedIn} onClick={() => service.id === 'voh-workspace' ? onOpenVohAi() : onOpen(SERVICE_ROUTES[service.id])}
          className="group min-h-32 rounded-2xl border border-violet-400/15 bg-[#0b1020] p-3 text-left transition-colors hover:border-violet-400/40 hover:bg-violet-500/[0.06] disabled:cursor-not-allowed disabled:opacity-50">
          <span className="mb-3 inline-flex h-9 w-9 items-center justify-center rounded-xl bg-violet-500/15 text-violet-200"><Icon className="h-4 w-4" aria-hidden="true" /></span>
          <span className="block text-[9px] font-mono uppercase tracking-wider text-violet-300/70">{service.category}</span>
          <span className="mt-1 block text-sm font-bold text-white">{service.title}</span>
          <span className="mt-1 block text-[10px] leading-relaxed text-slate-400">{service.description}</span>
        </button>;
      })}
    </div>
    {!signedIn && <p className="text-xs text-slate-400">{copy.miniServicesSignIn}</p>}
  </section>;
}
