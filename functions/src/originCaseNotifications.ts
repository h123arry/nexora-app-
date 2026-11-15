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
  const batch = db.batch();
  for (const recipient of recipients) {
    const notificationId = `origin_${caseId}_${String(record.status)}_${recipient.kind}_${recipient.uid}`;
    const ref = db.collection('users').doc(recipient.uid).collection('notifications').doc(notificationId);
    const content = recipient.kind === 'request'
      ? 'A creator requested an attribution correction on media you contributed.'
      : recipient.kind === 'response'
        ? 'A creator responded to your attribution correction request.'
        : recipient.kind === 'dispute'
          ? 'An attribution correction decision has been disputed and needs review.'
          : 'A moderator has completed the review of an attribution dispute.';
    batch.set(ref, {
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
    }, { merge: false });
  }
  await batch.commit();
  return recipients.length;
}
