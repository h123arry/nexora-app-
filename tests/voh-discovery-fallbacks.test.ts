import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { SearchEngine } from '../src/services/voh/searchEngine';
import { RecommendationEngine } from '../src/services/voh/recommendationEngine';
import { NotificationEngine } from '../src/services/voh/notificationEngine';
import { PromptEngine } from '../src/services/voh/promptEngine';
import type { User, Post, Circle } from '../src/types';

const user = {
  id: 'u1', username: 'builder', name: 'Builder', avatar: '', bio: '', location: '', website: '',
  followers: 0, following: 0, isVerified: false, coverImage: '', joinedDate: '',
  reputationPoints: 0, reputationBreakdown: { contributions: 0, helpfulness: 0, missionsCompleted: 0, skillsVerified: 0 },
  interestDNA: { AI: 90 }, skills: ['TypeScript'],
} as User;

describe('VOH evidence-grounded helper services', () => {
  it('builds search suggestions only from supplied matching records', () => {
    const posts = [{ id: 'p1', content: 'Building an AI tool', tags: ['AI', 'TypeScript'] }] as unknown as Post[];
    const circles = [{ id: 'c1', name: 'AI Builders', tags: ['AI'] }] as unknown as Circle[];
    const result = SearchEngine.getSuggestions('AI', [], posts, circles);
    assert.deepEqual(result.suggestions, ['#AI', '#TypeScript']);
    assert.deepEqual(SearchEngine.getSuggestions('football', [], [], []).suggestions, []);
  });

  it('does not invent regional or popularity claims for unmatched creators', () => {
    const unmatched = { ...user, id: 'u2', username: 'other', interestDNA: {}, skills: [], reputationPoints: 9000 };
    const result = RecommendationEngine.getRecommendations(user, [unmatched], []);
    assert.deepEqual(result.creatorsToFollow, []);
  });

  it('recommends creators and circles only when actual shared profile signals exist', () => {
    const creator = { ...user, id: 'u2', username: 'ai-builder', interestDNA: { AI: 80 }, skills: ['TypeScript'] };
    const circle = { id: 'c1', name: 'AI Builders', tags: ['AI'] } as unknown as Circle;
    const result = RecommendationEngine.getRecommendations(user, [creator], [circle]);
    assert.match(result.creatorsToFollow[0].matchReason, /Shared interests/);
    assert.match(result.circlesToJoin[0].matchReason, /Shared topics/);
  });

  it('does not fabricate notification comment text or a current timestamp', () => {
    const alerts = NotificationEngine.extractHighImpactAlerts([{ id: 'n1', isRead: false, type: 'comment' }]);
    assert.equal(alerts[0].timestamp, 'Time unavailable');
    assert.equal(alerts[0].body, 'Open this notification to view its details.');
    const clustered = NotificationEngine.batchAndCluster([{
      id: 'n1', type: 'comment', senderName: 'Creator', targetId: 'post-1', timestamp: new Date(0),
    }]);
    assert.equal(clustered[0].clusteredText, 'Creator commented on your discussion');
    assert.doesNotMatch(clustered[0].clusteredText, /Nice view|Check out the update/);
  });

  it('keeps assistant prompts honest about missing trend and analytics evidence', () => {
    const cards = PromptEngine.getAssistantCards();
    const trends = cards.find(card => card.id === 'hashtag-trends')!;
    const analytics = cards.find(card => card.id === 'analytics-summary')!;
    assert.match(trends.promptTemplate, /Only call a hashtag trending or viral if/);
    assert.match(analytics.promptTemplate, /verified analytics supplied/);
  });
});
