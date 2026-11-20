import { randomUUID } from 'node:crypto';
import { FieldValue, type Firestore } from 'firebase-admin/firestore';

export type AccountSecurityEventType =
  | 'NEW_LOGIN'
  | 'PASSWORD_CHANGED'
  | 'EMAIL_CHANGED'
  | 'EMAIL_LINKED'
  | 'PHONE_CHANGED'
  | 'PHONE_LINKED'
  | 'SUSPICIOUS_SIGNIN'
  | 'TWO_FACTOR_TOGGLED'
  | 'VERIFICATION_APPROVED'
  | 'SESSIONS_REVOKED';

export interface AccountSecurityEventDetails {
  browser?: string;
  device?: string;
  location?: string;
  newValue?: string;
  timestamp?: string;
}

function safeDetails(value: unknown): AccountSecurityEventDetails {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  const source = value as Record<string, unknown>;
  const result: AccountSecurityEventDetails = {};
  for (const key of ['browser', 'device', 'location', 'newValue', 'timestamp'] as const) {
    const item = source[key];
    if (typeof item === 'string' && item.trim()) result[key] = item.trim().slice(0, key === 'browser' ? 240 : 160);
  }
  return result;
}

function maskEmail(value: string): string {
  const [name, domain] = value.split('@');
  if (!name || !domain) return 'your updated email address';
  return `${name.slice(0, 1)}•••@${domain}`;
}

function describeEvent(eventType: AccountSecurityEventType, details: AccountSecurityEventDetails) {
  switch (eventType) {
    case 'NEW_LOGIN':
      return { title: 'New sign-in', body: `Your NEXORA account was signed in on ${details.browser || details.device || 'a new device'}.` };
    case 'PASSWORD_CHANGED':
      return { title: 'Password changed', body: 'Your NEXORA account password was successfully updated.' };
    case 'EMAIL_CHANGED':
      return { title: 'Account email changed', body: `Your account email was changed to ${maskEmail(details.newValue || '')}.` };
    case 'EMAIL_LINKED':
      return { title: 'Email sign-in connected', body: 'An email sign-in method was connected to your NEXORA account.' };
    case 'PHONE_CHANGED':
      return { title: 'Phone number updated', body: 'Your account phone number was updated.' };
    case 'PHONE_LINKED':
      return { title: 'Phone number verified', body: 'A phone number was verified and connected to your NEXORA account.' };
    case 'SUSPICIOUS_SIGNIN':
      return { title: 'Unusual sign-in activity', body: 'NEXORA detected repeated unsuccessful sign-in attempts and applied account protection.' };
    case 'TWO_FACTOR_TOGGLED':
      return { title: 'Two-step verification updated', body: `Two-step verification was ${details.newValue === 'enabled' ? 'enabled' : 'disabled'} on your account.` };
    case 'VERIFICATION_APPROVED':
      return { title: 'Account verification complete', body: 'Your NEXORA account is now verified.' };
    case 'SESSIONS_REVOKED':
      return { title: 'Other sessions signed out', body: 'Your active account sessions were revoked. Sign in again on devices you still use.' };
  }
}

/** Store an authenticated account event and its inbox notification atomically. */
export async function recordAccountSecurityNotification(
  db: Firestore,
  userId: string,
  eventType: unknown,
  rawDetails: unknown = {},
) {
  const allowed: AccountSecurityEventType[] = [
    'NEW_LOGIN', 'PASSWORD_CHANGED', 'EMAIL_CHANGED', 'EMAIL_LINKED',
    'PHONE_CHANGED', 'PHONE_LINKED', 'SUSPICIOUS_SIGNIN',
    'TWO_FACTOR_TOGGLED', 'VERIFICATION_APPROVED', 'SESSIONS_REVOKED',
  ];
  if (!userId || userId.length > 150 || userId.includes('/') || !allowed.includes(eventType as AccountSecurityEventType)) {
    throw new Error('A valid account security event is required.');
  }

  const details = safeDetails(rawDetails);
  const event = describeEvent(eventType as AccountSecurityEventType, details);
  const notificationId = `security_${randomUUID()}`;
  const timestamp = new Date().toISOString();
  const userRef = db.collection('users').doc(userId);
  const notificationRef = userRef.collection('notifications').doc(notificationId);
  const securityLogRef = userRef.collection('securityLogs').doc(notificationId);

  await db.runTransaction(async transaction => {
    transaction.create(securityLogRef, {
      eventType,
      title: event.title,
      body: event.body,
      details,
      timestamp: FieldValue.serverTimestamp(),
      notificationId,
    });
    transaction.create(notificationRef, {
      id: notificationId,
      type: 'security',
      userId: 'system',
      username: 'NEXORA',
      avatar: '',
      title: event.title,
      content: event.body,
      eventType,
      category: 'account',
      targetId: 'account-security',
      timestamp,
      isRead: false,
      priority: 8,
      iconType: 'shield',
    });
  });

  return { notificationId, title: event.title, body: event.body, timestamp };
}
