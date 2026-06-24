import { User, Circle } from '../../types';

export interface RecommendationResult {
  creatorsToFollow: { id: string; name: string; username: string; avatar: string; matchReason: string }[];
  circlesToJoin: { id: string; name: string; matchReason: string }[];
}

export class RecommendationEngine {
  static getRecommendations(user: User, creators: User[], circles: Circle[]): RecommendationResult {
    const userInterests = Object.keys(user.interestDNA || {});
    
    // Recommend creators who share skills or interests
    const creatorsToFollow = creators
      .filter(c => c.id !== user.id)
      .slice(0, 3)
      .map(c => {
        const sharedInterests = Object.keys(c.interestDNA || {}).filter(interest => userInterests.includes(interest));
        return {
          id: c.id,
          name: c.name,
          username: c.username,
          avatar: c.avatar,
          matchReason: sharedInterests.length > 0 
            ? `Both interested in ${sharedInterests.slice(0, 2).join(' & ')}` 
            : `Top creator in your region with ${c.reputationPoints.toLocaleString()} Reputation PR`
        };
      });

    // Recommend circles based on tags
    const circlesToJoin = circles
      .slice(0, 3)
      .map(cir => {
        return {
          id: cir.id,
          name: cir.name,
          matchReason: `Focuses on hashtags: ${cir.tags.slice(0, 2).join(', ')}`
        };
      });

    return {
      creatorsToFollow,
      circlesToJoin
    };
  }
}
