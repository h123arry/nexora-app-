export class AnalyticsEngine {
  /**
   * Summarizes only the counts supplied by the caller. This method deliberately
   * does not invent growth rates, audience demographics, peak hours, or causal
   * explanations when verified event-level analytics are unavailable.
   */
  static getPerformanceSummary(postsCount: number, totalSparks: number): string {
    const safePosts = Number.isFinite(postsCount) ? Math.max(0, postsCount) : 0;
    const safeSparks = Number.isFinite(totalSparks) ? Math.max(0, totalSparks) : 0;
    return [
      "### Creator performance",
      `- **Published posts:** ${safePosts.toLocaleString()}`,
      `- **Sparks received:** ${safeSparks.toLocaleString()}`,
      "",
      "Verified growth rates, reach, retention, audience composition, and best posting times are not available from these totals alone. Connect verified creator analytics to receive evidence-based insights."
    ].join("\n");
  }

  /** Audience insights require verified audience analytics. */
  static getAudienceExplainer(): string {
    return [
      "### Audience insights",
      "A verified audience breakdown is not available yet.",
      "",
      "Useful next steps:",
      "1. Review reach, profile visits, follows, and returning viewers over a consistent period.",
      "2. Compare engagement by content format using recorded post analytics.",
      "3. Test publishing times and evaluate the results instead of assuming a peak hour."
    ].join("\n");
  }
}
