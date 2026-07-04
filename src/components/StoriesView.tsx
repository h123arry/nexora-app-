import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Plus, 
  CheckCircle, 
  X, 
  Volume2, 
  VolumeX, 
  SkipForward, 
  Play, 
  Pause, 
  Sparkles, 
  Pin, 
  Heart, 
  Trash2, 
  Camera, 
  Video, 
  Mic, 
  Check,
  AlertCircle
} from 'lucide-react';
import { User } from '../types';

// Human-friendly relatable seed stories
const MOCK_MOMENTS = [
  { 
    id: 'm-voh-1', 
    name: 'VOICE OF HARRISON', 
    username: 'voh', 
    avatar: '/src/assets/images/voh_logo_avatar_1781774114050.jpg', 
    active: true, 
    quotes: [
      "Lagos is boiling hot today 🥵 but the hustle continues! Let's get it!",
      "Davido's new song has been on repeat since morning! What range! 🎶",
      "Messi or Ronaldo? For me, both are absolute kings of football. We are lucky to witness them."
    ],
    mediaType: 'photo',
    mediaUrl: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600&auto=format&fit=crop&q=80',
    seenList: []
  },
  { 
    id: 'm-nexora-1', 
    name: 'Nexora AI', 
    username: 'nexora_ai', 
    avatar: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150&auto=format&fit=crop&q=80', 
    active: true, 
    quotes: [
      "Did you see Messi's freekick assist yesterday? Simply beautiful! ⚽",
      "Wizkid fans are active on the feed today! Let's keep the vibe peaceful and fun!",
      "Remember to drink water and check in on your friends today!"
    ],
    mediaType: 'photo',
    mediaUrl: 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=600&auto=format&fit=crop&q=80',
    seenList: []
  },
  { 
    id: 'm-vohai-1', 
    name: 'VOH AI', 
    username: 'voh_ai', 
    avatar: 'https://images.unsplash.com/photo-1620712943543-bcc4688e7485?w=150&auto=format&fit=crop&q=80', 
    active: true, 
    quotes: [
      "Siuuuu! Ronaldo's header gestern was insane! Age is just a number. 🐐",
      "Burna Boy's performance at the concert was fire! What a performer."
    ],
    mediaType: 'photo',
    mediaUrl: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=600&auto=format&fit=crop&q=80',
    seenList: []
  }
];

interface StoriesViewProps {
  currentUser: User;
}

export default function StoriesView({ currentUser }: StoriesViewProps) {
  // Moments state with localStorage syncing
  const [momentsList, setMomentsList] = useState<any[]>(() => {
    const saved = localStorage.getItem('nexora_moments_list');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.length > 0) return parsed;
      } catch (e) {}
    }
    return MOCK_MOMENTS;
  });

  // Story highlighting / pinning states
  const [storyHighlightsList, setStoryHighlightsList] = useState<any[]>(() => {
    const saved = localStorage.getItem('nexora_story_highlights');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.length > 0) return parsed;
      } catch (e) {}
    }
    return [
      {
        id: 'hl-sample-1',
        title: 'Football ⚽',
        cover: '⚽',
        stories: [
          { mediaUrl: 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=600&auto=format&fit=crop&q=80', caption: 'Messi vs Ronaldo conversations never end!' }
        ]
      },
      {
        id: 'hl-sample-2',
        title: 'Music Jams 🎵',
        cover: '🎵',
        stories: [
          { mediaUrl: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=600&auto=format&fit=crop&q=80', caption: 'Afrobeat to the world! Streaming Wizkid and Davido all day.' }
        ]
      }
    ];
  });

  // Overlays
  const [selectedMoment, setSelectedMoment] = useState<any | null>(null);
  const [storyIndex, setStoryIndex] = useState(0);
  
  // Custom Story details reply & analytics
  const [storyReplyText, setStoryReplyText] = useState('');
  const [showStoryAnalytics, setShowStoryAnalytics] = useState(false);
  const [storyStats, setStoryStats] = useState<Record<string, { views: number, reactions: string[], replies: string[] }>>(() => {
    const saved = localStorage.getItem('nexora_story_stats_v2');
    if (saved) return JSON.parse(saved);
    return {
      'm-voh-1': { views: 124500, reactions: ['⚡', '❤️', '👏', '🔥'], replies: ['Amazing vibe Harrison!', 'Messi is the absolute 🐐!'] },
      'm-nexora-1': { views: 88400, reactions: ['⚡', '👏', '🔥'], replies: ['Visual clarity is supreme!'] },
      'm-vohai-1': { views: 76100, reactions: ['❤️', '😂'], replies: ['Unbelievable header yesterday!'] }
    };
  });

  useEffect(() => {
    localStorage.setItem('nexora_story_stats_v2', JSON.stringify(storyStats));
  }, [storyStats]);

  // Moment Creation Modal States
  const [isCreateMomentOpen, setIsCreateMomentOpen] = useState(false);
  const [momentCaption, setMomentCaption] = useState('');
  const [momentMediaType, setMomentMediaType] = useState<'photo' | 'video' | 'voice' | 'text'>('photo');
  const [momentMediaUrl, setMomentMediaUrl] = useState('https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600&auto=format&fit=crop&q=80');
  const [simulatedVoiceRecording, setSimulatedVoiceRecording] = useState(false);
  const [simulatedVoiceSeconds, setSimulatedVoiceSeconds] = useState(0);
  const [playingVoiceMoment, setPlayingVoiceMoment] = useState(false);

  // Highlights state
  const [isCreatingHighlight, setIsCreatingHighlight] = useState(false);
  const [newHighlightTitle, setNewHighlightTitle] = useState('');
  const [newHighlightCover, setNewHighlightCover] = useState('🌟');

  // Handle Voice Recording timer
  useEffect(() => {
    let interval: any;
    if (simulatedVoiceRecording) {
      interval = setInterval(() => {
        setSimulatedVoiceSeconds(s => s + 1);
      }, 1000);
    } else {
      setSimulatedVoiceSeconds(0);
    }
    return () => clearInterval(interval);
  }, [simulatedVoiceRecording]);

  const handleCreateNewMoment = (e: React.FormEvent) => {
    e.preventDefault();
    const defaultCaption = momentCaption.trim() || 
      (momentMediaType === 'voice' ? "🎙️ Broadcast Voice Update" : 
       momentMediaType === 'video' ? "🎥 Quick video clip!" : "📸 Sharing daily vibe!");

    const newMoment = {
      id: `moment-${Date.now()}`,
      name: currentUser.name,
      username: currentUser.username,
      avatar: currentUser.avatar,
      active: true,
      quotes: [defaultCaption],
      mediaType: momentMediaType,
      mediaUrl: momentMediaType === 'text' ? '' : momentMediaUrl,
      voiceDuration: momentMediaType === 'voice' ? (simulatedVoiceSeconds || 12) : undefined,
      createdAt: Date.now(),
      seenList: []
    };

    const updated = [newMoment, ...momentsList];
    setMomentsList(updated);
    localStorage.setItem('nexora_moments_list', JSON.stringify(updated));

    // Initialize story entry stats
    setStoryStats(prev => ({
      ...prev,
      [newMoment.id]: { views: 1, reactions: [], replies: [] }
    }));

    // Reset fields
    setMomentCaption('');
    setMomentMediaType('photo');
    setMomentMediaUrl('https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600&auto=format&fit=crop&q=80');
    setIsCreateMomentOpen(false);
    window.dispatchEvent(new CustomEvent('toast', { detail: 'Shared story to Activity successfully!' }));
  };

  const handleCreateHighlight = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newHighlightTitle.trim()) return;

    const newHl = {
      id: `hl-${Date.now()}`,
      title: newHighlightTitle.trim(),
      cover: newHighlightCover,
      stories: [
        { mediaUrl: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600&auto=format&fit=crop&q=80', caption: `Pinned Highlight item: ${newHighlightTitle}` }
      ]
    };

    const updated = [...storyHighlightsList, newHl];
    setStoryHighlightsList(updated);
    localStorage.setItem('nexora_story_highlights', JSON.stringify(updated));
    setNewHighlightTitle('');
    setIsCreatingHighlight(false);
  };

  const deleteHighlight = (hlId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    const updated = storyHighlightsList.filter(h => h.id !== hlId);
    setStoryHighlightsList(updated);
    localStorage.setItem('nexora_story_highlights', JSON.stringify(updated));
  };

  const handleSendStoryReply = () => {
    if (!storyReplyText.trim() || !selectedMoment) return;
    const repText = storyReplyText.trim();
    setStoryStats(prev => {
      const current = prev[selectedMoment.id] || { views: 100, reactions: [], replies: [] };
      return {
        ...prev,
        [selectedMoment.id]: {
          ...current,
          replies: [...current.replies, repText]
        }
      };
    });
    setStoryReplyText('');
    window.dispatchEvent(new CustomEvent('toast', { detail: `💌 Secure story reply submitted directly to @${selectedMoment.username}!` }));
  };

  const handleReactToStory = (emoji: string) => {
    if (!selectedMoment) return;
    setStoryStats(prev => {
      const current = prev[selectedMoment.id] || { views: 100, reactions: [], replies: [] };
      return {
        ...prev,
        [selectedMoment.id]: {
          ...current,
          reactions: [...current.reactions, emoji]
        }
      };
    });
    window.dispatchEvent(new CustomEvent('toast', { detail: `✨ Story reacted with ${emoji}!` }));
  };

  const handleShareStory = () => {
    if (!selectedMoment) return;
    const text = `Check out @${selectedMoment.username}'s story on Nexora: "${selectedMoment.quotes[storyIndex]}"`;
    navigator.clipboard.writeText(text);
    window.dispatchEvent(new CustomEvent('toast', { detail: `📤 Story forwarded directly to your social buffer!` }));
  };

  return (
    <div className="bg-purple-950/15 border border-purple-500/10 p-4 rounded-3xl space-y-3 shrink-0 animate-fade-in mb-6">
      <div className="flex items-center justify-between px-1">
        <span className="text-[10.5px] font-mono text-purple-400 font-extrabold uppercase tracking-widest flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 animate-pulse text-purple-400" />
          NEXORA STORIES
        </span>
        <button 
          onClick={() => setIsCreatingHighlight(true)}
          className="text-[9px] font-mono text-pink-400 hover:text-white uppercase font-black hover:underline cursor-pointer"
        >
          + NEW HIGHLIGHT
        </button>
      </div>

      <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-none snap-x items-center">
        {/* Story submission card button */}
        <div 
          onClick={() => setIsCreateMomentOpen(true)}
          className="flex flex-col items-center gap-1.5 shrink-0 snap-center cursor-pointer group"
        >
          <div className="relative">
            <img 
              src={currentUser.avatar} 
              alt="Add Story" 
              className="w-12 h-12 rounded-full object-cover border border-slate-900 transition-transform group-hover:scale-105 duration-300"
              referrerPolicy="no-referrer"
            />
            <div className="absolute inset-0 rounded-full border border-violet-500/40 group-hover:border-violet-500 transition-colors pointer-events-none animate-pulse" style={{ margin: '-2.5px' }} />
            <div className="absolute -bottom-1 -right-1 bg-violet-600 rounded-full p-1 border border-[#0d0a21] shadow-md flex items-center justify-center">
              <Plus className="w-2.5 h-2.5 text-white stroke-[3px]" />
            </div>
          </div>
          <span className="text-[10px] font-sans font-extrabold text-violet-300/85 group-hover:text-white transition-colors">
            + Story
          </span>
        </div>

        {/* Live Stories List */}
        {momentsList
          .filter(mom => {
            // Expiration 24h
            if (mom.createdAt && (Date.now() - mom.createdAt > 24 * 60 * 60 * 1000)) return false;
            return true;
          })
          .map(mom => {
            const isSeen = mom.seenList && mom.seenList.includes(currentUser.id);
            const isVerified = mom.username === 'voh' || mom.username === 'nexora_ai' || mom.username === 'voh_ai';

            return (
              <div 
                key={mom.id}
                onClick={() => {
                  // Mark story as viewed
                  if (mom.seenList && !mom.seenList.includes(currentUser.id)) {
                    mom.seenList.push(currentUser.id);
                    const updated = momentsList.map(m => m.id === mom.id ? { ...m, seenList: [...mom.seenList] } : m);
                    setMomentsList(updated);
                    localStorage.setItem('nexora_moments_list', JSON.stringify(updated));
                  }
                  
                  // Increment views count in story stats
                  setStoryStats(prev => {
                    const current = prev[mom.id] || { views: 100, reactions: [], replies: [] };
                    return {
                      ...prev,
                      [mom.id]: { ...current, views: current.views + 1 }
                    };
                  });

                  setSelectedMoment(mom);
                  setStoryIndex(0);
                }}
                className="flex flex-col items-center gap-1.5 shrink-0 snap-center cursor-pointer group"
              >
                <div className="relative">
                  <img 
                    src={mom.avatar} 
                    alt={mom.name} 
                    className="w-12 h-12 rounded-full object-cover border-2 border-slate-900 transition-transform group-hover:scale-105 duration-300"
                    referrerPolicy="no-referrer"
                  />
                  <div className={`absolute inset-0 rounded-full border-2 ${isSeen ? 'border-zinc-800 opacity-40' : 'border-violet-500'} pointer-events-none`} style={{ margin: '-3px' }} />
                  
                  {isVerified && (
                    <div className="absolute -bottom-1 -right-1 bg-violet-600 rounded-full p-0.5 border border-[#0d0a21]">
                      <CheckCircle className="w-2.5 h-2.5 text-white fill-current" />
                    </div>
                  )}
                </div>
                <span className="text-[10px] font-sans font-bold text-violet-200/80 group-hover:text-white transition-colors max-w-[70px] truncate text-center">
                  {mom.username === 'voh' ? 'VOH' : (mom.name.split(' ')[0] || mom.username)}
                </span>
              </div>
            );
          })}

        {/* Story Highlights list */}
        {storyHighlightsList.map((hl: any) => (
          <div 
            key={hl.id}
            onClick={() => {
              const fakeMoment = {
                id: hl.id,
                name: hl.title,
                username: `highlight_${hl.id}`,
                avatar: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150&auto=format&fit=crop&q=80',
                active: false,
                mediaType: 'photo',
                mediaUrl: hl.stories?.[0]?.mediaUrl || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600&auto=format&fit=crop&q=80',
                quotes: hl.stories?.map((s: any) => s.caption || "🌟 Pinned Highlight!") || ["Highlight story"],
                seenList: [],
                isHighlightPlay: true
              };
              setSelectedMoment(fakeMoment);
              setStoryIndex(0);
            }}
            className="flex flex-col items-center gap-1.5 shrink-0 snap-center cursor-pointer group relative"
          >
            <div className="w-12 h-12 rounded-full bg-linear-to-tr from-pink-600/30 to-violet-600/30 border-2 border-dashed border-violet-500/50 flex items-center justify-center text-lg transition-transform group-hover:scale-105">
              {hl.cover || '🌟'}
              <button 
                onClick={(e) => deleteHighlight(hl.id, e)}
                className="absolute -top-1 -right-1 bg-black/80 hover:bg-red-900 border border-white/5 opacity-0 group-hover:opacity-100 p-0.5 rounded-full text-zinc-400 hover:text-white transition-all cursor-pointer z-10"
                title="Delete Highlight"
              >
                <Trash2 className="w-2.5 h-2.5" />
              </button>
            </div>
            <span className="text-[10px] font-sans font-bold text-pink-300 group-hover:text-white transition-colors truncate max-w-[70px]">
              {hl.title}
            </span>
          </div>
        ))}
      </div>

      {/* HIGHLIGHT CREATION OVERLAY */}
      <AnimatePresence>
        {isCreatingHighlight && (
          <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.form 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              onSubmit={handleCreateHighlight}
              className="bg-[#0b0821] border border-pink-500/20 p-5 rounded-3xl max-w-xs w-full text-left space-y-4"
            >
              <div className="flex items-center justify-between border-b border-white/5 pb-2">
                <h4 className="text-xs font-sans font-black uppercase text-pink-400">Add Story Pin Board</h4>
                <button type="button" onClick={() => setIsCreatingHighlight(false)} className="text-zinc-500 hover:text-white"><X className="w-4 h-4" /></button>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-mono block uppercase text-zinc-400">Pin Title</label>
                <input 
                  type="text" 
                  required
                  placeholder="e.g. Football Fans ⚽"
                  value={newHighlightTitle}
                  onChange={(e) => setNewHighlightTitle(e.target.value)}
                  className="w-full bg-black/50 border border-white/10 rounded-xl p-2.5 text-xs font-sans text-white placeholder-zinc-600 focus:outline-hidden focus:border-pink-500 transition-colors"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-mono block uppercase text-zinc-400 font-bold">Board Emoji Cover Icon</label>
                <div className="grid grid-cols-5 gap-1 select-none">
                  {['⚽', '🎵', '🔥', '👑', '🦅', '🤩', '🍿', '🎧', '🌶️', '🥳'].map(emoji => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => setNewHighlightCover(emoji)}
                      className={`p-2 rounded-lg border text-sm transition-all ${newHighlightCover === emoji ? 'bg-pink-600 border-pink-400' : 'bg-black/20 border-white/5 hover:bg-black/40'}`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
              <button 
                type="submit"
                className="w-full py-2 bg-pink-600 hover:bg-pink-500 text-white font-extrabold text-xs rounded-xl uppercase tracking-wider transition-all cursor-pointer"
              >
                Create Highlight
              </button>
            </motion.form>
          </div>
        )}
      </AnimatePresence>

      {/* STORY ADDING MODAL */}
      <AnimatePresence>
        {isCreateMomentOpen && (
          <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-md">
            <motion.div 
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              className="bg-linear-to-b from-[#110d2d] to-[#04030d] border border-violet-500/20 rounded-3xl p-6 max-w-md w-full shadow-2xl relative space-y-4 text-left font-sans"
            >
              <button 
                type="button"
                onClick={() => setIsCreateMomentOpen(false)}
                className="absolute top-4 right-4 p-1 rounded-lg bg-white/5 text-violet-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="space-y-1">
                <h3 className="text-md font-sans font-black text-white flex items-center gap-1.5">
                  <span className="text-lg">✨</span> Share a Story
                </h3>
                <p className="text-[10.5px] font-mono text-violet-400/60 leading-normal">
                  Stories expire and disappear after 24 hours. Talk about Messi vs Ronaldo, favorite Davido tracks, or any relatable gossip!
                </p>
              </div>

              <form onSubmit={handleCreateNewMoment} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-mono text-violet-400 block uppercase font-bold">Pick Media Type</label>
                  <div className="grid grid-cols-4 gap-1.5">
                    {[
                      { id: 'photo', label: '📸 Image', defaultUrl: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600&auto=format&fit=crop&q=80' },
                      { id: 'video', label: '🎥 Video', defaultUrl: 'https://images.unsplash.com/photo-1542281286-9e0a16bb7366?w=600&auto=format&fit=crop&q=80' },
                      { id: 'voice', label: '🎙️ Voice', defaultUrl: '' },
                      { id: 'text', label: '📝 Text', defaultUrl: '' }
                    ].map((type) => (
                      <button
                        key={type.id}
                        type="button"
                        onClick={() => {
                          setMomentMediaType(type.id as any);
                          if (type.defaultUrl) setMomentMediaUrl(type.defaultUrl);
                        }}
                        className={`py-2 px-1 rounded-xl font-sans text-[10px] font-bold text-center border transition-all cursor-pointer ${
                          momentMediaType === type.id 
                            ? 'bg-violet-600 border-violet-400 text-white shadow-md shadow-violet-600/20' 
                            : 'bg-black/40 border-white/5 text-violet-400/80 hover:text-white'
                        }`}
                      >
                        {type.label}
                      </button>
                    ))}
                  </div>
                </div>

                {momentMediaType !== 'voice' && momentMediaType !== 'text' && (
                  <div className="space-y-1.5 animate-fade-in">
                    <label className="text-[10px] font-mono text-violet-400 block uppercase font-bold">Add Media Image URL</label>
                    <input 
                      type="url"
                      value={momentMediaUrl}
                      onChange={(e) => setMomentMediaUrl(e.target.value)}
                      placeholder="Paste Unsplash link..."
                      className="w-full p-2.5 bg-black/40 border border-white/10 rounded-xl outline-hidden text-white font-mono text-xs placeholder-zinc-700"
                    />
                  </div>
                )}

                {momentMediaType === 'voice' && (
                  <div className="p-4 rounded-2xl bg-violet-950/10 border border-violet-500/10 flex flex-col items-center justify-center space-y-3 animate-fade-in text-center select-none">
                    <Mic className={`w-8 h-8 ${simulatedVoiceRecording ? 'text-red-500 animate-pulse' : 'text-violet-400'}`} />
                    <div>
                      <span className="text-xs font-bold block text-white">
                        {simulatedVoiceRecording ? `${simulatedVoiceSeconds}s Recording Live...` : 'Microphone Ready'}
                      </span>
                      <span className="text-[9.5px] font-mono text-violet-400/50 block">Tap start to capture voice update</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSimulatedVoiceRecording(!simulatedVoiceRecording)}
                      className={`px-4 py-1.5 text-[10px] font-mono font-bold uppercase rounded-lg transition-all cursor-pointer ${simulatedVoiceRecording ? 'bg-red-600 text-white animate-pulse' : 'bg-violet-600/30 hover:bg-violet-600 text-white'}`}
                    >
                      {simulatedVoiceRecording ? 'Stop Live Input' : 'Start Mic Stream'}
                    </button>
                  </div>
                )}

                <div className="space-y-1.5">
                  <label className="text-[10px] font-mono text-zinc-400 block uppercase font-bold">Story Caption / Thought</label>
                  <textarea
                    value={momentCaption}
                    onChange={(e) => setMomentCaption(e.target.value)}
                    placeholder="e.g. Any Wizkid FC members voting Burna Boy? Or Ronaldo scores again! Siuuuu!"
                    className="w-full h-20 p-3 bg-black/40 border border-white/10 focus:border-violet-500/50 outline-hidden rounded-2xl text-xs font-sans text-white resize-none placeholder-zinc-700"
                    maxLength={130}
                    required
                  />
                </div>

                <button 
                  type="submit"
                  className="w-full py-2.5 bg-violet-600 hover:bg-violet-500 text-white text-xs font-sans font-extrabold uppercase rounded-xl tracking-wider select-none active:scale-97 transition-all cursor-pointer"
                >
                  Publish Story
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* STORIES OVERLAY VIEWER */}
      <AnimatePresence>
        {selectedMoment && (
          <div className="fixed inset-0 bg-[#060413] z-50 flex flex-col overflow-hidden">
            {selectedMoment.mediaUrl && selectedMoment.mediaType === 'photo' && (
              <div className="absolute inset-0 z-0 select-none pointer-events-none">
                <img 
                  referrerPolicy="no-referrer"
                  src={selectedMoment.mediaUrl} 
                  alt="Background aura" 
                  className="w-full h-full object-cover opacity-50" 
                />
                <div className="absolute inset-0 bg-gradient-to-b from-[#060413] via-[#060413]/70 to-[#060413]" />
              </div>
            )}

            {/* Header Content */}
            <div className="p-4 flex items-center justify-between shrink-0 z-10 border-b border-white/5">
              <div className="flex items-center gap-3">
                <img src={selectedMoment.avatar} alt={selectedMoment.name} className="w-10 h-10 rounded-xl object-cover border border-violet-500/20" />
                <div>
                  <span className="font-sans font-black text-sm text-white flex items-center gap-1">
                    {selectedMoment.name}
                    {(selectedMoment.username === 'voh' || selectedMoment.username === 'nexora_ai' || selectedMoment.username === 'voh_ai') && <CheckCircle className="w-3.5 h-3.5 text-violet-400 fill-current" />}
                  </span>
                  <span className="text-[10px] font-mono text-violet-400/70 block">
                    @{selectedMoment.username} • {selectedMoment.mediaType === 'voice' ? '🎙️ Voice update' : '📝 Text/Photo board'}
                  </span>
                </div>
              </div>
              <button 
                onClick={() => setSelectedMoment(null)}
                className="p-1.5 bg-white/5 hover:bg-white/10 rounded-full text-violet-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Core Story Card Content */}
            <div className="flex-grow flex flex-col items-center justify-center p-4 z-10 overflow-y-auto w-full">
              <motion.div 
                key={storyIndex}
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="w-full max-w-md p-6 rounded-3xl bg-[#09071c]/95 border border-violet-500/20 shadow-2xl flex flex-col justify-between relative overflow-hidden space-y-4"
              >
                {selectedMoment.mediaUrl && (
                  <div className="absolute inset-0 z-0">
                    <img referrerPolicy="no-referrer" src={selectedMoment.mediaUrl} alt="Background" className="w-full h-full object-cover opacity-15" />
                    <div className="absolute inset-0 bg-[#09071c]/80" />
                  </div>
                )}

                <div className="flex items-center gap-1 z-10 w-full mb-2">
                  {selectedMoment.quotes.map((_: any, idx: number) => (
                    <div key={idx} className="flex-1 h-1 rounded-full overflow-hidden bg-white/10">
                      <div className={`h-full ${idx <= storyIndex ? 'bg-violet-500' : ''}`} />
                    </div>
                  ))}
                </div>

                <div className="my-auto z-10 text-center py-4 space-y-6">
                  {selectedMoment.mediaType === 'voice' && (
                    <div className="flex flex-col items-center justify-center space-y-3">
                      <div className="w-16 h-16 rounded-full bg-violet-600/20 border border-violet-500/30 flex items-center justify-center text-white text-lg cursor-pointer hover:bg-violet-600/30 transition-all">
                        <Volume2 className="w-8 h-8 animate-bounce text-violet-400" />
                      </div>
                      <span className="text-xs font-mono text-violet-400">PLAYING LIVE AUDIO STREAM</span>
                    </div>
                  )}

                  <p className="text-base md:text-md font-bold font-sans text-white select-text leading-relaxed tracking-tight">
                    {selectedMoment.quotes[storyIndex] || "Empty insight block"}
                  </p>
                </div>

                {/* Reply, React & Share Section (Interactions) */}
                <div className="z-10 space-y-3 border-t border-white/5 pt-4">
                  {/* Reactions Bar */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      {['⚡', '❤️', '👏', '😂', '🔥'].map(emoji => (
                        <button
                          key={emoji}
                          type="button"
                          onClick={() => handleReactToStory(emoji)}
                          className="hover:scale-125 hover:rotate-6 duration-200 text-base p-1.5 bg-white/5 hover:bg-white/10 rounded-xl cursor-pointer font-sans"
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                    <button 
                      type="button"
                      onClick={handleShareStory}
                      className="p-1.5 px-3 bg-pink-500/10 hover:bg-pink-500/20 border border-pink-500/20 rounded-xl text-[10px] text-pink-300 font-mono font-bold flex items-center gap-1.5 cursor-pointer font-sans"
                    >
                      Share 📤
                    </button>
                  </div>

                  {/* Reply Input Box */}
                  <div className="flex items-center gap-2 bg-black/40 p-2 rounded-xl border border-white/5">
                    <input 
                      type="text"
                      placeholder={`Reply to @${selectedMoment.username}...`}
                      value={storyReplyText}
                      onChange={(e) => setStoryReplyText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSendStoryReply();
                      }}
                      className="flex-1 bg-transparent border-none text-xs text-zinc-100 placeholder-zinc-500 focus:outline-hidden px-2 font-sans"
                    />
                    <button 
                      type="button"
                      onClick={handleSendStoryReply}
                      className="px-3 py-1.5 bg-violet-600 hover:bg-violet-500 text-white font-mono text-[9px] font-black rounded-lg uppercase cursor-pointer transition-all"
                    >
                      Reply
                    </button>
                  </div>
                </div>

                {/* Creator Analytics Panel: Toggleable */}
                {(selectedMoment.username === currentUser.username || selectedMoment.username === 'voh') && (
                  <div className="z-10 bg-violet-600/10 border border-violet-500/10 rounded-2xl p-3 text-left">
                    <div 
                      className="flex items-center justify-between cursor-pointer select-none" 
                      onClick={() => setShowStoryAnalytics(!showStoryAnalytics)}
                    >
                      <span className="text-[10px] font-mono text-purple-400 font-extrabold uppercase flex items-center gap-1">
                        📊 Creator Insights
                      </span>
                      <span className="text-[9px] text-[#A78BFA] font-mono font-black">{showStoryAnalytics ? 'HIDE ▲' : 'VIEW STATS ▼'}</span>
                    </div>
                    {showStoryAnalytics && (
                      <div className="grid grid-cols-3 gap-2 mt-2 pt-2 border-t border-white/5 text-center">
                        <div className="p-1.5 bg-black/30 rounded-xl border border-white/5">
                          <span className="text-[8px] font-mono block text-zinc-500 uppercase">Views</span>
                          <span className="text-xs font-mono font-black text-white">
                            {((storyStats[selectedMoment.id]?.views || 0) + (selectedMoment.id === 'm-voh-1' ? 124500 : 0)).toLocaleString()}
                          </span>
                        </div>
                        <div className="p-1.5 bg-black/30 rounded-xl border border-white/5">
                          <span className="text-[8px] font-mono block text-zinc-500 uppercase">Reactions</span>
                          <span className="text-xs font-mono font-black text-amber-400">
                            {((storyStats[selectedMoment.id]?.reactions || []).length + (selectedMoment.id === 'm-voh-1' ? 425 : 0))}
                          </span>
                        </div>
                        <div className="p-1.5 bg-black/30 rounded-xl border border-white/5">
                          <span className="text-[8px] font-mono block text-zinc-500 uppercase">Replies</span>
                          <span className="text-xs font-mono font-black text-cyan-400">
                            {((storyStats[selectedMoment.id]?.replies || []).length + (selectedMoment.id === 'm-voh-1' ? 18 : 0))}
                          </span>
                        </div>
                        
                        {/* Display replies content */}
                        {((storyStats[selectedMoment.id]?.replies || []).length > 0) && (
                          <div className="col-span-3 text-left p-2 rounded-xl bg-black/40 mt-1 max-h-24 overflow-y-auto border border-white/5 space-y-1 scrollbar-none">
                            <span className="text-[8px] font-mono text-zinc-500 uppercase font-black block">Replies Feed:</span>
                            {(storyStats[selectedMoment.id]?.replies || []).map((reply, rIdx) => (
                              <p key={rIdx} className="text-[9.5px] text-zinc-300 font-sans leading-normal">
                                💬 <span className="italic">"{reply}"</span>
                              </p>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                <div className="z-10 flex items-center justify-between border-t border-white/5 pt-4">
                  <button 
                    type="button"
                    disabled={storyIndex === 0}
                    onClick={() => setStoryIndex(storyIndex - 1)}
                    className="px-4 py-2 border border-white/10 rounded-xl text-xs font-mono text-zinc-400 hover:text-white disabled:opacity-20 transition-all cursor-pointer"
                  >
                    ← BACK
                  </button>
                  <button 
                    type="button"
                    onClick={() => {
                      if (storyIndex < selectedMoment.quotes.length - 1) {
                        setStoryIndex(storyIndex + 1);
                      } else {
                        setSelectedMoment(null);
                      }
                    }}
                    className="px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white rounded-xl text-xs font-mono font-bold transition-all cursor-pointer"
                  >
                    {storyIndex === selectedMoment.quotes.length - 1 ? 'EXIT STORY' : 'NEXT →'}
                  </button>
                </div>
              </motion.div>
            </div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
