export interface QuickAssistantCard {
  id: string;
  category: 'creator' | 'writing' | 'community' | 'analytics' | 'profile' | 'hashtag';
  name: string;
  description: string;
  promptTemplate: string;
}

export class PromptEngine {
  static getAssistantCards(): QuickAssistantCard[] {
    return [
      {
        id: 'creator-tips',
        category: 'creator',
        name: '📈 Creator Growth Tips',
        description: 'Actionable tips and trends to boost subscriber engagement.',
        promptTemplate: 'Analyze current Nexora trends and recommend 3 tactical subscriber growth ideas.'
      },
      {
        id: 'creator-ideas',
        category: 'creator',
        name: '💡 Video / Post Ideas',
        description: 'Fresh video formats, stories, and post layouts.',
        promptTemplate: 'Generate 5 unique content ideas focusing on tech developers building in Port Harcourt.'
      },
      {
        id: 'writing-polish',
        category: 'writing',
        name: '✨ Rewrite & Polish',
        description: 'Enhance structure, flow, and hashtags.',
        promptTemplate: 'Polish the following text to make it incredibly compelling, adding balanced markdown structure: '
      },
      {
        id: 'writing-thread',
        category: 'writing',
        name: '🧵 Create Twitter/Nex Thread',
        description: 'Break a complex topic into scannable posts.',
        promptTemplate: 'Convert this message into a 4-part engaging thread with tags: '
      },
      {
        id: 'community-suggest',
        category: 'community',
        name: '👥 Rules & Description',
        description: 'Formulate community rules and descriptions.',
        promptTemplate: 'Generate high-reputation community guidelines and a welcoming description for: '
      },
      {
        id: 'analytics-summary',
        category: 'analytics',
        name: '📊 Growth Analysis',
        description: 'Synthesize performance and offer action items.',
        promptTemplate: 'Based on Nexora metrics, outline 3 actionable recommendations to improve subscriber retention.'
      },
      {
        id: 'profile-bio',
        category: 'profile',
        name: '👤 Bio & Name Optimization',
        description: 'Optimize bios to stand out.',
        promptTemplate: 'Optimize my profile bio to represent me as a leading creator co-building decentralized networks.'
      },
      {
        id: 'hashtag-trends',
        category: 'hashtag',
        name: '🏷️ Niche & Trending Hashtags',
        description: 'Discover relevant hashtags for discoverability.',
        promptTemplate: 'Suggest the top 8 viral hashtags for a post about building Web3 and AI frameworks in Lagos.'
      }
    ];
  }
}
