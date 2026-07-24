import { db } from './config';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { EmailService, EmailTemplateType } from './emailService';
import { PushNotificationService } from './pushNotificationService';

export type SecurityEventType = 
  | 'NEW_LOGIN'
  | 'PASSWORD_CHANGED'
  | 'EMAIL_CHANGED'
  | 'PHONE_CHANGED'
  | 'SUSPICIOUS_SIGNIN'
  | 'TWO_FACTOR_TOGGLED'
  | 'VERIFICATION_APPROVED';

export interface SecurityEventDetails {
  ip?: string;
  browser?: string;
  location?: string;
  timestamp?: string;
  newValue?: string;
  device?: string;
}

export class SecurityNotificationService {
  /**
   * Logs a security event to Firestore, sends an email alert, and triggers a push notification.
   */
  static async notifySecurityEvent(
    userId: string,
    userEmail: string,
    userName: string,
    eventType: SecurityEventType,
    details: SecurityEventDetails = {}
  ): Promise<void> {
    const formattedTime = details.timestamp || new Date().toLocaleString();
    let title = 'Nexora Security Alert';
    let body = 'A security event was logged for your account.';
    let emailTemplate: EmailTemplateType = 'SECURITY_ALERT_LOGIN';

    switch (eventType) {
      case 'NEW_LOGIN':
        title = 'Security Alert: New Sign-in';
        body = `New login on ${details.browser || 'Web Client'} (${details.location || 'Authorized IP'}).`;
        emailTemplate = 'SECURITY_ALERT_LOGIN';
        break;

      case 'PASSWORD_CHANGED':
        title = 'Password Successfully Changed';
        body = 'Your Nexora account password was updated.';
        emailTemplate = 'SECURITY_ALERT_PASSWORD';
        break;

      case 'EMAIL_CHANGED':
        title = 'Account Email Updated';
        body = `Your primary email address was changed to ${details.newValue || 'new address'}.`;
        emailTemplate = 'SECURITY_ALERT_EMAIL';
        break;

      case 'PHONE_CHANGED':
        title = 'Phone Number Updated';
        body = `Your verified phone number was changed to ${details.newValue || 'new number'}.`;
        emailTemplate = 'SECURITY_ALERT_PHONE';
        break;

      case 'SUSPICIOUS_SIGNIN':
        title = 'Urgent: Suspicious Attempts Blocked';
        body = 'Multiple failed password attempts detected. Account rate-limited.';
        emailTemplate = 'SECURITY_ALERT_SUSPICIOUS';
        break;

      case 'TWO_FACTOR_TOGGLED':
        title = 'Two-Factor Auth Updated';
        body = `2FA was ${details.newValue === 'enabled' ? 'enabled' : 'disabled'} on your account.`;
        emailTemplate = 'SECURITY_ALERT_2FA';
        break;

      case 'VERIFICATION_APPROVED':
        title = 'Email Verification Complete';
        body = 'Your Nexora account is now fully verified. Welcome!';
        emailTemplate = 'VERIFY_EMAIL';
        break;
    }

    // 1. Store in Firestore under user's security log collection
    try {
      if (db && userId) {
        await addDoc(collection(db, 'users', userId, 'securityLogs'), {
          eventType,
          title,
          body,
          details,
          timestamp: serverTimestamp(),
          ip: details.ip || 'Recorded',
          browser: details.browser || 'Browser'
        });

        // Store as in-app notification
        await addDoc(collection(db, 'users', userId, 'notifications'), {
          type: 'security',
          title,
          content: body,
          timestamp: new Date().toISOString(),
          isRead: false,
          priority: 'high',
          iconType: 'shield'
        });
      }
    } catch (err) {
      console.warn('Firestore security log error:', err);
    }

    // 2. Trigger native OS Push Notification
    PushNotificationService.displayNativeNotification({
      title,
      body,
      data: {
        type: 'security',
        url: 'https://nexora.app/security'
      }
    });

    // 3. Trigger Transactional Email
    if (userEmail) {
      await EmailService.sendTransactionalEmail(emailTemplate, {
        toEmail: userEmail,
        userName,
        deviceDetails: {
          browser: details.browser || 'Web Client',
          ip: details.ip || 'Recorded IP',
          location: details.location || 'Verified Location',
          time: formattedTime
        }
      });
    }
  }
}
