export interface AISettings {
  temperature: number;
  maxTokens: number;
  systemInstructionOverride: string;
  rateLimitLimit: number;
  rateLimitWindowMs: number;
}

const STORAGE_KEYS = {
  SETTINGS: 'voh_ai_settings',
};

export class SettingsEngine {
  static getSettings(): AISettings {
    const data = localStorage.getItem(STORAGE_KEYS.SETTINGS);
    if (!data) {
      const defaultSettings: AISettings = {
        temperature: 0.7,
        maxTokens: 1024,
        systemInstructionOverride: '',
        rateLimitLimit: 60, // 60 requests
        rateLimitWindowMs: 60000 // per 1 minute
      };
      localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(defaultSettings));
      return defaultSettings;
    }
    return JSON.parse(data);
  }

  static saveSettings(settings: AISettings): void {
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
  }
}
