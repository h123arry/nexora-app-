export type DeletionRequestStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';

export function canClaimDeletionLease(status: DeletionRequestStatus | undefined, leaseExpiresAtMs: number | undefined, nowMs: number): boolean {
  if (status === 'completed' || status === 'cancelled') return false;
  if (status !== 'processing') return true;
  return !Number.isFinite(leaseExpiresAtMs) || (leaseExpiresAtMs as number) <= nowMs;
}

export function ownsDeletionLease(status: DeletionRequestStatus | undefined, currentLeaseId: unknown, expectedLeaseId: string): boolean {
  return status === 'processing' && typeof expectedLeaseId === 'string' && expectedLeaseId.length > 0 && currentLeaseId === expectedLeaseId;
}
