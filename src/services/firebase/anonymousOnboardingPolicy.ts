export interface AnonymousAccountReminderInput {
  joinedAt: number;
  lastDismissedDate?: string;
  hasVerifiedEmail: boolean;
  hasPhone: boolean;
  now?: Date;
}

export function getAnonymousMemberUsername(uid: string): string {
  return `member_${uid.slice(0, 10).toLowerCase()}`;
}

export function shouldShowAnonymousAccountReminder(input: AnonymousAccountReminderInput): {
  show: boolean;
  today: string;
  daysSinceJoin: number;
} {
  const now = input.now || new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const joinedAt = Number.isFinite(input.joinedAt) ? input.joinedAt : now.getTime();
  const daysSinceJoin = Math.max(0, Math.floor((now.getTime() - joinedAt) / 86400000));
  return {
    today,
    daysSinceJoin,
    show: (!input.hasVerifiedEmail || !input.hasPhone)
      && daysSinceJoin >= 1
      && now.getDay() === 3
      && input.lastDismissedDate !== today,
  };
}
