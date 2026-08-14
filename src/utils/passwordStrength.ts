export interface PasswordStrengthResult {
  score: number; // 0 to 4
  label: string;
  color: string;
  percent: number;
}

export function getPasswordStrength(pwd: string): PasswordStrengthResult {
  if (!pwd) return { score: 0, label: '', color: 'bg-zinc-700', percent: 0 };
  let score = 0;
  if (pwd.length >= 8) score++;
  if (/[A-Z]/.test(pwd)) score++;
  if (/[0-9]/.test(pwd)) score++;
  if (/[^A-Za-z0-9]/.test(pwd)) score++;

  if (score <= 1) return { score, label: 'Weak', color: 'bg-rose-500', percent: 25 };
  if (score === 2) return { score, label: 'Fair', color: 'bg-amber-500', percent: 50 };
  if (score === 3) return { score, label: 'Good', color: 'bg-blue-500', percent: 75 };
  return { score, label: 'Strong', color: 'bg-emerald-500', percent: 100 };
}
