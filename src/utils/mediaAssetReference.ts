/** Validate the stable mediaAssets document ID before linking it to a post. */
export function normalizeMediaAssetId(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const id = value.trim();
  return /^[A-Za-z0-9_-]{1,128}$/.test(id) ? id : undefined;
}
