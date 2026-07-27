import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Globe, Share2, Users, Flame, HeartHandshake, X, ChevronRight, Check } from 'lucide-react';
import VohIcon from './VohIcon';

interface OnboardingTourProps {
  onClose: () => void;
}

export default function OnboardingTour({ onClose }: OnboardingTourProps) {
  const [step, setStep] = useState(0);

  const steps = [
    {
      title: "Welcome to Nexora",
      description: "Discover what's happening around the world in real time with high-fidelity media, live feeds, and intelligent recommendations.",
      icon: <VohIcon size={44} animated glow variant="brand" />,
      tag: "GLOBAL LIVING FEED",
      color: "from-violet-500 to-purple-600"
    },
    {
      title: "Share & Create",
      description: "Share photos, videos, ideas, and moments effortlessly using Nexora's built-in creation studio and AI tools.",
      icon: <Share2 className="w-10 h-10 text-cyan-400" />,
      tag: "CREATION STUDIO",
      color: "from-cyan-500 to-blue-600"
    },
    {
      title: "Connect & Inspire",
      description: "Connect with people who inspire you. Join vibrant circles, exchange direct messages, and collaborate across topics.",
      icon: <Users className="w-10 h-10 text-pink-400" />,
      tag: "CIRCLES & MESSAGING",
      color: "from-pink-500 to-rose-600"
    },
    {
      title: "Earn Sparks",
      description: "Earn Sparks by creating engaging content and building your reputation within the global Nexora community.",
      icon: <Flame className="w-10 h-10 text-amber-400" />,
      tag: "REPUTATION & SPARKS",
      color: "from-amber-500 to-orange-600"
    },
    {
      title: "Build Your Community",
      description: "Build your community one connection at a time. Customize your profile, select your interests, and shape your network.",
      icon: <HeartHandshake className="w-10 h-10 text-emerald-400" />,
      tag: "COMMUNITY BUILDER",
      color: "from-emerald-500 to-teal-600"
    }
  ];

  const handleNext = () => {
    if (step < steps.length - 1) {
      setStep(step + 1);
    } else {
      handleComplete();
    }
  };

  const handlePrev = () => {
    if (step > 0) {
      setStep(step - 1);
    }
  };

  const handleComplete = () => {
    localStorage.setItem('nexora_onboarding_completed', 'true');
    onClose();
  };

  const current = steps[step];

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        className="relative w-full max-w-lg bg-[#080616] border border-white/10 rounded-3xl overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,0.8)] flex flex-col"
      >
        {/* Background ambient glow */}
        <div className={`absolute -top-20 -left-20 w-44 h-44 bg-gradient-to-br ${current.color} opacity-20 blur-[50px] pointer-events-none transition-all duration-500`} />
        <div className={`absolute -bottom-20 -right-20 w-44 h-44 bg-gradient-to-br ${current.color} opacity-15 blur-[50px] pointer-events-none transition-all duration-500`} />

        {/* Header Close/Skip */}
        <div className="flex items-center justify-between p-6 pb-2 z-10">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono uppercase tracking-widest text-violet-400 font-bold bg-violet-950/60 border border-white/10 px-2.5 py-1 rounded-full">
              {current.tag}
            </span>
            <span className="text-[10px] font-mono text-zinc-500">
              {step + 1} / {steps.length}
            </span>
          </div>
          <button 
            onClick={handleComplete}
            className="p-1.5 rounded-full hover:bg-white/10 text-zinc-400 hover:text-white transition-colors cursor-pointer"
            title="Skip guide"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Box */}
        <div className="p-8 flex flex-col items-center text-center z-10 flex-1 min-h-[260px] justify-center">
          <div className="mb-5 p-4 bg-violet-950/30 border border-white/10 rounded-2xl flex items-center justify-center shadow-inner">
            {current.icon}
          </div>

          <h3 className="text-2xl font-sans font-black text-white mb-2.5 tracking-tight">
            {current.title}
          </h3>
          
          <p className="text-sm text-zinc-300 leading-relaxed max-w-md font-sans">
            {current.description}
          </p>
        </div>

        {/* Progress Dots */}
        <div className="flex justify-center gap-2 px-8 z-10 mb-2">
          {steps.map((_, i) => (
            <button 
              key={i}
              onClick={() => setStep(i)}
              className={`h-1.5 rounded-full cursor-pointer transition-all duration-300 ${
                i === step ? 'w-7 bg-gradient-to-r from-violet-500 to-fuchsia-500' : 'w-2 bg-white/20 hover:bg-white/40'
              }`}
            />
          ))}
        </div>

        {/* Footer Navigation Buttons */}
        <div className="p-6 pt-4 flex gap-3 z-10">
          {step > 0 && (
            <button
              onClick={handlePrev}
              className="flex-1 py-3 border border-white/10 hover:bg-white/5 text-zinc-300 rounded-2xl text-xs font-mono font-bold uppercase tracking-wider transition-all cursor-pointer"
            >
              Back
            </button>
          )}
          
          <button
            onClick={handleNext}
            className="flex-1 py-3 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white rounded-2xl text-xs font-mono font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 shadow-[0_4px_20px_rgba(139,92,246,0.3)] cursor-pointer"
          >
            {step === steps.length - 1 ? (
              <>
                <span>Enter Nexora</span>
                <Check className="w-3.5 h-3.5" />
              </>
            ) : (
              <>
                <span>Next</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </>
            )}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
