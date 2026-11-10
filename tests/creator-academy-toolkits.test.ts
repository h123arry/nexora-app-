import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { CREATOR_ACADEMY_TOOLKITS } from '../src/content/creatorAcademyToolkits';

const approvedTemplateIds = [
  'content-brief', 'publishing-plan', 'audience-interview', 'partnership-proposal',
  'live-run-sheet', 'community-charter', 'content-experiment', 'portfolio-case-study',
];

describe('NEXORA Creator Academy workbooks', () => {
  it('provides the complete set of approved practical workbooks', () => {
    assert.deepEqual(CREATOR_ACADEMY_TOOLKITS.map(item => item.id).sort(), [...approvedTemplateIds].sort());
    assert.equal(new Set(CREATOR_ACADEMY_TOOLKITS.map(item => item.id)).size, CREATOR_ACADEMY_TOOLKITS.length);
  });

  it('gives every workbook a useful outcome and structured fields', () => {
    for (const workbook of CREATOR_ACADEMY_TOOLKITS) {
      assert.ok(workbook.title.trim().length >= 5);
      assert.ok(workbook.description.trim().length >= 40);
      assert.ok(workbook.outcome.trim().length >= 30);
      assert.ok(workbook.fields.length >= 6);
      assert.equal(new Set(workbook.fields.map(field => field.id)).size, workbook.fields.length);
      for (const field of workbook.fields) {
        assert.ok(field.label.trim().length >= 3);
        assert.ok(field.prompt.trim().length >= 20);
      }
    }
  });
});
