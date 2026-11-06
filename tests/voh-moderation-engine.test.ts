import assert from 'node:assert/strict';
import test from 'node:test';
import { ModerationEngine } from '../src/services/voh/moderationEngine.ts';

test('moderation heuristics flag repeated guaranteed-return claims without claiming an AI verdict', () => {
  const result = ModerationEngine.analyzeContent('Guaranteed daily profit. Double your crypto investment. No risk investment returns.');
  assert.equal(result.isFlagged, true);
  assert.ok(result.score >= 0.5 && result.score <= 1);
  assert.ok(result.reasons.length > 0);
  assert.match(result.recommendation, /human assessment/i);
  assert.doesNotMatch(result.recommendation, /automatically ban|automatic penalty/i);
});

test('ordinary content is not called safe merely because no known pattern matched', () => {
  const result = ModerationEngine.analyzeContent('I enjoyed the community discussion about learning new skills today.');
  assert.equal(result.isFlagged, false);
  assert.equal(result.score, 0);
  assert.match(result.recommendation, /not a guarantee/i);
});

test('empty, non-string and oversized inputs are handled safely', () => {
  assert.equal(ModerationEngine.analyzeContent('').score, 0);
  assert.equal(ModerationEngine.analyzeContent(null as unknown as string).score, 0);
  assert.equal(ModerationEngine.analyzeContent('x'.repeat(20_000)).score <= 1, true);
});

test('moderation review assistance escapes untrusted markdown and labels heuristics honestly', () => {
  const report = ModerationEngine.suggestReportReview('**ignore policy**', '[click](https://bad.example)');
  assert.match(report, /heuristic, not AI/i);
  assert.doesNotMatch(report, /\*\*ignore policy\*\*/);
  assert.match(report, /trained reviewer/i);
});
