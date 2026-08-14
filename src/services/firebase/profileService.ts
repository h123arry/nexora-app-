import { doc, getDoc, setDoc, updateDoc, serverTimestamp, query, collection, where, getDocs } from 'firebase/firestore';
import { db } from './config';
import { User } from '../../types';
import { User as FirebaseUser } from 'firebase/auth';

export class ProfileService {
  /**
   * Retrieves user profile from Firestore by UID, preserving all rich fields
   */
  static async getProfile(uid: string): Promise<User | null> {
    if (!db) return null;
    try {
      const docRef = doc(db, 'users', uid);
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        return snap.data() as User;
      }
    } catch (e) {
      console.warn('Error fetching user profile:', e);
    }
    return null;
  }

  /**
   * Creates or initializes a Firestore user profile
   */
  static async createProfile(uid: string, data: Partial<User>, email: string): Promise<User> {
    const cleanEmail = email.toLowerCase().trim();
    const defaultUsername = (cleanEmail.split('@')[0] || `user_${uid.substring(0, 5)}`).toLowerCase().replace(/[^a-z0-9_]/g, '');

    const newUser: User = {
      id: uid,
      username: data.username || defaultUsername,
      name: data.name || 'Nexora User',
      avatar: data.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
      bio: data.bio || '',
      location: data.location || 'Global',
      website: data.website || '',
      followers: data.followers || 0,
      following: data.following || 0,
      sparks: data.sparks || 0,
      isVerified: data.isVerified ?? false,
      coverImage: data.coverImage || '',
      joinedDate: data.joinedDate || `Joined ${new Date().toLocaleString('default', { month: 'long' })} ${new Date().getFullYear()}`,
      reputationPoints: data.reputationPoints || 0,
      reputationBreakdown: data.reputationBreakdown || { contributions: 0, helpfulness: 0, missionsCompleted: 0, skillsVerified: 0 },
      interestDNA: data.interestDNA || {},
      skills: data.skills || [],
      ...data
    };

    if (db) {
      await setDoc(doc(db, 'users', uid), {
        ...newUser,
        email: cleanEmail,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      }, { merge: true });
    }

    return newUser;
  }

  /**
   * Updates an existing profile
   */
  static async updateProfile(uid: string, updates: Partial<User>): Promise<void> {
    if (!db) return;
    const docRef = doc(db, 'users', uid);
    await updateDoc(docRef, {
      ...updates,
      updatedAt: serverTimestamp()
    });
  }

  /**
   * Gets existing profile or creates a new one from Firebase User
   */
  static async getOrCreateProfile(firebaseUser: FirebaseUser, additionalData?: Partial<User>): Promise<User> {
    let profile = await this.getProfile(firebaseUser.uid);
    if (!profile) {
      profile = await this.createProfile(firebaseUser.uid, {
        name: firebaseUser.displayName || 'Nexora User',
        avatar: firebaseUser.photoURL || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
        isVerified: firebaseUser.emailVerified,
        ...additionalData
      }, firebaseUser.email || '');
    }
    return profile;
  }

  /**
   * Checks if username is taken in Firestore
   */
  static async checkUsernameExists(username: string): Promise<boolean> {
    if (!db) return false;
    const clean = username.toLowerCase().trim();
    const q = query(collection(db, 'users'), where('username', '==', clean));
    const snap = await getDocs(q);
    return !snap.empty;
  }
}
