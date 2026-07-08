import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, Compass, Plus, Inbox, User, X, ChevronRight, Check } from 'lucide-react';

interface OnboardingTourProps {
  onClose: () => void;
}

export default function OnboardingTour({ onClose }: OnboardingTourProps) {
  const [step, setStep] = useState(0);

  const steps = [
    {
      title: "Welcome to Nexora V1.2",
      description: "Welcome to the next evolution of digital connection. Let's take a quick 30-second tour to discover your creative studio.",
      icon: <Sparkles className="w-12 h-12 text-violet-400 animate-pulse" />,
      color: "from-violet-500 to-purple-500"
    },
    {
      title: "Seamless Home Feed",
      description: "Swipe up or down to explore immersive high-fidelity videos. Double-tap to Spark (❤️) content, engage in threaded discussions, or mark posts as not interested.",
      icon: <Sparkles className="w-12 h-12 text-pink-400" />,
      color: "from-pink-500 to-rose-500"
    },
    {
      title: "Advanced Search & Discovery",
      description: "Discover trending hashtags, explore specialized content categories, and connect with official creators or community pages.",
      icon: <Compass className="w-12 h-12 text-cyan-400" />,
      color: "from-cyan-500 to-blue-500"
    },
    {
      title: "Media Creation Suite",
      description: "Publish instant video shorts or static posts, schedule broadcasts, or archive your work to your private studio archives.",
      icon: <Plus className="w-12 h-12 text-amber-400" />,
      color: "from-amber-500 to-orange-500"
    },
    {
      title: "Centralized Inbox",
      description: "Stay in touch through simplified direct messages, system notifications, and brand collaboration requests.",
      icon: <Inbox className="w-12 h-12 text-teal-400" />,
      color: "from-teal-500 to-emerald-500"
    },
    {
      title: "Creator Profile & Archives",
      description: "Manage your published posts, view pinned items, access your private archives, and customize your system settings.",
      icon: <User className="w-12 h-12 text-fuchsia-400" />,
      color: "from-fuchsia-500 to-purple-500"
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
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative w-full max-w-lg bg-[#0a071d]/90 border border-white/10 rounded-3xl overflow-hidden shadow-[0_0_50px_rgba(139,92,246,0.15)] flex flex-col"
      >
        {/* Background ambient glow */}
        <div className={`absolute -top-24 -left-24 w-48 h-48 bg-gradient-to-br ${current.color} opacity-20 blur-[60px] pointer-events-none transition-all duration-500`} />
        <div className={`absolute -bottom-24 -right-24 w-48 h-48 bg-gradient-to-br ${current.color} opacity-10 blur-[60px] pointer-events-none transition-all duration-500`} />

        {/* Header Close/Skip */}
        <div className="flex items-center justify-between p-6 pb-2 z-10">
          <span className="text-[10px] font-mono uppercase tracking-widest text-violet-400 font-bold">
            Onboarding • Step {step + 1} of {steps.length}
          </span>
          <button 
            onClick={handleComplete}
            className="p-1.5 rounded-full hover:bg-white/10 text-zinc-400 hover:text-white transition-colors cursor-pointer"
            title="Skip tour"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Box */}
        <div className="p-8 flex flex-col items-center text-center z-10 flex-1 min-h-[280px]">
          <div className="mb-6 p-4 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center shadow-inner">
            {current.icon}
          </div>

          <h3 className="text-xl font-sans font-extrabold text-white mb-3 tracking-tight">
            {current.title}
          </h3>
          
          <p className="text-sm text-zinc-300 leading-relaxed max-w-sm">
            {current.description}
          </p>
        </div>

        {/* Progress Dots */}
        <div className="flex justify-center gap-1.5 px-8 z-10">
          {steps.map((_, i) => (
            <div 
              key={i}
              onClick={() => setStep(i)}
              className={`h-1.5 rounded-full cursor-pointer transition-all duration-300 ${
                i === step ? 'w-6 bg-gradient-to-r from-violet-500 to-fuchsia-500' : 'w-1.5 bg-white/20 hover:bg-white/40'
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
                <span>Get Started</span>
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
