import { auth } from '../../lib/firebase';

export interface UserMemoryProfile {
  /** Persistent VOH memory is disabled until the user explicitly opts in. */
  memoryEnabled: boolean;
  consentVersion?: string;
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
    return auth.currentUser?.uid || 'guest';
  }

  static getMemory(): UserMemoryProfile {
    const userId = this.getActiveUserId();
    const key = `${STORAGE_KEYS.MEMORY}_${userId}`;
    const data = localStorage.getItem(key);
    if (!data) {
      const defaultMemory: UserMemoryProfile = {
        memoryEnabled: false,
        consentVersion: undefined,
        preferences: {
          theme: 'dark',
          aiTone: 'futuristic',
          voiceAutoPlay: false
        },
        creatorGoals: [],
        writingStyle: '',
        interests: [],
        recentHashtags: [],
        savedPrompts: []
      };
      localStorage.setItem(key, JSON.stringify(defaultMemory));
      return defaultMemory;
    }
    const parsed = JSON.parse(data) as Partial<UserMemoryProfile>;
    const optedIn = parsed.memoryEnabled === true;
    return {
      ...parsed,
      memoryEnabled: optedIn,
      preferences: {
        theme: 'dark',
        aiTone: 'futuristic',
        voiceAutoPlay: false,
        ...(parsed.preferences || {})
      },
      creatorGoals: optedIn && Array.isArray(parsed.creatorGoals) ? parsed.creatorGoals : [],
      writingStyle: optedIn && typeof parsed.writingStyle === 'string' ? parsed.writingStyle : '',
      interests: optedIn && Array.isArray(parsed.interests) ? parsed.interests : [],
      recentHashtags: optedIn && Array.isArray(parsed.recentHashtags) ? parsed.recentHashtags : [],
      savedPrompts: optedIn && Array.isArray(parsed.savedPrompts) ? parsed.savedPrompts : []
    } as UserMemoryProfile;
  }

  static saveMemory(memory: UserMemoryProfile): void {
    const userId = this.getActiveUserId();
    const key = `${STORAGE_KEYS.MEMORY}_${userId}`;
    localStorage.setItem(key, JSON.stringify(memory));
  }

  static setConsent(enabled: boolean): UserMemoryProfile {
    const memory = this.getMemory();
    const next = {
      ...memory,
      memoryEnabled: enabled,
      consentVersion: enabled ? '2026-10' : undefined
    };
    this.saveMemory(next);
    return next;
  }

  static clearMemory(): UserMemoryProfile {
    const userId = this.getActiveUserId();
    localStorage.removeItem(`${STORAGE_KEYS.MEMORY}_${userId}`);
    return this.getMemory();
  }

  /** Cloud persistence is intentionally unavailable until a real authorized backend is connected. */
  static async syncWithCloud(): Promise<boolean> {
    return false;
  }
}
