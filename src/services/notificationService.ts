import { Notification, User, Post } from '../types';

// ============================================================================
// 1. CRYSTAL SYNTHESIS AUDIO ENGINE (Zero External Assets Required)
// ============================================================================
let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

export function playNotificationSound(type: 'spark' | 'comment' | 'follow' | 'profile_view' | 'sync' | 'default' = 'default') {
  try {
    const soundEnabled = localStorage.getItem('nexora_notif_sound') !== 'false';
    if (!soundEnabled) return;

    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const gainNode = ctx.createGain();
    gainNode.connect(ctx.destination);

    if (type === 'spark') {
      // Warm euphoric spark chord (587Hz -> 880Hz -> 1174Hz)
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      osc1.type = 'sine';
      osc2.type = 'triangle';
      
      osc1.frequency.setValueAtTime(587.33, now);
      osc1.frequency.exponentialRampToValueAtTime(1174.66, now + 0.18);
      osc2.frequency.setValueAtTime(880.00, now);
      osc2.frequency.exponentialRampToValueAtTime(1760.00, now + 0.22);

      gainNode.gain.setValueAtTime(0.12, now);
      gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

      osc1.connect(gainNode);
      osc2.connect(gainNode);
      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + 0.35);
      osc2.stop(now + 0.35);

    } else if (type === 'comment') {
      // Bubbly double chime (659.25Hz -> 783.99Hz)
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(659.25, now);
      osc.frequency.setValueAtTime(783.99, now + 0.08);

      gainNode.gain.setValueAtTime(0.14, now);
      gainNode.gain.setValueAtTime(0.14, now + 0.08);
      gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.28);

      osc.connect(gainNode);
      osc.start(now);
      osc.stop(now + 0.28);

    } else if (type === 'follow') {
      // Uplifting tri-tone (523.25Hz -> 659.25Hz -> 783.99Hz)
      const osc = ctx.createOscillator();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(523.25, now);
      osc.frequency.setValueAtTime(659.25, now + 0.07);
      osc.frequency.setValueAtTime(783.99, now + 0.14);

      gainNode.gain.setValueAtTime(0.12, now);
      gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.32);

      osc.connect(gainNode);
      osc.start(now);
      osc.stop(now + 0.32);

    } else if (type === 'profile_view') {
      // Resonant ambient scanner ping (880Hz -> 1046Hz)
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, now);
      osc.frequency.exponentialRampToValueAtTime(1046.5, now + 0.12);

      gainNode.gain.setValueAtTime(0.10, now);
      gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.38);

      osc.connect(gainNode);
      osc.start(now);
      osc.stop(now + 0.38);

    } else if (type === 'sync') {
      // Cyber harmonic data stream sweep (440Hz -> 880Hz -> 1320Hz)
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.exponentialRampToValueAtTime(1320, now + 0.20);

      gainNode.gain.setValueAtTime(0.15, now);
      gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.40);

      osc.connect(gainNode);
      osc.start(now);
      osc.stop(now + 0.40);

    } else {
      // Default soft blip
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(600, now);
      osc.frequency.exponentialRampToValueAtTime(900, now + 0.1);

      gainNode.gain.setValueAtTime(0.10, now);
      gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

      osc.connect(gainNode);
      osc.start(now);
      osc.stop(now + 0.25);
    }

    // Trigger mobile haptics if supported
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate([35, 25, 45]);
      } catch (_) {}
    }
  } catch (err) {
    console.debug('[Audio] Audio synthesis not yet unlocked by user interaction:', err);
  }
}

// ============================================================================
// 2. WEB PUSH NOTIFICATION API (Native Device Notifications)
// ============================================================================
export async function requestPushPermission(): Promise<NotificationPermission> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'denied';
  }
  try {
    const permission = await window.Notification.requestPermission();
    localStorage.setItem('nexora_web_push_permission', permission);
    return permission;
  } catch (err) {
    console.error('[WebPush] Error requesting notification permission:', err);
    return 'denied';
  }
}

export function isPushPermissionGranted(): boolean {
  if (typeof window === 'undefined' || !('Notification' in window)) return false;
  return window.Notification.permission === 'granted';
}

export function showWebPushNotification(title: string, options?: NotificationOptions) {
  if (typeof window === 'undefined' || !('Notification' in window)) return;
  if (window.Notification.permission !== 'granted') return;

  try {
    const defaultIcon = 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=192&auto=format&fit=crop&q=80';
    const notif = new window.Notification(title, {
      icon: defaultIcon,
      badge: defaultIcon,
      silent: true, // We play our custom Web Audio sound
      ...options
    });

    notif.onclick = () => {
      window.focus();
      notif.close();
      if (options?.data?.url) {
        window.location.hash = options.data.url;
      }
    };
  } catch (err) {
    console.debug('[WebPush] Native notification display skipped:', err);
  }
}

// ============================================================================
// 3. LIVE SOCIAL NETWORK ACTORS FOR REALISTIC SIMULATION
// ============================================================================
export const NETWORK_CREATORS = [
  {
    id: 'user-kai-zen',
    name: 'Kai Zen',
    username: 'kai_zen',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    location: 'Tokyo, Japan',
    bio: 'AI & Neural Systems Architect',
    matchPercentage: 96
  },
  {
    id: 'user-elena-rostova',
    name: 'Elena Rostova',
    username: 'elena_rostova',
    avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80',
    location: 'Berlin, Germany',
    bio: 'Visual Synth Director & Generative 3D Artist',
    matchPercentage: 92
  },
  {
    id: 'user-alex-rivers',
    name: 'Alex Rivers',
    username: 'alex_rivers',
    avatar: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150&auto=format&fit=crop&q=80',
    location: 'San Francisco, USA',
    bio: 'Spatial Audio Scenographer & Sound Synthesist',
    matchPercentage: 89
  },
  {
    id: 'user-maya-synth',
    name: 'Maya Chen',
    username: 'maya_synth',
    avatar: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=150&auto=format&fit=crop&q=80',
    location: 'Singapore',
    bio: 'Cybernetic Interface Explorer & UI Craftsperson',
    matchPercentage: 94
  },
  {
    id: 'user-dr-aravind',
    name: 'Dr. Aravind',
    username: 'dr_aravind',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    location: 'London, UK',
    bio: 'Quantum Computing & Distributed Graph Specialist',
    matchPercentage: 87
  },
  {
    id: 'user-sol-solis',
    name: 'Sol Solis',
    username: 'sol_solis',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
    location: 'Seoul, South Korea',
    bio: 'Orbit Node Broadcaster & Neo-Hacker',
    matchPercentage: 91
  }
];

const COMMENT_PRESETS = [
  "This perspective is remarkably sharp and well executed! 🔥",
  "Loving the aesthetic pacing and sound design here. ✨",
  "Huge fan of this! Just shared with my circle. 🚀",
  "Top-tier Nexora content. Looking forward to more! ⚡",
  "The details on this are truly next-level. 👏",
  "Bookmarked for my research collection! 💡"
];

// ============================================================================
// 4. REAL-TIME NOTIFICATION DISPATCH ENGINE
// ============================================================================
export function dispatchRealTimeNotification(notif: Notification, options: { playSound?: boolean; showWebPush?: boolean; showPop?: boolean } = {}) {
  const { playSound = true, showWebPush = true, showPop = true } = options;

  // 1. Play synthesized audio feedback
  if (playSound) {
    const soundType = notif.type === 'spark' || notif.type === 'like' ? 'spark'
      : notif.type === 'comment' ? 'comment'
      : notif.type === 'follow' ? 'follow'
      : notif.type === 'profile_view' ? 'profile_view'
      : 'default';
    playNotificationSound(soundType);
  }

  // 2. Dispatch custom event for the in-app Pop banner & notifications store
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('nexora-realtime-notification', {
      detail: {
        notification: notif,
        showPop
      }
    }));
  }

  // 3. Fire native Web Push notification if allowed & user is in background
  if (showWebPush && isPushPermissionGranted()) {
    const titleMap: Record<string, string> = {
      spark: `⚡ ${notif.actorName || notif.username} sparked your post!`,
      like: `⚡ ${notif.actorName || notif.username} sparked your post!`,
      comment: `💬 ${notif.actorName || notif.username} commented on your post`,
      follow: `👤 ${notif.actorName || notif.username} started following you`,
      profile_view: `👁️ ${notif.actorName || notif.username} viewed your profile`,
      mention: `🏷️ ${notif.actorName || notif.username} mentioned you`,
      message: `✉️ New message from ${notif.actorName || notif.username}`,
      system: `🔔 NEXORA Network Notification`
    };

    const pushTitle = titleMap[notif.type] || `🔔 NEXORA: ${notif.actorName || notif.username}`;
    showWebPushNotification(pushTitle, {
      body: notif.content,
      icon: notif.avatar,
      tag: `nexora-notif-${notif.type}-${Date.now()}`
    });
  }
}

// ============================================================================
// 5. SOCIAL ENGAGEMENT SIMULATOR FOR USER POSTS & ACTIVITY
// ============================================================================
export function triggerEngagementOnNewPost(post: Post, currentUser: User) {
  if (typeof window === 'undefined') return;

  const shuffledCreators = [...NETWORK_CREATORS].sort(() => Math.random() - 0.5);

  // Wave 1: Immediate Spark (4 - 7 seconds)
  const sparkCreator = shuffledCreators[0];
  setTimeout(() => {
    const notif: Notification = {
      id: `pop-spark-${Date.now()}-${Math.random()}`,
      type: 'spark',
      userId: sparkCreator.id,
      username: sparkCreator.username,
      actorName: sparkCreator.name,
      avatar: sparkCreator.avatar,
      targetId: post.id,
      content: `sparked your post: "${post.content.slice(0, 42)}${post.content.length > 42 ? '...' : ''}"`,
      targetPostPreview: post.content.slice(0, 50),
      targetPostImage: post.image || (post.images && post.images[0]),
      timestamp: new Date().toISOString(),
      isRead: false,
      priority: 1,
      actionText: 'View Post',
      actionType: 'view_post',
      category: 'sparks'
    };
    dispatchRealTimeNotification(notif);
  }, 4500 + Math.random() * 3000);

  // Wave 2: Thoughtful Comment (10 - 15 seconds)
  const commentCreator = shuffledCreators[1];
  const commentText = COMMENT_PRESETS[Math.floor(Math.random() * COMMENT_PRESETS.length)];
  setTimeout(() => {
    const notif: Notification = {
      id: `pop-comment-${Date.now()}-${Math.random()}`,
      type: 'comment',
      userId: commentCreator.id,
      username: commentCreator.username,
      actorName: commentCreator.name,
      avatar: commentCreator.avatar,
      targetId: post.id,
      content: `commented: "${commentText}"`,
      targetPostPreview: post.content.slice(0, 50),
      targetPostImage: post.image || (post.images && post.images[0]),
      timestamp: new Date().toISOString(),
      isRead: false,
      priority: 1,
      actionText: 'Reply',
      actionType: 'reply',
      category: 'comments'
    };
    dispatchRealTimeNotification(notif);
  }, 11000 + Math.random() * 4000);

  // Wave 3: Profile View (19 - 24 seconds)
  const viewerCreator = shuffledCreators[2];
  setTimeout(() => {
    const notif: Notification = {
      id: `pop-view-${Date.now()}-${Math.random()}`,
      type: 'profile_view',
      userId: viewerCreator.id,
      username: viewerCreator.username,
      actorName: viewerCreator.name,
      avatar: viewerCreator.avatar,
      targetId: currentUser.id,
      content: `viewed your profile from ${viewerCreator.location} (${viewerCreator.matchPercentage}% DNA Match)`,
      location: viewerCreator.location,
      matchPercentage: viewerCreator.matchPercentage,
      timestamp: new Date().toISOString(),
      isRead: false,
      priority: 2,
      actionText: 'View Profile',
      actionType: 'view_profile',
      category: 'profile_views'
    };
    dispatchRealTimeNotification(notif);
  }, 19000 + Math.random() * 5000);

  // Wave 4: New Follower (28 - 35 seconds)
  const followCreator = shuffledCreators[3];
  setTimeout(() => {
    const notif: Notification = {
      id: `pop-follow-${Date.now()}-${Math.random()}`,
      type: 'follow',
      userId: followCreator.id,
      username: followCreator.username,
      actorName: followCreator.name,
      avatar: followCreator.avatar,
      targetId: currentUser.id,
      content: `started following you and subscribed to your broadcast radar.`,
      timestamp: new Date().toISOString(),
      isRead: false,
      priority: 1,
      actionText: 'Follow Back',
      actionType: 'follow_back',
      category: 'followers'
    };
    dispatchRealTimeNotification(notif);
  }, 28000 + Math.random() * 7000);
}

// ============================================================================
// 6. PROFILE VIEW TRIGGER
// ============================================================================
export function recordProfileView(viewedUserId: string, currentUser: User) {
  // If someone other than currentUser views the profile, or simulated visitor
  if (viewedUserId !== currentUser.id) {
    // Current user viewed someone else's profile, log locally
    try {
      const historyKey = 'nexora_recent_profile_views';
      const existing = JSON.parse(localStorage.getItem(historyKey) || '[]');
      const updated = [{ userId: viewedUserId, timestamp: Date.now() }, ...existing.filter((v: any) => v.userId !== viewedUserId)].slice(0, 30);
      localStorage.setItem(historyKey, JSON.stringify(updated));
    } catch (_) {}
    return;
  }

  // A network visitor viewed current user's profile
  const creator = NETWORK_CREATORS[Math.floor(Math.random() * NETWORK_CREATORS.length)];
  const notif: Notification = {
    id: `pop-pview-${Date.now()}-${Math.random()}`,
    type: 'profile_view',
    userId: creator.id,
    username: creator.username,
    actorName: creator.name,
    avatar: creator.avatar,
    targetId: currentUser.id,
    content: `viewed your profile from ${creator.location} (${creator.matchPercentage}% DNA Match)`,
    location: creator.location,
    matchPercentage: creator.matchPercentage,
    timestamp: new Date().toISOString(),
    isRead: false,
    priority: 2,
    actionText: 'View Profile',
    actionType: 'view_profile',
    category: 'profile_views'
  };
  dispatchRealTimeNotification(notif);
}

// ============================================================================
// 7. INSTANT TEST TRIGGERS (For Direct UI Testing)
// ============================================================================
export function triggerTestSparkPop(post?: Post) {
  const creator = NETWORK_CREATORS[Math.floor(Math.random() * NETWORK_CREATORS.length)];
  const postSnippet = post ? post.content.slice(0, 35) : "Next-generation quantum neural UI framework";
  const notif: Notification = {
    id: `test-spark-${Date.now()}`,
    type: 'spark',
    userId: creator.id,
    username: creator.username,
    actorName: creator.name,
    avatar: creator.avatar,
    targetId: post?.id || 'post-sample',
    content: `sparked your post: "${postSnippet}..."`,
    targetPostPreview: postSnippet,
    targetPostImage: post?.image || (post?.images && post.images[0]) || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=100&auto=format&fit=crop&q=80',
    timestamp: new Date().toISOString(),
    isRead: false,
    priority: 1,
    actionText: 'View Post',
    actionType: 'view_post',
    category: 'sparks'
  };
  dispatchRealTimeNotification(notif);
}

export function triggerTestCommentPop(post?: Post) {
  const creator = NETWORK_CREATORS[Math.floor(Math.random() * NETWORK_CREATORS.length)];
  const commentText = COMMENT_PRESETS[Math.floor(Math.random() * COMMENT_PRESETS.length)];
  const notif: Notification = {
    id: `test-comment-${Date.now()}`,
    type: 'comment',
    userId: creator.id,
    username: creator.username,
    actorName: creator.name,
    avatar: creator.avatar,
    targetId: post?.id || 'post-sample',
    content: `commented: "${commentText}"`,
    targetPostPreview: post ? post.content.slice(0, 40) : "Next-generation quantum neural UI framework",
    targetPostImage: post?.image || (post?.images && post.images[0]) || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=100&auto=format&fit=crop&q=80',
    timestamp: new Date().toISOString(),
    isRead: false,
    priority: 1,
    actionText: 'Reply',
    actionType: 'reply',
    category: 'comments'
  };
  dispatchRealTimeNotification(notif);
}

export function triggerTestFollowPop() {
  const creator = NETWORK_CREATORS[Math.floor(Math.random() * NETWORK_CREATORS.length)];
  const notif: Notification = {
    id: `test-follow-${Date.now()}`,
    type: 'follow',
    userId: creator.id,
    username: creator.username,
    actorName: creator.name,
    avatar: creator.avatar,
    content: `started following you and subscribed to your broadcast stream.`,
    timestamp: new Date().toISOString(),
    isRead: false,
    priority: 1,
    actionText: 'Follow Back',
    actionType: 'follow_back',
    category: 'followers'
  };
  dispatchRealTimeNotification(notif);
}

export function triggerTestProfileViewPop(currentUser?: User) {
  const creator = NETWORK_CREATORS[Math.floor(Math.random() * NETWORK_CREATORS.length)];
  const notif: Notification = {
    id: `test-view-${Date.now()}`,
    type: 'profile_view',
    userId: creator.id,
    username: creator.username,
    actorName: creator.name,
    avatar: creator.avatar,
    targetId: currentUser?.id || 'current-user',
    content: `viewed your profile from ${creator.location} (${creator.matchPercentage}% DNA Match)`,
    location: creator.location,
    matchPercentage: creator.matchPercentage,
    timestamp: new Date().toISOString(),
    isRead: false,
    priority: 2,
    actionText: 'View Profile',
    actionType: 'view_profile',
    category: 'profile_views'
  };
  dispatchRealTimeNotification(notif);
}
