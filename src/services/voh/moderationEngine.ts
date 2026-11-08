export interface ModerationResult {
  isFlagged: boolean;
  score: number; // Heuristic signal strength from 0 to 1; not a probability.
  reasons: string[];
  recommendation: string;
}

/**
 * Lightweight client-side text heuristics for creator guidance only.
 * This is not an AI classifier, enforcement action, or replacement for
 * the server-side moderation and human review pipeline.
 */
export class ModerationEngine {
  static analyzeContent(text: string): ModerationResult {
    const textLower = text.toLowerCase();
    const flags: string[] = [];
    let score = 0;

    if (
      textLower.includes('earn $') ||
      textLower.includes('get rich quick') ||
      textLower.includes('guaranteed 100% payout') ||
      textLower.includes('crypto double')
    ) {
      flags.push('Potential financial spam/scam phrase');
      score += 0.8;
    }

    const words = textLower.split(/\s+/).filter(Boolean);
    if (words.length > 5 && new Set(words).size < words.length * 0.4) {
      flags.push('Highly repetitive wording');
      score += 0.5;
    }

    if (/(buy now|click here|limited offer|win free)/gi.test(textLower)) {
      flags.push('Aggressive promotional wording');
      score += 0.4;
    }

    const boundedScore = Math.min(1, score);
    const isFlagged = boundedScore >= 0.5;

    return {
      isFlagged,
      score: boundedScore,
      reasons: flags,
      recommendation: isFlagged
        ? 'Review this content manually. These heuristic signals are not proof of abuse and do not trigger an enforcement action.'
        : flags.length
          ? 'Consider revising the flagged wording. This heuristic check is advisory and may miss context.'
          : 'No matching risk patterns were detected by this limited text check. This does not guarantee the content is safe.',
    };
  }

  static suggestReportReview(reporterNotes: string, reportedContent: string): string {
    const analysis = this.analyzeContent(reportedContent);
    return [
      '### Moderation review notes (heuristic assistance)',
      `- **Reported content excerpt:** "${reportedContent.slice(0, 100)}${reportedContent.length > 100 ? '…' : ''}"`,
      `- **Reporter reason:** "${reporterNotes.slice(0, 500)}"`,
      `- **Heuristic signal strength:** ${Math.round(analysis.score * 100)}/100 (not a probability)`,
      `- **Potential indicators:** ${analysis.reasons.join(', ') || 'No matching patterns detected'}`,
      '',
      '### Suggested next step',
      analysis.recommendation,
      'A moderator must review the full context and make any enforcement decision. This tool does not create, resolve, or submit a report.'
    ].join('\n');
  }
}
