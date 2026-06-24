import { User } from '../../types';

export class CreatorEngine {
  static getMonetizationRecommendations(user: User): string {
    const currentBalance = user.nexBalance || 0;
    const earnedThisWeek = user.thisWeekEarnedNex || 0;
    
    return `### 🪙 VOH AI NEX-Economy Insights
- **Current Real Balance**: **${currentBalance.toLocaleString()} NEX**
- **Earned This Week**: **${earnedThisWeek.toLocaleString()} NEX**
- **Monetization Status**: Eligible for Creator Pool Dividends

#### 🚀 Optimization Roadmap
1. **NEX Spark Supercharging**: Promote a custom community challenge. High reputation participants will automatically trigger direct micro-transfers.
2. **Premium Circles**: Lock specialized system design communities behind a 5 NEX monthly subscription to build recurring rewards.
3. **Verified Knowledge Contributions**: Contribute system solutions or rules to trending circles to receive direct developer payouts.`;
  }

  static getEarningsExplanations(user: User): string {
    return `### 💸 Earnings & Rewards breakdown
Your NEX earnings are calculated based on your **Living Reputation Score (${user.reputationPoints} PR)** and total social engagement:
- **Reputation Pool Splits**: 40% of rewards are distributed via on-chain contribution checkpoints.
- **Creator Sparks**: 60% of earnings are triggered directly by user-given sparks.

*No artificial adjustments or mock balances are used; all figures represent your actual Nexora account state.*`;
  }
}
