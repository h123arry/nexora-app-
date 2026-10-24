import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
  runTransaction,
} from 'firebase/firestore';
import { db, auth } from './config';
import type { FeedPreferences } from '../discovery/feedPreferences';

export interface NexoraSettings {
  privacy: {
    isPrivateAccount: boolean;
    allowDms: boolean;
    showActivityStatus: boolean;
    discoverableByEmail: boolean;
    discoverableByUsername: boolean;
    recommendationsPersonalization: boolean;
    searchIndexing: boolean;
    allowFollowRequests: boolean;
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
  feed: FeedPreferences;
  security: {
    twoFactorEnabled: boolean;
  };
  updatedAt?: unknown;
}

export const DEFAULT_SETTINGS: NexoraSettings = {
  privacy: {
    isPrivateAccount: false,
    allowDms: true,
    showActivityStatus: true,
    discoverableByEmail: true,
    discoverableByUsername: true,
    recommendationsPersonalization: true,
    searchIndexing: true,
    allowFollowRequests: true,
  },
  notifications: {
    pushEnabled: true,
    emailDigests: false,
    sparksAlerts: true,
    commentsAlerts: true,
    followsAlerts: true,
    securityAlerts: true,
  },
  appearance: {
    theme: 'neon-cyber',
    fontSize: 'md',
    reducedMotion: false,
  },
  content: {
    contentPreferences: ['Technology', 'AI', 'Architecture', 'Startups'],
    sensitiveContentFilter: true,
  },
  feed: {
    tab: 'posts',
    notInterestedTags: [],
    blockedCreatorIds: [],
    mutedCreatorIds: [],
    hiddenPostIds: [],
    seenPostIds: [],
  },
  security: {
    twoFactorEnabled: false,
  },
};

const MAX_FEED_ITEMS = 500;

function boundedStrings(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
    .map(item => item.trim().slice(0, 160)))].slice(0, MAX_FEED_ITEMS);
}

function mergeSettings(data: Partial<NexoraSettings>): NexoraSettings {
  const feed = (data.feed || {}) as Partial<FeedPreferences>;
  return {
    privacy: { ...DEFAULT_SETTINGS.privacy, ...(data.privacy || {}) },
    notifications: { ...DEFAULT_SETTINGS.notifications, ...(data.notifications || {}) },
    appearance: { ...DEFAULT_SETTINGS.appearance, ...(data.appearance || {}) },
    content: { ...DEFAULT_SETTINGS.content, ...(data.content || {}) },
    feed: {
      ...DEFAULT_SETTINGS.feed,
      ...feed,
      notInterestedTags: boundedStrings(feed.notInterestedTags),
      blockedCreatorIds: boundedStrings(feed.blockedCreatorIds),
      mutedCreatorIds: boundedStrings(feed.mutedCreatorIds),
      hiddenPostIds: boundedStrings(feed.hiddenPostIds),
      seenPostIds: boundedStrings(feed.seenPostIds),
    },
    security: { ...DEFAULT_SETTINGS.security, ...(data.security || {}) },
    updatedAt: data.updatedAt,
  };
}

export class SettingsService {
  static async getSettings(uid?: string): Promise<NexoraSettings> {
    const userId = uid || auth.currentUser?.uid;
    if (!userId) return DEFAULT_SETTINGS;

    try {
      const settingsRef = doc(db, 'users', userId, 'settings', 'preferences');
      const snap = await getDoc(settingsRef);
      if (!snap.exists()) {
        await setDoc(settingsRef, { ...DEFAULT_SETTINGS, updatedAt: serverTimestamp() });
        return DEFAULT_SETTINGS;
      }
      return mergeSettings(snap.data() as Partial<NexoraSettings>);
    } catch (error) {
      console.error('Error fetching settings from Firestore:', error);
      return DEFAULT_SETTINGS;
    }
  }

  static async updateSettings(uid: string, updates: Partial<NexoraSettings>): Promise<void> {
    if (!uid || auth.currentUser?.uid !== uid) throw new Error('Only the signed-in owner can update settings.');
    await setDoc(doc(db, 'users', uid, 'settings', 'preferences'), {
      ...updates,
      updatedAt: serverTimestamp(),
    }, { merge: true });
  }

  static async updatePrivacy(uid: string, privacyUpdates: Partial<NexoraSettings['privacy']>): Promise<void> {
    const current = await this.getSettings(uid);
    await this.updateSettings(uid, { privacy: { ...current.privacy, ...privacyUpdates } });
  }

  static async updateNotifications(uid: string, updates: Partial<NexoraSettings['notifications']>): Promise<void> {
    const current = await this.getSettings(uid);
    await this.updateSettings(uid, { notifications: { ...current.notifications, ...updates } });
  }

  static async updateAppearance(uid: string, updates: Partial<NexoraSettings['appearance']>): Promise<void> {
    const current = await this.getSettings(uid);
    await this.updateSettings(uid, { appearance: { ...current.appearance, ...updates } });
  }

  static async updateContent(uid: string, updates: Partial<NexoraSettings['content']>): Promise<void> {
    const current = await this.getSettings(uid);
    await this.updateSettings(uid, { content: { ...current.content, ...updates } });
  }

  static async updateFeed(uid: string, updates: Partial<FeedPreferences>): Promise<void> {
    if (!uid || auth.currentUser?.uid !== uid) throw new Error('Only the signed-in owner can update settings.');
    const settingsRef = doc(db, 'users', uid, 'settings', 'preferences');
    await runTransaction(db, async transaction => {
      const snapshot = await transaction.get(settingsRef);
      const current = snapshot.exists()
        ? mergeSettings(snapshot.data() as Partial<NexoraSettings>)
        : DEFAULT_SETTINGS;
      const next = {
        ...current.feed,
        ...updates,
        notInterestedTags: boundedStrings(updates.notInterestedTags ?? current.feed.notInterestedTags),
        blockedCreatorIds: boundedStrings(updates.blockedCreatorIds ?? current.feed.blockedCreatorIds),
        mutedCreatorIds: boundedStrings(updates.mutedCreatorIds ?? current.feed.mutedCreatorIds),
        hiddenPostIds: boundedStrings(updates.hiddenPostIds ?? current.feed.hiddenPostIds),
        seenPostIds: boundedStrings(updates.seenPostIds ?? current.feed.seenPostIds),
      };
      transaction.set(settingsRef, {
        ...DEFAULT_SETTINGS,
        ...(snapshot.exists() ? {} : current),
        feed: next,
        updatedAt: serverTimestamp(),
      }, { merge: true });
    });
  }

  static async updateSecurity(uid: string, updates: Partial<NexoraSettings['security']>): Promise<void> {
    const current = await this.getSettings(uid);
    await this.updateSettings(uid, { security: { ...current.security, ...updates } });
  }
}
