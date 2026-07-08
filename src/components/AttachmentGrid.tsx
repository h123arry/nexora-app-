import React, { useState } from 'react';
import { Image, Play, Sparkles, Smile, MapPin, Contact, FileText, Send, Forward } from 'lucide-react';

interface AttachmentGridProps {
  onSendAttachment: (type: 'gif' | 'sticker' | 'contact' | 'location' | 'post' | 'photo' | 'video', content: any) => void;
  onClose: () => void;
}

const GIF_PRESETS = [
  { name: 'Matrix Cyber Neon', url: 'https://media.giphy.com/media/V2OJLo7SKxg3e/giphy.gif' },
  { name: 'Retro Vaporwave Sunset', url: 'https://media.giphy.com/media/d31vTpY9fTrLuUKI/giphy.gif' },
  { name: 'Cyberpunk Tokyo Rain', url: 'https://media.giphy.com/media/l41YcGT5ShJa09kty/giphy.gif' },
  { name: 'Developer Keyboard Flame', url: 'https://media.giphy.com/media/13HgwGsXF09K4E/giphy.gif' }
];

const STICKER_PRESETS = [
  { name: '👑 Nexora Founder Badge', url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=100' },
  { name: '⚡ Spark Surge Active', url: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=100' },
  { name: '☕ Coding Fuel Injection', url: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=100' },
  { name: '🔮 Algorithm Quantum', url: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=100' }
];

const CONTACT_PRESETS = [
  { name: 'Luna Deville', role: 'Premium UI Designer', bio: 'Pixels are vectors of light', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100' },
  { name: 'Harrison Flint', role: 'Lead Web3 Architect', bio: 'Decentralize absolute speed', avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100' }
];

const POST_PRESETS = [
  { title: '🚀 Nexora v1.2 Launch Event', author: 'Ada Lovelace', likes: '1.2M Sparks', desc: 'Welcome to the future of real-time decentralized media networks!' },
  { title: '🎨 Designing Neon backdrops', author: 'Luna Design', likes: '940K Sparks', desc: 'A masterclass on using CSS glassmorphism rules safely.' }
];

export default function AttachmentGrid({ onSendAttachment, onClose }: AttachmentGridProps) {
  const [activeTab, setActiveTab] = useState<'photos' | 'gifs' | 'stickers' | 'contacts' | 'posts' | 'locations'>('photos');

  const triggerSend = (type: any, content: any) => {
    onSendAttachment(type, content);
    onClose();
  };

  return (
    <div className="w-full bg-[#060410] border-t border-violet-500/15 p-4 rounded-t-3xl relative select-none">
      {/* Category selector row */}
      <div className="flex gap-1 overflow-x-auto no-scrollbar pb-3 border-b border-white/5">
        {[
          { id: 'photos', label: '📸 Photo/Video' },
          { id: 'gifs', label: '🌌 GIFs' },
          { id: 'stickers', label: '🎨 Stickers' },
          { id: 'contacts', label: '📇 Contact' },
          { id: 'posts', label: '🚀 Post/Profile' },
          { id: 'locations', label: '📍 Grid Location' }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-3 py-1.5 rounded-xl text-[9.5px] font-mono uppercase shrink-0 transition-all cursor-pointer ${
              activeTab === tab.id 
                ? 'bg-gradient-to-r from-violet-600 to-pink-600 text-white font-extrabold shadow-md shadow-violet-950' 
                : 'bg-white/5 text-zinc-400 hover:text-white'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Grid Content */}
      <div className="mt-3.5 max-h-48 overflow-y-auto custom-scrollbar text-left">
        {activeTab === 'photos' && (
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => triggerSend('photo', { url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600', name: 'Cyberpunk Neon.png' })}
              className="group relative h-20 rounded-xl overflow-hidden border border-white/5 hover:border-violet-500/30 cursor-pointer"
            >
              <img src="https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150" alt="Cyberpunk" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
              <span className="absolute bottom-1 left-2 text-[9px] font-mono text-white/80 bg-black/40 px-1 rounded">Camera Roll</span>
            </button>
            <button
              onClick={() => triggerSend('video', { url: 'https://assets.mixkit.co/videos/preview/mixkit-cyberpunk-neon-sign-on-a-wet-street-34241-large.mp4', name: 'Tokyo Drive Clip.mp4' })}
              className="group relative h-20 rounded-xl overflow-hidden border border-white/5 hover:border-pink-500/30 cursor-pointer"
            >
              <img src="https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=150" alt="Video frame" className="w-full h-full object-cover opacity-60 group-hover:scale-105 transition-transform" />
              <div className="absolute inset-0 flex items-center justify-center">
                <Play className="w-5 h-5 text-pink-400 fill-current" />
              </div>
              <span className="absolute bottom-1 left-2 text-[9px] font-mono text-white/80 bg-black/40 px-1 rounded">Vlog Clip</span>
            </button>
          </div>
        )}

        {activeTab === 'gifs' && (
          <div className="grid grid-cols-2 gap-2">
            {GIF_PRESETS.map((gif, idx) => (
              <button
                key={idx}
                onClick={() => triggerSend('gif', { url: gif.url, name: gif.name })}
                className="h-24 rounded-xl overflow-hidden border border-white/5 hover:border-violet-500/30 relative text-left group cursor-pointer"
              >
                <img src={gif.url} alt={gif.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                <span className="absolute bottom-0 inset-x-0 bg-black/70 p-1 text-[8px] font-mono text-white text-center truncate">{gif.name}</span>
              </button>
            ))}
          </div>
        )}

        {activeTab === 'stickers' && (
          <div className="grid grid-cols-4 gap-2">
            {STICKER_PRESETS.map((sticker, idx) => (
              <button
                key={idx}
                onClick={() => triggerSend('sticker', { url: sticker.url, name: sticker.name })}
                className="flex flex-col items-center justify-center p-2 bg-[#09071c] hover:bg-violet-950/20 border border-white/5 hover:border-violet-500/30 rounded-xl cursor-pointer"
              >
                <img src={sticker.url} alt={sticker.name} className="w-10 h-10 rounded-lg object-cover mb-1" />
                <span className="text-[7.5px] font-sans text-zinc-400 text-center truncate w-full">{sticker.name}</span>
              </button>
            ))}
          </div>
        )}

        {activeTab === 'contacts' && (
          <div className="space-y-1.5">
            {CONTACT_PRESETS.map((contact, idx) => (
              <div
                key={idx}
                onClick={() => triggerSend('contact', contact)}
                className="p-2 bg-slate-950 hover:bg-violet-950/20 border border-white/5 rounded-xl flex items-center justify-between cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <img src={contact.avatar} alt={contact.name} className="w-8 h-8 rounded-lg object-cover" />
                  <div>
                    <span className="text-[11px] font-bold block text-white">{contact.name}</span>
                    <span className="text-[8.5px] font-mono text-violet-400">{contact.role}</span>
                  </div>
                </div>
                <button className="px-2.5 py-1 bg-violet-600 rounded-lg text-[8px] font-mono uppercase font-black text-white">Share Card</button>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'posts' && (
          <div className="space-y-1.5">
            {POST_PRESETS.map((post, idx) => (
              <div
                key={idx}
                onClick={() => triggerSend('post', post)}
                className="p-3 bg-slate-950 hover:bg-violet-950/20 border border-white/5 rounded-xl text-left cursor-pointer transition-colors"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[9.5px] font-extrabold text-white">{post.title}</span>
                  <span className="text-[7.5px] font-mono bg-violet-600/20 text-violet-400 px-1 rounded">{post.likes}</span>
                </div>
                <p className="text-[8.5px] text-zinc-500 line-clamp-1">{post.desc}</p>
                <div className="flex items-center gap-1.5 mt-2">
                  <span className="text-[7.5px] font-mono text-zinc-600 uppercase">Author: @{post.author.toLowerCase().replace(' ', '')}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'locations' && (
          <div className="grid grid-cols-2 gap-2">
            {[
              { id: 'tokyo', name: 'Tokyo Quadrant Alpha', coords: '35.6762° N, 139.6503° E' },
              { id: 'sf', name: 'SF Sandbox Core', coords: '37.7749° N, 122.4194° W' },
              { id: 'berlin', name: 'Berlin Node Alpha', coords: '52.5200° N, 13.4050° E' },
              { id: 'london', name: 'London Link Core', coords: '51.5074° N, 0.1278° W' }
            ].map((loc) => (
              <button
                key={loc.id}
                onClick={() => triggerSend('location', loc)}
                className="p-3 bg-[#09071c] hover:bg-violet-950/20 border border-white/5 hover:border-violet-500/20 rounded-xl text-left cursor-pointer"
              >
                <div className="flex items-center gap-1 mb-1 text-cyan-400">
                  <MapPin className="w-3.5 h-3.5 shrink-0" />
                  <span className="text-[10px] font-bold truncate">{loc.name}</span>
                </div>
                <span className="text-[8px] font-mono text-zinc-500 leading-none block mt-1">{loc.coords}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
