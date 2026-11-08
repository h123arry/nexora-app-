import { auth } from '../../lib/firebase';
import { authenticatedVohFetch } from './authenticatedVohFetch';

export interface UserMemoryProfile {
  memoryEnabled: boolean;
  consentVersion?: string;
  preferences: {
    theme: string;
    aiTone: 'futuristic' | 'concise' | 'educational' | 'humorous';
    voiceAutoPlay: boolean;
  };
  creatorGoals: string[];
  personalFacts: string[];
  writingStyle: string;
  interests: string[];
  recentHashtags: string[];
  savedPrompts: { id: string; name: string; content: string }[];
}

const STORAGE_KEYS = { MEMORY: 'voh_memory_profile' };
const CONSENT_VERSION = '2026-11';

function emptyMemory(): UserMemoryProfile {
  return {
    memoryEnabled: false,
    consentVersion: undefined,
    preferences: { theme: 'dark', aiTone: 'futuristic', voiceAutoPlay: false },
    creatorGoals: [],
    personalFacts: [],
    writingStyle: '',
    interests: [],
    recentHashtags: [],
    savedPrompts: []
  };
}

function normalizeMemory(value: Partial<UserMemoryProfile> | null | undefined): UserMemoryProfile {
  const enabled = value?.memoryEnabled === true;
  const preferences = value?.preferences || emptyMemory().preferences;
  return {
    memoryEnabled: enabled,
    consentVersion: enabled ? CONSENT_VERSION : undefined,
    preferences: {
      theme: typeof preferences.theme === 'string' ? preferences.theme.slice(0, 40) : 'dark',
      aiTone: ['futuristic', 'concise', 'educational', 'humorous'].includes(preferences.aiTone)
        ? preferences.aiTone
        : 'futuristic',
      voiceAutoPlay: preferences.voiceAutoPlay === true
    },
    creatorGoals: enabled && Array.isArray(value?.creatorGoals) ? value!.creatorGoals!.filter(x => typeof x === 'string').slice(0, 30) : [],
    personalFacts: enabled && Array.isArray(value?.personalFacts) ? value!.personalFacts!.filter(x => typeof x === 'string').map(x => x.slice(0, 500)).slice(0, 60) : [],
    writingStyle: enabled && typeof value?.writingStyle === 'string' ? value.writingStyle.slice(0, 1000) : '',
    interests: enabled && Array.isArray(value?.interests) ? value!.interests!.filter(x => typeof x === 'string').slice(0, 50) : [],
    recentHashtags: enabled && Array.isArray(value?.recentHashtags) ? value!.recentHashtags!.filter(x => typeof x === 'string').slice(0, 40) : [],
    savedPrompts: enabled && Array.isArray(value?.savedPrompts)
      ? value!.savedPrompts!.filter(item => item && typeof item.id === 'string' && typeof item.name === 'string' && typeof item.content === 'string').slice(0, 30)
      : []
  };
}

export class MemoryEngine {
  static getActiveUserId(): string {
    return auth.currentUser?.uid || 'guest';
  }

  static getMemory(): UserMemoryProfile {
    const key = `${STORAGE_KEYS.MEMORY}_${this.getActiveUserId()}`;
    const data = localStorage.getItem(key);
    if (!data) {
      const initial = emptyMemory();
      localStorage.setItem(key, JSON.stringify(initial));
      return initial;
    }
    try {
      return normalizeMemory(JSON.parse(data) as Partial<UserMemoryProfile>);
    } catch {
      return emptyMemory();
    }
  }

  static saveMemory(memory: UserMemoryProfile): void {
    const key = `${STORAGE_KEYS.MEMORY}_${this.getActiveUserId()}`;
    localStorage.setItem(key, JSON.stringify(normalizeMemory(memory)));
  }

  static setConsent(enabled: boolean): UserMemoryProfile {
    const next = normalizeMemory({
      ...this.getMemory(),
      memoryEnabled: enabled,
      consentVersion: enabled ? CONSENT_VERSION : undefined
    });
    this.saveMemory(next);
    return next;
  }

  static clearMemory(): UserMemoryProfile {
    const key = `${STORAGE_KEYS.MEMORY}_${this.getActiveUserId()}`;
    localStorage.removeItem(key);
    return emptyMemory();
  }

  /**
   * Save a fact only when the user explicitly asks VOH to remember it.
   * Credentials and high-risk identifiers are deliberately rejected.
   */
  static async rememberFact(fact: string): Promise<UserMemoryProfile> {
    const cleanFact = fact.trim().replace(/\s+/g, ' ').slice(0, 500);
    if (!cleanFact) throw new Error('Tell VOH what you want remembered.');
    if (/\b(password|passcode|passphrase|secret key|one[- ]time code|otp|verification code|pin(?: number| code)?|account number|bank details|credit card|debit card|card number|cvv|cvc|bvn|nin|tin|tax identification number|tax id|private key|recovery phrase|seed phrase|api key|access token|bearer token)\b/i.test(cleanFact)) {
      throw new Error('For your safety, VOH will not store passwords, financial credentials, or sensitive identity numbers.');
    }
    const current = this.getMemory();
    if (!current.memoryEnabled) throw new Error('Enable VOH Memory in settings before asking me to remember something.');
    if (!auth.currentUser || auth.currentUser.isAnonymous) throw new Error('Sign in to save personal memories to your account.');
    const exists = current.personalFacts.some(item => item.toLocaleLowerCase() === cleanFact.toLocaleLowerCase());
    const next = exists ? current : {
      ...current,
      personalFacts: [...current.personalFacts, cleanFact].slice(-60),
    };
    await this.syncWithCloud(next);
    this.saveMemory(next);
    return next;
  }

  /** Load only the signed-in user's consented memory from the authenticated API. */
  static async loadFromCloud(): Promise<UserMemoryProfile | null> {
    if (!auth.currentUser || auth.currentUser.isAnonymous) return null;
    const response = await authenticatedVohFetch('/api/voh-ai/memory');
    if (!response.ok) throw new Error('VOH memory could not be loaded.');
    const payload = await response.json();
    if (!payload?.memory || payload.memory.memoryEnabled !== true) return null;
    const memory = normalizeMemory(payload.memory);
    this.saveMemory(memory);
    return memory;
  }

  /** Persist only after explicit opt-in. */
  static async syncWithCloud(memory: UserMemoryProfile = this.getMemory()): Promise<boolean> {
    if (!memory.memoryEnabled) return false;
    const response = await authenticatedVohFetch('/api/voh-ai/memory', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...normalizeMemory(memory), memoryEnabled: true, consentVersion: CONSENT_VERSION })
    });
    if (!response.ok) throw new Error('VOH memory could not be synchronized.');
    return true;
  }

  static async clearCloudMemory(): Promise<void> {
    if (!auth.currentUser || auth.currentUser.isAnonymous) return;
    const response = await authenticatedVohFetch('/api/voh-ai/memory', { method: 'DELETE' });
    if (!response.ok) throw new Error('VOH cloud memory could not be cleared.');
  }
}
