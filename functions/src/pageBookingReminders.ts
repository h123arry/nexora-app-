import { FieldValue, getFirestore, type Firestore } from 'firebase-admin/firestore';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { getFirebaseAdminApp, resolveFirestoreDatabaseId } from './runtimeConfig.js';

function asDate(value: unknown): Date | null {
  if (value instanceof Date) return Number.isFinite(value.getTime()) ? value : null;
  if (value && typeof value === 'object' && 'toDate' in value && typeof (value as { toDate?: unknown }).toDate === 'function') {
    try {
      const date = (value as { toDate: () => Date }).toDate();
      return date instanceof Date && Number.isFinite(date.getTime()) ? date : null;
    } catch { return null; }
  }
  return null;
}

export async function dispatchDuePageBookingReminders(
  db: Firestore,
  now = new Date(),
  batchSize = 100,
): Promise<{ sentCount: number; skippedCount: number }> {
  if (!Number.isFinite(now.getTime()) || !Number.isInteger(batchSize) || batchSize < 1 || batchSize > 250) {
    throw new Error('A valid reminder dispatch time and batch size are required.');
  }
  const due = await db.collection('pageBookings')
    .where('status', '==', 'accepted')
    .where('reminderDueAt', '<=', now)
    .orderBy('reminderDueAt', 'asc')
    .limit(batchSize)
    .get();
  let sentCount = 0;
  let skippedCount = 0;
  for (const item of due.docs) {
    const result = await db.runTransaction(async tx => {
      const booking = await tx.get(item.ref);
      if (!booking.exists || booking.get('status') !== 'accepted'
        || booking.get('reminderSentAt') || !asDate(booking.get('reminderDueAt'))
        || (asDate(booking.get('reminderDueAt')) as Date).getTime() > now.getTime()) return 'ignored' as const;

      const startsAt = asDate(booking.get('requestedAt'));
      const ownerId = String(booking.get('ownerId') || '');
      const customerId = String(booking.get('customerId') || '');
      if (!startsAt || startsAt.getTime() <= now.getTime() || !ownerId || !customerId || ownerId === customerId) {
        tx.update(item.ref, {
          reminderSkippedAt: now,
          reminderSkippedReason: 'appointment_not_remindable',
          reminderDueAt: FieldValue.delete(),
          updatedAt: now,
        });
        return 'skipped' as const;
      }

      const ownerNotificationId = 'booking_reminder_' + item.id;
      const customerNotificationId = 'booking_reminder_' + item.id;
      const ownerNotificationRef = db.collection('users').doc(ownerId).collection('notifications').doc(ownerNotificationId);
      const customerNotificationRef = db.collection('users').doc(customerId).collection('notifications').doc(customerNotificationId);
      const [ownerNotification, customerNotification] = await Promise.all([
        tx.get(ownerNotificationRef), tx.get(customerNotificationRef),
      ]);
      const pageName = String(booking.get('pageName') || 'Business Page');
      const serviceName = String(booking.get('serviceName') || 'your service');
      if (!ownerNotification.exists) {
        tx.create(ownerNotificationRef, {
          id: ownerNotificationId, userId: ownerId, type: 'community', category: 'communities',
          targetId: item.id, content: 'You have a confirmed appointment for ' + serviceName + ' within the next 24 hours.',
          actorName: pageName, username: String(booking.get('pageUsername') || ''),
          avatar: String(booking.get('pageAvatar') || ''), timestamp: now.toISOString(), isRead: false, priority: 4,
        });
      }
      if (!customerNotification.exists) {
        tx.create(customerNotificationRef, {
          id: customerNotificationId, userId: customerId, type: 'community', category: 'communities',
          targetId: item.id, content: 'Your appointment for ' + serviceName + ' with ' + pageName + ' is within the next 24 hours.',
          actorName: pageName, username: String(booking.get('pageUsername') || ''),
          avatar: String(booking.get('pageAvatar') || ''), timestamp: now.toISOString(), isRead: false, priority: 4,
        });
      }
      tx.update(item.ref, { reminderSentAt: now, reminderDueAt: FieldValue.delete(), updatedAt: now });
      return 'sent' as const;
    });
    if (result === 'sent') sentCount += 1;
    if (result === 'skipped') skippedCount += 1;
  }
  return { sentCount, skippedCount };
}

const db = getFirestore(getFirebaseAdminApp(), resolveFirestoreDatabaseId());

export const sendPageBookingReminders = onSchedule({
  schedule: 'every 15 minutes',
  timeZone: 'UTC',
  region: 'europe-west1',
  maxInstances: 1,
}, async () => {
  await dispatchDuePageBookingReminders(db);
});
