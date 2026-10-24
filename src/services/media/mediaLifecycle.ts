export type MediaLifecycleStatus = 'pending_upload' | 'uploaded' | 'processing' | 'ready' | 'failed' | 'rejected';

const transitions: Record<MediaLifecycleStatus, readonly MediaLifecycleStatus[]> = {
  pending_upload: ['uploaded', 'failed', 'rejected'],
  uploaded: ['processing', 'failed', 'rejected'],
  processing: ['ready', 'failed', 'rejected'],
  ready: ['failed'],
  failed: ['pending_upload', 'processing'],
  rejected: [],
};

export function canTransitionMedia(from: MediaLifecycleStatus, to: MediaLifecycleStatus): boolean {
  return transitions[from].includes(to);
}

export function assertMediaTransition(from: MediaLifecycleStatus, to: MediaLifecycleStatus): void {
  if (!canTransitionMedia(from, to)) {
    throw new Error(`Invalid media lifecycle transition: ${from} -> ${to}`);
  }
}
