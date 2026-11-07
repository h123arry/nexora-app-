import { httpsCallable } from 'firebase/functions';
import { functions } from '../lib/firebase';

export type CreatorScheduledPost = {
  id: string;
  content: string;
  imageUrl: string;
  videoUrl: string;
  tags: string[];
  status: 'scheduled' | 'published' | 'cancelled' | 'blocked';
  scheduledAt: string | null;
  publishedPostId: string | null;
};

export async function scheduleCreatorPost(input: {
  content: string; imageUrl?: string; videoUrl?: string; tags: string[]; scheduledAt: string;
}): Promise<{ scheduleId: string; status: 'scheduled'; scheduledAt: string }> {
  const callable = httpsCallable<typeof input, { scheduleId: string; status: 'scheduled'; scheduledAt: string }>(functions, 'scheduleCreatorPost');
  return (await callable(input)).data;
}

export async function listCreatorScheduledPosts(): Promise<CreatorScheduledPost[]> {
  const callable = httpsCallable<void, { schedules: CreatorScheduledPost[] }>(functions, 'listCreatorScheduledPosts');
  return (await callable()).data.schedules;
}

export async function cancelCreatorScheduledPost(scheduleId: string): Promise<void> {
  const callable = httpsCallable<{ scheduleId: string }, { cancelled: boolean }>(functions, 'cancelCreatorScheduledPost');
  await callable({ scheduleId });
}
