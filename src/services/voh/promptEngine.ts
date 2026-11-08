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
        name: 'Creator Growth Experiments',
        description: 'Plan measurable creator experiments using verified account analytics.',
        promptTemplate: 'Use only the verified creator analytics supplied in this conversation. If reach, retention or conversion data is unavailable, say so. Suggest three measurable growth experiments without inventing results.'
      },
      {
        id: 'creator-ideas',
        category: 'creator',
        name: 'Content Ideas',
        description: 'Generate original ideas using the creator niche and available content history.',
        promptTemplate: 'Generate five original post or video ideas based on my stated niche and the content history supplied. Ask me for my niche if it is not available.'
      },
      {
        id: 'writing-polish',
        category: 'writing',
        name: 'Rewrite & Polish',
        description: 'Improve structure, clarity and flow while preserving the author’s voice.',
        promptTemplate: 'Polish the following text for clarity and flow while preserving my natural voice: '
      },
      {
        id: 'writing-thread',
        category: 'writing',
        name: 'Create a Thread',
        description: 'Break a complex topic into scannable, connected posts.',
        promptTemplate: 'Convert this message into a clear, connected four-part thread with relevant tags: '
      },
      {
        id: 'community-suggest',
        category: 'community',
        name: 'Community Rules & Description',
        description: 'Draft practical community rules and a welcoming description.',
        promptTemplate: 'Draft clear, practical community guidelines and a welcoming description for this community: '
      },
      {
        id: 'analytics-summary',
        category: 'analytics',
        name: 'Evidence-Based Growth Analysis',
        description: 'Summarize only recorded metrics and identify useful next experiments.',
        promptTemplate: 'Summarize only the verified analytics supplied. Separate counts, rates and inferences, identify missing metrics, and suggest three measurable next steps.'
      },
      {
        id: 'profile-bio',
        category: 'profile',
        name: 'Bio & Name Optimization',
        description: 'Improve profile positioning without inventing credentials or achievements.',
        promptTemplate: 'Help me improve my profile bio using only the skills, experience and goals I provide. Do not invent credentials, locations or achievements.'
      },
      {
        id: 'hashtag-trends',
        category: 'hashtag',
        name: 'Relevant Hashtags',
        description: 'Suggest tags from the post topic and supplied trend evidence.',
        promptTemplate: 'Suggest relevant hashtags based on the post content. Only call a hashtag trending or viral if a current, supplied trend snapshot supports that claim.'
      }
    ];
  }
}
