export interface DevicePerformanceSignals {
  saveData?: boolean;
  deviceMemory?: number;
  hardwareConcurrency?: number;
}

export interface DevicePerformanceProfile {
  constrained: boolean;
  saveData: boolean;
}

/**
 * Conservatively identifies devices that benefit from reduced visual effects.
 * Missing browser hints never classify a device as constrained.
 */
export function getDevicePerformanceProfile(
  signals: DevicePerformanceSignals,
): DevicePerformanceProfile {
  const saveData = signals.saveData === true;
  const lowMemory = typeof signals.deviceMemory === 'number'
    && Number.isFinite(signals.deviceMemory)
    && signals.deviceMemory > 0
    && signals.deviceMemory <= 2;
  const lowCoreCount = typeof signals.hardwareConcurrency === 'number'
    && Number.isFinite(signals.hardwareConcurrency)
    && signals.hardwareConcurrency > 0
    && signals.hardwareConcurrency <= 4;

  return {
    constrained: saveData || lowMemory || lowCoreCount,
    saveData,
  };
}
