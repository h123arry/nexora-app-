export interface PendingAction {
  id: string;
  action: 'saveUser' | 'savePost' | 'addComment' | 'addFollow' | 'removeFollow' | 'addNotification' | 'createPage' | 'createCommunity' | 'report' | 'saveDraft' | 'logActivity' | 'sendMessage' | 'updatePrivacy';
  payload: any;
  timestamp: number;
  retryCount: number;
}

/**
 * Keep failed work while preserving actions added or updated during a flush.
 * Successful entries from the original snapshot are intentionally removed.
 */
export function mergePendingActions(
  initialQueue: PendingAction[],
  failedActions: PendingAction[],
  latestQueue: PendingAction[],
): PendingAction[] {
  const initialById = new Map(initialQueue.map(item => [item.id, item]));
  const failedById = new Map(failedActions.map(item => [item.id, item]));
  // Only keep queue entries that are genuinely new or newer than the snapshot.
  // An unchanged snapshot entry must not overwrite a failed action's incremented retry count.
  const pendingDuringFlush = latestQueue.filter(item => {
    const initial = initialById.get(item.id);
    return !initial || item.timestamp > initial.timestamp;
  });
  const mergedQueue = new Map<string, PendingAction>();
  for (const item of failedActions) mergedQueue.set(item.id, item);
  for (const item of pendingDuringFlush) {
    const failed = failedById.get(item.id);
    const initial = initialById.get(item.id);
    if (!failed || !initial || item.timestamp > initial.timestamp) mergedQueue.set(item.id, item);
  }
  return [...mergedQueue.values()];
}


/** Retain failed work indefinitely; retry limits must never delete user data. */
export function retainFailedAction(action: PendingAction): PendingAction {
  const retryCount = Number.isSafeInteger(action.retryCount) && action.retryCount >= 0
    ? action.retryCount
    : 0;
  return { ...action, retryCount: Math.min(Number.MAX_SAFE_INTEGER, retryCount + 1) };
}
