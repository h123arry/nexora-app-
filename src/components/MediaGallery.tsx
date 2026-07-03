import React, { useState } from 'react';
import { 
  X, 
  Search, 
  Image as ImageIcon, 
  Video as VideoIcon, 
  FileText, 
  Link as LinkIcon, 
  Music, 
  Download, 
  ExternalLink,
  ChevronUp,
  SlidersHorizontal,
  Calendar,
  Grid
} from 'lucide-react';

interface MediaItem {
  id: string;
  type: 'image' | 'video' | 'doc' | 'link' | 'voice';
  title: string;
  subtitle: string;
  url: string;
  date: string;
  size?: string;
}

interface MediaGalleryProps {
  isOpen: boolean;
  onClose: () => void;
  chatPartnerName: string;
}

const STATIC_GALLERY_ITEMS: MediaItem[] = [
  {
    id: 'm1',
    type: 'image',
    title: 'ux_sketch_glassmorphic.png',
    subtitle: '124 KB • Shared by Harrison',
    url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=400',
    date: 'Yesterday'
  },
  {
    id: 'm2',
    type: 'image',
    title: 'brand_palette_neon.png',
    subtitle: '89 KB • Shared by Harrison',
    url: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=400',
    date: '2 days ago'
  },
  {
    id: 'm3',
    type: 'video',
    title: 'Real-time Round Loop.mp4',
    subtitle: '1.2 MB • Interactive video clip',
    url: 'https://assets.mixkit.co/videos/preview/mixkit-holding-smartphone-at-night-with-city-lights-41553-large.mp4',
    date: '3 days ago'
  },
  {
    id: 'm4',
    type: 'doc',
    title: 'benchmark_speed.json',
    subtitle: '2.1 KB • Rust production latency log',
    url: '#',
    date: 'Yesterday',
    size: '2.1 KB'
  },
  {
    id: 'm5',
    type: 'doc',
    title: 'packet_streamer.rs',
    subtitle: '12.8 KB • Web socket controller',
    url: '#',
    date: '3 days ago',
    size: '12.8 KB'
  },
  {
    id: 'm6',
    type: 'link',
    title: 'Nexora UI Kit (Tailwind Component Set)',
    subtitle: 'https://github.com/nexora/tailwind-ui-kit',
    url: 'https://github.com/nexora/tailwind-ui-kit',
    date: 'Last week'
  },
  {
    id: 'm7',
    type: 'link',
    title: 'High-Performance Web Sockets Draft',
    subtitle: 'https://rfc.nexora.org/ws-latency',
    url: 'https://rfc.nexora.org/ws-latency',
    date: 'Last week'
  },
  {
    id: 'm8',
    type: 'voice',
    title: 'Voice memo coordinate loop.ogg',
    subtitle: '0:12 • Voice audio track',
    url: '#',
    date: 'Yesterday',
    size: '0:12'
  }
];

export default function MediaGallery({
  isOpen,
  onClose,
  chatPartnerName
}: MediaGalleryProps) {
  const [activeTab, setActiveTab] = useState<'all' | 'media' | 'docs' | 'links' | 'voice'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest'>('newest');

  if (!isOpen) return null;

  const filteredItems = STATIC_GALLERY_ITEMS.filter(item => {
    // Tab filter
    if (activeTab === 'media' && item.type !== 'image' && item.type !== 'video') return false;
    if (activeTab === 'docs' && item.type !== 'doc') return false;
    if (activeTab === 'links' && item.type !== 'link') return false;
    if (activeTab === 'voice' && item.type !== 'voice') return false;

    // Search query
    return item.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
           item.subtitle.toLowerCase().includes(searchQuery.toLowerCase());
  });

  return (
    <div className="absolute inset-0 z-40 bg-[#06040f]/95 backdrop-blur-2xl flex flex-col h-full border-l border-violet-500/10">
      
      {/* Header */}
      <div className="p-4 border-b border-violet-500/10 flex items-center justify-between bg-[#09071c]/80">
        <div>
          <span className="text-[9px] font-mono font-black text-violet-400 uppercase tracking-widest block">
            CONVERSATION DATABASE
          </span>
          <h3 className="text-sm font-sans font-black text-white flex items-center gap-1.5 mt-0.5">
            <span>Shared Media</span>
            <span className="text-xs font-normal text-zinc-400">• {chatPartnerName}</span>
          </h3>
        </div>
        <button 
          onClick={onClose}
          className="p-1.5 hover:bg-white/5 border border-white/15 rounded-xl text-zinc-400 hover:text-white transition-all cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Search & Sort Panel */}
      <div className="p-3 border-b border-violet-500/5 space-y-2 bg-[#05030d]">
        <div className="relative">
          <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-violet-400/50" />
          <input
            type="text"
            placeholder="Search documents, images, links..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-slate-950 border border-violet-500/10 focus:border-[#8B5CF6] focus:outline-hidden text-xs text-white placeholder-violet-400/20"
          />
        </div>

        {/* Tab Selection Row */}
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-0.5">
          {[
            { id: 'all', label: 'All Files' },
            { id: 'media', label: 'Media', icon: ImageIcon },
            { id: 'docs', label: 'Docs', icon: FileText },
            { id: 'links', label: 'Links', icon: LinkIcon },
            { id: 'voice', label: 'Audio', icon: Music }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-3 py-1.5 rounded-xl text-[10px] font-mono uppercase tracking-wider font-extrabold flex items-center gap-1.5 transition-all shrink-0 cursor-pointer ${
                activeTab === tab.id 
                  ? 'bg-violet-600 text-white border border-violet-400/30' 
                  : 'bg-black/40 text-violet-400/60 hover:text-white border border-white/5'
              }`}
            >
              {tab.icon && <tab.icon className="w-3 h-3" />}
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Grid Content List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
        {filteredItems.map(item => (
          <div 
            key={item.id}
            className="p-3 rounded-2xl bg-[#09071c] border border-violet-500/5 hover:border-violet-500/20 flex items-center justify-between gap-3 group transition-all"
          >
            <div className="flex items-center gap-3 min-w-0 flex-1">
              {/* Icon / Thumbnail Box */}
              {item.type === 'image' ? (
                <img 
                  src={item.url} 
                  alt={item.title} 
                  className="w-11 h-11 rounded-xl object-cover border border-violet-500/10 shrink-0" 
                  referrerPolicy="no-referrer"
                />
              ) : item.type === 'video' ? (
                <div className="w-11 h-11 rounded-xl bg-violet-950/40 border border-violet-500/15 flex items-center justify-center shrink-0 relative overflow-hidden">
                  <VideoIcon className="w-4 h-4 text-violet-400 z-10" />
                  <span className="absolute bottom-0 inset-x-0 bg-black/60 text-[7px] text-center font-mono py-0.5 text-zinc-400">MP4</span>
                </div>
              ) : item.type === 'doc' ? (
                <div className="w-11 h-11 rounded-xl bg-cyan-950/20 border border-cyan-500/15 flex items-center justify-center shrink-0">
                  <FileText className="w-5 h-5 text-cyan-400" />
                </div>
              ) : item.type === 'link' ? (
                <div className="w-11 h-11 rounded-xl bg-pink-950/20 border border-pink-500/15 flex items-center justify-center shrink-0">
                  <LinkIcon className="w-5 h-5 text-pink-400" />
                </div>
              ) : (
                <div className="w-11 h-11 rounded-xl bg-emerald-950/20 border border-emerald-500/15 flex items-center justify-center shrink-0">
                  <Music className="w-5 h-5 text-emerald-400" />
                </div>
              )}

              {/* Title & Metadata */}
              <div className="min-w-0 flex-1 text-left">
                <p className="text-xs font-sans font-bold text-white truncate hover:text-violet-300">
                  {item.title}
                </p>
                <p className="text-[10px] font-sans text-violet-300/40 truncate mt-0.5">
                  {item.subtitle}
                </p>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-1.5 shrink-0 pl-1">
              {item.type === 'link' ? (
                <a 
                  href={item.url} 
                  target="_blank" 
                  rel="noreferrer"
                  className="p-1.5 hover:bg-violet-500/10 rounded-lg text-violet-400 hover:text-white transition-colors cursor-pointer"
                  title="Open Link"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              ) : (
                <button
                  onClick={() => alert(`Simulating file download: ${item.title}`)}
                  className="p-1.5 hover:bg-violet-500/10 rounded-lg text-violet-400 hover:text-white transition-colors cursor-pointer"
                  title="Download File"
                >
                  <Download className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        ))}

        {filteredItems.length === 0 && (
          <div className="p-12 text-center text-violet-400/20 font-mono text-[10px]">
            No shared assets found under current query.
          </div>
        )}
      </div>

      {/* Database Quick Stats */}
      <div className="p-3 border-t border-violet-500/10 bg-[#09071c]/60 text-left">
        <div className="grid grid-cols-3 gap-1 p-2 bg-black/30 rounded-xl border border-white/5">
          <div className="text-center">
            <span className="text-[14px] font-mono font-black text-violet-300">2</span>
            <span className="text-[7.5px] font-mono text-zinc-500 uppercase tracking-widest block mt-0.5">Images</span>
          </div>
          <div className="text-center border-x border-white/5">
            <span className="text-[14px] font-mono font-black text-cyan-400">3</span>
            <span className="text-[7.5px] font-mono text-zinc-500 uppercase tracking-widest block mt-0.5">Documents</span>
          </div>
          <div className="text-center">
            <span className="text-[14px] font-mono font-black text-pink-400">2</span>
            <span className="text-[7.5px] font-mono text-zinc-500 uppercase tracking-widest block mt-0.5">Links</span>
          </div>
        </div>
      </div>
    </div>
  );
}
