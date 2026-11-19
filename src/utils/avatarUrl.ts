const DEFAULT_PERSON_AVATAR = 'photo-1535713875002-d1d0cf377fde';

export function getRenderableAvatarUrl(value?: string): string | null {
  if (!value || value.includes(DEFAULT_PERSON_AVATAR)) return null;
  if (/^\/api\/media\/[A-Za-z0-9_-]{1,128}$/.test(value)) return value;

  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' || url.username || url.password) return null;
    return url.href;
  } catch {
    return null;
  }
}
