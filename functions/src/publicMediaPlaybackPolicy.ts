export type VideoRendition = { height?: unknown; mp4Path?: unknown };

export function safeVideoRenditions(value: unknown, ownerId: string, mediaAssetId: string): Array<{ height: number; path: string }> {
  if (!Array.isArray(value)) return [];
  const prefix = `processed/${ownerId}/${mediaAssetId}/`;
  return value.flatMap((item: VideoRendition) => {
    if (!item || !Number.isSafeInteger(item.height) || (item.height as number) < 144 || (item.height as number) > 4320
      || typeof item.mp4Path !== 'string' || !item.mp4Path.startsWith(prefix)
      || item.mp4Path.includes('..') || item.mp4Path.includes('\\\\')) return [];
    return [{ height: item.height as number, path: item.mp4Path }];
  }).sort((a, b) => a.height - b.height);
}

export function chooseVideoRendition(renditions: Array<{ height: number; path: string }>) {
  return renditions.find(item => item.height === 720)
    || renditions.filter(item => item.height <= 720).at(-1)
    || renditions[0]
    || null;
}
