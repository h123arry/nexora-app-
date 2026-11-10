export interface LiveDiscoverySignals {
  id: string;
  startedAt?: unknown;
  viewerCount?: number;
  peakViewerCount?: number;
  messageCount?: number;
  giftCount?: number;
}

function timestampMs(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = Date.parse(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  if (value && typeof value === 'object') {
    const candidate = value as { toMillis?: () => number; toDate?: () => Date };
    try {
      if (typeof candidate.toMillis === 'function') {
        const parsed = candidate.toMillis();
        return Number.isFinite(parsed) ? parsed : 0;
      }
      if (typeof candidate.toDate === 'function') {
        const parsed = candidate.toDate().getTime();
        return Number.isFinite(parsed) ? parsed : 0;
      }
    } catch {
      return 0;
    }
  }
  return 0;
}

function safeCount(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? Math.max(0, Math.min(value, 1_000_000_000)) : 0;
}

/**
 * A freshness-weighted ranking for live rooms. Gifts contribute only a small
 * signal so the discovery feed does not become a pay-to-win leaderboard.
 */
export function scoreLiveRoom(room: LiveDiscoverySignals, nowMs: number): number {
  if (!Number.isFinite(nowMs) || nowMs < 0) return 0;
  const startedAt = timestampMs(room.startedAt);
  if (!startedAt || startedAt > nowMs + 5 * 60_000) return 0;
  const ageMinutes = Math.max(0, (nowMs - startedAt) / 60_000);
  const freshness = Math.exp(-ageMinutes / 180);
  const viewers = safeCount(room.viewerCount);
  const peak = Math.max(viewers, safeCount(room.peakViewerCount));
  const messages = safeCount(room.messageCount);
  const gifts = safeCount(room.giftCount);
  const audienceSignal = Math.log1p(viewers) * 2.4 + Math.log1p(peak) * 0.35;
  const conversationSignal = Math.log1p(messages) * 0.8;
  const giftSignal = Math.log1p(gifts) * 0.12;
  return freshness * (audienceSignal + conversationSignal + giftSignal);
}

export function rankLiveRooms<T extends LiveDiscoverySignals>(rooms: readonly T[], nowMs: number): T[] {
  return [...rooms].sort((a, b) => {
    const scoreDifference = scoreLiveRoom(b, nowMs) - scoreLiveRoom(a, nowMs);
    if (Math.abs(scoreDifference) > 1e-9) return scoreDifference;
    const timeDifference = timestampMs(b.startedAt) - timestampMs(a.startedAt);
    if (timeDifference !== 0) return timeDifference;
    return safeCount(b.viewerCount) - safeCount(a.viewerCount);
  });
}
