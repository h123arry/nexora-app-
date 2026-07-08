import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Radio, Users, MessageSquare, Heart, MoreVertical, X, Mic, Video, Camera, Settings, Eye, Clock, Calendar, Bell, Forward } from 'lucide-react';
import { User, LiveStream } from '../types';

interface LiveViewProps {
  currentUser: User;
  onClose: () => void;
}

export default function LiveView({ currentUser, onClose }: LiveViewProps) {
  const [isLive, setIsLive] = useState(false);
  const [chatMessages, setChatMessages] = useState<string[]>([]);
  const [message, setMessage] = useState('');

  return (
    <div className="fixed inset-0 z-[100] flex bg-black">
      {/* Immersive Video/Live Stream Area */}
      <div className="flex-1 relative flex items-center justify-center bg-[#0a0a0a]">
        {isLive ? (
          <div className="w-full h-full flex items-center justify-center bg-zinc-900">
            <Radio className="w-16 h-16 text-rose-500 animate-pulse" />
            <span className="absolute top-4 left-4 flex items-center gap-1.5 bg-rose-600 text-white text-[10px] font-bold px-2 py-1 rounded-md uppercase tracking-wider animate-pulse">
              Live
            </span>
          </div>
        ) : (
          <div className="text-center p-8">
            <div className="w-24 h-24 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-6">
              <Radio className="w-10 h-10 text-white/50" />
            </div>
            <h2 className="text-2xl font-black text-white mb-2">Ready to Go Live?</h2>
            <p className="text-zinc-400 mb-8 max-w-sm">Share your experience in real-time with your followers.</p>
            <button 
              onClick={() => setIsLive(true)}
              className="px-8 py-3 bg-rose-600 hover:bg-rose-500 text-white rounded-full font-bold transition-all"
            >
              Start Broadcast
            </button>
          </div>
        )}

        {/* Overlay Controls */}
        <button onClick={onClose} className="absolute top-4 right-4 p-2 bg-black/50 rounded-full hover:bg-black/70 text-white">
          <X className="w-6 h-6" />
        </button>
      </div>

      {/* Live Chat Panel */}
      <div className="w-80 border-l border-white/5 bg-[#030112] flex flex-col">
        <div className="p-4 border-b border-white/5 flex items-center justify-between">
          <h3 className="font-bold text-white">Live Chat</h3>
          <div className="flex items-center gap-1.5 text-zinc-400 text-xs">
            <Eye className="w-3.5 h-3.5" />
            <span>{isLive ? '1.2k' : '0'}</span>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {chatMessages.map((msg, i) => (
            <div key={i} className="text-sm text-white">
              <span className="font-bold text-violet-400 mr-2">{currentUser.username}:</span>
              {msg}
            </div>
          ))}
        </div>

        {isLive && (
          <div className="p-4 border-t border-white/5">
            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && message.trim()) {
                  setChatMessages([...chatMessages, message]);
                  setMessage('');
                }
              }}
              placeholder="Send a message..."
              className="w-full bg-white/5 border border-white/10 rounded-full px-4 py-2 text-sm text-white focus:outline-none"
            />
          </div>
        )}
      </div>
    </div>
  );
}
