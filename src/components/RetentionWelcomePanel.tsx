import React, { useEffect, useMemo, useState } from "react";
import { Flame, Sparkles, X } from "lucide-react";
import { httpsCallable } from "firebase/functions";
import { functions } from "../lib/firebase";
import { Notification } from "../types";

interface SessionSummary {
  currentStreak: number;
  longestStreak: number;
  graceDayApplied: boolean;
  previousLastVisitAt: string | null;
}
interface Props { userId: string; notifications: Notification[]; }

export default function RetentionWelcomePanel({ userId, notifications }: Props) {
  const [summary, setSummary] = useState<SessionSummary | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;
    const cacheKey = `nexora_session_summary_${userId}`;
    try {
      const cached = sessionStorage.getItem(cacheKey);
      if (cached) {
        setSummary(JSON.parse(cached) as SessionSummary);
        return () => { active = false; };
      }
    } catch { /* Session cache is optional. */ }
    const recordSession = httpsCallable<Record<string, never>, SessionSummary>(functions, "recordDailySession");
    recordSession({})
      .then(response => {
        if (!active) return;
        setSummary(response.data);
        try { sessionStorage.setItem(cacheKey, JSON.stringify(response.data)); } catch { /* Optional cache only. */ }
      })
      .catch(() => { if (active) setFailed(true); });
    return () => { active = false; };
  }, [userId]);

  const newNotifications = useMemo(() => {
    if (!summary?.previousLastVisitAt) return [];
    const lastVisit = Date.parse(summary.previousLastVisitAt);
    if (!Number.isFinite(lastVisit)) return [];
    return notifications
      .filter(item => {
        const timestamp = Date.parse(item.timestamp);
        return Number.isFinite(timestamp) && timestamp > lastVisit;
      })
      .sort((a, b) => Date.parse(b.timestamp) - Date.parse(a.timestamp))
      .slice(0, 3);
  }, [notifications, summary]);

  if (dismissed || failed || !summary) return null;
  return (
    <section aria-label="Your NEXORA return summary" className="fixed bottom-20 left-3 right-3 z-[70] mx-auto max-w-md rounded-2xl border border-violet-400/20 bg-[#090714]/95 p-4 shadow-2xl shadow-black/50 backdrop-blur-xl lg:bottom-6 lg:left-auto lg:right-6">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-violet-200"><Sparkles className="h-4 w-4" /> Welcome back</div>
          <div className="mt-2 flex items-center gap-2 text-white">
            <Flame className="h-5 w-5 text-orange-400" />
            <strong className="text-xl tabular-nums">{summary.currentStreak} day streak</strong>
            <span className="text-[10px] text-zinc-500">Best: {summary.longestStreak}</span>
          </div>
          {summary.graceDayApplied && <p className="mt-1 text-[11px] text-violet-200">Your weekly grace day protected your streak.</p>}
        </div>
        <button type="button" onClick={() => setDismissed(true)} aria-label="Dismiss return summary" className="rounded-full p-1.5 text-zinc-500 hover:bg-white/10 hover:text-white"><X className="h-4 w-4" /></button>
      </div>
      <div className="mt-3 border-t border-white/10 pt-3">
        <p className="text-xs font-semibold text-zinc-200">Since your last visit</p>
        {newNotifications.length ? (
          <ul className="mt-2 space-y-1.5">{newNotifications.map(item => <li key={item.id} className="truncate text-xs text-zinc-400">{item.content}</li>)}</ul>
        ) : <p className="mt-1 text-xs text-zinc-500">You're caught up. Your next conversation can start here.</p>}
      </div>
    </section>
  );
}
