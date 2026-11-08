export const CREATOR_MEMBERSHIP_TIER_LIMIT = 3;
export const CREATOR_MEMBERSHIP_BENEFIT_LIMIT = 5;

export interface CreatorMembershipTierInput {
  name: string;
  description: string;
  benefits: string[];
}

export function validateCreatorMembershipTierInput(value: unknown): CreatorMembershipTierInput {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Membership tier details are required.');
  const input = value as Record<string, unknown>;
  if (typeof input.name !== 'string' || input.name.trim().length < 3 || input.name.trim().length > 40) {
    throw new Error('Tier name must be between 3 and 40 characters.');
  }
  if (typeof input.description !== 'string' || input.description.trim().length < 10 || input.description.trim().length > 300) {
    throw new Error('Description must be between 10 and 300 characters.');
  }
  if (!Array.isArray(input.benefits) || input.benefits.length < 1 || input.benefits.length > CREATOR_MEMBERSHIP_BENEFIT_LIMIT) {
    throw new Error('Add between 1 and 5 membership benefits.');
  }
  const benefits = input.benefits.map((benefit) => {
    if (typeof benefit !== 'string' || benefit.trim().length < 3 || benefit.trim().length > 80) {
      throw new Error('Each benefit must be between 3 and 80 characters.');
    }
    return benefit.trim();
  });
  if (new Set(benefits.map(benefit => benefit.toLocaleLowerCase())).size !== benefits.length) {
    throw new Error('Membership benefits must be unique.');
  }
  return { name: input.name.trim(), description: input.description.trim(), benefits };
}

export function validateCreatorMembershipTierId(value: unknown): string {
  if (typeof value !== 'string' || !/^[A-Za-z0-9_-]{1,128}$/.test(value)) throw new Error('A valid membership tier reference is required.');
  return value;
}
