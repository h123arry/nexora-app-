import { httpsCallable } from 'firebase/functions';
import { functions } from '../lib/firebase';

export type CreatorLensRecipe = {
  brightness: number;
  contrast: number;
  saturation: number;
  hue: number;
};

export type CreatorLensRecord = {
  id: string;
  name: string;
  recipe: CreatorLensRecipe;
  filter: string;
  status: 'draft' | 'pending_review' | 'approved' | 'rejected';
  version: number;
  updatedAt: string | null;
  reviewNote?: string;
};

export async function saveCreatorLens(input: { lensId?: string; name: string; recipe: CreatorLensRecipe }) {
  const callable = httpsCallable<typeof input, { lensId: string; saved: boolean; version: number; status: 'draft' }>(functions, 'saveCreatorLens');
  return (await callable(input)).data;
}

export async function submitCreatorLensForReview(lensId: string) {
  const callable = httpsCallable<{ lensId: string }, { lensId: string; submitted: boolean; status: 'pending_review' }>(functions, 'submitCreatorLensForReview');
  return (await callable({ lensId })).data;
}

export async function listMyCreatorLenses() {
  const callable = httpsCallable<void, { lenses: CreatorLensRecord[] }>(functions, 'listMyCreatorLenses');
  return (await callable()).data.lenses;
}

export async function listPublishedCreatorLenses() {
  const callable = httpsCallable<void, { lenses: Array<CreatorLensRecord & { creatorId: string; publishedAt: string | null }> }>(functions, 'listPublishedCreatorLenses');
  return (await callable()).data.lenses;
}
