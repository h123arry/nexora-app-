import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Download, Bookmark, Copy, Share2, Flag, EyeOff, UserMinus, Eye, Settings, Play, Check, ChevronRight, MessageCircle, Heart, Zap, Music } from 'lucide-react';

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

              <h3 className="text-lg font-semibold text-white my-4">External Sharing</h3>
              <div className="grid grid-cols-4 gap-4 mb-6">
                {['Copy', 'WhatsApp', 'Telegram', 'More'].map(app => (
                  <button key={app} className="flex flex-col items-center gap-2">
                    <div className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center text-white">
                      <Share2 className="w-6 h-6" />
                    </div>
                    <span className="text-xs text-zinc-400">{app}</span>
                  </button>
                ))}
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

              <ActionRow icon={UserMinus} title="View Profile" onClick={onViewProfile} />
              <ActionRow icon={Check} title={isFollowing ? "Unfollow" : "Follow"} onClick={onFollowToggle} />
            </div>
            
            <div className="h-8" />
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
