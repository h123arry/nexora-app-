export interface VohAccountContext {
  id: string;
  name: string;
  username: string;
  bio: string;
  followers: number | null;
  following: number | null;
  sparks: number | null;
  reputationPoints: number | null;
  skills: string[];
  interests: { interest: string; strength: number }[];
  creatorModeEnabled: boolean;
  joinedDate: string;
}

function safeText(value: unknown, maxLength: number): string {
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : '';
}

function safeCount(value: unknown): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) return null;
  return Math.min(1_000_000_000, value);
}

/**
 * Creates the minimal, privacy-filtered account snapshot VOH may use.
 * The UID always comes from verified server authentication, never the profile.
 */
export function shapeAuthenticatedVohAccountContext(uid: string, profile: Record<string, unknown>): VohAccountContext {
  const skills = Array.isArray(profile.skills)
    ? profile.skills.filter((item): item is string => typeof item === 'string')
      .map(item => safeText(item, 80)).filter(Boolean).slice(0, 30)
    : [];
  const interestDNA = profile.interestDNA && typeof profile.interestDNA === 'object' && !Array.isArray(profile.interestDNA)
    ? Object.entries(profile.interestDNA as Record<string, unknown>)
      .filter(([, value]) => typeof value === 'number' && Number.isFinite(value) && value > 0)
      .sort((a, b) => Number(b[1]) - Number(a[1]))
      .slice(0, 8)
      .map(([key, value]) => ({ interest: safeText(key, 60), strength: Math.max(0, Math.min(100, Number(value))) }))
      .filter(item => item.interest.length > 0)
    : [];

  return {
    id: uid,
    name: safeText(profile.name, 120),
    username: safeText(profile.username, 80),
    bio: safeText(profile.bio, 500),
    followers: safeCount(profile.followers),
    following: safeCount(profile.following),
    sparks: safeCount(profile.sparks),
    reputationPoints: safeCount(profile.reputationPoints),
    skills,
    interests: interestDNA,
    creatorModeEnabled: profile.creatorModeEnabled === true,
    joinedDate: safeText(profile.joinedDate, 80),
  };
}
