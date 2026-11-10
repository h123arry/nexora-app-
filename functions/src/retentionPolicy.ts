export interface DailyStreakRecord {
  lastActiveDay?: string;
  currentStreak?: number;
  longestStreak?: number;
  graceWeekUsed?: string;
}

export interface DailyStreakResult {
  lastActiveDay: string;
  currentStreak: number;
  longestStreak: number;
  graceWeekUsed: string | null;
  graceDayApplied: boolean;
}

export function utcDayKey(timestamp: number): string {
  return new Date(timestamp).toISOString().slice(0, 10);
}

export function isoWeekKey(timestamp: number): string {
  const date = new Date(timestamp);
  const day = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const week = Math.ceil((((date.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return date.getUTCFullYear() + "-W" + String(week).padStart(2, "0");
}

export function calculateDailyStreak(record: DailyStreakRecord, nowMs: number): DailyStreakResult {
  const today = utcDayKey(nowMs);
  const week = isoWeekKey(nowMs);
  const current = Number.isSafeInteger(record.currentStreak) && (record.currentStreak || 0) > 0
    ? record.currentStreak as number
    : 0;
  const longest = Number.isSafeInteger(record.longestStreak) && (record.longestStreak || 0) > 0
    ? record.longestStreak as number
    : 0;
  const lastDay = typeof record.lastActiveDay === "string" ? record.lastActiveDay : "";
  if (!lastDay) {
    return { lastActiveDay: today, currentStreak: 1, longestStreak: Math.max(1, longest), graceWeekUsed: record.graceWeekUsed || null, graceDayApplied: false };
  }
  const previous = Date.parse(lastDay + "T00:00:00.000Z");
  const todayStart = Date.parse(today + "T00:00:00.000Z");
  const gap = Number.isFinite(previous) ? Math.round((todayStart - previous) / 86400000) : Number.POSITIVE_INFINITY;
  if (gap <= 0) {
    return { lastActiveDay: lastDay, currentStreak: Math.max(1, current), longestStreak: Math.max(longest, current, 1), graceWeekUsed: record.graceWeekUsed || null, graceDayApplied: false };
  }
  if (gap === 1) {
    const next = Math.max(1, current) + 1;
    return { lastActiveDay: today, currentStreak: next, longestStreak: Math.max(longest, next), graceWeekUsed: record.graceWeekUsed || null, graceDayApplied: false };
  }
  if (gap === 2 && record.graceWeekUsed !== week) {
    const next = Math.max(1, current) + 1;
    return { lastActiveDay: today, currentStreak: next, longestStreak: Math.max(longest, next), graceWeekUsed: week, graceDayApplied: true };
  }
  return { lastActiveDay: today, currentStreak: 1, longestStreak: Math.max(longest, 1), graceWeekUsed: record.graceWeekUsed || null, graceDayApplied: false };
}
