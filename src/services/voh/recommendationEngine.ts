import type { User, Circle } from '../../types';

export interface RecommendationContext {
  followingCreatorIds?: readonly string[];
  blockedCreatorIds?: readonly string[];
  mutedCreatorIds?: readonly string[];
  joinedCircleIds?: readonly string[];
  blockedCircleIds?: readonly string[];
  limit?: number;
}

export interface RecommendationResult {
  creatorsToFollow: { id: string; name: string; username: string; avatar: string; matchReason: string }[];
  circlesToJoin: { id: string; name: string; matchReason: string }[];
}

function boundedLimit(value: number | undefined): number {
  return Number.isFinite(value) ? Math.max(0, Math.min(10, Math.floor(value as number))) : 3;
}

function normalizedSet(values: readonly string[] | undefined): Set<string> {
  return new Set((values || []).filter(value => typeof value === 'string' && value.trim()).map(value => value.trim().toLowerCase()));
}

function interestScore(user: User, candidate: User): { score: number; matches: string[] } {
  const own = user.interestDNA || {};
  const theirs = candidate.interestDNA || {};
  const matches = Object.keys(own)
    .filter(key => Object.prototype.hasOwnProperty.call(theirs, key) && Number(theirs[key]) > 0)
    .sort((a, b) => (Number(own[b]) * Number(theirs[b])) - (Number(own[a]) * Number(theirs[a])))
    .slice(0, 3);
  const weighted = matches.reduce((total, key) => {
    const left = Math.max(0, Math.min(100, Number(own[key]) || 0));
    const right = Math.max(0, Math.min(100, Number(theirs[key]) || 0));
    return total + (left * right) / 100;
  }, 0);
  return { score: weighted, matches };
}

function circleScore(user: User, circle: Circle): { score: number; matches: string[] } {
  const interests = new Set(Object.keys(user.interestDNA || {}).map(value => value.toLowerCase()));
  const matches = (circle.tags || []).filter(tag => interests.has(tag.toLowerCase())).slice(0, 3);
  return { score: matches.length * 10, matches };
}

export class RecommendationEngine {
  /**
   * Deterministic, explainable suggestions. Eligibility and privacy exclusions
   * are applied before ranking; the engine never treats a missing signal as a
   * reason to invent a location, popularity claim, or personal interest.
   */
  static getRecommendations(
    user: User,
    creators: User[],
    circles: Circle[],
    context: RecommendationContext = {},
  ): RecommendationResult {
    const limit = boundedLimit(context.limit);
    const following = normalizedSet(context.followingCreatorIds);
    const blockedCreators = normalizedSet(context.blockedCreatorIds);
    const mutedCreators = normalizedSet(context.mutedCreatorIds);
    const joinedCircles = normalizedSet(context.joinedCircleIds);
    const blockedCircles = normalizedSet(context.blockedCircleIds);

    const creatorsToFollow = creators
      .filter(candidate => {
        const id = candidate.id?.trim().toLowerCase();
        return Boolean(id)
          && id !== user.id.trim().toLowerCase()
          && !candidate.isBanned
          && !candidate.isSuspended
          && !following.has(id)
          && !blockedCreators.has(id)
          && !mutedCreators.has(id);
      })
      .map(candidate => {
        const interest = interestScore(user, candidate);
        const userSkills = new Set((user.skills || []).map(skill => skill.toLowerCase()));
        const sharedSkills = (candidate.skills || []).filter(skill => userSkills.has(skill.toLowerCase())).slice(0, 2);
        const reputation = Math.max(0, Number(candidate.reputationPoints) || 0);
        const reputationSignal = Math.min(8, Math.log10(reputation + 1) * 2);
        const score = interest.score * 2 + sharedSkills.length * 8 + reputationSignal;
        const reason = interest.matches.length
          ? 'Shared interests: ' + interest.matches.join(', ')
          : sharedSkills.length
            ? 'Shared skills: ' + sharedSkills.join(', ')
            : reputation > 0
              ? 'Established creator on NEXORA'
              : 'Suggested creator';
        return {
          id: candidate.id,
          name: candidate.name,
          username: candidate.username,
          avatar: candidate.avatar,
          matchReason: reason,
          score,
        };
      })
      .sort((a, b) => b.score - a.score || a.id.localeCompare(b.id))
      .slice(0, limit)
      .map(({ score: _score, ...creator }) => creator);

    const circlesToJoin = circles
      .filter(circle => {
        const id = circle.id?.trim().toLowerCase();
        const visibility = circle.type || 'unknown';
        return Boolean(id)
          && !joinedCircles.has(id)
          && !blockedCircles.has(id)
          && !((circle.bannedUsers || []).some(member => member.toLowerCase() === user.id.toLowerCase()))
          && visibility !== 'private'
          && visibility !== 'invite-only';
      })
      .map(circle => {
        const interest = circleScore(user, circle);
        const tags = (circle.tags || []).slice(0, 2);
        return {
          id: circle.id,
          name: circle.name,
          matchReason: interest.matches.length
            ? 'Matches your interests: ' + interest.matches.join(', ')
            : tags.length
              ? 'Explore topics: ' + tags.join(', ')
              : 'Suggested public community',
          score: interest.score,
        };
      })
      .sort((a, b) => b.score - a.score || a.id.localeCompare(b.id))
      .slice(0, limit)
      .map(({ score: _score, ...circle }) => circle);

    return { creatorsToFollow, circlesToJoin };
  }
}
