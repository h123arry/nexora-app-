import React, { useState, useEffect } from 'react';
import { User as UserIcon, Shield, Search, Ban, CheckCircle, RotateCcw, Trash2, AlertTriangle, BarChart2, Activity, Globe, Users, FileText, Sparkles, Zap, RefreshCw, TrendingUp, Award, UserPlus, Copy } from 'lucide-react';
import { User, Post, Report, CrashLog } from '../types';
import { collection, getDocs, query, where, limit } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { auth, db } from '../lib/firebase';
import { apiRequestUrl } from '../lib/apiBaseUrl';
import { reviewModerationReport } from '../services/dataService';
import GiftEarningsFinancePanel from './GiftEarningsFinancePanel';

type IdentityReviewApplication = {
  userId: string;
  identityType: 'individual' | 'creator' | 'public_figure' | 'organization';
  displayName: string;
  evidenceSummary: string;
  evidenceUrls: string[];
  version: number;
  submittedAt: string | null;
  reviewSignals?: { possibleNameCollision?: boolean; nameCollisionCount?: number; duplicateEvidenceLinkCount?: number; evidenceScanMayBeIncomplete?: boolean } | null;
};
type IdentityReviewDecision = 'approved' | 'rejected' | 'needs_more_info';
type IdentityImpersonationCase = {
  userId: string;
  status: string;
  independentReportCount: number;
  hasVerifiedIdentity: boolean;
  verifiedDisplayName: string | null;
  openedAt: string | null;
  reports: Array<{ category: string; explanation: string; createdAt: string | null }>;
};


interface AdminDashboardViewProps {
  currentUser: User;
  posts: Post[];
  onRemovePost: (postId: string) => void;
  lang: any;
}

export default function AdminDashboardView({
  currentUser,
  posts,
  onRemovePost,
  lang
}: AdminDashboardViewProps) {
  // Navigation tabs of Dashboard
  const [activeSubTab, setActiveSubTab] = useState<'users' | 'founding' | 'moderation' | 'identity' | 'analytics' | 'finance' | 'audit' | 'health'>('users');
  
  // Loaded state
  const [users, setUsers] = useState<User[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [identityApplications, setIdentityApplications] = useState<IdentityReviewApplication[]>([]);
  const [impersonationCases, setImpersonationCases] = useState<IdentityImpersonationCase[]>([]);
  const [impersonationCaseNotes, setImpersonationCaseNotes] = useState<Record<string, string>>({});
  const [identityQueueState, setIdentityQueueState] = useState<'idle' | 'loading' | 'ready' | 'unavailable'>('idle');
  const [identityReviewNotes, setIdentityReviewNotes] = useState<Record<string, string>>({});
  const [crashLogs, setCrashLogs] = useState<CrashLog[]>([]);
  const [searchUserQuery, setSearchUserQuery] = useState('');
  const [accessState, setAccessState] = useState<'checking' | 'granted' | 'denied'>('checking');
  const [canManageUsers, setCanManageUsers] = useState(false);
  const [canManageRoles, setCanManageRoles] = useState(false);
  const [canReviewIdentity, setCanReviewIdentity] = useState(false);
  const [userDirectoryUnavailable, setUserDirectoryUnavailable] = useState(false);
  
  // Analytics timeframe
  const [timeframe, setTimeframe] = useState<'24h' | '7d' | '30d'>('7d');
  const [analyticsState, setAnalyticsState] = useState<'loading' | 'ready' | 'unavailable'>('loading');
  const [analyticsPoints, setAnalyticsPoints] = useState<Array<{ day: string; available: boolean; totalEvents: number | null; uniqueActorsObserved: number | null; byType: Record<string, number> | null; partial: boolean | null }>>([]);
  const [financeState, setFinanceState] = useState<'idle' | 'loading' | 'ready' | 'denied' | 'unavailable'>('idle');
  const [financeSummary, setFinanceSummary] = useState<{ providerConfigured: boolean; transactions: unknown[]; checkoutAttempts: unknown[]; webhookFailures: unknown[] } | null>(null);
  const [auditState, setAuditState] = useState<'idle' | 'loading' | 'ready' | 'denied' | 'unavailable'>('idle');
  const [auditEvents, setAuditEvents] = useState<Array<{ id: string; actorUid: string; targetUid: string; action: string; previousRole?: string; newRole?: string; createdAt: string | null }>>([]);
  const [foundingEmail, setFoundingEmail] = useState('');
  const [foundingFullName, setFoundingFullName] = useState('');
  const [foundingUsername, setFoundingUsername] = useState('');
  const [foundingProvisioning, setFoundingProvisioning] = useState(false);
  const [foundingError, setFoundingError] = useState('');
  const [foundingResult, setFoundingResult] = useState<{ uid: string; email: string; username: string; passwordResetLink: string } | null>(null);
  const [manualVerificationUserId, setManualVerificationUserId] = useState('');
  const [manualVerificationIdentityType, setManualVerificationIdentityType] = useState<IdentityReviewApplication['identityType']>('individual');
  const [manualVerificationDisplayName, setManualVerificationDisplayName] = useState('');
  const [manualVerificationEvidenceSummary, setManualVerificationEvidenceSummary] = useState('');
  const [manualVerificationEvidenceUrls, setManualVerificationEvidenceUrls] = useState('');
  const [manualVerificationBusy, setManualVerificationBusy] = useState(false);


  // Load and refresh administrative data
  const loadData = async () => {
    // 1. Load the protected user directory through a trusted callable.
    try {
      const result = await httpsCallable<void, {
        users: User[];
        permissions: { canManage: boolean; canManageRoles: boolean };
      }>(getFunctions(), 'listAdminUsers')();
      setUsers(result.data.users);
      setCanManageUsers(result.data.permissions.canManage);
      setCanManageRoles(result.data.permissions.canManageRoles);
      setUserDirectoryUnavailable(false);
    } catch (error) {
      console.warn('Protected user directory unavailable:', error);
      setUsers([]);
      setCanManageUsers(false);
      setCanManageRoles(false);
      setUserDirectoryUnavailable(true);
    }
    
    // 2. Load reports from the authoritative moderation queue. Reporter identity
    // and private evidence are intentionally not copied into this UI model.
    try {
      const snap = await getDocs(query(collection(db, 'moderationReports'), where('status', 'in', ['pending', 'under_review', 'escalated']), limit(100)));
      setReports(snap.docs.map(reportDoc => {
        const data = reportDoc.data();
        const createdAt = data.createdAt?.toDate?.()?.toISOString?.() || '';
        return {
          id: reportDoc.id,
          reporterUsername: 'protected reporter',
          targetType: data.targetType,
          targetId: data.targetId,
          targetContent: 'Private evidence is available only through authorized review services.',
          reason: data.category || 'Other',
          comment: data.explanation || '',
          timestamp: createdAt,
          status: data.status,
        } as Report;
      }));
    } catch (error) {
      console.warn('Moderation queue unavailable:', error);
      setReports([]);
    }

    // Load private identity review queues through reviewer-only callables.
    setIdentityQueueState('loading');
    try {
      const result = await httpsCallable<void, { applications: IdentityReviewApplication[] }>(getFunctions(), 'listIdentityVerificationApplications')();
      setIdentityApplications(result.data.applications || []);
      const caseResult = await httpsCallable<void, { cases: IdentityImpersonationCase[] }>(getFunctions(), 'listIdentityImpersonationCases')();
      setImpersonationCases(caseResult.data.cases || []);
      setIdentityQueueState('ready');
    } catch (error) {
      console.warn('Identity review queue unavailable:', error);
      setIdentityApplications([]);
      setImpersonationCases([]);
      setIdentityQueueState('unavailable');
    }

    // 4. Load Crash & Health data
    const savedCrashes = localStorage.getItem('nexora_crash_logs');
    if (savedCrashes) {
      try {
        setCrashLogs(JSON.parse(savedCrashes));
      } catch (e) {
        console.error(e);
        setCrashLogs([]);
      }
    } else {
      setCrashLogs([]);
    }
  };

  useEffect(() => {
    auth.currentUser?.getIdTokenResult().then(({ claims }) => {
      const role = typeof claims.role === 'string' ? claims.role : '';
      const granted = claims.moderator === true || claims.admin === true || ['moderator', 'senior_moderator', 'admin', 'founder'].includes(role);
      setAccessState(granted ? 'granted' : 'denied');
      setCanManageUsers(claims.admin === true || ['admin', 'founder'].includes(role));
      setCanManageRoles(claims.founder === true || role === 'founder');
      setCanReviewIdentity(claims.admin === true || claims.founder === true || ['senior_moderator', 'admin', 'founder'].includes(role));
      if (granted) void loadData();
    }).catch(() => setAccessState('denied'));
  }, []);

  useEffect(() => {
    if (accessState !== 'granted') return;
    const days = timeframe === '24h' ? 1 : timeframe === '30d' ? 30 : 7;
    setAnalyticsState('loading');
    void httpsCallable<{ days: number }, { points?: typeof analyticsPoints }>(getFunctions(), 'getPlatformAnalytics')({ days })
      .then(result => {
        setAnalyticsPoints(result.data.points || []);
        setAnalyticsState('ready');
      })
      .catch(() => {
        setAnalyticsPoints([]);
        setAnalyticsState('unavailable');
      });
  }, [accessState, timeframe]);

  useEffect(() => {
    if (activeSubTab !== 'finance' || accessState !== 'granted') return;
    setFinanceState('loading');
    void httpsCallable<void, typeof financeSummary>(getFunctions(), 'getFinanceOverview')()
      .then(result => {
        setFinanceSummary(result.data);
        setFinanceState('ready');
      })
      .catch((error: any) => {
        setFinanceSummary(null);
        setFinanceState(error?.code === 'functions/permission-denied' ? 'denied' : 'unavailable');
      });
  }, [activeSubTab, accessState]);

  useEffect(() => {
    if (activeSubTab !== 'audit' || accessState !== 'granted') return;
    if (!canManageUsers) {
      setAuditState('denied');
      setAuditEvents([]);
      return;
    }
    let active = true;
    setAuditState('loading');
    void httpsCallable<void, { events: typeof auditEvents }>(getFunctions(), 'listAdminAuditEvents')()
      .then(result => {
        if (!active) return;
        setAuditEvents(result.data.events);
        setAuditState('ready');
      })
      .catch((error: any) => {
        if (!active) return;
        setAuditEvents([]);
        setAuditState(error?.code === 'functions/permission-denied' ? 'denied' : 'unavailable');
      });
    return () => { active = false; };
  }, [activeSubTab, accessState, canManageUsers]);

  const analyticsTotals = analyticsPoints.reduce((totals, point) => {
    if (!point.available) return totals;
    totals.events += point.totalEvents || 0;
    totals.actorDays += point.uniqueActorsObserved || 0;
    totals.impressions += point.byType?.content_impression || 0;
    totals.engagements += point.byType?.meaningful_interaction || 0;
    return totals;
  }, { events: 0, actorDays: 0, impressions: 0, engagements: 0 });

  // All privileged user changes go through authenticated, audited Admin SDK callables.
  const runUserAction = async (payload: { action: string; targetUid: string; enabled?: boolean; role?: string }, successMessage: string) => {
    try {
      await httpsCallable<typeof payload, { updated: boolean }>(getFunctions(), 'updateAdminUser')(payload);
      await loadData();
      window.dispatchEvent(new CustomEvent('toast', { detail: successMessage }));
    } catch (error) {
      const code = (error as { code?: string })?.code || '';
      window.dispatchEvent(new CustomEvent('toast', {
        detail: code.includes('permission-denied')
          ? 'Your administrator permission does not allow this action.'
          : error instanceof Error ? error.message : 'The account update could not be completed.',
      }));
    }
  };

  const handleCreateFoundingMember = async () => {
    if (!canManageUsers || foundingProvisioning) return;
    setFoundingProvisioning(true);
    setFoundingError('');
    setFoundingResult(null);
    try {
      const result = await httpsCallable<
        { email: string; fullName: string; username: string },
        { created: boolean; uid: string; email: string; username: string; passwordResetLink: string; cohort: string }
      >(getFunctions(), 'createFoundingMemberAccount')({
        email: foundingEmail,
        fullName: foundingFullName,
        username: foundingUsername,
      });
      setFoundingResult(result.data);
      setFoundingEmail('');
      setFoundingFullName('');
      setFoundingUsername('');
      await loadData();
      window.dispatchEvent(new CustomEvent('toast', { detail: 'Founding member account created.' }));
    } catch (error) {
      setFoundingError(error instanceof Error ? error.message : 'The founding member account could not be created.');
    } finally {
      setFoundingProvisioning(false);
    }
  };

  const handleToggleBan = (user: User) => {
    void runUserAction(
      { action: 'ban', targetUid: user.id, enabled: !user.isBanned },
      user.isBanned ? `Ban lifted for @${user.username}.` : `@${user.username} has been banned.`,
    );
  };

  const handleToggleSuspend = (user: User) => {
    void runUserAction(
      { action: 'suspend', targetUid: user.id, enabled: !user.isSuspended },
      user.isSuspended ? `Suspension lifted for @${user.username}.` : `@${user.username} has been suspended.`,
    );
  };

  const handleToggleAdminRole = (user: User) => {
    if (!canManageRoles) {
      window.dispatchEvent(new CustomEvent('toast', { detail: 'Only the founder can change administrator roles.' }));
      return;
    }
    if (user.username === 'voh') {
      window.dispatchEvent(new CustomEvent('toast', { detail: 'The founder role is protected.' }));
      return;
    }
    void runUserAction(
      { action: 'role', targetUid: user.id, role: user.role === 'admin' ? 'user' : 'admin' },
      user.role === 'admin' ? `@${user.username} is now a standard user.` : `@${user.username} is now an administrator.`,
    );
  };

  const handleResetReputation = (user: User) => {
    void runUserAction(
      { action: 'reset_reputation', targetUid: user.id },
      `Account points reset for @${user.username}.`,
    );
  };

  // Resolve moderation reports
  const handleResolveReport = async (reportId: string, action: 'dismiss' | 'restrict_posting') => {
    try {
      await reviewModerationReport(reportId, action, action === 'dismiss' ? 'Insufficient evidence after review.' : 'Policy-backed posting restriction applied.');
      setReports(prev => prev.map(report => report.id === reportId ? { ...report, status: action === 'dismiss' ? 'resolved' : 'resolved' } : report));
      window.dispatchEvent(new CustomEvent('toast', { detail: action === 'dismiss' ? 'Report dismissed after review.' : 'Posting restriction applied after review.' }));
    } catch (error) {
      window.dispatchEvent(new CustomEvent('toast', { detail: error instanceof Error ? error.message : 'Moderation action could not be completed.' }));
    }
  };

  const handleIdentityReview = async (userId: string, decision: IdentityReviewDecision) => {
    const reviewNote = identityReviewNotes[userId] || '';
    if (decision !== 'approved' && reviewNote.trim().length < 5) {
      window.dispatchEvent(new CustomEvent('toast', { detail: 'Add a review note of at least five characters before requesting changes or rejecting.' }));
      return;
    }
    try {
      await httpsCallable<{ userId: string; decision: IdentityReviewDecision; reviewNote: string }, { accepted: boolean }>(
        getFunctions(), 'reviewIdentityVerificationApplication'
      )({ userId, decision, reviewNote });
      setIdentityApplications(previous => previous.filter(application => application.userId !== userId));
      setIdentityReviewNotes(previous => { const next = { ...previous }; delete next[userId]; return next; });
      window.dispatchEvent(new CustomEvent('toast', {
        detail: decision === 'approved' ? 'Identity confirmed and verified badge added.' : decision === 'rejected' ? 'Identity application rejected.' : 'Please send more proof of identity.',
      }));
    } catch (error) {
      window.dispatchEvent(new CustomEvent('toast', { detail: error instanceof Error ? error.message : 'Identity review could not be completed.' }));
    }
  };

  const handleGrantManualIdentityVerification = async () => {
    if (!canManageRoles || manualVerificationBusy) return;
    const evidenceUrls = manualVerificationEvidenceUrls.split(/\r?\n/).map(value => value.trim()).filter(Boolean);
    if (!manualVerificationUserId) {
      window.dispatchEvent(new CustomEvent('toast', { detail: 'Choose the account you want to verify.' }));
      return;
    }
    setManualVerificationBusy(true);
    try {
      const idToken = await auth.currentUser?.getIdToken();
      if (!idToken) throw new Error('Your sign-in session has expired. Sign in again and retry.');
      const response = await fetch(apiRequestUrl('/api/admin/identity-verification/manual'), {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${idToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: manualVerificationUserId,
          identityType: manualVerificationIdentityType,
          displayName: manualVerificationDisplayName,
          evidenceSummary: manualVerificationEvidenceSummary,
          evidenceUrls,
        }),
      });
      const result = await response.json().catch(() => ({})) as { error?: string; status?: string; accepted?: boolean };
      if (!response.ok) throw new Error(result.error || 'Manual identity verification could not be completed.');
      const target = users.find(user => user.id === manualVerificationUserId);
      window.dispatchEvent(new CustomEvent('toast', {
        detail: 'Identity verified for @' + (target?.username || manualVerificationUserId) + '. The violet badge is now active.',
      }));
      setManualVerificationUserId('');
      setManualVerificationDisplayName('');
      setManualVerificationEvidenceSummary('');
      setManualVerificationEvidenceUrls('');
      setManualVerificationIdentityType('individual');
    } catch (error) {
      window.dispatchEvent(new CustomEvent('toast', {
        detail: error instanceof Error ? error.message : 'Manual identity verification could not be completed.',
      }));
    } finally {
      setManualVerificationBusy(false);
    }
  };

  const handleImpersonationCaseReview = async (userId: string, decision: 'dismiss' | 'place_on_hold' | 'clear_hold' | 'confirm_impersonation') => {
    const reviewNote = impersonationCaseNotes[userId] || '';
    if (reviewNote.trim().length < 5) {
      window.dispatchEvent(new CustomEvent('toast', { detail: 'Add a review note of at least five characters.' }));
      return;
    }
    try {
      await httpsCallable<{ userId: string; decision: string; reviewNote: string }, { accepted: boolean }>(
        getFunctions(), 'reviewIdentityImpersonationCase'
      )({ userId, decision, reviewNote });
      setImpersonationCases(previous => previous.filter(item => item.userId !== userId));
      setImpersonationCaseNotes(previous => { const next = { ...previous }; delete next[userId]; return next; });
      if (decision === 'confirm_impersonation') setIdentityApplications(previous => previous.filter(item => item.userId !== userId));
      window.dispatchEvent(new CustomEvent('toast', { detail: decision === 'dismiss' ? 'Fake account report dismissed after review.' : 'Fake account report decision saved.' }));
    } catch (error) {
      window.dispatchEvent(new CustomEvent('toast', { detail: error instanceof Error ? error.message : 'Impersonation case review failed.' }));
    }
  };

  // Clear or resolve crash logs
  const handleResolveCrash = (logId: string) => {
    const updated = crashLogs.map(l => {
      if (l.id === logId) {
        return { ...l, status: 'resolved' as const };
      }
      return l;
    });
    localStorage.setItem('nexora_crash_logs', JSON.stringify(updated));
    setCrashLogs(updated);
    window.dispatchEvent(new CustomEvent('toast', { detail: '🔧 Bug report marked as fixed.' }));
  };

  // Filter list of users
  const filteredUsers = users.filter(u => 
    u.name.toLowerCase().includes(searchUserQuery.toLowerCase()) ||
    u.username.toLowerCase().includes(searchUserQuery.toLowerCase()) ||
    (u.email && u.email.toLowerCase().includes(searchUserQuery.toLowerCase()))
  );

  if (accessState === 'checking') {
    return <div className="rounded-2xl border border-white/10 bg-black/20 p-8 text-center text-sm text-zinc-400">Checking moderation permissions…</div>;
  }
  if (accessState === 'denied') {
    return <div className="rounded-2xl border border-rose-500/20 bg-rose-500/5 p-8 text-center text-sm text-rose-200">Moderation access is restricted to server-authorized reviewers.</div>;
  }

  return (
    <div id="admin-panel-viewport" className="space-y-6">
      
      {/* Header Banner */}
      <div className="p-6 rounded-3xl bg-linear-to-r from-red-950/40 via-purple-950/30 to-violet-950/20 border border-red-500/15 flex flex-col md:flex-row md:items-center justify-between gap-4 text-left">
        <div>
          <span className="text-lg font-extrabold tracking-tight nx-gradient-text leading-none select-none block mb-1">NEXORA</span>
          <div className="flex items-center gap-2">
            <span className="p-1 px-3 bg-red-500/15 border border-red-500/20 text-red-400 font-mono text-[8s] rounded-full uppercase tracking-wider font-extrabold">
              FOUNDER SECURITY CLEARANCE LEVEL 1
            </span>
          </div>
          <h2 className="text-xl md:text-2xl font-black text-rose-500 tracking-tight mt-1.5 font-sans">
            NEXORA Core Control Dashboard
          </h2>
          <p className="text-xs text-purple-200/50 font-sans mt-0.5 max-w-xl">
            You are logged in as <span className="font-bold text-rose-400 font-mono">@{currentUser.username}</span> (Founder). Reviewing posts, accounts, reputation points, and app status.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={loadData}
            className="flex items-center gap-1.5 p-2 bg-purple-950/30 hover:bg-purple-900/40 border border-purple-500/20 text-purple-300 hover:text-white rounded-xl text-xs font-mono tracking-wider transition-all cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5 animate-spin-reverse" />
            SYNC PROTOCOLS
          </button>
        </div>
      </div>

      {/* Sub-navigation Controls */}
      <div className="flex flex-wrap items-center gap-2 p-1.5 bg-black/40 border border-white/5 rounded-2xl">
        <button 
          onClick={() => setActiveSubTab('users')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-sans font-black tracking-wide transition-all cursor-pointer ${activeSubTab === 'users' ? 'bg-rose-600 border border-rose-500/30 text-white' : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/5'}`}
        >
          <Users className="w-3.5 h-3.5" />
          User Management
        </button>
        
        {canManageUsers && (
          <button
            onClick={() => setActiveSubTab('founding')}
            className={"flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-sans font-black tracking-wide transition-all cursor-pointer " + (activeSubTab === 'founding' ? 'bg-violet-600 border border-white/10 text-white' : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/5')}
          >
            <UserPlus className="w-3.5 h-3.5" />
            Founding 300
          </button>
        )}

        <button 
          onClick={() => setActiveSubTab('moderation')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-sans font-black tracking-wide transition-all cursor-pointer ${activeSubTab === 'moderation' ? 'bg-orange-600 border border-orange-500/30 text-white' : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/5'}`}
        >
          <AlertTriangle className="w-3.5 h-3.5" />
          Mod Reports ({reports.filter(r => r.status === 'pending').length})
        </button>

        <button
          onClick={() => setActiveSubTab('identity')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-sans font-black tracking-wide transition-all cursor-pointer ${activeSubTab === 'identity' ? 'bg-violet-600 border border-white/10 text-white' : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/5'}`}
        >
          <Shield className="w-3.5 h-3.5" />
          Identity Review ({identityApplications.length})
        </button>

        <button 
          onClick={() => setActiveSubTab('analytics')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-sans font-black tracking-wide transition-all cursor-pointer ${activeSubTab === 'analytics' ? 'bg-violet-600 border border-white/10 text-white' : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/5'}`}
        >
          <BarChart2 className="w-3.5 h-3.5" />
          App activity
        </button>

        <button
          onClick={() => setActiveSubTab('finance')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-sans font-black tracking-wide transition-all cursor-pointer ${activeSubTab === 'finance' ? 'bg-emerald-600 border border-emerald-500/30 text-white' : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/5'}`}
        >
          Finance Operations
        </button>

        <button
          onClick={() => setActiveSubTab('audit')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-sans font-black tracking-wide transition-all cursor-pointer ${activeSubTab === 'audit' ? 'bg-violet-600 border border-white/10 text-white' : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/5'}`}
        >
          <Shield className="w-3.5 h-3.5" />
          Change history
        </button>

        <button 
          onClick={() => setActiveSubTab('health')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-sans font-black tracking-wide transition-all cursor-pointer ${activeSubTab === 'health' ? 'bg-cyan-600 border border-cyan-500/30 text-white' : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/5'}`}
        >
          <Activity className="w-3.5 h-3.5" />
          App status
        </button>
      </div>

      {/* RENDER CONTENT PANES */}
      <div className="p-1">
        
        {activeSubTab === 'founding' && canManageUsers && (
          <div className="max-w-3xl space-y-5 p-4 text-left animate-fade-in">
            <div className="rounded-2xl border border-violet-500/20 bg-violet-500/5 p-5">
              <h3 className="text-sm font-black uppercase tracking-widest text-violet-200">Founding 300 account provisioning</h3>
              <p className="mt-2 text-xs leading-relaxed text-zinc-400">
                Create a real Firebase Authentication account from the trusted admin backend. NEXORA creates its private profile, public profile and username reservation together. The member receives a one-time password-reset link to set their own password.
              </p>
              <p className="mt-2 text-xs leading-relaxed text-amber-200/80">
                Transactional email delivery is not configured yet. Copy the reset link and share it privately with the invited member. Never post it publicly.
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="space-y-1.5 text-xs font-semibold text-zinc-300">
                Full name
                <input value={foundingFullName} onChange={event => setFoundingFullName(event.target.value)} maxLength={80} autoComplete="name" className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-3 text-sm text-white outline-none focus:border-violet-500" placeholder="Member’s full name" />
              </label>
              <label className="space-y-1.5 text-xs font-semibold text-zinc-300">
                Username
                <input value={foundingUsername} onChange={event => setFoundingUsername(event.target.value)} maxLength={20} autoComplete="off" className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-3 text-sm text-white outline-none focus:border-violet-500" placeholder="their.username" />
              </label>
              <label className="space-y-1.5 text-xs font-semibold text-zinc-300 sm:col-span-2">
                Email address
                <input type="email" value={foundingEmail} onChange={event => setFoundingEmail(event.target.value)} maxLength={254} autoComplete="email" className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-3 text-sm text-white outline-none focus:border-violet-500" placeholder="member@example.com" />
              </label>
            </div>
            {foundingError && <p role="alert" className="rounded-xl border border-rose-500/20 bg-rose-500/5 p-3 text-xs text-rose-200">{foundingError}</p>}
            <button
              onClick={() => void handleCreateFoundingMember()}
              disabled={foundingProvisioning || !foundingEmail.trim() || !foundingFullName.trim() || !foundingUsername.trim()}
              className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-5 py-3 text-xs font-black text-white transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <UserPlus className="h-4 w-4" />
              {foundingProvisioning ? 'Creating Firebase account…' : 'Create founding member account'}
            </button>
            {foundingResult && (
              <div className="space-y-3 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-5">
                <div>
                  <p className="text-sm font-black text-emerald-200">Firebase account created</p>
                  <p className="mt-1 text-xs text-zinc-300">{foundingResult.email} · @{foundingResult.username}</p>
                  <p className="mt-1 break-all font-mono text-[10px] text-zinc-500">UID: {foundingResult.uid}</p>
                  <p className="mt-2 text-xs text-zinc-400">The account now exists in Firebase Authentication → Users. Share this one-time reset link privately so the member can set their password, then sign in to NEXORA.</p>
                </div>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <input readOnly value={foundingResult.passwordResetLink} className="min-w-0 flex-1 rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-xs text-zinc-300" />
                  <button
                    onClick={() => void (navigator.clipboard?.writeText(foundingResult.passwordResetLink) || Promise.reject(new Error('Clipboard unavailable'))).then(
                      () => window.dispatchEvent(new CustomEvent('toast', { detail: 'Password reset link copied.' }))
                    ).catch(() => window.dispatchEvent(new CustomEvent('toast', { detail: 'Copy failed. Select and copy the link manually.' })))}
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-violet-500/30 px-4 py-2 text-xs font-bold text-violet-200 hover:bg-violet-500/10"
                  >
                    <Copy className="h-3.5 w-3.5" /> Copy reset link
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 1: USER MANAGEMENT */}
        {activeSubTab === 'users' && (
          <div className="space-y-4 text-left">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                <input 
                  type="text" 
                  placeholder="Search accounts by name, username or email..." 
                  value={searchUserQuery}
                  onChange={(e) => setSearchUserQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-black/40 border border-white/5 focus:border-rose-500/50 rounded-xl text-xs focus:outline-hidden text-white placeholder-zinc-500"
                />
              </div>
            </div>

            <div className="overflow-x-auto rounded-2xl border border-white/5 bg-black/25">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-black/50 border-b border-white/5 text-[9.5px] font-mono uppercase text-zinc-400 tracking-wider">
                    <th className="p-4">Account</th>
                    <th className="p-4">Verified status / role</th>
                    <th className="p-4">Account reputation</th>
                    <th className="p-4">Restriction status</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-xs font-sans text-white">
                  {filteredUsers.map((user) => (
                    <tr key={user.id} className="hover:bg-white/2 transition-colors">
                      <td className="p-4 flex items-center gap-3">
                        <img src={user.avatar} className="w-9 h-9 rounded-xl object-cover ring-1 ring-white/10" />
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-white block">{user.name}</span>
                            {user.username === 'voh' && <span className="bg-rose-500 text-[8px] font-mono font-bold uppercase p-0.5 px-1.5 rounded text-white leading-none">FOUNDER</span>}
                          </div>
                          <span className="text-[10px] text-zinc-400 block font-mono">@{user.username}</span>
                          {user.email && <span className="text-[9px] text-[#A78BFA] block mt-0.5">{user.email}</span>}
                        </div>
                      </td>
                      
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <span
                            title="Verification follows the account’s verified email or phone status."
                            className={`p-1.5 rounded-lg border text-[9.5px] font-mono font-black inline-flex items-center gap-1 uppercase ${user.isVerified ? 'bg-violet-950/40 text-violet-400 border-white/10' : 'bg-zinc-900 border-white/5 text-zinc-500'}`}
                          >
                            <CheckCircle className="w-3 h-3" />
                            {user.isVerified ? 'VERIFIED' : 'UNVERIFIED'}
                          </span>

                          <button 
                            onClick={() => handleToggleAdminRole(user)}
                            disabled={!canManageRoles}
                            className={`p-1.5 rounded-lg border text-[9.5px] font-mono font-black flex items-center gap-1 transition-all uppercase cursor-pointer ${user.role === 'admin' ? 'bg-rose-950/40 text-rose-400 border-rose-500/20' : 'bg-zinc-900 border-white/5 text-zinc-500 hover:text-white'}`}
                          >
                            <Shield className="w-3 h-3" />
                            {user.role === 'admin' ? 'ADMIN' : 'USER'}
                          </button>
                        </div>
                      </td>

                      <td className="p-4 font-mono text-[11px]">
                        <div className="flex items-center gap-2">
                          <span className="text-emerald-400 font-extrabold">{user.reputationPoints.toLocaleString()} PR</span>
                          <button 
                            onClick={() => handleResetReputation(user)}
                            disabled={!canManageUsers}
                            className="p-1 hover:bg-zinc-800 rounded text-amber-500 transition-all hover:scale-110 active:scale-95 cursor-pointer"
                            title="Reset account points to zero"
                          >
                            <RotateCcw className="w-3 h-3" />
                          </button>
                        </div>
                      </td>

                      <td className="p-4">
                        <div className="flex items-center gap-1.5">
                          {user.isBanned && <span className="bg-red-900/30 text-red-500 border border-red-500/10 text-[9px] font-mono uppercase px-2 py-0.5 rounded-lg font-bold">🚫 Banned</span>}
                          {user.isSuspended && <span className="bg-amber-900/30 text-amber-500 border border-amber-500/10 text-[9px] font-mono uppercase px-2 py-0.5 rounded-lg font-bold">⏳ Suspended</span>}
                          {!user.isBanned && !user.isSuspended && <span className="bg-emerald-950/30 text-emerald-400 border border-emerald-500/10 text-[9px] font-mono uppercase px-2 py-0.5 rounded-lg font-bold">● Active</span>}
                        </div>
                      </td>

                      <td className="p-4 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          <button 
                            onClick={() => handleToggleSuspend(user)}
                            disabled={!canManageUsers}
                            className={`p-1.5 rounded-lg text-[10px] font-bold font-sans cursor-pointer ${user.isSuspended ? 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-400'}`}
                            title="Suspend/Release Account"
                          >
                            {user.isSuspended ? 'Release' : 'Suspend'}
                          </button>
                          
                          <button 
                            onClick={() => handleToggleBan(user)}
                            disabled={!canManageUsers || user.username === 'voh'}
                            className={`p-1.5 rounded-lg text-[10px] font-bold font-sans cursor-pointer ${user.username === 'voh' ? 'opacity-30 cursor-not-allowed' : user.isBanned ? 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400' : 'bg-red-500/10 hover:bg-red-500/20 text-red-400'}`}
                          >
                            {user.isBanned ? 'Revoke Ban' : 'Ban Permanent'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredUsers.length === 0 && (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-zinc-500 font-mono text-[10.5px]">
                        {userDirectoryUnavailable ? 'Unable to load the user list. You may not have permission.' : 'No accounts match your search.'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 2: MODERATION REPORTS */}
        {activeSubTab === 'moderation' && (
          <div className="space-y-4 text-left">
            <h3 className="text-sm font-black text-rose-400 uppercase tracking-widest font-mono">
              PENDING SAFETY ALERTS & REPORTS
            </h3>
            
            <div className="grid grid-cols-1 gap-4">
              {reports.map((report) => (
                <div 
                  key={report.id} 
                  className={`p-5 rounded-2xl border flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all ${report.status === 'resolved' ? 'bg-[#060410]/50 border-white/5 opacity-50' : 'bg-[#0f0a14]/90 border-orange-500/20 shadow-md'}`}
                >
                  <div className="space-y-2 max-w-xl">
                    <div className="flex items-center gap-2 font-mono text-[10px]">
                      <span className="p-1 px-2.5 bg-orange-500/10 border border-orange-500/20 text-orange-400 font-bold rounded-lg uppercase">
                        Type: {report.targetType}
                      </span>
                      <span className="text-zinc-500">•</span>
                      <span className="text-zinc-400">Reporter: <span className="text-purple-400 font-bold">@{report.reporterUsername}</span></span>
                      <span className="text-zinc-500">•</span>
                      <span className="text-zinc-500">{report.timestamp}</span>
                    </div>

                    <div className="p-3 bg-black/40 border border-white/5 rounded-xl">
                      <span className="text-[10px] uppercase font-mono text-zinc-500 font-bold block mb-1">Reported Target Content Body:</span>
                      <p className="text-[11px] text-zinc-200 font-sans italic">"{report.targetContent}"</p>
                    </div>

                    <div className="space-y-1">
                      <div className="text-[11px] font-sans text-zinc-300">
                        <span className="font-bold text-orange-400 uppercase font-mono">Assertion Category:</span> {report.reason}
                      </div>
                      <div className="text-[11px] font-sans text-zinc-400">
                        <span className="font-extrabold uppercase font-mono text-zinc-500">Reporter Comments:</span> "{report.comment}"
                      </div>
                    </div>
                  </div>

                  <div className="flex md:flex-col items-stretch gap-2 shrink-0 justify-end">
                    {report.status !== 'resolved' ? (
                      <>
                        <button 
                          onClick={() => void handleResolveReport(report.id, 'restrict_posting')}
                          className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-mono text-[10px] font-bold rounded-xl cursor-pointer shadow-md inline-flex items-center justify-center gap-1"
                        >
                          <Ban className="w-3.5 h-3.5" />
                          Restrict Posting
                        </button>
                        
                        <button 
                          onClick={() => void handleResolveReport(report.id, 'dismiss')}
                          className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-white/5 font-mono text-[10px] font-bold rounded-xl cursor-pointer inline-flex items-center justify-center gap-1"
                        >
                          <CheckCircle className="w-3.5 h-3.5" />
                          Dismiss Report
                        </button>
                      </>
                    ) : (
                      <span className="text-emerald-400 font-mono text-[10px] font-bold uppercase flex items-center gap-1 p-2 bg-emerald-950/20 rounded-xl leading-none">
                        ✓ Resolved
                      </span>
                    )}
                  </div>
                </div>
              ))}
              {reports.length === 0 && (
                <div className="p-8 text-center text-zinc-500 font-mono text-[11px] py-12 border border-dashed border-white/5 rounded-2xl bg-black/10">
                  NO USER REPORTS IN MODERATION MATRIX QUEUE AT THIS MOMENT node.
                </div>
              )}
            </div>
          </div>
        )}

        {/* IDENTITY REVIEW */}
        {activeSubTab === 'identity' && (
          <div className="space-y-4 text-left">
            <div>
              <h3 className="text-sm font-black text-violet-300 uppercase tracking-widest font-mono">Identity verification queue</h3>
              <p className="mt-1 text-xs text-zinc-400">Review official public evidence independently. Email or phone verification is not proof of real-world identity.</p>
            </div>
            {canManageRoles && (
              <section className="space-y-3 rounded-2xl border border-violet-400/20 bg-violet-500/[0.035] p-4">
                <div>
                  <h3 className="text-sm font-black uppercase tracking-widest text-violet-200">Founder manual verification</h3>
                  <p className="mt-1 text-[11px] leading-relaxed text-zinc-400">For a specific account after you independently check its public identity evidence. This founder-only action creates the same verified identity record used by profile and content badges. Evidence is kept private and the decision is audited.</p>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="space-y-1 text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                    NEXORA account
                    <select value={manualVerificationUserId} onChange={event => {
                      const userId = event.target.value;
                      setManualVerificationUserId(userId);
                      setManualVerificationDisplayName(users.find(user => user.id === userId)?.name || '');
                    }} className="w-full rounded-xl border border-white/10 bg-black/35 px-3 py-3 text-xs normal-case text-white outline-none focus:border-violet-400/60">
                      <option value="">Select an account…</option>
                      {users.map(user => <option key={user.id} value={user.id}>@{user.username} · {user.name}</option>)}
                    </select>
                  </label>
                  <label className="space-y-1 text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                    Identity category
                    <select value={manualVerificationIdentityType} onChange={event => setManualVerificationIdentityType(event.target.value as IdentityReviewApplication['identityType'])} className="w-full rounded-xl border border-white/10 bg-black/35 px-3 py-3 text-xs normal-case text-white outline-none focus:border-violet-400/60">
                      <option value="individual">Individual</option>
                      <option value="creator">Creator</option>
                      <option value="public_figure">Public figure</option>
                      <option value="organization">Organization</option>
                    </select>
                  </label>
                  <label className="space-y-1 text-[10px] font-bold uppercase tracking-wider text-zinc-400 sm:col-span-2">
                    Public identity name
                    <input value={manualVerificationDisplayName} onChange={event => setManualVerificationDisplayName(event.target.value)} maxLength={120} placeholder="Name shown by the verified identity" className="w-full rounded-xl border border-white/10 bg-black/35 px-3 py-3 text-xs normal-case text-white outline-none focus:border-violet-400/60" />
                  </label>
                  <label className="space-y-1 text-[10px] font-bold uppercase tracking-wider text-zinc-400 sm:col-span-2">
                    Evidence review summary
                    <textarea value={manualVerificationEvidenceSummary} onChange={event => setManualVerificationEvidenceSummary(event.target.value)} rows={3} maxLength={1000} placeholder="Explain how the public evidence confirms this account's identity (20–1,000 characters)." className="w-full rounded-xl border border-white/10 bg-black/35 px-3 py-3 text-xs normal-case text-white outline-none focus:border-violet-400/60" />
                  </label>
                  <label className="space-y-1 text-[10px] font-bold uppercase tracking-wider text-zinc-400 sm:col-span-2">
                    Public evidence links (one HTTPS URL per line, 1–5 links)
                    <textarea value={manualVerificationEvidenceUrls} onChange={event => setManualVerificationEvidenceUrls(event.target.value)} rows={3} placeholder={'https://official-website.example\nhttps://official-social.example'} className="w-full rounded-xl border border-white/10 bg-black/35 px-3 py-3 text-xs normal-case text-white outline-none focus:border-violet-400/60" />
                  </label>
                </div>
                <button type="button" onClick={() => void handleGrantManualIdentityVerification()} disabled={manualVerificationBusy || !manualVerificationUserId || !manualVerificationDisplayName.trim() || manualVerificationEvidenceSummary.trim().length < 20 || manualVerificationEvidenceUrls.trim().length === 0} className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-xs font-black text-white transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-45">
                  <Shield className="h-4 w-4" /> {manualVerificationBusy ? 'Verifying account…' : 'Grant verified identity badge'}
                </button>
              </section>
            )}
            <section className="space-y-3 rounded-2xl border border-amber-400/20 bg-amber-400/[0.03] p-4">
              <div>
                <h3 className="text-sm font-black uppercase tracking-widest text-amber-200">Impersonation escalation cases ({impersonationCases.length})</h3>
                <p className="mt-1 text-[11px] text-zinc-400">Three independent reports within 24 hours open a case for human review. Reports are triage signals, not proof, and never automatically remove a badge.</p>
              </div>
              {impersonationCases.length === 0 && <p className="text-xs text-zinc-500">No open impersonation escalation cases.</p>}
              {impersonationCases.map(item => (
                <article key={item.userId} className="space-y-2 rounded-xl border border-amber-400/15 bg-black/20 p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="text-xs font-bold text-white">{item.verifiedDisplayName || item.userId}</p>
                      <p className="text-[10px] text-amber-200">{item.independentReportCount} independent reports · {item.hasVerifiedIdentity ? 'Has public identity verification' : 'No public identity badge'}</p>
                    </div>
                    <span className="rounded-full border border-amber-400/20 px-2 py-1 text-[9px] uppercase text-amber-200">{item.status === 'on_hold' ? 'Temporary identity hold active' : 'Human review required'}</span>
                  </div>
                  <div className="space-y-2">
                    {item.reports.map((report, index) => <div key={index} className="rounded-lg border border-white/5 bg-black/30 p-2">
                      <p className="text-[9px] font-bold uppercase tracking-wider text-amber-200">{report.category.replace('_', ' ')}</p>
                      <p className="mt-1 whitespace-pre-wrap text-[11px] leading-relaxed text-zinc-300">{report.explanation || 'No additional explanation supplied.'}</p>
                    </div>)}
                  </div>
                  {canReviewIdentity ? <>
                    <textarea value={impersonationCaseNotes[item.userId] || ''} onChange={event => setImpersonationCaseNotes(previous => ({ ...previous, [item.userId]: event.target.value }))} rows={2} maxLength={1000} aria-label={`Impersonation review note for ${item.userId}`} placeholder="Evidence reviewed and reasoned decision (minimum 5 characters)." className="w-full rounded-xl border border-white/10 bg-black/30 p-3 text-xs text-white outline-none focus:border-amber-400/50" />
                    <div className="flex flex-wrap gap-2">
                      {item.status === 'open' && <button type="button" onClick={() => void handleImpersonationCaseReview(item.userId, 'dismiss')} className="rounded-lg border border-white/10 px-3 py-2 text-[10px] font-bold text-zinc-200">Dismiss case</button>}
                      {item.status === 'open' && <button type="button" onClick={() => void handleImpersonationCaseReview(item.userId, 'place_on_hold')} className="rounded-lg border border-amber-400/30 px-3 py-2 text-[10px] font-bold text-amber-200">Place temporary identity hold</button>}
                      {item.status === 'on_hold' && <button type="button" onClick={() => void handleImpersonationCaseReview(item.userId, 'clear_hold')} className="rounded-lg border border-emerald-400/30 px-3 py-2 text-[10px] font-bold text-emerald-200">Clear hold and restore badge</button>}
                      <button type="button" onClick={() => void handleImpersonationCaseReview(item.userId, 'confirm_impersonation')} className="rounded-lg bg-rose-600 px-3 py-2 text-[10px] font-black text-white hover:bg-rose-500">Confirm impersonation and revoke identity</button>
                    </div>
                  </> : <p className="text-[10px] text-zinc-500">Read-only. Senior moderators, administrators and the founder can make identity decisions.</p>}
                </article>
              ))}
            </section>
            {identityQueueState === 'loading' && <p className="text-xs text-zinc-400">Loading pending applications…</p>}
            {identityQueueState === 'unavailable' && <p className="rounded-xl border border-rose-500/20 bg-rose-500/5 p-3 text-xs text-rose-200">The reviewer queue is unavailable. Check reviewer permissions and try syncing again.</p>}
            {identityQueueState === 'ready' && identityApplications.length === 0 && <p className="rounded-xl border border-white/10 bg-black/20 p-6 text-center text-xs text-zinc-500">No pending identity applications.</p>}
            <div className="grid grid-cols-1 gap-4">
              {identityApplications.map(application => (
                <article key={application.userId} className="rounded-2xl border border-violet-400/15 bg-[#0b0a1d] p-4 space-y-3">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <h4 className="text-sm font-black text-white">{application.displayName}</h4>
                      <p className="text-[10px] font-mono text-violet-300">{application.userId} · {application.identityType.replace('_', ' ')}</p>
                    </div>
                    <span className="rounded-full border border-amber-400/20 bg-amber-400/5 px-2 py-1 text-[9px] font-bold uppercase text-amber-200">Pending review</span>
                  </div>
                  <p className="text-xs leading-relaxed text-zinc-300">{application.evidenceSummary}</p>
                  {(application.reviewSignals?.possibleNameCollision || (application.reviewSignals?.duplicateEvidenceLinkCount || 0) > 0 || application.reviewSignals?.evidenceScanMayBeIncomplete) && (
                    <div className="rounded-xl border border-amber-400/20 bg-amber-400/5 p-3 text-[10px] leading-relaxed text-amber-100">
                      <strong>Possible duplicate identity.</strong> {application.reviewSignals?.nameCollisionCount || 0} matching name(s), {application.reviewSignals?.duplicateEvidenceLinkCount || 0} shared proof link(s).
                      {application.reviewSignals?.evidenceScanMayBeIncomplete ? ' The check couldn’t review everything. Please check it manually.' : ' This is a warning to check, not proof that the account should be rejected.'}
                    </div>
                  )}
                  <div className="space-y-1">
                    <p className="text-[9px] font-bold uppercase tracking-wider text-zinc-500">Public evidence</p>
                    {application.evidenceUrls.map((url, index) => <a key={url} href={url} target="_blank" rel="noopener noreferrer" className="block break-all text-[11px] text-violet-300 underline decoration-violet-400/30 underline-offset-2 hover:text-violet-200">Evidence {index + 1}: {url}</a>)}
                  </div>
                  {canReviewIdentity ? <>
                    <textarea value={identityReviewNotes[application.userId] || ''} onChange={event => setIdentityReviewNotes(previous => ({ ...previous, [application.userId]: event.target.value }))} rows={2} maxLength={1000} aria-label={`Review note for ${application.displayName}`} placeholder="Reviewer note (required when rejecting or requesting more information)" className="w-full rounded-xl border border-white/10 bg-black/30 p-3 text-xs text-white outline-none focus:border-violet-400/50" />
                    <div className="flex flex-wrap gap-2">
                      <button type="button" onClick={() => void handleIdentityReview(application.userId, 'approved')} className="rounded-lg bg-emerald-600/90 px-3 py-2 text-[10px] font-black text-white hover:bg-emerald-500">Approve identity</button>
                      <button type="button" onClick={() => void handleIdentityReview(application.userId, 'needs_more_info')} className="rounded-lg border border-amber-400/20 bg-amber-400/5 px-3 py-2 text-[10px] font-bold text-amber-200 hover:bg-amber-400/10">Request more evidence</button>
                      <button type="button" onClick={() => void handleIdentityReview(application.userId, 'rejected')} className="rounded-lg border border-rose-400/20 bg-rose-400/5 px-3 py-2 text-[10px] font-bold text-rose-200 hover:bg-rose-400/10">Reject</button>
                    </div>
                  </> : <p className="rounded-lg border border-white/10 bg-black/20 p-3 text-[10px] text-zinc-400">Read-only review access. Only senior moderators, administrators and the founder can make identity decisions.</p>}
                </article>
              ))}
            </div>
          </div>
        )}

        {/* TAB 3: ANALYTICS & WORLD PULSE */}
        {activeSubTab === 'analytics' && (
          <div className="space-y-6 text-left animate-fade-in text-white font-sans">
            
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black text-violet-400 uppercase tracking-widest font-mono">
                Account and community activity
              </h3>
              <div className="flex items-center gap-1 bg-zinc-900 border border-white/5 p-1 rounded-xl text-[10px] font-mono">
                {(['24h', '7d', '30d'] as const).map(tf => (
                  <button 
                    key={tf}
                    onClick={() => setTimeframe(tf)}
                    className={`px-2.5 py-1 rounded-lg font-black block uppercase cursor-pointer ${timeframe === tf ? 'bg-violet-600 text-white font-bold' : 'text-zinc-400 hover:text-white'}`}
                  >
                    {tf}
                  </button>
                ))}
              </div>
            </div>

            {analyticsState === 'unavailable' && (
              <div className="p-4 rounded-2xl border border-amber-500/20 bg-amber-500/5 text-xs text-amber-200">
                Activity details aren’t available for this account yet. No estimates are shown.
              </div>
            )}
            {analyticsState === 'ready' && analyticsPoints.some(point => point.partial) && (
              <div className="p-3 rounded-xl border border-amber-500/20 bg-amber-500/5 text-[10px] text-amber-200 font-mono">
                Some time periods are incomplete, so the totals shown may be lower than the actual totals.
              </div>
            )}

            {/* Bento Grid Analytics Row: client observations, never authoritative business totals */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-4 rounded-2xl bg-zinc-950/60 border border-white/5 space-y-1 shadow-xs">
                <span className="text-[10px] text-zinc-500 font-mono font-bold uppercase block tracking-wider">DAILY ACCOUNT ACTIVITY</span>
                <span className="text-2xl font-black font-sans block text-shadow-glow text-sky-400">{analyticsState === 'ready' ? analyticsTotals.actorDays.toLocaleString() : '—'}</span>
                <span className="text-[10px] text-zinc-500 font-mono block">An account may be counted again on another day</span>
              </div>

              <div className="p-4 rounded-2xl bg-zinc-950/60 border border-white/5 space-y-1 shadow-xs">
                <span className="text-[10px] text-zinc-500 font-mono font-bold uppercase block tracking-wider">RECORDED ACTIONS</span>
                <span className="text-2xl font-black font-sans block text-emerald-400">{analyticsState === 'ready' ? analyticsTotals.events.toLocaleString() : '—'}</span>
                <span className="text-[10px] text-zinc-500 font-mono block">Actions recorded by the app</span>
              </div>

              <div className="p-4 rounded-2xl bg-zinc-950/60 border border-white/5 space-y-1 shadow-xs">
                <span className="text-[10px] text-zinc-500 font-mono font-bold uppercase block tracking-wider">POST VIEWS</span>
                <span className="text-2xl font-black font-sans block text-violet-400">{analyticsState === 'ready' ? analyticsTotals.impressions.toLocaleString() : '—'}</span>
                <span className="text-[10px] text-violet-300 font-mono block">Only counted when tracking is turned on</span>
              </div>

              <div className="p-4 rounded-2xl bg-zinc-950/60 border border-white/5 space-y-1 shadow-xs">
                <span className="text-[10px] text-zinc-500 font-mono font-bold uppercase block tracking-wider">POST INTERACTIONS</span>
                <span className="text-2xl font-black font-sans block text-pink-400">{analyticsState === 'ready' ? analyticsTotals.engagements.toLocaleString() : '—'}</span>
                <span className="text-[10px] text-zinc-500 font-mono block">Doesn’t include likes or money earned</span>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-[#080612]/60 border border-white/5 text-[10px] text-zinc-400 font-mono">
              These numbers show activity recorded by the app. They are not the same as total sign-ups, earnings, followers or total people reached. Views are counted only when tracking is turned on.
            </div>

          </div>
        )}

        {/* TAB 4: FINANCE OPERATIONS; protected callable, never fabricated */}
        {activeSubTab === 'finance' && (
          <div className="space-y-5 text-left animate-fade-in">
            <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-5">
              <h3 className="text-sm font-black uppercase tracking-widest text-emerald-300">Finance operations</h3>
              <p className="mt-2 text-xs leading-relaxed text-zinc-400">This page shows payment details provided by NEXORA. It never shows payment passwords or full customer records.</p>
            </div>
            {financeState === 'loading' && <div className="rounded-2xl border border-white/10 p-8 text-center text-xs text-zinc-500">Loading payment summary…</div>}
            {financeState === 'denied' && <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-8 text-center text-xs text-amber-200">Only approved finance admins can see this information. Moderator access isn’t enough.</div>}
            {financeState === 'unavailable' && <div className="rounded-2xl border border-white/10 p-8 text-center text-xs text-zinc-500">Payment details aren’t available right now. No money or payment settings were changed.</div>}
            {financeState === 'ready' && financeSummary && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5"><span className="text-[10px] uppercase tracking-widest text-zinc-500">Provider</span><p className="mt-2 text-lg font-black text-white">{financeSummary.providerConfigured ? 'Configured' : 'Not configured'}</p></div>
                <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5"><span className="text-[10px] uppercase tracking-widest text-zinc-500">Confirmed payments</span><p className="mt-2 text-lg font-black text-white">{financeSummary.transactions.length}</p></div>
                <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5"><span className="text-[10px] uppercase tracking-widest text-zinc-500">Payment update errors</span><p className="mt-2 text-lg font-black text-white">{financeSummary.webhookFailures.length}</p></div>
              </div>
            )}
            <GiftEarningsFinancePanel />
          </div>
        )}

        {/* TAB 5: ADMINISTRATOR AUDIT TRAIL */}
        {activeSubTab === 'audit' && (
          <div className="space-y-4 text-left animate-fade-in">
            <div className="rounded-2xl border border-violet-500/20 bg-violet-500/5 p-5">
              <h3 className="text-sm font-black uppercase tracking-widest text-violet-200">Admin change history</h3>
              <p className="mt-2 text-xs leading-relaxed text-zinc-400">Recent changes made by admins. Only administrators can view this list.</p>
            </div>
            {auditState === 'loading' && <div className="rounded-2xl border border-white/10 p-8 text-center text-xs text-zinc-500">Loading change history…</div>}
            {auditState === 'denied' && <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-8 text-center text-xs text-amber-200">Administrator access is required to view this history.</div>}
            {auditState === 'unavailable' && <div className="rounded-2xl border border-white/10 p-8 text-center text-xs text-zinc-500">Change history isn’t available right now. No records were changed.</div>}
            {auditState === 'ready' && (
              <div className="overflow-x-auto rounded-2xl border border-white/10 bg-black/20">
                <table className="w-full text-left border-collapse">
                  <thead><tr className="border-b border-white/10 text-[9px] uppercase tracking-widest text-zinc-500">
                    <th className="p-3">Action</th><th className="p-3">Actor</th><th className="p-3">Target</th><th className="p-3">Time</th>
                  </tr></thead>
                  <tbody className="divide-y divide-white/5 text-xs">
                    {auditEvents.map(event => (
                      <tr key={event.id}>
                        <td className="p-3">
                          <span className="font-bold text-white">{event.action.replaceAll('_', ' ')}</span>
                          {event.previousRole && event.newRole && <span className="block mt-1 text-[10px] text-violet-300">{event.previousRole} → {event.newRole}</span>}
                        </td>
                        <td className="p-3 font-mono text-zinc-300">{event.actorUid || 'System'}</td>
                        <td className="p-3 font-mono text-zinc-300">{event.targetUid || '—'}</td>
                        <td className="p-3 text-zinc-500 whitespace-nowrap">{event.createdAt ? new Date(event.createdAt).toLocaleString() : 'Time unavailable'}</td>
                      </tr>
                    ))}
                    {auditEvents.length === 0 && <tr><td colSpan={4} className="p-8 text-center text-xs text-zinc-500">No administrator actions recorded yet.</td></tr>}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* TAB 6: APP DIAGNOSTICS */}
        {activeSubTab === 'health' && (
          <div className="space-y-4 text-left font-mono">
            <div className="p-4 rounded-2xl bg-zinc-950/60 border border-cyan-500/10 flex items-center justify-between">
              <div className="space-y-1">
                <span className="text-[10px] text-cyan-400 font-bold block">● DIAGNOSTIC SERVICES ACTIVE</span>
                <p className="text-xs text-zinc-300 uppercase">App speed and memory: <span className="text-amber-300 font-bold">Not tracked</span></p>
              </div>
              <Activity className="w-5 h-5 text-cyan-400 animate-pulse shrink-0" />
            </div>

            <div className="space-y-2 border-t border-white/5 pt-3">
              <h4 className="text-xs font-bold text-rose-400 uppercase mb-2">SYSTEM CRASHES & FATAL EXCEPTION LOG</h4>
              
              <div className="space-y-3">
                {crashLogs.map((log) => (
                  <div key={log.id} className="p-4 rounded-xl bg-black/40 border border-white/5 space-y-2">
                    <div className="flex items-center justify-between flex-wrap gap-2 text-[10px]">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className={`p-1 px-2 text-[9px] rounded-lg font-bold uppercase ${log.severity === 'high' ? 'bg-red-500/15 text-red-400 border border-red-500/10' : log.severity === 'medium' ? 'bg-amber-500/15 text-amber-400 border border-amber-500/10' : 'bg-blue-500/15 text-blue-400 border border-blue-500/10'}`}>
                          Severity: {log.severity}
                        </span>
                        <span className="text-zinc-500">•</span>
                        <span className="text-rose-400 font-bold">{log.errorName}</span>
                        <span className="text-zinc-500">•</span>
                        <span className="text-zinc-400">{log.url}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-zinc-500">{new Date(log.timestamp).toLocaleTimeString()}</span>
                        {log.status !== 'resolved' ? (
                          <button 
                            onClick={() => handleResolveCrash(log.id)}
                            className="bg-cyan-950 text-cyan-400 hover:bg-cyan-900 px-2 py-1 rounded-md text-[9px] font-bold cursor-pointer transition-colors"
                          >
                            Mark Fixed
                          </button>
                        ) : (
                          <span className="text-emerald-400 font-bold">✓ Fixed</span>
                        )}
                      </div>
                    </div>

                    <p className="text-xs text-zinc-200 mt-1">{log.errorMessage}</p>
                    
                    {log.stack && (
                      <pre className="p-2.5 bg-black/80 rounded-lg text-[9.5px] text-[#A78BFA] leading-relaxed overflow-x-auto border border-white/3 max-h-24">
                        {log.stack}
                      </pre>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

      </div>

    </div>
  );
}
