import { User, Circle } from '../../types';

export interface RecommendationResult {
  creatorsToFollow: { id: string; name: string; username: string; avatar: string; matchReason: string }[];
  circlesToJoin: { id: string; name: string; matchReason: string }[];
}

/** Recommend only when the supplied profile records contain a visible match signal. */
export class RecommendationEngine {
  static getRecommendations(user: User, creators: User[], circles: Circle[]): RecommendationResult {
    const interests = new Set(Object.keys(user.interestDNA || {}).map(value => value.toLocaleLowerCase()));
    const skills = new Set((Array.isArray(user.skills) ? user.skills : []).map(value => value.toLocaleLowerCase()));

    const creatorsToFollow = creators
      .filter(creator => creator.id !== user.id)
      .map(creator => {
        const sharedInterests = Object.keys(creator.interestDNA || {})
          .filter(value => interests.has(value.toLocaleLowerCase()));
        const sharedSkills = (Array.isArray(creator.skills) ? creator.skills : [])
          .filter(value => skills.has(value.toLocaleLowerCase()));
        const matchCount = sharedInterests.length + sharedSkills.length;
        const matchReason = sharedInterests.length
          ? `Shared interests: ${sharedInterests.slice(0, 2).join(' & ')}`
          : sharedSkills.length
            ? `Shared skills: ${sharedSkills.slice(0, 2).join(' & ')}`
            : '';
        return { creator, matchCount, matchReason };
      })
      .filter(item => item.matchCount > 0)
      .sort((a, b) => b.matchCount - a.matchCount)
      .slice(0, 3)
      .map(({ creator, matchReason }) => ({
        id: creator.id, name: creator.name, username: creator.username, avatar: creator.avatar, matchReason,
      }));

    const circlesToJoin = circles
      .map(circle => {
        const sharedTopics = (Array.isArray(circle.tags) ? circle.tags : [])
          .filter(tag => interests.has(tag.toLocaleLowerCase()) || skills.has(tag.toLocaleLowerCase()));
        return { circle, sharedTopics };
      })
      .filter(item => item.sharedTopics.length > 0)
      .slice(0, 3)
      .map(({ circle, sharedTopics }) => ({
        id: circle.id,
        name: circle.name,
        matchReason: `Shared topics: ${sharedTopics.slice(0, 3).map(tag => `#${tag.replace(/^#/, '')}`).join(', ')}`,
      }));

    return { creatorsToFollow, circlesToJoin };
  }
}
