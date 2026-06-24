export interface VoiceConfig {
  language: string;
  speed: number;
  pitch: number;
  autoRead: boolean;
}

const STORAGE_KEYS = {
  CONFIG: 'voh_voice_config',
};

export class VoiceEngine {
  static getConfig(): VoiceConfig {
    const data = localStorage.getItem(STORAGE_KEYS.CONFIG);
    if (!data) {
      const defaultConfig: VoiceConfig = {
        language: 'en-US',
        speed: 1.0,
        pitch: 1.0,
        autoRead: false
      };
      localStorage.setItem(STORAGE_KEYS.CONFIG, JSON.stringify(defaultConfig));
      return defaultConfig;
    }
    return JSON.parse(data);
  }

  static saveConfig(config: VoiceConfig): void {
    localStorage.setItem(STORAGE_KEYS.CONFIG, JSON.stringify(config));
  }

  static speak(text: string, config: VoiceConfig): SpeechSynthesisUtterance | null {
    if (typeof window === 'undefined' || !window.speechSynthesis) return null;
    
    // Stop ongoing speech
    window.speechSynthesis.cancel();
    
    // Strip markdown bold/italics markers for clean speech
    const cleanText = text.replace(/[*#`_\-]/g, '');
    
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = config.language;
    utterance.rate = config.speed;
    utterance.pitch = config.pitch;
    
    window.speechSynthesis.speak(utterance);
    return utterance;
  }

  static stopSpeaking(): void {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
  }

  static getSpeechRecognition(): any {
    if (typeof window === 'undefined') return null;
    const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRec) return null;
    
    const rec = new SpeechRec();
    rec.continuous = true;
    rec.interimResults = true;
    return rec;
  }

  static async uploadVoice(audioBase64: string): Promise<{ transcription: string; replyText: string; isDemo: boolean }> {
    const response = await fetch('/api/voh-ai/voice-transcribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ audioBase64 })
    });
    
    if (!response.ok) {
      throw new Error('Transcription failed');
    }
    
    return response.json();
  }
}
