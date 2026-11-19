interface NotificationPopBannerProps {
  onNavigateToPost?: (postId: string, focusComment?: boolean) => void;
  onNavigateToProfile?: (userId: string) => void;
  onNavigateToInbox?: (chatId?: string) => void;
  onFollowBack?: (userId: string) => void;
}

/**
 * NEXORA keeps social activity in the Activity inbox and delivers opted-in
 * device notifications through PushNotificationService. It deliberately does
 * not render transient in-app banners or play notification sounds.
 */
export default function NotificationPopBanner(_props: NotificationPopBannerProps) {
  return null;
}
