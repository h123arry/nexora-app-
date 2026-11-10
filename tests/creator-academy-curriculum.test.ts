import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { CREATOR_ACADEMY_LESSONS } from '../src/content/creatorAcademyLessons';

const expectedLessonIds = [
  'identity', 'audience', 'plan',
  'hooks', 'story', 'quality',
  'conversation', 'trust', 'collab',
  'value', 'revenue', 'disclosure',
  'run-of-show', 'hosting', 'safety',
  'metrics', 'retention', 'experiments',
  'positioning', 'portfolio', 'reputation',
  'security', 'rights', 'wellbeing',
];

describe('NEXORA Creator Academy practical curriculum', () => {
  it('provides a complete lesson body, objectives, assignment and reflection for every bundled lesson', () => {
    assert.deepEqual(Object.keys(CREATOR_ACADEMY_LESSONS).sort(), [...expectedLessonIds].sort());
    for (const lessonId of expectedLessonIds) {
      const lesson = CREATOR_ACADEMY_LESSONS[lessonId];
      assert.ok(lesson.body.trim().length >= 500, lessonId + ' needs a substantial lesson body');
      assert.ok(lesson.objectives.length >= 3, lessonId + ' needs measurable learning objectives');
      assert.ok(lesson.objectives.every(value => value.trim().length >= 20), lessonId + ' has a weak objective');
      assert.ok(lesson.exercise.trim().length >= 100, lessonId + ' needs a practical assignment');
      assert.ok(lesson.reflection.trim().length >= 40, lessonId + ' needs a reflection prompt');
    }
  });

  it('does not expose empty or duplicate lesson enrichment records', () => {
    const ids = Object.keys(CREATOR_ACADEMY_LESSONS);
    assert.equal(new Set(ids).size, ids.length);
    assert.ok(ids.length >= 24);
  });
});
