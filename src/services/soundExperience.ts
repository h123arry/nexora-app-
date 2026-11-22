export interface SoundPreferences {
  notifications: boolean; interface: boolean; gifts: boolean; live: boolean;
}
export const DEFAULT_SOUND_PREFERENCES: SoundPreferences = { notifications: true, interface: true, gifts: true, live: true };
const STORAGE_KEY = 'nexora_sound_preferences_v1';
type SoundCategory = keyof SoundPreferences;
const SOUND_CATEGORY: Record<string, SoundCategory> = {
  'notification.spark': 'notifications', 'notification.comment': 'notifications', 'notification.follow': 'notifications', 'notification.profile': 'notifications', 'notification.default': 'notifications', 'social.spark': 'interface', 'social.comment': 'notifications', 'social.share': 'interface',
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
export function readGiftSoundVolume(): number { try { const raw = typeof localStorage === 'undefined' ? null : localStorage.getItem('nexora_gift_sound_volume_v1'); const value = raw === null ? 0.72 : Number(raw); return Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : 0.72; } catch { return 0.72; } }
export function saveGiftSoundVolume(value: number): void { try { if (typeof localStorage !== 'undefined' && Number.isFinite(value)) localStorage.setItem('nexora_gift_sound_volume_v1', String(Math.max(0, Math.min(1, value)))); } catch { /* Volume persistence is optional. */ } }
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
  'notification.spark': [587, 880, 1175], 'notification.comment': [659, 784], 'notification.follow': [523, 659, 784], 'notification.profile': [880, 1047], 'notification.default': [600, 900], 'social.spark': [784, 988, 1175], 'social.comment': [659, 784, 988], 'social.share': [523, 659],
  'interface.confirmation': [660, 880], 'interface.tap': [520], 'gift.arrival': [523, 659, 784, 1047], 'gift.legendary': [392, 523, 659, 784, 1047], 'live.join': [440, 660], 'live.reaction': [784, 988],
};
export function playNexoraSound(soundId: keyof typeof TONES): boolean {
  const category = SOUND_CATEGORY[soundId];
  if (!category || !readSoundPreferences()[category]) return false;
  if (category === 'notifications') {
    try { if (typeof localStorage !== 'undefined' && localStorage.getItem('nexora_notif_sound') === 'false') return false; } catch { /* Continue with the current device preference. */ }
  }
  const audio = suppliedContext || getContext();
  if (!audio) return false;
  const play = () => {
    if (audio.state !== 'running') return;
    const now = audio.currentTime; const master = audio.createGain(); master.gain.setValueAtTime(0.075, now); master.connect(audio.destination);
    TONES[soundId].forEach((frequency, index) => {
      const oscillator = audio.createOscillator(); const envelope = audio.createGain(); const start = now + index * 0.075;
      oscillator.type = 'sine'; oscillator.frequency.setValueAtTime(frequency, start); envelope.gain.setValueAtTime(0.0001, start); envelope.gain.linearRampToValueAtTime(0.8, start + 0.012); envelope.gain.exponentialRampToValueAtTime(0.0001, start + 0.22);
      oscillator.connect(envelope); envelope.connect(master); oscillator.start(start); oscillator.stop(start + 0.24);
    });
    window.setTimeout(() => { try { master.disconnect(); } catch {} }, 700);
  };
  if (audio.state === 'suspended') { void audio.resume().then(play).catch(() => {}); return false; }
  play(); return true;
}

type GiftSoundFamily = 'floral' | 'dragon' | 'wildlife' | 'royal' | 'gemstone' | 'celestial' | 'elemental' | 'music' | 'soft';
const GIFT_SOUND_FAMILY: Record<string, GiftSoundFamily> = {
  floral: 'floral', flower: 'floral', flowers: 'floral', rose: 'floral', seasonal: 'floral',
  dragon: 'dragon', dragons: 'dragon', wildlife: 'wildlife', lion: 'wildlife', animal: 'wildlife',
  royal: 'royal', crown: 'royal', emperor: 'royal', luxury: 'royal', couture: 'royal', arena: 'royal', architecture: 'royal',
  gemstone: 'gemstone', gem: 'gemstone', diamond: 'gemstone', tech: 'gemstone', artifacts: 'gemstone', timepiece: 'gemstone', celestial: 'celestial', space: 'celestial', spirit: 'celestial', dreamscape: 'celestial', world: 'celestial',
  elemental: 'elemental', fire: 'elemental', oceanic: 'elemental', music: 'music', african: 'music', culinary: 'soft', love: 'soft', fantasy: 'dragon', mythic: 'dragon', adventure: 'dragon',
};
const GIFT_SOUND_NOTES: Record<GiftSoundFamily, number[]> = {
  floral: [880, 1174.66, 1396.91, 1760],
  dragon: [110, 82.41, 73.42, 146.83],
  wildlife: [196, 146.83, 220],
  royal: [392, 523.25, 659.25, 783.99],
  gemstone: [1318.51, 1567.98, 2093],
  celestial: [659.25, 987.77, 1318.51, 1760],
  elemental: [164.81, 220, 329.63, 440],
  music: [523.25, 659.25, 783.99],
  soft: [659.25, 783.99, 987.77],
};
/** A distinct, original Web Audio signature for each live-gift family. Respects the user's Gifts sound preference. */
export function playGiftArrivalSound(giftId: string, rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary' = 'common', suppliedContext?: AudioContext | null): boolean {
  if (!readSoundPreferences().gifts) return false;
  const prefix = giftId.toLowerCase().split('-')[0];
  const family = GIFT_SOUND_FAMILY[prefix] || 'soft';
  const audio = getContext();
  if (!audio) return false;
  const play = () => {
    if (audio.state !== 'running') return;
    const start = audio.currentTime + 0.025;
    const master = audio.createGain();
    const peak = (rarity === 'legendary' ? 0.105 : rarity === 'epic' ? 0.082 : 0.062) * readGiftSoundVolume();
    if (peak <= 0) return;
    master.gain.setValueAtTime(0.0001, start);
    master.gain.linearRampToValueAtTime(peak, start + 0.045);
    master.gain.exponentialRampToValueAtTime(0.0001, start + (family === 'dragon' || family === 'elemental' ? 1.05 : 0.82));
    master.connect(audio.destination);
    const notes = GIFT_SOUND_NOTES[family];
    notes.forEach((frequency, index) => {
      const oscillator = audio.createOscillator();
      const envelope = audio.createGain();
      const at = start + index * (family === 'dragon' ? 0.105 : 0.085);
      const duration = family === 'dragon' ? 0.42 : family === 'floral' || family === 'gemstone' || family === 'celestial' ? 0.34 : 0.28;
      oscillator.type = family === 'dragon' ? 'sawtooth' : family === 'wildlife' || family === 'elemental' ? 'triangle' : 'sine';
      oscillator.frequency.setValueAtTime(frequency, at);
      if (family === 'dragon') oscillator.frequency.exponentialRampToValueAtTime(Math.max(38, frequency * 0.58), at + duration);
      if (family === 'floral' || family === 'gemstone' || family === 'celestial') oscillator.frequency.exponentialRampToValueAtTime(frequency * 1.012, at + duration);
      envelope.gain.setValueAtTime(0.0001, at);
      envelope.gain.linearRampToValueAtTime(family === 'dragon' ? 0.34 : 0.52, at + 0.018);
      envelope.gain.exponentialRampToValueAtTime(0.0001, at + duration);
      oscillator.connect(envelope); envelope.connect(master);
      oscillator.start(at); oscillator.stop(at + duration + 0.025);
    });
    if (family === 'dragon' || family === 'elemental' || family === 'wildlife') {
      const low = audio.createOscillator(); const lowGain = audio.createGain();
      low.type = family === 'dragon' ? 'sawtooth' : 'triangle';
      low.frequency.setValueAtTime(family === 'dragon' ? 58 : family === 'wildlife' ? 92 : 74, start);
      low.frequency.exponentialRampToValueAtTime(family === 'dragon' ? 34 : 48, start + 0.62);
      lowGain.gain.setValueAtTime(0.0001, start); lowGain.gain.linearRampToValueAtTime(0.24, start + 0.08); lowGain.gain.exponentialRampToValueAtTime(0.0001, start + 0.68);
      low.connect(lowGain); lowGain.connect(master); low.start(start); low.stop(start + 0.7);
    }
    window.setTimeout(() => { try { master.disconnect(); } catch { /* Audio node may already be released. */ } }, 1400);
  };
  if (audio.state === 'suspended') { void audio.resume().then(play).catch(() => {}); return false; }
  play(); return true;
}

export function dispatchNexoraSound(soundId: keyof typeof TONES): void {
  if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('nexora-sound', { detail: { soundId } }));
}
