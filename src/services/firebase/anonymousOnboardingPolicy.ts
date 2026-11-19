export interface AnonymousAccountReminderInput {
  joinedAt: number;
  lastDismissedDate?: string;
  hasVerifiedEmail: boolean;
  hasPhone: boolean;
  now?: Date;
}

// Account setup prompts are device-local UX. Firebase Auth and Firestore
// remain authoritative; this schedule only controls reminder timing.
export const ANONYMOUS_ACCOUNT_PROMPT_DELAYS_MS = [
  10_000,
  20_000,
  30_000,
  60_000,
  120_000,
  300_000,
  600_000,
  1_800_000,
] as const;

export interface AnonymousAccountPromptState {
  dismissals: number;
  nextPromptAt: number | null;
}

export function getAnonymousAccountPromptDelayMs(dismissals: number): number {
  const index = Math.max(0, Math.floor(Number.isFinite(dismissals) ? dismissals : 0));
  return ANONYMOUS_ACCOUNT_PROMPT_DELAYS_MS[Math.min(index, ANONYMOUS_ACCOUNT_PROMPT_DELAYS_MS.length - 1)];
}

export function readAnonymousAccountPromptState(raw: string | null): AnonymousAccountPromptState {
  if (!raw) return { dismissals: 0, nextPromptAt: null };
  try {
    const parsed = JSON.parse(raw) as { dismissals?: unknown; nextPromptAt?: unknown };
    const dismissals = typeof parsed.dismissals === 'number' && Number.isFinite(parsed.dismissals)
      ? Math.max(0, Math.floor(parsed.dismissals))
      : 0;
    const nextPromptAt = typeof parsed.nextPromptAt === 'number' && Number.isFinite(parsed.nextPromptAt)
      ? parsed.nextPromptAt
      : null;
    return { dismissals, nextPromptAt };
  } catch {
    return { dismissals: 0, nextPromptAt: null };
  }
}

export function dismissAnonymousAccountPrompt(
  now = Date.now(),
  state: AnonymousAccountPromptState = { dismissals: 0, nextPromptAt: null },
): AnonymousAccountPromptState {
  const dismissals = state.dismissals + 1;
  return { dismissals, nextPromptAt: now + getAnonymousAccountPromptDelayMs(dismissals) };
}

export function getAnonymousMemberUsername(uid: string): string {
  return `member_${uid.slice(0, 10).toLowerCase()}`;
}

export function shouldShowAnonymousAccountReminder(input: AnonymousAccountReminderInput): {
  show: boolean;
  today: string;
  daysSinceJoin: number;
} {
  const now = input.now || new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const joinedAt = Number.isFinite(input.joinedAt) ? input.joinedAt : now.getTime();
  const daysSinceJoin = Math.max(0, Math.floor((now.getTime() - joinedAt) / 86400000));
  return {
    today,
    daysSinceJoin,
    show: (!input.hasVerifiedEmail || !input.hasPhone)
      && daysSinceJoin >= 1
      && now.getDay() === 3
      && input.lastDismissedDate !== today,
  };
}
