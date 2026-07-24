import { db } from './config';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

export interface EmailTemplateParams {
  toEmail: string;
  userName: string;
  actionUrl?: string;
  verificationCode?: string;
  deviceDetails?: {
    browser?: string;
    ip?: string;
    location?: string;
    time?: string;
  };
}

export type EmailTemplateType = 
  | 'WELCOME'
  | 'VERIFY_EMAIL'
  | 'PASSWORD_RESET'
  | 'SECURITY_ALERT_LOGIN'
  | 'SECURITY_ALERT_PASSWORD'
  | 'SECURITY_ALERT_EMAIL'
  | 'SECURITY_ALERT_PHONE'
  | 'SECURITY_ALERT_SUSPICIOUS'
  | 'SECURITY_ALERT_2FA'
  | 'ACCOUNT_RECOVERY'
  | 'ACCOUNT_DELETED';

export class EmailService {
  /**
   * Generates production-quality responsive HTML email matching Nexora's brand visual identity
   */
  static generateEmailHTML(type: EmailTemplateType, params: EmailTemplateParams): { subject: string; html: string; text: string } {
    const brandColor = '#8B5CF6'; // Violet
    const darkBg = '#0B071B';
    const cardBg = '#140E2D';
    const year = new Date().getFullYear();

    let title = 'Nexora Notification';
    let subject = 'Nexora Security Update';
    let bodyContent = '';
    let buttonText = '';
    let buttonUrl = params.actionUrl || 'https://nexora.app';

    switch (type) {
      case 'WELCOME':
        subject = 'Welcome to Nexora - Confirm Your Global Living Feed';
        title = 'Welcome to Nexora';
        buttonText = 'Explore Nexora Feed';
        bodyContent = `
          <p style="margin-bottom: 16px; font-size: 15px; line-height: 1.6; color: #E4E4E7;">
            Hi <strong>${params.userName}</strong>, welcome to Nexora! We're excited to have you join our global creator and social intelligence platform.
          </p>
          <p style="margin-bottom: 20px; font-size: 14px; line-height: 1.6; color: #A1A1AA;">
            Discover what's happening around the world, share high-fidelity moments, connect with vibrant circles, and earn Sparks by sharing engaging content.
          </p>
        `;
        break;

      case 'VERIFY_EMAIL':
        subject = 'Verify Your Nexora Email Address';
        title = 'Email Verification Required';
        buttonText = 'Verify Email Address';
        bodyContent = `
          <p style="margin-bottom: 16px; font-size: 15px; line-height: 1.6; color: #E4E4E7;">
            Hi <strong>${params.userName}</strong>, please confirm your email address to unlock full Nexora publishing and interactive capabilities.
          </p>
          ${params.verificationCode ? `
            <div style="background-color: #1E1242; border: 1px solid #6D28D9; padding: 18px; border-radius: 12px; text-align: center; margin: 20px 0;">
              <span style="font-size: 11px; font-family: monospace; letter-spacing: 2px; color: #C4B5FD; text-transform: uppercase;">Verification Code</span>
              <div style="font-size: 28px; font-weight: 800; font-family: monospace; letter-spacing: 6px; color: #FFFFFF; margin-top: 6px;">
                ${params.verificationCode}
              </div>
            </div>
          ` : ''}
          <p style="margin-bottom: 20px; font-size: 13px; color: #A1A1AA;">
            If you did not create a Nexora account, you can safely ignore this message.
          </p>
        `;
        break;

      case 'PASSWORD_RESET':
        subject = 'Reset Your Nexora Account Password';
        title = 'Password Reset Request';
        buttonText = 'Reset Password Now';
        bodyContent = `
          <p style="margin-bottom: 16px; font-size: 15px; line-height: 1.6; color: #E4E4E7;">
            Hi <strong>${params.userName}</strong>, we received a request to reset the password for your Nexora account.
          </p>
          ${params.verificationCode ? `
            <div style="background-color: #1E1242; border: 1px solid #6D28D9; padding: 18px; border-radius: 12px; text-align: center; margin: 20px 0;">
              <span style="font-size: 11px; font-family: monospace; letter-spacing: 2px; color: #C4B5FD; text-transform: uppercase;">One-Time Security Code</span>
              <div style="font-size: 28px; font-weight: 800; font-family: monospace; letter-spacing: 6px; color: #FFFFFF; margin-top: 6px;">
                ${params.verificationCode}
              </div>
            </div>
          ` : ''}
          <p style="margin-bottom: 20px; font-size: 13px; color: #A1A1AA;">
            This link and code will expire in 15 minutes. If you did not request a password reset, please secure your account immediately.
          </p>
        `;
        break;

      case 'SECURITY_ALERT_LOGIN':
        subject = 'Security Alert: New Login Detected on Nexora';
        title = 'New Device Authorization';
        buttonText = 'Review Active Sessions';
        bodyContent = `
          <p style="margin-bottom: 16px; font-size: 15px; line-height: 1.6; color: #E4E4E7;">
            Hi <strong>${params.userName}</strong>, a new login was authorized for your Nexora account.
          </p>
          <div style="background-color: #1A1230; border-left: 4px solid #8B5CF6; padding: 14px 18px; margin: 20px 0; border-radius: 0 8px 8px 0;">
            <p style="margin: 0; font-size: 13px; color: #E4E4E7; font-family: sans-serif;">
              <strong>Browser / Device:</strong> ${params.deviceDetails?.browser || 'Web Client'}<br/>
              <strong>Location / IP:</strong> ${params.deviceDetails?.location || 'Authorized IP'} (${params.deviceDetails?.ip || 'Verified'})<br/>
              <strong>Timestamp:</strong> ${params.deviceDetails?.time || new Date().toUTCString()}
            </p>
          </div>
          <p style="margin-bottom: 20px; font-size: 13px; color: #A1A1AA;">
            If this was you, no action is required. If you don't recognize this activity, please change your password immediately.
          </p>
        `;
        break;

      case 'SECURITY_ALERT_PASSWORD':
        subject = 'Security Update: Your Password Was Changed';
        title = 'Password Successfully Updated';
        buttonText = 'Secure My Account';
        bodyContent = `
          <p style="margin-bottom: 16px; font-size: 15px; line-height: 1.6; color: #E4E4E7;">
            Hi <strong>${params.userName}</strong>, the password for your Nexora account was recently changed.
          </p>
          <p style="margin-bottom: 20px; font-size: 13px; color: #A1A1AA;">
            If you authorized this change, you can safely disregard this email. If you did NOT make this change, please contact Nexora Security immediately.
          </p>
        `;
        break;

      case 'SECURITY_ALERT_SUSPICIOUS':
        subject = 'Urgent Security Alert: Suspicious Login Attempts';
        title = 'Suspicious Activity Detected';
        buttonText = 'Lock & Change Password';
        bodyContent = `
          <p style="margin-bottom: 16px; font-size: 15px; line-height: 1.6; color: #FCA5A5;">
            Hi <strong>${params.userName}</strong>, our security defense system detected multiple failed login attempts targeting your handle.
          </p>
          <p style="margin-bottom: 20px; font-size: 13px; color: #A1A1AA;">
            We have temporarily rate-limited further attempts on your account to prevent unauthorized access.
          </p>
        `;
        break;

      default:
        subject = 'Nexora Account Security Notification';
        title = 'Security Notification';
        buttonText = 'Go to Nexora';
        bodyContent = `<p style="margin-bottom: 16px; font-size: 15px; color: #E4E4E7;">Hi <strong>${params.userName}</strong>, your account settings were updated.</p>`;
    }

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${subject}</title>
      </head>
      <body style="margin: 0; padding: 0; background-color: ${darkBg}; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #FFFFFF;">
        <table border="0" cellpadding="0" cellspacing="0" width="100%" style="table-layout: fixed; background-color: ${darkBg};">
          <tr>
            <td align="center" style="padding: 40px 15px;">
              <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 560px; background-color: ${cardBg}; border: 1px solid rgba(139, 92, 246, 0.25); border-radius: 24px; overflow: hidden; box-shadow: 0 20px 50px rgba(0,0,0,0.6);">
                
                <!-- Header -->
                <tr>
                  <td style="padding: 32px 32px 24px 32px; background: linear-gradient(135deg, #110928 0%, #1D1140 100%); border-bottom: 1px solid rgba(255,255,255,0.08); text-align: center;">
                    <div style="display: inline-block; padding: 10px 18px; background: rgba(139, 92, 246, 0.15); border: 1px solid rgba(139, 92, 246, 0.4); border-radius: 100px; margin-bottom: 16px;">
                      <span style="font-size: 18px; font-weight: 900; letter-spacing: 2px; color: #FFFFFF;">NEXORA</span>
                      <span style="font-size: 10px; font-family: monospace; background: #8B5CF6; color: #FFFFFF; padding: 2px 6px; border-radius: 4px; margin-left: 6px; font-weight: bold;">VOH AI</span>
                    </div>
                    <h1 style="margin: 0; font-size: 22px; font-weight: 800; color: #FFFFFF; letter-spacing: -0.5px;">${title}</h1>
                  </td>
                </tr>

                <!-- Content Body -->
                <tr>
                  <td style="padding: 32px;">
                    ${bodyContent}

                    <!-- Button CTA -->
                    ${buttonText ? `
                      <div style="text-align: center; margin: 32px 0 16px 0;">
                        <a href="${buttonUrl}" target="_blank" style="display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #8B5CF6 0%, #D946EF 100%); color: #FFFFFF; font-weight: 800; font-size: 14px; text-decoration: none; border-radius: 14px; box-shadow: 0 4px 20px rgba(139, 92, 246, 0.4); text-transform: uppercase; letter-spacing: 1px;">
                          ${buttonText}
                        </a>
                      </div>
                    ` : ''}
                  </td>
                </tr>

                <!-- Footer -->
                <tr>
                  <td style="padding: 24px 32px; background-color: #0A0618; border-top: 1px solid rgba(255,255,255,0.05); text-align: center;">
                    <p style="margin: 0 0 8px 0; font-size: 11px; color: #71717A; font-family: monospace;">
                      OFFICIAL TRANSACTIONAL COMMUNICATIONS • NEXORA NETWORK
                    </p>
                    <p style="margin: 0; font-size: 11px; color: #52525B;">
                      © ${year} Nexora Inc. All rights reserved. Encrypted via VOH Security Protocol.
                    </p>
                  </td>
                </tr>

              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;

    const text = `${title}\n\nHi ${params.userName},\n\n${subject}\n\nAction URL: ${buttonUrl}\n\n© ${year} Nexora Inc.`;

    return { subject, html, text };
  }

  /**
   * Logs transaction to Firestore `mail/` collection (for SendGrid / Firestore Mail extension processing)
   */
  static async sendTransactionalEmail(type: EmailTemplateType, params: EmailTemplateParams): Promise<boolean> {
    try {
      const emailContent = this.generateEmailHTML(type, params);

      // Attempt storing in Firestore 'mail' or 'systemEmails' collection
      if (db) {
        await addDoc(collection(db, 'mail'), {
          to: [params.toEmail],
          message: {
            subject: emailContent.subject,
            text: emailContent.text,
            html: emailContent.html
          },
          templateType: type,
          createdAt: serverTimestamp(),
          status: 'pending'
        });
      }

      console.log(`✉️ Transactional Email logged for ${params.toEmail} [${type}]:`, emailContent.subject);
      return true;
    } catch (err) {
      console.warn('Failed to queue transactional email via Firestore:', err);
      return false;
    }
  }
}
