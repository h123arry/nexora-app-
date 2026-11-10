import { httpsCallable } from 'firebase/functions';
import { auth } from './config';
import { functions } from '../../lib/firebase';

export type NexoraSearchKind = 'person' | 'post' | 'video' | 'page' | 'circle' | 'live' | 'event' | 'service' | 'update' | 'poll' | 'announcement' | 'hashtag';
export interface NexoraSearchHit {
  id: string; kind: NexoraSearchKind; title: string; subtitle: string; excerpt: string;
  image: string; targetId: string; targetPath: string; ownerId: string;
  verified: boolean; createdAt: string; score: number; tags: string[];
}
export interface NexoraSearchResult { results: NexoraSearchHit[]; nextCursor: string | null; query: string; }
export async function searchNexora(query: string, cursor?: string | null, kinds?: NexoraSearchKind[]): Promise<NexoraSearchResult> {
  if (!auth.currentUser) throw new Error('Sign in to search NEXORA.');
  const callable = httpsCallable<{query:string;cursor?:string|null;kinds?:NexoraSearchKind[]},NexoraSearchResult>(functions,'searchNexora');
  return (await callable({query,cursor,kinds})).data;
}
export interface NexoraTrendingTopic { tag: string; score: number; postCount: number; creatorCount: number; }
export async function getNexoraTrendingTopics(): Promise<NexoraTrendingTopic[]> {
  if (!auth.currentUser) return [];
  const callable = httpsCallable<void,{topics:NexoraTrendingTopic[]}>(functions,'getNexoraTrendingTopics');
  return (await callable()).data.topics;
}
