import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Sparkles, 
  Mic, 
  MicOff, 
  Volume2, 
  FileText, 
  Globe2, 
  ChevronRight, 
  Search, 
  Send, 
  Lightbulb, 
  Award,
  CirclePlay,
  ClipboardCopy,
  BrainCircuit,
  Maximize2
} from 'lucide-react';
import { User, Post } from '../types';
import RelativeTimestamp from './RelativeTimestamp';

interface VohAiViewProps {
  currentUser: User;
  posts: Post[];
  onAddPost: (content: string, imageUrl?: string, tagsString?: string) => void;
  setActiveTab: (tab: any) => void;
}

export default function VohAiView({ currentUser, posts, onAddPost, setActiveTab }: VohAiViewProps) {
  const [query, setQuery] = useState('');
  const [conversation, setConversation] = useState<{ sender: 'user' | 'voh'; text: string; action?: string; timestamp: string }[]>([
    {
      sender: 'voh',
      text: "Hey there! I'm VOH AI, your friendly companion here on Nexora. Ask me to summarize your feed, find people to connect with, recommend community groups, or check out some interesting new opportunities!",
      timestamp: 'Just now'
    }
  ]);

  // Voice recording state
  const [isRecording, setIsRecording] = useState(false);
  const [voiceTimer, setVoiceTimer] = useState(0);
  const [waveformNodes, setWaveformNodes] = useState<number[]>(Array(18).fill(8));
  const [transcription, setTranscription] = useState('');
  const [translation, setTranslation] = useState('');
  const [summarizedText, setSummarizedText] = useState('');
  const [isSynthesizingVoice, setIsSynthesizingVoice] = useState(false);

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Generate dynamic waveform bars
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isRecording) {
      interval = setInterval(() => {
        setWaveformNodes(prev => prev.map(() => Math.floor(Math.random() * 40) + 10));
        setVoiceTimer(t => t + 1);
      }, 100);
    } else {
      setWaveformNodes(Array(18).fill(8));
      setVoiceTimer(0);
    }
    return () => clearInterval(interval);
  }, [isRecording]);

  const toggleRecording = () => {
    if (isRecording) {
      // Stop recording and trigger high-fidelity simulation
      setIsRecording(false);
      setIsSynthesizingVoice(true);
      
      const simulatedTranscripts = [
        "Thinking of starting a new local soccer community group. Who's in?",
        "Just completed my daily challenge to write 100 lines of clean code! Feels amazing to learn something new.",
        "Beautiful sunny evening in Port Harcourt. Hope everyone is having a peaceful day!"
      ];
      
      const chosenTranscript = simulatedTranscripts[Math.floor(Math.random() * simulatedTranscripts.length)];
      
      setTimeout(() => {
        setTranscription(chosenTranscript);
        setTranslation(
          chosenTranscript.includes("soccer") 
            ? "Creating a soccer community group." 
            : "Finished code milestone and logging progress."
        );
        setSummarizedText(
          chosenTranscript.includes("soccer")
            ? "New soccer group interest."
            : "Daily coding challenge completed."
        );
        setIsSynthesizingVoice(false);
        
        // Add to AI conversation logs
        setConversation(prev => [
          ...prev,
          { sender: 'user', text: `[Voice Recording: ${chosenTranscript}]`, timestamp: 'Just now' },
          { 
            sender: 'voh', 
            text: `Voice message typed out! Would you like to share this post to your feed?`, 
            timestamp: 'Just now' 
          }
        ]);
      }, 1800);
    } else {
      setTranscription('');
      setTranslation('');
      setSummarizedText('');
      setIsRecording(true);
    }
  };

  const handleSendPrompt = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!query.trim()) return;

    const userQuery = query;
    setConversation(prev => [...prev, { sender: 'user', text: userQuery, timestamp: 'Just now' }]);
    setQuery('');

    // Simulated responses based on input
    setTimeout(() => {
      let speech = "I checked Nexora's activity. ";
      let action: string | undefined = undefined;

      const q = userQuery.toLowerCase();

      if (q.includes('nigeria')) {
        speech = `Nigeria is buzzing with helpful and positive activities! In Port Harcourt, a friendly local sports tournament and clean-up missions are trending. In Lagos, tech founders are discussing startup ideas and helping beginners learn to code. Tap over to our World Pulse or Communities tab to connect with peers near you!`;
        action = 'pulse';
      } else if (q.includes('port harcourt')) {
        speech = `Port Harcourt is incredibly active! Local members are arranging the Port Harcourt Cup friendly soccer tournament. At the same time, many people are volunteering for the local tree planting mission. It is a fantastic example of using Nexora for real-world impact.`;
        action = 'pulse';
      } else if (q.includes('pulse') || q.includes('trend')) {
        speech = `Here is today's World Pulse summary: Global discussions are focused on soccer games, neighborhood projects, and startup challenges. The overall Pulse Score is at 87, showing very high activity across 120 communities. Key hubs include Port Harcourt, Lagos, Copenhagen, and Austin. Navigate to the World Pulse Map to see these live!`;
        action = 'pulse';
      } else if (q.includes('summarize') || q.includes('feed')) {
        speech = `Here is a summary of what people are discussing in your feed right now: Most conversations are centered around modern UI design and new coding projects. @voh and Marcus Vance have shared some very helpful stories, and there is a lively group discussing environmental impact campaigns. People are really looking to help each other out!`;
      } else if (q.includes('football') || q.includes('soccer')) {
        speech = `I found some soccer enthusiasts! There are over 1,400 people talking about soccer matches in the "EPL Football Analytics" community. Plus, members in the "Nigeria Tech Founders" group are arranging a friendly game. Tap below to check them out!`;
        action = 'circles';
      } else if (q.includes('founder') || q.includes('startup')) {
        speech = `I found some startup founders! There are several in the "Nigeria Tech Founders" group. Sophia Thorne is looking for a collaborator to build beautiful user interfaces, and @voh (the creator of Nexora and VOH AI) is always discussing ideas there. They have high reputation, meaning they are super active helpers. Tap below to see!`;
        action = 'circles';
      } else if (q.includes('translate')) {
        speech = `Sure! 'Let's co-create and complete our social missions together!' translates in French to 'Co-créons et accomplissons nos misiones sociales ensemble!' and in Spanish to '¡Trabajemos juntos y completemos nuestras misiones!'. Nexora translates posts automatically so you can talk with anyone around the world!`;
      } else if (q.includes('opportunity') || q.includes('opportunities') || q.includes('job') || q.includes('hiring')) {
        speech = `I found an interesting opportunity! Sophia Thorne is looking for a Lead Developer to build premium web applications. It matches your background in design and coding, and offers a great budget. Let's send Sophia a chat message!`;
        action = 'messages';
      } else if (q.includes('mission') || q.includes('goal')) {
        speech = `You have 2 missions active right now! 'Plant 1,000 Trees' is super active with 742 trees planted already, and your coding project is waiting for an update. You earn reliable feedback and reputation points for completing these!`;
        action = 'missions';
      } else {
        speech = `Thanks for asking! I'm here to help you navigate Nexora. You can ask me to summarize your feed, find people near you, seek jobs/gigs, or recommend active communities.`;
      }

      setConversation(prev => [
        ...prev, 
        { sender: 'voh', text: speech, action, timestamp: 'Just now' }
      ]);
    }, 1000);
  };

  const handlePostTranscription = () => {
    if (!transcription) return;
    onAddPost(transcription, undefined, "VohSpeech, Transcribed");
    setTranscription('');
    setTranslation('');
    setSummarizedText('');
    
    // Notify
    setConversation(prev => [
      ...prev,
      { sender: 'voh', text: "Perfect! Your voice message has been shared on your feed.", timestamp: 'Just now' }
    ]);
  };

  return (
    <div id="voh-ai-intelligence-layout" className="space-y-6">
      
      {/* Tab Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-current/10 pb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Sparkles className="w-5 h-5 text-violet-400 animate-pulse" />
            <h2 className="text-xl font-black font-sans tracking-tight text-current">
              VOH AI Assistant
            </h2>
          </div>
          <p className="text-xs text-current/60 font-sans">
            AI helper to summarize your feed, find users, search jobs, and translate.
          </p>
        </div>

        <div className="flex items-center gap-1 bg-current/5 border border-current/10 rounded-lg px-2 py-1 text-[10px] font-sans select-none">
          <BrainCircuit className="w-3.5 h-3.5 text-violet-400" />
          <span>VOH AI HELPER</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Side: Voice Studio Recorder */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-[#03010c] border border-violet-500/20 rounded-3xl p-5 flex flex-col justify-between min-h-[380px] relative overflow-hidden">
            
            {/* Glossy Overlay and Glow */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />
            
            <div className="flex items-center justify-between w-full border-b border-current/5 pb-2">
              <span className="text-[10px] font-sans tracking-wide text-violet-400 font-bold uppercase">
                Speak to Share Post
              </span>
              {isRecording && (
                <span className="flex items-center gap-1.5 text-[9px] font-sans text-rose-500 animate-pulse font-bold">
                  <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0" />
                  Recording {voiceTimer}s
                </span>
              )}
            </div>

            {/* Micro-waveform Wave Visualizer */}
            <div className="my-8 flex flex-col items-center justify-center space-y-4">
              <div className="flex items-center gap-1 h-20">
                {waveformNodes.map((h, i) => (
                  <motion.div
                    key={i}
                    style={{ height: `${h}px` }}
                    className={`w-1 rounded-full ${
                      isRecording 
                        ? 'bg-linear-to-t from-violet-500 to-pink-500' 
                        : 'bg-violet-950/40'
                    }`}
                    animate={{ scaleY: isRecording ? 1.1 : 1 }}
                    transition={{ duration: 0.1 }}
                  />
                ))}
              </div>

              {/* Recorder Trigger */}
              <button
                onClick={toggleRecording}
                disabled={isSynthesizingVoice}
                className={`w-16 h-16 rounded-full flex items-center justify-center transition-all ${
                  isRecording 
                    ? 'bg-rose-600 shadow-lg shadow-rose-500/30' 
                    : 'bg-linear-to-tr from-violet-600 to-pink-600 shadow-md hover:scale-105 active:scale-95 text-white'
                }`}
              >
                {isRecording ? <MicOff className="w-6 h-6 animate-pulse" /> : <Mic className="w-6 h-6" />}
              </button>

              <p className="text-[10px] font-sans text-current/50 text-center">
                {isRecording ? "Click again to finish and preview" : "Click mic to speak and write a post"}
              </p>
            </div>

            {/* Synthesizer Alert */}
            <AnimatePresence>
              {isSynthesizingVoice && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 bg-slate-950/90 backdrop-blur-md flex flex-col items-center justify-center p-4 z-25 text-center"
                >
                  <BrainCircuit className="w-10 h-10 text-violet-400 animate-spin mb-3" />
                  <p className="text-xs font-sans font-bold text-violet-300">WRITING YOUR POST...</p>
                  <p className="text-[10px] font-sans text-current/40 mt-1">VOH AI is typing your words...</p>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Resulting Transcription */}
            {transcription && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="pt-3 border-t border-current/10 space-y-3 z-10"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 text-[10px] font-sans text-current/40 uppercase font-semibold">
                    <FileText className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Your Spoken Post</span>
                  </div>
                  <p className="text-xs font-sans text-current leading-relaxed border border-current/5 bg-current/4 p-2.5 rounded-xl">
                    "{transcription}"
                  </p>
                </div>

                {/* Sub features: Summarized & Translated */}
                <div className="grid grid-cols-2 gap-2 text-[10px] font-sans">
                  <div className="bg-current/3 border border-current/5 p-2 rounded-lg">
                    <span className="text-current/40 block mb-0.5">QUICK SUMMARY</span>
                    <span className="text-fuchsia-400 font-bold truncate block">{summarizedText}</span>
                  </div>
                  <div className="bg-current/3 border border-current/5 p-2 rounded-lg">
                    <span className="text-current/40 block mb-0.5">TRANSLATION</span>
                    <span className="text-cyan-400 font-bold truncate block">{translation}</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <button
                    onClick={handlePostTranscription}
                    className="flex-1 py-2 text-[10px] font-sans font-black bg-linear-to-r from-violet-600 to-pink-500 text-white rounded-lg hover:opacity-90 active:scale-98"
                  >
                    POST TO FEED
                  </button>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(transcription);
                    }}
                    title="Copy to clipboard"
                    className="p-2 bg-current/5 rounded-lg border border-current/10 text-current/60 hover:text-current"
                  >
                    <ClipboardCopy className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            )}

          </div>
        </div>

        {/* Right Side: Direct AI Interactive Dialogue Terminal */}
        <div className="lg:col-span-7 flex flex-col justify-between border border-current/10 rounded-3xl bg-current/3 overflow-hidden min-h-[380px]">
          
          {/* Conversational Dialog History */}
          <div className="p-4 space-y-4 max-h-[300px] overflow-y-auto flex-1 font-sans">
            {conversation.map((msg, index) => (
              <div 
                key={index}
                className={`flex gap-3 max-w-[85%] ${msg.sender === 'user' ? 'ml-auto flex-row-reverse' : ''}`}
              >
                {msg.sender === 'voh' ? (
                  <div className="w-7 h-7 rounded-lg bg-violet-600/10 text-violet-400 flex items-center justify-center shrink-0">
                    <Sparkles className="w-4 h-4 animate-pulse" />
                  </div>
                ) : (
                  <div className="w-7 h-7 rounded-lg bg-cyan-600/10 text-cyan-400 flex items-center justify-center shrink-0">
                    <Volume2 className="w-4 h-4" />
                  </div>
                )}

                <div className="space-y-1.5">
                  <div className={`p-3 rounded-2xl text-xs leading-relaxed ${
                    msg.sender === 'voh' 
                      ? 'bg-[#0a071d] border border-violet-500/10 text-current' 
                      : 'bg-[#0f2129] border border-cyan-500/10 text-cyan-200'
                  }`}>
                    {msg.text}

                    {/* Quick Trigger Button embedded if action exists */}
                    {msg.action && (
                      <button 
                        onClick={() => setActiveTab(msg.action)}
                        className="mt-2.5 px-3 py-1.5 bg-violet-600 text-white font-sans text-[10px] font-bold rounded-lg flex items-center gap-1 hover:bg-violet-500 transition-all"
                      >
                        <span>View {msg.action === 'circles' ? 'Communities' : msg.action === 'messages' ? 'Chats' : msg.action === 'missions' ? 'Missions' : msg.action}</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                  
                  <div className="text-[8px] font-sans text-current/35 text-right px-1">
                    <RelativeTimestamp timestamp={msg.timestamp} />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Quick Predefined Prompts */}
          <div className="p-2 border-t border-current/5 bg-current/2 flex flex-wrap gap-1.5">
            <button
              onClick={() => {
                setQuery("Summarize my feed.");
              }}
              className="px-2.5 py-1 text-[10px] font-sans border border-current/10 rounded-lg hover:border-violet-500/30 text-current/70 hover:text-violet-400 transition-all bg-current/5 font-medium"
            >
              #SummarizeFeed
            </button>
            <button
              onClick={() => {
                setQuery("What is happening in Nigeria?");
              }}
              className="px-2.5 py-1 text-[10px] font-sans border border-current/10 rounded-lg hover:border-emerald-500/30 text-current/70 hover:text-emerald-400 transition-all bg-current/5 font-medium"
            >
              #NigeriaTrends
            </button>
            <button
              onClick={() => {
                setQuery("What is trending in Port Harcourt?");
              }}
              className="px-2.5 py-1 text-[10px] font-sans border border-current/10 rounded-lg hover:border-amber-500/30 text-current/70 hover:text-amber-400 transition-all bg-current/5 font-medium"
            >
              #PortHarcourtSparks
            </button>
            <button
              onClick={() => {
                setQuery("Summarize today's world pulse.");
              }}
              className="px-2.5 py-1 text-[10px] font-sans border border-current/10 rounded-lg hover:border-pink-500/30 text-current/70 hover:text-pink-400 transition-all bg-current/5 font-medium"
            >
              #SummarizePulse
            </button>
            <button
              onClick={() => {
                setQuery("Show me opportunities.");
              }}
              className="px-2.5 py-1 text-[10px] font-sans border border-current/10 rounded-lg hover:border-cyan-500/30 text-current/70 hover:text-cyan-400 transition-all bg-current/5 font-medium"
            >
              #FindOpportunities
            </button>
          </div>

          {/* Dialog Action bar input form */}
          <form onSubmit={handleSendPrompt} className="p-3 border-t border-current/10 bg-[#06040e]/90 flex gap-2">
            <input
              type="text"
              placeholder="Ask VOH AI to summarize feed, find people, recommend communities..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="flex-1 px-4 py-2 bg-current/5 border border-current/5 rounded-xl font-sans text-xs text-current focus:outline-hidden"
            />
            <button
              type="submit"
              disabled={!query.trim()}
              className="p-2.5 rounded-xl bg-violet-700 hover:bg-violet-600 text-white disabled:opacity-50 active:scale-95 transition-all"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>

        </div>
      </div>
    </div>
  );
}
