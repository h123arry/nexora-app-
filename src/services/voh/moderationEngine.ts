export interface ModerationResult {
  isFlagged: boolean;
  score: number; // 0 to 1
  reasons: string[];
  recommendation: string;
}

export class ModerationEngine {
  static analyzeContent(text: string): ModerationResult {
    const textLower = text.toLowerCase();
    const flags: string[] = [];
    let score = 0;

    // Direct scam/spam matches
    if (textLower.includes('earn $') || textLower.includes('get rich quick') || textLower.includes('guaranteed 100% payout') || textLower.includes('crypto double')) {
      flags.push('Potential financial spam/scam pattern');
      score += 0.8;
    }
    
    // Duplicate characters or single word repetitions
    const words = textLower.split(/\s+/);
    if (words.length > 5 && new Set(words).size < words.length * 0.4) {
      flags.push('Repetitive, low-density content structure');
      score += 0.5;
    }

    if (textLower.match(/(buy now|click here|limited offer|win free)/gi)) {
      flags.push('Aggressive promotional marketing jargon');
      score += 0.4;
    }

    return {
      isFlagged: score >= 0.5,
      score: Math.min(1.0, score),
      reasons: flags,
      recommendation: score >= 0.7 
        ? '⚠️ Auto-flag and route to admin moderation queue immediately.' 
        : score >= 0.4 
          ? 'ℹ️ Soft flag: Display subtle advice to creator to add authentic details.' 
          : '✅ Content is safe, authentic and clean.'
    };
  }

  static suggestReportReview(reporterNotes: string, reportedContent: string): string {
    const analysis = this.analyzeContent(reportedContent);
    return `### 🛡️ Admin Moderation Assistant Report
- **Reported Content**: "${reportedContent.slice(0, 100)}..."
- **Reporter Reason**: "${reporterNotes}"
- **AI Spam Score**: **${(analysis.score * 100).toFixed(0)}%**
- **Triggered Flags**: ${analysis.reasons.join(', ') || 'None'}

#### 📝 AI recommendation
- ${analysis.recommendation}
- Suggestion: Check if the user is a registered creator with high reputation (>1,000 PR). If so, request content revision rather than banning.`;
  }
}
