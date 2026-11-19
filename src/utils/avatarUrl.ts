const DEFAULT_PERSON_AVATAR = 'photo-1535713875002-d1d0cf377fde';

export function getRenderableAvatarUrl(value?: string): string | null {
  if (!value || value.includes(DEFAULT_PERSON_AVATAR)) return null;
  const match = /^\/api\/media\/([A-Za-z0-9_-]{1,128})$/.exec(value);
  return match ? `/api/media/${match[1]}` : null;
}
