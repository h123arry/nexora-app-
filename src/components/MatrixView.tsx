import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, Paintbrush, Compass, Target, Terminal, Mic, MicOff, Search, Send, PlusCircle, User as UserIcon, Settings, Layers, CheckCircle, TrendingUp, MessageSquare, ArrowRight } from 'lucide-react';
import { User, Post, Chat, Message } from '../types';
import VohAiView from './VohAiView';
import CirclesView from './CirclesView';
import SocialMissionsView from './SocialMissionsView';
import MessagesView from './MessagesView';

interface MatrixViewProps {
  currentUser: User;
  posts: Post[];
  onAddPost: (content: string, imageUrl?: string, tagsString?: string) => void;
  chats: Chat[];
  messages: { [chatId: string]: Message[] };
  onSendMessage: (chatId: string, content: string) => void;
  onReceiveBotMessage: (chatId: string, content: string, senderId: string) => void;
  initialSubTab?: MatrixSubTab;
}

type MatrixSubTab = 'ai' | 'studio' | 'circles' | 'missions' | 'messages';

export default function MatrixView({
  currentUser,
  posts,
  onAddPost,
  chats,
  messages,
  onSendMessage,
  onReceiveBotMessage,
  initialSubTab
}: MatrixViewProps) {
  const [activeSubTab, setActiveSubTab] = useState<MatrixSubTab>(initialSubTab || 'ai');

  useEffect(() => {
    if (initialSubTab) {
      setActiveSubTab(initialSubTab);
    }
  }, [initialSubTab]);
  const [customPostContent, setCustomPostContent] = useState('');
  const [customPostTags, setCustomPostTags] = useState('');
  const [customPostImage, setCustomPostImage] = useState('');
  const [deploySuccess, setDeploySuccess] = useState(false);

  // Predefined community tags for quick tap selection
  const popularTags = ['SpaceGlass', 'Rust', 'BuildInPublic', 'DesignTokens', 'AIEngines', 'FutureHuman'];

  const handleStudioDeploy = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customPostContent.trim()) return;

    onAddPost(customPostContent, customPostImage || undefined, customPostTags);
    setCustomPostContent('');
    setCustomPostTags('');
    setCustomPostImage('');
    setDeploySuccess(true);
    setTimeout(() => setDeploySuccess(false), 3000);
  };

  const menuItems = [
    { id: 'studio' as MatrixSubTab, label: 'Post Studio', desc: 'Create community posts & stories', icon: Paintbrush, color: 'text-fuchsia-400' },
    { id: 'circles' as MatrixSubTab, label: 'Communities', desc: 'Connect around shared interests', icon: Compass, color: 'text-pink-400' },
    { id: 'missions' as MatrixSubTab, label: 'Missions', desc: 'Goals, challenges & helpers', icon: Target, color: 'text-yellow-400' },
    { id: 'messages' as MatrixSubTab, label: 'Messages', desc: 'Your direct messages', icon: MessageSquare, color: 'text-sky-400' }
  ];

  return (
    <div id="voh-matrix-centre" className="space-y-6">
      
      {/* Control Center Banner Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-current/10 pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="p-1 px-1.5 rounded-md bg-violet-500/10 border border-violet-500/20 text-violet-400 animate-pulse">
              <Sparkles className="w-4 h-4" />
            </div>
            <h2 className="text-xl font-black font-sans tracking-tight text-current">
              VOH AI Hub
            </h2>
          </div>
          <p className="text-xs text-current/60 font-sans">
            Your friendly space to talk with AI, share updates, join interest communities, and send messages.
          </p>
        </div>

        <div className="flex items-center gap-2 bg-current/5 border border-current/8 rounded-xl px-3 py-1.5 text-[10px] font-mono select-none shrink-0">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-current/75 font-semibold font-sans">VOH AI ONLINE</span>
        </div>
      </div>

      {/* Futuristic Menu Pills */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-2 select-none">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeSubTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveSubTab(item.id)}
              className={`flex flex-col items-start gap-1 p-3 rounded-2xl border text-left transition-all ${
                isActive 
                  ? 'bg-linear-to-b from-violet-600/15 to-violet-950/15 border-violet-500/30 text-violet-300 ring-1 ring-violet-500/10' 
                  : 'bg-current/3 border-current/5 text-current/70 hover:bg-current/6 hover:text-current'
              }`}
            >
              <div className="flex items-center gap-2">
                <Icon className={`w-4 h-4 ${isActive ? item.color : 'text-current/40'}`} />
                <span className="text-xs font-bold font-sans">{item.label}</span>
              </div>
              <span className="text-[9px] font-mono leading-tight text-current/50 md:block hidden">
                {item.desc}
              </span>
            </button>
          );
        })}
      </div>

      {/* Main Dynamic View Box */}
      <div className="p-1 min-h-[460px]">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeSubTab}
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            transition={{ duration: 0.08, ease: "easeOut" }}
          >
            {activeSubTab === 'ai' && (
              <VohAiView 
                currentUser={currentUser} 
                posts={posts} 
                onAddPost={onAddPost} 
                setActiveTab={() => {}}
              />
            )}

            {activeSubTab === 'studio' && (
              <div className="space-y-6">
                <div className="p-5 rounded-3xl bg-[#03010b] border border-violet-500/15 relative overflow-hidden">
                  <div className="absolute top-[-20%] right-[-10%] w-64 h-64 bg-violet-600/10 rounded-full blur-3xl pointer-events-none" />
                  
                  <div className="mb-4">
                    <h3 className="text-sm font-bold font-sans text-violet-300 flex items-center gap-2">
                       <Paintbrush className="w-4 h-4 text-fuchsia-400" />
                       Post Composer
                    </h3>
                    <p className="text-[11px] text-current/50 font-sans mt-0.5">
                       Write a neat post to share with updates, stories and community tags.
                    </p>
                  </div>

                  {deploySuccess && (
                    <div className="mb-4 p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-mono rounded-xl flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 shrink-0" />
                      <span>POST SHARED SUCCESSFULLY! VISIBLE ON THE FEED.</span>
                    </div>
                  )}

                  <form onSubmit={handleStudioDeploy} className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-mono tracking-wider text-current/60 uppercase font-bold">What is on your mind?</label>
                      <textarea
                        value={customPostContent}
                        onChange={(e) => setCustomPostContent(e.target.value)}
                        placeholder="Write your update, design discovery, or question..."
                        className="w-full h-28 p-3 rounded-2xl bg-current/5 border border-current/10 outline-hidden text-current text-xs font-sans placeholder-current/40 focus:border-violet-500/40 transition-colors resize-none leading-relaxed"
                        required
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-[11px] font-mono tracking-wider text-current/60 uppercase font-bold">Add Tags (comma-separated)</label>
                        <input
                          type="text"
                          value={customPostTags}
                          onChange={(e) => setCustomPostTags(e.target.value)}
                          placeholder="e.g. Design, Coding, Sports, Business"
                          className="w-full px-3.5 py-2.5 rounded-xl bg-current/5 border border-current/10 outline-hidden text-current text-xs font-sans placeholder-current/40 focus:border-violet-500/40 transition-colors"
                        />
                        <div className="flex flex-wrap gap-1 pt-1.5">
                          {popularTags.map((tag) => (
                            <button
                              type="button"
                              key={tag}
                              onClick={() => {
                                const trimTags = customPostTags.trim();
                                if (!trimTags) {
                                  setCustomPostTags(tag);
                                } else if (!trimTags.toLowerCase().includes(tag.toLowerCase())) {
                                  setCustomPostTags(`${trimTags}, ${tag}`);
                                }
                              }}
                              className="px-2 py-0.5 text-[9px] font-sans rounded-full bg-violet-500/10 hover:bg-violet-500/25 text-violet-300 transition-colors"
                            >
                              +{tag}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[11px] font-mono tracking-wider text-current/60 uppercase font-bold">Add Image URL (optional)</label>
                        <input
                          type="url"
                          value={customPostImage}
                          onChange={(e) => setCustomPostImage(e.target.value)}
                          placeholder="https://images.unsplash.com/your-photo"
                          className="w-full px-3.5 py-2.5 rounded-xl bg-current/5 border border-current/10 outline-hidden text-current text-xs font-sans placeholder-current/40 focus:border-violet-500/40 transition-colors"
                        />
                        <p className="text-[9px] text-current/40 font-mono mt-1">Paste any direct link to a picture or graphic you want to show.</p>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-current/5 flex items-center justify-end">
                      <button
                        type="submit"
                        className="py-2.5 px-6 rounded-xl bg-linear-to-r from-violet-600 via-pink-600 to-cyan-500 hover:brightness-110 active:scale-98 text-white text-xs font-bold font-sans flex items-center gap-2 transition-all shadow-md"
                      >
                        <PlusCircle className="w-4 h-4" />
                        <span>Post to Feed</span>
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {activeSubTab === 'circles' && (
              <CirclesView currentUser={currentUser} />
            )}

            {activeSubTab === 'missions' && (
              <SocialMissionsView currentUser={currentUser} />
            )}

            {activeSubTab === 'messages' && (
              <MessagesView
                currentUser={currentUser}
                chats={chats}
                messages={messages}
                onSendMessage={onSendMessage}
                onReceiveBotMessage={onReceiveBotMessage}
                onViewProfile={() => {}}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </div>

    </div>
  );
}
