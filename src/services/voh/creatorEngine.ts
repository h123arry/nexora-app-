import { User } from '../../types';

export class CreatorEngine {
  static getMonetizationRecommendations(user: User): string {
    const currentBalance = Number.isFinite(user.nexBalance) ? Math.max(0, user.nexBalance || 0) : null;
    const earnedThisWeek = Number.isFinite(user.thisWeekEarnedNex) ? Math.max(0, user.thisWeekEarnedNex || 0) : null;

    return [
      "### NEX creator account",
      currentBalance === null
        ? "- **NEX balance:** Not available in the loaded account data."
        : `- **NEX balance in the loaded account profile:** ${currentBalance.toLocaleString()} NEX`,
      earnedThisWeek === null
        ? "- **Earned this week:** Not available in the loaded account data."
        : `- **Earned this week in the loaded account profile:** ${earnedThisWeek.toLocaleString()} NEX`,
      "",
      "Creator monetization eligibility and payout readiness must be checked against the authoritative creator-economy services. They cannot be inferred from a profile balance.",
      "",
      "### Practical next steps",
      "- Review your published content and verified engagement analytics.",
      "- Check your active creator membership tiers and gift settings.",
      "- Review payout eligibility and compliance status in the creator finance area."
    ].join("\n");
  }

  static getEarningsExplanations(user: User): string {
    const reputation = Number.isFinite(user.reputationPoints)
      ? Math.max(0, user.reputationPoints || 0).toLocaleString()
      : null;

    return [
      "### Creator earnings",
      reputation === null
        ? "Your current reputation score is not available in the loaded account data."
        : `Your loaded account profile reports **${reputation} reputation points**.`,
      "",
      "VOH AI will not invent revenue-sharing percentages, payout formulas, pending earnings, or settlement status. For an accurate breakdown, use the authoritative creator earnings and payout records."
    ].join("\n");
  }
}
