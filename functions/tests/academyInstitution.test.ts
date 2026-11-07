import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { initializeApp, deleteApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import {
  saveAcademyCourseDraft, saveAcademyLesson, submitAcademyCourseForReview, reviewAcademyCourse,
  getPublishedAcademyCourse, createAcademyAssessment, publishAcademyAssessment, submitAcademyAssessment,
  issueAcademyCertificate, verifyAcademyCertificate, revokeAcademyCertificate, getAcademyTutorContext,
  createAcademyMentorshipSession, bookAcademyMentorshipSession,
} from '../src/academyInstitution.js';

const app = initializeApp({ projectId: process.env.GCLOUD_PROJECT || 'demo-nexora-engagement' }, 'academy-institution-tests');
const db = getFirestore(app);
const courseId = 'academy-institution-course';
const assessmentId = 'academy-final-assessment';

before(async () => {
  assert.ok(process.env.FIRESTORE_EMULATOR_HOST, 'Academy institution tests require the Firestore Emulator.');
  await db.recursiveDelete(db.doc('academyCourses/' + courseId));
  await db.recursiveDelete(db.doc('academyMentorshipSessions/academy-session-test'));
  await db.collection('academyAssessmentAttempts').where('courseId', '==', courseId).get().then(async s => {
    for (const d of s.docs) await d.ref.delete();
  });
  await db.collection('academyCertificates').where('courseId', '==', courseId).get().then(async s => {
    for (const d of s.docs) await d.ref.delete();
  });
  await db.collection('academyInstructors').doc('academy-instructor').set({ role: 'instructor', status: 'active' });
  await db.collection('academyInstructors').doc('academy-editor').set({ role: 'editor', status: 'active' });
  await db.collection('academyInstructors').doc('academy-admin').set({ role: 'admin', status: 'active' });
});
after(async () => {
  await db.recursiveDelete(db.doc('academyCourses/' + courseId));
  await db.recursiveDelete(db.doc('academyMentorshipSessions/academy-session-test'));
  await db.collection('academyAssessmentAttempts').where('courseId', '==', courseId).get().then(async s => {
    for (const d of s.docs) await d.ref.delete();
  });
  await db.collection('academyCertificates').where('courseId', '==', courseId).get().then(async s => {
    for (const d of s.docs) await d.ref.delete();
  });
  await db.collection('academyInstructors').doc('academy-instructor').delete();
  await db.collection('academyInstructors').doc('academy-editor').delete();
  await db.collection('academyInstructors').doc('academy-admin').delete();
  await deleteApp(app);
});

describe('NEXORA Institute institution services', () => {
  it('supports instructor authoring, editorial publishing, assessed credentials and grounded tutor sources', async () => {
    await assert.rejects(saveAcademyCourseDraft(db, 'unapproved-user', {
      courseId, title: 'Creator Business', description: 'A complete introduction to a sustainable creator business.', level: 'Beginner', category: 'Business',
    }), /instructor/);
    await saveAcademyCourseDraft(db, 'academy-instructor', {
      courseId, title: 'Creator Business', description: 'A complete introduction to a sustainable creator business.', level: 'Beginner', category: 'Business',
    });
    for (let i = 1; i <= 3; i++) {
      await saveAcademyLesson(db, 'academy-instructor', {
        courseId, lessonId: 'lesson-' + i, title: 'Lesson ' + i,
        body: 'This approved lesson explains creator business principles and practical examples. '.repeat(2),
        transcript: 'Accessible lesson transcript.', order: i,
      });
    }
    await createAcademyAssessment(db, 'academy-instructor', {
      courseId, assessmentId, passPercent: 70,
      questions: [
        { prompt: 'What should a creator establish first?', options: ['Audience value', 'A random price'], correctIndex: 0 },
        { prompt: 'How should a sponsorship be handled?', options: ['Hide it', 'Disclose it'], correctIndex: 1 },
        { prompt: 'What supports a sustainable business?', options: ['One revenue source only', 'A clear value proposition'], correctIndex: 1 },
      ],
    });
    await submitAcademyCourseForReview(db, 'academy-instructor', courseId);
    await assert.rejects(reviewAcademyCourse(db, 'academy-instructor', courseId, 'approve'), /instructor/);
    await reviewAcademyCourse(db, 'academy-editor', courseId, 'approve', 'Curriculum approved.');
    await publishAcademyAssessment(db, 'academy-instructor', courseId, assessmentId);
    const published = await getPublishedAcademyCourse(db, courseId);
    assert.equal(published.lessons.length, 3);
    const tutorContext = await getAcademyTutorContext(db, 'learner-one', courseId, ['lesson-1', 'lesson-2']);
    assert.equal(tutorContext.lessons.length, 2);
    assert.match(tutorContext.groundingPolicy, /only from supplied lesson sources/);
    const failed = await submitAcademyAssessment(db, 'learner-one', courseId, assessmentId, [1, 0, 0]);
    assert.equal(failed.passed, false);
    const passed = await submitAcademyAssessment(db, 'learner-one', courseId, assessmentId, [0, 1, 1]);
    assert.equal(passed.passed, true);
    const cert = await issueAcademyCertificate(db, 'learner-one', courseId, assessmentId);
    assert.equal((await verifyAcademyCertificate(db, cert.verificationCode)).valid, true);
    const duplicate = await issueAcademyCertificate(db, 'learner-one', courseId, assessmentId);
    assert.equal(duplicate.certificateId, cert.certificateId);
    await revokeAcademyCertificate(db, 'academy-admin', cert.certificateId, 'Credential review requested.');
    assert.equal((await verifyAcademyCertificate(db, cert.verificationCode)).valid, false);
  });

  it('books mentorship sessions idempotently and enforces capacity transactionally', async () => {
    const created = await createAcademyMentorshipSession(db, 'academy-instructor', {
      title: 'Creator growth office hours', description: 'A focused group session about sustainable creator growth.',
      startsAt: new Date(Date.now() + 60 * 60_000).toISOString(), durationMinutes: 30, capacity: 1,
    });
    const sessionRef = db.collection('academyMentorshipSessions').doc(created.sessionId);
    await bookAcademyMentorshipSession(db, 'learner-one', created.sessionId);
    await bookAcademyMentorshipSession(db, 'learner-one', created.sessionId);
    assert.equal((await sessionRef.get()).get('bookedCount'), 1);
    await assert.rejects(bookAcademyMentorshipSession(db, 'learner-two', created.sessionId), /full/);
    await sessionRef.delete();
  });
});
