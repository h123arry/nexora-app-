import { createHash, randomBytes, randomUUID } from 'node:crypto';
import type { Firestore } from 'firebase-admin/firestore';

const ID = /^[A-Za-z0-9_-]{1,120}$/;
const text = (value: unknown, min: number, max: number): value is string =>
  typeof value === 'string' && value.trim().length >= min && value.length <= max;
const safeId = (value: unknown): value is string => typeof value === 'string' && ID.test(value);

const BUNDLED_ACADEMY_LESSONS: Record<string, readonly string[]> = {
  'creator-foundations': ['identity', 'audience', 'plan'],
  'content-craft': ['hooks', 'story', 'quality'],
  'community-building': ['conversation', 'trust', 'collab'],
  'creator-business': ['value', 'revenue', 'disclosure'],
  'live-production': ['run-of-show', 'hosting', 'safety'],
  'creator-analytics': ['metrics', 'retention', 'experiments'],
  'personal-brand': ['positioning', 'portfolio', 'reputation'],
  'creator-safety': ['security', 'rights', 'wellbeing'],
  'video-production': ["shot-planning", "sound-lighting", "editing-workflow"],
  'creator-finance': ["income-costs", "cash-flow", "records-tax"],
  'creative-rights': ["ownership-permissions", "music-image-licensing", "contracts-deliverables"],
  'inclusive-creation': ["captions-transcripts", "visual-accessibility", "inclusive-community"],
};

async function instructor(db: Firestore, uid: string, minimum: 'instructor' | 'editor' | 'admin' = 'instructor') {
  const snap = await db.collection('academyInstructors').doc(uid).get();
  const role = snap.get('role');
  const rank = { instructor: 1, editor: 2, admin: 3 } as const;
  if (!snap.exists || snap.get('status') !== 'active' || !(role in rank) || rank[role as keyof typeof rank] < rank[minimum]) {
    throw new Error('An active Academy instructor or editor account is required.');
  }
  return snap;
}

export async function saveAcademyCourseDraft(db: Firestore, uid: string, input: any) {
  await instructor(db, uid);
  const courseId = safeId(input?.courseId) ? input.courseId : randomUUID();
  if (!text(input?.title, 4, 120) || !text(input?.description, 20, 1200)
    || !['Beginner', 'Intermediate', 'Advanced', 'All levels'].includes(input?.level)
    || !text(input?.category, 2, 60)) throw new Error('Provide a valid course title, description, level and category.');
  const ref = db.collection('academyCourses').doc(courseId);
  await db.runTransaction(async tx => {
    const existing = await tx.get(ref);
    if (existing.exists && existing.get('ownerId') !== uid) throw new Error('You cannot edit another instructor’s course.');
    if (existing.exists && existing.get('status') === 'published') throw new Error('Published courses must be revised through a new course version.');
    tx.set(ref, {
      id: courseId, ownerId: uid, title: input.title.trim(), description: input.description.trim(),
      level: input.level, category: input.category.trim(), status: 'draft',
      version: existing.exists ? Number(existing.get('version') || 1) : 1,
      updatedAt: new Date(), schemaVersion: 1,
    }, { merge: true });
  });
  return { courseId, status: 'draft' as const };
}

export async function saveAcademyLesson(db: Firestore, uid: string, input: any) {
  await instructor(db, uid);
  const { courseId, lessonId } = input ?? {};
  if (!safeId(courseId) || !safeId(lessonId) || !text(input?.title, 3, 140)
    || !text(input?.body, 30, 20000) || !Number.isInteger(input?.order) || input.order < 0 || input.order > 100) {
    throw new Error('Provide valid lesson details and a lesson order.');
  }
  const courseRef = db.collection('academyCourses').doc(courseId);
  const lessonRef = courseRef.collection('lessons').doc(lessonId);
  await db.runTransaction(async tx => {
    const course = await tx.get(courseRef);
    if (!course.exists || course.get('ownerId') !== uid || course.get('status') !== 'draft') {
      throw new Error('Only the owner can edit lessons in a draft course.');
    }
    tx.set(lessonRef, {
      id: lessonId, title: input.title.trim(), body: input.body.trim(),
      transcript: text(input.transcript, 1, 30000) ? input.transcript.trim() : '',
      resourceUrls: Array.isArray(input.resourceUrls)
        ? input.resourceUrls.filter((url: unknown) => typeof url === 'string' && /^https:\/\//.test(url)).slice(0, 5)
        : [],
      order: input.order, status: 'draft', updatedAt: new Date(),
    }, { merge: true });
  });
  return { courseId, lessonId, saved: true };
}

export async function submitAcademyCourseForReview(db: Firestore, uid: string, courseId: string) {
  await instructor(db, uid);
  if (!safeId(courseId)) throw new Error('A valid course ID is required.');
  const ref = db.collection('academyCourses').doc(courseId);
  await db.runTransaction(async tx => {
    const course = await tx.get(ref);
    if (!course.exists || course.get('ownerId') !== uid || course.get('status') !== 'draft') throw new Error('This draft course is unavailable.');
    const lessons = await tx.get(ref.collection('lessons'));
    if (lessons.size < 3 || lessons.docs.some(item => !text(item.get('body'), 30, 20000))) throw new Error('A course needs at least three complete lessons before review.');
    tx.update(ref, { status: 'in_review', submittedAt: new Date(), lessonCount: lessons.size });
  });
  return { courseId, status: 'in_review' as const };
}

export async function reviewAcademyCourse(db: Firestore, uid: string, courseId: string, decision: 'approve' | 'reject', note = '') {
  await instructor(db, uid, 'editor');
  if (!safeId(courseId) || !['approve', 'reject'].includes(decision) || note.length > 1000) throw new Error('A valid editorial decision is required.');
  const ref = db.collection('academyCourses').doc(courseId);
  await db.runTransaction(async tx => {
    const course = await tx.get(ref);
    if (!course.exists || course.get('status') !== 'in_review') throw new Error('This course is not awaiting review.');
    if (decision === 'approve') {
      const lessons = await tx.get(ref.collection('lessons'));
      for (const lesson of lessons.docs) tx.update(lesson.ref, { status: 'published', publishedAt: new Date() });
    }
    tx.update(ref, {
      status: decision === 'approve' ? 'published' : 'draft',
      reviewedBy: uid, reviewedAt: new Date(), reviewNote: note.trim(),
      ...(decision === 'approve' ? { publishedAt: new Date() } : {}),
    });
  });
  return { courseId, status: decision === 'approve' ? 'published' as const : 'draft' as const };
}

export async function getPublishedAcademyCourse(db: Firestore, courseId: string) {
  if (!safeId(courseId)) throw new Error('A valid course ID is required.');
  const ref = db.collection('academyCourses').doc(courseId);
  const course = await ref.get();
  if (!course.exists || course.get('status') !== 'published') throw new Error('This published course is unavailable.');
  const [lessons, assessments] = await Promise.all([
    ref.collection('lessons').where('status', '==', 'published').orderBy('order').get(),
    ref.collection('assessments').where('status', '==', 'published').get(),
  ]);
  return {
    course: { id: course.id, title: course.get('title'), description: course.get('description'), level: course.get('level'), category: course.get('category'), version: course.get('version') },
    lessons: lessons.docs.map(item => ({ id: item.id, title: item.get('title'), body: item.get('body'), transcript: item.get('transcript') || '', resourceUrls: item.get('resourceUrls') || [], order: item.get('order') })),
    // Never expose correctIndex or answer keys to learners.
    assessments: assessments.docs.map(item => {
      const questions = Array.isArray(item.get('questions')) ? item.get('questions') as Array<{ id: string; prompt: string; options: string[] }> : [];
      return { id: item.id, passPercent: item.get('passPercent'), questions: questions.map(question => ({ id: question.id, prompt: question.prompt, options: question.options })) };
    }),
  };
}

export async function listPublishedAcademyCourses(db: Firestore) {
  const snapshot = await db.collection('academyCourses').where('status', '==', 'published').limit(50).get();
  const courses = snapshot.docs.map(course => ({
    id: course.id,
    title: String(course.get('title') || ''),
    description: String(course.get('description') || ''),
    level: String(course.get('level') || 'All levels'),
    category: String(course.get('category') || 'Creator skills'),
    version: Number(course.get('version') || 1),
    lessonCount: Number(course.get('lessonCount') || 0),
  }));
  return { courses, truncated: snapshot.size === 50 };
}

export async function createAcademyAssessment(db: Firestore, uid: string, input: any) {
  await instructor(db, uid);
  const { courseId, assessmentId, questions } = input ?? {};
  if (!safeId(courseId) || !safeId(assessmentId) || !Array.isArray(questions) || questions.length < 3 || questions.length > 30) throw new Error('An assessment needs between 3 and 30 questions.');
  const normalized = questions.map((q: any, index: number) => {
    if (!text(q?.prompt, 8, 500) || !Array.isArray(q.options) || q.options.length < 2 || q.options.length > 5
      || q.options.some((v: unknown) => !text(v, 1, 180)) || !Number.isInteger(q.correctIndex) || q.correctIndex < 0 || q.correctIndex >= q.options.length) {
      throw new Error('Every assessment question needs a prompt, 2–5 options and one correct answer.');
    }
    return { id: 'q' + index, prompt: q.prompt.trim(), options: q.options.map((v: string) => v.trim()), correctIndex: q.correctIndex };
  });
  const courseRef = db.collection('academyCourses').doc(courseId);
  const course = await courseRef.get();
  if (!course.exists || course.get('ownerId') !== uid || course.get('status') !== 'draft') throw new Error('Assessment editing requires your draft course.');
  await courseRef.collection('assessments').doc(assessmentId).set({
    id: assessmentId, questions: normalized, passPercent: Math.min(100, Math.max(50, Number(input.passPercent) || 70)),
    status: 'draft', updatedAt: new Date(),
  });
  return { assessmentId, questionCount: normalized.length };
}

export async function publishAcademyAssessment(db: Firestore, uid: string, courseId: string, assessmentId: string) {
  await instructor(db, uid);
  if (!safeId(courseId) || !safeId(assessmentId)) throw new Error('A valid assessment is required.');
  const courseRef = db.collection('academyCourses').doc(courseId);
  const assessmentRef = courseRef.collection('assessments').doc(assessmentId);
  await db.runTransaction(async tx => {
    const [course, assessment] = await Promise.all([tx.get(courseRef), tx.get(assessmentRef)]);
    if (!course.exists || course.get('ownerId') !== uid || course.get('status') !== 'published' || !assessment.exists || assessment.get('status') !== 'draft') throw new Error('This draft assessment is unavailable.');
    tx.update(assessmentRef, { status: 'published', publishedAt: new Date() });
  });
  return { assessmentId, published: true };
}

export async function submitAcademyAssessment(db: Firestore, uid: string, courseId: string, assessmentId: string, answers: unknown) {
  if (!safeId(courseId) || !safeId(assessmentId) || !Array.isArray(answers) || answers.length > 30
    || answers.some(v => !Number.isInteger(v) || (v as number) < 0 || (v as number) > 4)) throw new Error('Submit valid assessment answers.');
  const courseRef = db.collection('academyCourses').doc(courseId);
  const assessmentRef = courseRef.collection('assessments').doc(assessmentId);
  const assessment = await assessmentRef.get();
  const course = await courseRef.get();
  if (!course.exists || course.get('status') !== 'published' || !assessment.exists || assessment.get('status') !== 'published') throw new Error('This assessment is unavailable.');
  const questions = assessment.get('questions') as Array<{ id: string; prompt: string; options: string[]; correctIndex: number }>;
  if (answers.length !== questions.length) throw new Error('Answer every assessment question.');
  const correct = questions.reduce((sum, question, index) => sum + (answers[index] === question.correctIndex ? 1 : 0), 0);
  const scorePercent = Math.round(correct / questions.length * 100);
  const passed = scorePercent >= Number(assessment.get('passPercent') || 70);
  const attemptId = randomUUID();
  await db.collection('academyAssessmentAttempts').doc(attemptId).create({
    id: attemptId, userId: uid, courseId, assessmentId, scorePercent, passed,
    correctCount: correct, questionCount: questions.length, createdAt: new Date(), gradingVersion: 1,
  });
  return { attemptId, scorePercent, passed, correctCount: correct, questionCount: questions.length };
}

export async function issueAcademyCertificate(db: Firestore, uid: string, courseId: string, assessmentId: string) {
  if (!safeId(courseId) || !safeId(assessmentId)) throw new Error('A valid course and assessment are required.');
  const certificateId = createHash('sha256').update(uid + ':' + courseId + ':' + assessmentId).digest('hex').slice(0, 32);
  const courseRef = db.collection('academyCourses').doc(courseId);
  const certificateRef = db.collection('academyCertificates').doc(certificateId);
  return db.runTransaction(async tx => {
    const attemptsQuery = db.collection('academyAssessmentAttempts')
      .where('userId', '==', uid).where('courseId', '==', courseId)
      .where('assessmentId', '==', assessmentId).where('passed', '==', true).limit(1);
    const [attempts, course, existingCertificate] = await Promise.all([
      tx.get(attemptsQuery), tx.get(courseRef), tx.get(certificateRef),
    ]);
    if (attempts.empty) throw new Error('Pass the published Academy assessment before requesting a certificate.');
    if (!course.exists || course.get('status') !== 'published') throw new Error('This course is unavailable.');
    if (existingCertificate.exists) {
      if (existingCertificate.get('status') === 'valid') {
        return { certificateId, verificationCode: existingCertificate.get('verificationCode'), courseTitle: course.get('title') };
      }
      throw new Error('A revoked Academy certificate cannot be reissued.');
    }
    const verificationCode = randomBytes(18).toString('hex').toUpperCase();
    tx.create(certificateRef, {
      id: certificateId, verificationCode, userId: uid, courseId, courseTitle: course.get('title'),
      assessmentId, status: 'valid', issuedAt: new Date(), issuer: 'NEXORA Institute', schemaVersion: 1,
    });
    return { certificateId, verificationCode, courseTitle: course.get('title') };
  });
}

export async function verifyAcademyCertificate(db: Firestore, verificationCode: string) {
  if (!/^[A-F0-9]{36}$/.test(verificationCode)) throw new Error('A valid verification code is required.');
  const result = await db.collection('academyCertificates').where('verificationCode', '==', verificationCode).limit(1).get();
  if (result.empty) return { valid: false };
  const certificate = result.docs[0];
  return { valid: certificate.get('status') === 'valid', certificateId: certificate.id, courseTitle: certificate.get('courseTitle'), issuedAt: certificate.get('issuedAt'), status: certificate.get('status') };
}

export async function revokeAcademyCertificate(db: Firestore, uid: string, certificateId: string, reason: string) {
  await instructor(db, uid, 'admin');
  if (!safeId(certificateId) || !text(reason, 5, 500)) throw new Error('A certificate ID and reason are required.');
  const ref = db.collection('academyCertificates').doc(certificateId);
  await db.runTransaction(async tx => {
    const cert = await tx.get(ref);
    if (!cert.exists) throw new Error('Certificate not found.');
    if (cert.get('status') === 'revoked') return;
    tx.update(ref, { status: 'revoked', revokedAt: new Date(), revokedBy: uid, revocationReason: reason.trim() });
  });
  return { certificateId, revoked: true };
}

export async function getAcademyTutorContext(db: Firestore, uid: string, courseId: string, lessonIds: unknown) {
  if (!safeId(uid)) throw new Error('Sign in to use the Academy tutor.');
  if (!safeId(courseId) || !Array.isArray(lessonIds) || lessonIds.length < 1 || lessonIds.length > 4 || lessonIds.some(id => !safeId(id))) {
    throw new Error('Choose one to four valid lessons for your tutor question.');
  }
  const courseRef = db.collection('academyCourses').doc(courseId);
  const course = await courseRef.get();
  if (!course.exists || course.get('status') !== 'published') throw new Error('The tutor can only use published Academy courses.');
  const lessonSnaps = await Promise.all((lessonIds as string[]).map(id => courseRef.collection('lessons').doc(id).get()));
  const lessons = lessonSnaps.filter(s => s.exists && s.get('status') === 'published').map(s => ({
    lessonId: s.id, title: s.get('title'), sourceText: String(s.get('body') || '').slice(0, 12000),
    transcript: String(s.get('transcript') || '').slice(0, 12000),
  }));
  if (!lessons.length) throw new Error('No published lesson material was found for this tutor question.');
  // This is a source-grounding contract for the existing VOH AI runtime; it deliberately
  // returns approved lesson evidence, not an invented answer or ungrounded credential claim.
  return { userId: uid, courseId, courseTitle: course.get('title'), groundingPolicy: 'Answer only from supplied lesson sources. Cite lesson titles. Say when the material does not contain the answer.', lessons };
}

export async function createAcademyMentorshipSession(db: Firestore, uid: string, input: any) {
  await instructor(db, uid);
  const { title, description, startsAt, durationMinutes, capacity } = input ?? {};
  const start = typeof startsAt === 'string' ? new Date(startsAt) : new Date(NaN);
  if (!text(title, 5, 120) || !text(description, 20, 1000) || Number.isNaN(start.getTime())
    || start.getTime() < Date.now() + 5 * 60_000 || start.getTime() > Date.now() + 180 * 24 * 60 * 60_000
    || !Number.isInteger(durationMinutes) || durationMinutes < 15 || durationMinutes > 180
    || !Number.isInteger(capacity) || capacity < 1 || capacity > 100) throw new Error('Provide a valid future session, duration and capacity.');
  const sessionId = randomUUID();
  await db.collection('academyMentorshipSessions').doc(sessionId).create({
    id: sessionId, mentorId: uid, title: title.trim(), description: description.trim(),
    startsAt: start, durationMinutes, capacity, bookedCount: 0, status: 'scheduled', createdAt: new Date(),
  });
  return { sessionId, status: 'scheduled' as const };
}

export async function listUpcomingAcademyMentorshipSessions(db: Firestore, uid: string, now = new Date()) {
  if (!safeId(uid)) throw new Error('Sign in to browse Academy mentorship sessions.');
  const snapshot = await db.collection('academyMentorshipSessions').where('status', '==', 'scheduled').where('startsAt', '>=', now).orderBy('startsAt', 'asc').limit(50).get();
  const upcoming = snapshot.docs.map(session => {
    const startValue = session.get('startsAt');
    const startsAt = startValue?.toDate?.() instanceof Date ? startValue.toDate() : startValue instanceof Date ? startValue : null;
    const capacity = Number(session.get('capacity') || 0);
    const bookedCount = Number(session.get('bookedCount') || 0);
    return {
      sessionId: session.id,
      title: String(session.get('title') || ''),
      description: String(session.get('description') || ''),
      startsAt: startsAt?.toISOString() || '',
      durationMinutes: Number(session.get('durationMinutes') || 0),
      capacity,
      bookedCount,
      seatsAvailable: Math.max(0, capacity - bookedCount),
      mentorId: String(session.get('mentorId') || ''),
    };
  }) .filter(session => session.startsAt && new Date(session.startsAt) > now)
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt));
  const sessions = await Promise.all(upcoming.map(async session => {
    const [profile, booking] = await Promise.all([
      session.mentorId ? db.collection('publicProfiles').doc(session.mentorId).get() : Promise.resolve(null),
      db.doc(`academyMentorshipSessions/${session.sessionId}/bookings/${uid}`).get(),
    ]);
    return {
      ...session,
      mentorName: String(profile?.get('name') || profile?.get('username') || 'NEXORA Academy mentor'),
      mentorUsername: String(profile?.get('username') || ''),
      isBooked: booking.exists,
    };
  }));
  return { sessions: sessions.filter(session => session.seatsAvailable > 0 || session.isBooked), truncated: snapshot.size === 50 };
}

export async function bookAcademyMentorshipSession(db: Firestore, uid: string, sessionId: string) {
  if (!safeId(sessionId)) throw new Error('A valid mentorship session is required.');
  const sessionRef = db.collection('academyMentorshipSessions').doc(sessionId);
  const bookingRef = sessionRef.collection('bookings').doc(uid);
  let bookedCount = 0;
  await db.runTransaction(async tx => {
    const [session, booking] = await Promise.all([tx.get(sessionRef), tx.get(bookingRef)]);
    if (!session.exists || session.get('status') !== 'scheduled' || session.get('startsAt').toDate().getTime() <= Date.now()) throw new Error('This mentorship session is unavailable.');
    const count = Number(session.get('bookedCount') || 0);
    if (booking.exists) { bookedCount = count; return; }
    if (count >= Number(session.get('capacity') || 0)) throw new Error('This mentorship session is full.');
    bookedCount = count + 1;
    tx.create(bookingRef, { userId: uid, sessionId, status: 'booked', bookedAt: new Date() });
    tx.update(sessionRef, { bookedCount });
  });
  return { sessionId, booked: true, bookedCount };
}


/**
 * Records learner progress through trusted server code. Published institutional
 * lessons are checked against their live course/lesson documents; bundled
 * introductory lessons are checked against the versioned curriculum allowlist.
 * This record is progress only and never grants an assessed credential.
 */
export async function completeAcademyLesson(db: Firestore, uid: string, courseId: string, lessonId: string) {
  if (!uid || !safeId(courseId) || !safeId(lessonId)) {
    throw new Error('A valid course and lesson are required.');
  }
  const bundledLessons = BUNDLED_ACADEMY_LESSONS[courseId];
  if (bundledLessons && !bundledLessons.includes(lessonId)) {
    throw new Error('This lesson is not part of the selected course.');
  }
  const courseRef = db.collection('academyCourses').doc(courseId);
  const lessonRef = courseRef.collection('lessons').doc(lessonId);
  const progressRef = db.collection('academyProgress').doc(uid + '_' + courseId);
  return db.runTransaction(async tx => {
    const [progress, course, lesson] = await Promise.all([
      tx.get(progressRef),
      bundledLessons ? Promise.resolve(null) : tx.get(courseRef),
      bundledLessons ? Promise.resolve(null) : tx.get(lessonRef),
    ]);
    if (!bundledLessons && (!course?.exists || course.get('status') !== 'published'
      || !lesson?.exists || lesson.get('status') !== 'published')) {
      throw new Error('This published Academy lesson is unavailable.');
    }
    if (progress.exists && (progress.get('userId') !== uid || progress.get('courseId') !== courseId)) {
      throw new Error('This learner progress record is unavailable.');
    }
    const existing = Array.isArray(progress.get('completedLessonIds'))
      ? [...new Set((progress.get('completedLessonIds') as unknown[]).filter((id): id is string => typeof id === 'string' && id.length <= 120))]
      : [];
    if (existing.includes(lessonId)) return { courseId, lessonId, completedLessonIds: existing, alreadyCompleted: true };
    if (existing.length >= 500) throw new Error('This course progress record has reached its supported lesson limit.');
    const completedLessonIds = [...existing, lessonId];
    tx.set(progressRef, {
      userId: uid, courseId, completedLessonIds, updatedAt: new Date(), schemaVersion: 1,
    }, { merge: true });
    return { courseId, lessonId, completedLessonIds, alreadyCompleted: false };
  });
}
