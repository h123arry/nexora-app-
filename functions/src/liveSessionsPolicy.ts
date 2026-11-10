export const LIVE_SESSION_TITLE_MIN = 3;
export const LIVE_SESSION_TITLE_MAX = 80;
export const LIVE_CHAT_MESSAGE_MAX = 500;
export const LIVE_CHAT_WINDOW_MS = 10_000;
export const LIVE_CHAT_WINDOW_MAX_MESSAGES = 5;
export const LIVE_WATCH_DURATION_MAX_MS = 24 * 60 * 60 * 1000;

export function calculateLiveWatchDurationMs(joinedAt: unknown, endedAtMs: number): number {
  if (!Number.isFinite(endedAtMs) || endedAtMs < 0) return 0;
  let joinedAtMs = 0;
  if (typeof joinedAt === 'number' && Number.isFinite(joinedAt)) joinedAtMs = joinedAt;
  else if (joinedAt instanceof Date) joinedAtMs = joinedAt.getTime();
  else if (typeof joinedAt === 'string') joinedAtMs = Date.parse(joinedAt);
  else if (joinedAt && typeof joinedAt === 'object') {
    const timestamp = joinedAt as { toMillis?: () => number; toDate?: () => Date };
    try {
      if (typeof timestamp.toMillis === 'function') joinedAtMs = timestamp.toMillis();
      else if (typeof timestamp.toDate === 'function') joinedAtMs = timestamp.toDate().getTime();
    } catch {
      return 0;
    }
  }
  if (!Number.isFinite(joinedAtMs) || joinedAtMs <= 0 || joinedAtMs > endedAtMs) return 0;
  return Math.min(endedAtMs - joinedAtMs, LIVE_WATCH_DURATION_MAX_MS);
}

export interface LiveSessionSettings {
  chatEnabled?: boolean;
  giftsEnabled?: boolean;
}

export function validateLiveSessionSettings(value: unknown): LiveSessionSettings {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Live room settings are invalid.');
  const data = value as Record<string, unknown>;
  const keys = Object.keys(data);
  if (!keys.length || keys.some(key => key !== 'chatEnabled' && key !== 'giftsEnabled')) {
    throw new Error('Choose at least one supported live room setting.');
  }
  for (const key of keys) {
    if (typeof data[key] !== 'boolean') throw new Error('Live room settings must be enabled or disabled.');
  }
  return {
    ...(Object.prototype.hasOwnProperty.call(data, 'chatEnabled') ? { chatEnabled: data.chatEnabled as boolean } : {}),
    ...(Object.prototype.hasOwnProperty.call(data, 'giftsEnabled') ? { giftsEnabled: data.giftsEnabled as boolean } : {}),
  };
}

export type LiveGuestDecision = 'approved' | 'denied';

export function validateLiveGuestId(value: unknown): string {
  if (typeof value !== 'string' || !/^[A-Za-z0-9._-]{1,128}$/.test(value)) throw new Error('A valid guest account is required.');
  return value;
}

export function validateLiveGuestDecision(value: unknown): LiveGuestDecision {
  if (value !== 'approved' && value !== 'denied') throw new Error('Choose approve or deny for the guest request.');
  return value;
}

export function validateLiveSessionTitle(value: unknown): string {
  if (typeof value !== 'string' || value.trim().length < LIVE_SESSION_TITLE_MIN || value.trim().length > LIVE_SESSION_TITLE_MAX) {
    throw new Error('Live room title must be between 3 and 80 characters.');
  }
  return value.trim();
}

export function validateLiveSessionId(value: unknown): string {
  if (typeof value !== 'string' || !/^[A-Za-z0-9_-]{1,128}$/.test(value)) throw new Error('A valid live room is required.');
  return value;
}

export function validateLiveChatMessage(value: unknown): string {
  if (typeof value !== 'string' || !value.trim() || value.trim().length > LIVE_CHAT_MESSAGE_MAX) {
    throw new Error('Live chat messages must contain between 1 and 500 characters.');
  }
  return value.trim();
}

export interface LiveChatRateState { windowStartedAtMs: number; messageCount: number; }
export function nextLiveChatRateState(current: LiveChatRateState | null, nowMs: number): LiveChatRateState {
  if (!Number.isSafeInteger(nowMs) || nowMs < 0) throw new Error('Live chat clock is invalid.');
  const inWindow = current !== null && nowMs >= current.windowStartedAtMs && nowMs - current.windowStartedAtMs < LIVE_CHAT_WINDOW_MS;
  const state = inWindow ? current : { windowStartedAtMs: nowMs, messageCount: 0 };
  if (!Number.isSafeInteger(state.messageCount) || state.messageCount < 0 || state.messageCount >= LIVE_CHAT_WINDOW_MAX_MESSAGES) {
    throw new Error('You are sending messages too quickly. Wait a moment and try again.');
  }
  return { windowStartedAtMs: state.windowStartedAtMs, messageCount: state.messageCount + 1 };
}

export function validateLiveConnectionId(value: unknown): string {
  if (typeof value !== 'string' || !/^[A-Za-z0-9_-]{8,80}$/.test(value)) throw new Error('A valid live connection reference is required.');
  return value;
}
