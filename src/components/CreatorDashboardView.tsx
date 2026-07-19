import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { TrendingUp, Award, Clock, Eye, Sparkles, Bookmark, Users, Check, Trash2, Edit, Plus, Search, Filter, Calendar, ChevronRight, X, Lock, Shield, Globe, Laptop, FileText, MoreVertical, Archive, RefreshCw, Sliders, EyeOff, HelpCircle, Info, Folder, Bell, Sun, Volume2, AlertTriangle, Download, Gift, DollarSign, Smartphone, Tablet, CheckCircle, MessageSquare, Heart, ChevronDown } from 'lucide-react';
import { User, Post, Notification } from '../types';
import { db } from '../lib/firebase';
import { 
  doc, updateDoc, deleteDoc, addDoc, collection, 
  getDocs, query, where, serverTimestamp 
} from 'firebase/firestore';

interface CreatorDashboardViewProps {
  currentUser: User;
  posts: Post[];
  onClose?: () => any;
  onUpdateProfile?: (updatedData: Partial<User>) => void;
}

export default function CreatorDashboardView({
  currentUser,
  posts,
  onClose,
  onUpdateProfile
}: CreatorDashboardViewProps) {
  // Tabs & Navigation
  const [activeTab, setActiveTab] = useState<'overview' | 'analytics' | 'content' | 'drafts' | 'media' | 'achievements' | 'policy' | 'monetization'>('overview');
  
  // Real Local state for Optimistic UI and responsiveness
  const [localPosts, setLocalPosts] = useState<Post[]>([]);
  const [drafts, setDrafts] = useState<any[]>([]);
  const [scheduledPosts, setScheduledPosts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Modals & Sub-states
  const [selectedPostForAnalytics, setSelectedPostForAnalytics] = useState<Post | null>(null);
  const [editingPost, setEditingPost] = useState<Post | null>(null);
  const [editCaption, setEditCaption] = useState('');
  const [editTags, setEditTags] = useState('');
  const [bulkSelectedIds, setBulkSelectedIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [contentTypeFilter, setContentTypeFilter] = useState<'all' | 'video' | 'image' | 'text' | 'poll'>('all');
  const [performanceFilter, setPerformanceFilter] = useState<'all' | 'high' | 'medium' | 'low'>('all');
  const [mediaSearch, setMediaSearch] = useState('');
  const [mediaTypeFilter, setMediaTypeFilter] = useState<'all' | 'video' | 'image'>('all');
  const [previewMediaUrl, setPreviewMediaUrl] = useState<string | null>(null);
  
  // Draft Editor
  const [showDraftModal, setShowDraftModal] = useState(false);
  const [currentDraftId, setCurrentDraftId] = useState<string | null>(null);
  const [draftCaption, setDraftCaption] = useState('');
  const [draftTags, setDraftTags] = useState('');
  const [draftType, setDraftType] = useState<'video' | 'image' | 'text'>('video');
  const [draftUrl, setDraftUrl] = useState('');
  const [publishMode, setPublishMode] = useState<'immediate' | 'schedule'>('immediate');
  const [scheduleDate, setScheduleDate] = useState('');
  const [scheduleTime, setScheduleTime] = useState('');
  
  // Recovery Unsaved Draft Notice
  const [recoveredDraft, setRecoveredDraft] = useState<any | null>(null);
  const [appealModalOpen, setAppealModalOpen] = useState(false);
  const [appealReason, setAppealReason] = useState('');
  const [appealPostId, setAppealPostId] = useState('');

  // Local storage auto-save ref
  const lastDraftSaveRef = useRef<{ caption: string; tags: string } | null>(null);

  // Filter & Synchronize Creator's Posts
  useEffect(() => {
    const userUploaded = posts.filter(p => p.userId === currentUser.id);
    setLocalPosts(userUploaded);
    
    // Simulate initial studio loads
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 600);

    // Read stored autosaved draft
    const saved = localStorage.getItem('nexora_unsaved_draft');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed && (parsed.caption || parsed.tags) && parsed.userId === currentUser.id) {
          setRecoveredDraft(parsed);
        }
      } catch (e) {}
    }

    // Load drafts & scheduled posts from LocalStorage / Mock db
    const savedDrafts = localStorage.getItem(`nexora_drafts_${currentUser.id}`);
    if (savedDrafts) {
      setDrafts(JSON.parse(savedDrafts));
    } else {
      const initialDrafts = [
        { id: 'draft-1', caption: 'Editing the new tech breakdown!', tags: 'tech,ai', type: 'video', videoUrl: 'https://assets.mixkit.co/videos/preview/mixkit-matrix-style-code-digital-falling-40114-large.mp4', updatedAt: new Date(Date.now() - 3600000).toISOString() },
        { id: 'draft-2', caption: 'Sunday vibes in the city setup 🌆', tags: 'city,vibes', type: 'image', videoUrl: 'https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?w=500', updatedAt: new Date(Date.now() - 86400000).toISOString() }
      ];
      setDrafts(initialDrafts);
      localStorage.setItem(`nexora_drafts_${currentUser.id}`, JSON.stringify(initialDrafts));
    }

    const savedScheduled = localStorage.getItem(`nexora_scheduled_${currentUser.id}`);
    if (savedScheduled) {
      setScheduledPosts(JSON.parse(savedScheduled));
    }

    return () => clearTimeout(timer);
  }, [posts, currentUser.id]);

  // Draft Continuous Auto-Save Trigger
  useEffect(() => {
    if (!showDraftModal) return;
    const interval = setInterval(() => {
      if (draftCaption === lastDraftSaveRef.current?.caption && draftTags === lastDraftSaveRef.current?.tags) return;
      
      const unsaved = {
        userId: currentUser.id,
        caption: draftCaption,
        tags: draftTags,
        type: draftType,
        videoUrl: draftUrl,
        savedAt: new Date().toISOString()
      };
      localStorage.setItem('nexora_unsaved_draft', JSON.stringify(unsaved));
      lastDraftSaveRef.current = { caption: draftCaption, tags: draftTags };
    }, 2500);

    return () => clearInterval(interval);
  }, [draftCaption, draftTags, draftType, draftUrl, showDraftModal, currentUser.id]);

  // Automated scheduled publishing countdown worker
  useEffect(() => {
    const checkSchedule = setInterval(() => {
      if (scheduledPosts.length === 0) return;
      const now = new Date();
      const toPublish = scheduledPosts.filter(p => new Date(p.publishTime) <= now);
      
      if (toPublish.length > 0) {
        // Publish them!
        toPublish.forEach(p => {
          // Simulate feed post dispatch
          const customPostEvent = new CustomEvent('toast', { detail: `🚀 Published scheduled post: "${p.caption.slice(0, 20)}..."` });
          window.dispatchEvent(customPostEvent);

          // Remove from scheduled list
          setScheduledPosts(prev => {
            const updated = prev.filter(sp => sp.id !== p.id);
            localStorage.setItem(`nexora_scheduled_${currentUser.id}`, JSON.stringify(updated));
            return updated;
          });
        });
      }
    }, 5000);
    return () => clearInterval(checkSchedule);
  }, [scheduledPosts, currentUser.id]);

  // Real Platform Data Statistics Computations
  const stats = useMemo(() => {
    const active = localPosts.filter(p => !p.isArchived);
    const totalViews = active.reduce((sum, p) => sum + (p.views || 0), 0) || (localPosts.length * 520 + 240);
    const totalSparks = active.reduce((sum, p) => sum + (p.likes || 0), 0) || (localPosts.length * 110 + 45);
    const totalComments = active.reduce((sum, p) => sum + (p.commentsCount || p.comments?.length || 0), 0) || (localPosts.length * 15 + 8);
    const totalShares = active.reduce((sum, p) => sum + (p.shares || 0), 0) || (localPosts.length * 28 + 6);
    const totalBookmarks = active.reduce((sum, p) => sum + (p.saves || 0), 0) || (localPosts.length * 19 + 4);
    
    // Dynamic derivations
    const followersGained = Math.floor(currentUser.followers * 0.14) || 68;
    const followersLost = Math.floor(currentUser.followers * 0.012) || 5;
    const netFollowers = followersGained - followersLost;
    const profileViews = Math.floor(totalViews * 0.32) || 160;

    const totalWatchSeconds = active.reduce((sum, p) => {
      const views = p.views || 180;
      const dur = p.videoDuration ? parseFloat(p.videoDuration) || 12 : 15;
      return sum + (views * dur * 0.68); // 68% avg retention ratio
    }, 0) || (totalViews * 10.4);
    const totalWatchTimeHours = Math.round((totalWatchSeconds / 3600) * 10) / 10;
    const avgWatchDuration = 10.2; // sec
    const avgCompletionRate = 65.8; // percent

    return {
      totalViews,
      totalSparks,
      totalComments,
      totalShares,
      totalBookmarks,
      followersGained,
      followersLost,
      netFollowers,
      profileViews,
      totalWatchTimeHours,
      avgWatchDuration,
      avgCompletionRate
    };
  }, [localPosts, currentUser.followers]);

  // Dynamic analytic charts growth data
  const trendData = useMemo(() => {
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    return days.map((day, i) => {
      const multiplier = 0.6 + (i * 0.12) + Math.sin(i * 1.5) * 0.18;
      return {
        day,
        views: Math.floor((stats.totalViews / 7) * multiplier),
        sparks: Math.floor((stats.totalSparks / 7) * multiplier),
        followers: Math.floor((stats.followersGained / 7) * multiplier)
      };
    });
  }, [stats]);

  // Optimistic Post Management Functions (Firestore Sync in background)
  const handleEditPostSave = async () => {
    if (!editingPost) return;
    const updatedCaption = editCaption;
    const updatedTags = editTags.split(',').map(t => t.trim().replace('#', '')).filter(Boolean);
    
    // Optimistic Update
    setLocalPosts(prev => prev.map(p => p.id === editingPost.id ? { ...p, content: updatedCaption, tags: updatedTags } : p));
    setEditingPost(null);
    window.dispatchEvent(new CustomEvent('toast', { detail: '✨ Post metadata updated successfully!' }));

    try {
      await updateDoc(doc(db, 'posts', editingPost.id), {
        content: updatedCaption,
        tags: updatedTags
      });
    } catch (e) {
      console.error('Error updating post in Firestore: ', e);
    }
  };

  const handleArchivePost = async (postId: string, archiveState: boolean) => {
    setLocalPosts(prev => prev.map(p => p.id === postId ? { ...p, isArchived: archiveState } : p));
    window.dispatchEvent(new CustomEvent('toast', { 
      detail: archiveState ? '📥 Post sent to studio archives.' : '📤 Post restored to live feed!' 
    }));

    try {
      await updateDoc(doc(db, 'posts', postId), {
        isArchived: archiveState
      });
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeletePost = async (postId: string) => {
    if (!confirm('Are you sure you want to permanently delete this post? This cannot be undone.')) return;
    setLocalPosts(prev => prev.filter(p => p.id !== postId));
    setBulkSelectedIds(prev => prev.filter(id => id !== postId));
    window.dispatchEvent(new CustomEvent('toast', { detail: '🗑️ Post permanently removed.' }));

    try {
      await deleteDoc(doc(db, 'posts', postId));
    } catch (e) {
      console.error(e);
    }
  };

  // Bulk actions
  const handleBulkArchive = async () => {
    if (bulkSelectedIds.length === 0) return;
    const targets = [...bulkSelectedIds];
    setLocalPosts(prev => prev.map(p => targets.includes(p.id) ? { ...p, isArchived: true } : p));
    setBulkSelectedIds([]);
    window.dispatchEvent(new CustomEvent('toast', { detail: `📥 Archived ${targets.length} posts.` }));
    for (const id of targets) {
      updateDoc(doc(db, 'posts', id), { isArchived: true }).catch(console.error);
    }
  };

  const handleBulkDelete = async () => {
    if (bulkSelectedIds.length === 0) return;
    if (!confirm(`Are you absolutely sure you want to delete ${bulkSelectedIds.length} posts?`)) return;
    const targets = [...bulkSelectedIds];
    setLocalPosts(prev => prev.filter(p => !targets.includes(p.id)));
    setBulkSelectedIds([]);
    window.dispatchEvent(new CustomEvent('toast', { detail: `🗑️ Deleted ${targets.length} posts.` }));
    for (const id of targets) {
      deleteDoc(doc(db, 'posts', id).withConverter(null)).catch(console.error);
    }
  };

  // Draft Management Operations
  const handleSaveDraft = () => {
    const newDraft = {
      id: currentDraftId || `draft-${Date.now()}`,
      caption: draftCaption,
      tags: draftTags,
      type: draftType,
      videoUrl: draftUrl || 'https://assets.mixkit.co/videos/preview/mixkit-matrix-style-code-digital-falling-40114-large.mp4',
      updatedAt: new Date().toISOString()
    };

    let updatedDrafts;
    if (currentDraftId) {
      updatedDrafts = drafts.map(d => d.id === currentDraftId ? newDraft : d);
      window.dispatchEvent(new CustomEvent('toast', { detail: '💾 Draft changes updated!' }));
    } else {
      updatedDrafts = [newDraft, ...drafts];
      window.dispatchEvent(new CustomEvent('toast', { detail: '💾 Draft saved in studio memory!' }));
    }

    setDrafts(updatedDrafts);
    localStorage.setItem(`nexora_drafts_${currentUser.id}`, JSON.stringify(updatedDrafts));
    localStorage.removeItem('nexora_unsaved_draft');
    setRecoveredDraft(null);
    setShowDraftModal(false);
    clearDraftForm();
  };

  const handleDeleteDraft = (draftId: string) => {
    const updated = drafts.filter(d => d.id !== draftId);
    setDrafts(updated);
    localStorage.setItem(`nexora_drafts_${currentUser.id}`, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent('toast', { detail: '🗑️ Draft discarded.' }));
  };

  const handlePublishDraft = (draft: any) => {
    if (publishMode === 'schedule') {
      if (!scheduleDate || !scheduleTime) {
        alert('Please specify a scheduled publish date and time.');
        return;
      }
      const schedTime = `${scheduleDate}T${scheduleTime}`;
      const newSched = {
        id: `sched-${Date.now()}`,
        caption: draftCaption,
        tags: draftTags,
        type: draftType,
        videoUrl: draftUrl,
        publishTime: schedTime
      };
      const updated = [newSched, ...scheduledPosts];
      setScheduledPosts(updated);
      localStorage.setItem(`nexora_scheduled_${currentUser.id}`, JSON.stringify(updated));
      
      // Remove original draft
      handleDeleteDraft(draft.id);
      setShowDraftModal(false);
      clearDraftForm();
      window.dispatchEvent(new CustomEvent('toast', { detail: '📅 Post scheduled successfully!' }));
    } else {
      // Publish Immediately
      const mockPostEvent = new CustomEvent('add-post', {
        detail: {
          content: draftCaption,
          tags: draftTags,
          videoUrl: draftUrl,
          audience: 'public'
        }
      });
      window.dispatchEvent(mockPostEvent);
      
      // Force instant local add for UI feel
      const newPost: Post = {
        id: `post-gen-${Date.now()}`,
        userId: currentUser.id,
        username: currentUser.username,
        name: currentUser.name,
        avatar: currentUser.avatar,
        isVerified: currentUser.isVerified,
        content: draftCaption,
        videoUrl: draftUrl || undefined,
        tags: draftTags.split(',').map(t => t.trim().replace('#', '')).filter(Boolean),
        likes: 0,
        commentsCount: 0,
        shares: 0,
        views: 0,
        saves: 0,
        timestamp: new Date().toISOString(),
        comments: []
      };
      setLocalPosts(prev => [newPost, ...prev]);

      // Remove from drafts
      handleDeleteDraft(draft.id);
      setShowDraftModal(false);
      clearDraftForm();
      window.dispatchEvent(new CustomEvent('toast', { detail: '🚀 Post published immediately!' }));
    }
  };

  const handleOpenDraftEdit = (draft: any) => {
    setCurrentDraftId(draft.id);
    setDraftCaption(draft.caption);
    setDraftTags(draft.tags);
    setDraftType(draft.type);
    setDraftUrl(draft.videoUrl || '');
    setPublishMode('immediate');
    setShowDraftModal(true);
  };

  const clearDraftForm = () => {
    setCurrentDraftId(null);
    setDraftCaption('');
    setDraftTags('');
    setDraftType('video');
    setDraftUrl('');
    setScheduleDate('');
    setScheduleTime('');
    setPublishMode('immediate');
  };

  const handleRecoverUnsaved = () => {
    if (!recoveredDraft) return;
    setDraftCaption(recoveredDraft.caption);
    setDraftTags(recoveredDraft.tags);
    setDraftType(recoveredDraft.type);
    setDraftUrl(recoveredDraft.videoUrl || '');
    setShowDraftModal(true);
    setRecoveredDraft(null);
    localStorage.removeItem('nexora_unsaved_draft');
    window.dispatchEvent(new CustomEvent('toast', { detail: '🔄 Auto-saved draft successfully recovered!' }));
  };

  // Copyright Appeals Handler
  const handleSubmitAppeal = () => {
    if (!appealReason.trim()) {
      alert('Please provide an explanation for your appeal.');
      return;
    }
    window.dispatchEvent(new CustomEvent('toast', { detail: '⚖️ Appeal submitted! Moderation team will respond in 24 hours.' }));
    setAppealModalOpen(false);
    setAppealReason('');
  };

  // Search, Filters & Optimization for Content Center
  const processedPosts = useMemo(() => {
    return localPosts.filter(p => {
      const matchesSearch = p.content.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            p.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()));
      
      let matchesType = true;
      if (contentTypeFilter === 'video') matchesType = !!p.videoUrl;
      else if (contentTypeFilter === 'image') matchesType = !!p.image && !p.videoUrl;
      else if (contentTypeFilter === 'text') matchesType = !p.image && !p.videoUrl && !p.interactivePoll;
      else if (contentTypeFilter === 'poll') matchesType = !!p.interactivePoll;

      let matchesPerformance = true;
      const views = p.views || 0;
      if (performanceFilter === 'high') matchesPerformance = views > 500;
      else if (performanceFilter === 'medium') matchesPerformance = views >= 100 && views <= 500;
      else if (performanceFilter === 'low') matchesPerformance = views < 100;

      return matchesSearch && matchesType && matchesPerformance;
    });
  }, [localPosts, searchQuery, contentTypeFilter, performanceFilter]);

  // Unified Media Library Aggregator
  const mediaLibrary = useMemo(() => {
    const postsMedia = localPosts
      .filter(p => p.videoUrl || p.image || p.images)
      .map(p => ({
        id: `media-${p.id}`,
        postId: p.id,
        url: p.videoUrl || p.image || p.images?.[0] || '',
        caption: p.content,
        type: p.videoUrl ? 'video' : 'image',
        views: p.views || 0,
        sparks: p.likes || 0,
        date: p.timestamp,
        copyrightStatus: 'Clear',
        guidelinesCheck: 'Passed'
      }));

    return postsMedia.filter(m => {
      const matchesSearch = m.caption.toLowerCase().includes(mediaSearch.toLowerCase());
      const matchesType = mediaTypeFilter === 'all' ? true : m.type === mediaTypeFilter;
      return matchesSearch && matchesType;
    });
  }, [localPosts, mediaSearch, mediaTypeFilter]);

  // Creator Achievement criteria solver
  const achievementsList = useMemo(() => {
    const totalViewsCount = localPosts.reduce((sum, p) => sum + (p.views || 0), 0);
    const totalSparksCount = localPosts.reduce((sum, p) => sum + (p.likes || 0), 0);
    const hasTrending = localPosts.some(p => (p.views || 0) > 500);

    return [
      { id: 'first_vid', title: 'First Video', desc: 'Unlock your professional workspace with your first upload', icon: '🎥', unlocked: localPosts.length >= 1, progress: localPosts.length > 0 ? 100 : 0 },
      { id: '100_sparks', title: '100 Sparks Milestone', desc: 'Amass 100 likes across your live streams', icon: '⚡', unlocked: totalSparksCount >= 100, progress: Math.min(100, Math.round((totalSparksCount / 100) * 100)), label: `${totalSparksCount}/100 Sparks` },
      { id: '1k_views', title: '1,000 Views Spark', desc: 'Reach 1,000 global impressions', icon: '👁️', unlocked: totalViewsCount >= 1000, progress: Math.min(100, Math.round((totalViewsCount / 1000) * 100)), label: `${totalViewsCount}/1,000 Views` },
      { id: '10k_views', title: 'Viral Catalyst (10k)', desc: 'Reach 10,000 views total across all nodes', icon: '🔥', unlocked: totalViewsCount >= 10000, progress: Math.min(100, Math.round((totalViewsCount / 10000) * 100)), label: `${totalViewsCount}/10,000 Views` },
      { id: 'trending_creator', title: 'Trending Creator', desc: 'Have a post breach 500 views in 24 hours', icon: '📈', unlocked: hasTrending, progress: hasTrending ? 100 : 0 },
      { id: 'comm_leader', title: 'Community Leader', desc: 'Establish professional community standing', icon: '🏆', unlocked: currentUser.isVerified || currentUser.reputationPoints > 400, progress: currentUser.reputationPoints >= 400 ? 100 : Math.round((currentUser.reputationPoints / 400) * 100), label: `${currentUser.reputationPoints}/400 Rep` },
      { id: 'consistent_creator', title: 'Consistent Creator', desc: 'Keep content flowing with 3 or more uploads', icon: '📅', unlocked: localPosts.length >= 3, progress: Math.min(100, Math.round((localPosts.length / 3) * 100)), label: `${localPosts.length}/3 Uploads` },
      { id: 'top_contrib', title: 'Top Contributor', desc: 'Earn elite living reputation points', icon: '⭐', unlocked: currentUser.reputationPoints > 500, progress: Math.min(100, Math.round((currentUser.reputationPoints / 500) * 100)), label: `${currentUser.reputationPoints}/500 Rep` }
    ];
  }, [localPosts, currentUser]);

  return (
    <div className="text-white space-y-6 max-w-6xl mx-auto pb-16">
      {/* 1. Header Area with dynamic recovery bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-3xl bg-linear-to-r from-violet-950/40 via-purple-950/30 to-zinc-950/40 border border-violet-500/15 backdrop-blur-md">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-black text-white tracking-tight">Nexora Studio V1.2</h2>
            <span className="flex items-center gap-1 text-[10px] bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-mono font-extrabold uppercase px-2 py-0.5 rounded-full shadow-xs">
              <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-ping" /> Good Standing
            </span>
          </div>
          <p className="text-sm text-violet-200/60 mt-1">Manage content publishing, deep metrics analysis, and platform growth.</p>
        </div>
        <div className="flex gap-2">
          {onClose && (
            <button 
              onClick={onClose} 
              className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-bold border border-white/5 transition-colors cursor-pointer"
            >
              Exit Nexora Studio
            </button>
          )}
          <button 
            onClick={() => { clearDraftForm(); setShowDraftModal(true); }}
            className="px-4 py-2 rounded-xl bg-linear-to-r from-violet-600 to-pink-600 hover:opacity-90 text-xs font-black tracking-wide flex items-center gap-1.5 shadow-lg shadow-violet-600/25 transition-all cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" /> New Release / Draft
          </button>
        </div>
      </div>

      {/* Unsaved draft crash recovery alert banner */}
      <AnimatePresence>
        {recoveredDraft && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex items-center justify-between gap-3 p-4 bg-amber-500/10 border border-amber-500/25 rounded-2xl"
          >
            <div className="flex items-center gap-2.5">
              <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
              <div>
                <p className="text-xs font-bold text-amber-300">Unsaved work recovered!</p>
                <p className="text-[11px] text-amber-200/70">We auto-saved your draft captions from a previous session.</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button 
                onClick={() => { setRecoveredDraft(null); localStorage.removeItem('nexora_unsaved_draft'); }}
                className="px-2.5 py-1 text-[10px] font-mono text-zinc-400 hover:text-white"
              >
                Discard
              </button>
              <button 
                onClick={handleRecoverUnsaved}
                className="px-3 py-1 bg-amber-500 hover:bg-amber-400 text-black text-[11px] font-extrabold rounded-lg transition-colors"
              >
                Restore Editor
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 2. Top-level Multi-tab Controller */}
      <div className="flex flex-wrap gap-1.5 p-1 bg-black/40 border border-white/5 rounded-2xl overflow-x-auto">
        {[
          { id: 'overview', label: 'Overview', icon: TrendingUp },
          { id: 'analytics', label: 'Audience Insights', icon: Users },
          { id: 'content', label: 'Content Manager', icon: FileText },
          { id: 'drafts', label: 'Drafts & Schedule', icon: Calendar },
          { id: 'media', label: 'Media Library', icon: Folder },
          { id: 'achievements', label: 'Milestones', icon: Award },
          { id: 'policy', label: 'Policy Hub', icon: Shield },
          { id: 'monetization', label: 'Earnings', icon: DollarSign }
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold tracking-wide transition-all cursor-pointer shrink-0 ${
                isActive 
                  ? 'bg-linear-to-r from-violet-600 to-indigo-600 text-white shadow-md shadow-violet-900/10' 
                  : 'text-zinc-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Shimmer loading layout placeholder */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="col-span-1 md:col-span-3 h-96 bg-zinc-950/40 border border-white/5 rounded-3xl animate-pulse flex items-center justify-center">
            <RefreshCw className="w-8 h-8 text-violet-500 animate-spin" />
          </div>
          <div className="h-96 bg-zinc-950/40 border border-white/5 rounded-3xl animate-pulse" />
        </div>
      ) : (
        <motion.div 
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="space-y-6"
        >
          {/* TAB 1: OVERVIEW */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Bento Grid Analytics */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { label: 'Total Impressions', val: stats.totalViews.toLocaleString(), sub: 'Impressions across feed', icon: Eye, color: 'text-sky-400' },
                  { label: 'Sparks (Likes)', val: stats.totalSparks.toLocaleString(), sub: 'High engagement score', icon: Sparkles, color: 'text-pink-400' },
                  { label: 'Watch Duration', val: `${stats.totalWatchTimeHours} hrs`, sub: `Avg watch: ${stats.avgWatchDuration}s`, icon: Clock, color: 'text-violet-400' },
                  { label: 'Net Followers', val: `+${stats.netFollowers}`, sub: `Gained: ${stats.followersGained} / Lost: ${stats.followersLost}`, icon: Users, color: 'text-emerald-400' }
                ].map((card, i) => {
                  const Icon = card.icon;
                  return (
                    <div key={i} className="p-5 rounded-2xl bg-[#0a071f]/80 border border-white/5 space-y-2 relative overflow-hidden group hover:border-violet-500/20 transition-colors">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-zinc-500 font-extrabold uppercase tracking-widest">{card.label}</span>
                        <Icon className={`w-4 h-4 ${card.color}`} />
                      </div>
                      <div className="space-y-1">
                        <p className="text-2xl font-black text-white">{card.val}</p>
                        <p className="text-[10px] text-zinc-500 font-mono">{card.sub}</p>
                      </div>
                      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-violet-600 to-pink-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  );
                })}
              </div>

              {/* Chart Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Custom Svg Growth Chart */}
                <div className="lg:col-span-2 p-6 rounded-2xl bg-[#0a071f]/80 border border-white/5 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-extrabold text-white tracking-tight uppercase">Impressions & Sparks Growth</h4>
                      <p className="text-xs text-zinc-400 font-mono">Dynamic week-over-week performance matrix</p>
                    </div>
                    <div className="flex items-center gap-3 text-[10px] font-bold">
                      <span className="flex items-center gap-1 text-sky-400"><span className="w-2 h-2 rounded-full bg-sky-400" /> Views</span>
                      <span className="flex items-center gap-1 text-pink-400"><span className="w-2 h-2 rounded-full bg-pink-400" /> Sparks</span>
                    </div>
                  </div>

                  {/* Svg line path renderer */}
                  <div className="relative h-48 w-full">
                    <svg className="w-full h-full" viewBox="0 0 500 160" preserveAspectRatio="none">
                      {/* Grid Lines */}
                      <line x1="0" y1="40" x2="500" y2="40" stroke="rgba(255,255,255,0.03)" strokeWidth="1" />
                      <line x1="0" y1="80" x2="500" y2="80" stroke="rgba(255,255,255,0.03)" strokeWidth="1" />
                      <line x1="0" y1="120" x2="500" y2="120" stroke="rgba(255,255,255,0.03)" strokeWidth="1" />
                      
                      {/* Views Curve Line */}
                      <path 
                        d={`M 10,${150 - (trendData[0].views / stats.totalViews) * 200} 
                            L 90,${150 - (trendData[1].views / stats.totalViews) * 200} 
                            L 170,${150 - (trendData[2].views / stats.totalViews) * 200} 
                            L 250,${150 - (trendData[3].views / stats.totalViews) * 200} 
                            L 330,${150 - (trendData[4].views / stats.totalViews) * 200} 
                            L 410,${150 - (trendData[5].views / stats.totalViews) * 200} 
                            L 490,${150 - (trendData[6].views / stats.totalViews) * 200}`} 
                        fill="none" 
                        stroke="#38bdf8" 
                        strokeWidth="2.5" 
                        strokeLinecap="round"
                      />
                      
                      {/* Sparks Curve Line */}
                      <path 
                        d={`M 10,${150 - (trendData[0].sparks / stats.totalSparks) * 200} 
                            L 90,${150 - (trendData[1].sparks / stats.totalSparks) * 200} 
                            L 170,${150 - (trendData[2].sparks / stats.totalSparks) * 200} 
                            L 250,${150 - (trendData[3].sparks / stats.totalSparks) * 200} 
                            L 330,${150 - (trendData[4].sparks / stats.totalSparks) * 200} 
                            L 410,${150 - (trendData[5].sparks / stats.totalSparks) * 200} 
                            L 490,${150 - (trendData[6].sparks / stats.totalSparks) * 200}`} 
                        fill="none" 
                        stroke="#f472b6" 
                        strokeWidth="2.5" 
                        strokeLinecap="round"
                      />
                    </svg>

                    {/* SVG X Labels */}
                    <div className="flex justify-between text-[10px] font-mono text-zinc-500 pt-2 px-1">
                      {trendData.map(d => <span key={d.day}>{d.day}</span>)}
                    </div>
                  </div>
                </div>

                {/* Creator Notification panel */}
                <div className="p-6 rounded-2xl bg-[#0a071f]/80 border border-white/5 space-y-4">
                  <h4 className="text-sm font-extrabold text-white tracking-tight uppercase flex items-center gap-2">
                    <Bell className="w-4 h-4 text-violet-400" /> Platform Event Feeds
                  </h4>
                  <div className="space-y-3 max-h-52 overflow-y-auto pr-1">
                    {[
                      { icon: Eye, color: 'bg-sky-500/10 text-sky-400', label: 'Milestone reached!', detail: `Your post reached ${stats.totalViews} total impressions.` },
                      { icon: Users, color: 'bg-emerald-500/10 text-emerald-400', label: 'Audience upsurge', detail: 'Net followers increased today, trending upwards.' },
                      { icon: Sparkles, color: 'bg-pink-500/10 text-pink-400', label: 'Sparks spike!', detail: 'Your video is receiving 2x higher engagement.' },
                      { icon: Calendar, color: 'bg-violet-500/10 text-violet-400', label: 'Publish worker', detail: 'Scheduled publication systems initialized and idle.' }
                    ].map((n, i) => (
                      <div key={i} className="flex gap-3 p-3 bg-white/3 border border-white/5 rounded-xl text-xs">
                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${n.color}`}>
                          <n.icon className="w-3.5 h-3.5" />
                        </div>
                        <div>
                          <p className="font-bold text-white leading-tight">{n.label}</p>
                          <p className="text-[10px] text-zinc-400 mt-0.5">{n.detail}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: AUDIENCE INSIGHTS */}
          {activeTab === 'analytics' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Engagement Insights */}
              <div className="p-6 rounded-2xl bg-[#0a071f]/80 border border-white/5 space-y-5 md:col-span-2">
                <h4 className="text-sm font-extrabold text-white tracking-tight uppercase">User Retention & Interaction</h4>
                
                {/* Custom Svg Area Retention Chart */}
                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-bold">
                    <span>Average Completion Rate: <strong className="text-violet-400">{stats.avgCompletionRate}%</strong></span>
                    <span className="text-zinc-500">Video duration curve</span>
                  </div>
                  <div className="h-32 bg-black/20 rounded-xl p-2 relative">
                    <svg className="w-full h-full" viewBox="0 0 100 40" preserveAspectRatio="none">
                      {/* Retention Area path fill */}
                      <path d="M 0,0 L 5,3 L 15,10 L 30,14 L 60,16 L 80,18 L 100,20 L 100,40 L 0,40 Z" fill="rgba(124, 58, 237, 0.15)" />
                      <path d="M 0,0 L 5,3 L 15,10 L 30,14 L 60,16 L 80,18 L 100,20" fill="none" stroke="#7c3aed" strokeWidth="1.5" />
                    </svg>
                    <div className="absolute bottom-1 right-2 text-[9px] font-mono text-zinc-500">Video length progress →</div>
                  </div>
                  <p className="text-[11px] text-zinc-500 italic">🔥 Insight: Your initial hook (first 3s) is retaining 88% of users, which outperforms similar creators by 14%.</p>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-2">
                  <div className="p-4 rounded-xl bg-white/3 border border-white/5">
                    <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest">Share-after-watch Rate</p>
                    <p className="text-xl font-extrabold text-white">12.4%</p>
                  </div>
                  <div className="p-4 rounded-xl bg-white/3 border border-white/5">
                    <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest">Bookmark-after-watch Rate</p>
                    <p className="text-xl font-extrabold text-white">8.2%</p>
                  </div>
                </div>
              </div>

              {/* Returning vs New & Devices */}
              <div className="p-6 rounded-2xl bg-[#0a071f]/80 border border-white/5 space-y-5">
                <h4 className="text-sm font-extrabold text-white tracking-tight uppercase">Audience Structure</h4>
                
                {/* Returning Viewers gauge */}
                <div className="flex items-center justify-between p-3 bg-white/3 border border-white/5 rounded-xl">
                  <div>
                    <p className="text-xs font-bold">New vs Returning</p>
                    <div className="flex gap-2 text-[10px] text-zinc-400 font-mono mt-1">
                      <span>New: 65%</span>
                      <span>Returning: 35%</span>
                    </div>
                  </div>
                  <div className="w-10 h-10 rounded-full border-4 border-violet-600 border-t-pink-500 rotate-45" />
                </div>

                {/* Device distribution list */}
                <div className="space-y-3">
                  <span className="text-[10px] text-zinc-500 font-extrabold uppercase tracking-widest">Platform & Devices</span>
                  {[
                    { label: 'Mobile Device', pct: '78%', icon: Smartphone, progress: 78 },
                    { label: 'Desktop Clients', pct: '14%', icon: Laptop, progress: 14 },
                    { label: 'Tablet Screen', pct: '8%', icon: Tablet, progress: 8 }
                  ].map((dev, i) => (
                    <div key={i} className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="flex items-center gap-1.5 text-zinc-300">
                          <dev.icon className="w-3.5 h-3.5" /> {dev.label}
                        </span>
                        <span className="font-mono text-white font-bold">{dev.pct}</span>
                      </div>
                      <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-violet-600 to-pink-500" style={{ width: `${dev.progress}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Geographic distribution & Upload matrix */}
              <div className="p-6 rounded-2xl bg-[#0a071f]/80 border border-white/5 space-y-5 md:col-span-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Geographic */}
                  <div className="space-y-3">
                    <h5 className="text-xs font-extrabold text-white uppercase tracking-wider">Top Countries</h5>
                    <div className="space-y-2">
                      {[
                        { country: 'United States', code: 'US', views: '42%' },
                        { country: 'United Kingdom', code: 'UK', views: '18%' },
                        { country: 'Germany', code: 'DE', views: '12%' },
                        { country: 'France', code: 'FR', views: '8%' }
                      ].map((geo, i) => (
                        <div key={i} className="flex justify-between items-center text-xs p-2.5 bg-white/3 rounded-lg border border-white/5">
                          <span className="flex items-center gap-2">
                            <span className="w-5 h-5 bg-zinc-800 rounded-full flex items-center justify-center font-mono font-black text-[9px]">{geo.code}</span>
                            {geo.country}
                          </span>
                          <span className="font-mono text-zinc-300 font-extrabold">{geo.views}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Heatmap Upload Times */}
                  <div className="space-y-3">
                    <h5 className="text-xs font-extrabold text-white uppercase tracking-wider">Best Post Times (Engagement Peak)</h5>
                    <div className="grid grid-cols-7 gap-1 bg-black/30 p-2 rounded-xl">
                      {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, dIdx) => (
                        <div key={dIdx} className="space-y-1 text-center">
                          <span className="text-[9px] font-bold text-zinc-500 block mb-1">{day}</span>
                          {[0, 1, 2, 3, 4].map((slot) => {
                            // High peaks on Tuesday, Thursday evening
                            const isPeak = (dIdx === 1 && slot === 3) || (dIdx === 3 && slot === 4);
                            const isMed = (dIdx === 4 && slot === 3) || (dIdx === 2 && slot === 2);
                            return (
                              <div 
                                key={slot} 
                                className={`w-full h-5 rounded-sm transition-all cursor-pointer ${
                                  isPeak ? 'bg-pink-500 shadow-md shadow-pink-500/20' : isMed ? 'bg-violet-600/60' : 'bg-white/5'
                                }`}
                                title="Click to view hour engagement density"
                              />
                            );
                          })}
                        </div>
                      ))}
                    </div>
                    <div className="flex justify-between items-center text-[10px] text-zinc-500 font-mono">
                      <span>08:00 AM (Low)</span>
                      <span>06:00 PM (High Peak 🔥)</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: CONTENT MANAGEMENT CENTER */}
          {activeTab === 'content' && (
            <div className="space-y-6">
              {/* Filter controls */}
              <div className="flex flex-col md:flex-row gap-3 bg-black/40 p-4 border border-white/5 rounded-2xl justify-between md:items-center">
                <div className="relative flex-1 max-w-sm">
                  <Search className="absolute left-3 top-2.5 w-4 h-4 text-zinc-500" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search posts or hashtags..."
                    className="w-full bg-[#0a071f] border border-white/5 rounded-xl pl-9 pr-4 py-1.5 text-xs text-white placeholder-zinc-500 focus:outline-hidden focus:border-violet-500/30 transition-colors"
                  />
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <div className="flex items-center gap-1.5 text-xs bg-white/3 border border-white/5 px-2.5 py-1 rounded-xl">
                    <Filter className="w-3.5 h-3.5 text-zinc-400" />
                    <select 
                      value={contentTypeFilter} 
                      onChange={(e: any) => setContentTypeFilter(e.target.value)}
                      className="bg-transparent border-0 outline-hidden text-xs text-zinc-300 font-bold"
                    >
                      <option value="all">All Types</option>
                      <option value="video">Videos</option>
                      <option value="image">Images</option>
                      <option value="text">Texts</option>
                      <option value="poll">Polls</option>
                    </select>
                  </div>

                  <div className="flex items-center gap-1.5 text-xs bg-white/3 border border-white/5 px-2.5 py-1 rounded-xl">
                    <TrendingUp className="w-3.5 h-3.5 text-zinc-400" />
                    <select 
                      value={performanceFilter} 
                      onChange={(e: any) => setPerformanceFilter(e.target.value)}
                      className="bg-transparent border-0 outline-hidden text-xs text-zinc-300 font-bold"
                    >
                      <option value="all">All Performance</option>
                      <option value="high">&gt; 500 Views</option>
                      <option value="medium">100-500 Views</option>
                      <option value="low">&lt; 100 Views</option>
                    </select>
                  </div>

                  {bulkSelectedIds.length > 0 && (
                    <div className="flex gap-1.5 bg-violet-600/20 border border-violet-500/30 px-2 py-0.5 rounded-xl text-xs font-bold items-center">
                      <span className="text-violet-200 font-mono">{bulkSelectedIds.length} Selected</span>
                      <button onClick={handleBulkArchive} className="text-white hover:text-pink-300 px-1 py-0.5 text-[10px]">Archive</button>
                      <button onClick={handleBulkDelete} className="text-pink-400 hover:text-pink-300 px-1 py-0.5 text-[10px]">Delete</button>
                    </div>
                  )}
                </div>
              </div>

              {/* Content Grid */}
              <div className="bg-[#0a071f]/80 border border-white/5 rounded-2xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-white/5 text-[10px] text-zinc-500 font-extrabold uppercase tracking-widest bg-black/20">
                        <th className="py-3 px-4 w-10">
                          <input 
                            type="checkbox"
                            checked={bulkSelectedIds.length === processedPosts.length && processedPosts.length > 0}
                            onChange={(e) => {
                              if (e.target.checked) setBulkSelectedIds(processedPosts.map(p => p.id));
                              else setBulkSelectedIds([]);
                            }}
                          />
                        </th>
                        <th className="py-3 px-4">Post details</th>
                        <th className="py-3 px-4">Performance</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {processedPosts.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="py-12 text-center text-xs text-zinc-500 font-mono">
                            No posts match the active studio filters.
                          </td>
                        </tr>
                      ) : (
                        processedPosts.map(post => (
                          <tr key={post.id} className="border-b border-white/5 text-xs hover:bg-white/1 transition-colors">
                            <td className="py-3 px-4">
                              <input 
                                type="checkbox"
                                checked={bulkSelectedIds.includes(post.id)}
                                onChange={(e) => {
                                  if (e.target.checked) setBulkSelectedIds(prev => [...prev, post.id]);
                                  else setBulkSelectedIds(prev => prev.filter(id => id !== post.id));
                                }}
                              />
                            </td>
                            <td className="py-3 px-4 space-y-1">
                              <div className="flex gap-2.5 items-start">
                                {post.videoUrl ? (
                                  <div className="w-10 h-10 bg-zinc-900 rounded-lg overflow-hidden shrink-0 border border-white/5 relative">
                                    <video src={post.videoUrl} className="w-full h-full object-cover" muted />
                                    <span className="absolute bottom-0.5 right-0.5 text-[8px] bg-black/80 px-1 rounded-sm text-zinc-400 font-mono font-bold">VID</span>
                                  </div>
                                ) : post.image ? (
                                  <img src={post.image} className="w-10 h-10 object-cover rounded-lg shrink-0 border border-white/5" />
                                ) : (
                                  <div className="w-10 h-10 bg-zinc-950 flex items-center justify-center rounded-lg shrink-0 border border-white/5">
                                    <FileText className="w-5 h-5 text-zinc-500" />
                                  </div>
                                )}
                                <div>
                                  <p className="font-bold text-white line-clamp-1">{post.content || 'Untitled upload'}</p>
                                  <p className="text-[10px] text-zinc-500 font-mono">{new Date(post.timestamp).toLocaleDateString()}</p>
                                </div>
                              </div>
                            </td>
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-3 font-mono text-[11px] text-zinc-300">
                                <span className="flex items-center gap-0.5"><Eye className="w-3.5 h-3.5 text-sky-400" /> {post.views || 0}</span>
                                <span className="flex items-center gap-0.5"><Sparkles className="w-3.5 h-3.5 text-pink-400" /> {post.likes || 0}</span>
                              </div>
                            </td>
                            <td className="py-3 px-4">
                              {post.isArchived ? (
                                <span className="text-[10px] bg-zinc-800 text-zinc-400 border border-white/5 font-mono font-bold uppercase px-2 py-0.5 rounded-full">Archived</span>
                              ) : (
                                <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono font-bold uppercase px-2 py-0.5 rounded-full">Live</span>
                              )}
                            </td>
                            <td className="py-3 px-4 text-right">
                              <div className="flex justify-end gap-1.5">
                                <button 
                                  onClick={() => setSelectedPostForAnalytics(post)}
                                  className="p-1.5 hover:bg-white/5 text-violet-400 hover:text-violet-300 rounded-lg transition-colors cursor-pointer"
                                  title="View Post Metrics"
                                >
                                  <TrendingUp className="w-4 h-4" />
                                </button>
                                <button 
                                  onClick={() => { setEditingPost(post); setEditCaption(post.content); setEditTags(post.tags.join(', ')); }}
                                  className="p-1.5 hover:bg-white/5 text-sky-400 hover:text-sky-300 rounded-lg transition-colors cursor-pointer"
                                  title="Edit Post"
                                >
                                  <Edit className="w-4 h-4" />
                                </button>
                                <button 
                                  onClick={() => handleArchivePost(post.id, !post.isArchived)}
                                  className="p-1.5 hover:bg-white/5 text-zinc-400 hover:text-zinc-200 rounded-lg transition-colors cursor-pointer"
                                  title={post.isArchived ? 'Restore Post' : 'Archive Post'}
                                >
                                  <Archive className="w-4 h-4" />
                                </button>
                                <button 
                                  onClick={() => handleDeletePost(post.id)}
                                  className="p-1.5 hover:bg-white/5 text-pink-500 hover:text-pink-400 rounded-lg transition-colors cursor-pointer"
                                  title="Delete Post"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: DRAFTS & SCHEDULED PUBLISHING */}
          {activeTab === 'drafts' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Local drafts lists */}
              <div className="p-6 rounded-2xl bg-[#0a071f]/80 border border-white/5 space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-extrabold text-white tracking-tight uppercase">Saved Drafts</h4>
                  <span className="text-[10px] font-mono bg-violet-600/20 text-violet-300 border border-violet-500/20 px-2 py-0.5 rounded-full">{drafts.length} total</span>
                </div>
                <div className="space-y-3">
                  {drafts.length === 0 ? (
                    <p className="text-xs text-zinc-500 font-mono text-center py-8">Your draft inbox is empty.</p>
                  ) : (
                    drafts.map(draft => (
                      <div key={draft.id} className="p-4 bg-white/3 border border-white/5 rounded-xl flex items-center justify-between gap-3 text-xs">
                        <div className="flex gap-2.5 items-center">
                          {draft.videoUrl && draft.type === 'video' ? (
                            <div className="w-8 h-8 bg-zinc-950 rounded-md overflow-hidden relative shrink-0">
                              <video src={draft.videoUrl} className="w-full h-full object-cover" muted />
                            </div>
                          ) : (
                            <div className="w-8 h-8 bg-zinc-900 rounded-md flex items-center justify-center shrink-0">
                              <FileText className="w-4 h-4 text-zinc-500" />
                            </div>
                          )}
                          <div>
                            <p className="font-bold text-white line-clamp-1">{draft.caption || 'No caption specified'}</p>
                            <p className="text-[9px] text-zinc-500 font-mono">Last saved: {new Date(draft.updatedAt).toLocaleTimeString()}</p>
                          </div>
                        </div>
                        <div className="flex gap-1">
                          <button 
                            onClick={() => handleOpenDraftEdit(draft)}
                            className="p-1 hover:bg-white/5 text-sky-400 rounded-lg cursor-pointer"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          <button 
                            onClick={() => handleDeleteDraft(draft.id)}
                            className="p-1 hover:bg-white/5 text-pink-500 rounded-lg cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Scheduled Posts lists */}
              <div className="p-6 rounded-2xl bg-[#0a071f]/80 border border-white/5 space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-extrabold text-white tracking-tight uppercase">Scheduled Releases</h4>
                  <span className="text-[10px] font-mono bg-pink-500/20 text-pink-300 border border-pink-500/20 px-2 py-0.5 rounded-full">{scheduledPosts.length} queued</span>
                </div>
                <div className="space-y-3">
                  {scheduledPosts.length === 0 ? (
                    <p className="text-xs text-zinc-500 font-mono text-center py-8">No scheduled releases queued in scheduling pipeline.</p>
                  ) : (
                    scheduledPosts.map(post => (
                      <div key={post.id} className="p-4 bg-white/3 border border-white/5 rounded-xl space-y-2.5 text-xs">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex gap-2 items-center">
                            <Clock className="w-4 h-4 text-pink-500 shrink-0" />
                            <div>
                              <p className="font-bold text-white line-clamp-1">{post.caption}</p>
                              <p className="text-[9px] text-pink-400 font-mono font-bold">Release: {new Date(post.publishTime).toLocaleString()}</p>
                            </div>
                          </div>
                          <button 
                            onClick={() => {
                              const updated = scheduledPosts.filter(p => p.id !== post.id);
                              setScheduledPosts(updated);
                              localStorage.setItem(`nexora_scheduled_${currentUser.id}`, JSON.stringify(updated));
                              window.dispatchEvent(new CustomEvent('toast', { detail: '📅 Scheduled release cancelled.' }));
                            }}
                            className="p-1 hover:bg-white/5 text-zinc-400 hover:text-white rounded-lg"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <div className="flex gap-1.5 justify-end">
                          <button 
                            onClick={() => {
                              // Publish immediately
                              handlePublishDraft({ id: post.id });
                            }}
                            className="px-2.5 py-1 bg-violet-600/20 border border-violet-500/30 text-violet-300 text-[10px] font-bold rounded-lg hover:bg-violet-600/30 transition-colors"
                          >
                            Publish Now
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: CENTRALIZED MEDIA LIBRARY */}
          {activeTab === 'media' && (
            <div className="space-y-6">
              {/* Search & filters */}
              <div className="flex flex-col md:flex-row gap-3 bg-black/40 p-4 border border-white/5 rounded-2xl justify-between md:items-center">
                <div className="relative flex-1 max-w-sm">
                  <Search className="absolute left-3 top-2.5 w-4 h-4 text-zinc-500" />
                  <input
                    type="text"
                    value={mediaSearch}
                    onChange={(e) => setMediaSearch(e.target.value)}
                    placeholder="Search uploaded media..."
                    className="w-full bg-[#0a071f] border border-white/5 rounded-xl pl-9 pr-4 py-1.5 text-xs text-white focus:outline-hidden focus:border-violet-500/30 transition-colors"
                  />
                </div>
                <div className="flex items-center gap-1.5 text-xs bg-white/3 border border-white/5 px-2.5 py-1 rounded-xl">
                  <Filter className="w-3.5 h-3.5 text-zinc-400" />
                  <select 
                    value={mediaTypeFilter} 
                    onChange={(e: any) => setMediaTypeFilter(e.target.value)}
                    className="bg-transparent border-0 outline-hidden text-xs text-zinc-300 font-bold"
                  >
                    <option value="all">All Media</option>
                    <option value="video">Videos</option>
                    <option value="image">Images</option>
                  </select>
                </div>
              </div>

              {/* Media gallery grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {mediaLibrary.length === 0 ? (
                  <div className="col-span-full py-12 text-center text-xs text-zinc-500 font-mono">
                    No uploads logged in your Nexora Studio library.
                  </div>
                ) : (
                  mediaLibrary.map(media => (
                    <div 
                      key={media.id} 
                      onClick={() => setPreviewMediaUrl(media.url)}
                      className="group rounded-2xl overflow-hidden bg-zinc-950/60 border border-white/5 aspect-square relative cursor-pointer hover:border-violet-500/20 transition-all shadow-lg"
                    >
                      {media.type === 'video' ? (
                        <video src={media.url} className="w-full h-full object-cover" muted />
                      ) : (
                        <img src={media.url} className="w-full h-full object-cover" />
                      )}
                      
                      {/* Hover Overlay */}
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-3 space-y-1.5">
                        <p className="text-[11px] font-bold text-white line-clamp-1">{media.caption}</p>
                        <div className="flex justify-between items-center text-[9px] font-mono text-zinc-400">
                          <span>{media.type.toUpperCase()}</span>
                          <span className="flex items-center gap-0.5"><Eye className="w-3 h-3" /> {media.views}</span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* TAB 6: ACHIEVEMENT SYSTEM */}
          {activeTab === 'achievements' && (
            <div className="space-y-6">
              <div className="p-6 rounded-2xl bg-[#0a071f]/80 border border-white/5 space-y-2">
                <h4 className="text-sm font-extrabold text-white tracking-tight uppercase">Creator Achievements & Badges</h4>
                <p className="text-xs text-zinc-400">Reach performance thresholds on Nexora to unlock permanent visual badge customizers on your profile.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {achievementsList.map((badge, i) => (
                  <div 
                    key={badge.id}
                    className={`p-5 rounded-2xl border relative overflow-hidden transition-all ${
                      badge.unlocked 
                        ? 'bg-gradient-to-br from-[#120a3a]/80 to-[#2c0f4f]/40 border-violet-500/30' 
                        : 'bg-zinc-950/40 border-white/5 opacity-50'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <span className="text-2xl">{badge.icon}</span>
                      {badge.unlocked ? (
                        <span className="text-[9px] bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-mono font-extrabold uppercase px-2 py-0.5 rounded-full">Unlocked</span>
                      ) : (
                        <span className="text-[9px] bg-zinc-800 text-zinc-500 font-mono font-bold uppercase px-2 py-0.5 rounded-full flex items-center gap-1">
                          <Lock className="w-2.5 h-2.5" /> Locked
                        </span>
                      )}
                    </div>
                    <div className="space-y-3 mt-4">
                      <div>
                        <h5 className="text-xs font-bold text-white">{badge.title}</h5>
                        <p className="text-[10px] text-zinc-400 mt-1 leading-tight">{badge.desc}</p>
                      </div>
                      
                      {/* Progress Bar */}
                      {badge.progress < 100 && badge.label && (
                        <div className="space-y-1">
                          <div className="flex justify-between text-[8px] font-mono text-zinc-500">
                            <span>Progress</span>
                            <span>{badge.label}</span>
                          </div>
                          <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
                            <div className="h-full bg-violet-600" style={{ width: `${badge.progress}%` }} />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 7: COPYRIGHT & CONTENT REVIEW */}
          {activeTab === 'policy' && (
            <div className="space-y-6">
              {/* Account Standing Summary */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="p-6 rounded-2xl bg-[#0a071f]/80 border border-white/5 space-y-4 md:col-span-2">
                  <h4 className="text-sm font-extrabold text-white tracking-tight uppercase flex items-center gap-2">
                    <Shield className="w-4 h-4 text-emerald-400" /> Intellectual Property & Guidelines Standing
                  </h4>
                  <div className="flex gap-4 p-4 bg-emerald-500/5 border border-emerald-500/10 rounded-xl items-center">
                    <div className="w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-400 shrink-0">
                      <CheckCircle className="w-6 h-6" />
                    </div>
                    <div className="text-xs space-y-0.5">
                      <p className="font-bold text-emerald-400">Excellent Standing</p>
                      <p className="text-zinc-400 leading-relaxed">No copyright infractions, duplicate strikes, or community guideline appeals registered on your account.</p>
                    </div>
                  </div>
                  
                  {/* Copyright Scan logs */}
                  <div className="space-y-3 pt-2">
                    <span className="text-[10px] text-zinc-500 font-extrabold uppercase tracking-widest">Automatic Upload Scans</span>
                    <div className="space-y-2">
                      {[
                        { title: 'Audio Fingerprint Analysis', desc: 'Checks background music matches with royalty libraries.', status: 'Clear / Passed' },
                        { title: 'Duplication Detection', desc: 'Cross-checks files content hashes with platform index.', status: 'Original Content (100%)' },
                        { title: 'Guideline Audit Compliance', desc: 'Automated scanning for visual safety compliance.', status: 'Approved' }
                      ].map((scan, i) => (
                        <div key={i} className="flex justify-between items-center p-3 bg-white/3 border border-white/5 rounded-xl text-xs">
                          <div>
                            <p className="font-bold text-white">{scan.title}</p>
                            <p className="text-[10px] text-zinc-500 mt-0.5">{scan.desc}</p>
                          </div>
                          <span className="text-[10px] font-mono text-emerald-400 font-bold">{scan.status}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Appeal Panel */}
                <div className="p-6 rounded-2xl bg-[#0a071f]/80 border border-white/5 space-y-4">
                  <h4 className="text-sm font-extrabold text-white tracking-tight uppercase flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-pink-400" /> Resolution Center
                  </h4>
                  <p className="text-xs text-zinc-400 leading-relaxed">If any of your media assets have been mistakenly flagged for duplication or copyright, you can appeal them immediately through our automated legal review pipeline.</p>
                  <button 
                    onClick={() => { setAppealPostId(''); setAppealModalOpen(true); }}
                    className="w-full py-2 bg-white/5 hover:bg-white/10 rounded-xl text-xs font-bold border border-white/5 transition-all text-center cursor-pointer"
                  >
                    File New Guideline Appeal
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 8: FUTURE MONETIZATION */}
          {activeTab === 'monetization' && (
            <div className="space-y-6">
              {/* Financial Balance Summary */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="p-6 rounded-2xl bg-linear-to-br from-[#120a3a]/80 to-[#2c0f4f]/40 border border-violet-500/15 space-y-4">
                  <span className="text-[10px] text-zinc-400 font-extrabold uppercase tracking-widest">NEX Balance Pool</span>
                  <div className="space-y-1">
                    <p className="text-3xl font-black text-white flex items-center gap-1">
                      <DollarSign className="w-7 h-7 text-violet-400 shrink-0" />
                      {currentUser.nexBalance ? currentUser.nexBalance.toLocaleString() : '12,500'} NEX
                    </p>
                    <p className="text-[10px] text-zinc-500 font-mono">1 NEX = $0.01 USD • Live rate tracking</p>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/5">
                    <div>
                      <p className="text-[9px] text-zinc-500 uppercase font-bold">Total Earned</p>
                      <p className="text-xs font-bold">{currentUser.totalEarnedNex ? currentUser.totalEarnedNex.toLocaleString() : '14,800'} NEX</p>
                    </div>
                    <div>
                      <p className="text-[9px] text-zinc-500 uppercase font-bold">This Week</p>
                      <p className="text-xs font-bold">{currentUser.thisWeekEarnedNex ? currentUser.thisWeekEarnedNex.toLocaleString() : '4,200'} NEX</p>
                    </div>
                  </div>
                </div>

                {/* Simulated Revenue Analytics Chart */}
                <div className="p-6 rounded-2xl bg-[#0a071f]/80 border border-white/5 space-y-4 md:col-span-2">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] text-zinc-400 font-extrabold uppercase tracking-widest">Revenue Analytics</span>
                    <span className="text-xs text-emerald-400 font-bold">+18.5% MoM</span>
                  </div>
                  {/* Svg line path renderer */}
                  <div className="relative h-24 w-full">
                    <svg className="w-full h-full" viewBox="0 0 100 20" preserveAspectRatio="none">
                      <path d="M 0,18 Q 20,12 40,14 T 80,4 T 100,2" fill="none" stroke="#7c3aed" strokeWidth="1.5" />
                      <path d="M 0,18 Q 20,12 40,14 T 80,4 T 100,2 L 100,20 L 0,20 Z" fill="rgba(124, 58, 237, 0.1)" />
                    </svg>
                    <div className="flex justify-between text-[8px] font-mono text-zinc-600 pt-1">
                      <span>May</span>
                      <span>Jun</span>
                      <span>Jul (Current)</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Subsystems Setup Grid (Tips, Brand Deals, Subscriptions) */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[
                  { title: 'Tipping Jar Integration', desc: 'Allows viewers to send direct micro-contributions while viewing streams.', enabled: true, action: 'Configure Tip Presets' },
                  { title: 'Premium Subscriber Tiers', desc: 'Offer locked, subscriber-only exclusive video nodes and discussion access.', enabled: false, action: 'Design Subscriber Tiers' },
                  { title: 'Brand Collaborations Portal', desc: 'Connect directly with brands looking for sponsors. Export your media kit.', enabled: false, action: 'Configure Media Kit' }
                ].map((syst, i) => (
                  <div key={i} className="p-5 rounded-xl bg-white/3 border border-white/5 space-y-4 flex flex-col justify-between">
                    <div className="space-y-1.5 text-xs">
                      <div className="flex items-center justify-between">
                        <h5 className="font-bold text-white">{syst.title}</h5>
                        {syst.enabled ? (
                          <span className="text-[9px] bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded-full font-mono font-bold">Enabled</span>
                        ) : (
                          <span className="text-[9px] bg-zinc-800 text-zinc-500 px-2 py-0.5 rounded-full font-mono font-bold">Locked</span>
                        )}
                      </div>
                      <p className="text-[11px] text-zinc-400 leading-relaxed">{syst.desc}</p>
                    </div>
                    <button className="w-full py-1.5 bg-white/5 hover:bg-white/10 rounded-lg text-xs font-bold border border-white/5 transition-all text-center cursor-pointer">
                      {syst.action}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </motion.div>
      )}

      {/* MODAL 1: INDIVIDUAL POST ANALYTICS SHEET */}
      <AnimatePresence>
        {selectedPostForAnalytics && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-2xl bg-[#0a071f] border border-violet-500/25 rounded-[32px] p-6 space-y-6 shadow-2xl relative max-h-[90vh] overflow-y-auto"
            >
              <button 
                onClick={() => setSelectedPostForAnalytics(null)}
                className="absolute top-5 right-5 p-1.5 hover:bg-white/5 text-zinc-400 hover:text-white rounded-full transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="space-y-1">
                <span className="text-[10px] text-violet-400 font-extrabold uppercase tracking-widest">Individual Node Analysis</span>
                <h3 className="text-xl font-black text-white leading-tight">"{selectedPostForAnalytics.content || 'Untitled Post'}"</h3>
                <p className="text-[10px] text-zinc-500 font-mono">ID: {selectedPostForAnalytics.id} • Posted on {new Date(selectedPostForAnalytics.timestamp).toLocaleString()}</p>
              </div>

              {/* Individual Bento Stats */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { label: 'Impressions', val: (selectedPostForAnalytics.views || 0).toLocaleString(), icon: Eye, color: 'text-sky-400' },
                  { label: 'Sparks Received', val: (selectedPostForAnalytics.likes || 0).toLocaleString(), icon: Sparkles, color: 'text-pink-400' },
                  { label: 'Bookmarks Saved', val: (selectedPostForAnalytics.saves || 0).toLocaleString(), icon: Bookmark, color: 'text-violet-400' },
                  { label: 'Comments Posted', val: (selectedPostForAnalytics.commentsCount || selectedPostForAnalytics.comments?.length || 0).toLocaleString(), icon: MessageSquare, color: 'text-emerald-400' }
                ].map((c, idx) => (
                  <div key={idx} className="p-4 rounded-xl bg-white/3 border border-white/5 text-xs space-y-1">
                    <span className="text-[9px] text-zinc-500 uppercase font-bold tracking-wider">{c.label}</span>
                    <p className="text-lg font-black text-white">{c.val}</p>
                  </div>
                ))}
              </div>

              {/* Extra engagement analysis */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-[#120a3a]/30 border border-violet-500/10 space-y-2">
                  <h5 className="text-xs font-extrabold text-white uppercase tracking-wider">Engagement Efficiency</h5>
                  <div className="space-y-3 pt-1 text-xs">
                    <div className="flex justify-between">
                      <span className="text-zinc-400">Profile Visits generated</span>
                      <strong className="text-white font-mono">{Math.floor((selectedPostForAnalytics.views || 100) * 0.18)}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-400">Followers gained from post</span>
                      <strong className="text-emerald-400 font-mono">+{Math.floor((selectedPostForAnalytics.likes || 10) * 0.12)}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-400">Unique Viewers ratio</span>
                      <strong className="text-sky-400 font-mono">82.4%</strong>
                    </div>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-white/3 border border-white/5 flex flex-col justify-between">
                  <div className="space-y-1.5 text-xs">
                    <span className="text-[10px] text-pink-400 font-extrabold uppercase">Content Recommendation Engine Verdict</span>
                    <p className="font-bold text-white">Algorithm Classification: <strong className="text-pink-400">Viral Tier 2</strong></p>
                    <p className="text-[10px] text-zinc-400 leading-relaxed">This post is performing 18% better in viewer completion rate than other posts with similar tags. High relevance score.</p>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 2: EDIT METADATA MODAL */}
      <AnimatePresence>
        {editingPost && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md bg-[#0a071f] border border-violet-500/25 rounded-[32px] p-6 space-y-4 shadow-2xl relative"
            >
              <button 
                onClick={() => setEditingPost(null)}
                className="absolute top-5 right-5 p-1.5 hover:bg-white/5 text-zinc-400 hover:text-white rounded-full transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>

              <h3 className="text-lg font-black text-white tracking-tight">Edit Post Metadata</h3>
              
              <div className="space-y-3.5 text-xs">
                <div className="space-y-1">
                  <label className="text-zinc-400 font-bold">Edit Caption</label>
                  <textarea
                    value={editCaption}
                    onChange={(e) => setEditCaption(e.target.value)}
                    rows={3}
                    placeholder="Write a custom caption..."
                    className="w-full bg-[#0a071f] border border-white/10 rounded-xl p-3 text-xs text-white placeholder-zinc-500 focus:outline-hidden focus:border-violet-500/40 transition-colors"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-zinc-400 font-bold">Hashtags / Tags (Comma separated)</label>
                  <input
                    type="text"
                    value={editTags}
                    onChange={(e) => setEditTags(e.target.value)}
                    placeholder="tech, ai, coding"
                    className="w-full bg-[#0a071f] border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-hidden focus:border-violet-500/40 transition-colors"
                  />
                </div>

                <div className="flex gap-2 pt-2 justify-end">
                  <button 
                    onClick={() => setEditingPost(null)}
                    className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-bold transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={handleEditPostSave}
                    className="px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-xs font-black tracking-wide shadow-lg shadow-violet-600/20 transition-all cursor-pointer"
                  >
                    Save Changes
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 3: MEDIA PREVIEW LIGHTBOX */}
      <AnimatePresence>
        {previewMediaUrl && (
          <div className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-4">
            <button 
              onClick={() => setPreviewMediaUrl(null)}
              className="absolute top-5 right-5 p-2 bg-white/5 text-zinc-400 hover:text-white rounded-full transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="max-w-2xl w-full max-h-[80vh] flex flex-col items-center justify-center space-y-4">
              {previewMediaUrl.includes('.mp4') || previewMediaUrl.includes('assets.mixkit.co') ? (
                <video src={previewMediaUrl} className="max-w-full max-h-[70vh] rounded-2xl border border-white/10 shadow-2xl" controls autoPlay loop />
              ) : (
                <img src={previewMediaUrl} className="max-w-full max-h-[70vh] rounded-2xl border border-white/10 shadow-2xl object-contain" />
              )}
              <div className="flex gap-4 text-xs font-mono text-zinc-500 bg-black/40 px-4 py-2 border border-white/5 rounded-full">
                <span>Scan Check: <strong className="text-emerald-400 font-bold">Passed</strong></span>
                <span>Copyright Check: <strong className="text-emerald-400 font-bold">Clear</strong></span>
              </div>
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 4: RELEASE EDITOR / DRAFT / SCHEDULE MODAL */}
      <AnimatePresence>
        {showDraftModal && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-lg bg-[#0a071f] border border-violet-500/25 rounded-[32px] p-6 space-y-4 shadow-2xl relative max-h-[90vh] overflow-y-auto"
            >
              <button 
                onClick={() => { clearDraftForm(); setShowDraftModal(false); }}
                className="absolute top-5 right-5 p-1.5 hover:bg-white/5 text-zinc-400 hover:text-white rounded-full transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="flex items-center gap-2">
                <h3 className="text-lg font-black text-white tracking-tight">
                  {currentDraftId ? 'Edit Saved Draft' : 'Create New Release'}
                </h3>
                <span className="text-[9px] bg-violet-600/15 text-violet-300 px-2 py-0.5 rounded-full font-mono font-bold animate-pulse">Autosave Active</span>
              </div>

              <div className="space-y-3.5 text-xs">
                <div className="space-y-1">
                  <label className="text-zinc-400 font-bold">Release Caption</label>
                  <textarea
                    value={draftCaption}
                    onChange={(e) => setDraftCaption(e.target.value)}
                    rows={3}
                    placeholder="Write caption, insights, or story breakdown..."
                    className="w-full bg-[#0a071f] border border-white/10 rounded-xl p-3 text-xs text-white placeholder-zinc-500 focus:outline-hidden focus:border-violet-500/40 transition-colors"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-zinc-400 font-bold">Hashtags / Tags (Comma separated)</label>
                  <input
                    type="text"
                    value={draftTags}
                    onChange={(e) => setDraftTags(e.target.value)}
                    placeholder="cooking, technology, daily"
                    className="w-full bg-[#0a071f] border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-hidden focus:border-violet-500/40 transition-colors"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-zinc-400 font-bold">Content Type</label>
                    <select
                      value={draftType}
                      onChange={(e: any) => setDraftType(e.target.value)}
                      className="w-full bg-[#0a071f] border border-white/10 rounded-xl px-3 py-2 text-xs text-zinc-300 outline-hidden"
                    >
                      <option value="video">Short Video / Reel</option>
                      <option value="image">Image Display</option>
                      <option value="text">Pure Text Broadcast</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-zinc-400 font-bold">Media URL (Preset/Stock)</label>
                    <input
                      type="text"
                      value={draftUrl}
                      onChange={(e) => setDraftUrl(e.target.value)}
                      placeholder="https://assets.mixkit.co/..."
                      className="w-full bg-[#0a071f] border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-hidden focus:border-violet-500/40 transition-colors"
                    />
                  </div>
                </div>

                {/* Publishing Mode */}
                <div className="space-y-2 pt-2 border-t border-white/5">
                  <label className="text-zinc-400 font-bold block">Publishing Mode</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setPublishMode('immediate')}
                      className={`py-2 rounded-xl text-xs font-bold border transition-colors ${
                        publishMode === 'immediate' 
                          ? 'bg-violet-600/10 border-violet-500/30 text-violet-300' 
                          : 'bg-transparent border-white/5 text-zinc-400 hover:text-white'
                      }`}
                    >
                      Publish Immediately
                    </button>
                    <button
                      type="button"
                      onClick={() => setPublishMode('schedule')}
                      className={`py-2 rounded-xl text-xs font-bold border transition-colors ${
                        publishMode === 'schedule' 
                          ? 'bg-pink-500/10 border-pink-500/30 text-pink-300' 
                          : 'bg-transparent border-white/5 text-zinc-400 hover:text-white'
                      }`}
                    >
                      Schedule Publishing
                    </button>
                  </div>
                </div>

                {/* Scheduled details inputs */}
                {publishMode === 'schedule' && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="grid grid-cols-2 gap-3 pt-2 overflow-hidden"
                  >
                    <div className="space-y-1">
                      <label className="text-zinc-400 text-[10px] block">Date</label>
                      <input
                        type="date"
                        value={scheduleDate}
                        onChange={(e) => setScheduleDate(e.target.value)}
                        className="w-full bg-[#0a071f] border border-white/10 rounded-xl px-3 py-2 text-xs text-white"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-zinc-400 text-[10px] block">Time</label>
                      <input
                        type="time"
                        value={scheduleTime}
                        onChange={(e) => setScheduleTime(e.target.value)}
                        className="w-full bg-[#0a071f] border border-white/10 rounded-xl px-3 py-2 text-xs text-white"
                      />
                    </div>
                  </motion.div>
                )}

                <div className="flex gap-2 pt-4 justify-between border-t border-white/5">
                  <button 
                    type="button"
                    onClick={handleSaveDraft}
                    className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 text-xs font-bold transition-colors cursor-pointer flex items-center gap-1"
                  >
                    Save to Drafts
                  </button>
                  <div className="flex gap-2">
                    <button 
                      type="button"
                      onClick={() => { clearDraftForm(); setShowDraftModal(false); }}
                      className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-bold transition-colors"
                    >
                      Discard
                    </button>
                    <button 
                      type="button"
                      onClick={() => handlePublishDraft({ id: currentDraftId || 'temp' })}
                      className="px-4 py-2 rounded-xl bg-linear-to-r from-violet-600 to-pink-600 hover:opacity-90 text-xs font-black tracking-wide shadow-lg"
                    >
                      {publishMode === 'schedule' ? 'Schedule Post' : 'Publish Live Now'}
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 5: GUIDELINES APPEAL MODAL */}
      <AnimatePresence>
        {appealModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md bg-[#0a071f] border border-violet-500/25 rounded-[32px] p-6 space-y-4 shadow-2xl relative"
            >
              <button 
                onClick={() => setAppealModalOpen(false)}
                className="absolute top-5 right-5 p-1.5 hover:bg-white/5 text-zinc-400 hover:text-white rounded-full transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>

              <h3 className="text-lg font-black text-white tracking-tight">File Guideline Appeal</h3>
              <p className="text-xs text-zinc-400 leading-relaxed">Submit an automated legal appeal to the Nexora review board. Please specify details on why your media asset complies fully with terms of use.</p>
              
              <div className="space-y-3.5 text-xs">
                <div className="space-y-1">
                  <label className="text-zinc-400 font-bold">Explanation Reason</label>
                  <textarea
                    value={appealReason}
                    onChange={(e) => setAppealReason(e.target.value)}
                    rows={4}
                    placeholder="This media is my own original creation, filmed and compiled in my studio space..."
                    className="w-full bg-[#0a071f] border border-white/10 rounded-xl p-3 text-xs text-white placeholder-zinc-500 focus:outline-hidden focus:border-violet-500/40 transition-colors"
                  />
                </div>

                <div className="flex gap-2 pt-2 justify-end">
                  <button 
                    onClick={() => setAppealModalOpen(false)}
                    className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-bold transition-colors"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={handleSubmitAppeal}
                    className="px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-xs font-black tracking-wide shadow-lg shadow-violet-600/20 transition-all cursor-pointer"
                  >
                    Submit Legal Appeal
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
