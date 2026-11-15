import { FieldValue, type Firestore } from 'firebase-admin/firestore';
import { originCaseNotificationRecipients } from './originCaseOperationsPolicy.js';

/** Persist deterministic per-recipient inbox records for one actual case-state transition. */
export async function writeOriginAttributionCaseNotifications(
  db: Firestore,
  caseId: string,
  previousStatus: unknown,
  record: Record<string, unknown>,
  eventTime: string,
): Promise<number> {
  if (!caseId || previousStatus === record.status) return 0;
  const recipients = originCaseNotificationRecipients(record);
  if (!recipients.length) return 0;
  const notifications = recipients.map(recipient => {
    const notificationId = `origin_${caseId}_${String(record.status)}_${recipient.kind}_${recipient.uid}`;
    const ref = db.collection('users').doc(recipient.uid).collection('notifications').doc(notificationId);
    const content = recipient.kind === 'request'
      ? 'A creator requested an attribution correction on media you contributed.'
      : recipient.kind === 'response'
        ? 'A creator responded to your attribution correction request.'
        : recipient.kind === 'dispute'
          ? 'An attribution correction decision has been disputed and needs review.'
          : 'A moderator has completed the review of an attribution dispute.';
    return {
      ref,
      data: {
        id: notificationId,
        type: 'origin_attribution',
        userId: 'system',
        username: 'NEXORA Origin',
        avatar: '/logo.svg',
        content,
        targetId: caseId,
        isRead: false,
        timestamp: eventTime,
        createdAt: FieldValue.serverTimestamp(),
      },
    };
  });
  // A retried Firestore event must not reset isRead on an already-delivered
  // notification. Deterministic IDs plus transactional create make delivery
  // idempotent while preserving a recipient's read state.
  return db.runTransaction(async transaction => {
    const existing = await Promise.all(notifications.map(item => transaction.get(item.ref)));
    let created = 0;
    notifications.forEach((item, index) => {
      if (!existing[index].exists) {
        transaction.create(item.ref, item.data);
        created += 1;
      }
    });
    return created;
  });
}
