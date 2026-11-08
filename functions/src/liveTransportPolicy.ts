export type LiveTransportRole = 'host' | 'viewer';

export interface LiveTransportAccessInput {
  status: unknown;
  hostId: unknown;
  userId: string;
  connectionId: string;
  viewerConnectionIds: unknown;
  viewerExpiresAtMs: number | null;
  hostExpiresAtMs: number | null;
  nowMs: number;
}

export function resolveLiveTransportRole(input: LiveTransportAccessInput): LiveTransportRole {
  if (input.status !== 'live') throw new Error('This live room has ended.');
  if (!Number.isSafeInteger(input.nowMs) || input.nowMs < 0) throw new Error('Live transport clock is invalid.');
  if (input.hostId === input.userId) {
    if (!Number.isSafeInteger(input.hostExpiresAtMs) || (input.hostExpiresAtMs as number) <= input.nowMs) {
      throw new Error('The host connection has expired. Refresh the live room before publishing.');
    }
    return 'host';
  }
  if (!Array.isArray(input.viewerConnectionIds)
    || !input.viewerConnectionIds.includes(input.connectionId)
    || !Number.isSafeInteger(input.viewerExpiresAtMs)
    || (input.viewerExpiresAtMs as number) <= input.nowMs) {
    throw new Error('Join this live room before requesting video access.');
  }
  return 'viewer';
}
