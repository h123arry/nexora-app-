import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { ModerationEngine } from '../src/services/voh/moderationEngine';

describe('VOH moderation advisory heuristics', () => {
  it('reports signal strength without claiming probability or automatic enforcement', () => {
    const result = ModerationEngine.analyzeContent('Get rich quick with guaranteed 100% payout. Click here now.');
    assert.equal(result.isFlagged, true);
    assert.ok(result.score > 0 && result.score <= 1);
    assert.match(result.recommendation, /manually/);
    assert.doesNotMatch(result.recommendation, /auto-flag|ban|automatically/i);
  });

  it('does not claim content is guaranteed safe when no pattern matches', () => {
    const result = ModerationEngine.analyzeContent('I enjoyed building this small project today.');
    assert.equal(result.isFlagged, false);
    assert.match(result.recommendation, /does not guarantee the content is safe/i);
  });

  it('makes report notes advisory and explicitly avoids claiming report submission', () => {
    const summary = ModerationEngine.suggestReportReview('Possible scam', 'Click here for a limited offer.');
    assert.match(summary, /not a probability/i);
    assert.match(summary, /does not create, resolve, or submit a report/i);
  });
});
