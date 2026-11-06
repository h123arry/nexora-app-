export interface ModerationResult {
  isFlagged: boolean;
  score: number;
  reasons: string[];
  recommendation: string;
}

const MAX_ANALYSIS_LENGTH = 12_000;
const URL_PATTERN = /https?:\/\/[^\s<>()]+/gi;
const PROMOTIONAL_PATTERNS = [
  /\bguaranteed\s+(?:daily\s+)?(?:profit|returns?|payout)\b/i,
  /\b(?:double|triple)\s+your\s+(?:money|crypto|investment)\b/i,
  /\bno\s+risk\s+(?:investment|returns?)\b/i,
  /\b(?:get rich quick|recover your lost funds|send .* to unlock)\b/i,
];

function normalizeText(value: unknown): string {
  if (typeof value !== 'string') return '';
  return value.normalize('NFKC').replace(/[\u200B-\u200D\uFEFF]/g, '').slice(0, MAX_ANALYSIS_LENGTH).toLowerCase();
}

function escapeMarkdown(value: string): string {
  return value.replace(/[\\`*_{}\[\]()#+.!|>~-]/g, '\\$&').replace(/[\r\n\t]+/g, ' ');
}

export class ModerationEngine {
  /**
   * Lightweight client-side heuristics for creator feedback only.
   * This is not an AI model, a policy verdict, or an enforcement decision.
   * Server-side moderation and a human reviewer remain authoritative.
   */
  static analyzeContent(input: string): ModerationResult {
    const text = normalizeText(input);
    const flags: string[] = [];
    let score = 0;

    if (!text.trim()) {
      return { isFlagged: false, score: 0, reasons: [], recommendation: 'No content was available to assess.' };
    }

    if (PROMOTIONAL_PATTERNS.some(pattern => pattern.test(text))) {
      flags.push('Potential misleading financial or guaranteed-return claim');
      score += 0.55;
    }

    const urls = text.match(URL_PATTERN) || [];
    const uniqueUrls = new Set(urls.map(url => url.replace(/[),.!?]+$/, '')));
    if (uniqueUrls.size >= 4) {
      flags.push('Unusually high number of links');
      score += 0.35;
    }

    const words = text.match(/[\p{L}\p{N}']+/gu) || [];
    if (words.length >= 12) {
      const normalizedWords = words.map(word => word.toLowerCase());
      const uniqueRatio = new Set(normalizedWords).size / normalizedWords.length;
      if (uniqueRatio < 0.35) {
        flags.push('High word repetition');
        score += 0.3;
      }
    }

    if (/(.)\1{9,}/u.test(text)) {
      flags.push('Unusually repetitive character sequence');
      score += 0.2;
    }

    const callsToAction = (text.match(/\b(?:buy now|click here|limited offer|claim your prize|act fast)\b/gi) || []).length;
    if (callsToAction >= 3) {
      flags.push('Repeated high-pressure promotional calls to action');
      score += 0.25;
    }

    const boundedScore = Math.min(1, Number(score.toFixed(2)));
    return {
      isFlagged: boundedScore >= 0.5,
      score: boundedScore,
      reasons: flags,
      recommendation: boundedScore >= 0.5
        ? 'Potential risk detected. Send this item to the moderation review queue for human assessment; do not apply an automatic penalty.'
        : flags.length
          ? 'Some patterns may deserve a closer look. Review the context before taking action.'
          : 'No listed spam pattern was detected. This is not a guarantee that the content is safe or policy-compliant.',
    };
  }

  static suggestReportReview(reporterNotes: string, reportedContent: string): string {
    const safeNotes = escapeMarkdown(String(reporterNotes || '').slice(0, 500));
    const safeContent = escapeMarkdown(String(reportedContent || '').slice(0, 500));
    const analysis = this.analyzeContent(reportedContent);
    return [
      '### Moderation review assistance (heuristic, not AI)',
      '- **Reported content:** ' + (safeContent || '(not supplied)'),
      '- **Reporter context:** ' + (safeNotes || '(not supplied)'),
      '- **Heuristic risk indicator:** ' + Math.round(analysis.score * 100) + '%',
      '- **Signals:** ' + (analysis.reasons.join(', ') || 'None detected'),
      '',
      '**Review guidance**',
      analysis.recommendation,
      'A trained reviewer must assess context, evidence, and applicable policy before any enforcement action.',
    ].join('\n');
  }
}
