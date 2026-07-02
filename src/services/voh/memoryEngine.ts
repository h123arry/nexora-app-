export interface UserMemoryProfile {
  preferences: {
    theme: string;
    aiTone: 'futuristic' | 'concise' | 'educational' | 'humorous';
    voiceAutoPlay: boolean;
  };
  creatorGoals: string[];
  writingStyle: string;
  interests: string[];
  recentHashtags: string[];
  savedPrompts: { id: string; name: string; content: string }[];
}

const STORAGE_KEYS = {
  MEMORY: 'voh_memory_profile',
};

export class MemoryEngine {
  static getActiveUserId(): string {
    const savedUser = localStorage.getItem('nexora_user');
    if (savedUser) {
      try {
        const u = JSON.parse(savedUser);
        if (u && u.id) return u.id;
      } catch (e) {}
    }
    return 'default';
  }

  static getMemory(): UserMemoryProfile {
    const userId = this.getActiveUserId();
    const key = `${STORAGE_KEYS.MEMORY}_${userId}`;
    const data = localStorage.getItem(key);
    if (!data) {
      const defaultMemory: UserMemoryProfile = {
        preferences: {
          theme: 'dark',
          aiTone: 'futuristic',
          voiceAutoPlay: false
        },
        creatorGoals: ['Build open creator networks', 'Scale micro-payments in Port Harcourt', 'Design high contrast UI components'],
        writingStyle: 'Professional with space-glass branding and technical Mono accents',
        interests: ['AI', 'UI/UX Design', 'Systems Engineering', 'Football', 'Lagos Startups'],
        recentHashtags: ['SpaceGlass', 'BuildInPublic', 'AIEngines', 'FutureHuman'],
        savedPrompts: [
          { id: '1', name: 'Summarize Daily Pulse', content: 'Scan recent posts and give me a high-intensity pulse analysis with key hashtags.' },
          { id: '2', name: 'Optimize Creator Bio', content: 'Rewrite my bio to focus on high-reputation community building and product design.' },
          { id: '3', name: 'Generate Thread Ideas', content: 'Create a highly scannable thread of 5 steps to build an app in Port Harcourt.' }
        ]
      };
      localStorage.setItem(key, JSON.stringify(defaultMemory));
      return defaultMemory;
    }
    return JSON.parse(data);
  }

  static saveMemory(memory: UserMemoryProfile): void {
    const userId = this.getActiveUserId();
    const key = `${STORAGE_KEYS.MEMORY}_${userId}`;
    localStorage.setItem(key, JSON.stringify(memory));
  }

  // Future persistence abstraction layer hook
  static async syncWithCloud(userId: string, memory: UserMemoryProfile): Promise<boolean> {
    console.log(`[Memory Cloud Synchronization Layer]: Syncing memory profile for user ${userId}...`);
    // Simulated cloud sync success
    return true;
  }
}
