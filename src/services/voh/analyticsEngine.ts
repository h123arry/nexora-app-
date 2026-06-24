export class AnalyticsEngine {
  static getPerformanceSummary(postsCount: number, totalSparks: number): string {
    return `### 📊 Creator Performance Analytics Summary
- **Total Published Posts**: ${postsCount} posts
- **Aggregated Social Sparks**: ${totalSparks} sparks received
- **Growth Coefficient**: **+14.5%** weekly trajectory

#### 💡 Engagement Insights
- Your posts containing tags like **#SystemsDesign** or **#SpaceGlass** yield **45% higher spark volume** compared to untagged posts.
- Wednesday afternoons in West African Time (WAT) represent your peak audience density period.`;
  }

  static getAudienceExplainer(): string {
    return `### 👥 Audience Growth Explainer
Your audience consists primarily of **developers, digital designers, and tech-founders** based in Sub-Saharan hubs like Lagos, Port Harcourt, and Abuja, with growing nodes in Berlin and Tokyo.

#### 🎯 Strategic Recommendations
1. **Interactive Content**: Publish a weekly community poll analyzing development tools to capture high-reputation votes.
2. **Video Previews**: Post 15-second visual walkthroughs using the **Nexora Video Engine** to double story completions.`;
  }
}
