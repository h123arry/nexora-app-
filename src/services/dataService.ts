import { db, auth } from './firebase/config';
import { handleFirestoreError, OperationType } from './firebase/errors';
import { 
  doc, 
  addDoc, 
  setDoc,
  updateDoc,
  deleteDoc,
  collection, orderBy, limit, 
  getDocs, 
  getDoc,
  query, 
  where, 
  serverTimestamp,
  FirestoreError,
  onSnapshot
} from 'firebase/firestore';
import { PrivacySettings, User, Post, Circle as Community, Page, Notification, Message, Chat } from '../types';

// ... (rest of the file content)

// ==========================================
// 2. MULTI-LEVEL CACHE ENGINE
// ==========================================
class MemoryCacheManager {
  private userCache = new Map<string, User>();
  private postCache = new Map<string, Post>();
  private communityCache = new Map<string, Community>();
  private pageCache = new Map<string, Page>();

  public setUser(id: string, user: User) {
    this.userCache.set(id, user);
  }
  public getUser(id: string): User | null {
    return this.userCache.get(id) || null;
  }
  public setPost(id: string, post: Post) {
    this.postCache.set(id, post);
  }
  public getPost(id: string): Post | null {
    return this.postCache.get(id) || null;
  }
  public setCommunity(id: string, community: Community) {
    this.communityCache.set(id, community);
  }
  public getCommunity(id: string): Community | null {
    return this.communityCache.get(id) || null;
  }
  public setPage(id: string, page: Page) {
    this.pageCache.set(id, page);
  }
  public getPage(id: string): Page | null {
    return this.pageCache.get(id) || null;
  }
  public clearAll() {
    this.userCache.clear();
    this.postCache.clear();
    this.communityCache.clear();
    this.pageCache.clear();
  }
}

export const cacheManager = new MemoryCacheManager();

// ==========================================
// 3. OFFLINE QUEUE & SYNC ENGINE
// ==========================================
interface PendingAction {
  id: string; // Unique transaction UUID
  action: 'saveUser' | 'savePost' | 'addComment' | 'addFollow' | 'removeFollow' | 'addNotification' | 'createPage' | 'createCommunity' | 'report' | 'saveDraft' | 'logActivity' | 'sendMessage' | 'updatePrivacy';
  payload: any;
  timestamp: number;
  retryCount: number;
}

class BackgroundSyncEngine {
  private queueKey = 'nexora_offline_sync_queue';
  private processing = false;

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        console.log('[Sync Engine] Client back online, flushing queue...');
        this.processQueue();
      });
    }
  }

  public getQueue(): PendingAction[] {
    try {
      const saved = localStorage.getItem(this.queueKey);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  }

  private saveQueue(queue: PendingAction[]) {
    try {
      localStorage.setItem(this.queueKey, JSON.stringify(queue));
    } catch (e) {
      console.error('[Sync Engine] Failed to persist sync queue:', e);
    }
  }

  public async enqueue(action: PendingAction['action'], payload: any) {
    const newAction: PendingAction = {
      id: `act-${Date.now()}-${Math.floor(Math.random() * 1000000)}`,
      action,
      payload,
      timestamp: Date.now(),
      retryCount: 0
    };

    const currentQueue = this.getQueue();
    
    // De-duplicate: If exactly same user/post write is pending, merge or overwrite with latest payload
    const isDuplicate = currentQueue.findIndex(item => 
      item.action === action && 
      ((payload.id && item.payload.id === payload.id) || 
       (payload.userId && item.payload.userId === payload.userId && payload.chatId === item.payload.chatId))
    );

    if (isDuplicate > -1) {
      currentQueue[isDuplicate].payload = { ...currentQueue[isDuplicate].payload, ...payload };
      currentQueue[isDuplicate].timestamp = Date.now();
    } else {
      currentQueue.push(newAction);
    }

    this.saveQueue(currentQueue);
    console.log(`[Sync Engine] Enqueued background event: ${action}`, payload);

    if (navigator.onLine) {
      this.processQueue();
    }
  }

  public async processQueue() {
    if (this.processing) return;
    const queue = this.getQueue();
    if (queue.length === 0) return;

    this.processing = true;
    const initialCount = queue.length;
    console.log(`[Sync Engine] Processing ${initialCount} background operations...`);

    const failedActions: PendingAction[] = [];

    for (const item of queue) {
      try {
        await this.executeAction(item);
        console.log(`[Sync Engine] Successfully executed pending action: ${item.action}`);
      } catch (error) {
        console.error(`[Sync Engine] Error executing pending action: ${item.action}`, error);
        item.retryCount += 1;
        if (item.retryCount < 5) {
          failedActions.push(item); // Keep in queue for next retry
        } else {
          console.error(`[Sync Engine] Discarding action ${item.action} after 5 failed retries.`);
        }
      }
    }

    this.saveQueue(failedActions);
    this.processing = false;

    // Dispatch dedicated sync complete event for the UI and toast notifications
    const syncedCount = initialCount - failedActions.length;
    if (typeof window !== 'undefined' && syncedCount > 0) {
      window.dispatchEvent(new CustomEvent('nexora-sync-complete', {
        detail: {
          syncedCount,
          failedCount: failedActions.length,
          message: `🔄 Background synchronization complete: ${syncedCount} queued ${syncedCount === 1 ? 'post/action has' : 'posts/actions have'} been successfully published and synced live to NEXORA.`
        }
      }));
    }
  }

  private async executeAction(item: PendingAction) {
    const { action, payload } = item;

    switch (action) {
      case 'saveUser':
        await saveUserToDbDirect(payload);
        break;
      case 'savePost':
        await savePostToDbDirect(payload);
        break;
      case 'addFollow':
        await addFollowDirect(payload.followerId, payload.followingId);
        break;
      case 'removeFollow':
        await removeFollowDirect(payload.followerId, payload.followingId);
        break;
      case 'addNotification':
        await addNotificationDirect(payload.userId, payload.type, payload.content);
        break;
      case 'createPage':
        await createPageDirect(payload.ownerId, payload.name, payload.username, payload.category);
        break;
      case 'createCommunity':
        await createCommunityDirect(payload.name, payload.description, payload.ownerId);
        break;
      case 'report':
        await reportContentDirect(payload.reporterId, payload.targetType, payload.targetId, payload.reason);
        break;
      case 'saveDraft':
        await saveDraftDirect(payload.userId, payload.caption, payload.videoUrl);
        break;
      case 'logActivity':
        await logActivityDirect(payload.userId, payload.type, payload.targetId);
        break;
      case 'updatePrivacy':
        await updatePrivacySettingsDirect(payload.userId, payload.settings);
        break;
      case 'sendMessage':
        const { setDoc } = await import('firebase/firestore');
        const path = `chats/${payload.chatId}/messages`;
        await setDoc(doc(db, path, payload.id), payload);
        break;
      default:
        console.warn(`[Sync Engine] Unknown background sync action: ${action}`);
    }
  }
}

export const syncEngine = new BackgroundSyncEngine();

// ==========================================
// 4. DIRECT FIRESTORE CRUD WRAPPERS
// ==========================================

async function saveUserToDbDirect(user: any) {
  const path = 'users';
  const cleanUser = JSON.parse(JSON.stringify(user));
  cacheManager.setUser(user.id, cleanUser);
  try {
    return await updateDoc(doc(db, path, user.id), cleanUser).catch(async () => {
       const { setDoc } = await import('firebase/firestore');
       return await setDoc(doc(db, path, user.id), cleanUser);
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path, auth);
  }
}

async function savePostToDbDirect(post: any) {
  const path = 'posts';
  const sanitizedPost = JSON.parse(JSON.stringify(post));
  cacheManager.setPost(post.id, sanitizedPost);
  try {
    const { setDoc } = await import('firebase/firestore');
    return await setDoc(doc(db, path, post.id), sanitizedPost);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path, auth);
  }
}

async function addFollowDirect(followerId: string, followingId: string) {
  const path = 'follows';
  try {
    return await addDoc(collection(db, path), {
      followerId,
      followingId,
      createdAt: serverTimestamp()
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path, auth);
  }
}

async function removeFollowDirect(followerId: string, followingId: string) {
  const path = 'follows';
  try {
    const q = query(collection(db, path), where('followerId', '==', followerId), where('followingId', '==', followingId));
    const snapshot = await getDocs(q);
    const deletePromises = snapshot.docs.map(d => deleteDoc(doc(db, path, d.id)));
    await Promise.all(deletePromises);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path, auth);
  }
}

async function addNotificationDirect(userId: string, type: string, content: string) {
  const path = 'notifications';
  try {
    return await addDoc(collection(db, path), {
      userId,
      type,
      content,
      read: false,
      createdAt: serverTimestamp()
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path, auth);
  }
}

async function createPageDirect(ownerId: string, name: string, username: string, category: string) {
  const path = 'pages';
  try {
    return await addDoc(collection(db, path), {
      ownerId,
      name,
      username,
      category,
      createdAt: serverTimestamp()
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path, auth);
  }
}

async function createCommunityDirect(name: string, description: string, ownerId: string) {
  const path = 'communities';
  try {
    return await addDoc(collection(db, path), {
      name,
      description,
      ownerId,
      createdAt: serverTimestamp()
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path, auth);
  }
}

async function reportContentDirect(reporterId: string, targetType: string, targetId: string, reason: string) {
  const path = 'moderationReports';
  try {
    return await addDoc(collection(db, path), {
      reporterId,
      targetType,
      targetId,
      reason,
      status: 'pending',
      createdAt: serverTimestamp()
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path, auth);
  }
}

async function saveDraftDirect(userId: string, caption: string, videoUrl: string) {
  const path = 'drafts';
  try {
    return await addDoc(collection(db, path), {
      userId,
      caption,
      videoUrl,
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path, auth);
  }
}

async function logActivityDirect(userId: string, type: string, targetId: string) {
  const path = 'activities';
  try {
    return await addDoc(collection(db, path), {
      userId,
      type,
      targetId,
      createdAt: serverTimestamp()
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path, auth);
  }
}

async function updatePrivacySettingsDirect(userId: string, settings: Partial<PrivacySettings>) {
  const path = 'privacySettings';
  try {
    const docRef = doc(db, path, userId);
    return await updateDoc(docRef, { ...settings });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path, auth);
  }
}

// ==========================================
// 5. PUBLIC API MAPPED TO BACKGROUND ENGINE
// ==========================================

export async function saveUserToDb(user: any) {
  // Save in memory cache immediately for zero latency
  cacheManager.setUser(user.id, user);
  await syncEngine.enqueue('saveUser', user);
}

export async function savePostToDb(post: any) {
  // Save in memory cache immediately for zero latency
  cacheManager.setPost(post.id, post);
  await syncEngine.enqueue('savePost', post);
}

export async function addFollow(followerId: string, followingId: string) {
  await syncEngine.enqueue('addFollow', { followerId, followingId });
}

export async function removeFollow(followerId: string, followingId: string) {
  await syncEngine.enqueue('removeFollow', { followerId, followingId });
}

export async function addNotification(userId: string, type: string, content: string) {
  await syncEngine.enqueue('addNotification', { userId, type, content });
}

export async function createPage(ownerId: string, name: string, username: string, category: string) {
  await syncEngine.enqueue('createPage', { ownerId, name, username, category });
}

export async function createCommunity(name: string, description: string, ownerId: string) {
  await syncEngine.enqueue('createCommunity', { name, description, ownerId });
}

export async function reportContent(reporterId: string, targetType: string, targetId: string, reason: string) {
  await syncEngine.enqueue('report', { reporterId, targetType, targetId, reason });
}

export async function saveDraft(userId: string, caption: string, videoUrl: string) {
  await syncEngine.enqueue('saveDraft', { userId, caption, videoUrl });
}

export async function logActivity(userId: string, type: string, targetId: string) {
  await syncEngine.enqueue('logActivity', { userId, type, targetId });
}

export async function updatePrivacySettings(userId: string, settings: Partial<PrivacySettings>) {
  await syncEngine.enqueue('updatePrivacy', { userId, settings });
}

export async function updateContent(contentId: string, updates: Partial<any>) {
  const path = 'content';
  try {
    return await updateDoc(doc(db, path, contentId), {
      ...updates,
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path, auth);
  }
}

export async function logAutomationTask(taskName: string, status: string) {
  const path = 'automationLogs';
  try {
    return await addDoc(collection(db, path), {
      taskName,
      status,
      createdAt: serverTimestamp()
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path, auth);
  }
}

// ==========================================
// 6. READS & FETCHERS (WITH MEMORY CACHING)
// ==========================================

export async function getFollowers(userId: string) {
  const path = 'follows';
  try {
    const q = query(collection(db, path), where('followingId', '==', userId));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path, auth);
  }
}

export async function getFollowing(userId: string) {
  const path = 'follows';
  try {
    const q = query(collection(db, path), where('followerId', '==', userId));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path, auth);
  }
}

export async function getActivities(userId: string) {
  const path = 'activities';
  try {
    const q = query(collection(db, path), where('userId', '==', userId));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path, auth);
  }
}

export async function getGlobalPosts() {
  const path = 'posts';
  try {
    const q = query(collection(db, path), orderBy('timestamp', 'desc'), limit(150));
    const snapshot = await getDocs(q);
    const posts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Post[];
    posts.forEach(p => cacheManager.setPost(p.id, p));
    return posts;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path, auth);
  }
}

export async function getDrafts(userId: string) {
  const path = 'drafts';
  try {
    const q = query(collection(db, path), where('userId', '==', userId));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path, auth);
  }
}

export async function getCreatorAnalyticsDetailed(userId: string) {
  const path = 'creatorAnalytics';
  try {
    const q = query(collection(db, path), where('userId', '==', userId));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path, auth);
  }
}

export async function getUserContent(userId: string) {
  const path = 'content';
  try {
    const q = query(collection(db, path), where('userId', '==', userId));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path, auth);
  }
}

export async function getNotifications(userId: string) {
  const path = 'notifications';
  try {
    const q = query(collection(db, path), where('userId', '==', userId));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path, auth);
  }
}

export async function getPages() {
  const path = 'pages';
  try {
    const q = query(collection(db, path), orderBy('timestamp', 'desc'), limit(150));
    const snapshot = await getDocs(q);
    const pages = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Page[];
    pages.forEach(p => cacheManager.setPage(p.id, p));
    return pages;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path, auth);
  }
}

// ==========================================
// 7. REAL-TIME SUBSCRIPTION ENGINE (GLOBAL SYNC)
// ==========================================

import { subscribeToPosts as subscribeToPostsOriginal } from './posts/postService';

export function subscribeToPosts(callback: (posts: Post[]) => void) {
  return subscribeToPostsOriginal(callback);
}

export function subscribeToNotifications(userId: string, callback: (notifications: Notification[]) => void) {
  const q = query(collection(db, 'notifications'), where('userId', '==', userId));
  return onSnapshot(q, (snapshot) => {
    const notifications = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Notification[];
    callback(notifications);
  }, (error) => {
    handleFirestoreError(error, OperationType.LIST, 'notifications', auth);
  });
}

export function subscribeToUsers(callback: (users: User[]) => void) {
  const q = query(collection(db, 'users'), limit(500));
  return onSnapshot(q, (snapshot) => {
    const users = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as User[];
    users.forEach(u => cacheManager.setUser(u.id, u));
    callback(users);
  }, (error) => {
    handleFirestoreError(error, OperationType.LIST, 'users', auth);
  });
}

export function subscribeToCommunities(callback: (communities: Community[]) => void) {
  const q = query(collection(db, 'communities'));
  return onSnapshot(q, (snapshot) => {
    const communities = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Community[];
    communities.forEach(c => cacheManager.setCommunity(c.id, c));
    callback(communities);
  }, (error) => {
    handleFirestoreError(error, OperationType.LIST, 'communities', auth);
  });
}

export function subscribeToPages(callback: (pages: Page[]) => void) {
  const q = query(collection(db, 'pages'));
  return onSnapshot(q, (snapshot) => {
    const pages = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Page[];
    pages.forEach(p => cacheManager.setPage(p.id, p));
    callback(pages);
  }, (error) => {
    handleFirestoreError(error, OperationType.LIST, 'pages', auth);
  });
}

export function subscribeToFollows(userId: string, callback: (follows: any[]) => void) {
  const q = query(collection(db, 'follows'), where('followerId', '==', userId));
  return onSnapshot(q, (snapshot) => {
    const follows = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    callback(follows);
  }, (error) => {
    handleFirestoreError(error, OperationType.LIST, 'follows', auth);
  });
}

export function subscribeToChats(userId: string, callback: (chats: Chat[]) => void) {
  const q = query(collection(db, 'chats'), where('participants', 'array-contains', userId));
  return onSnapshot(q, (snapshot) => {
    const chats = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Chat[];
    callback(chats);
  }, (error) => {
    handleFirestoreError(error, OperationType.LIST, 'chats', auth);
  });
}

export function subscribeToMessages(chatId: string, callback: (messages: Message[]) => void) {
  const q = query(collection(db, `chats/${chatId}/messages`));
  return onSnapshot(q, (snapshot) => {
    const messages = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Message[];
    callback(messages);
  }, (error) => {
    handleFirestoreError(error, OperationType.LIST, 'messages', auth);
  });
}

/**
 * Real-time typing indicators
 */
export async function updateTypingState(chatId: string, userId: string, state: 'typing' | 'recording' | 'uploading' | null) {
  try {
    const docRef = doc(db, `chats/${chatId}/typing/${userId}`);
    await setDoc(docRef, {
      state,
      updatedAt: new Date().toISOString()
    });
  } catch (e) {
    console.warn('[dataService] Failed to update typing state', e);
  }
}

export function subscribeToTypingState(chatId: string, callback: (states: Record<string, 'typing' | 'recording' | 'uploading' | null>) => void) {
  const colRef = collection(db, `chats/${chatId}/typing`);
  return onSnapshot(colRef, (snapshot) => {
    const states: Record<string, 'typing' | 'recording' | 'uploading' | null> = {};
    snapshot.docs.forEach(doc => {
      states[doc.id] = doc.data().state || null;
    });
    callback(states);
  }, (error: any) => {
    if (error?.code === 'permission-denied') return;
    console.warn('[dataService] Typing state subscription error: ', error);
  });
}

/**
 * Real-time user online presence
 */
export async function updateOnlinePresence(userId: string, isOnline: boolean) {
  try {
    const docRef = doc(db, `presence/${userId}`);
    await setDoc(docRef, {
      isOnline,
      lastActive: new Date().toISOString()
    });
  } catch (e) {
    console.warn('[dataService] Failed to update presence', e);
  }
}

export function subscribeToOnlinePresence(callback: (presence: Record<string, boolean>) => void) {
  const colRef = collection(db, 'presence');
  return onSnapshot(colRef, (snapshot) => {
    const presenceMap: Record<string, boolean> = {};
    snapshot.docs.forEach(doc => {
      presenceMap[doc.id] = doc.data().isOnline || false;
    });
    callback(presenceMap);
  }, (error: any) => {
    if (error?.code === 'permission-denied') return;
    console.warn('[dataService] Presence subscription error: ', error);
  });
}

/**
 * Real-time read receipts
 */
export async function updateMessageReadReceipt(chatId: string, messageId: string, status: 'delivered' | 'read') {
  try {
    const docRef = doc(db, `chats/${chatId}/messages/${messageId}`);
    await updateDoc(docRef, { status });
  } catch (e) {
    // Fail silently or fallback
  }
}

