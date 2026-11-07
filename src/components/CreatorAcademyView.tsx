import React, { useEffect, useMemo, useState } from 'react';
import { Award, BookOpen, CheckCircle2, ChevronRight, Clock3, GraduationCap, Sparkles } from 'lucide-react';
import { collection, doc, getDocs, limit, query, serverTimestamp, setDoc, where } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { User } from '../types';\nimport CreatorAcademyInstitutionTools from './CreatorAcademyInstitutionTools';

type Lesson = { id: string; title: string; minutes: number; summary: string };
type Course = { id: string; title: string; level: string; category: string; description: string; lessons: Lesson[] };

const COURSES: Course[] = [
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
];

type Progress = { courseId: string; completedLessonIds: string[] };

export default function CreatorAcademyView({ currentUser }: { currentUser: User }) {
  const [progress, setProgress] = useState<Record<string, string[]>>({});
  const [selectedCourse, setSelectedCourse] = useState(COURSES[0].id);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoading(true);
      setLoadError(false);
      try {
        const q = query(collection(db, 'academyProgress'), where('userId', '==', currentUser.id), limit(50));
        const snapshot = await getDocs(q);
        if (!active) return;
        const next: Record<string, string[]> = {};
        snapshot.docs.forEach(item => {
          const data = item.data() as Progress & { userId?: string };
          if (typeof data.courseId === 'string' && Array.isArray(data.completedLessonIds)) {
            next[data.courseId] = data.completedLessonIds.filter(id => typeof id === 'string');
          }
        });
        setProgress(next);
      } catch {
        if (active) setLoadError(true);
      } finally {
        if (active) setLoading(false);
      }
    };
    void load();
    return () => { active = false; };
  }, [currentUser.id]);

  const activeCourse = COURSES.find(course => course.id === selectedCourse) ?? COURSES[0];
  const completedLessons = Object.values(progress).reduce((total, ids) => total + ids.length, 0);
  const totalLessons = COURSES.reduce((total, course) => total + course.lessons.length, 0);
  const completedCourses = COURSES.filter(course => course.lessons.every(lesson => (progress[course.id] ?? []).includes(lesson.id))).length;
  const overallProgress = useMemo(() => totalLessons ? Math.round(completedLessons / totalLessons * 100) : 0, [completedLessons, totalLessons]);

  const markLessonComplete = async (course: Course, lesson: Lesson) => {
    if (saving) return;
    const existing = progress[course.id] ?? [];
    if (existing.includes(lesson.id)) return;
    const updated = [...existing, lesson.id];
    setSaving(lesson.id);
    try {
      await setDoc(doc(db, 'academyProgress', currentUser.id + '_' + course.id), {
        userId: currentUser.id,
        courseId: course.id,
        completedLessonIds: updated,
        updatedAt: serverTimestamp(),
        schemaVersion: 1,
      }, { merge: true });
      setProgress(previous => ({ ...previous, [course.id]: updated }));
    } catch {
      window.dispatchEvent(new CustomEvent('toast', { detail: 'Your lesson progress could not be saved. Please try again.' }));
    } finally {
      setSaving(null);
    }
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
            <div className="rounded-2xl border border-white/10 bg-black/20 p-4"><p className="text-2xl font-black">{completedCourses}<span className="text-sm text-white/40">/{COURSES.length}</span></p><p className="mt-1 text-[10px] font-bold uppercase tracking-wider text-white/50">Courses completed</p></div>
            <div className="rounded-2xl border border-white/10 bg-black/20 p-4"><p className="text-2xl font-black">{overallProgress}%</p><p className="mt-1 text-[10px] font-bold uppercase tracking-wider text-white/50">Learning progress</p></div>
          </div>
        </div>
        <div className="relative mt-6 h-2 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-400 transition-all" style={{ width: overallProgress + '%' }}/></div>
        {loadError && <p role="status" className="relative mt-3 text-xs text-amber-200">We couldn't load your saved progress. Your courses remain available; reconnect and refresh to sync progress.</p>}
      </section>

      <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <section className="space-y-3">
          <div className="flex items-center justify-between"><div><h3 className="text-lg font-extrabold">Learning paths</h3><p className="text-xs text-white/45">A curriculum designed for every stage.</p></div><span className="text-xs text-white/40">{COURSES.length} courses</span></div>
          <div className="space-y-2">
            {COURSES.map(course => {
              const done = (progress[course.id] ?? []).length;
              const percent = Math.round(done / course.lessons.length * 100);
              const active = selectedCourse === course.id;
              return <button key={course.id} onClick={() => setSelectedCourse(course.id)} className={'w-full rounded-2xl border p-4 text-left transition-all ' + (active ? 'border-violet-400/50 bg-violet-500/10' : 'border-white/8 bg-[#0b1020] hover:border-white/20')}>
                <div className="flex items-start justify-between gap-3"><div><p className="text-[9px] font-black uppercase tracking-[0.18em] text-violet-300">{course.category} · {course.level}</p><h4 className="mt-1 text-sm font-bold">{course.title}</h4></div><ChevronRight size={16} className={active ? 'text-violet-300' : 'text-white/30'}/></div>
                <div className="mt-3 flex items-center gap-3"><div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-violet-500" style={{ width: percent + '%' }}/></div><span className="text-[10px] text-white/45">{done}/{course.lessons.length}</span></div>
              </button>;
            })}
          </div>
        </section>

        <section className="rounded-3xl border border-white/10 bg-[#0b1020] p-5 md:p-6">
          <div className="flex items-center gap-2 text-violet-300"><BookOpen size={17}/><span className="text-[10px] font-black uppercase tracking-[0.18em]">Course curriculum</span></div>
          <h3 className="mt-3 text-xl font-black">{activeCourse.title}</h3>
          <p className="mt-2 text-sm leading-6 text-white/55">{activeCourse.description}</p>
          <div className="mt-5 space-y-2">
            {activeCourse.lessons.map((lesson, index) => {
              const done = (progress[activeCourse.id] ?? []).includes(lesson.id);
              return <article key={lesson.id} className="rounded-2xl border border-white/8 bg-white/[0.025] p-4">
                <div className="flex items-start gap-3">
                  <div className={'mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-xs font-black ' + (done ? 'bg-emerald-400/15 text-emerald-300' : 'bg-violet-500/15 text-violet-200')}>{done ? <CheckCircle2 size={17}/> : String(index + 1).padStart(2, '0')}</div>
                  <div className="min-w-0 flex-1"><h4 className="text-sm font-bold">{lesson.title}</h4><p className="mt-1 text-xs leading-5 text-white/50">{lesson.summary}</p><div className="mt-2 flex items-center gap-1 text-[10px] text-white/35"><Clock3 size={12}/>{lesson.minutes} min</div></div>
                  <button disabled={done || saving !== null || loading} onClick={() => void markLessonComplete(activeCourse, lesson)} className={'shrink-0 rounded-xl px-3 py-2 text-[10px] font-bold transition-colors disabled:cursor-default ' + (done ? 'text-emerald-300' : 'bg-violet-600 text-white hover:bg-violet-500 disabled:opacity-50')}>{done ? 'Completed' : saving === lesson.id ? 'Saving…' : 'Complete'}</button>
                </div>
              </article>;
            })}
          </div>
          <div className="mt-5 flex items-start gap-3 rounded-2xl border border-violet-400/15 bg-violet-500/5 p-4"><Sparkles size={17} className="mt-0.5 shrink-0 text-violet-300"/><p className="text-xs leading-5 text-white/55">Your learning record syncs to your NEXORA account. Formal certificates and assessed credentials will only be issued after verified assessments are implemented.</p></div>
        </section>
      </div>

      <section className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-white/8 bg-[#0b1020] p-4"><div className="flex items-center gap-2 text-violet-300"><Award size={17}/><span className="text-xs font-bold">Institutional learning record</span></div><p className="mt-2 text-xs leading-5 text-white/45">Your completed lessons are saved against your account, ready for future assessments, mentorship and verified certificates.</p></div>
        <div className="rounded-2xl border border-white/8 bg-[#0b1020] p-4"><div className="flex items-center gap-2 text-violet-300"><GraduationCap size={17}/><span className="text-xs font-bold">Built for long-term growth</span></div><p className="mt-2 text-xs leading-5 text-white/45">The curriculum covers craft, audience, community, live production, analytics, business, brand and creator safety.</p></div>
      </section>
      {loading && <p className="text-center text-xs text-white/35">Syncing your learning record…</p>}\n      <CreatorAcademyInstitutionTools />
    </div>
  );
}
