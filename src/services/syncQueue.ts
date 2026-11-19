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
  const failedIds = new Set(failedActions.map(item => item.id));
  const pendingDuringFlush = latestQueue.filter(item => {
    const initial = initialById.get(item.id);
    return !initial || item.timestamp > initial.timestamp || failedIds.has(item.id);
  });
  const mergedQueue = new Map<string, PendingAction>();
  [...failedActions, ...pendingDuringFlush].forEach(item => mergedQueue.set(item.id, item));
  return [...mergedQueue.values()];
}

/** Retain failed work indefinitely; retry limits must never delete user data. */
export function retainFailedAction(action: PendingAction): PendingAction {
  return { ...action, retryCount: Math.min(Number.MAX_SAFE_INTEGER, action.retryCount + 1) };
}
