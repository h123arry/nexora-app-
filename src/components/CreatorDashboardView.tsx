import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import NexoraLoader from './NexoraLoader';
import CreatorAcademyView from './CreatorAcademyView';
import CreatorGiftEarningsPanel from './CreatorGiftEarningsPanel';
import CreatorEconomyExpansionPanel from './CreatorEconomyExpansionPanel';
import { listCreatorStudioTemplates, saveCreatorStudioTemplate, deleteCreatorStudioTemplate, CreatorStudioTemplate } from '../services/creatorStudioService';
import { TrendingUp, Award, Clock, Eye, Sparkles, Bookmark, Users, Check, Trash2, Edit, Plus, Search, Filter, Calendar, ChevronRight, ArrowRight, X, Lock, Shield, Globe, Laptop, FileText, MoreVertical, Archive, RefreshCw, Sliders, EyeOff, HelpCircle, Info, Folder, Bell, Sun, Volume2, AlertTriangle, Download, Gift, DollarSign, Smartphone, Tablet, CheckCircle, MessageSquare, Heart, ChevronDown, GraduationCap } from 'lucide-react';
import { User, Post, Notification } from '../types';
import { db } from '../lib/firebase';
import { getDownloadURL, ref } from 'firebase/storage';
import { storage } from '../services/firebase/config';
import { 
  doc, updateDoc, deleteDoc, addDoc, collection, 
  getDocs, query, where, serverTimestamp, limit 
} from 'firebase/firestore';
import { submitModerationAppeal } from '../services/dataService';
import { buildPostAnalytics } from '../services/analytics/postAnalytics';
import { buildCreatorGrowthInsights } from '../services/analytics/creatorGrowthInsights';
import { uploadMediaFile } from '../services/firebase/storageService';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { app } from '../services/firebase/config';
import { scheduleCreatorPost, listCreatorScheduledPosts, cancelCreatorScheduledPost, type CreatorScheduledPost } from '../services/creatorSchedulingService';

interface CreatorDashboardViewProps {
  currentUser: User;
  posts: Post[];
  onAddPost: (content: string, imageUrl?: string, tagsString?: string, images?: string[], videoUrl?: string) => string;
  onClose?: () => any;
  onUpdateProfile?: (updatedData: Partial<User>) => void;
}

export default function CreatorDashboardView({
  currentUser,
  posts,
  onAddPost,
  onClose,
  onUpdateProfile
}: CreatorDashboardViewProps) {
  // Tabs & Navigation
  const [activeTab, setActiveTab] = useState<'overview' | 'academy' | 'analytics' | 'content' | 'drafts' | 'media' | 'achievements' | 'policy' | 'monetization'>('overview');
  
  // Real Local state for Optimistic UI and responsiveness
  const [localPosts, setLocalPosts] = useState<Post[]>([]);
  const [drafts, setDrafts] = useState<any[]>([]);
  const [isDraftsLoading, setIsDraftsLoading] = useState(true);
  const [studioTemplates, setStudioTemplates] = useState<CreatorStudioTemplate[]>([]);
  const [isTemplatesLoading, setIsTemplatesLoading] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [videoRetention, setVideoRetention] = useState<{ points: Array<{ day: string; sessionsStarted: number; uniqueViewers: number; acceptedWatchSeconds: number; averageAcceptedWatchSeconds: number | null }>; source: string; verifiedByServer: boolean; humanPlaybackProof: boolean } | null>(null);
  const [isVideoRetentionLoading, setIsVideoRetentionLoading] = useState(false);
  const [videoRetentionError, setVideoRetentionError] = useState(false);
  
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
  const [uploadedMedia, setUploadedMedia] = useState<any[]>([]);
  const [isMediaLibraryLoading, setIsMediaLibraryLoading] = useState(false);
  
  // Draft Editor
  const [showDraftModal, setShowDraftModal] = useState(false);
  const [currentDraftId, setCurrentDraftId] = useState<string | null>(null);
  const [draftCaption, setDraftCaption] = useState('');
  const [draftTags, setDraftTags] = useState('');
  const [draftType, setDraftType] = useState<'video' | 'image' | 'text'>('video');
  const [draftUrl, setDraftUrl] = useState('');
  const [isUploadingDraftMedia, setIsUploadingDraftMedia] = useState(false);
  const [draftUploadProgress, setDraftUploadProgress] = useState(0);
  const [scheduledAtInput, setScheduledAtInput] = useState('');
  const [isSchedulingDraft, setIsSchedulingDraft] = useState(false);
  const [scheduledPosts, setScheduledPosts] = useState<CreatorScheduledPost[]>([]);
  const [isScheduledPostsLoading, setIsScheduledPostsLoading] = useState(false);
  
  // Recovery Unsaved Draft Notice
  const [recoveredDraft, setRecoveredDraft] = useState<any | null>(null);
  const [appealModalOpen, setAppealModalOpen] = useState(false);
  const [appealReason, setAppealReason] = useState('');
  const [appealPostId, setAppealPostId] = useState('');

  // Local storage auto-save ref
  const lastDraftSaveRef = useRef<{ caption: string; tags: string; type: 'video' | 'image' | 'text'; url: string } | null>(null);

  useEffect(() => {
    setLocalPosts(posts.filter(post => post.userId === currentUser.id));
  }, [posts, currentUser.id]);

  useEffect(() => {
    if (activeTab !== 'analytics') return;
    let cancelled = false;
    setIsVideoRetentionLoading(true);
    setVideoRetentionError(false);
    const loadRetention = async () => {
      try {
        const callable = httpsCallable(getFunctions(app), 'getCreatorVideoRetention');
        const response = await callable({ days: 7 });
        const data = response.data as typeof videoRetention;
        if (!cancelled) setVideoRetention(data);
      } catch {
        if (!cancelled) setVideoRetentionError(true);
      } finally {
        if (!cancelled) setIsVideoRetentionLoading(false);
      }
    };
    void loadRetention();
    return () => { cancelled = true; };
  }, [activeTab, currentUser.id]);

  useEffect(() => {
    let cancelled = false;
    setDrafts([]);
    setIsDraftsLoading(true);
    setIsLoading(true);
    const loadDrafts = async () => {
      try {
        const snapshot = await getDocs(query(collection(db, 'drafts'), where('userId', '==', currentUser.id), limit(100)));
        if (cancelled) return;
        const loaded = snapshot.docs.map(item => ({ id: item.id, ...item.data() }))
          .sort((left: any, right: any) => {
            const leftTime = left.updatedAt?.toMillis?.() ?? new Date(left.updatedAt || 0).getTime();
            const rightTime = right.updatedAt?.toMillis?.() ?? new Date(right.updatedAt || 0).getTime();
            return rightTime - leftTime;
          });
        setDrafts(loaded);
      } catch {
        if (!cancelled) window.dispatchEvent(new CustomEvent('toast', { detail: 'Creator drafts could not be loaded. Check your connection and try again.' }));
      } finally {
        if (!cancelled) {
          setIsDraftsLoading(false);
          setIsLoading(false);
        }
      }
    };
    void loadDrafts();
    const saved = localStorage.getItem(`nexora_unsaved_draft_${currentUser.id}`);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed && (parsed.caption || parsed.tags || parsed.videoUrl) && parsed.userId === currentUser.id) setRecoveredDraft(parsed);
      } catch {
        localStorage.removeItem(`nexora_unsaved_draft_${currentUser.id}`);
      }
    } else {
      setRecoveredDraft(null);
    }
    return () => { cancelled = true; };
  }, [currentUser.id]);

  useEffect(() => {
    let cancelled = false;
    setIsTemplatesLoading(true);
    listCreatorStudioTemplates()
      .then(items => { if (!cancelled) setStudioTemplates(items); })
      .catch(() => { if (!cancelled) window.dispatchEvent(new CustomEvent('toast', { detail: 'Creator templates could not be loaded. Check your connection and retry.' })); })
      .finally(() => { if (!cancelled) setIsTemplatesLoading(false); });
    return () => { cancelled = true; };
  }, [currentUser.id]);

  useEffect(() => {
    if (activeTab !== 'drafts') return;
    let cancelled = false;
    setIsScheduledPostsLoading(true);
    listCreatorScheduledPosts()
      .then(items => { if (!cancelled) setScheduledPosts(items); })
      .catch(() => {
        if (!cancelled) window.dispatchEvent(new CustomEvent('toast', { detail: 'Scheduled posts could not be loaded. Please retry.' }));
      })
      .finally(() => { if (!cancelled) setIsScheduledPostsLoading(false); });
    return () => { cancelled = true; };
  }, [activeTab, currentUser.id]);

  const handleCancelScheduledPost = async (scheduleId: string) => {
    try {
      await cancelCreatorScheduledPost(scheduleId);
      setScheduledPosts(prev => prev.map(item => item.id === scheduleId ? { ...item, status: 'cancelled' } : item));
      window.dispatchEvent(new CustomEvent('toast', { detail: 'Scheduled post cancelled.' }));
    } catch (error) {
      window.dispatchEvent(new CustomEvent('toast', { detail: error instanceof Error ? error.message : 'Scheduled post could not be cancelled.' }));
    }
  };

  const handleSaveStudioTemplate = async () => {
    if (templateName.trim().length < 2) {
      window.dispatchEvent(new CustomEvent('toast', { detail: 'Give this template a name of at least 2 characters.' }));
      return;
    }
    try {
      const saved = await saveCreatorStudioTemplate({
        name: templateName.trim(), caption: draftCaption.trim(), format: draftType,
        tags: draftTags.split(',').map(tag => tag.trim().replace(/^#/, '')).filter(Boolean),
      });
      const refreshed = await listCreatorStudioTemplates();
      setStudioTemplates(refreshed);
      setTemplateName('');
      window.dispatchEvent(new CustomEvent('toast', { detail: saved.saved ? 'Reusable template saved to your account.' : 'Template could not be saved.' }));
    } catch (error) {
      window.dispatchEvent(new CustomEvent('toast', { detail: error instanceof Error ? error.message : 'Template could not be saved.' }));
    }
  };

  const handleApplyStudioTemplate = (template: CreatorStudioTemplate) => {
    setDraftCaption(template.caption);
    setDraftTags(template.tags.join(', '));
    setDraftType(template.format);
    setCurrentDraftId(null);
    setShowDraftModal(true);
  };

  const handleDeleteStudioTemplate = async (templateId: string) => {
    try {
      await deleteCreatorStudioTemplate(templateId);
      setStudioTemplates(prev => prev.filter(template => template.id !== templateId));
      window.dispatchEvent(new CustomEvent('toast', { detail: 'Template deleted.' }));
    } catch {
      window.dispatchEvent(new CustomEvent('toast', { detail: 'Template could not be deleted. Please retry.' }));
    }
  };

  // Draft Continuous Auto-Save Trigger
  useEffect(() => {
    if (!showDraftModal) return;
    const interval = setInterval(() => {
      if (draftCaption === lastDraftSaveRef.current?.caption && draftTags === lastDraftSaveRef.current?.tags && draftType === lastDraftSaveRef.current?.type && draftUrl === lastDraftSaveRef.current?.url) return;
      const unsaved = { userId: currentUser.id, caption: draftCaption, tags: draftTags, type: draftType, videoUrl: draftUrl, savedAt: new Date().toISOString() };
      localStorage.setItem(`nexora_unsaved_draft_${currentUser.id}`, JSON.stringify(unsaved));
      lastDraftSaveRef.current = { caption: draftCaption, tags: draftTags, type: draftType, url: draftUrl };
    }, 2500);

    return () => clearInterval(interval);
  }, [draftCaption, draftTags, draftType, draftUrl, showDraftModal, currentUser.id]);

  // Only aggregate counters present on the user's stored post records.
  const stats = useMemo(() => {
    const active = localPosts.filter(post => !post.isArchived);
    const postMetrics = active.map(buildPostAnalytics);
    const recordedViews = postMetrics.filter(metric => metric.views !== null);
    return {
      totalViews: recordedViews.length
        ? recordedViews.reduce((sum, metric) => sum + (metric.views || 0), 0)
        : null as number | null,
      totalSparks: postMetrics.reduce((sum, metric) => sum + metric.likes, 0),
      totalComments: postMetrics.reduce((sum, metric) => sum + metric.comments, 0),
      totalShares: postMetrics.reduce((sum, metric) => sum + metric.shares, 0),
      totalBookmarks: postMetrics.reduce((sum, metric) => sum + metric.saves, 0),
      followerChange: null as number | null,
      profileViews: null as number | null,
      totalWatchTimeHours: null as number | null,
      avgWatchDuration: null as number | null,
      avgCompletionRate: null as number | null
    };
  }, [localPosts]);

  const selectedPostAnalytics = selectedPostForAnalytics
    ? buildPostAnalytics(selectedPostForAnalytics)
    : null;
  const formatMetric = (value: number | null) => value === null ? 'Not tracked' : value.toLocaleString();

  // Optimistic Post Management Functions (Firestore Sync in background)
  const handleEditPostSave = async () => {
    if (!editingPost) return;
    const postId = editingPost.id;
    const updatedCaption = editCaption;
    const updatedTags = editTags.split(',').map(t => t.trim().replace('#', '')).filter(Boolean);

    try {
      await updateDoc(doc(db, 'posts', postId), {
        content: updatedCaption,
        tags: updatedTags,
        updatedAt: serverTimestamp(),
      });
      setLocalPosts(prev => prev.map(p => p.id === postId ? { ...p, content: updatedCaption, tags: updatedTags } : p));
      setEditingPost(null);
      window.dispatchEvent(new CustomEvent('toast', { detail: 'Post changes saved.' }));
    } catch (error) {
      console.error('Creator post update failed:', error);
      window.dispatchEvent(new CustomEvent('toast', { detail: 'Post changes were not saved. Check your connection and try again.' }));
    }
  };

  const handleArchivePost = async (postId: string, archiveState: boolean) => {
    try {
      await updateDoc(doc(db, 'posts', postId), {
        isArchived: archiveState,
        updatedAt: serverTimestamp(),
      });
      setLocalPosts(prev => prev.map(p => p.id === postId ? { ...p, isArchived: archiveState } : p));
      window.dispatchEvent(new CustomEvent('toast', {
        detail: archiveState ? 'Post moved to Studio archives.' : 'Post restored to your feed.',
      }));
    } catch (error) {
      console.error('Creator post archive update failed:', error);
      window.dispatchEvent(new CustomEvent('toast', { detail: 'The post was not changed. Check your connection and try again.' }));
    }
  };

  const handleDeletePost = async (postId: string) => {
    if (!confirm('Are you sure you want to permanently delete this post? This cannot be undone.')) return;
    try {
      await deleteDoc(doc(db, 'posts', postId));
      setLocalPosts(prev => prev.filter(p => p.id !== postId));
      setBulkSelectedIds(prev => prev.filter(id => id !== postId));
      window.dispatchEvent(new CustomEvent('toast', { detail: 'Post permanently deleted.' }));
    } catch (error) {
      console.error('Creator post deletion failed:', error);
      window.dispatchEvent(new CustomEvent('toast', { detail: 'The post could not be deleted. Check your connection and try again.' }));
    }
  };

  // Bulk actions are committed only after every selected write succeeds.
  const handleBulkArchive = async () => {
    if (bulkSelectedIds.length === 0) return;
    const targets = [...bulkSelectedIds];
    try {
      await Promise.all(targets.map(id => updateDoc(doc(db, 'posts', id), {
        isArchived: true,
        updatedAt: serverTimestamp(),
      })));
      setLocalPosts(prev => prev.map(p => targets.includes(p.id) ? { ...p, isArchived: true } : p));
      setBulkSelectedIds([]);
      window.dispatchEvent(new CustomEvent('toast', { detail: `Archived ${targets.length} posts.` }));
    } catch (error) {
      console.error('Creator bulk archive failed:', error);
      window.dispatchEvent(new CustomEvent('toast', { detail: 'Some posts could not be archived. Your selection was kept so you can retry.' }));
    }
  };

  const handleBulkDelete = async () => {
    if (bulkSelectedIds.length === 0) return;
    if (!confirm(`Are you absolutely sure you want to delete ${bulkSelectedIds.length} posts?`)) return;
    const targets = [...bulkSelectedIds];
    try {
      await Promise.all(targets.map(id => deleteDoc(doc(db, 'posts', id))));
      setLocalPosts(prev => prev.filter(p => !targets.includes(p.id)));
      setBulkSelectedIds([]);
      window.dispatchEvent(new CustomEvent('toast', { detail: `Deleted ${targets.length} posts.` }));
    } catch (error) {
      console.error('Creator bulk deletion failed:', error);
      window.dispatchEvent(new CustomEvent('toast', { detail: 'Some posts could not be deleted. Your selection was kept so you can retry.' }));
    }
  };

  const handleUploadDraftMedia = async (file: File) => {
    if (!file) return;
    setIsUploadingDraftMedia(true);
    setDraftUploadProgress(0);
    try {
      const uploaded = await uploadMediaFile({
        file,
        userId: currentUser.id,
        fileName: file.name,
        onProgress: setDraftUploadProgress,
      });
      const uploadedType = uploaded.contentType.startsWith('image/') ? 'image' : 'video';
      setUploadedMedia(prev => [{
        id: `asset-${uploaded.mediaId}`,
        url: uploaded.downloadUrl,
        caption: file.name,
        type: uploadedType,
        views: null,
        sparks: null,
        date: new Date().toISOString(),
      }, ...prev.filter(media => media.id !== `asset-${uploaded.mediaId}`)]);
      setDraftUrl(uploaded.downloadUrl);
      setDraftType(uploadedType);
      window.dispatchEvent(new CustomEvent('toast', { detail: 'Media uploaded securely to your Nexora account.' }));
    } catch (error) {
      window.dispatchEvent(new CustomEvent('toast', {
        detail: error instanceof Error ? error.message : 'Media upload failed. Please try again.'
      }));
    } finally {
      setIsUploadingDraftMedia(false);
    }
  };

  const handleSaveDraft = async () => {
    if (isUploadingDraftMedia) return;
    const tags = draftTags.split(',').map(tag => tag.trim().replace(/^#/, '')).filter(Boolean).slice(0, 30);
    const payload = { userId: currentUser.id, caption: draftCaption.trim().slice(0, 10000), videoUrl: draftUrl.trim().slice(0, 1000), type: draftType, tags, updatedAt: serverTimestamp() };
    try {
      if (currentDraftId) {
        await updateDoc(doc(db, 'drafts', currentDraftId), payload);
        setDrafts(prev => prev.map(item => item.id === currentDraftId ? { id: currentDraftId, ...payload, updatedAt: new Date().toISOString() } : item));
      } else {
        const created = await addDoc(collection(db, 'drafts'), payload);
        setDrafts(prev => [{ id: created.id, ...payload, updatedAt: new Date().toISOString() }, ...prev]);
      }
      localStorage.removeItem(`nexora_unsaved_draft_${currentUser.id}`);
      setRecoveredDraft(null);
      setShowDraftModal(false);
      clearDraftForm();
      window.dispatchEvent(new CustomEvent('toast', { detail: 'Draft saved to your Nexora account.' }));
    } catch {
      window.dispatchEvent(new CustomEvent('toast', { detail: 'Draft could not be saved. Please try again.' }));
    }
  };

  const handleDeleteDraft = async (draftId: string) => {
    try {
      await deleteDoc(doc(db, 'drafts', draftId));
      setDrafts(prev => prev.filter(item => item.id !== draftId));
      window.dispatchEvent(new CustomEvent('toast', { detail: 'Draft deleted.' }));
    } catch {
      window.dispatchEvent(new CustomEvent('toast', { detail: 'Draft could not be deleted. Please try again.' }));
    }
  };

  const handlePublishDraft = async (draft: any) => {
    if (isUploadingDraftMedia) return;
    const caption = draftCaption.trim();
    const mediaUrl = draftUrl.trim();
    if (!caption && draftType === 'text') {
      window.dispatchEvent(new CustomEvent('toast', { detail: 'Add a caption before publishing.' }));
      return;
    }
    if (draftType !== 'text') {
      if (!mediaUrl) {
        window.dispatchEvent(new CustomEvent('toast', { detail: 'Add a media URL before publishing.' }));
        return;
      }
      try {
        const parsedUrl = new URL(mediaUrl);
        if (!['http:', 'https:'].includes(parsedUrl.protocol)) throw new Error('Unsupported media URL');
      } catch {
        window.dispatchEvent(new CustomEvent('toast', { detail: 'Enter a valid HTTP or HTTPS media URL.' }));
        return;
      }
    }
    try {
      const postId = onAddPost(caption, draftType === 'image' ? mediaUrl : undefined, draftTags, undefined, draftType === 'video' ? mediaUrl : undefined);
      if (!postId) return;
      if (draft?.id && draft.id !== 'temp') {
        try {
          await deleteDoc(doc(db, 'drafts', draft.id));
          setDrafts(prev => prev.filter(item => item.id !== draft.id));
        } catch {
          window.dispatchEvent(new CustomEvent('toast', { detail: 'Post submitted, but its saved draft could not be removed.' }));
        }
      }
      localStorage.removeItem(`nexora_unsaved_draft_${currentUser.id}`);
      setRecoveredDraft(null);
      setShowDraftModal(false);
      clearDraftForm();
      window.dispatchEvent(new CustomEvent('toast', { detail: 'Post submitted to Nexora.' }));
    } catch {
      window.dispatchEvent(new CustomEvent('toast', { detail: 'Post could not be submitted. Your draft has been kept.' }));
    }
  };

  const handleScheduleDraft = async (draft: any) => {
    if (isUploadingDraftMedia || isSchedulingDraft) return;
    const content = draftCaption.trim();
    const mediaUrl = draftUrl.trim();
    if (!content && draftType === 'text') {
      window.dispatchEvent(new CustomEvent('toast', { detail: 'Add a caption before scheduling.' }));
      return;
    }
    if (draftType !== 'text' && !mediaUrl) {
      window.dispatchEvent(new CustomEvent('toast', { detail: 'Add media before scheduling.' }));
      return;
    }
    const scheduledDate = new Date(scheduledAtInput);
    if (!scheduledAtInput || !Number.isFinite(scheduledDate.getTime())) {
      window.dispatchEvent(new CustomEvent('toast', { detail: 'Choose a publishing date and time.' }));
      return;
    }
    setIsSchedulingDraft(true);
    try {
      const result = await scheduleCreatorPost({
        content,
        imageUrl: draftType === 'image' ? mediaUrl : undefined,
        videoUrl: draftType === 'video' ? mediaUrl : undefined,
        tags: draftTags.split(',').map(tag => tag.trim().replace(/^#/, '')).filter(Boolean).slice(0, 30),
        scheduledAt: scheduledDate.toISOString(),
      });
      if (draft?.id && draft.id !== 'temp') {
        try {
          await deleteDoc(doc(db, 'drafts', draft.id));
          setDrafts(prev => prev.filter(item => item.id !== draft.id));
        } catch {
          window.dispatchEvent(new CustomEvent('toast', { detail: 'Post scheduled, but its saved draft could not be removed.' }));
        }
      }
      localStorage.removeItem(`nexora_unsaved_draft_${currentUser.id}`);
      setRecoveredDraft(null);
      setShowDraftModal(false);
      clearDraftForm();
      setScheduledAtInput('');
      window.dispatchEvent(new CustomEvent('toast', { detail: `Post scheduled for ${new Date(result.scheduledAt).toLocaleString()}.` }));
    } catch (error) {
      window.dispatchEvent(new CustomEvent('toast', { detail: error instanceof Error ? error.message : 'Post could not be scheduled. Your draft has been kept.' }));
    } finally {
      setIsSchedulingDraft(false);
    }
  };

  const handleOpenDraftEdit = (draft: any) => {
    setCurrentDraftId(draft.id);
    setDraftCaption(draft.caption);
    setDraftTags(Array.isArray(draft.tags) ? draft.tags.join(', ') : (draft.tags || ''));
    setDraftType(draft.type || 'text');
    setDraftUrl(draft.videoUrl || '');
    setShowDraftModal(true);
  };

  const clearDraftForm = () => {
    setScheduledAtInput('');
    setCurrentDraftId(null);
    setDraftCaption('');
    setDraftTags('');
    setDraftType('video');
    setDraftUrl('');
  };

  const handleRecoverUnsaved = () => {
    if (!recoveredDraft) return;
    setDraftCaption(recoveredDraft.caption);
    setDraftTags(recoveredDraft.tags);
    setDraftType(recoveredDraft.type || 'text');
    setDraftUrl(recoveredDraft.videoUrl || '');
    setShowDraftModal(true);
    setRecoveredDraft(null);
    localStorage.removeItem(`nexora_unsaved_draft_${currentUser.id}`);
    window.dispatchEvent(new CustomEvent('toast', { detail: '🔄 Auto-saved draft successfully recovered!' }));
  };

  // Copyright Appeals Handler
  const handleSubmitAppeal = async () => {
    if (!appealReason.trim()) {
      alert('Please provide an explanation for your appeal.');
      return;
    }
    try {
      await submitModerationAppeal(currentUser.id, 'post', appealPostId, appealReason);
      window.dispatchEvent(new CustomEvent('toast', { detail: '⚖️ Appeal submitted to the moderation queue.' }));
      setAppealModalOpen(false);
      setAppealReason('');
    } catch (error) {
      console.error('Moderation appeal submission failed:', error);
      window.dispatchEvent(new CustomEvent('toast', { detail: error instanceof Error ? error.message : 'Appeal could not be submitted.' }));
    }
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

  // Load this creator's verified media assets from their owner-scoped library.
  useEffect(() => {
    let cancelled = false;
    setIsMediaLibraryLoading(true);
    const loadMediaLibrary = async () => {
      try {
        const snapshot = await getDocs(query(
          collection(db, 'mediaAssets'),
          where('ownerId', '==', currentUser.id),
          limit(100)
        ));
        const assets = await Promise.all(snapshot.docs.map(async assetDoc => {
          const asset = assetDoc.data();
          if (!['image', 'video'].includes(asset.kind) || !['uploaded', 'pending_upload'].includes(asset.status) || typeof asset.storagePath !== 'string') return null;
          try {
            const url = await getDownloadURL(ref(storage, asset.storagePath));
            return {
              id: `asset-${assetDoc.id}`,
              url,
              caption: assetDoc.id,
              type: asset.kind,
              views: null,
              sparks: null,
              date: asset.uploadedAt?.toDate?.()?.toISOString?.() || asset.createdAt?.toDate?.()?.toISOString?.() || '',
            };
          } catch {
            return null;
          }
        }));
        if (!cancelled) setUploadedMedia(assets.filter(Boolean));
      } catch {
        if (!cancelled) window.dispatchEvent(new CustomEvent('toast', {
          detail: 'Your uploaded media library could not be loaded. Try again when connected.'
        }));
      } finally {
        if (!cancelled) setIsMediaLibraryLoading(false);
      }
    };
    void loadMediaLibrary();
    return () => { cancelled = true; };
  }, [currentUser.id]);

  // Combine actual uploaded assets with media already published in the creator's posts.
  const mediaLibrary = useMemo(() => {
    const postsMedia = localPosts
      .filter(post => post.videoUrl || post.image || post.images)
      .map(post => ({
        id: `media-${post.id}`,
        postId: post.id,
        url: post.videoUrl || post.image || post.images?.[0] || '',
        caption: post.content,
        type: post.videoUrl ? 'video' : 'image',
        views: post.views || 0,
        sparks: post.likes || 0,
        date: post.timestamp,
      }));
    const publishedUrls = new Set(postsMedia.map(media => media.url));
    const unpostedAssets = uploadedMedia.filter((media: any) => media.url && !publishedUrls.has(media.url));
    return [...postsMedia, ...unpostedAssets].filter(media => {
      const matchesSearch = media.caption.toLowerCase().includes(mediaSearch.toLowerCase());
      const matchesType = mediaTypeFilter === 'all' || media.type === mediaTypeFilter;
      return matchesSearch && matchesType;
    });
  }, [localPosts, uploadedMedia, mediaSearch, mediaTypeFilter]);

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
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-3xl bg-linear-to-r from-violet-950/40 via-purple-950/30 to-zinc-950/40 border border-white/10 backdrop-blur-md">
        <div>
          <span className="text-lg font-extrabold tracking-tight nx-gradient-text leading-none select-none block mb-1">NEXORA</span>
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
                onClick={() => { setRecoveredDraft(null); localStorage.removeItem(`nexora_unsaved_draft_${currentUser.id}`); }}
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
          { id: 'academy', label: 'Creator Academy', icon: GraduationCap },
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
          <div className="col-span-1 md:col-span-3 h-96 bg-zinc-950/40 border border-white/5 rounded-3xl flex items-center justify-center">
            <NexoraLoader size="lg" center={true} />
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
          {activeTab === 'academy' && <CreatorAcademyView currentUser={currentUser} />}

          {/* TAB 1: OVERVIEW */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Bento Grid Analytics */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { label: 'Recorded Views', val: formatMetric(stats.totalViews), sub: 'Recorded on available post records', icon: Eye, color: 'text-violet-300' },
                  { label: 'Sparks', val: formatMetric(stats.totalSparks), sub: 'Stored post counters', icon: Sparkles, color: 'text-violet-300' },
                  { label: 'Comments', val: formatMetric(stats.totalComments), sub: 'Stored post counters', icon: MessageSquare, color: 'text-violet-300' },
                  { label: 'Shares', val: formatMetric(stats.totalShares), sub: 'Stored post counters', icon: ArrowRight, color: 'text-violet-300' }
                ].map((card, i) => {
                  const Icon = card.icon;
                  return (
                    <div key={i} className="p-5 rounded-2xl bg-[#0a071f]/80 border border-white/5 space-y-2 relative overflow-hidden group hover:border-white/10 transition-colors">
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
                      <h4 className="text-sm font-extrabold text-white tracking-tight uppercase">Performance over time</h4>
                      <p className="text-xs text-zinc-400 font-mono">Time-series analytics are not available yet.</p>
                    </div>
                    <div className="flex items-center gap-3 text-[10px] font-bold">
                      <span className="text-zinc-500">No time-series data</span>
                    </div>
                  </div>

                  <div className="h-48 w-full flex items-center justify-center rounded-xl border border-dashed border-white/10 text-sm text-zinc-500">
                    A dated analytics event source is required to show a real trend chart.
                  </div>
                </div>

                {/* Creator Notification panel */}
                <div className="p-6 rounded-2xl bg-[#0a071f]/80 border border-white/5 space-y-4">
                  <h4 className="text-sm font-extrabold text-white tracking-tight uppercase flex items-center gap-2">
                    <Bell className="w-4 h-4 text-violet-400" /> Platform Event Feeds
                  </h4>
                  <div className="space-y-3 max-h-52 overflow-y-auto pr-1">
                    <p className="rounded-xl border border-dashed border-white/10 p-4 text-xs text-zinc-500">
                      No creator events are available yet. Activity will appear here when persisted event tracking is connected.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: AUDIENCE INSIGHTS */}
          {activeTab === 'analytics' && (
            <div className="space-y-4">
              <div className="rounded-2xl border border-white/10 bg-[#0a071f]/70 p-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h4 className="text-sm font-extrabold text-white uppercase tracking-tight">Video audience retention</h4>
                    <p className="mt-1 text-[11px] text-zinc-400">Seven-day server-timed playback observations</p>
                  </div>
                  <span className="rounded-full border border-violet-400/20 bg-violet-500/10 px-2.5 py-1 text-[10px] font-bold text-violet-200">Server recorded</span>
                </div>
                {isVideoRetentionLoading ? (
                  <p className="mt-5 text-xs text-zinc-400">Loading server-time records…</p>
                ) : videoRetentionError ? (
                  <p className="mt-5 text-xs text-amber-200">Video retention data could not be loaded. Try again later.</p>
                ) : videoRetention?.points?.length ? (
                  <>
                    <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-3">
                      <div className="rounded-xl bg-white/5 p-3"><span className="text-[10px] text-zinc-400">Accepted watch time</span><strong className="mt-1 block text-lg text-white">{(videoRetention.points.reduce((sum, point) => sum + point.acceptedWatchSeconds, 0) / 3600).toFixed(2)}h</strong></div>
                      <div className="rounded-xl bg-white/5 p-3"><span className="text-[10px] text-zinc-400">Viewing sessions</span><strong className="mt-1 block text-lg text-white">{videoRetention.points.reduce((sum, point) => sum + point.sessionsStarted, 0).toLocaleString()}</strong></div>
                      <div className="rounded-xl bg-white/5 p-3"><span className="text-[10px] text-zinc-400">Unique viewers (daily)</span><strong className="mt-1 block text-lg text-white">{videoRetention.points.reduce((sum, point) => sum + point.uniqueViewers, 0).toLocaleString()}</strong></div>
                    </div>
                    <div className="mt-4 space-y-2">
                      {videoRetention.points.map(point => (
                        <div key={point.day} className="flex items-center justify-between rounded-lg bg-white/[0.03] px-3 py-2 text-xs">
                          <span className="text-zinc-300">{point.day}</span>
                          <span className="text-zinc-400">{point.sessionsStarted} sessions · {Math.round(point.acceptedWatchSeconds / 60)} min watched · {point.uniqueViewers} viewers</span>
                        </div>
                      ))}
                    </div>
                    <p className="mt-4 text-[10px] leading-relaxed text-zinc-500">The server timestamps and bounds credited viewing intervals. Playback position is still supplied by the client, so these records are abuse-bounded observations, not cryptographic proof of human attention. Daily unique-viewer counts are not cross-day unique reach.</p>
                  </>
                ) : (
                  <p className="mt-5 text-xs text-zinc-400">No server-timed video sessions have been recorded yet. Start receiving views after the updated player and Functions are deployed.</p>
                )}
              </div>
              <div className="rounded-2xl border border-dashed border-white/10 bg-[#0a071f]/60 p-5">
                <h4 className="text-xs font-bold text-white">Additional audience insights unavailable</h4>
                <p className="mt-2 text-xs leading-relaxed text-zinc-400">Traffic source, device, geographic, new-versus-returning audience and frame-level retention curves are not yet supported by trusted event sources. Nexora does not estimate or fabricate these metrics.</p>
              </div>
              {videoRetention?.points?.length ? (
                <div className="rounded-2xl border border-violet-400/15 bg-[#0a071f]/70 p-5">
                  <h4 className="text-sm font-extrabold text-white uppercase tracking-tight">Creator Growth Intelligence</h4>
                  <p className="mt-1 text-[11px] text-zinc-400">Evidence-based observations from your server-timed playback data</p>
                  <div className="mt-4 grid gap-3 md:grid-cols-3">
                    {buildCreatorGrowthInsights(videoRetention.points).map(insight => (
                      <article key={insight.id} className="rounded-xl border border-white/5 bg-white/[0.035] p-4">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-violet-200">{insight.title}</p>
                        <p className="mt-2 text-xl font-black text-white">{insight.value}</p>
                        <p className="mt-2 text-xs leading-relaxed text-zinc-400">{insight.explanation}</p>
                      </article>
                    ))}
                  </div>
                  <p className="mt-3 text-[10px] text-zinc-500">These are descriptive playback observations, not predictions or proof of human attention.</p>
                </div>
              ) : null}
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
                    className="w-full bg-[#0a071f] border border-white/5 rounded-xl pl-9 pr-4 py-1.5 text-xs text-white placeholder-zinc-500 focus:outline-hidden focus:border-white/10 transition-colors"
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
                    <div className="flex gap-1.5 bg-violet-600/20 border border-white/10 px-2 py-0.5 rounded-xl text-xs font-bold items-center">
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
                  <span className="text-[10px] font-mono bg-violet-600/20 text-violet-300 border border-white/10 px-2 py-0.5 rounded-full">{drafts.length} total</span>
                </div>
                <div className="space-y-3">
                  {drafts.length === 0 ? (
                    <p className="text-xs text-zinc-500 font-mono text-center py-8">{isDraftsLoading ? 'Loading saved drafts…' : 'Your draft inbox is empty.'}</p>
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
                            <p className="text-[9px] text-zinc-500 font-mono">Last saved: {new Date(draft.updatedAt?.toDate?.() || draft.updatedAt || 0).toLocaleString()}</p>
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

              <div className="p-6 rounded-2xl bg-[#0a071f]/80 border border-white/5 space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2"><Clock className="w-4 h-4 text-violet-300" /><h4 className="text-sm font-extrabold text-white tracking-tight uppercase">Scheduled Publishing</h4></div>
                  <span className="text-[10px] text-zinc-500 font-mono">{scheduledPosts.filter(item => item.status === 'scheduled').length} pending</span>
                </div>
                <p className="text-xs text-zinc-400 leading-relaxed">Posts are published by NEXORA's trusted scheduler. You can cancel a post while it is still pending.</p>
                {isScheduledPostsLoading ? (
                  <p className="text-xs text-zinc-500 py-5">Loading scheduled posts…</p>
                ) : scheduledPosts.length === 0 ? (
                  <p className="text-xs text-zinc-500 text-center py-6">No scheduled posts yet. Schedule one from the draft editor.</p>
                ) : (
                  <div className="space-y-2 max-h-80 overflow-y-auto">
                    {scheduledPosts.map(item => (
                      <div key={item.id} className="rounded-xl border border-white/5 bg-white/3 p-3 flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-white line-clamp-2">{item.content || (item.imageUrl ? 'Image post' : 'Video post')}</p>
                          <p className="text-[10px] text-zinc-500 mt-1">{item.scheduledAt ? new Date(item.scheduledAt).toLocaleString() : 'Time unavailable'}</p>
                          <p className="text-[9px] uppercase tracking-wider font-bold mt-1 text-violet-300">{item.status === 'scheduled' ? 'Pending' : item.status === 'published' ? 'Published' : item.status === 'blocked' ? 'Blocked by account status' : 'Cancelled'}</p>
                        </div>
                        {item.status === 'scheduled' && (
                          <button type="button" onClick={() => void handleCancelScheduledPost(item.id)} className="shrink-0 rounded-lg border border-white/10 px-2.5 py-1.5 text-[10px] font-bold text-zinc-300 hover:bg-white/5">Cancel</button>
                        )}
                        {item.status === 'published' && item.publishedPostId && (
                          <span className="shrink-0 text-[9px] text-emerald-300 font-bold">Live</span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="md:col-span-2 p-6 rounded-2xl bg-[#0a071f]/80 border border-white/5 space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h4 className="text-sm font-extrabold text-white tracking-tight uppercase">Reusable Studio Templates</h4>
                    <p className="text-xs text-zinc-500 mt-1">Save caption structures, hashtags and content formats for your next post.</p>
                  </div>
                  <span className="text-[10px] font-mono bg-violet-600/20 text-violet-300 border border-white/10 px-2 py-1 rounded-full">{studioTemplates.length}/40</span>
                </div>
                <div className="flex flex-col sm:flex-row gap-2">
                  <input value={templateName} onChange={event => setTemplateName(event.target.value)} maxLength={60} placeholder="Template name" aria-label="Template name" className="flex-1 min-w-0 bg-[#0a071f] border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-500" />
                  <button type="button" onClick={() => void handleSaveStudioTemplate()} className="px-4 py-2 rounded-xl bg-violet-600/20 border border-violet-400/20 text-violet-200 text-xs font-bold">Save current editor as template</button>
                </div>
                {isTemplatesLoading ? <p className="text-xs text-zinc-500 py-3">Loading your templates…</p> : studioTemplates.length === 0 ? (
                  <p className="text-xs text-zinc-500 py-3">No templates saved yet. Open a draft, prepare its caption and tags, then save them here.</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                    {studioTemplates.map(template => (
                      <div key={template.id} className="rounded-xl border border-white/5 bg-white/3 p-3 space-y-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0"><p className="text-xs font-bold text-white truncate">{template.name}</p><p className="text-[10px] text-violet-300 uppercase mt-1">{template.format} · {template.tags.length} tags</p></div>
                          <button type="button" onClick={() => void handleDeleteStudioTemplate(template.id)} aria-label={`Delete ${template.name}`} className="p-1 text-pink-400 hover:bg-white/5 rounded"><Trash2 className="w-3.5 h-3.5" /></button>
                        </div>
                        <p className="text-[11px] text-zinc-400 line-clamp-2">{template.caption || 'No starter caption'}</p>
                        <button type="button" onClick={() => handleApplyStudioTemplate(template)} className="w-full rounded-lg bg-violet-600/15 text-violet-200 text-xs font-bold py-2">Use template</button>
                      </div>
                    ))}
                  </div>
                )}
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
                    className="w-full bg-[#0a071f] border border-white/5 rounded-xl pl-9 pr-4 py-1.5 text-xs text-white focus:outline-hidden focus:border-white/10 transition-colors"
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
                    {isMediaLibraryLoading ? 'Loading your uploaded media…' : 'No uploads logged in your Nexora Studio library.'}
                  </div>
                ) : (
                  mediaLibrary.map(media => (
                    <div 
                      key={media.id} 
                      onClick={() => setPreviewMediaUrl(media.url)}
                      className="group rounded-2xl overflow-hidden bg-zinc-950/60 border border-white/5 aspect-square relative cursor-pointer hover:border-white/10 transition-all shadow-lg"
                    >
                      {media.type === 'video' ? (
                        <video src={media.url} className="w-full h-full object-cover" muted />
                      ) : (
                        <img src={media.url} className="w-full h-full object-cover" />
                      )}
                      
                      {/* Hover Overlay */}
                      <div className="absolute inset-0 bg-black/60 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity flex flex-col justify-end p-3 space-y-1.5">
                        <p className="text-[11px] font-bold text-white line-clamp-1">{media.caption}</p>
                        <div className="flex justify-between items-center text-[9px] font-mono text-zinc-400">
                          <span>{media.type.toUpperCase()}</span>
                          {media.views === null ? <span>Unpublished asset</span> : <span className="flex items-center gap-0.5"><Eye className="w-3 h-3" /> {media.views}</span>}
                        </div>
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            setCurrentDraftId(null);
                            setDraftCaption('');
                            setDraftTags('');
                            setDraftType(media.type);
                            setDraftUrl(media.url);
                            setShowDraftModal(true);
                          }}
                          className="mt-1 w-full rounded-lg bg-violet-600/90 px-2 py-1.5 text-[10px] font-bold text-white"
                        >
                          Use in a post
                        </button>
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
                        ? 'bg-gradient-to-br from-[#120a3a]/80 to-[#2c0f4f]/40 border-white/10' 
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
                        { title: 'Audio Fingerprint Analysis', desc: 'Provider-backed royalty matching is not connected.', status: 'Not connected' },
                        { title: 'Duplication Detection', desc: 'A platform-wide media fingerprint index is not connected.', status: 'Not verified' },
                        { title: 'Guideline Audit Compliance', desc: 'Automated media safety scanning is not connected.', status: 'Not scanned' }
                      ].map((scan, i) => (
                        <div key={i} className="flex justify-between items-center p-3 bg-white/3 border border-white/5 rounded-xl text-xs">
                          <div>
                            <p className="font-bold text-white">{scan.title}</p>
                            <p className="text-[10px] text-zinc-500 mt-0.5">{scan.desc}</p>
                          </div>
                          <span className="text-[10px] font-mono text-zinc-400 font-bold">{scan.status}</span>
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
                  <p className="text-xs text-zinc-400 leading-relaxed">If a moderation decision affects your content, you can submit an appeal for review. Submission does not guarantee approval or an automated legal review.</p>
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

          {/* TAB 8: GIFTVERSE CREATOR EARNINGS AND INTELLIGENCE */}
          {activeTab === 'monetization' && <><CreatorGiftEarningsPanel /><CreatorEconomyExpansionPanel /></>}
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
              className="w-full max-w-2xl bg-[#0a071f] border border-white/10 rounded-[32px] p-6 space-y-6 shadow-md relative max-h-[90vh] overflow-y-auto"
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
                  { label: 'Recorded Views', val: formatMetric(selectedPostAnalytics?.views ?? null), icon: Eye, color: 'text-violet-300' },
                  { label: 'Sparks Received', val: formatMetric(selectedPostAnalytics?.likes ?? null), icon: Sparkles, color: 'text-violet-300' },
                  { label: 'Bookmarks Saved', val: formatMetric(selectedPostAnalytics?.saves ?? null), icon: Bookmark, color: 'text-violet-300' },
                  { label: 'Comments Posted', val: formatMetric(selectedPostAnalytics?.comments ?? null), icon: MessageSquare, color: 'text-violet-300' },
                  { label: 'Shares', val: formatMetric(selectedPostAnalytics?.shares ?? null), icon: ArrowRight, color: 'text-violet-300' },
                  { label: 'Engagement Rate', val: selectedPostAnalytics?.engagementRate === null || selectedPostAnalytics?.engagementRate === undefined ? 'Not tracked' : `${selectedPostAnalytics.engagementRate}%`, icon: TrendingUp, color: 'text-violet-300' }
                ].map((c, idx) => (
                  <div key={idx} className="p-4 rounded-xl bg-white/3 border border-white/5 text-xs space-y-1">
                    <span className="text-[9px] text-zinc-500 uppercase font-bold tracking-wider">{c.label}</span>
                    <p className="text-lg font-black text-white">{c.val}</p>
                  </div>
                ))}
              </div>

              {/* Metrics that require an analytics event source */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-[#120a3a]/30 border border-white/10 space-y-2">
                  <h5 className="text-xs font-extrabold text-white uppercase tracking-wider">Additional analytics unavailable</h5>
                  <div className="space-y-3 pt-1 text-xs">
                    <div className="flex justify-between">
                      <span className="text-zinc-400">Profile visits generated</span>
                      <strong className="text-white font-mono">Unavailable</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-400">Followers gained from post</span>
                      <strong className="text-emerald-400 font-mono">Not tracked yet</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-400">Unique Viewers ratio</span>
                      <strong className="text-sky-400 font-mono">Unavailable</strong>
                    </div>
                    <p className="text-[10px] text-zinc-500">These metrics require persisted analytics events; no estimates are shown.</p>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-white/3 border border-white/5 flex flex-col justify-between">
                  <div className="space-y-1.5 text-xs">
                    <span className="text-[10px] text-pink-400 font-extrabold uppercase">Content recommendation</span>
                    <p className="font-bold text-white">Unavailable</p>
                    <p className="text-[10px] text-zinc-400 leading-relaxed">No verified recommendation or comparative completion-rate data is available for this post.</p>
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
              className="w-full max-w-md bg-[#0a071f] border border-white/10 rounded-[32px] p-6 space-y-4 shadow-md relative"
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
                    className="w-full bg-[#0a071f] border border-white/10 rounded-xl p-3 text-xs text-white placeholder-zinc-500 focus:outline-hidden focus:border-white/10 transition-colors"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-zinc-400 font-bold">Hashtags / Tags (Comma separated)</label>
                  <input
                    type="text"
                    value={editTags}
                    onChange={(e) => setEditTags(e.target.value)}
                    placeholder="tech, ai, coding"
                    className="w-full bg-[#0a071f] border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-hidden focus:border-white/10 transition-colors"
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
                <video src={previewMediaUrl} className="max-w-full max-h-[70vh] rounded-2xl border border-white/10 shadow-md" controls autoPlay loop />
              ) : (
                <img src={previewMediaUrl} className="max-w-full max-h-[70vh] rounded-2xl border border-white/10 shadow-md object-contain" />
              )}
              <div className="flex gap-4 text-xs font-mono text-zinc-500 bg-black/40 px-4 py-2 border border-white/5 rounded-full">
                <span>Safety scan: <strong className="text-zinc-300 font-bold">Not verified</strong></span>
                <span>Copyright: <strong className="text-zinc-300 font-bold">Not verified</strong></span>
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
              className="w-full max-w-lg bg-[#0a071f] border border-white/10 rounded-[32px] p-6 space-y-4 shadow-md relative max-h-[90vh] overflow-y-auto"
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
                    className="w-full bg-[#0a071f] border border-white/10 rounded-xl p-3 text-xs text-white placeholder-zinc-500 focus:outline-hidden focus:border-white/10 transition-colors"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-zinc-400 font-bold">Hashtags / Tags (Comma separated)</label>
                  <input
                    type="text"
                    value={draftTags}
                    onChange={(e) => setDraftTags(e.target.value)}
                    placeholder="cooking, technology, daily"
                    className="w-full bg-[#0a071f] border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-hidden focus:border-white/10 transition-colors"
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
                      className="w-full bg-[#0a071f] border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-hidden focus:border-white/10 transition-colors"
                    />
                  </div>
                </div>

                <div className="space-y-2 rounded-xl border border-white/5 bg-black/20 p-3">
                  <label className="text-zinc-300 font-bold block">Upload media from your device</label>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif,image/avif,video/mp4,video/webm,video/quicktime,video/ogg"
                    disabled={isUploadingDraftMedia}
                    onChange={(event) => {
                      const selectedFile = event.currentTarget.files?.[0];
                      if (selectedFile) void handleUploadDraftMedia(selectedFile);
                      event.currentTarget.value = '';
                    }}
                    className="block w-full text-[11px] text-zinc-400 file:mr-3 file:rounded-lg file:border-0 file:bg-violet-600/20 file:px-3 file:py-2 file:text-xs file:font-bold file:text-violet-200 disabled:opacity-50"
                  />
                  {isUploadingDraftMedia && (
                    <div className="space-y-1.5" role="status" aria-live="polite">
                      <div className="flex justify-between text-[10px] text-zinc-400">
                        <span>Uploading to secure media storage</span>
                        <span>{draftUploadProgress}%</span>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
                        <div className="h-full rounded-full bg-violet-500 transition-all" style={{ width: `${draftUploadProgress}%` }} />
                      </div>
                    </div>
                  )}
                  {draftUrl && !isUploadingDraftMedia && (
                    <p className="text-[10px] text-emerald-300">Media attached. You can save this draft or publish it.</p>
                  )}
                </div>

                <div className="rounded-xl border border-white/5 bg-white/3 p-3 text-[11px] text-zinc-400">Publishing sends this post through Nexora's authenticated post pipeline. Automatic scheduling is not enabled yet.</div>

                <div className="flex gap-2 pt-4 justify-between border-t border-white/5">
                  <button 
                    type="button"
                    onClick={handleSaveDraft}
                    disabled={isUploadingDraftMedia}
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
                    <div className="w-full sm:w-auto flex flex-col sm:flex-row gap-2 sm:items-center">
                      <label className="text-[10px] text-zinc-400 font-bold">Schedule for</label>
                      <input
                        type="datetime-local"
                        value={scheduledAtInput}
                        min={new Date(Date.now() + 5 * 60 * 1000 - new Date().getTimezoneOffset() * 60_000).toISOString().slice(0, 16)}
                        max={new Date(Date.now() + 90 * 24 * 60 * 60 * 1000 - new Date().getTimezoneOffset() * 60_000).toISOString().slice(0, 16)}
                        onChange={event => setScheduledAtInput(event.target.value)}
                        className="min-w-0 rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-xs text-white"
                        aria-label="Schedule post date and time"
                      />
                      <button
                        type="button"
                        onClick={() => handleScheduleDraft({ id: currentDraftId || 'temp' })}
                        disabled={isUploadingDraftMedia || isSchedulingDraft || !scheduledAtInput}
                        className="px-4 py-2 rounded-xl border border-violet-400/30 bg-violet-500/10 text-violet-200 text-xs font-bold disabled:opacity-40"
                      >
                        {isSchedulingDraft ? 'Scheduling…' : 'Schedule post'}
                      </button>
                    </div>
                    <button 
                      type="button"
                      onClick={() => handlePublishDraft({ id: currentDraftId || 'temp' })}
                      disabled={isUploadingDraftMedia}
                      className="px-4 py-2 rounded-xl bg-linear-to-r from-violet-600 to-pink-600 hover:opacity-90 text-xs font-black tracking-wide shadow-lg"
                    >
                      Publish to Nexora
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
              className="w-full max-w-md bg-[#0a071f] border border-white/10 rounded-[32px] p-6 space-y-4 shadow-md relative"
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
                    className="w-full bg-[#0a071f] border border-white/10 rounded-xl p-3 text-xs text-white placeholder-zinc-500 focus:outline-hidden focus:border-white/10 transition-colors"
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
