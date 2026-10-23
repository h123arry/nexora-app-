import { Post } from '../../types';

export function appendUniquePosts(existing: Post[], incoming: Post[]): Post[] {
  const seen = new Set(existing.map(post => post.id));
  return [...existing, ...incoming.filter(post => !seen.has(post.id))];
}

export function mergeRealtimePosts(existing: Post[], latestPage: Post[]): Post[] {
  const latestIds = new Set(latestPage.map(post => post.id));
  return [...latestPage, ...existing.filter(post => !latestIds.has(post.id))];
}
