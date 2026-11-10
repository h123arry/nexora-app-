export function isSafeLiveReplayObjectPath(value: unknown): value is string {
  return typeof value === 'string'
    && value.length > 0
    && value.length <= 1024
    && !value.startsWith('/')
    && !value.includes('..')
    && value.startsWith('nexora-live/');
}

export function canWatchLiveReplay(hostId: string, viewerId: string, hasAttended: boolean): boolean {
  return viewerId.length > 0 && (hostId === viewerId || hasAttended);
}
