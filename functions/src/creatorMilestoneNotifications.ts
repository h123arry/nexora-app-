import type { Firestore } from 'firebase-admin/firestore';

export interface CreatorMilestoneStats {
  followers: number;
  totalLikes: number;
  totalViews: number;
  totalComments: number;
  totalShares: number;
  totalSaves: number;
  totalEarnedNex: number;
  highestPostViews: number;
  publishedPosts: number;
  isVerified: boolean;
}

export interface CreatorMilestone {
  id: string;
  title: string;
  content: string;
}

const safeCount = (value: unknown): number =>
  typeof value === 'number' && Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;

export function buildCreatorMilestones(stats: CreatorMilestoneStats): CreatorMilestone[] {
  const milestones: CreatorMilestone[] = [];
  const add = (id: string, title: string, content: string, reached: boolean) => {
    if (reached) milestones.push({ id, title, content });
  };

  for (const threshold of [50, 100, 500, 1000]) {
    add(`followers_${threshold}`, `${threshold.toLocaleString()} followers`,
      `Your community has grown to ${threshold.toLocaleString()} followers. Thank you for building with NEXORA.`, stats.followers >= threshold);
  }
  for (const threshold of [100, 500, 1000]) {
    add(`likes_${threshold}`, `${threshold.toLocaleString()} Sparks received`,
      `Your published posts have received ${threshold.toLocaleString()} likes. Your work is reaching people.`, stats.totalLikes >= threshold);
  }
  for (const threshold of [1000, 10000]) {
    add(`views_${threshold}`, `${threshold.toLocaleString()} recorded views`,
      `Your published posts have reached ${threshold.toLocaleString()} recorded views.`, stats.totalViews >= threshold);
  }
  for (const threshold of [100, 500]) {
    add(`comments_${threshold}`, `${threshold.toLocaleString()} comments received`,
      `People have left ${threshold.toLocaleString()} comments across your published posts.`, stats.totalComments >= threshold);
  }
  for (const threshold of [50, 100]) {
    add(`shares_${threshold}`, `${threshold.toLocaleString()} shares and reposts`,
      `Your published posts have been shared or reposted ${threshold.toLocaleString()} times.`, stats.totalShares >= threshold);
    add(`saves_${threshold}`, `${threshold.toLocaleString()} saves`,
      `People have saved your published posts ${threshold.toLocaleString()} times.`, stats.totalSaves >= threshold);
  }
  for (const threshold of [1000, 10000]) {
    add(`nex_earned_${threshold}`, `${threshold.toLocaleString()} NEX earned`,
      `Your creator activity has generated ${threshold.toLocaleString()} NEX in recorded earnings.`, stats.totalEarnedNex >= threshold);
  }
  for (const threshold of [500, 1000]) {
    add(`post_views_${threshold}`, `${threshold.toLocaleString()} views on one post`,
      `One of your posts has reached ${threshold.toLocaleString()} recorded views.`, stats.highestPostViews >= threshold);
  }
  for (const threshold of [3, 10]) {
    add(`published_posts_${threshold}`, `${threshold} posts published`,
      `You have published ${threshold} posts on NEXORA. Keep creating.`, stats.publishedPosts >= threshold);
  }
  add('account_verified', 'Account verification complete',
    'Your NEXORA account is now verified.', stats.isVerified);
  return milestones;
}

/**
 * Issues each earned milestone once. The marker and inbox record are committed
 * atomically so Firestore retries cannot create duplicate celebration alerts.
 */
export async function issueCreatorMilestones(db: Firestore, creatorId: string): Promise<void> {
  if (!creatorId || creatorId.length > 150 || creatorId.includes('/')) return;
  const userRef = db.collection('users').doc(creatorId);
  const userSnapshot = await userRef.get();
  if (!userSnapshot.exists) return;

  const [profileSnapshot, postsSnapshot] = await Promise.all([
    db.collection('publicProfiles').doc(creatorId).get(),
    db.collection('posts').where('userId', '==', creatorId).limit(500).get(),
  ]);
  const user = userSnapshot.data() || {};
  const profile = profileSnapshot.data() || {};
  const posts = postsSnapshot.docs.map(document => document.data()).filter(post =>
    post.isArchived !== true && post.isDraft !== true && post.audience !== 'onlyme'
  );
  const views = posts.map(post => safeCount(post.views ?? post.viewCount));
  const stats: CreatorMilestoneStats = {
    followers: safeCount(profile.followers ?? user.followers),
    totalLikes: posts.reduce((total, post) => total + safeCount(post.likes ?? post.likeCount), 0),
    totalViews: views.reduce((total, value) => total + value, 0),
    totalComments: posts.reduce((total, post) => total + safeCount(post.commentsCount ?? (Array.isArray(post.comments) ? post.comments.length : 0)), 0),
    totalShares: posts.reduce((total, post) => total + safeCount(post.shares), 0),
    totalSaves: posts.reduce((total, post) => total + safeCount(post.bookmarksCount ?? post.saves), 0),
    totalEarnedNex: safeCount(user.totalEarnedNex),
    highestPostViews: views.reduce((highest, value) => Math.max(highest, value), 0),
    publishedPosts: posts.length,
    isVerified: user.isVerified === true || profile.isVerified === true,
  };

  const milestones = buildCreatorMilestones(stats);
  for (const milestone of milestones) {
    const markerRef = userRef.collection('creatorMilestones').doc(milestone.id);
    const notificationId = `creator_milestone_${milestone.id}`;
    const notificationRef = userRef.collection('notifications').doc(notificationId);
    await db.runTransaction(async transaction => {
      const [marker, notification] = await Promise.all([
        transaction.get(markerRef),
        transaction.get(notificationRef),
      ]);
      if (marker.exists || notification.exists) return;
      const timestamp = new Date().toISOString();
      transaction.create(markerRef, {
        milestoneId: milestone.id,
        title: milestone.title,
        achievedAt: timestamp,
      });
      transaction.create(notificationRef, {
        id: notificationId,
        type: 'reputation_milestone',
        userId: 'system',
        username: 'NEXORA',
        avatar: '',
        title: milestone.title,
        content: milestone.content,
        timestamp,
        isRead: false,
        priority: 4,
        category: milestone.id === 'account_verified' ? 'account' : 'creator',
        targetId: milestone.id === 'account_verified' ? 'account-security' : 'creator-dashboard',
        milestoneId: milestone.id,
      });
    });
  }
}
