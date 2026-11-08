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
  content?: string;
  timestamp: Date;
}

function isNotificationRecord(item: unknown): item is Record<string, any> {
  if (!item || typeof item !== 'object') return false;
  const record = item as Record<string, any>;
  return record.isRead !== true && typeof record.id === 'string' && record.id.trim().length > 0;
}

function formatNotificationTimestamp(value: unknown): string {
  if (typeof value === 'string' && value.trim()) return value;
  if (value instanceof Date && Number.isFinite(value.getTime())) return value.toISOString();
  if (value && typeof value === 'object' && 'toDate' in value && typeof (value as { toDate?: unknown }).toDate === 'function') {
    const date = (value as { toDate: () => Date }).toDate();
    if (date instanceof Date && Number.isFinite(date.getTime())) return date.toISOString();
  }
  return 'Time unavailable';
}

export class NotificationEngine {
  static extractHighImpactAlerts(notifications: unknown[]): HighImpactUpdate[] {
    const validTypes = new Set(['system', 'mention', 'spark', 'reputation']);
    return notifications
      .filter(isNotificationRecord)
      .slice(0, 3)
      .map(item => ({
        id: item.id,
        type: validTypes.has(item.type) ? item.type : 'system',
        title: typeof item.title === 'string' && item.title.trim() ? item.title.trim() : 'Notification',
        body: typeof item.content === 'string' && item.content.trim()
          ? item.content.trim()
          : 'Open this notification to view its details.',
        timestamp: formatNotificationTimestamp(item.timestamp),
      }));
  }

  static batchAndCluster(notifications: NotificationItem[]): {
    clusteredText: string;
    type: string;
    count: number;
    latestSender: string;
  }[] {
    const groups: Record<string, NotificationItem[]> = {};
    notifications.forEach(notification => {
      const key = `${notification.type}_${notification.targetId || 'global'}`;
      (groups[key] ||= []).push(notification);
    });

    return Object.values(groups).map(items => {
      const count = items.length;
      const latest = items.reduce((current, candidate) =>
        candidate.timestamp.getTime() > current.timestamp.getTime() ? candidate : current
      );
      const sender = latest.senderName?.trim() || 'Unknown sender';
      let clusteredText: string;

      if (latest.type === 'spark') {
        clusteredText = count > 1 ? `${sender} and ${count - 1} others sparked your post` : `${sender} sparked your post`;
      } else if (latest.type === 'comment') {
        clusteredText = count > 1
          ? `${sender} and ${count - 1} others commented on your discussion`
          : latest.content?.trim()
            ? `${sender} commented: "${latest.content.trim().slice(0, 180)}"`
            : `${sender} commented on your discussion`;
      } else if (latest.type === 'follow') {
        clusteredText = count > 1 ? `${sender} and ${count - 1} others started following you` : `${sender} started following you`;
      } else if (latest.type === 'mention') {
        clusteredText = count > 1 ? `${sender} and ${count - 1} others mentioned you` : `${sender} mentioned you`;
      } else {
        clusteredText = count > 1 ? `${count} community updates are available` : `${sender} shared a community update`;
      }

      return { clusteredText, type: latest.type, count, latestSender: sender };
    });
  }
}
