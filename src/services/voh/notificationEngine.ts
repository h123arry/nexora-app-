export interface HighImpactUpdate {
  id: string;
  type: 'system' | 'mention' | 'spark' | 'reputation';
  title: string;
  body: string;
  timestamp: string;
}

export interface NotificationItem {
  id: string;
  type: 'spark' | 'comment' | 'mention' | 'follow' | 'community';
  senderName: string;
  targetId?: string;
  timestamp: Date;
}

export class NotificationEngine {
  static extractHighImpactAlerts(notifications: any[]): HighImpactUpdate[] {
    // Take real notifications and highlight important system updates, mentions, or milestones
    return notifications
      .filter(n => !n.isRead)
      .slice(0, 3)
      .map((n, idx) => ({
        id: n.id || `notif-${idx}`,
        type: n.type || 'system',
        title: n.title || 'Platform Notification',
        body: n.content || 'You have new activity on your profile.',
        timestamp: n.timestamp || 'Just now'
      }));
  }

  static batchAndCluster(notifications: NotificationItem[]): {
    clusteredText: string;
    type: string;
    count: number;
    latestSender: string;
  }[] {
    const groups: { [key: string]: NotificationItem[] } = {};

    notifications.forEach(n => {
      const key = `${n.type}_${n.targetId || 'global'}`;
      if (!groups[key]) groups[key] = [];
      groups[key].push(n);
    });

    return Object.keys(groups).map(key => {
      const items = groups[key];
      const count = items.length;
      const latest = items[0]; // Assuming pre-sorted by date desc
      let text = '';

      if (latest.type === 'spark') {
        text = count > 1 
          ? `${latest.senderName} and ${count - 1} others sparked your post`
          : `${latest.senderName} sparked your post`;
      } else if (latest.type === 'comment') {
        text = count > 1
          ? `${latest.senderName} and ${count - 1} others commented on your discussion`
          : `${latest.senderName} commented: "${latest.senderName === 'Nexora' ? 'Check out the update!' : 'Nice view'}"`;
      } else if (latest.type === 'follow') {
        text = count > 1
          ? `${latest.senderName} and ${count - 1} others started following you`
          : `${latest.senderName} started following you`;
      } else {
        text = `${latest.senderName} interacted with your channel`;
      }

      return {
        clusteredText: text,
        type: latest.type,
        count,
        latestSender: latest.senderName
      };
    });
  }
}
