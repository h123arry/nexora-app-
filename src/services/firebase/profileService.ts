import { doc, deleteField, getDoc, setDoc, serverTimestamp, query, collection, where, getDocs, runTransaction, limit } from 'firebase/firestore';
import { auth, db } from './config';
import { User } from '../../types';
import { User as FirebaseUser } from 'firebase/auth';
import { checkUsernameStatus, normalizeUsername } from '../../utils/username';
import { createPublicProfileProjection } from './publicProfileProjection';
import { persistProfileWithBestEffortProjection, withProfileProvisioningRetry } from './profileProvisioningPolicy';
import { getAnonymousMemberUsername } from './anonymousOnboardingPolicy';
import { apiRequestUrl } from '../../lib/apiBaseUrl';

const PROFILE_IDENTITY_CHANGE_GRACE_END = Date.parse('2026-11-22T23:00:00.000Z');

export class ProfileService {
  static isIdentityChangeGraceActive(): boolean {
    return Date.now() < PROFILE_IDENTITY_CHANGE_GRACE_END;
  }

  static isIdentityChangeGraceAvailable(field: 'displayName' | 'username', user: User): boolean {
    if (!this.isIdentityChangeGraceActive()) return false;
    const graceStart = Date.parse('2026-11-21T23:00:00.000Z');
    const lastChange = Date.parse(field === 'displayName' ? user.lastDisplayNameChangeTime || '' : user.lastUsernameChangeTime || '');
    const changedDuringGraceWindow = Number.isFinite(lastChange) && lastChange >= graceStart;
    return field === 'displayName'
      ? !user.displayNameGraceUsedAt && !changedDuringGraceWindow
      : !user.usernameGraceUsedAt && !changedDuringGraceWindow;
  }

  private static profileLoads = new Map<string, Promise<User>>();
  /** Public projection deliberately excludes email, phone, role, moderation flags, balances and preferences. */
  private static toPublicProfile(user: User, includeLocation = false): Partial<User> {
    return createPublicProfileProjection(user, { includeLocation });
  }

  /** Retrieves the caller's private profile. Firestore rules restrict this to the owner. */
  static async getProfile(uid: string): Promise<User | null> {
    if (!db) return null;
    try {
      const snap = await getDoc(doc(db, 'users', uid));
      return snap.exists() ? (snap.data() as User) : null;
    } catch (error) {
      const code = (error as { code?: string } | null)?.code || 'unknown';
      console.error('[NEXORA] Private profile read failed', { code });
      throw error;
    }
  }

  /** Retrieves only the public projection, which contains no account credentials or private settings. */
  static async getPublicProfile(uid: string): Promise<User | null> {
    if (!db) return null;
    try {
      const snap = await getDoc(doc(db, 'publicProfiles', uid));
      return snap.exists() ? ({ ...snap.data(), id: uid } as User) : null;
    } catch {
      console.warn('Error fetching public user profile; details redacted.');
      return null;
    }
  }

  /** Resolve a public profile by its canonical username claim without exposing private user documents. */
  static async getPublicProfileByUsername(username: string): Promise<User | null> {
    if (!db) return null;
    const clean = normalizeUsername(username);
    if (!clean) return null;
    try {
      const claim = await getDoc(doc(db, 'usernames', clean));
      const uid = claim.exists() ? claim.data().userId : null;
      if (typeof uid !== 'string' || !uid) return null;
      return this.getPublicProfile(uid);
    } catch {
      return null;
    }
  }

  /** Public identity is exposed only after a server-authorized review approves the claim. */
  static async getPublicIdentityVerification(uid: string): Promise<{ identityType: 'individual' | 'creator' | 'public_figure' | 'organization'; displayName: string } | null> {
    if (!db || !uid) return null;
    try {
      const snap = await getDoc(doc(db, 'verifiedIdentities', uid));
      if (!snap.exists() || snap.data().status !== 'verified') return null;
      const data = snap.data();
      if (!['individual', 'creator', 'public_figure', 'organization'].includes(data.identityType) || typeof data.displayName !== 'string') return null;
      return { identityType: data.identityType, displayName: data.displayName };
    } catch {
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
      avatar: data.avatar || '',
      bio: data.bio || '', location: data.location || 'Global', website: data.website || '',
      followers: data.followers || 0, following: data.following || 0, sparks: data.sparks || 0,
      isVerified: false, coverImage: data.coverImage || '',
      joinedDate: data.joinedDate || `Joined ${new Date().toLocaleString('default', { month: 'long' })} ${new Date().getFullYear()}`,
      reputationPoints: data.reputationPoints || 0,
      reputationBreakdown: data.reputationBreakdown || { contributions: 0, helpfulness: 0, missionsCompleted: 0, skillsVerified: 0 },
      interestDNA: data.interestDNA || {}, skills: data.skills || [],
      ...(data.statusText ? { statusText: data.statusText } : {}),
      ...(data.statusEmoji ? { statusEmoji: data.statusEmoji } : {}),
      ...(data.pinnedMusicSong ? { pinnedMusicSong: data.pinnedMusicSong } : {}),
      ...(data.pinnedMusicArtist ? { pinnedMusicArtist: data.pinnedMusicArtist } : {}),
      ...(data.pinnedMusicUrl ? { pinnedMusicUrl: data.pinnedMusicUrl } : {}),
      ...(data.pinnedPosts ? { pinnedPosts: data.pinnedPosts } : {}),
    };

    if (db) {
      const { isVerified: _contactVerification, ...persistedUser } = newUser;
      await persistProfileWithBestEffortProjection(
        () => setDoc(doc(db, 'users', uid), {
          ...persistedUser,
          email: cleanEmail,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        }, { merge: true }),
        () => setDoc(doc(db, 'publicProfiles', uid), {
          ...this.toPublicProfile(newUser),
          location: deleteField(),
          interestDNA: deleteField(),
          dateOfBirth: deleteField(),
        }, { merge: true }),
        (error) => {
          const code = (error as { code?: string } | null)?.code || 'unknown';
          console.warn('[NEXORA] Public profile projection deferred after private profile creation', { code });
        },
      );
    }
    return newUser;
  }

  static async updateProfile(uid: string, updates: Partial<User>): Promise<Partial<User>> {
    if (!db) throw new Error('Profile storage is unavailable. Please try again.');
    if (!auth.currentUser || auth.currentUser.uid !== uid) throw new Error('Only the signed-in account owner can update this profile.');
    if (Object.prototype.hasOwnProperty.call(updates, 'isVerified')) {
      throw new Error('Contact verification status is managed by Firebase Authentication and cannot be changed from profile settings.');
    }
    updates = Object.fromEntries(Object.entries(updates).filter(([, value]) => value !== undefined)) as Partial<User>;
    const existingProfile = await getDoc(doc(db, 'users', uid));
    if (!existingProfile.exists()) throw new Error('Your profile could not be found. Please sign in again.');
    const existingUser = existingProfile.data() as User;
    const identityUpdates: { name?: string; username?: string } = {};
    if (updates.name !== undefined && updates.name !== existingUser.name) identityUpdates.name = updates.name;
    if (updates.username !== undefined && updates.username !== existingUser.username) identityUpdates.username = updates.username;
    let persistedIdentity: Partial<User> = {};
    if (Object.keys(identityUpdates).length) {
      const token = await auth.currentUser.getIdToken();
      const response = await fetch(apiRequestUrl('/api/profile/identity'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(identityUpdates),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(typeof result?.error === 'string' ? result.error : 'NEXORA could not update your name or username. Please try again.');
      persistedIdentity = (result?.identity && typeof result.identity === 'object' ? result.identity : {}) as Partial<User>;
    }

    // Identity fields and cooldown timestamps are server-owned. Never send them
    // through client Firestore writes, which are denied by the security rules.
    const remainingUpdates = { ...updates };
    delete remainingUpdates.name;
    delete remainingUpdates.username;
    delete remainingUpdates.lastDisplayNameChangeTime;
    delete remainingUpdates.lastUsernameChangeTime;
    delete remainingUpdates.displayNameGraceUsedAt;
    delete remainingUpdates.usernameGraceUsedAt;
    if (!Object.keys(remainingUpdates).length) return persistedIdentity;

    const privateProfileRef = doc(db, 'users', uid);
    const publicProfileRef = doc(db, 'publicProfiles', uid);
    const settingsRef = doc(db, 'users', uid, 'settings', 'preferences');
    await runTransaction(db, async transaction => {
      const [privateSnapshot, settingsSnapshot] = await Promise.all([
        transaction.get(privateProfileRef),
        transaction.get(settingsRef),
      ]);
      if (!privateSnapshot.exists()) throw new Error('Your profile could not be found. Please sign in again.');
      const current = privateSnapshot.data() as User;
      const updatedProfile = { ...current, ...remainingUpdates, id: uid };
      const locationAudience = settingsSnapshot.get('privacy.profileVisibility.location');
      const publicProjection = this.toPublicProfile(updatedProfile);
      transaction.update(privateProfileRef, { ...remainingUpdates, updatedAt: serverTimestamp() });
      transaction.set(publicProfileRef, {
        ...publicProjection,
        location: locationAudience === 'everyone' && typeof updatedProfile.location === 'string' && updatedProfile.location.trim()
          ? updatedProfile.location.trim()
          : deleteField(),
        interestDNA: deleteField(),
        dateOfBirth: deleteField(),
      }, { merge: true });
    });
    return persistedIdentity;
  }

  static async getOrCreateProfile(firebaseUser: FirebaseUser, additionalData?: Partial<User>): Promise<User> {
    const existingLoad = this.profileLoads.get(firebaseUser.uid);
    if (existingLoad) return existingLoad;

    const load = withProfileProvisioningRetry(() => this.loadOrCreateProfile(firebaseUser, additionalData));
    this.profileLoads.set(firebaseUser.uid, load);
    try {
      return await load;
    } finally {
      if (this.profileLoads.get(firebaseUser.uid) === load) {
        this.profileLoads.delete(firebaseUser.uid);
      }
    }
  }

  private static async loadOrCreateProfile(firebaseUser: FirebaseUser, additionalData?: Partial<User>): Promise<User> {
    let profile = await this.getProfile(firebaseUser.uid);
    if (profile) {
      // Firebase Auth is authoritative for email and verification state; do not
      // write these protected fields from the client into the private profile.
      profile = {
        ...profile,
        ...(firebaseUser.email ? { email: firebaseUser.email } : {}),
        isVerified: firebaseUser.emailVerified,
      };
    }
    if (!profile) {
      // Approved anonymous beta members receive a complete, durable profile
      // immediately. Reserve the deterministic handle first so overlapping
      // auth-state hydration and invite-claim flows converge on the same UID.
      const anonymousUsername = getAnonymousMemberUsername(firebaseUser.uid);
      if (firebaseUser.isAnonymous) {
        await this.reserveUsername(firebaseUser.uid, anonymousUsername);
      }
      profile = await this.createProfile(firebaseUser.uid, {
        name: firebaseUser.isAnonymous ? 'NEXORA Member' : (firebaseUser.displayName || 'Nexora User'),
        username: firebaseUser.isAnonymous ? anonymousUsername : undefined,
        avatar: firebaseUser.photoURL || '',
        isVerified: firebaseUser.emailVerified,
        ...additionalData
      }, firebaseUser.email || '');
    }
    // Do not refresh the public projection during every authentication hydration.
    // Doing so adds a preferences read and a public-profile write to every sign-in,
    // even when nothing changed. Projection writes belong to profile creation and
    // explicit profile mutations; hydration must remain a single private-profile read.
    return profile;
  }

  static async checkUsernameExists(username: string): Promise<boolean> {
    if (!db) return false;
    const clean = normalizeUsername(username);
    const claim = await getDoc(doc(db, 'usernames', clean));
    if (claim.exists()) return true;
    const q = query(collection(db, 'publicProfiles'), where('username', '==', clean), limit(1));
    const snap = await getDocs(q);
    return !snap.empty;
  }

  /** Atomically reserves a canonical username for the authenticated owner. */
  static async reserveUsername(uid: string, username: string): Promise<string> {
    const clean = normalizeUsername(username);
    const status = checkUsernameStatus(clean, uid);
    if (status.status !== 'available') {
      throw new Error(status.message);
    }
    if (!db) return clean;

    const claimRef = doc(db, 'usernames', clean);
    await runTransaction(db, async (transaction) => {
      const existing = await transaction.get(claimRef);
      if (existing.exists() && existing.data().userId !== uid) {
        throw new Error('This username is already taken. Please choose another handle.');
      }
      if (existing.exists()) {
        transaction.update(claimRef, { updatedAt: serverTimestamp() });
      } else {
        transaction.set(claimRef, {
          userId: uid,
          username: clean,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
      }
    });
    return clean;
  }
}
