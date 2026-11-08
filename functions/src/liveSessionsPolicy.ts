export const LIVE_SESSION_TITLE_MIN = 3;
export const LIVE_SESSION_TITLE_MAX = 80;
export const LIVE_CHAT_MESSAGE_MAX = 500;
export const LIVE_CHAT_WINDOW_MS = 10_000;
export const LIVE_CHAT_WINDOW_MAX_MESSAGES = 5;

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
