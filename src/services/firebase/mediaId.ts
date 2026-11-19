/** Preserve Firestore document ID case when using an ID as a media path segment. */
export function normalizeMediaId(value: string): string {
  const normalized = value.replace(/[^A-Za-z0-9_-]+/g, '-').slice(0, 128);
  if (!normalized) throw new Error('A valid media ID is required.');
  return normalized;
}
