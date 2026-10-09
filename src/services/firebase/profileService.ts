import { doc, getDoc, setDoc, updateDoc, serverTimestamp, query, collection, where, getDocs, writeBatch } from 'firebase/firestore';
import { db } from './config';
import { User } from '../../types';
import { User as FirebaseUser } from 'firebase/auth';

export class ProfileService {
  /** Public projection deliberately excludes email, phone, role, moderation flags, balances and preferences. */
  private static toPublicProfile(user: User): Partial<User> {
    const {
      id, username, name, avatar, bio, location, website, followers, following,
      sparks, isVerified, hasStory, coverImage, joinedDate, reputationPoints,
      reputationBreakdown, interestDNA, skills, statusText, statusEmoji,
      pinnedMusicSong, pinnedMusicArtist, pinnedMusicUrl, pinnedPosts
    } = user;
    return Object.fromEntries(Object.entries({
      id, username, name, avatar, bio, location, website, followers, following,
      sparks, isVerified, hasStory, coverImage, joinedDate, reputationPoints,
      reputationBreakdown, interestDNA, skills, statusText, statusEmoji,
      pinnedMusicSong, pinnedMusicArtist, pinnedMusicUrl, pinnedPosts
    }).filter(([, value]) => value !== undefined));
  }

  /** Retrieves the caller's private profile. Firestore rules restrict this to the owner. */
  static async getProfile(uid: string): Promise<User | null> {
    if (!db) return null;
    try {
      const snap = await getDoc(doc(db, 'users', uid));
      return snap.exists() ? (snap.data() as User) : null;
    } catch (e) {
      console.warn('Error fetching private user profile:', e);
      return null;
    }
  }

  /** Retrieves only the public projection, which contains no account credentials or private settings. */
  static async getPublicProfile(uid: string): Promise<User | null> {
    if (!db) return null;
    try {
      const snap = await getDoc(doc(db, 'publicProfiles', uid));
      return snap.exists() ? ({ ...snap.data(), id: uid } as User) : null;
    } catch (e) {
      console.warn('Error fetching public user profile:', e);
      return null;
    }
  }

  static async createProfile(uid: string, data: Partial<User>, email: string): Promise<User> {
    const cleanEmail = email.toLowerCase().trim();
    const defaultUsername = (cleanEmail.split('@')[0] || `user_${uid.substring(0, 5)}`).toLowerCase().replace(/[^a-z0-9_]/g, '');
    const newUser: User = {
      id: uid,
      username: data.username || defaultUsername,
      name: data.name || 'Nexora User',
      avatar: data.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
      bio: data.bio || '', location: data.location || 'Global', website: data.website || '',
      followers: data.followers || 0, following: data.following || 0, sparks: data.sparks || 0,
      isVerified: data.isVerified ?? false, coverImage: data.coverImage || '',
      joinedDate: data.joinedDate || `Joined ${new Date().toLocaleString('default', { month: 'long' })} ${new Date().getFullYear()}`,
      reputationPoints: data.reputationPoints || 0,
      reputationBreakdown: data.reputationBreakdown || { contributions: 0, helpfulness: 0, missionsCompleted: 0, skillsVerified: 0 },
      interestDNA: data.interestDNA || {}, skills: data.skills || [], ...data
    };

    if (db) {
      const batch = writeBatch(db);
      batch.set(doc(db, 'users', uid), {
        ...newUser, email: cleanEmail, createdAt: serverTimestamp(), updatedAt: serverTimestamp()
      }, { merge: true });
      batch.set(doc(db, 'publicProfiles', uid), this.toPublicProfile(newUser), { merge: true });
      await batch.commit();
    }
    return newUser;
  }

  static async updateProfile(uid: string, updates: Partial<User>): Promise<void> {
    if (!db) return;
    const docRef = doc(db, 'users', uid);
    await updateDoc(docRef, { ...updates, updatedAt: serverTimestamp() });
    const existing = await this.getProfile(uid);
    if (existing) {
      await setDoc(doc(db, 'publicProfiles', uid), this.toPublicProfile({ ...existing, ...updates }), { merge: true });
    }
  }

  static async getOrCreateProfile(firebaseUser: FirebaseUser, additionalData?: Partial<User>): Promise<User> {
    let profile = await this.getProfile(firebaseUser.uid);
    if (!profile) {
      profile = await this.createProfile(firebaseUser.uid, {
        name: firebaseUser.displayName || 'Nexora User',
        avatar: firebaseUser.photoURL || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
        isVerified: firebaseUser.emailVerified,
        ...additionalData
      }, firebaseUser.email || '');
    } else if (db) {
      // Existing users migrate only their own sanitized public projection at next authenticated session.
      await setDoc(doc(db, 'publicProfiles', firebaseUser.uid), this.toPublicProfile(profile), { merge: true });
    }
    return profile;
  }

  static async checkUsernameExists(username: string): Promise<boolean> {
    if (!db) return false;
    const clean = username.toLowerCase().trim();
    const q = query(collection(db, 'publicProfiles'), where('username', '==', clean));
    const snap = await getDocs(q);
    return !snap.empty;
  }
}
