export interface HighImpactUpdate {
  id: string;
  type: 'system' | 'mention' | 'spark' | 'reputation';
  title: string;
  body: string;
  timestamp: string;
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
}
