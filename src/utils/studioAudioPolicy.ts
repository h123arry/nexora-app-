export type AudioEnvelope = {
  volume: number;
  elapsed: number;
  totalDuration: number;
  fadeIn: number;
  fadeOut: number;
};

const clamp01 = (value: number): number => Math.min(1, Math.max(0, Number.isFinite(value) ? value : 0));

export function getAudioEnvelopeGain({ volume, elapsed, totalDuration, fadeIn, fadeOut }: AudioEnvelope): number {
  const safeElapsed = Math.max(0, Number.isFinite(elapsed) ? elapsed : 0);
  const safeTotal = Math.max(0, Number.isFinite(totalDuration) ? totalDuration : 0);
  const fadeInGain = fadeIn > 0 ? clamp01(safeElapsed / fadeIn) : 1;
  const remaining = Math.max(0, safeTotal - safeElapsed);
  const fadeOutGain = fadeOut > 0 ? clamp01(remaining / fadeOut) : 1;
  return clamp01(volume) * Math.min(fadeInGain, fadeOutGain);
}

export function getDuckedMusicGain(input: AudioEnvelope & {
  duckingEnabled: boolean;
  voiceoverStart: number;
  voiceoverDuration: number;
  duckingLevel: number;
}): number {
  const baseGain = getAudioEnvelopeGain(input);
  const voiceoverStart = Math.max(0, Number.isFinite(input.voiceoverStart) ? input.voiceoverStart : 0);
  const voiceoverDuration = Math.max(0, Number.isFinite(input.voiceoverDuration) ? input.voiceoverDuration : 0);
  const voiceoverActive = input.elapsed >= voiceoverStart && input.elapsed < voiceoverStart + voiceoverDuration;
  return baseGain * (input.duckingEnabled && voiceoverActive ? clamp01(input.duckingLevel) : 1);
}

export function buildWaveformPeaks(samples: ArrayLike<number>, barCount = 96): number[] {
  const safeBarCount = Math.max(1, Math.min(512, Math.floor(barCount) || 96));
  if (!samples.length) return [];
  let maximum = 0;
  for (let index = 0; index < samples.length; index += 1) {
    const value = Number(samples[index]);
    if (Number.isFinite(value)) maximum = Math.max(maximum, Math.abs(value));
  }
  if (maximum === 0) return Array.from({ length: safeBarCount }, () => 0);
  return Array.from({ length: safeBarCount }, (_, index) => {
    const start = Math.floor(index * samples.length / safeBarCount);
    const end = Math.max(start + 1, Math.floor((index + 1) * samples.length / safeBarCount));
    let peak = 0;
    for (let sample = start; sample < Math.min(samples.length, end); sample += 1) {
      const value = Number(samples[sample]);
      if (Number.isFinite(value)) peak = Math.max(peak, Math.abs(value));
    }
    return Math.min(1, peak / maximum);
  });
}
