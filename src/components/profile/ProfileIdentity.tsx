import React from 'react';
import { Sparkles } from 'lucide-react';
import PurpleVerifiedBadge from '../VohVerifiedBadge';

interface ProfileIdentityProps {
  currentUser: any;
  isOwnProfile: boolean;
  isFollowing: boolean;
  setProfilePicExpanded: (value: boolean) => void;
  setActivePanel: (panel: string) => void;
  setIsFollowing: (value: boolean) => void;
  onToggleFollow?: (id: string) => void;
  onStartChat?: (id: string) => void;
  onOpenVohAi?: () => void;
}

export default function ProfileIdentity({
  currentUser,
  isOwnProfile,
  isFollowing,
  setProfilePicExpanded,
  setActivePanel,
  setIsFollowing,
  onToggleFollow,
  onStartChat,
  onOpenVohAi,
}: ProfileIdentityProps) {
  return (
    <div className="flex items-start gap-3 mb-2">

      {/* Avatar */}
      <div className="relative shrink-0">

        {currentUser.hasStory && (
          <div className="absolute -inset-1 rounded-full bg-gradient-to-tr from-violet-600 via-fuchsia-500 to-pink-500 blur-[3px] opacity-90 animate-pulse" />
        )}

        <button
          type="button"
          onClick={() => setProfilePicExpanded(true)}
          className="relative z-10 w-[72px] h-[72px] rounded-full overflow-hidden border border-white/10 bg-black cursor-pointer transition-all duration-300 hover:scale-[1.03] active:scale-[0.98]"
        >
          <img
            src={currentUser.avatar}
            alt={currentUser.name}
            className="w-full h-full object-cover"
            referrerPolicy="no-referrer"
          />
        </button>

      </div>

      {/* Identity */}
      <div className="flex-1 min-w-0">

        <div className="flex items-center gap-1.5">

          <h1 className="text-[19px] font-black text-white truncate tracking-tight leading-none">
            {currentUser.name}
          </h1>

          {currentUser.isVerified && (
            <PurpleVerifiedBadge
              className="w-4 h-4 shrink-0"
              type="founder"
            />
          )}

        </div>

        <p className="mt-1 text-[11px] font-medium tracking-wide text-violet-400">
          @{currentUser.username}
        </p>

        {/* OWNER PROFILE */}
        {isOwnProfile ? (

<div className="flex items-center gap-1.5 mt-2">

            <button
              onClick={onOpenVohAi}
className="group h-7 px-3 rounded-lg border border-violet-500/40 bg-gradient-to-r from-violet-600/15 to-fuchsia-600/10 hover:from-violet-600/25 hover:to-fuchsia-600/20 text-violet-100 text-xs font-bold flex items-center gap-1.5 transition-all duration-300 shadow-[0_0_18px_rgba(139,92,246,0.30)] hover:shadow-[0_0_26px_rgba(139,92,246,0.45)] active:scale-[0.97]"
            >
              <Sparkles className="w-3.5 h-3.5 transition-transform duration-300 group-hover:rotate-12" />
              <span>VOH AI</span>
            </button>

            <button
              onClick={() => setActivePanel('edit-profile')}
              className="h-8 px-3 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 text-white text-xs font-semibold transition-all duration-300 active:scale-[0.97]"
            >
              Edit
            </button>

          </div>

        ) : (

          /* VISITOR PROFILE */

<div className="flex items-center gap-1.5 mt-2">

            <button
              onClick={() => {
                setIsFollowing(!isFollowing);
                onToggleFollow?.(currentUser.id);
              }}
className={`h-7 px-3 rounded-lg text-xs font-semibold transition-all duration-300 active:scale-[0.97] ${
                isFollowing
                  ? 'bg-white/5 border border-white/10 text-white hover:bg-white/10'
                  : 'bg-violet-600 hover:bg-violet-500 text-white shadow-[0_0_16px_rgba(139,92,246,0.35)]'
              }`}
            >
              {isFollowing ? 'Following' : 'Follow'}
            </button>

            <button
              onClick={() => onStartChat?.(currentUser.id)}
className="h-7 px-3 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 text-white text-xs font-semibold transition-all duration-300 active:scale-[0.97]"
            >
              Message
            </button>

            <button
              type="button"
              onClick={() => setActivePanel('other-profile-menu')}
className="h-8 w-8 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 hover:border-violet-500/40 hover:text-violet-300 text-white flex items-center justify-center transition-all duration-300 active:scale-[0.95]"
              aria-label="More Options"
              title="More"
            >
              <span className="text-[12px] font-black leading-none">▼</span>
            </button>

          </div>

        )}

      </div>

    </div>
  );
}
