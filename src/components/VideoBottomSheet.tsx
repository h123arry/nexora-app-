import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Download, Bookmark, Copy, Share2, Flag, EyeOff, User, Eye, Settings, Play, Check, ChevronRight, MessageCircle, Heart, Zap, Music } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  post: any;
  onDownload: () => void;
  onSave: () => void;
  onShare: () => void;
  onReport: () => void;
  onNotInterested: () => void;
  onViewProfile: () => void;
  onFollowToggle: () => void;
  isFollowing: boolean;
}

export default function VideoBottomSheet({ isOpen, onClose, post, onDownload, onSave, onShare, onReport, onNotInterested, onViewProfile, onFollowToggle, isFollowing }: Props) {
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);
  const speeds = [0.5, 1, 1.25, 1.5, 2];

  const ActionRow = ({ icon: Icon, title, onClick, subtitle, rightElement }: any) => (
    <button onClick={onClick} className="w-full flex items-center justify-between p-4 hover:bg-white/5 rounded-2xl transition-colors">
      <div className="flex items-center gap-4">
        <Icon className="w-5 h-5 text-zinc-300" />
        <div className="text-left">
          <p className="text-sm font-medium text-white">{title}</p>
          {subtitle && <p className="text-xs text-zinc-500">{subtitle}</p>}
        </div>
      </div>
      {rightElement || <ChevronRight className="w-4 h-4 text-zinc-600" />}
    </button>
  );

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/70 z-40 backdrop-blur-sm"
          />
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="absolute bottom-0 inset-x-0 bg-zinc-900/90 border-t border-white/10 rounded-t-3xl z-50 shadow-md backdrop-blur-2xl max-h-[90vh] overflow-y-auto"
          >
            <div className="w-12 h-1.5 bg-white/20 rounded-full mx-auto my-3" />
            
            <div className="p-5">
              <h3 className="text-lg font-semibold text-white mb-4">Share with Friends</h3>
              
              {/* Friends Row */}
              <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
                {[1,2,3,4,5,6].map(i => (
                  <button key={i} className="flex flex-col items-center gap-2 min-w-[70px]">
                    <div className="w-14 h-14 rounded-full bg-gradient-to-tr from-violet-500 to-indigo-500 p-0.5">
                      <div className="w-full h-full rounded-full bg-zinc-900 flex items-center justify-center text-white">U</div>
                    </div>
                    <span className="text-xs text-zinc-300 truncate w-full text-center">User {i}</span>
                  </button>
                ))}
              </div>

              <h3 className="text-sm font-bold font-mono tracking-wider uppercase text-zinc-400 my-3">Share</h3>
              <div className="grid grid-cols-4 gap-3 mb-6">
                <button
                  onClick={() => {
                    const url = window.location.href;
                    navigator.clipboard.writeText(url);
                    window.dispatchEvent(new CustomEvent('toast', { detail: '🔗 Link copied to clipboard.' }));
                  }}
                  className="flex flex-col items-center gap-2 group cursor-pointer"
                >
                  <div className="w-13 h-13 rounded-2xl bg-white/5 group-hover:bg-white/10 border border-white/10 flex items-center justify-center text-zinc-200 transition-all">
                    <Copy className="w-5 h-5" />
                  </div>
                  <span className="text-[11px] font-medium text-zinc-400 group-hover:text-white">Copy Link</span>
                </button>

                <button
                  onClick={() => {
                    const url = window.location.href;
                    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(`Check out this post on Nexora: ${url}`)}`, '_blank');
                  }}
                  className="flex flex-col items-center gap-2 group cursor-pointer"
                >
                  <div className="w-13 h-13 rounded-2xl bg-[#25D366]/15 group-hover:bg-[#25D366]/25 border border-[#25D366]/30 flex items-center justify-center text-[#25D366] transition-all">
                    <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                      <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/>
                    </svg>
                  </div>
                  <span className="text-[11px] font-medium text-emerald-400">WhatsApp</span>
                </button>

                <button
                  onClick={() => {
                    const url = window.location.href;
                    window.open(`https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent('Check out this video on Nexora!')}`, '_blank');
                  }}
                  className="flex flex-col items-center gap-2 group cursor-pointer"
                >
                  <div className="w-13 h-13 rounded-2xl bg-[#229ED9]/15 group-hover:bg-[#229ED9]/25 border border-[#229ED9]/30 flex items-center justify-center text-[#229ED9] transition-all">
                    <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                      <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
                    </svg>
                  </div>
                  <span className="text-[11px] font-medium text-sky-400">Telegram</span>
                </button>

                <button
                  onClick={onShare}
                  className="flex flex-col items-center gap-2 group cursor-pointer"
                >
                  <div className="w-13 h-13 rounded-2xl bg-violet-500/15 group-hover:bg-violet-500/25 border border-violet-500/30 flex items-center justify-center text-violet-400 transition-all">
                    <Share2 className="w-5 h-5" />
                  </div>
                  <span className="text-[11px] font-medium text-violet-300">More</span>
                </button>
              </div>
              
              <div className="h-px bg-white/10 my-4" />

              {/* Actions */}
              <ActionRow icon={Download} title="Download Video" onClick={onDownload} />
              <ActionRow icon={Bookmark} title="Save to Collection" onClick={onSave} />
              <ActionRow icon={Flag} title="Report" onClick={onReport} />
              <ActionRow icon={EyeOff} title="Not Interested" onClick={onNotInterested} />
              
              {/* Playback Speed */}
              <div className="p-4 bg-white/5 rounded-2xl my-2">
                <p className="text-xs text-zinc-400 font-medium mb-3">Playback Speed</p>
                <div className="flex gap-2">
                  {speeds.map(s => (
                    <button 
                      key={s} 
                      onClick={() => setPlaybackSpeed(s)}
                      className={`flex-1 py-2 rounded-xl text-xs font-semibold transition-all ${playbackSpeed === s ? 'bg-violet-600 text-white shadow-lg shadow-violet-900/50' : 'bg-white/10 text-zinc-400 hover:bg-white/20'}`}
                    >
                      {s}x
                    </button>
                  ))}
                </div>
              </div>

              <ActionRow icon={User} title="View Profile" onClick={onViewProfile} />
              <ActionRow icon={Check} title={isFollowing ? "Unfollow" : "Follow"} onClick={onFollowToggle} />
            </div>
            
            <div className="h-8" />
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
