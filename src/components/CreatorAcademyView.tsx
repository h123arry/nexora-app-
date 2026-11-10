import React, { useEffect, useMemo, useState } from 'react';
import { Award, BookOpen, CheckCircle2, ChevronRight, Clock3, GraduationCap, Sparkles } from 'lucide-react';
import { collection, deleteDoc, doc, getDoc, getDocs, limit, query, serverTimestamp, setDoc, where } from 'firebase/firestore';
import { db, functions } from '../lib/firebase';
import { httpsCallable } from 'firebase/functions';
import { User } from '../types';
import CreatorAcademyInstitutionTools from './CreatorAcademyInstitutionTools';
import CreatorAcademyToolkit from './CreatorAcademyToolkit';
import { CREATOR_ACADEMY_LESSONS } from '../content/creatorAcademyLessons';

type Lesson = { id: string; title: string; minutes?: number; summary: string; body?: string; transcript?: string; resourceUrls?: string[]; objectives?: string[]; exercise?: string; reflection?: string };
type Assessment = { id: string; passPercent: number; questions: Array<{ id: string; prompt: string; options: string[] }> };
type Course = { id: string; title: string; level: string; category: string; description: string; lessons: Lesson[]; institutional?: boolean; lessonCount?: number; version?: number };

const BASE_COURSES: Course[] = [
  { id: 'creator-foundations', title: 'The Creator Foundations', level: 'Beginner', category: 'Getting started', description: 'Build a clear creator identity, choose your audience and establish a sustainable publishing habit.', lessons: [
    { id: 'identity', title: 'Define your creator identity', minutes: 8, summary: 'Find the topics, perspective and promise that make your work recognisable.' },
    { id: 'audience', title: 'Understand the audience you serve', minutes: 10, summary: 'Describe the people you want to reach and the value they should receive.' },
    { id: 'plan', title: 'Build a realistic publishing plan', minutes: 9, summary: 'Create a repeatable schedule that protects quality and consistency.' },
  ]},
  { id: 'content-craft', title: 'Content Craft and Storytelling', level: 'Beginner', category: 'Content creation', description: 'Learn stronger hooks, clear story structures and useful calls to action.', lessons: [
    { id: 'hooks', title: 'Earn attention in the opening seconds', minutes: 9, summary: 'Use a specific promise, question or moment of tension without misleading viewers.' },
    { id: 'story', title: 'Structure a memorable story', minutes: 12, summary: 'Give each post a beginning, progression and satisfying payoff.' },
    { id: 'quality', title: 'Improve quality with every post', minutes: 8, summary: 'Use feedback and deliberate practice instead of chasing every trend.' },
  ]},
  { id: 'community-building', title: 'Community and Audience Growth', level: 'Intermediate', category: 'Community', description: 'Turn passive viewers into a healthy, engaged community.', lessons: [
    { id: 'conversation', title: 'Start meaningful conversations', minutes: 8, summary: 'Invite specific responses and participate in the discussion you create.' },
    { id: 'trust', title: 'Build trust and community standards', minutes: 11, summary: 'Set expectations, moderate fairly and protect audience confidence.' },
    { id: 'collab', title: 'Grow through collaboration', minutes: 10, summary: 'Choose collaborators with shared values and complementary audiences.' },
  ]},
  { id: 'creator-business', title: 'Build a Sustainable Creator Business', level: 'Intermediate', category: 'Business', description: 'Understand creator revenue, partnerships, pricing and responsible business practices.', lessons: [
    { id: 'value', title: 'Understand the value you provide', minutes: 9, summary: 'Connect your work to a clear audience need before choosing a revenue model.' },
    { id: 'revenue', title: 'Explore creator revenue streams', minutes: 12, summary: 'Compare memberships, products, services, events and brand partnerships.' },
    { id: 'disclosure', title: 'Handle partnerships transparently', minutes: 8, summary: 'Set deliverables, disclose sponsorships and keep written agreements.' },
  ]},
  { id: 'live-production', title: 'Professional Live Sessions', level: 'Intermediate', category: 'Live', description: 'Plan engaging broadcasts, manage guests and create a safe live environment.', lessons: [
    { id: 'run-of-show', title: 'Plan a live run of show', minutes: 8, summary: 'Give your broadcast a clear purpose, sequence and closing.' },
    { id: 'hosting', title: 'Host guests and audience participation', minutes: 10, summary: 'Make guests feel welcome while keeping the conversation focused.' },
    { id: 'safety', title: 'Moderate live sessions responsibly', minutes: 9, summary: 'Prepare moderator roles and escalation steps before going live.' },
  ]},
  { id: 'creator-analytics', title: 'Creator Analytics and Improvement', level: 'Intermediate', category: 'Analytics', description: 'Read performance signals carefully and turn them into experiments.', lessons: [
    { id: 'metrics', title: 'Choose metrics that matter', minutes: 9, summary: 'Separate reach, retention, meaningful engagement and audience growth.' },
    { id: 'retention', title: 'Understand audience retention', minutes: 10, summary: 'Find where attention changes and form testable explanations.' },
    { id: 'experiments', title: 'Run a useful content experiment', minutes: 8, summary: 'Change one variable at a time and compare results over a fair period.' },
  ]},
  { id: 'personal-brand', title: 'Personal Branding and Reputation', level: 'Advanced', category: 'Brand', description: 'Develop a consistent public identity, portfolio and professional reputation.', lessons: [
    { id: 'positioning', title: 'Position your public identity', minutes: 9, summary: 'Make your profile, work and audience promise tell a consistent story.' },
    { id: 'portfolio', title: 'Build a creator portfolio', minutes: 10, summary: 'Present selected work and outcomes honestly and clearly.' },
    { id: 'reputation', title: 'Protect your reputation', minutes: 8, summary: 'Respond to criticism thoughtfully and correct mistakes transparently.' },
  ]},
  { id: 'creator-safety', title: 'Creator Safety, Rights and Wellbeing', level: 'All levels', category: 'Safety', description: 'Protect your account, respect creative rights and build healthier creator habits.', lessons: [
    { id: 'security', title: 'Secure your creator account', minutes: 8, summary: 'Use strong authentication and recognise impersonation and phishing attempts.' },
    { id: 'rights', title: 'Respect copyright and permissions', minutes: 10, summary: 'Understand ownership, licences, consent and responsible reuse.' },
    { id: 'wellbeing', title: 'Create sustainably', minutes: 8, summary: 'Set boundaries, manage pressure and build a healthy publishing rhythm.' },
  ]},
  { id: 'video-production', title: 'Video Production and Visual Storytelling', level: 'Beginner', category: 'Production', description: 'Plan, capture and edit clear video stories with accessible sound, intentional framing and a repeatable production workflow.', lessons: [
    { id: 'shot-planning', title: 'Plan a visual sequence', minutes: 9, summary: 'Plan a visual sequence through practical creator workflows and repeatable quality checks.' },
    { id: 'sound-lighting', title: 'Record clean sound and usable light', minutes: 11, summary: 'Record clean sound and usable light through practical creator workflows and repeatable quality checks.' },
    { id: 'editing-workflow', title: 'Edit for clarity and rhythm', minutes: 9, summary: 'Edit for clarity and rhythm through practical creator workflows and repeatable quality checks.' },
  ]},
  { id: 'creator-finance', title: 'Creator Finance and Business Operations', level: 'Intermediate', category: 'Finance', description: 'Build a responsible operating model for creator income, costs, records, cash flow and tax preparation.', lessons: [
    { id: 'income-costs', title: 'Understand creator income and costs', minutes: 9, summary: 'Understand creator income and costs through practical creator workflows and repeatable quality checks.' },
    { id: 'cash-flow', title: 'Manage cash flow and reserves', minutes: 11, summary: 'Manage cash flow and reserves through practical creator workflows and repeatable quality checks.' },
    { id: 'records-tax', title: 'Keep useful financial records', minutes: 9, summary: 'Keep useful financial records through practical creator workflows and repeatable quality checks.' },
  ]},
  { id: 'creative-rights', title: 'Creative Rights, Licensing and Contracts', level: 'All levels', category: 'Professional practice', description: 'Protect original work, obtain permissions and understand the practical terms behind collaborations and licensing.', lessons: [
    { id: 'ownership-permissions', title: 'Understand ownership and permissions', minutes: 9, summary: 'Understand ownership and permissions through practical creator workflows and repeatable quality checks.' },
    { id: 'music-image-licensing', title: 'Use music, images and footage responsibly', minutes: 11, summary: 'Use music, images and footage responsibly through practical creator workflows and repeatable quality checks.' },
    { id: 'contracts-deliverables', title: 'Read contracts and define deliverables', minutes: 9, summary: 'Read contracts and define deliverables through practical creator workflows and repeatable quality checks.' },
  ]},
  { id: 'inclusive-creation', title: 'Accessible and Inclusive Content', level: 'All levels', category: 'Accessibility', description: 'Make content easier to understand and participate in through captions, descriptions, inclusive language and thoughtful design.', lessons: [
    { id: 'captions-transcripts', title: 'Create accurate captions and transcripts', minutes: 9, summary: 'Create accurate captions and transcripts through practical creator workflows and repeatable quality checks.' },
    { id: 'visual-accessibility', title: 'Improve visual and audio accessibility', minutes: 11, summary: 'Improve visual and audio accessibility through practical creator workflows and repeatable quality checks.' },
    { id: 'inclusive-community', title: 'Build inclusive participation', minutes: 9, summary: 'Build inclusive participation through practical creator workflows and repeatable quality checks.' },
  ]},
];

// Introductory curriculum is authored and bundled with the app; progress remains account-scoped in Firestore.
const COURSES: Course[] = BASE_COURSES.map(course => ({
  ...course,
  lessons: course.lessons.map(lesson => ({ ...lesson, ...CREATOR_ACADEMY_LESSONS[lesson.id] })),
}));

type Progress = { courseId: string; completedLessonIds: string[] };
type MentorshipSession = { sessionId: string; title: string; description: string; startsAt: string; durationMinutes: number; capacity: number; bookedCount: number; seatsAvailable: number; mentorId: string; mentorName: string; mentorUsername: string; isBooked: boolean };

export default function CreatorAcademyView({ currentUser }: { currentUser: User }) {
  const [progress, setProgress] = useState<Record<string, string[]>>({});
  const [lessonNotes, setLessonNotes] = useState<Record<string, string>>({});
  const [savedNoteIds, setSavedNoteIds] = useState<string[]>([]);
  const [savingNoteId, setSavingNoteId] = useState<string | null>(null);
  const [noteMessage, setNoteMessage] = useState('');
  const [courses, setCourses] = useState<Course[]>(COURSES);
  const [institutionalDetails, setInstitutionalDetails] = useState<Record<string, { lessons: Lesson[]; assessments: Assessment[] }>>({});
  const [selectedCourse, setSelectedCourse] = useState(COURSES[0].id);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [catalogError, setCatalogError] = useState('');
  const [catalogTruncated, setCatalogTruncated] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [isInstructor, setIsInstructor] = useState(false);
  const [assessmentAnswers, setAssessmentAnswers] = useState<Record<string, number[]>>({});
  const [assessmentResult, setAssessmentResult] = useState<{ courseId: string; assessmentId: string; scorePercent: number; passed: boolean; attemptId: string } | null>(null);
  const [certificate, setCertificate] = useState<{ courseId: string; assessmentId: string; certificateId: string; verificationCode: string; courseTitle: string } | null>(null);
  const [assessmentBusy, setAssessmentBusy] = useState(false);
  const [assessmentError, setAssessmentError] = useState('');
  const [mentorshipSessions, setMentorshipSessions] = useState<MentorshipSession[]>([]);
  const [mentorshipTruncated, setMentorshipTruncated] = useState(false);
  const [mentorshipLoading, setMentorshipLoading] = useState(true);
  const [mentorshipError, setMentorshipError] = useState('');
  const [mentorshipNotice, setMentorshipNotice] = useState('');
  const [bookingSessionId, setBookingSessionId] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoading(true);
      setMentorshipLoading(true);
      setLoadError(false);
      setProgress({});
      setLessonNotes({});
      setSavedNoteIds([]);
      setNoteMessage('');
      const progressQuery = query(collection(db, 'academyProgress'), where('userId', '==', currentUser.id), limit(100));
      const notesQuery = query(collection(db, 'academyLessonNotes'), where('userId', '==', currentUser.id), limit(100));
      const [progressResult, catalogResult, instructorResult, mentorshipResult, notesResult] = await Promise.allSettled([
        getDocs(progressQuery),
        httpsCallable<void, { courses: Array<{ id: string; title: string; description: string; level: string; category: string; lessonCount: number; version: number }>; truncated: boolean }>(functions, 'academyListPublishedCourses')(),
        getDoc(doc(db, 'academyInstructors', currentUser.id)),
        httpsCallable<void, { sessions: MentorshipSession[]; truncated: boolean }>(functions, 'academyListMentorshipSessions')(),
        getDocs(notesQuery),
      ]);
      if (!active) return;
      if (notesResult.status === 'fulfilled') {
        const nextNotes: Record<string, string> = {};
        const nextSavedNoteIds: string[] = [];
        notesResult.value.docs.forEach(item => {
          const data = item.data();
          nextSavedNoteIds.push(item.id);
          if (typeof data.courseId === 'string' && typeof data.lessonId === 'string' && typeof data.note === 'string') {
            nextNotes[data.courseId + ':' + data.lessonId] = data.note;
          }
        });
        setLessonNotes(nextNotes);
        setSavedNoteIds(nextSavedNoteIds);
      } else setNoteMessage('Your saved study notes could not be loaded.');
      if (progressResult.status === 'fulfilled') {
        const next: Record<string, string[]> = {};
        progressResult.value.docs.forEach(item => {
          const data = item.data() as Progress & { userId?: string };
          if (typeof data.courseId === 'string' && Array.isArray(data.completedLessonIds)) {
            next[data.courseId] = data.completedLessonIds.filter(id => typeof id === 'string');
          }
        });
        setProgress(next);
      } else setLoadError(true);
      if (catalogResult.status === 'fulfilled') {
        const catalog = catalogResult.value.data;
        const published = catalog.courses.map(course => ({ ...course, lessons: [], institutional: true }));
        const localIds = new Set(COURSES.map(course => course.id));
        setCourses([...COURSES, ...published.filter(course => !localIds.has(course.id))]);
        setCatalogTruncated(catalog.truncated);
      } else setCatalogError('Published institutional courses could not be loaded. Your introductory curriculum is still available.');
      if (instructorResult.status === 'fulfilled') {
        const instructor = instructorResult.value;
        setIsInstructor(instructor.exists() && instructor.data().status === 'active'
          && ['instructor', 'editor', 'admin'].includes(String(instructor.data().role || '')));
      }
      if (mentorshipResult.status === 'fulfilled') {
        setMentorshipSessions(mentorshipResult.value.data.sessions);
        setMentorshipTruncated(mentorshipResult.value.data.truncated);
      } else setMentorshipError('Upcoming mentorship sessions could not be loaded.');
      setMentorshipLoading(false);
      setLoading(false);
    };
    void load();
    return () => { active = false; };
  }, [currentUser.id]);

  const activeCourse = courses.find(course => course.id === selectedCourse) ?? courses[0] ?? COURSES[0];
  useEffect(() => {
    if (!activeCourse.institutional || institutionalDetails[activeCourse.id]) { setDetailLoading(false); return; }
    let active = true;
    setDetailLoading(true);
    setCatalogError('');
    const load = async () => {
      try {
        const result = await httpsCallable<{ courseId: string }, { lessons: Array<{ id: string; title: string; body: string; transcript?: string; resourceUrls?: string[]; order: number }>; assessments: Assessment[] }>(functions, 'academyGetPublishedCourse')({ courseId: activeCourse.id });
        if (!active) return;
        const lessons = result.data.lessons.map(lesson => ({
          id: lesson.id, title: lesson.title, body: lesson.body, transcript: lesson.transcript || '',
          resourceUrls: lesson.resourceUrls || [], summary: lesson.body.slice(0, 220),
        }));
        setInstitutionalDetails(previous => ({ ...previous, [activeCourse.id]: { lessons, assessments: result.data.assessments || [] } }));
      } catch {
        if (active) setCatalogError('This published course could not be opened. Please retry.');
      } finally { if (active) setDetailLoading(false); }
    };
    void load();
    return () => { active = false; };
  }, [activeCourse.id, activeCourse.institutional, institutionalDetails]);

  useEffect(() => { setAssessmentResult(null); setCertificate(null); setAssessmentError(''); }, [selectedCourse]);

  const activeDetails = institutionalDetails[activeCourse.id];
  const displayLessons = activeDetails?.lessons ?? activeCourse.lessons;
  const assessments = activeDetails?.assessments ?? [];
  const completedLessons = Object.values(progress).reduce((total, ids) => total + ids.length, 0);
  const totalLessons = courses.reduce((total, course) => total + (course.institutional ? Number(course.lessonCount || 0) : course.lessons.length), 0);
  const completedCourses = courses.filter(course => {
    const total = course.institutional ? Number(course.lessonCount || 0) : course.lessons.length;
    return total > 0 && (progress[course.id] ?? []).length >= total;
  }).length;
  const overallProgress = useMemo(() => totalLessons ? Math.min(100, Math.round(completedLessons / totalLessons * 100)) : 0, [completedLessons, totalLessons]);

  const saveLessonNote = async (course: Course, lesson: Lesson) => {
    const key = course.id + ':' + lesson.id;
    const noteId = currentUser.id + '_' + course.id.length + '_' + course.id + '_' + lesson.id.length + '_' + lesson.id;
    const note = lessonNotes[key] || '';
    if (savingNoteId) return;
    setSavingNoteId(key);
    setNoteMessage('');
    try {
      const ref = doc(db, 'academyLessonNotes', noteId);
      if (note.trim()) {
        await setDoc(ref, { userId: currentUser.id, courseId: course.id, lessonId: lesson.id, note: note.slice(0, 5000), updatedAt: serverTimestamp(), schemaVersion: 1 });
        setSavedNoteIds(previous => previous.includes(noteId) ? previous : [...previous, noteId]);
        setNoteMessage('Study note saved to your account.');
      } else {
        if (savedNoteIds.includes(noteId)) await deleteDoc(ref);
        setSavedNoteIds(previous => previous.filter(id => id !== noteId));
        setNoteMessage('Study note cleared.');
      }
    } catch {
      setNoteMessage('Your study note could not be saved. Please try again.');
    } finally { setSavingNoteId(null); }
  };

  const markLessonComplete = async (course: Course, lesson: Lesson) => {
    if (saving) return;
    const existing = progress[course.id] ?? [];
    if (existing.includes(lesson.id)) return;
    setSaving(lesson.id);
    try {
      const result = await httpsCallable<
        { courseId: string; lessonId: string },
        { completedLessonIds: string[] }
      >(functions, 'academyCompleteLesson')({ courseId: course.id, lessonId: lesson.id });
      setProgress(previous => ({ ...previous, [course.id]: result.data.completedLessonIds }));
    } catch {
      window.dispatchEvent(new CustomEvent('toast', { detail: 'Your lesson progress could not be saved. Please try again.' }));
    } finally {
      setSaving(null);
    }
  };

  const submitAssessment = async (assessment: Assessment) => {
    const answers = assessmentAnswers[activeCourse.id + ':' + assessment.id] || [];
    if (assessmentBusy || answers.length !== assessment.questions.length || answers.some(answer => !Number.isInteger(answer) || answer < 0)) {
      setAssessmentError('Choose one answer for every question before submitting.');
      return;
    }
    setAssessmentBusy(true); setAssessmentError(''); setAssessmentResult(null); setCertificate(null);
    try {
      const result = await httpsCallable<{ courseId: string; assessmentId: string; answers: number[] }, { attemptId: string; scorePercent: number; passed: boolean }>(functions, 'academySubmitAssessment')({
        courseId: activeCourse.id, assessmentId: assessment.id, answers,
      });
      setAssessmentResult({ courseId: activeCourse.id, assessmentId: assessment.id, ...result.data });
    } catch (cause) {
      setAssessmentError(cause instanceof Error ? cause.message : 'The assessment could not be submitted.');
    } finally { setAssessmentBusy(false); }
  };

  const bookMentorship = async (sessionId: string) => {
    if (bookingSessionId) return;
    setBookingSessionId(sessionId); setMentorshipError(''); setMentorshipNotice('');
    try {
      await httpsCallable<{ sessionId: string }, { sessionId: string; booked: boolean; bookedCount: number }>(functions, 'academyBookMentorshipSession')({ sessionId });
      setMentorshipNotice('Your place is booked. The session capacity has been updated.');
      try {
        const refreshed = await httpsCallable<void, { sessions: MentorshipSession[]; truncated: boolean }>(functions, 'academyListMentorshipSessions')();
        setMentorshipSessions(refreshed.data.sessions);
        setMentorshipTruncated(refreshed.data.truncated);
      } catch { setMentorshipError('Your booking succeeded, but the session list could not refresh.'); }
    } catch (cause) {
      setMentorshipError(cause instanceof Error ? cause.message : 'This mentorship session could not be booked.');
    } finally { setBookingSessionId(null); }
  };

  const requestCertificate = async (assessmentId: string) => {
    if (assessmentBusy) return;
    setAssessmentBusy(true); setAssessmentError('');
    try {
      const result = await httpsCallable<{ courseId: string; assessmentId: string }, { certificateId: string; verificationCode: string; courseTitle: string }>(functions, 'academyIssueCertificate')({
        courseId: activeCourse.id, assessmentId,
      });
      const verification = await httpsCallable<{ verificationCode: string }, { valid: boolean }>(functions, 'academyVerifyCertificate')({
        verificationCode: result.data.verificationCode,
      });
      if (!verification.data.valid) throw new Error('The new credential did not pass independent verification.');
      setCertificate({ courseId: activeCourse.id, assessmentId, ...result.data });
    } catch (cause) {
      setAssessmentError(cause instanceof Error ? cause.message : 'Your certificate could not be issued.');
    } finally { setAssessmentBusy(false); }
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6 pb-16 text-white">
      <section className="relative overflow-hidden rounded-3xl border border-violet-400/20 bg-gradient-to-br from-violet-950/80 via-[#100c2b] to-[#080b18] p-6 md:p-8">
        <div className="pointer-events-none absolute -right-16 -top-24 h-64 w-64 rounded-full bg-violet-600/15 blur-3xl" />
        <div className="relative flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <div className="max-w-2xl space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-violet-300/20 bg-violet-400/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-violet-200"><GraduationCap size={14}/> NEXORA INSTITUTE</div>
            <h2 className="text-3xl font-black tracking-tight md:text-4xl">The Creator Academy</h2>
            <p className="max-w-xl text-sm leading-6 text-violet-100/70">A structured learning institution for creators. Learn the craft, build your community and develop a sustainable creator career.</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl border border-white/10 bg-black/20 p-4"><p className="text-2xl font-black">{completedCourses}<span className="text-sm text-white/40">/{courses.length}</span></p><p className="mt-1 text-[10px] font-bold uppercase tracking-wider text-white/50">Courses completed</p></div>
            <div className="rounded-2xl border border-white/10 bg-black/20 p-4"><p className="text-2xl font-black">{overallProgress}%</p><p className="mt-1 text-[10px] font-bold uppercase tracking-wider text-white/50">Learning progress</p></div>
          </div>
        </div>
        <div className="relative mt-6 h-2 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-400 transition-all" style={{ width: overallProgress + '%' }}/></div>
        {loadError && <p role="status" className="relative mt-3 text-xs text-amber-200">We couldn't load your saved progress. Your courses remain available; reconnect and refresh to sync progress.</p>}
        {catalogError && <p role="status" className="relative mt-3 text-xs text-amber-200">{catalogError}</p>}
        {catalogTruncated && <p className="relative mt-2 text-[10px] text-amber-200">Showing the first 50 published institutional courses.</p>}
      </section>

      <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <section className="space-y-3">
          <div className="flex items-center justify-between"><div><h3 className="text-lg font-extrabold">Learning paths</h3><p className="text-xs text-white/45">A curriculum designed for every stage.</p></div><span className="text-xs text-white/40">{courses.length} courses</span></div>
          <div className="space-y-2">
            {courses.map(course => {
              const done = (progress[course.id] ?? []).length;
              const lessonTotal = course.institutional ? Number(course.lessonCount || 0) : course.lessons.length;
              const percent = lessonTotal ? Math.min(100, Math.round(done / lessonTotal * 100)) : 0;
              const active = selectedCourse === course.id;
              return <button key={course.id} onClick={() => setSelectedCourse(course.id)} className={'w-full rounded-2xl border p-4 text-left transition-all ' + (active ? 'border-violet-400/50 bg-violet-500/10' : 'border-white/8 bg-[#0b1020] hover:border-white/20')}>
                <div className="flex items-start justify-between gap-3"><div><p className="text-[9px] font-black uppercase tracking-[0.18em] text-violet-300">{course.category} · {course.level}</p><h4 className="mt-1 text-sm font-bold">{course.title}</h4></div><ChevronRight size={16} className={active ? 'text-violet-300' : 'text-white/30'}/></div>
                <div className="mt-3 flex items-center gap-3"><div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-violet-500" style={{ width: percent + '%' }}/></div><span className="text-[10px] text-white/45">{done}/{lessonTotal}</span></div>
              </button>;
            })}
          </div>
        </section>

        <section className="rounded-3xl border border-white/10 bg-[#0b1020] p-5 md:p-6">
          <div className="flex items-center gap-2 text-violet-300"><BookOpen size={17}/><span className="text-[10px] font-black uppercase tracking-[0.18em]">Course curriculum</span></div>
          <h3 className="mt-3 text-xl font-black">{activeCourse.title}</h3>
          <p className="mt-2 text-sm leading-6 text-white/55">{activeCourse.description}</p>
          {activeCourse.institutional && <p className="mt-2 text-[10px] font-bold uppercase tracking-wider text-violet-300">Published institutional course · Version {activeCourse.version || 1}</p>}
          {detailLoading && <p className="mt-3 text-xs text-violet-200/60">Loading approved course lessons…</p>}
          <div className="mt-5 space-y-2">
            {displayLessons.map((lesson, index) => {
              const done = (progress[activeCourse.id] ?? []).includes(lesson.id);
              return <article key={lesson.id} className="rounded-2xl border border-white/8 bg-white/[0.025] p-4">
                <div className="flex items-start gap-3">
                  <div className={'mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-xs font-black ' + (done ? 'bg-emerald-400/15 text-emerald-300' : 'bg-violet-500/15 text-violet-200')}>{done ? <CheckCircle2 size={17}/> : String(index + 1).padStart(2, '0')}</div>
                  <div className="min-w-0 flex-1"><h4 className="text-sm font-bold">{lesson.title}</h4><p className="mt-1 text-xs leading-5 text-white/50">{lesson.summary}</p>{lesson.minutes && <div className="mt-2 flex items-center gap-1 text-[10px] text-white/35"><Clock3 size={12}/>{lesson.minutes} min</div>}
                    {lesson.body && <p className="mt-3 whitespace-pre-wrap text-xs leading-6 text-white/65">{lesson.body}</p>}
                    {lesson.objectives && <div className="mt-3 rounded-xl border border-white/8 bg-black/20 p-3"><p className="text-[10px] font-black uppercase tracking-wider text-violet-200">What you will learn</p><ul className="mt-2 list-disc space-y-1 pl-4 text-xs leading-5 text-white/55">{lesson.objectives.map(objective => <li key={objective}>{objective}</li>)}</ul></div>}
                    {lesson.exercise && <div className="mt-3 rounded-xl border border-violet-400/15 bg-violet-500/[0.06] p-3"><p className="text-[10px] font-black uppercase tracking-wider text-violet-200">Practical assignment</p><p className="mt-2 text-xs leading-5 text-white/65">{lesson.exercise}</p></div>}
                    {lesson.reflection && <p className="mt-3 text-xs italic leading-5 text-white/45">Reflect: {lesson.reflection}</p>}
                    <div className="mt-4 border-t border-white/8 pt-3"><label htmlFor={'academy-note-' + lesson.id} className="text-[10px] font-black uppercase tracking-wider text-white/55">Your private study notes</label><textarea id={'academy-note-' + lesson.id} value={lessonNotes[activeCourse.id + ':' + lesson.id] || ''} maxLength={5000} onChange={event => setLessonNotes(previous => ({ ...previous, [activeCourse.id + ':' + lesson.id]: event.target.value }))} rows={3} placeholder="Write your own notes, examples or next steps…" className="mt-2 w-full resize-y rounded-xl border border-white/10 bg-black/25 p-3 text-xs leading-5 text-white placeholder:text-white/25 focus:border-violet-400/40 focus:outline-none"/><div className="mt-2 flex items-center justify-between gap-3"><span className="text-[10px] text-white/30">{(lessonNotes[activeCourse.id + ':' + lesson.id] || '').length}/5000 · Private to your account</span><button type="button" disabled={savingNoteId !== null} onClick={() => void saveLessonNote(activeCourse, lesson)} className="rounded-lg border border-violet-400/25 px-3 py-2 text-[10px] font-bold text-violet-200 disabled:opacity-40">{savingNoteId === activeCourse.id + ':' + lesson.id ? 'Saving…' : 'Save notes'}</button></div></div>
                    {lesson.transcript && <details className="mt-3"><summary className="cursor-pointer text-[10px] font-bold text-violet-200">Accessible transcript</summary><p className="mt-2 whitespace-pre-wrap text-xs leading-5 text-white/55">{lesson.transcript}</p></details>}
                    {lesson.resourceUrls?.map(url => <a key={url} href={url} target="_blank" rel="noreferrer" className="mt-2 mr-3 inline-block text-[10px] text-violet-300 underline">Open lesson resource</a>)}</div>
                  <button disabled={done || saving !== null || loading} onClick={() => void markLessonComplete(activeCourse, lesson)} className={'shrink-0 rounded-xl px-3 py-2 text-[10px] font-bold transition-colors disabled:cursor-default ' + (done ? 'text-emerald-300' : 'bg-violet-600 text-white hover:bg-violet-500 disabled:opacity-50')}>{done ? 'Completed' : saving === lesson.id ? 'Saving…' : 'Complete'}</button>
                </div>
              </article>;
            })}
          </div>
          {noteMessage && <p role="status" className="mt-3 text-xs text-violet-200/80">{noteMessage}</p>}
          {activeCourse.institutional && (
            <section className="mt-6 space-y-4 border-t border-white/10 pt-5">
              <div><h4 className="text-sm font-black text-white">Published assessments</h4><p className="mt-1 text-xs text-white/45">Questions are supplied without answer keys. NEXORA grades your submission on the server.</p></div>
              {assessmentError && <p role="alert" className="rounded-xl border border-rose-400/20 bg-rose-500/5 p-3 text-xs text-rose-200">{assessmentError}</p>}
              {assessments.length === 0 ? <p className="rounded-xl border border-dashed border-white/10 p-4 text-xs text-white/40">This course has no published assessment yet.</p> : assessments.map(assessment => (
                <article key={assessment.id} className="space-y-4 rounded-2xl border border-white/10 bg-black/20 p-4">
                  <div className="flex items-center justify-between gap-3"><h5 className="text-sm font-bold text-white">Course assessment</h5><span className="text-[10px] text-violet-200">Pass mark {assessment.passPercent}%</span></div>
                  {assessment.questions.map((question,index) => (
                    <div key={question.id} className="space-y-2">
                      <p className="text-xs font-semibold text-white">{index+1}. {question.prompt}</p>
                      <div className="grid gap-2 sm:grid-cols-2">{question.options.map((option,optionIndex) => {
                        const chosen = (assessmentAnswers[activeCourse.id + ':' + assessment.id] || [])[index] === optionIndex;
                        return <button key={optionIndex} type="button" aria-pressed={chosen} onClick={() => setAssessmentAnswers(previous => {
                          const answerKey = activeCourse.id + ':' + assessment.id;
                          const next = [...(previous[answerKey] || Array(assessment.questions.length).fill(-1))];
                          while(next.length < assessment.questions.length) next.push(-1);
                          next[index] = optionIndex;
                          return { ...previous, [answerKey]: next };
                        })} className={'rounded-xl border px-3 py-2 text-left text-xs transition-colors '+(chosen?'border-violet-400/50 bg-violet-500/15 text-white':'border-white/10 bg-white/[0.02] text-white/60 hover:border-white/20')}>{option}</button>;
                      })}</div>
                    </div>
                  ))}
                  <div className="flex flex-wrap items-center gap-2"><button type="button" disabled={assessmentBusy} onClick={()=>void submitAssessment(assessment)} className="min-h-10 rounded-xl bg-violet-600 px-4 text-xs font-bold text-white disabled:opacity-40">{assessmentBusy?'Submitting…':'Submit assessment'}</button>
                    {assessmentResult?.courseId===activeCourse.id && assessmentResult?.assessmentId===assessment.id && <span className={'text-xs font-bold '+(assessmentResult.passed?'text-emerald-300':'text-amber-200')}>{assessmentResult.scorePercent}% · {assessmentResult.passed?'Passed':'Not passed yet'}</span>}
                    {assessmentResult?.courseId===activeCourse.id && assessmentResult?.assessmentId===assessment.id && assessmentResult.passed && <button type="button" disabled={assessmentBusy} onClick={()=>void requestCertificate(assessment.id)} className="min-h-10 rounded-xl border border-violet-400/30 px-4 text-xs font-bold text-violet-200 disabled:opacity-40">Request certificate</button>}
                  </div>
                  {certificate && certificate.courseId===activeCourse.id && certificate.assessmentId===assessment.id && assessmentResult?.courseId===activeCourse.id && assessmentResult?.assessmentId===assessment.id && <div className="rounded-xl border border-emerald-400/20 bg-emerald-500/5 p-3"><p className="text-xs font-bold text-emerald-200">Verified credential issued</p><p className="mt-1 text-[10px] text-white/50">{certificate.courseTitle} · {certificate.certificateId}</p><p className="mt-2 break-all font-mono text-xs text-white">{certificate.verificationCode}</p><p className="mt-1 text-[10px] text-white/40">Keep this code for independent certificate verification.</p></div>}
                </article>
              ))}
            </section>
          )}
          <div className="mt-5 flex items-start gap-3 rounded-2xl border border-violet-400/15 bg-violet-500/5 p-4"><Sparkles size={17} className="mt-0.5 shrink-0 text-violet-300"/><p className="text-xs leading-5 text-white/55">Your learning record syncs to your NEXORA account. Institutional assessments are server graded, and credentials are issued only after a passing result. Introductory lessons record progress but do not automatically award certificates.</p></div>
        </section>
      </div>

      <section className="space-y-4 rounded-3xl border border-white/10 bg-[#0b1020] p-5 md:p-6">
        <div className="flex flex-wrap items-end justify-between gap-3"><div><div className="flex items-center gap-2 text-violet-300"><GraduationCap size={17}/><span className="text-[10px] font-black uppercase tracking-[0.18em]">Mentorship programme</span></div><h3 className="mt-2 text-lg font-black text-white">Upcoming mentor sessions</h3><p className="mt-1 text-xs text-white/45">Book a place in a scheduled session. Seat limits are enforced transactionally.</p></div><span className="text-[10px] text-white/40">{mentorshipSessions.length} listed</span></div>
        {mentorshipNotice && <p role="status" className="rounded-xl border border-emerald-400/20 bg-emerald-500/5 p-3 text-xs text-emerald-200">{mentorshipNotice}</p>}
        {mentorshipError && <p role="alert" className="rounded-xl border border-amber-300/20 bg-amber-400/5 p-3 text-xs text-amber-100">{mentorshipError}</p>}
        {mentorshipLoading ? <p className="rounded-xl border border-dashed border-white/10 p-5 text-xs text-white/40">Loading upcoming sessions…</p> : mentorshipSessions.length === 0 ? <p className="rounded-xl border border-dashed border-white/10 p-5 text-xs text-white/40">There are no upcoming sessions with available seats right now.</p> : <div className="grid gap-3 md:grid-cols-2">{mentorshipSessions.map(session => <article key={session.sessionId} className="rounded-2xl border border-white/10 bg-black/20 p-4"><div className="flex items-start justify-between gap-3"><div><h4 className="text-sm font-bold text-white">{session.title}</h4><p className="mt-1 text-[10px] text-violet-200">{session.mentorName}{session.mentorUsername?' · @'+session.mentorUsername:''}</p></div><span className="rounded-lg bg-violet-500/10 px-2 py-1 text-[10px] text-violet-200">{session.seatsAvailable} seats</span></div><p className="mt-3 text-xs leading-5 text-white/55">{session.description}</p><p className="mt-3 text-[10px] text-white/40">{new Date(session.startsAt).toLocaleString([], {dateStyle:'medium',timeStyle:'short'})} · {session.durationMinutes} minutes</p><button type="button" disabled={bookingSessionId!==null || session.isBooked} onClick={()=>void bookMentorship(session.sessionId)} className="mt-4 min-h-10 w-full rounded-xl border border-violet-400/30 bg-violet-500/10 text-xs font-bold text-violet-100 disabled:opacity-40">{bookingSessionId===session.sessionId?'Booking…':session.isBooked?'Already booked':'Book this session'}</button></article>)}</div>}
        {mentorshipTruncated && <p className="text-[10px] text-amber-200">Showing a bounded list of the first 50 scheduled sessions.</p>}
      </section>

      <CreatorAcademyToolkit userId={currentUser.id} />

      <section className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-white/8 bg-[#0b1020] p-4"><div className="flex items-center gap-2 text-violet-300"><Award size={17}/><span className="text-xs font-bold">Institutional learning record</span></div><p className="mt-2 text-xs leading-5 text-white/45">Your completed lessons are saved against your account. Eligible courses can connect this learning record to assessed credentials and mentorship.</p></div>
        <div className="rounded-2xl border border-white/8 bg-[#0b1020] p-4"><div className="flex items-center gap-2 text-violet-300"><GraduationCap size={17}/><span className="text-xs font-bold">Built for long-term growth</span></div><p className="mt-2 text-xs leading-5 text-white/45">The curriculum covers craft, audience, community, live production, analytics, business, brand and creator safety.</p></div>
      </section>
      {loading && <p className="text-center text-xs text-white/35">Syncing your learning record…</p>}
      {isInstructor && <CreatorAcademyInstitutionTools />}
    </div>
  );
}
