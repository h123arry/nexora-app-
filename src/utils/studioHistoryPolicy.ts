export function appendHistorySnapshot<T>(history: T[], snapshot: T, limit = 40): T[] {
  const requestedLimit = Number.isFinite(limit) ? Math.floor(limit) : 40;
  const safeLimit = Math.max(1, Math.min(200, requestedLimit));
  return [...history, snapshot].slice(-safeLimit);
}

export function reorderById<T extends { id: string }>(items: T[], sourceId: string, targetId: string): T[] {
  if (sourceId === targetId) return items;
  const sourceIndex = items.findIndex(item => item.id === sourceId);
  const targetIndex = items.findIndex(item => item.id === targetId);
  if (sourceIndex < 0 || targetIndex < 0) return items;
  const next = [...items];
  const [moved] = next.splice(sourceIndex, 1);
  next.splice(sourceIndex < targetIndex ? targetIndex - 1 : targetIndex, 0, moved);
  return next;
}
