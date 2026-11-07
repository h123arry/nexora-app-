import { getFunctions, httpsCallable } from 'firebase/functions';
import { app } from '../firebase/config';

export interface CreatorAudiencePoint {
  day: string;
  follows: number;
  unfollows: number;
  netFollowerChange: number;
  followerCount: number | null;
  uniqueProfileVisitors: number;
  newProfileVisitors: number;
  returningProfileVisitors: number;
}
export interface CreatorAudienceAnalytics {
  days: number;
  source: string;
  points: CreatorAudiencePoint[];
  totals: {
    follows: number;
    unfollows: number;
    netFollowerChange: number;
    uniqueProfileVisitors: number;
    newProfileVisitors: number;
    returningProfileVisitors: number;
  };
}

export async function getCreatorAudienceAnalytics(days = 7): Promise<CreatorAudienceAnalytics> {
  const callable = httpsCallable<{ days: number }, CreatorAudienceAnalytics>(
    getFunctions(app), 'getCreatorAudienceAnalytics',
  );
  const response = await callable({ days });
  return response.data;
}

export async function recordCreatorProfileVisit(creatorId: string): Promise<void> {
  const callable = httpsCallable<{ creatorId: string }, { recorded: boolean }>(
    getFunctions(app), 'recordCreatorProfileVisit',
  );
  await callable({ creatorId });
}
