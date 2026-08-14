import { 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  serverTimestamp 
} from 'firebase/firestore';
import { db, auth } from './config';

export interface NexoraSettings {
  privacy: {
    isPrivateAccount: boolean;
    allowDms: boolean;
    showActivityStatus: boolean;
    discoverableByEmail: boolean;
  };
  notifications: {
    pushEnabled: boolean;
    emailDigests: boolean;
    sparksAlerts: boolean;
    commentsAlerts: boolean;
    followsAlerts: boolean;
    securityAlerts: boolean;
  };
  appearance: {
    theme: string;
    fontSize: string;
    reducedMotion: boolean;
  };
  content: {
    contentPreferences: string[];
    sensitiveContentFilter: boolean;
  };
  security: {
    twoFactorEnabled: boolean;
  };
  updatedAt?: any;
}

export const DEFAULT_SETTINGS: NexoraSettings = {
  privacy: {
    isPrivateAccount: false,
    allowDms: true,
    showActivityStatus: true,
    discoverableByEmail: true
  },
  notifications: {
    pushEnabled: true,
    emailDigests: false,
    sparksAlerts: true,
    commentsAlerts: true,
    followsAlerts: true,
    securityAlerts: true
  },
  appearance: {
    theme: 'neon-cyber',
    fontSize: 'md',
    reducedMotion: false
  },
  content: {
    contentPreferences: ['Technology', 'AI', 'Architecture', 'Startups'],
    sensitiveContentFilter: true
  },
  security: {
    twoFactorEnabled: false
  }
};

export class SettingsService {
  /**
   * Get user settings from Firestore, or create defaults if none exist
   */
  static async getSettings(uid?: string): Promise<NexoraSettings> {
    const userId = uid || auth.currentUser?.uid;
    if (!userId) return DEFAULT_SETTINGS;

    try {
      const settingsRef = doc(db, 'users', userId, 'settings', 'preferences');
      const snap = await getDoc(settingsRef);

      if (!snap.exists()) {
        await setDoc(settingsRef, {
          ...DEFAULT_SETTINGS,
          updatedAt: serverTimestamp()
        });
        return DEFAULT_SETTINGS;
      }

      const data = snap.data() as NexoraSettings;
      // Merge with defaults to ensure all nested keys exist
      return {
        privacy: { ...DEFAULT_SETTINGS.privacy, ...(data.privacy || {}) },
        notifications: { ...DEFAULT_SETTINGS.notifications, ...(data.notifications || {}) },
        appearance: { ...DEFAULT_SETTINGS.appearance, ...(data.appearance || {}) },
        content: { ...DEFAULT_SETTINGS.content, ...(data.content || {}) },
        security: { ...DEFAULT_SETTINGS.security, ...(data.security || {}) },
        updatedAt: data.updatedAt
      };
    } catch (error) {
      console.error('Error fetching settings from Firestore:', error);
      return DEFAULT_SETTINGS;
    }
  }

  /**
   * Update specific settings section or keys
   */
  static async updateSettings(uid: string, updates: Partial<NexoraSettings>): Promise<void> {
    if (!uid) return;

    try {
      const settingsRef = doc(db, 'users', uid, 'settings', 'preferences');
      await setDoc(settingsRef, {
        ...updates,
        updatedAt: serverTimestamp()
      }, { merge: true });
    } catch (error) {
      console.error('Error updating settings in Firestore:', error);
      throw error;
    }
  }

  static async updatePrivacy(uid: string, privacyUpdates: Partial<NexoraSettings['privacy']>): Promise<void> {
    const current = await this.getSettings(uid);
    await this.updateSettings(uid, {
      privacy: { ...current.privacy, ...privacyUpdates }
    });
  }

  static async updateNotifications(uid: string, notifUpdates: Partial<NexoraSettings['notifications']>): Promise<void> {
    const current = await this.getSettings(uid);
    await this.updateSettings(uid, {
      notifications: { ...current.notifications, ...notifUpdates }
    });
  }

  static async updateAppearance(uid: string, appearUpdates: Partial<NexoraSettings['appearance']>): Promise<void> {
    const current = await this.getSettings(uid);
    await this.updateSettings(uid, {
      appearance: { ...current.appearance, ...appearUpdates }
    });
  }

  static async updateContent(uid: string, contentUpdates: Partial<NexoraSettings['content']>): Promise<void> {
    const current = await this.getSettings(uid);
    await this.updateSettings(uid, {
      content: { ...current.content, ...contentUpdates }
    });
  }

  static async updateSecurity(uid: string, secUpdates: Partial<NexoraSettings['security']>): Promise<void> {
    const current = await this.getSettings(uid);
    await this.updateSettings(uid, {
      security: { ...current.security, ...secUpdates }
    });
  }
}
