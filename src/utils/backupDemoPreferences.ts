export interface BackupDemoPreferences {
  enabledItems: {
    messages: boolean;
    media: boolean;
    stories: boolean;
    groups: boolean;
    communities: boolean;
    broadcasts: boolean;
    settings: boolean;
    aiPreferences: boolean;
  };
  schedule: 'manual' | 'daily' | 'weekly' | 'monthly' | 'custom';
  destinations: {
    googleDrive: boolean;
    iCloud: boolean;
    localDevice: boolean;
    nas: boolean;
    privateServer: boolean;
  };
}

export const BACKUP_DEMO_PREFERENCES_KEY = 'nx_storage_backups';

const DEFAULT_PREFERENCES: BackupDemoPreferences = {
  enabledItems: {
    messages: true,
    media: true,
    stories: false,
    groups: true,
    communities: true,
    broadcasts: true,
    settings: true,
    aiPreferences: true,
  },
  schedule: 'weekly',
  destinations: {
    googleDrive: true,
    iCloud: false,
    localDevice: true,
    nas: false,
    privateServer: false,
  },
};

const ALLOWED_SCHEDULES: BackupDemoPreferences['schedule'][] = ['manual', 'daily', 'weekly', 'monthly', 'custom'];

function mergeBooleanSettings<T extends Record<string, boolean>>(defaults: T, saved: unknown): T {
  const source = saved && typeof saved === 'object' && !Array.isArray(saved)
    ? saved as Record<string, unknown>
    : {};
  return Object.fromEntries(Object.entries(defaults).map(([key, fallback]) => [
    key,
    typeof source[key] === 'boolean' ? source[key] : fallback,
  ])) as T;
}

function freshDefaults(): BackupDemoPreferences {
  return {
    enabledItems: { ...DEFAULT_PREFERENCES.enabledItems },
    schedule: DEFAULT_PREFERENCES.schedule,
    destinations: { ...DEFAULT_PREFERENCES.destinations },
  };
}

/** Load local-only UI preferences and scrub legacy plaintext credential-like fields. */
export function loadBackupDemoPreferences(storage: Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>): BackupDemoPreferences {
  const defaults = freshDefaults();
  try {
    const raw = storage.getItem(BACKUP_DEMO_PREFERENCES_KEY);
    if (!raw) return defaults;
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('Invalid demo preferences');

    const source = parsed as Record<string, unknown>;
    const preferences: BackupDemoPreferences = {
      enabledItems: mergeBooleanSettings(defaults.enabledItems, source.enabledItems),
      schedule: ALLOWED_SCHEDULES.includes(source.schedule as BackupDemoPreferences['schedule'])
        ? source.schedule as BackupDemoPreferences['schedule']
        : defaults.schedule,
      destinations: mergeBooleanSettings(defaults.destinations, source.destinations),
    };

    try {
      storage.setItem(BACKUP_DEMO_PREFERENCES_KEY, JSON.stringify(preferences));
    } catch {
      try { storage.removeItem(BACKUP_DEMO_PREFERENCES_KEY); } catch { /* storage may be unavailable */ }
    }
    return preferences;
  } catch {
    try { storage.removeItem(BACKUP_DEMO_PREFERENCES_KEY); } catch { /* storage may be unavailable */ }
    return defaults;
  }
}
