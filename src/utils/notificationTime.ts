export type NotificationTimeSection = 'today' | 'yesterday' | 'this_week' | 'earlier' | 'older';

/** Categorize a notification by its actual timestamp using the user's local calendar. */
export function getNotificationTimeSection(timestamp: string, now: Date = new Date()): NotificationTimeSection {
  const date = new Date(timestamp);
  if (!Number.isFinite(date.getTime()) || !Number.isFinite(now.getTime())) return 'older';

  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const notificationDay = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  const daysAgo = Math.floor((today - notificationDay) / 86_400_000);

  if (daysAgo <= 0) return 'today';
  if (daysAgo === 1) return 'yesterday';
  if (daysAgo < 7) return 'this_week';
  if (daysAgo < 30) return 'earlier';
  return 'older';
}
