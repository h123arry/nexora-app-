export interface SoundPreferences {
  notifications: boolean; interface: boolean; gifts: boolean; live: boolean;
}
export const DEFAULT_SOUND_PREFERENCES: SoundPreferences = { notifications: true, interface: true, gifts: true, live: true };
const STORAGE_KEY = 'nexora_sound_preferences_v1';
type SoundCategory = keyof SoundPreferences;
const SOUND_CATEGORY: Record<string, SoundCategory> = {
  'notification.spark': 'notifications', 'notification.comment': 'notifications', 'notification.follow': 'notifications', 'notification.default': 'notifications',
  'interface.confirmation': 'interface', 'interface.tap': 'interface', 'gift.arrival': 'gifts', 'gift.legendary': 'gifts', 'live.join': 'live', 'live.reaction': 'live',
};
export function normalizeSoundPreferences(value: unknown): SoundPreferences {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return { ...DEFAULT_SOUND_PREFERENCES };
  const c = value as Record<string, unknown>;
  return { notifications: typeof c.notifications === 'boolean' ? c.notifications : true, interface: typeof c.interface === 'boolean' ? c.interface : true, gifts: typeof c.gifts === 'boolean' ? c.gifts : true, live: typeof c.live === 'boolean' ? c.live : true };
}
export function readSoundPreferences(): SoundPreferences {
  try { if (typeof localStorage === 'undefined') return { ...DEFAULT_SOUND_PREFERENCES }; const raw = localStorage.getItem(STORAGE_KEY); return raw ? normalizeSoundPreferences(JSON.parse(raw)) : { ...DEFAULT_SOUND_PREFERENCES }; }
  catch { return { ...DEFAULT_SOUND_PREFERENCES }; }
}
export function saveSoundPreferences(preferences: SoundPreferences): void {
  try { if (typeof localStorage !== 'undefined') localStorage.setItem(STORAGE_KEY, JSON.stringify(normalizeSoundPreferences(preferences))); } catch { /* Storage denial must not interrupt the app. */ }
}
let context: AudioContext | null = null;
function getContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const Ctor = window.AudioContext || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  try { context ??= new Ctor(); return context; } catch { return null; }
}
const TONES: Record<string, number[]> = {
  'notification.spark': [587, 880, 1175], 'notification.comment': [659, 784], 'notification.follow': [523, 659, 784], 'notification.default': [600, 900],
  'interface.confirmation': [660, 880], 'interface.tap': [520], 'gift.arrival': [523, 659, 784, 1047], 'gift.legendary': [392, 523, 659, 784, 1047], 'live.join': [440, 660], 'live.reaction': [784, 988],
};
export function playNexoraSound(soundId: keyof typeof TONES): boolean {
  const category = SOUND_CATEGORY[soundId];
  if (!category || !readSoundPreferences()[category]) return false;
  const audio = getContext();
  if (!audio) return false;
  const play = () => {
    if (!context || context.state !== 'running') return;
    const now = context.currentTime; const master = context.createGain(); master.gain.setValueAtTime(0.075, now); master.connect(context.destination);
    TONES[soundId].forEach((frequency, index) => {
      const oscillator = context!.createOscillator(); const envelope = context!.createGain(); const start = now + index * 0.075;
      oscillator.type = 'sine'; oscillator.frequency.setValueAtTime(frequency, start); envelope.gain.setValueAtTime(0.0001, start); envelope.gain.linearRampToValueAtTime(0.8, start + 0.012); envelope.gain.exponentialRampToValueAtTime(0.0001, start + 0.22);
      oscillator.connect(envelope); envelope.connect(master); oscillator.start(start); oscillator.stop(start + 0.24);
    });
    window.setTimeout(() => { try { master.disconnect(); } catch {} }, 700);
  };
  if (audio.state === 'suspended') { void audio.resume().then(play).catch(() => {}); return false; }
  play(); return true;
}
export function dispatchNexoraSound(soundId: keyof typeof TONES): void {
  if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('nexora-sound', { detail: { soundId } }));
}
