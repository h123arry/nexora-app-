export const CREATOR_EARNINGS_PAGE_SIZE = 100;

/** Validate an earnings document cursor without accepting arbitrary Firestore paths. */
export function validateCreatorEarningsCursor(value: unknown): string | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  if (typeof value !== 'string' || !/^gift_[a-f0-9]{64}$/.test(value)) {
    throw new Error('The earnings page cursor is invalid.');
  }
  return value;
}
