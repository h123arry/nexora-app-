export interface PostShareCardCopyInput {
  name?: string | null;
  username?: string | null;
  content?: string | null;
}

export interface PostShareCardCopy {
  author: string;
  handle: string;
  excerpt: string;
}

const cleanShareText = (value: string): string =>
  value
    .replace(/[\u0000-\u001F\u007F-\u009F]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

export function buildPostShareCardCopy(input: PostShareCardCopyInput = {}): PostShareCardCopy {
  const author = cleanShareText(input.name || '') || 'A NEXORA creator';
  const rawHandle = cleanShareText(input.username || '').replace(/^@+/, '');
  const handle = rawHandle ? `@${rawHandle}` : '';
  const excerpt = cleanShareText(input.content || '').slice(0, 240)
    || 'Discover conversations, creators and communities on NEXORA.';

  return { author, handle, excerpt };
}
