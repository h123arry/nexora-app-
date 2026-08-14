import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  query, 
  orderBy, 
  limit, 
  serverTimestamp, 
  increment, 
  deleteDoc 
} from 'firebase/firestore';
import { db, auth } from './config';

export interface MemoryEvent {
  id?: string;
  userId: string;
  type: string;
  targetId: string;
  targetType?: string;
  timestamp?: any;
  metadata?: any;
}

export class MemoryService {
  /**
   * Record a general user memory interaction event
   */
  static async recordInteraction(type: string, targetId: string, targetType = 'post', metadata: any = {}) {
    const user = auth.currentUser;
    if (!user) return;

    try {
      const eventsRef = collection(db, 'users', user.uid, 'memoryEvents');
      const eventId = `evt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      await setDoc(doc(eventsRef, eventId), {
        userId: user.uid,
        type,
        targetId,
        targetType,
        timestamp: serverTimestamp(),
        metadata: JSON.parse(JSON.stringify(metadata || {}))
      });
    } catch (error) {
      console.error('Error recording memory interaction:', error);
    }
  }

  static async recordPostView(postId: string, metadata: any = {}) {
    const user = auth.currentUser;
    if (!user) return;

    try {
      const stateRef = doc(db, 'users', user.uid, 'memoryState', `post_view_${postId}`);
      await setDoc(stateRef, {
        userId: user.uid,
        postId,
        lastViewedAt: serverTimestamp(),
        viewCount: increment(1),
        metadata
      }, { merge: true });

      await this.recordInteraction('POST_VIEWED', postId, 'post', metadata);
    } catch (error) {
      console.error('Error recording post view:', error);
    }
  }

  static async recordPostLike(postId: string, liked: boolean, metadata: any = {}) {
    const user = auth.currentUser;
    if (!user) return;

    try {
      const stateRef = doc(db, 'users', user.uid, 'memoryState', `post_like_${postId}`);
      if (liked) {
        await setDoc(stateRef, {
          userId: user.uid,
          postId,
          liked: true,
          updatedAt: serverTimestamp(),
          metadata
        }, { merge: true });
        await this.recordInteraction('POST_SPARKED', postId, 'post', metadata);
      } else {
        await deleteDoc(stateRef).catch(() => {});
        await this.recordInteraction('POST_UNSPARKED', postId, 'post', metadata);
      }
    } catch (error) {
      console.error('Error recording post like/spark memory:', error);
    }
  }

  static async recordSpark(postId: string, sparked: boolean, metadata: any = {}) {
    return this.recordPostLike(postId, sparked, metadata);
  }

  static async recordComment(postId: string, commentId: string, metadata: any = {}) {
    const user = auth.currentUser;
    if (!user) return;

    try {
      await this.recordInteraction('COMMENT_CREATED', postId, 'post', { commentId, ...metadata });
    } catch (error) {
      console.error('Error recording comment memory:', error);
    }
  }

  static async recordFollow(followedUserId: string, following: boolean, metadata: any = {}) {
    const user = auth.currentUser;
    if (!user) return;

    try {
      const stateRef = doc(db, 'users', user.uid, 'memoryState', `follow_${followedUserId}`);
      if (following) {
        await setDoc(stateRef, {
          userId: user.uid,
          followedUserId,
          following: true,
          updatedAt: serverTimestamp(),
          metadata
        }, { merge: true });
        await this.recordInteraction('FOLLOW_CREATED', followedUserId, 'user', metadata);
      } else {
        await deleteDoc(stateRef).catch(() => {});
        await this.recordInteraction('FOLLOW_REMOVED', followedUserId, 'user', metadata);
      }
    } catch (error) {
      console.error('Error recording follow memory:', error);
    }
  }

  static async recordSearch(queryStr: string, metadata: any = {}) {
    const user = auth.currentUser;
    if (!user || !queryStr.trim()) return;

    try {
      const cleanQuery = queryStr.trim().toLowerCase();
      const eventsRef = collection(db, 'users', user.uid, 'memoryEvents');
      const eventId = `search_${Date.now()}`;
      await setDoc(doc(eventsRef, eventId), {
        userId: user.uid,
        type: 'SEARCH_PERFORMED',
        targetId: cleanQuery,
        targetType: 'search',
        timestamp: serverTimestamp(),
        metadata: { query: cleanQuery, ...metadata }
      });
    } catch (error) {
      console.error('Error recording search memory:', error);
    }
  }

  static async hasSeenPost(userId: string, postId: string): Promise<boolean> {
    try {
      const stateRef = doc(db, 'users', userId, 'memoryState', `post_view_${postId}`);
      const snap = await getDoc(stateRef);
      return snap.exists();
    } catch {
      return false;
    }
  }

  static async getRecentActivity(userId: string, limitCount = 20): Promise<MemoryEvent[]> {
    try {
      const eventsRef = collection(db, 'users', userId, 'memoryEvents');
      const q = query(eventsRef, orderBy('timestamp', 'desc'), limit(limitCount));
      const snap = await getDocs(q);
      return snap.docs.map(d => ({ id: d.id, ...d.data() } as MemoryEvent));
    } catch (error) {
      console.error('Error fetching recent activity memory:', error);
      return [];
    }
  }

  static async getUserInterests(userId: string): Promise<string[]> {
    const activity = await this.getRecentActivity(userId, 50);
    const tagCounts: Record<string, number> = {};
    activity.forEach(ev => {
      const tags = ev.metadata?.tags;
      if (Array.isArray(tags)) {
        tags.forEach(t => {
          const clean = t.toLowerCase().replace('#', '').trim();
          if (clean) tagCounts[clean] = (tagCounts[clean] || 0) + 1;
        });
      }
    });
    return Object.entries(tagCounts)
      .sort((a, b) => b[1] - a[1])
      .map(([tag]) => tag);
  }
}
