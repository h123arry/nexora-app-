import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ArrowRight, Check, Compass, Sparkles, X } from "lucide-react";

interface OnboardingTourProps {
  onClose: () => void;
  onInterestSelected?: (interest: string) => void;
  onStartFirstTask?: () => void;
}
const interests = [
  { id: "Technology", label: "Technology", detail: "AI, innovation and digital culture" },
  { id: "Creators", label: "Creators", detail: "Art, video, storytelling and ideas" },
  { id: "Business", label: "Business", detail: "Entrepreneurship and opportunities" },
  { id: "Sports", label: "Sports", detail: "Teams, games and global moments" },
  { id: "Lifestyle", label: "Lifestyle", detail: "People, culture and everyday life" },
  { id: "Learning", label: "Learning", detail: "Knowledge, skills and useful answers" },
];

export default function OnboardingTour({ onClose, onInterestSelected, onStartFirstTask }: OnboardingTourProps) {
  const [interest, setInterest] = useState("");
  const [step, setStep] = useState<"question" | "ready">("question");
  const chooseInterest = (value: string) => {
    setInterest(value);
    onInterestSelected?.(value);
    setStep("ready");
  };
  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/85 p-4 backdrop-blur-xl">
      <AnimatePresence mode="wait">
        <motion.section key={step} initial={{ opacity: 0, y: 14, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -10 }} className="relative w-full max-w-lg overflow-hidden rounded-3xl border border-violet-400/20 bg-[#090714] p-6 shadow-2xl sm:p-8">
          <button type="button" onClick={onClose} aria-label="Close onboarding" className="absolute right-5 top-5 rounded-full p-2 text-zinc-400 hover:bg-white/10 hover:text-white"><X className="h-4 w-4" /></button>
          <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-2xl border border-violet-400/20 bg-violet-500/10 text-violet-300">{step === "question" ? <Compass className="h-6 w-6" /> : <Sparkles className="h-6 w-6" />}</div>
          {step === "question" ? <>
            <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-violet-300">Your NEXORA starting point</p>
            <h2 className="mt-3 text-2xl font-black tracking-tight text-white sm:text-3xl">What are you most interested in?</h2>
            <p className="mt-2 text-sm leading-6 text-zinc-400">Choose one. We'll use it to shape the first things you see.</p>
            <div className="mt-6 grid grid-cols-1 gap-2 sm:grid-cols-2">{interests.map(item => <button key={item.id} type="button" onClick={() => chooseInterest(item.id)} className="rounded-2xl border border-white/10 bg-white/[0.03] p-3 text-left transition hover:border-violet-400/50 hover:bg-violet-500/10"><span className="block text-sm font-bold text-white">{item.label}</span><span className="mt-1 block text-xs text-zinc-400">{item.detail}</span></button>)}</div>
            <p className="mt-5 text-xs text-zinc-500">You can change your interests any time in your profile settings.</p>
          </> : <>
            <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-violet-300">You're in</p>
            <h2 className="mt-3 text-2xl font-black tracking-tight text-white sm:text-3xl">Your {interest.toLowerCase()} corner is ready.</h2>
            <p className="mt-2 text-sm leading-6 text-zinc-400">NEXORA will use this preference to guide discovery. Your first contribution can be as simple as introducing yourself or sharing one thought.</p>
            <div className="mt-6 rounded-2xl border border-violet-400/15 bg-violet-500/[0.07] p-4"><div className="flex items-center gap-2 text-sm font-bold text-violet-200"><Check className="h-4 w-4" /> First-session mission</div><p className="mt-2 text-sm text-zinc-300">Publish one short post and see it appear in your NEXORA feed.</p></div>
            <button type="button" onClick={onStartFirstTask || onClose} className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-violet-600 to-purple-600 px-5 py-3.5 text-sm font-bold text-white shadow-lg shadow-violet-950/40">Create your first post <ArrowRight className="h-4 w-4" /></button>
            <button type="button" onClick={onClose} className="mt-3 w-full rounded-xl px-4 py-2 text-xs font-semibold text-zinc-400 hover:text-white">Explore NEXORA first</button>
          </>}
        </motion.section>
      </AnimatePresence>
    </div>
  );
}
