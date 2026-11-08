import { httpsCallable } from 'firebase/functions';
import { functions } from '../lib/firebase';

export interface CreatorMembershipTier {
  id: string; name: string; description: string; benefits: string[];
  status: 'draft' | 'archived'; createdAt: string | null; updatedAt: string | null; version: number;
}
export interface CreatorMembershipTierInput { name: string; description: string; benefits: string[]; }
export async function listCreatorMembershipTiers() {
  const call = httpsCallable<void, { checkoutEnabled: false; tiers: CreatorMembershipTier[] }>(functions, 'listCreatorMembershipTiers');
  return (await call()).data;
}
export async function createCreatorMembershipTier(tier: CreatorMembershipTierInput) {
  const call = httpsCallable<CreatorMembershipTierInput, { tierId: string; status: 'draft'; checkoutEnabled: false }>(functions, 'createCreatorMembershipTier');
  return (await call(tier)).data;
}
export async function updateCreatorMembershipTier(tierId: string, tier: CreatorMembershipTierInput) {
  const call = httpsCallable<{ tierId: string; tier: CreatorMembershipTierInput }, { tierId: string; status: 'draft'; checkoutEnabled: false }>(functions, 'updateCreatorMembershipTier');
  return (await call({ tierId, tier })).data;
}
export async function archiveCreatorMembershipTier(tierId: string) {
  const call = httpsCallable<{ tierId: string }, { tierId: string; status: 'archived'; checkoutEnabled: false }>(functions, 'archiveCreatorMembershipTier');
  return (await call({ tierId })).data;
}
