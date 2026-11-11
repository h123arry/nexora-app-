export type VideoRendition = { height?: unknown; mp4Path?: unknown };

export function safeVideoRenditions(value: unknown, ownerId: string, mediaAssetId: string): Array<{ height: number; path: string }> {
  if (!Array.isArray(value)) return [];
  const prefix = `processed/${ownerId}/${mediaAssetId}/`;
  return value.flatMap((item: VideoRendition) => {
    if (!item || !Number.isSafeInteger(item.height) || (item.height as number) < 144 || (item.height as number) > 4320
      || typeof item.mp4Path !== 'string' || !item.mp4Path.startsWith(prefix)
      || item.mp4Path.split('/').some(segment => !segment || segment === '.' || segment === '..')
      || item.mp4Path.includes(String.fromCharCode(92))) return [];
    return [{ height: item.height as number, path: item.mp4Path }];
  }).sort((a, b) => a.height - b.height);
}

export function chooseVideoRendition(renditions: Array<{ height: number; path: string }>) {
  return renditions.find(item => item.height === 720)
    || renditions.filter(item => item.height <= 720).at(-1)
    || renditions[0]
    || null;
}

export function canResolvePublicPostMedia(
  post: Record<string, unknown> | undefined,
  asset: Record<string, unknown> | undefined,
  mediaAssetId: string,
): boolean {
  return post?.audience === 'public'
    && post.mediaAssetId === mediaAssetId
    && typeof post.userId === 'string'
    && post.userId.length > 0
    && asset?.ownerId === post.userId
    && asset.kind === 'video';
}
