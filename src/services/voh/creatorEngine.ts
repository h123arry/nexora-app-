import { User } from '../../types';

function safeNex(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0
    ? Math.floor(value)
    : 0;
}

export class CreatorEngine {
  static getMonetizationRecommendations(user: User): string {
    const currentBalance = safeNex(user.nexBalance);
    const earnedThisWeek = safeNex(user.thisWeekEarnedNex);

    return `### NEX Creator Account Snapshot
- **Recorded balance:** ${currentBalance.toLocaleString()} NEX
- **Recorded this-week earnings:** ${earnedThisWeek.toLocaleString()} NEX

### Monetization guidance
NEXORA's creator monetization and payout availability must be checked against the live account ledger and configured payment provider. This account snapshot does not prove eligibility for a creator pool, automatic transfers, subscriptions, or cash withdrawals.

1. Review your recorded earnings and transaction history before making payout decisions.
2. Build a consistent publishing schedule and use verified post engagement counters to compare content.
3. Treat any reward, subscription, or payout as confirmed only after NEXORA records the corresponding trusted transaction.`;
  }

  static getEarningsExplanations(user: User): string {
    const currentBalance = safeNex(user.nexBalance);
    const earnedThisWeek = safeNex(user.thisWeekEarnedNex);
    return `### NEX Earnings Summary
- **Current recorded balance:** ${currentBalance.toLocaleString()} NEX
- **Recorded this-week earnings:** ${earnedThisWeek.toLocaleString()} NEX

Your account ledger is the source of truth for NEX transactions. NEXORA does not confirm a fixed 40/60 revenue split, on-chain contribution checkpoints, or automatic creator micro-transfers here. If a payout or reward is not present in your transaction history, treat it as unconfirmed.`;
  }
}
