import { db } from './firebase/config';
import { doc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { User, Post, ActivityEvent, ActivityEventType } from '../types';

const ACTIVITY_EVENTS_KEY = 'nexora_activity_events';

export interface UserActivityMetrics {
  contributions: number;
  reputationPoints: number;
  breakdown: {
    contributions: number;
    helpfulness: number;
    missionsCompleted: number;
    skillsVerified: number;
    categories: {
      contentCreation: number;
      communityEngagement: number;
      helpfulResponses: number;
      discoveryImpact: number;
      trustBuilding: number;
      platformParticipation: number;
    };
    trustMultiplier: number;
    antiGamingStatus: {
      isFarmingShieldActive: boolean;
      diminishingFactor: number;
      uniqueEngagerRatio: number;
      qualityBonus: number;
    };
  };
}

export class ActivityService {
  /**
   * Deterministic ID generator for complete idempotency
   */
  public static generateEventId(
    userId: string,
    type: ActivityEventType,
    targetId: string,
    fromUserId?: string
  ): string {
    const cleanUser = (userId || 'anon').trim();
    const cleanTarget = (targetId || 'default').trim();
    if (type === 'spark_received' && fromUserId) {
      return `act_${cleanUser}_spark_${fromUserId.trim()}_${cleanTarget}`;
    }
    if (type === 'comment_received' && fromUserId) {
      return `act_${cleanUser}_comment_recv_${fromUserId.trim()}_${cleanTarget}`;
    }
    return `act_${cleanUser}_${type}_${cleanTarget}`;
  }

  /**
   * Load all activity events from persistent storage
   */
  public static loadEvents(): ActivityEvent[] {
    try {
      const raw = localStorage.getItem(ACTIVITY_EVENTS_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  /**
   * Save all activity events to persistent storage
   */
  public static saveEvents(events: ActivityEvent[]): void {
    try {
      localStorage.setItem(ACTIVITY_EVENTS_KEY, JSON.stringify(events));
    } catch (e) {
      console.warn('Failed to save activity events locally:', e);
    }
  }

  /**
   * Get all activity events for a specific user
   */
  public static getUserActivityEvents(userId: string): ActivityEvent[] {
    if (!userId) return [];
    const all = this.loadEvents();
    return all.filter(e => e.userId === userId);
  }

  /**
   * Calculate point deltas for an event type with anti-gaming & anti-farming protection
   */
  public static calculateDeltas(
    type: ActivityEventType,
    userId: string,
    fromUserId?: string,
    existingUserEvents: ActivityEvent[] = []
  ): { contributionDelta: number; reputationDelta: number } {
    // 1. Contributions = what the user created / contributed
    // 2. Reputation = earned standing & community validation from others

    switch (type) {
      case 'post_create':
        return { contributionDelta: 5, reputationDelta: 0 };

      case 'media_upload':
        return { contributionDelta: 8, reputationDelta: 1 };

      case 'video_publish':
        return { contributionDelta: 10, reputationDelta: 2 };

      case 'pulse_create':
        return { contributionDelta: 10, reputationDelta: 2 };

      case 'voice_publish':
        return { contributionDelta: 8, reputationDelta: 1 };

      case 'comment_create':
        return { contributionDelta: 2, reputationDelta: 0 };

      case 'repost_create':
        return { contributionDelta: 3, reputationDelta: 0 };

      case 'share_received': {
        if (fromUserId && fromUserId === userId) {
          return { contributionDelta: 0, reputationDelta: 0 };
        }
        return { contributionDelta: 0, reputationDelta: 2 };
      }

      case 'circle_join':
      case 'community_join':
        return { contributionDelta: 5, reputationDelta: 1 };

      case 'poll_vote':
        return { contributionDelta: 2, reputationDelta: 0 };

      case 'mission_progress':
        return { contributionDelta: 4, reputationDelta: 1 };

      case 'mission_complete':
        return { contributionDelta: 10, reputationDelta: 5 };

      case 'comment_received': {
        // Self-comments give 0 reputation
        if (fromUserId && fromUserId === userId) {
          return { contributionDelta: 0, reputationDelta: 0 };
        }
        return { contributionDelta: 0, reputationDelta: 2 };
      }

      case 'spark_received': {
        // Self-sparks strictly rejected (0 reputation)
        if (fromUserId && fromUserId === userId) {
          return { contributionDelta: 0, reputationDelta: 0 };
        }

        // Anti-farming shield: check sparks from this specific user
        if (fromUserId) {
          const priorSparksFromSameUser = existingUserEvents.filter(
            e => e.type === 'spark_received' && e.fromUserId === fromUserId
          ).length;

          if (priorSparksFromSameUser === 0) {
            // First spark from a unique creator gives higher reputation
            return { contributionDelta: 0, reputationDelta: 3 };
          } else if (priorSparksFromSameUser < 5) {
            // Subsequent sparks from the same creator have standard diminishing weight
            return { contributionDelta: 0, reputationDelta: 1 };
          } else {
            // Capped at 5 sparks from same creator to prevent collusive farming
            return { contributionDelta: 0, reputationDelta: 0 };
          }
        }
        return { contributionDelta: 0, reputationDelta: 1 };
      }

      case 'profile_completed':
        return { contributionDelta: 5, reputationDelta: 5 };

      case 'profile_verified':
        return { contributionDelta: 15, reputationDelta: 25 };

      default:
        return { contributionDelta: 0, reputationDelta: 0 };
    }
  }

  /**
   * Record an activity event with absolute idempotency and real-time state sync
   */
  public static async recordActivityEvent(
    userId: string,
    type: ActivityEventType,
    targetId: string,
    options?: {
      fromUserId?: string;
      metadata?: Record<string, any>;
    }
  ): Promise<{ contributions: number; reputationPoints: number; isNew: boolean }> {
    if (!userId) return { contributions: 0, reputationPoints: 0, isNew: false };

    const eventId = this.generateEventId(userId, type, targetId, options?.fromUserId);
    const allEvents = this.loadEvents();

    // IDEMPOTENCY CHECK: if this event already exists, return current metrics without modifying
    const existingIndex = allEvents.findIndex(e => e.id === eventId);
    if (existingIndex !== -1) {
      const userMetrics = this.getUserMetrics(userId);
      return {
        contributions: userMetrics.contributions,
        reputationPoints: userMetrics.reputationPoints,
        isNew: false
      };
    }

    // Calculate exact deltas
    const userEvents = allEvents.filter(e => e.userId === userId);
    const { contributionDelta, reputationDelta } = this.calculateDeltas(
      type,
      userId,
      options?.fromUserId,
      userEvents
    );

    const newEvent: ActivityEvent = {
      id: eventId,
      userId,
      type,
      targetId,
      fromUserId: options?.fromUserId,
      contributionDelta,
      reputationDelta,
      timestamp: new Date().toISOString(),
      metadata: options?.metadata
    };

    allEvents.push(newEvent);
    this.saveEvents(allEvents);

    // Compute updated totals
    const updatedUserEvents = [...userEvents, newEvent];
    const totalContributions = updatedUserEvents.reduce((sum, e) => sum + (e.contributionDelta || 0), 0);
    const totalReputation = updatedUserEvents.reduce((sum, e) => sum + (e.reputationDelta || 0), 0);
    const breakdown = this.calculateBreakdownFromEvents(updatedUserEvents);

    // Update locally stored user data
    this.updateLocalUserCache(userId, totalContributions, totalReputation, breakdown);

    // Asynchronously write event and update user in Firestore
    if (db) {
      try {
        setDoc(
          doc(db, 'users', userId, 'activityEvents', eventId),
          {
            ...newEvent,
            createdAt: serverTimestamp()
          },
          { merge: true }
        ).catch(() => {});

        updateDoc(doc(db, 'users', userId), {
          contributions: totalContributions,
          reputationPoints: totalReputation,
          reputationBreakdown: breakdown,
          updatedAt: serverTimestamp()
        }).catch(() => {});
      } catch (err) {
        // Silently tolerate offline mode
      }
    }

    // Broadcast real-time update event so all UI components update instantly
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('nexora-user-metrics-updated', {
          detail: {
            userId,
            contributions: totalContributions,
            reputationPoints: totalReputation,
            breakdown
          }
        })
      );
    }

    return {
      contributions: totalContributions,
      reputationPoints: totalReputation,
      isNew: true
    };
  }

  /**
   * Calculate category breakdown and trust multipliers from real events
   */
  public static calculateBreakdownFromEvents(events: ActivityEvent[]): UserActivityMetrics['breakdown'] {
    let contentCreation = 0;
    let communityEngagement = 0;
    let helpfulResponses = 0;
    let discoveryImpact = 0;
    let trustBuilding = 0;
    let platformParticipation = 0;
    let missionsCompleted = 0;

    const uniqueEngagers = new Set<string>();
    let totalEngagements = 0;

    events.forEach(e => {
      switch (e.type) {
        case 'post_create':
        case 'media_upload':
        case 'video_publish':
        case 'voice_publish':
          contentCreation += e.contributionDelta + e.reputationDelta;
          break;

        case 'pulse_create':
          contentCreation += e.contributionDelta;
          discoveryImpact += e.reputationDelta * 3;
          break;

        case 'comment_create':
        case 'repost_create':
        case 'poll_vote':
          communityEngagement += e.contributionDelta;
          break;

        case 'comment_received':
          helpfulResponses += e.reputationDelta * 3;
          if (e.fromUserId) {
            uniqueEngagers.add(e.fromUserId);
            totalEngagements++;
          }
          break;

        case 'share_received':
          discoveryImpact += e.reputationDelta * 3;
          if (e.fromUserId) {
            uniqueEngagers.add(e.fromUserId);
            totalEngagements++;
          }
          break;

        case 'spark_received':
          discoveryImpact += e.reputationDelta * 4;
          if (e.fromUserId) {
            uniqueEngagers.add(e.fromUserId);
            totalEngagements++;
          }
          break;

        case 'circle_join':
        case 'community_join':
        case 'mission_progress':
          platformParticipation += e.contributionDelta + e.reputationDelta;
          break;

        case 'mission_complete':
          missionsCompleted++;
          platformParticipation += e.contributionDelta + e.reputationDelta;
          break;

        case 'profile_completed':
        case 'profile_verified':
          trustBuilding += e.contributionDelta + e.reputationDelta;
          break;
      }
    });

    const totalContribs = events.reduce((sum, e) => sum + (e.contributionDelta || 0), 0);
    const engagerRatio = totalEngagements > 0 ? Math.min(1, uniqueEngagers.size / totalEngagements) : 1;
    const trustMultiplier = Math.min(1.5, Math.max(0.75, 0.85 + (trustBuilding > 0 ? 0.15 : 0)));

    return {
      contributions: totalContribs,
      helpfulness: helpfulResponses + communityEngagement,
      missionsCompleted,
      skillsVerified: trustBuilding > 15 ? 1 : 0,
      categories: {
        contentCreation,
        communityEngagement,
        helpfulResponses,
        discoveryImpact,
        trustBuilding,
        platformParticipation
      },
      trustMultiplier,
      antiGamingStatus: {
        isFarmingShieldActive: true,
        diminishingFactor: 0.95,
        uniqueEngagerRatio: Number(engagerRatio.toFixed(2)),
        qualityBonus: contentCreation > 30 ? 10 : 0
      }
    };
  }

  /**
   * Get user metrics derived from real stored events
   */
  public static getUserMetrics(userId: string): UserActivityMetrics {
    const events = this.getUserActivityEvents(userId);
    const contributions = events.reduce((sum, e) => sum + (e.contributionDelta || 0), 0);
    const reputationPoints = events.reduce((sum, e) => sum + (e.reputationDelta || 0), 0);
    const breakdown = this.calculateBreakdownFromEvents(events);

    return {
      contributions,
      reputationPoints,
      breakdown
    };
  }

  /**
   * Deterministic reconciliation of historical user activity without double counting
   */
  public static reconcileUserMetrics(
    user: User,
    posts: Post[] = [],
    sparksRecords: any[] = [],
    circles: any[] = [],
    missions: any[] = []
  ): User {
    if (!user || !user.id) return user;

    const allEvents = this.loadEvents();
    let eventsAdded = false;

    // 1. Reconcile user posts
    const userPosts = posts.filter(p => p && p.userId === user.id);
    userPosts.forEach(post => {
      let type: ActivityEventType = 'post_create';
      if (post.videoUrl) type = 'video_publish';
      else if (post.image || (post.images && post.images.length > 0)) type = 'media_upload';
      else if (post.opportunityType) type = 'pulse_create';
      else if (post.isVoice) type = 'voice_publish';

      const eventId = this.generateEventId(user.id, type, post.id);
      if (!allEvents.some(e => e.id === eventId)) {
        const userEvents = allEvents.filter(e => e.userId === user.id);
        const { contributionDelta, reputationDelta } = this.calculateDeltas(type, user.id, undefined, userEvents);
        allEvents.push({
          id: eventId,
          userId: user.id,
          type,
          targetId: post.id,
          contributionDelta,
          reputationDelta,
          timestamp: post.timestamp || new Date().toISOString()
        });
        eventsAdded = true;
      }

      // Comments on this post from other users
      if (post.comments && Array.isArray(post.comments)) {
        post.comments.forEach(c => {
          if (c && c.userId && c.userId !== user.id) {
            const commentEventId = this.generateEventId(user.id, 'comment_received', c.id || `${post.id}_${c.userId}`, c.userId);
            if (!allEvents.some(e => e.id === commentEventId)) {
              allEvents.push({
                id: commentEventId,
                userId: user.id,
                type: 'comment_received',
                targetId: c.id || post.id,
                fromUserId: c.userId,
                contributionDelta: 0,
                reputationDelta: 2,
                timestamp: c.timestamp || new Date().toISOString()
              });
              eventsAdded = true;
            }
          }
        });
      }
    });

    // 2. Reconcile user comments on other posts
    posts.forEach(p => {
      if (p && p.comments && Array.isArray(p.comments)) {
        p.comments.forEach(c => {
          if (c && c.userId === user.id) {
            const commentCreateId = this.generateEventId(user.id, 'comment_create', c.id || `${p.id}_comment`);
            if (!allEvents.some(e => e.id === commentCreateId)) {
              allEvents.push({
                id: commentCreateId,
                userId: user.id,
                type: 'comment_create',
                targetId: c.id || p.id,
                contributionDelta: 2,
                reputationDelta: 0,
                timestamp: c.timestamp || new Date().toISOString()
              });
              eventsAdded = true;
            }
          }
        });
      }
    });

    // 3. Reconcile sparks received from other users
    sparksRecords.forEach(s => {
      const toUserId = s.toUserId || s.recipientId;
      const fromUserId = s.fromUserId || s.senderId;
      const targetId = s.targetId || s.postId || s.id;
      if (toUserId === user.id && fromUserId && fromUserId !== user.id) {
        const sparkEventId = this.generateEventId(user.id, 'spark_received', targetId, fromUserId);
        if (!allEvents.some(e => e.id === sparkEventId)) {
          const userEvents = allEvents.filter(e => e.userId === user.id);
          const { contributionDelta, reputationDelta } = this.calculateDeltas('spark_received', user.id, fromUserId, userEvents);
          allEvents.push({
            id: sparkEventId,
            userId: user.id,
            type: 'spark_received',
            targetId,
            fromUserId,
            contributionDelta,
            reputationDelta,
            timestamp: s.timestamp || new Date().toISOString()
          });
          eventsAdded = true;
        }
      }
    });

    // 4. Reconcile circles joined
    circles.forEach(c => {
      const circleId = c.circleId || c.id;
      if (circleId) {
        const circleEventId = this.generateEventId(user.id, 'circle_join', circleId);
        if (!allEvents.some(e => e.id === circleEventId)) {
          allEvents.push({
            id: circleEventId,
            userId: user.id,
            type: 'circle_join',
            targetId: circleId,
            contributionDelta: 5,
            reputationDelta: 1,
            timestamp: new Date().toISOString()
          });
          eventsAdded = true;
        }
      }
    });

    // 5. Reconcile missions completed
    missions.forEach(m => {
      const missionId = m.missionId || m.id;
      if (missionId) {
        const missionEventId = this.generateEventId(user.id, 'mission_complete', missionId);
        if (!allEvents.some(e => e.id === missionEventId)) {
          allEvents.push({
            id: missionEventId,
            userId: user.id,
            type: 'mission_complete',
            targetId: missionId,
            contributionDelta: 10,
            reputationDelta: 5,
            timestamp: new Date().toISOString()
          });
          eventsAdded = true;
        }
      }
    });

    // 6. Profile Trust Verification
    if (user.isVerified) {
      const verifiedId = this.generateEventId(user.id, 'profile_verified', 'verified_status');
      if (!allEvents.some(e => e.id === verifiedId)) {
        allEvents.push({
          id: verifiedId,
          userId: user.id,
          type: 'profile_verified',
          targetId: 'verified_status',
          contributionDelta: 15,
          reputationDelta: 25,
          timestamp: user.joinedDate || new Date().toISOString()
        });
        eventsAdded = true;
      }
    }

    // 7. Profile Completeness
    if (user.bio && user.bio.trim().length > 10 && user.avatar && !user.avatar.includes('photo-1535713875002-d1d0cf377fde')) {
      const completeId = this.generateEventId(user.id, 'profile_completed', 'profile_info');
      if (!allEvents.some(e => e.id === completeId)) {
        allEvents.push({
          id: completeId,
          userId: user.id,
          type: 'profile_completed',
          targetId: 'profile_info',
          contributionDelta: 5,
          reputationDelta: 5,
          timestamp: user.joinedDate || new Date().toISOString()
        });
        eventsAdded = true;
      }
    }

    if (eventsAdded) {
      this.saveEvents(allEvents);
    }

    const metrics = this.getUserMetrics(user.id);
    const updatedUser: User = {
      ...user,
      contributions: metrics.contributions,
      reputationPoints: metrics.reputationPoints,
      reputationBreakdown: metrics.breakdown
    };

    this.updateLocalUserCache(user.id, metrics.contributions, metrics.reputationPoints, metrics.breakdown);

    return updatedUser;
  }

  /**
   * Helper to update locally cached users
   */
  private static updateLocalUserCache(
    userId: string,
    contributions: number,
    reputationPoints: number,
    breakdown: UserActivityMetrics['breakdown']
  ) {
    try {
      // Update nexora_user if it's the current user
      const rawUser = localStorage.getItem('nexora_user');
      if (rawUser) {
        const u = JSON.parse(rawUser);
        if (u && u.id === userId) {
          u.contributions = contributions;
          u.reputationPoints = reputationPoints;
          u.reputationBreakdown = breakdown;
          localStorage.setItem('nexora_user', JSON.stringify(u));
        }
      }

      // Update nexora_users_db
      const rawDb = localStorage.getItem('nexora_users_db');
      if (rawDb) {
        const dbUsers = JSON.parse(rawDb);
        if (Array.isArray(dbUsers)) {
          const idx = dbUsers.findIndex(u => u.id === userId);
          if (idx !== -1) {
            dbUsers[idx].contributions = contributions;
            dbUsers[idx].reputationPoints = reputationPoints;
            dbUsers[idx].reputationBreakdown = breakdown;
            localStorage.setItem('nexora_users_db', JSON.stringify(dbUsers));
          }
        }
      }
    } catch {}
  }
}
