import React, { useState } from 'react';
import { httpsCallable } from 'firebase/functions';
import { auth, functions } from '../lib/firebase';

type Result = Record<string, any>;

export default function CreatorAcademyInstitutionTools() {
  const [courseId, setCourseId] = useState('');
  const [courseTitle, setCourseTitle] = useState('');
  const [courseDescription, setCourseDescription] = useState('');
  const [category, setCategory] = useState('Creator skills');
  const [level, setLevel] = useState('Beginner');
  const [lessonId, setLessonId] = useState('lesson-1');
  const [lessonTitle, setLessonTitle] = useState('');
  const [lessonBody, setLessonBody] = useState('');
  const [lessonTranscript, setLessonTranscript] = useState('');
  const [assessmentId, setAssessmentId] = useState('final-assessment');
  const [assessmentQuestions, setAssessmentQuestions] = useState(JSON.stringify([
    { prompt: 'What should a creator establish first?', options: ['Audience value', 'A random price'], correctIndex: 0 },
    { prompt: 'How should sponsorships be handled?', options: ['Hide them', 'Disclose them'], correctIndex: 1 },
    { prompt: 'What supports a sustainable creator business?', options: ['A clear value proposition', 'Chasing every trend'], correctIndex: 0 },
  ], null, 2));
  const [certificateId, setCertificateId] = useState('');
  const [answers, setAnswers] = useState('0,1,0');
  const [verificationCode, setVerificationCode] = useState('');
  const [sessionId, setSessionId] = useState('');
  const [sessionTitle, setSessionTitle] = useState('Creator growth office hours');
  const [sessionDescription, setSessionDescription] = useState('A focused mentoring session for creators.');
  const [startsAt, setStartsAt] = useState('');
  const [tutorQuestion, setTutorQuestion] = useState('');
  const [tutorLessonIds, setTutorLessonIds] = useState('lesson-1');
  const [output, setOutput] = useState<Result | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const invoke = async (name: string, payload: Result) => {
    setBusy(true); setError(''); setOutput(null);
    try {
      const callable = httpsCallable<Result, Result>(functions, name);
      const result = await callable(payload);
      setOutput(result.data);
      if (result.data.courseId) setCourseId(result.data.courseId);
      if (result.data.sessionId) setSessionId(result.data.sessionId);
      if (result.data.verificationCode) setVerificationCode(result.data.verificationCode);
      if (result.data.certificateId) setCertificateId(result.data.certificateId);
      return result.data;
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'The Academy request could not be completed.');
      return null;
    } finally { setBusy(false); }
  };

  const askTutor = async () => {
    setBusy(true); setError(''); setOutput(null);
    try {
      const user = auth.currentUser;
      if (!user) throw new Error('Sign in to use the Creator Tutor.');
      const token = await user.getIdToken();
      const response = await fetch('/api/voh-ai/creator-tutor', {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
        body: JSON.stringify({ courseId, lessonIds: tutorLessonIds.split(',').map(value => value.trim()).filter(Boolean).slice(0, 4), message: tutorQuestion }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'The Creator Tutor is unavailable.');
      setOutput(data);
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'The Creator Tutor is unavailable.'); }
    finally { setBusy(false); }
  };

  return <section className="mt-8 space-y-5 rounded-3xl border border-violet-400/20 bg-[#090d1b] p-5 md:p-6">
    <div>
      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-violet-300">NEXORA INSTITUTE SERVICES</p>
      <h3 className="mt-2 text-xl font-black text-white">Institution workspace</h3>
      <p className="mt-1 text-xs leading-5 text-white/50">Course publishing, exams, credentials, the VOH AI Creator Tutor and mentor sessions use trusted server services. Instructor actions require an active Academy role.</p>
    </div>

    <div className="grid gap-4 lg:grid-cols-2">
      <div className="space-y-3 rounded-2xl border border-white/10 bg-white/[0.025] p-4">
        <h4 className="text-sm font-bold text-white">1. Course authoring</h4>
        <input value={courseId} onChange={e => setCourseId(e.target.value)} placeholder="Course ID (leave blank to create)" className="w-full rounded-xl border border-white/10 bg-black/30 p-3 text-xs text-white"/>
        <input value={courseTitle} onChange={e => setCourseTitle(e.target.value)} placeholder="Course title" className="w-full rounded-xl border border-white/10 bg-black/30 p-3 text-xs text-white"/>
        <textarea value={courseDescription} onChange={e => setCourseDescription(e.target.value)} placeholder="Course description (20–1,200 characters)" rows={3} className="w-full rounded-xl border border-white/10 bg-black/30 p-3 text-xs text-white"/>
        <div className="grid grid-cols-2 gap-2">
          <input value={category} onChange={e => setCategory(e.target.value)} placeholder="Category" className="min-w-0 rounded-xl border border-white/10 bg-black/30 p-3 text-xs text-white"/>
          <select value={level} onChange={e => setLevel(e.target.value)} className="min-w-0 rounded-xl border border-white/10 bg-black/30 p-3 text-xs text-white"><option>Beginner</option><option>Intermediate</option><option>Advanced</option><option>All levels</option></select>
        </div>
        <button disabled={busy} onClick={() => void invoke('academySaveCourseDraft', { ...(courseId ? { courseId } : {}), title: courseTitle, description: courseDescription, category, level })} className="rounded-xl bg-violet-600 px-4 py-2.5 text-xs font-bold text-white disabled:opacity-50">Save course draft</button>
        <div className="border-t border-white/10 pt-3">
          <p className="mb-2 text-xs font-bold text-violet-200">Lesson editor</p>
          <div className="grid grid-cols-2 gap-2">
            <input value={lessonId} onChange={e => setLessonId(e.target.value)} placeholder="Lesson ID" className="min-w-0 rounded-xl border border-white/10 bg-black/30 p-3 text-xs text-white"/>
            <input type="number" min="0" max="100" defaultValue="0" id="academy-lesson-order" className="min-w-0 rounded-xl border border-white/10 bg-black/30 p-3 text-xs text-white" aria-label="Lesson order"/>
          </div>
          <input value={lessonTitle} onChange={e => setLessonTitle(e.target.value)} placeholder="Lesson title" className="mt-2 w-full rounded-xl border border-white/10 bg-black/30 p-3 text-xs text-white"/>
          <textarea value={lessonBody} onChange={e => setLessonBody(e.target.value)} placeholder="Full lesson content (30–20,000 characters)" rows={5} className="mt-2 w-full rounded-xl border border-white/10 bg-black/30 p-3 text-xs text-white"/>
          <textarea value={lessonTranscript} onChange={e => setLessonTranscript(e.target.value)} placeholder="Accessible transcript (optional)" rows={2} className="mt-2 w-full rounded-xl border border-white/10 bg-black/30 p-3 text-xs text-white"/>
          <button disabled={busy || !courseId} onClick={() => {
            const order = Number((document.getElementById('academy-lesson-order') as HTMLInputElement | null)?.value || 0);
            void invoke('academySaveLesson', { courseId, lessonId, title: lessonTitle, body: lessonBody, transcript: lessonTranscript, order });
          }} className="mt-2 rounded-xl bg-violet-600/80 px-4 py-2.5 text-xs font-bold text-white disabled:opacity-50">Save lesson</button>
          <button disabled={busy || !courseId} onClick={() => void invoke('academySubmitCourseForReview', { courseId })} className="ml-2 rounded-xl border border-violet-400/30 px-4 py-2.5 text-xs font-bold text-violet-200 disabled:opacity-50">Submit for review</button>
          <button disabled={busy || !courseId} onClick={() => void invoke('academyReviewCourse', { courseId, decision: 'approve', note: 'Approved through Academy editorial workspace.' })} className="ml-2 rounded-xl border border-emerald-400/30 px-4 py-2.5 text-xs font-bold text-emerald-200 disabled:opacity-50">Approve (editor)</button>
        </div>
      </div>

      <div className="space-y-3 rounded-2xl border border-white/10 bg-white/[0.025] p-4">
        <h4 className="text-sm font-bold text-white">2. Assessments and credentials</h4>
        <input value={assessmentId} onChange={e => setAssessmentId(e.target.value)} placeholder="Assessment ID" className="w-full rounded-xl border border-white/10 bg-black/30 p-3 text-xs text-white"/>
        <p className="text-[11px] leading-5 text-white/45">Create and publish a question bank through the trusted Academy assessment service. Correct answers remain server-side.</p>
        <textarea value={assessmentQuestions} onChange={e => setAssessmentQuestions(e.target.value)} rows={6} className="w-full rounded-xl border border-white/10 bg-black/30 p-3 font-mono text-[10px] text-white" aria-label="Assessment question JSON"/>
        <button disabled={busy || !courseId} onClick={() => { try { void invoke('academyCreateAssessment', { courseId, assessmentId, passPercent: 70, questions: JSON.parse(assessmentQuestions) }); } catch { setError('Assessment questions must be valid JSON.'); } }} className="rounded-xl bg-violet-600/80 px-4 py-2.5 text-xs font-bold text-white disabled:opacity-50">Save question bank</button>
        <button disabled={busy || !courseId} onClick={() => void invoke('academyPublishAssessment', { courseId, assessmentId })} className="rounded-xl bg-violet-600 px-4 py-2.5 text-xs font-bold text-white disabled:opacity-50">Publish assessment</button>
        <div className="border-t border-white/10 pt-3">
          <p className="text-xs font-bold text-violet-200">Take an assessment</p>
          <input value={answers} onChange={e => setAnswers(e.target.value)} placeholder="Answer indexes, e.g. 0,1,2" className="mt-2 w-full rounded-xl border border-white/10 bg-black/30 p-3 text-xs text-white"/>
          <button disabled={busy || !courseId} onClick={() => void invoke('academySubmitAssessment', { courseId, assessmentId, answers: answers.split(',').map(v => Number(v.trim())) })} className="mt-2 rounded-xl bg-violet-600 px-4 py-2.5 text-xs font-bold text-white disabled:opacity-50">Submit answers</button>
          <button disabled={busy || !courseId} onClick={() => void invoke('academyIssueCertificate', { courseId, assessmentId })} className="ml-2 mt-2 rounded-xl border border-violet-400/30 px-4 py-2.5 text-xs font-bold text-violet-200 disabled:opacity-50">Issue my certificate</button>
        </div>
        <div className="border-t border-white/10 pt-3">
          <p className="text-xs font-bold text-violet-200">Verify a certificate</p>
          <input value={verificationCode} onChange={e => setVerificationCode(e.target.value)} placeholder="24-character verification code" className="mt-2 w-full rounded-xl border border-white/10 bg-black/30 p-3 text-xs text-white"/>
          <button disabled={busy || !verificationCode} onClick={() => void invoke('academyVerifyCertificate', { verificationCode })} className="mt-2 rounded-xl border border-white/15 px-4 py-2.5 text-xs font-bold text-white disabled:opacity-50">Verify credential</button>
          <input value={certificateId} onChange={e => setCertificateId(e.target.value)} placeholder="Certificate ID for admin revocation" className="mt-2 w-full rounded-xl border border-white/10 bg-black/30 p-3 text-xs text-white"/>
          <button disabled={busy || !certificateId} onClick={() => void invoke('academyRevokeCertificate', { certificateId, reason: 'Credential review and revocation requested by an Academy administrator.' })} className="mt-2 rounded-xl border border-red-400/30 px-4 py-2.5 text-xs font-bold text-red-200 disabled:opacity-50">Revoke (admin)</button>
        </div>
      </div>

      <div className="space-y-3 rounded-2xl border border-white/10 bg-white/[0.025] p-4">
        <h4 className="text-sm font-bold text-white">3. VOH AI Creator Tutor</h4>
        <p className="text-xs leading-5 text-white/45">Ask questions using only approved, published Academy lesson material. Answers include lesson-source references and must acknowledge gaps.</p>
        <input value={tutorLessonIds} onChange={e => setTutorLessonIds(e.target.value)} placeholder="Lesson IDs, comma separated" className="w-full rounded-xl border border-white/10 bg-black/30 p-3 text-xs text-white"/>
        <textarea value={tutorQuestion} onChange={e => setTutorQuestion(e.target.value)} placeholder="Ask a question about your selected lessons…" rows={3} className="w-full rounded-xl border border-white/10 bg-black/30 p-3 text-xs text-white"/>
        <button disabled={busy || !courseId || !tutorQuestion.trim()} onClick={() => void askTutor()} className="rounded-xl bg-violet-600 px-4 py-2.5 text-xs font-bold text-white disabled:opacity-50">Ask VOH AI Tutor</button>
      </div>

      <div className="space-y-3 rounded-2xl border border-white/10 bg-white/[0.025] p-4">
        <h4 className="text-sm font-bold text-white">4. Mentorship and masterclasses</h4>
        <input value={sessionTitle} onChange={e => setSessionTitle(e.target.value)} placeholder="Session title" className="w-full rounded-xl border border-white/10 bg-black/30 p-3 text-xs text-white"/>
        <textarea value={sessionDescription} onChange={e => setSessionDescription(e.target.value)} placeholder="Session description" rows={2} className="w-full rounded-xl border border-white/10 bg-black/30 p-3 text-xs text-white"/>
        <input type="datetime-local" value={startsAt} onChange={e => setStartsAt(e.target.value)} className="w-full rounded-xl border border-white/10 bg-black/30 p-3 text-xs text-white"/>
        <button disabled={busy || !startsAt} onClick={() => void invoke('academyCreateMentorshipSession', { title: sessionTitle, description: sessionDescription, startsAt: new Date(startsAt).toISOString(), durationMinutes: 30, capacity: 20 })} className="rounded-xl bg-violet-600 px-4 py-2.5 text-xs font-bold text-white disabled:opacity-50">Schedule mentor session</button>
        <div className="border-t border-white/10 pt-3">
          <input value={sessionId} onChange={e => setSessionId(e.target.value)} placeholder="Session ID to book" className="w-full rounded-xl border border-white/10 bg-black/30 p-3 text-xs text-white"/>
          <button disabled={busy || !sessionId} onClick={() => void invoke('academyBookMentorshipSession', { sessionId })} className="mt-2 rounded-xl border border-violet-400/30 px-4 py-2.5 text-xs font-bold text-violet-200 disabled:opacity-50">Book this session</button>
        </div>
      </div>
    </div>

    {busy && <p role="status" className="text-xs text-violet-200">Processing securely…</p>}
    {error && <p role="alert" className="rounded-xl border border-red-400/20 bg-red-500/5 p-3 text-xs text-red-200">{error}</p>}
    {output && <div className="rounded-2xl border border-violet-400/20 bg-violet-500/5 p-4">
      <p className="text-xs font-bold text-violet-200">Service response</p>
      {typeof output.text === 'string' ? <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-white/85">{output.text}</p> : <pre className="mt-2 overflow-x-auto whitespace-pre-wrap break-words text-[11px] leading-5 text-white/75">{JSON.stringify(output, null, 2)}</pre>}
      {Array.isArray(output.citations) && <ul className="mt-3 space-y-1 text-[11px] text-violet-200">{output.citations.map((citation: any) => <li key={citation.lessonId}>Source: {citation.title}</li>)}</ul>}
    </div>}
  </section>;
}
