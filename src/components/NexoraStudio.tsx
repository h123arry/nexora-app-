import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { buildWaveformPeaks, getAudioEnvelopeGain, getDuckedMusicGain } from '../utils/studioAudioPolicy';
import { appendHistorySnapshot, reorderById } from '../utils/studioHistoryPolicy';
import { getStudioTextLayerFrame, normalizeStudioTextLayer, type StudioTextLayer } from '../utils/studioTextLayerPolicy';
import { canAddStudioImageLayer, getStudioImageLayerFrame, normalizeStudioImageLayer, type StudioImageLayer } from '../utils/studioImageLayerPolicy';
import { normalizeStudioSubtitleSegment } from '../utils/studioSubtitlePolicy';
import { getNextStudioClipTimelinePosition, getStudioClipTimelinePosition } from '../utils/studioTimelinePolicy';
import { getStudioTimelineAudioPosition } from '../utils/studioTimelineAudioPolicy';
import { ArrowDown, ArrowLeft, ArrowUp, Check, Clapperboard, Film, Mic, Music2, Pause, Play, Plus, Redo2, Scissors, Trash2, Type, Undo2, Upload, Volume2, X } from 'lucide-react';

type StudioClip = { id: string; name: string; blob: Blob; start: number; end: number; duration: number; volume: number };
type StudioSubtitleSegment = { id: string; text: string; start: number; end: number };
type StudioProject = { clips: StudioClip[]; soundtrack: Blob | null; voiceover: Blob | null; caption: string; overlay: string; overlayColor: string; textLayers: StudioTextLayer[]; selectedTextLayerId: string | null; imageLayers: StudioImageLayer[]; selectedImageLayerId: string | null; subtitleSegments: StudioSubtitleSegment[]; selectedSubtitleSegmentId: string | null; aspectRatio: 'portrait' | 'square' | 'landscape'; transition: 'cut' | 'fade'; soundtrackVolume: number; soundtrackFadeIn: number; soundtrackFadeOut: number; duckMusicUnderVoiceover: boolean; musicDuckingLevel: number; voiceoverVolume: number; voiceoverFadeIn: number; voiceoverFadeOut: number; voiceoverStart: number; overlayStart: number; overlayEnd: number; overlayPosition: 'top' | 'center' | 'bottom'; updatedAt: number };
type StudioSnapshot = Omit<StudioProject, 'updatedAt'> & { selectedId: string | null };
type Props = { currentUser: { id: string; name?: string; username?: string }; onClose: () => void; onPublish: (video: Blob, caption: string) => Promise<void> };

const DB_NAME = 'nexora-studio-projects';
const STORE_NAME = 'projects';

function openProjectDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE_NAME);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('Studio storage is unavailable.'));
  });
}
async function saveProject(project: StudioProject, projectKey: string): Promise<void> {
  const db = await openProjectDb();
  await new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    transaction.objectStore(STORE_NAME).put(project, projectKey);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error || new Error('Could not save this Studio project.'));
  });
  db.close();
}
async function loadProject(projectKey: string): Promise<StudioProject | null> {
  const db = await openProjectDb();
  const value = await new Promise<StudioProject | null>((resolve, reject) => {
    const request = db.transaction(STORE_NAME, 'readonly').objectStore(STORE_NAME).get(projectKey);
    request.onsuccess = () => resolve((request.result as StudioProject) || null);
    request.onerror = () => reject(request.error || new Error('Could not restore this Studio project.'));
  });
  db.close();
  return value;
}

function makeId(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `clip-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export default function NexoraStudio({ currentUser, onClose, onPublish }: Props) {
  const [clips, setClips] = useState<StudioClip[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [soundtrack, setSoundtrack] = useState<Blob | null>(null);
  const [voiceover, setVoiceover] = useState<Blob | null>(null);
  const [voiceoverVolume, setVoiceoverVolume] = useState(1);
  const [voiceoverStart, setVoiceoverStart] = useState(0);
  const [recordingVoiceover, setRecordingVoiceover] = useState(false);
  const [voiceoverWaveform, setVoiceoverWaveform] = useState<number[]>([]);
  const [caption, setCaption] = useState('');
  const [overlay, setOverlay] = useState('');
  const [textLayers, setTextLayers] = useState<StudioTextLayer[]>([]);
  const [selectedTextLayerId, setSelectedTextLayerId] = useState<string | null>(null);
  const [imageLayers, setImageLayers] = useState<StudioImageLayer[]>([]);
  const [selectedImageLayerId, setSelectedImageLayerId] = useState<string | null>(null);
  const [subtitleSegments, setSubtitleSegments] = useState<StudioSubtitleSegment[]>([]);
  const [selectedSubtitleSegmentId, setSelectedSubtitleSegmentId] = useState<string | null>(null);
  const [previewGlobalTime, setPreviewGlobalTime] = useState(0);
  const [overlayColor, setOverlayColor] = useState('#FFFFFF');
  const [aspectRatio, setAspectRatio] = useState<'portrait' | 'square' | 'landscape'>('portrait');
  const [transition, setTransition] = useState<'cut' | 'fade'>('cut');
  const [soundtrackVolume, setSoundtrackVolume] = useState(0.8);
  const [soundtrackFadeIn, setSoundtrackFadeIn] = useState(0);
  const [soundtrackFadeOut, setSoundtrackFadeOut] = useState(0);
  const [duckMusicUnderVoiceover, setDuckMusicUnderVoiceover] = useState(true);
  const [musicDuckingLevel, setMusicDuckingLevel] = useState(0.3);
  const [voiceoverFadeIn, setVoiceoverFadeIn] = useState(0);
  const [voiceoverFadeOut, setVoiceoverFadeOut] = useState(0);
  const [overlayStart, setOverlayStart] = useState(0);
  const [overlayEnd, setOverlayEnd] = useState(0);
  const [overlayPosition, setOverlayPosition] = useState<'top' | 'center' | 'bottom'>('bottom');
  const [playing, setPlaying] = useState(false);
  const [exportQuality, setExportQuality] = useState<'balanced' | 'high'>('balanced');
  const [audioMetadataRevision, setAudioMetadataRevision] = useState(0);
  const [rendering, setRendering] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [message, setMessage] = useState('');
  const [ready, setReady] = useState(false);
  const [muted, setMuted] = useState(false);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const soundtrackPreviewRef = useRef<HTMLAudioElement>(null);
  const voiceoverPreviewRef = useRef<HTMLAudioElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const projectUrls = useRef<string[]>([]);
  const voiceoverRecorderRef = useRef<MediaRecorder | null>(null);
  const voiceoverStreamRef = useRef<MediaStream | null>(null);
  const voiceoverChunksRef = useRef<Blob[]>([]);
  const draggedClipIdRef = useRef<string | null>(null);
  const pendingSeekRef = useRef<{ clipId: string; localTime: number } | null>(null);
  const continuePlaybackRef = useRef(false);
  const historyRef = useRef<{ past: StudioSnapshot[]; future: StudioSnapshot[]; current: StudioSnapshot | null; applying: boolean }>({ past: [], future: [], current: null, applying: false });
  const selectedClip = clips.find(clip => clip.id === selectedId) || clips[0] || null;
  const selectedTextLayer = textLayers.find(layer => layer.id === selectedTextLayerId) || textLayers[0] || null;
  const selectedImageLayer = imageLayers.find(layer => layer.id === selectedImageLayerId) || imageLayers[0] || null;
  const selectedSubtitleSegment = subtitleSegments.find(segment => segment.id === selectedSubtitleSegmentId) || subtitleSegments[0] || null;
  const selectedClipIndex = selectedClip ? clips.findIndex(clip => clip.id === selectedClip.id) : -1;
  const selectedClipGlobalOffset = useMemo(() => clips.slice(0, Math.max(0, selectedClipIndex)).reduce((sum, clip) => sum + Math.max(0, clip.end - clip.start), 0), [clips, selectedClipIndex]);
  const totalDuration = useMemo(() => clips.reduce((sum, clip) => sum + Math.max(0, clip.end - clip.start), 0), [clips]);
  const timelineClipSegments = useMemo(() => {
    let cursor = 0;
    return clips.map(clip => {
      const start = cursor;
      const duration = Math.max(0, clip.end - clip.start);
      cursor += duration;
      return { clip, start, end: cursor, duration };
    });
  }, [clips]);
  const snapshot = useMemo<StudioSnapshot>(() => ({ clips, selectedId, soundtrack, voiceover, caption, overlay, overlayColor, textLayers, selectedTextLayerId, imageLayers, selectedImageLayerId, subtitleSegments, selectedSubtitleSegmentId, aspectRatio, transition, soundtrackVolume, soundtrackFadeIn, soundtrackFadeOut, duckMusicUnderVoiceover, musicDuckingLevel, voiceoverVolume, voiceoverFadeIn, voiceoverFadeOut, voiceoverStart, overlayStart, overlayEnd, overlayPosition }), [clips, selectedId, soundtrack, voiceover, caption, overlay, overlayColor, textLayers, selectedTextLayerId, imageLayers, selectedImageLayerId, subtitleSegments, selectedSubtitleSegmentId, aspectRatio, transition, soundtrackVolume, soundtrackFadeIn, soundtrackFadeOut, duckMusicUnderVoiceover, musicDuckingLevel, voiceoverVolume, voiceoverFadeIn, voiceoverFadeOut, voiceoverStart, overlayStart, overlayEnd, overlayPosition]);

  useEffect(() => {
    let active = true;
    const projectKey = `active-project-v1:${currentUser.id}`;
    loadProject(projectKey).then(project => {
      if (!active || !project) return;
      setClips((project.clips || []).map(clip => ({ ...clip, volume: typeof clip.volume === 'number' ? Math.min(1, Math.max(0, clip.volume)) : 1 })));
      setSelectedId(project.clips?.[0]?.id || null);
      setSoundtrack(project.soundtrack || null);
      setVoiceover(project.voiceover || null);
      setVoiceoverVolume(typeof project.voiceoverVolume === 'number' ? Math.min(1, Math.max(0, project.voiceoverVolume)) : 1);
      setVoiceoverStart(typeof project.voiceoverStart === 'number' ? Math.max(0, project.voiceoverStart) : 0);
      setCaption(project.caption || '');
      setOverlay(project.overlay || '');
      setOverlayColor(project.overlayColor || '#FFFFFF');
      const restoredTextLayers = Array.isArray(project.textLayers)
        ? project.textLayers.map(layer => normalizeStudioTextLayer(layer, makeId()))
        : project.overlay?.trim()
          ? [normalizeStudioTextLayer({ id: 'legacy-title', text: project.overlay, color: project.overlayColor, start: project.overlayStart, end: project.overlayEnd, position: project.overlayPosition }, 'legacy-title')]
          : [];
      setTextLayers(restoredTextLayers);
      setSelectedTextLayerId(restoredTextLayers.some(layer => layer.id === project.selectedTextLayerId) ? project.selectedTextLayerId : restoredTextLayers[0]?.id || null);
      const restoredImageLayers: StudioImageLayer[] = [];
      let restoredImageBytes = 0;
      for (const layer of Array.isArray(project.imageLayers) ? project.imageLayers : []) {
        if (restoredImageLayers.length >= 20) break;
        if (layer?.blob instanceof Blob && ['image/png', 'image/jpeg', 'image/webp'].includes(layer.blob.type) && layer.blob.size <= 10 * 1024 * 1024 && restoredImageBytes + layer.blob.size <= 40 * 1024 * 1024) {
          restoredImageLayers.push(normalizeStudioImageLayer(layer, makeId()));
          restoredImageBytes += layer.blob.size;
        }
      }
      setImageLayers(restoredImageLayers);
      setSelectedImageLayerId(restoredImageLayers.some(layer => layer.id === project.selectedImageLayerId) ? project.selectedImageLayerId : restoredImageLayers[0]?.id || null);
      const restoredDuration = (project.clips || []).reduce((sum, clip) => sum + Math.max(0, clip.end - clip.start), 0) || 600;
      const restoredSubtitles = Array.isArray(project.subtitleSegments) ? project.subtitleSegments.slice(0, 30).map((segment, index) => normalizeStudioSubtitleSegment(segment, `subtitle-${index}`, restoredDuration)) : [];
      setSubtitleSegments(restoredSubtitles);
      setSelectedSubtitleSegmentId(restoredSubtitles.some(segment => segment.id === project.selectedSubtitleSegmentId) ? project.selectedSubtitleSegmentId : restoredSubtitles[0]?.id || null);
      setAspectRatio(project.aspectRatio || 'portrait');
      setTransition(project.transition || 'cut');
      setSoundtrackVolume(typeof project.soundtrackVolume === 'number' ? Math.min(1, Math.max(0, project.soundtrackVolume)) : 0.8);
      setSoundtrackFadeIn(typeof project.soundtrackFadeIn === 'number' ? Math.min(8, Math.max(0, project.soundtrackFadeIn)) : 0);
      setSoundtrackFadeOut(typeof project.soundtrackFadeOut === 'number' ? Math.min(8, Math.max(0, project.soundtrackFadeOut)) : 0);
      setDuckMusicUnderVoiceover(project.duckMusicUnderVoiceover !== false);
      setMusicDuckingLevel(typeof project.musicDuckingLevel === 'number' ? Math.min(1, Math.max(0, project.musicDuckingLevel)) : 0.3);
      setVoiceoverFadeIn(typeof project.voiceoverFadeIn === 'number' ? Math.min(8, Math.max(0, project.voiceoverFadeIn)) : 0);
      setVoiceoverFadeOut(typeof project.voiceoverFadeOut === 'number' ? Math.min(8, Math.max(0, project.voiceoverFadeOut)) : 0);
      setOverlayStart(project.overlayStart || 0);
      setOverlayEnd(project.overlayEnd || 0);
      setOverlayPosition(project.overlayPosition || 'bottom');
    }).catch(() => { if (active) setMessage('A previous Studio draft could not be restored. You can still start a new project.'); })
      .finally(() => { if (active) setReady(true); });
    return () => {
      active = false;
      projectUrls.current.forEach(URL.revokeObjectURL);
      const recorder = voiceoverRecorderRef.current;
      if (recorder && recorder.state !== 'inactive') { recorder.onstop = null; recorder.stop(); }
      voiceoverStreamRef.current?.getTracks().forEach(track => track.stop());
    };
  }, [currentUser.id]);

  useEffect(() => {
    if (!ready) return;
    setExportBlob(null);
    const timer = window.setTimeout(() => {
      void saveProject({ clips, soundtrack, voiceover, caption, overlay: textLayers[0]?.text || '', overlayColor: textLayers[0]?.color || '#FFFFFF', textLayers, selectedTextLayerId, imageLayers, selectedImageLayerId, subtitleSegments, selectedSubtitleSegmentId, aspectRatio, transition, soundtrackVolume, soundtrackFadeIn, soundtrackFadeOut, duckMusicUnderVoiceover, musicDuckingLevel, voiceoverVolume, voiceoverFadeIn, voiceoverFadeOut, voiceoverStart, overlayStart: textLayers[0]?.start || 0, overlayEnd: textLayers[0]?.end || 0, overlayPosition: textLayers[0]?.position || 'bottom', updatedAt: Date.now() }, `active-project-v1:${currentUser.id}`)
        .then(() => setMessage('Draft saved on this device'))
        .catch(() => setMessage('This draft could not be saved on this device.'));
    }, 500);
    return () => window.clearTimeout(timer);
  }, [ready, clips, soundtrack, voiceover, caption, overlay, overlayColor, textLayers, selectedTextLayerId, imageLayers, selectedImageLayerId, subtitleSegments, selectedSubtitleSegmentId, aspectRatio, transition, soundtrackVolume, soundtrackFadeIn, soundtrackFadeOut, duckMusicUnderVoiceover, musicDuckingLevel, voiceoverVolume, voiceoverFadeIn, voiceoverFadeOut, voiceoverStart, overlayStart, overlayEnd, overlayPosition, currentUser.id]);

  useEffect(() => {
    let cancelled = false;
    if (!voiceover || voiceover.size > 30 * 1024 * 1024) { setVoiceoverWaveform([]); return; }
    const AudioContextClass = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) { setVoiceoverWaveform([]); return; }
    const decoder = new AudioContextClass();
    voiceover.arrayBuffer()
      .then(data => decoder.decodeAudioData(data))
      .then(buffer => {
        const channel = buffer.getChannelData(0);
        const peaks = buildWaveformPeaks(channel, 96);
        if (!cancelled) setVoiceoverWaveform(peaks);
      })
      .catch(() => { if (!cancelled) setVoiceoverWaveform([]); })
      .finally(() => { void decoder.close().catch(() => undefined); });
    return () => { cancelled = true; };
  }, [voiceover]);

  useEffect(() => {
    if (videoRef.current && selectedClip) videoRef.current.volume = selectedClip.volume;
  }, [selectedClip?.id, selectedClip?.volume]);

  useEffect(() => {
    const music = soundtrackPreviewRef.current;
    const narration = voiceoverPreviewRef.current;
    const elapsed = Math.max(0, previewGlobalTime);
    if (music && soundtrack) {
      const musicPosition = getStudioTimelineAudioPosition(elapsed, 0, Number.isFinite(music.duration) ? music.duration : null, true);
      if (Number.isFinite(music.duration) && music.duration > 0 && Math.abs(music.currentTime - musicPosition.sourceTime) > 0.75) music.currentTime = musicPosition.sourceTime;
      music.volume = getDuckedMusicGain({ volume: soundtrackVolume, elapsed, totalDuration, fadeIn: soundtrackFadeIn, fadeOut: soundtrackFadeOut, duckingEnabled: duckMusicUnderVoiceover && Boolean(voiceover), voiceoverStart, voiceoverDuration: narration && Number.isFinite(narration.duration) ? narration.duration : 0, duckingLevel: musicDuckingLevel });
      if (playing && music.paused) void music.play().catch(() => setMessage('Tap play again to allow soundtrack preview.'));
      if (!playing && !music.paused) music.pause();
    } else if (music) music.pause();
    if (narration && voiceover) {
      const narrationPosition = getStudioTimelineAudioPosition(elapsed, voiceoverStart, Number.isFinite(narration.duration) ? narration.duration : null);
      const narrationTime = narrationPosition.sourceTime;
      narration.volume = getAudioEnvelopeGain({ volume: voiceoverVolume, elapsed: narrationTime, totalDuration: Number.isFinite(narration.duration) ? narration.duration : 0, fadeIn: voiceoverFadeIn, fadeOut: voiceoverFadeOut });
      if (narrationPosition.active) {
        if (Math.abs(narration.currentTime - narrationTime) > 0.75) narration.currentTime = narrationTime;
        if (playing && narration.paused) void narration.play().catch(() => setMessage('Tap play again to allow voiceover preview.'));
        if (!playing && !narration.paused) narration.pause();
      } else narration.pause();
    } else if (narration) narration.pause();
    if (!playing) { music?.pause(); narration?.pause(); }
  }, [playing, previewGlobalTime, soundtrack, voiceover, soundtrackVolume, soundtrackFadeIn, soundtrackFadeOut, duckMusicUnderVoiceover, voiceoverStart, voiceoverVolume, voiceoverFadeIn, voiceoverFadeOut, musicDuckingLevel, totalDuration, audioMetadataRevision]);

  useEffect(() => {
    if (!ready) return;
    const history = historyRef.current;
    if (history.applying) {
      history.current = snapshot;
      history.applying = false;
      setCanUndo(history.past.length > 0);
      setCanRedo(history.future.length > 0);
      return;
    }
    if (history.current) {
      history.past = appendHistorySnapshot(history.past, history.current, 40);
      history.future = [];
      setCanUndo(true);
      setCanRedo(false);
    }
    history.current = snapshot;
  }, [ready, snapshot]);

  const applySnapshot = useCallback((value: StudioSnapshot) => {
    setClips(value.clips);
    setSelectedId(value.selectedId);
    setSoundtrack(value.soundtrack);
    setVoiceover(value.voiceover);
    setCaption(value.caption);
    setOverlay(value.overlay);
    setOverlayColor(value.overlayColor);
    setTextLayers(value.textLayers);
    setSelectedTextLayerId(value.selectedTextLayerId);
    setImageLayers(value.imageLayers);
    setSelectedImageLayerId(value.selectedImageLayerId);
    setSubtitleSegments(value.subtitleSegments);
    setSelectedSubtitleSegmentId(value.selectedSubtitleSegmentId);
    setAspectRatio(value.aspectRatio);
    setTransition(value.transition);
    setSoundtrackVolume(value.soundtrackVolume);
    setSoundtrackFadeIn(value.soundtrackFadeIn);
    setSoundtrackFadeOut(value.soundtrackFadeOut);
    setDuckMusicUnderVoiceover(value.duckMusicUnderVoiceover);
    setMusicDuckingLevel(value.musicDuckingLevel);
    setVoiceoverVolume(value.voiceoverVolume);
    setVoiceoverFadeIn(value.voiceoverFadeIn);
    setVoiceoverFadeOut(value.voiceoverFadeOut);
    setVoiceoverStart(value.voiceoverStart);
    setOverlayStart(value.overlayStart);
    setOverlayEnd(value.overlayEnd);
    setOverlayPosition(value.overlayPosition);
  }, []);

  const undo = useCallback(() => {
    const history = historyRef.current;
    if (!history.current || !history.past.length) return;
    const previous = history.past[history.past.length - 1];
    history.past = history.past.slice(0, -1);
    history.future = appendHistorySnapshot(history.future, history.current, 40);
    history.applying = true;
    applySnapshot(previous);
    setCanUndo(history.past.length > 0);
    setCanRedo(true);
    setMessage('Last Studio edit undone.');
  }, [applySnapshot]);

  const redo = useCallback(() => {
    const history = historyRef.current;
    if (!history.current || !history.future.length) return;
    const next = history.future[history.future.length - 1];
    history.future = history.future.slice(0, -1);
    history.past = appendHistorySnapshot(history.past, history.current, 40);
    history.applying = true;
    applySnapshot(next);
    setCanUndo(true);
    setCanRedo(history.future.length > 0);
    setMessage('Studio edit restored.');
  }, [applySnapshot]);

  useEffect(() => {
    const handleHistoryShortcut = (event: KeyboardEvent) => {
      if (!(event.ctrlKey || event.metaKey)) return;
      const target = event.target as HTMLElement | null;
      if (target?.closest('input, textarea, select, [contenteditable="true"]')) return;
      if (event.key.toLowerCase() === 'z') {
        event.preventDefault();
        if (event.shiftKey) redo(); else undo();
      } else if (event.key.toLowerCase() === 'y') {
        event.preventDefault();
        redo();
      }
    };
    window.addEventListener('keydown', handleHistoryShortcut);
    return () => window.removeEventListener('keydown', handleHistoryShortcut);
  }, [undo, redo]);

  const seekToGlobalTime = useCallback((requestedTime: number) => {
    continuePlaybackRef.current = false;
    if (!clips.length || totalDuration <= 0) return;
    const position = getStudioClipTimelinePosition(clips, requestedTime);
    if (!position) return;
    pendingSeekRef.current = { clipId: position.clipId, localTime: position.localTime };
    setPreviewGlobalTime(position.globalTime);
    setPlaying(false);
    if (selectedId === position.clipId && videoRef.current) {
      videoRef.current.pause();
      videoRef.current.currentTime = position.localTime;
      pendingSeekRef.current = null;
    } else {
      setSelectedId(position.clipId);
    }
  }, [clips, selectedId, totalDuration]);

  const getUrl = useCallback((blob: Blob) => {
    const url = URL.createObjectURL(blob);
    projectUrls.current.push(url);
    return url;
  }, []);

  const addVideoFiles = async (files: FileList | File[]) => {
    const incoming = Array.from(files);
    const additions: StudioClip[] = [];
    for (const file of incoming) {
      if (!file.type.startsWith('video/')) continue;
      if (file.size > 250 * 1024 * 1024) { setMessage('Each video must be 250 MB or smaller.'); continue; }
      const url = getUrl(file);
      const duration = await new Promise<number>((resolve, reject) => {
        const probe = document.createElement('video');
        probe.preload = 'metadata';
        probe.onloadedmetadata = () => { URL.revokeObjectURL(url); resolve(Number.isFinite(probe.duration) ? probe.duration : 0); };
        probe.onerror = () => { URL.revokeObjectURL(url); reject(new Error(`Could not read ${file.name}`)); };
        probe.src = url;
      }).catch(() => 0);
      if (duration > 0) additions.push({ id: makeId(), name: file.name, blob: file, start: 0, end: duration, duration, volume: 1 });
    }
    if (!additions.length) { setMessage('Choose a supported video file to add to your timeline.'); return; }
    setClips(previous => [...previous, ...additions]);
    setSelectedId(previous => previous || additions[0].id);
    setMessage(`${additions.length} clip${additions.length === 1 ? '' : 's'} added to your timeline.`);
  };

  const startVoiceover = async () => {
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      setMessage('Voice recording is not supported by this browser. Try a secure browser context with microphone access.');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } });
      voiceoverStreamRef.current = stream;
      voiceoverChunksRef.current = [];
      const mimeType = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4'].find(type => MediaRecorder.isTypeSupported(type));
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      voiceoverRecorderRef.current = recorder;
      recorder.ondataavailable = event => { if (event.data.size) voiceoverChunksRef.current.push(event.data); };
      recorder.onerror = () => {
        setMessage('Voiceover recording stopped because the microphone recorder reported an error.');
        stream.getTracks().forEach(track => track.stop());
        voiceoverStreamRef.current = null;
        setRecordingVoiceover(false);
      };
      recorder.onstop = () => {
        const blob = new Blob(voiceoverChunksRef.current, { type: recorder.mimeType || 'audio/webm' });
        if (blob.size) {
          setVoiceover(blob);
          setMessage(`Voiceover captured · ${(blob.size / 1024).toFixed(0)} KB`);
        }
        stream.getTracks().forEach(track => track.stop());
        voiceoverStreamRef.current = null;
        voiceoverRecorderRef.current = null;
        setRecordingVoiceover(false);
      };
      recorder.start(250);
      setRecordingVoiceover(true);
      setMessage('Recording voiceover… speak naturally, then stop when you are done.');
    } catch (error) {
      voiceoverStreamRef.current?.getTracks().forEach(track => track.stop());
      voiceoverStreamRef.current = null;
      setRecordingVoiceover(false);
      setMessage(error instanceof Error ? error.message : 'Microphone permission was not granted.');
    }
  };

  const stopVoiceover = () => {
    const recorder = voiceoverRecorderRef.current;
    if (recorder && recorder.state !== 'inactive') recorder.stop();
  };

  const updateSelected = (patch: Partial<StudioClip>) => {
    if (!selectedClip) return;
    setClips(previous => previous.map(clip => clip.id === selectedClip.id ? { ...clip, ...patch } : clip));
  };

  const addTextLayer = () => {
    const id = makeId();
    const layer = normalizeStudioTextLayer({ id, text: 'Your title', color: '#FFFFFF', start: 0, end: 0, position: 'bottom', fontSize: 54, opacity: 1, scale: 1, rotation: 0 }, id);
    setTextLayers(previous => [...previous, layer]);
    setSelectedTextLayerId(id);
    setMessage('Text layer added.');
  };

  const updateSelectedTextLayer = (patch: Partial<StudioTextLayer>) => {
    if (!selectedTextLayer) return;
    setTextLayers(previous => previous.map(layer => layer.id === selectedTextLayer.id ? normalizeStudioTextLayer({ ...layer, ...patch }, layer.id) : layer));
  };

  const addTextKeyframe = () => {
    if (!selectedTextLayer) return;
    const time = Math.max(0, Math.min(totalDuration, previewGlobalTime));
    const keyframe = { time, opacity: selectedTextLayer.opacity, scale: selectedTextLayer.scale, rotation: selectedTextLayer.rotation, offsetY: 0 };
    updateSelectedTextLayer({ keyframes: [...selectedTextLayer.keyframes.filter(frame => Math.abs(frame.time - time) > 0.01), keyframe] });
    setMessage(`Motion keyframe saved at ${time.toFixed(1)}s.`);
  };

  const addImageLayer = (file: File) => {
    if (!canAddStudioImageLayer(imageLayers, file)) { setMessage('Use PNG, JPEG or WebP images, up to 10 MB each, 20 layers and 40 MB combined.'); return; }
    const id = makeId();
    const layer = normalizeStudioImageLayer({ id, name: file.name, blob: file, start: Math.min(previewGlobalTime, totalDuration), end: 0, x: 0.5, y: 0.5, scale: 0.28, rotation: 0, opacity: 1 }, id);
    setImageLayers(previous => [...previous, layer]);
    setSelectedImageLayerId(id);
    setMessage('Image layer added to your project.');
  };

  const updateSelectedImageLayer = (patch: Partial<StudioImageLayer>) => {
    if (!selectedImageLayer) return;
    setImageLayers(previous => previous.map(layer => layer.id === selectedImageLayer.id ? normalizeStudioImageLayer({ ...layer, ...patch }, layer.id) : layer));
  };

  const addImageKeyframe = () => {
    if (!selectedImageLayer) return;
    const time = Math.max(0, Math.min(totalDuration, previewGlobalTime));
    const keyframe = { time, x: selectedImageLayer.x, y: selectedImageLayer.y, scale: selectedImageLayer.scale, rotation: selectedImageLayer.rotation, opacity: selectedImageLayer.opacity };
    updateSelectedImageLayer({ keyframes: [...selectedImageLayer.keyframes.filter(frame => Math.abs(frame.time - time) > 0.01), keyframe] });
    setMessage(`Image motion keyframe saved at ${time.toFixed(1)}s.`);
  };

  const addSubtitleSegment = () => {
    if (subtitleSegments.length >= 30) { setMessage('A project can contain up to 30 subtitle segments.'); return; }
    const id = makeId();
    const start = Math.max(0, Math.min(totalDuration, previewGlobalTime));
    const segment = normalizeStudioSubtitleSegment({ id, text: 'Add your subtitle', start, end: Math.min(totalDuration || 600, start + 3) }, id, totalDuration || 600);
    setSubtitleSegments(previous => [...previous, segment]);
    setSelectedSubtitleSegmentId(id);
    setMessage('Subtitle segment added.');
  };
  const updateSelectedSubtitle = (patch: Partial<StudioSubtitleSegment>) => {
    if (!selectedSubtitleSegment) return;
    setSubtitleSegments(previous => previous.map(segment => segment.id === selectedSubtitleSegment.id ? normalizeStudioSubtitleSegment({ ...segment, ...patch }, segment.id, totalDuration || 600) : segment));
  };

  const reorderClip = (sourceId: string, targetId: string) => {
    setClips(previous => reorderById(previous, sourceId, targetId));
    setSelectedId(sourceId);
  };

  const moveClip = (index: number, direction: -1 | 1) => {
    setClips(previous => {
      const next = [...previous];
      const target = index + direction;
      if (target < 0 || target >= next.length) return previous;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  const splitAtPlayhead = () => {
    const video = videoRef.current;
    if (!selectedClip || !video) return;
    const point = video.currentTime;
    if (point <= selectedClip.start + 0.25 || point >= selectedClip.end - 0.25) {
      setMessage('Move the playhead inside the selected clip before splitting.');
      return;
    }
    const left = { ...selectedClip, id: makeId(), name: `${selectedClip.name} · 1`, end: point };
    const right = { ...selectedClip, id: makeId(), name: `${selectedClip.name} · 2`, start: point };
    setClips(previous => {
      const index = previous.findIndex(clip => clip.id === selectedClip.id);
      return [...previous.slice(0, index), left, right, ...previous.slice(index + 1)];
    });
    setSelectedId(right.id);
    setMessage('Clip split at the playhead.');
  };

  const removeClip = (id: string) => {
    setClips(previous => {
      const next = previous.filter(clip => clip.id !== id);
      if (selectedId === id) setSelectedId(next[0]?.id || null);
      return next;
    });
  };

  const togglePreview = async () => {
    const video = videoRef.current;
    if (!video || !selectedClip) return;
    if (playing) { video.pause(); soundtrackPreviewRef.current?.pause(); voiceoverPreviewRef.current?.pause(); setPlaying(false); return; }
    if (video.currentTime < selectedClip.start || video.currentTime >= selectedClip.end) video.currentTime = selectedClip.start;
    try {
      await video.play();
      const elapsed = previewGlobalTime;
      const music = soundtrackPreviewRef.current;
      const narration = voiceoverPreviewRef.current;
      if (music && soundtrack) {
        if (Number.isFinite(music.duration) && music.duration > 0) music.currentTime = getStudioTimelineAudioPosition(elapsed, 0, music.duration, true).sourceTime;
        await music.play().catch(() => undefined);
      }
      if (narration && voiceover && elapsed >= voiceoverStart && (!Number.isFinite(narration.duration) || elapsed - voiceoverStart < narration.duration)) {
        narration.currentTime = getStudioTimelineAudioPosition(elapsed, voiceoverStart, Number.isFinite(narration.duration) ? narration.duration : null).sourceTime;
        await narration.play().catch(() => undefined);
      }
      setPlaying(true);
    } catch { setMessage('Playback could not start. Tap play again.'); }
  };

  const renderProject = async (): Promise<Blob> => {
    if (!clips.length) throw new Error('Add at least one video clip first.');
    const canvas = canvasRef.current;
    if (!canvas || typeof canvas.captureStream !== 'function' || typeof MediaRecorder === 'undefined') {
      throw new Error('Video export is not supported by this browser. Your Studio draft is safe.');
    }
    const mimeType = ['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm'].find(type => MediaRecorder.isTypeSupported(type));
    if (!mimeType) throw new Error('This browser does not provide a supported video export format.');
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Video rendering is unavailable on this device.');
    const dimensions = aspectRatio === 'portrait' ? { width: 720, height: 1280 } : aspectRatio === 'square' ? { width: 1080, height: 1080 } : { width: 1280, height: 720 };
    canvas.width = dimensions.width; canvas.height = dimensions.height;
    const preview = document.createElement('video');
    preview.playsInline = true;
    preview.muted = false;
    preview.volume = 1;
    preview.preload = 'auto';
    const stream = canvas.captureStream(30);
    let audioContext: AudioContext | null = null;
    let audioElement: HTMLAudioElement | null = null;
    let audioObjectUrl: string | null = null;
    let voiceoverElement: HTMLAudioElement | null = null;
    let voiceoverObjectUrl: string | null = null;
    let clipGain: GainNode | null = null;
    let soundtrackGain: GainNode | null = null;
    let voiceoverGain: GainNode | null = null;
    let voiceoverStartTimer: number | null = null;
    let voiceoverDuration = 0;
    let elapsed = 0;
    let fadeOpacity = transition === 'fade' ? 1 : 0;
    const AudioContextClass = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) throw new Error('Audio mixing is not supported by this browser. Export is paused to avoid silently dropping your clip audio.');
    if (AudioContextClass) {
      audioContext = new AudioContextClass();
      await audioContext.resume();
      const mixedAudio = audioContext.createMediaStreamDestination();
      // Route source-video audio and optional soundtrack into the export stream, not the device speakers.
      clipGain = audioContext.createGain();
      audioContext.createMediaElementSource(preview).connect(clipGain);
      clipGain.connect(mixedAudio);
      if (soundtrack) {
        audioElement = new Audio();
        audioElement.src = audioObjectUrl = URL.createObjectURL(soundtrack);
        audioElement.loop = true;
        const source = audioContext.createMediaElementSource(audioElement);
        soundtrackGain = audioContext.createGain();
        soundtrackGain.gain.value = soundtrackVolume;
        source.connect(soundtrackGain);
        soundtrackGain.connect(mixedAudio);
      }
      if (voiceover) {
        voiceoverElement = new Audio();
        voiceoverElement.preload = 'metadata';
        voiceoverElement.src = voiceoverObjectUrl = URL.createObjectURL(voiceover);
        await new Promise<void>((resolve, reject) => {
          const timeout = window.setTimeout(() => reject(new Error('The voiceover duration could not be read. Try recording or importing it again.')), 8000);
          voiceoverElement!.onloadedmetadata = () => {
            window.clearTimeout(timeout);
            voiceoverDuration = Number.isFinite(voiceoverElement!.duration) ? voiceoverElement!.duration : 0;
            if (voiceoverDuration > 0) resolve();
            else reject(new Error('The voiceover file has no readable duration.'));
          };
          voiceoverElement!.onerror = () => { window.clearTimeout(timeout); reject(new Error('The voiceover audio could not be decoded for export.')); };
          if (voiceoverElement!.readyState >= 1) {
            window.clearTimeout(timeout);
            voiceoverDuration = Number.isFinite(voiceoverElement!.duration) ? voiceoverElement!.duration : 0;
            resolve();
          } else voiceoverElement!.load();
        });
        voiceoverGain = audioContext.createGain();
        voiceoverGain.gain.value = voiceoverVolume;
        audioContext.createMediaElementSource(voiceoverElement).connect(voiceoverGain);
        voiceoverGain.connect(mixedAudio);
      }
      mixedAudio.stream.getAudioTracks().forEach(track => stream.addTrack(track));
    }
    const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: exportQuality === 'high' ? 8_000_000 : 4_000_000, audioBitsPerSecond: 128_000 });
    const chunks: Blob[] = [];
    const imageAssets = new Map<string, CanvasImageSource>();
    const stopped = new Promise<Blob>((resolve, reject) => {
      recorder.ondataavailable = event => { if (event.data.size) chunks.push(event.data); };
      recorder.onerror = () => reject(new Error('The video export failed while encoding.'));
      recorder.onstop = () => chunks.length ? resolve(new Blob(chunks, { type: recorder.mimeType || mimeType })) : reject(new Error('The export did not contain any video data.'));
    });
    let frame = 0;
    const draw = () => {
      context.fillStyle = '#050914';
      context.fillRect(0, 0, canvas.width, canvas.height);
      if (preview.readyState >= 2) {
        const scale = Math.min(canvas.width / preview.videoWidth, canvas.height / preview.videoHeight);
        const width = preview.videoWidth * scale;
        const height = preview.videoHeight * scale;
        context.drawImage(preview, (canvas.width - width) / 2, (canvas.height - height) / 2, width, height);
      }
      for (const layer of imageLayers) {
        const frame = getStudioImageLayerFrame(layer, elapsed, totalDuration);
        if (!frame) continue;
        const image = imageAssets.get(layer.id);
        if (!image) continue;
        const dimensions = image as ImageBitmap | HTMLImageElement;
        const imageWidth = 'naturalWidth' in dimensions ? dimensions.naturalWidth : dimensions.width;
        const imageHeight = 'naturalHeight' in dimensions ? dimensions.naturalHeight : dimensions.height;
        const width = canvas.width * frame.scale;
        const height = imageWidth > 0 ? width * imageHeight / imageWidth : width;
        context.save();
        context.globalAlpha = frame.opacity;
        context.translate(canvas.width * frame.x, canvas.height * frame.y);
        context.rotate(frame.rotation * Math.PI / 180);
        context.drawImage(image, -width / 2, -height / 2, width, height);
        context.restore();
      }
      for (const segment of subtitleSegments) {
        if (elapsed < segment.start || elapsed >= segment.end || !segment.text.trim()) continue;
        context.save();
        const fontSize = Math.max(24, Math.round(canvas.width * 0.038));
        context.font = `600 ${fontSize}px system-ui, sans-serif`;
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        const lines: string[] = [];
        let line = '';
        for (const word of segment.text.trim().split(/\s+/)) {
          const candidate = line ? `${line} ${word}` : word;
          if (line && context.measureText(candidate).width > canvas.width - 100) { lines.push(line); line = word; } else line = candidate;
        }
        if (line) lines.push(line);
        const visibleLines = lines.slice(0, 2);
        const lineHeight = fontSize * 1.25;
        const boxHeight = visibleLines.length * lineHeight + 28;
        const centerY = canvas.height - Math.max(110, canvas.height * 0.14);
        context.fillStyle = 'rgba(5,9,20,.78)';
        context.fillRect(32, centerY - boxHeight / 2, canvas.width - 64, boxHeight);
        context.fillStyle = '#FFFFFF';
        visibleLines.forEach((text, index) => context.fillText(text, canvas.width / 2, centerY + (index - (visibleLines.length - 1) / 2) * lineHeight, canvas.width - 100));
        context.restore();
      }
      for (const layer of textLayers) {
        const frame = getStudioTextLayerFrame(layer, elapsed, totalDuration);
        if (!frame) continue;
        context.save();
        context.globalAlpha = frame.opacity;
        context.translate(canvas.width / 2, (layer.position === 'top' ? 90 : layer.position === 'center' ? canvas.height / 2 : canvas.height - 70) + frame.offsetY);
        context.rotate((layer.rotation + frame.rotation) * Math.PI / 180);
        context.scale(frame.scale, frame.scale);
        context.font = `700 ${layer.fontSize}px system-ui, sans-serif`;
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        context.lineWidth = Math.max(3, layer.fontSize * 0.14);
        context.strokeStyle = 'rgba(5,9,20,.82)';
        context.fillStyle = layer.color;
        const words = layer.text.trim().split(/\s+/);
        const wrapped: string[] = [];
        let line = '';
        for (const word of words) {
          const candidate = line ? `${line} ${word}` : word;
          if (line && context.measureText(candidate).width > canvas.width - 120) { wrapped.push(line); line = word; }
          else line = candidate;
        }
        if (line) wrapped.push(line);
        wrapped.slice(-3).forEach((text, index, all) => {
          const y = (index - (all.length - 1) / 2) * layer.fontSize * 1.2;
          context.strokeText(text, 0, y);
          context.fillText(text, 0, y);
        });
        context.restore();
      }
      if (fadeOpacity > 0) {
        context.fillStyle = `rgba(0,0,0,${Math.min(1, fadeOpacity)})`;
        context.fillRect(0, 0, canvas.width, canvas.height);
      }
      frame = requestAnimationFrame(draw);
    };
    const animateFade = (from: number, to: number, durationMs: number) => new Promise<void>(resolve => {
      const started = performance.now();
      const step = (now: number) => {
        const progress = Math.min(1, (now - started) / durationMs);
        fadeOpacity = from + (to - from) * progress;
        if (progress < 1) requestAnimationFrame(step); else resolve();
      };
      requestAnimationFrame(step);
    });
    try {
      for (const layer of imageLayers) {
        let bitmap: ImageBitmap | null = null;
        if (typeof createImageBitmap === 'function') {
          try { bitmap = await createImageBitmap(layer.blob); } catch { bitmap = null; }
        }
        if (bitmap) imageAssets.set(layer.id, bitmap);
        else {
          const image = new Image();
          image.src = getUrlForClip(layer.blob);
          await new Promise<void>((resolve, reject) => { image.onload = () => resolve(); image.onerror = () => reject(new Error(`Could not decode image layer: ${layer.name}`)); });
          imageAssets.set(layer.id, image);
        }
      }
      recorder.start(250);
      draw();
      for (const [clipIndex, clip] of clips.entries()) {
        if (clipGain) clipGain.gain.value = clip.volume;
        if (soundtrackGain) soundtrackGain.gain.value = soundtrackVolume;
        preview.src = URL.createObjectURL(clip.blob);
        const clipUrl = preview.src;
        await new Promise<void>((resolve, reject) => {
          preview.onloadedmetadata = () => resolve();
          preview.onerror = () => reject(new Error(`Could not open ${clip.name} for export.`));
        });
        if (Math.abs(preview.currentTime - clip.start) > 0.05) {
          await new Promise<void>((resolve, reject) => {
            const timeout = window.setTimeout(() => reject(new Error('The editor could not seek to the selected clip range.')), 8000);
            preview.onseeked = () => { window.clearTimeout(timeout); resolve(); };
            preview.currentTime = clip.start;
          });
        }
        await preview.play();
        if (transition === 'fade') await animateFade(1, 0, 350);
        if (clipIndex === 0) {
          if (audioElement) await audioElement.play().catch(() => undefined);
          if (voiceoverElement) voiceoverStartTimer = window.setTimeout(() => { void voiceoverElement?.play().catch(() => undefined); }, Math.max(0, voiceoverStart * 1000));
        }
        const clipElapsedStart = elapsed;
        await new Promise<void>(resolve => {
          const check = () => {
            elapsed = clipElapsedStart + Math.max(0, preview.currentTime - clip.start);
            if (soundtrackGain) soundtrackGain.gain.value = getDuckedMusicGain({ volume: soundtrackVolume, elapsed, totalDuration, fadeIn: soundtrackFadeIn, fadeOut: soundtrackFadeOut, duckingEnabled: duckMusicUnderVoiceover && Boolean(voiceover), voiceoverStart, voiceoverDuration, duckingLevel: musicDuckingLevel });
            if (voiceoverGain) voiceoverGain.gain.value = getAudioEnvelopeGain({ volume: voiceoverVolume, elapsed: Math.max(0, elapsed - voiceoverStart), totalDuration: voiceoverDuration, fadeIn: voiceoverFadeIn, fadeOut: voiceoverFadeOut });
            if (preview.currentTime >= clip.end || preview.ended) { preview.pause(); resolve(); }
            else window.setTimeout(check, 40);
          };
          check();
        });
        preview.pause();
        elapsed = clipElapsedStart + (clip.end - clip.start);
        URL.revokeObjectURL(clipUrl);
        if (transition === 'fade' && clipIndex < clips.length - 1) await animateFade(0, 1, 350);
      }
      cancelAnimationFrame(frame);
      recorder.stop();
      return await stopped;
    } catch (error) {
      cancelAnimationFrame(frame);
      if (recorder.state !== 'inactive') recorder.stop();
      throw error;
    } finally {
      preview.pause();
      if (voiceoverStartTimer !== null) window.clearTimeout(voiceoverStartTimer);
      if (audioElement) audioElement.pause();
      if (audioObjectUrl) URL.revokeObjectURL(audioObjectUrl);
      if (voiceoverElement) voiceoverElement.pause();
      if (voiceoverObjectUrl) URL.revokeObjectURL(voiceoverObjectUrl);
      for (const asset of imageAssets.values()) if (typeof ImageBitmap !== 'undefined' && asset instanceof ImageBitmap) asset.close();
      audioContext?.close();
      stream.getTracks().forEach(track => track.stop());
    }
  };

  const handleExport = async () => {
    setRendering(true); setMessage('Rendering your timeline…');
    try {
      const blob = await renderProject();
      setMessage(`Export ready · ${(blob.size / (1024 * 1024)).toFixed(1)} MB · WebM`);
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `nexora-studio-${Date.now()}.webm`;
      anchor.click();
      URL.revokeObjectURL(url);
      setExportBlob(blob);
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Export failed.'); }
    finally { setRendering(false); }
  };
  const [exportBlob, setExportBlob] = useState<Blob | null>(null);

  const handlePublish = async () => {
    if (!exportBlob) { await handleExport(); return; }
    setPublishing(true);
    try { await onPublish(exportBlob, caption); setMessage('Your Studio video has been published.'); }
    catch (error) { setMessage(error instanceof Error ? error.message : 'Publishing failed. Your draft remains saved.'); }
    finally { setPublishing(false); }
  };

  const previewUrl = selectedClip ? getUrlForClip(selectedClip.blob) : '';
  function getUrlForClip(blob: Blob): string {
    const key = blob as Blob & { __studioUrl?: string };
    if (!key.__studioUrl) {
      const url = URL.createObjectURL(blob);
      Object.defineProperty(key, '__studioUrl', { value: url, configurable: true });
      projectUrls.current.push(url);
    }
    return key.__studioUrl;
  }

  return (
    <AnimatePresence>
      <motion.div className="fixed inset-0 z-[140] flex flex-col bg-[#05040D] text-white" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
        <header className="flex items-center justify-between gap-3 border-b border-[#292244] bg-[#090714] px-4 py-3 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <button type="button" onClick={onClose} aria-label="Close Studio" className="rounded-xl border border-white/10 p-2 text-[#C7B5FF]"><ArrowLeft size={18}/></button>
            <div className="min-w-0"><p className="text-[10px] font-bold uppercase tracking-[.24em] text-violet-300">NEXORA</p><h1 className="truncate text-lg font-black tracking-tight sm:text-xl">Studio</h1></div>
          </div>
          <div className="flex items-center gap-2"><span className="hidden text-[10px] text-[#8E88A7] sm:inline">{currentUser.name || currentUser.username || 'Creator'} · {Math.round(totalDuration)}s</span><button type="button" onClick={undo} disabled={!canUndo} aria-label="Undo edit" title="Undo · Ctrl/⌘ Z" className="rounded-lg border border-[#34265E] p-2 text-[#D7CCF7] disabled:opacity-30"><Undo2 size={16}/></button><button type="button" onClick={redo} disabled={!canRedo} aria-label="Redo edit" title="Redo · Ctrl/⌘ Shift Z" className="rounded-lg border border-[#34265E] p-2 text-[#D7CCF7] disabled:opacity-30"><Redo2 size={16}/></button><select aria-label="Export quality" value={exportQuality} onChange={event => setExportQuality(event.target.value as 'balanced' | 'high')} className="max-w-24 rounded-lg border border-[#34265E] bg-[#100C20] px-2 py-2 text-[10px] text-white"><option value="balanced">Balanced</option><option value="high">High quality</option></select><button type="button" onClick={handleExport} disabled={rendering || !clips.length} className="rounded-xl bg-gradient-to-r from-[#8A3FFC] via-[#4B10F2] to-[#1600A3] px-4 py-2 text-xs font-bold disabled:opacity-50">{rendering ? 'Rendering…' : 'Export video'}</button></div>
        </header>
        <main className="grid min-h-0 flex-1 grid-rows-[minmax(220px,1fr)_auto] overflow-y-auto lg:grid-cols-[minmax(0,1fr)_340px] lg:grid-rows-1">
          <section className="flex min-h-[260px] flex-col items-center justify-center gap-3 border-b border-[#292244] bg-[radial-gradient(ellipse_at_top,rgba(75,16,242,.16),transparent_65%)] p-4 lg:border-b-0 lg:border-r">
            <div className={`relative flex ${aspectRatio === 'portrait' ? 'aspect-[9/16] max-w-sm' : aspectRatio === 'square' ? 'aspect-square max-w-2xl' : 'aspect-video max-w-5xl'} w-full items-center justify-center overflow-hidden rounded-2xl border border-[#34265E] bg-black shadow-[0_20px_80px_rgba(75,16,242,.14)]`}>
              {soundtrack && <audio ref={soundtrackPreviewRef} src={getUrlForClip(soundtrack)} loop preload="auto" onLoadedMetadata={() => setAudioMetadataRevision(value => value + 1)} className="hidden"/>}
              {voiceover && <audio ref={voiceoverPreviewRef} src={getUrlForClip(voiceover)} preload="auto" onLoadedMetadata={() => setAudioMetadataRevision(value => value + 1)} className="hidden"/>}
              {selectedClip ? <video ref={videoRef} key={selectedClip.id} src={previewUrl} className="h-full w-full object-contain" playsInline controls muted={muted} onLoadedMetadata={event => { const pending = pendingSeekRef.current; const localTime = pending?.clipId === selectedClip.id ? pending.localTime : selectedClip.start; event.currentTarget.currentTime = Math.min(selectedClip.end, Math.max(selectedClip.start, localTime)); if (pending?.clipId === selectedClip.id) pendingSeekRef.current = null; setPreviewGlobalTime(selectedClipGlobalOffset + Math.max(0, event.currentTarget.currentTime - selectedClip.start)); if (continuePlaybackRef.current) { void event.currentTarget.play().then(() => { continuePlaybackRef.current = false; setPlaying(true); }).catch(() => { continuePlaybackRef.current = false; setPlaying(false); setMessage('The next clip could not start. Tap play to continue.'); }); } }} onTimeUpdate={event => { setPreviewGlobalTime(selectedClipGlobalOffset + Math.max(0, event.currentTarget.currentTime - selectedClip.start)); if (event.currentTarget.currentTime >= selectedClip.end && !continuePlaybackRef.current) { const next = getNextStudioClipTimelinePosition(clips, selectedClip.id); if (next) { continuePlaybackRef.current = true; pendingSeekRef.current = { clipId: next.clipId, localTime: next.localTime }; setPreviewGlobalTime(next.globalTime); setSelectedId(next.clipId); } else { event.currentTarget.pause(); setPlaying(false); } } }} onPlay={() => setPlaying(true)} onPause={() => { if (!continuePlaybackRef.current) setPlaying(false); }}/> : <div className="px-6 text-center"><Clapperboard size={42} className="mx-auto mb-3 text-violet-300"/><p className="font-semibold">Your creative timeline starts here</p><p className="mt-1 text-xs text-[#8E88A7]">Add video clips to begin editing.</p></div>}
              {imageLayers.map(layer => { const frame = getStudioImageLayerFrame(layer, previewGlobalTime, totalDuration); if (!frame) return null; return <img key={layer.id} src={getUrlForClip(layer.blob)} alt={layer.name} draggable={false} className="pointer-events-none absolute z-[5] max-w-none object-contain" style={{ left: `${frame.x * 100}%`, top: `${frame.y * 100}%`, width: `${frame.scale * 100}%`, transform: `translate(-50%, -50%) rotate(${frame.rotation}deg)`, opacity: frame.opacity }}/>; })}
              {subtitleSegments.filter(segment => previewGlobalTime >= segment.start && previewGlobalTime < segment.end && segment.text.trim()).map(segment => <div key={segment.id} className="pointer-events-none absolute bottom-[12%] left-[5%] z-[8] w-[90%] rounded-lg bg-[#050914]/80 px-3 py-2 text-center text-sm font-semibold text-white shadow-lg">{segment.text}</div>)}
              {textLayers.map(layer => { const frame = getStudioTextLayerFrame(layer, previewGlobalTime, totalDuration); if (!frame) return null; return <div key={layer.id} className="pointer-events-none absolute z-10 max-w-[90%] whitespace-pre-wrap text-center font-black drop-shadow-[0_2px_8px_rgba(0,0,0,.9)]" style={{ left: '50%', top: layer.position === 'top' ? '9%' : layer.position === 'center' ? '50%' : undefined, bottom: layer.position === 'bottom' ? '9%' : undefined, transform: `translate(-50%, -50%) translateY(${frame.offsetY}px) rotate(${layer.rotation + frame.rotation}deg) scale(${frame.scale})`, fontSize: `${Math.max(12, layer.fontSize * (aspectRatio === 'portrait' ? 0.48 : 0.62))}px`, opacity: frame.opacity, color: layer.color }}>{layer.text}</div>; })}
            </div>
            <div className="w-full max-w-3xl space-y-1 rounded-xl border border-[#292244] bg-[#100C20] px-3 py-2">
              <div className="flex items-center justify-between text-[10px] text-[#A39BBF]"><span>Shared playhead</span><span className="tabular-nums">{previewGlobalTime.toFixed(1)}s / {totalDuration.toFixed(1)}s</span></div>
              <input aria-label="Seek across the full Studio timeline" type="range" min="0" max={Math.max(0,totalDuration)} step="0.05" value={Math.min(previewGlobalTime,totalDuration)} disabled={!totalDuration} onChange={event => seekToGlobalTime(Number(event.target.value))} className="w-full accent-violet-500"/>
            </div>
            <div className="flex items-center gap-2">
              <button type="button" onClick={togglePreview} disabled={!selectedClip} className="rounded-full border border-violet-400/40 bg-violet-500/15 p-3 text-violet-100"><span className="sr-only">{playing ? 'Pause' : 'Play'}</span>{playing ? <Pause size={18}/> : <Play size={18}/>}</button>
              <button type="button" onClick={splitAtPlayhead} disabled={!selectedClip} className="inline-flex items-center gap-2 rounded-xl border border-[#34265E] px-3 py-2 text-xs text-[#D7CCF7]"><Scissors size={14}/> Split at playhead</button>
              <button type="button" onClick={() => setMuted(value => !value)} className="rounded-xl border border-[#34265E] p-2 text-[#D7CCF7]"><Volume2 size={15}/><span className="sr-only">{muted ? 'Unmute preview' : 'Mute preview'}</span></button>
            </div>
            <canvas ref={canvasRef} className="hidden"/>
          </section>
          <aside className="flex min-h-0 flex-col gap-4 overflow-y-auto p-4 sm:p-5">
            <div className="space-y-2">
              <div className="flex items-center justify-between"><h2 className="text-sm font-bold">Timeline</h2><label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-violet-400/30 bg-violet-500/10 px-3 py-2 text-xs font-semibold text-violet-100"><Plus size={14}/> Add clips<input className="hidden" type="file" accept="video/*" multiple onChange={event => { if (event.target.files) void addVideoFiles(event.target.files); event.target.value=''; }}/></label></div>
              <div className="space-y-3 rounded-xl border border-[#292244] bg-[#0B0916] p-3">
                <div className="flex items-center justify-between text-[10px] text-[#A39BBF]"><span>All tracks · shared time</span><span className="tabular-nums">{previewGlobalTime.toFixed(1)}s</span></div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2"><span className="w-14 shrink-0 text-[9px] text-[#8E88A7]">Video</span><div className="relative flex h-7 min-w-0 flex-1 overflow-hidden rounded-md bg-[#171329]">{timelineClipSegments.map(segment => <button key={segment.clip.id} type="button" title={`${segment.clip.name} · ${segment.duration.toFixed(1)}s`} onClick={() => seekToGlobalTime(segment.start)} className={`h-full min-w-0 border-r border-[#090714] text-[8px] font-semibold ${selectedId===segment.clip.id?'bg-violet-500/70 text-white':'bg-violet-950 text-violet-200'}`} style={{width:`${totalDuration ? segment.duration/totalDuration*100 : 0}%`}}>{segment.duration >= 1.5 ? segment.clip.name.slice(0,12) : ''}</button>)}</div></div>
                  {[{label:'Audio',items:[...(soundtrack?[{id:'soundtrack',name:'Music',start:0,end:totalDuration}]:[]),...(voiceover?[{id:'voiceover',name:'Voiceover',start:voiceoverStart,end:Math.min(totalDuration,voiceoverStart+Math.max(1,totalDuration-voiceoverStart))}]:[])] ,color:'bg-emerald-500/60'},{label:'Images',items:imageLayers.map(layer=>({id:layer.id,name:layer.name,start:layer.start,end:layer.end||totalDuration})),color:'bg-fuchsia-500/60'},{label:'Text',items:textLayers.map(layer=>({id:layer.id,name:layer.text||'Text',start:layer.start,end:layer.end||totalDuration})),color:'bg-amber-400/70'},{label:'Subs',items:subtitleSegments.map(segment=>({id:segment.id,name:segment.text,start:segment.start,end:segment.end})),color:'bg-sky-400/70'}].map(track => <div key={track.label} className="flex items-center gap-2"><span className="w-14 shrink-0 text-[9px] text-[#8E88A7]">{track.label}</span><div className="relative h-5 min-w-0 flex-1 overflow-hidden rounded-md bg-[#171329]">{track.items.map(item=>{const start=Math.max(0,Math.min(totalDuration,item.start));const end=Math.max(start,Math.min(totalDuration,item.end));const width=totalDuration?(end-start)/totalDuration*100:0;return <button key={item.id} type="button" title={`${item.name} · ${start.toFixed(1)}–${end.toFixed(1)}s`} onClick={()=>seekToGlobalTime(start)} className={`absolute inset-y-0 rounded-sm ${track.color}`} style={{left:`${totalDuration?start/totalDuration*100:0}%`,width:`${width}%`,minWidth:width>0?'2px':0}} aria-label={`Seek to ${track.label} ${item.name}`}/>})}</div></div>)}
                </div>
              </div>
              <div className="space-y-2">
                {clips.map((clip,index) => <div key={clip.id} draggable onDragStart={event=>{draggedClipIdRef.current=clip.id; event.dataTransfer.effectAllowed="move"; event.dataTransfer.setData("text/plain",clip.id);}} onDragOver={event=>event.preventDefault()} onDrop={event=>{event.preventDefault(); const sourceId=event.dataTransfer.getData("text/plain")||draggedClipIdRef.current; if(sourceId) reorderClip(sourceId,clip.id); draggedClipIdRef.current=null;}} onDragEnd={()=>{draggedClipIdRef.current=null;}} className={`cursor-grab rounded-xl border p-3 active:cursor-grabbing ${selectedId===clip.id?'border-violet-400/60 bg-violet-500/10':'border-[#292244] bg-[#100C20]'}`}>
                  <button type="button" onClick={() => setSelectedId(clip.id)} className="flex w-full items-center gap-2 text-left"><Film size={15} className="shrink-0 text-violet-300"/><span className="min-w-0 flex-1 truncate text-xs font-semibold">{index+1}. {clip.name}</span><span className="text-[10px] text-[#8E88A7]">{(clip.end-clip.start).toFixed(1)}s</span></button>
                  <div className="mt-2 flex justify-end gap-1"><button onClick={() => moveClip(index,-1)} disabled={!index} aria-label="Move clip up" className="rounded-lg p-1.5 text-[#A39BBF] disabled:opacity-30"><ArrowUp size={13}/></button><button onClick={() => moveClip(index,1)} disabled={index===clips.length-1} aria-label="Move clip down" className="rounded-lg p-1.5 text-[#A39BBF] disabled:opacity-30"><ArrowDown size={13}/></button><button onClick={() => removeClip(clip.id)} aria-label="Remove clip" className="rounded-lg p-1.5 text-rose-300"><Trash2 size={13}/></button></div>
                </div>)}
                {!clips.length && <label className="flex cursor-pointer flex-col items-center rounded-xl border border-dashed border-[#44376F] bg-[#100C20] px-4 py-8 text-center"><Upload size={22} className="mb-2 text-violet-300"/><span className="text-xs font-semibold">Import your first clip</span><span className="mt-1 text-[10px] text-[#8E88A7]">Multiple video files supported</span><input className="hidden" type="file" accept="video/*" multiple onChange={event => {if(event.target.files) void addVideoFiles(event.target.files); event.target.value='';}}/></label>}
              </div>
            </div>
            {selectedClip && <div className="space-y-3 rounded-xl border border-[#292244] bg-[#100C20] p-3">
              <div className="flex items-center gap-2"><Scissors size={15} className="text-violet-300"/><h2 className="text-xs font-bold">Clip trim</h2></div>
              <label className="block text-[10px] text-[#A39BBF]">In · {selectedClip.start.toFixed(1)}s<input type="range" min="0" max={Math.max(0,selectedClip.end-0.25)} step=".1" value={selectedClip.start} onChange={event => updateSelected({start:Math.min(Number(event.target.value),selectedClip.end-0.25)})} className="mt-2 w-full accent-violet-500"/></label>
              <label className="block text-[10px] text-[#A39BBF]">Out · {selectedClip.end.toFixed(1)}s<input type="range" min={Math.min(selectedClip.duration,selectedClip.start+0.25)} max={selectedClip.duration} step=".1" value={selectedClip.end} onChange={event => updateSelected({end:Math.max(Number(event.target.value),selectedClip.start+0.25)})} className="mt-2 w-full accent-violet-500"/></label>
              <label className="block text-[10px] text-[#A39BBF]">Clip volume · {Math.round(selectedClip.volume * 100)}%<input type="range" min="0" max="1" step=".05" value={selectedClip.volume} onChange={event => updateSelected({volume:Number(event.target.value)})} className="mt-2 w-full accent-violet-500"/></label>
            </div>}
            <div className="space-y-3 rounded-xl border border-[#292244] bg-[#100C20] p-3">
              <div className="flex items-center gap-2"><Music2 size={15} className="text-violet-300"/><h2 className="text-xs font-bold">Soundtrack</h2></div>
              <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-[#44376F] px-3 py-2 text-xs text-[#D7CCF7]"><Plus size={13}/>{soundtrack?'Replace audio track':'Add music or voiceover'}<input className="hidden" type="file" accept="audio/*" onChange={event => {const file=event.target.files?.[0]; if(file) setSoundtrack(file); event.target.value='';}}/></label>
              {soundtrack && <div className="flex items-center justify-between text-[10px] text-emerald-300"><span className="truncate">{(soundtrack as File).name || 'Audio track selected'}</span><button onClick={() => setSoundtrack(null)} className="text-rose-300">Remove</button></div>}
              {soundtrack && <><label className="block text-[10px] text-[#A39BBF]">Music volume · {Math.round(soundtrackVolume * 100)}%<input type="range" min="0" max="1" step=".05" value={soundtrackVolume} onChange={event => setSoundtrackVolume(Number(event.target.value))} className="mt-2 w-full accent-violet-500"/></label><div className="grid grid-cols-2 gap-2"><label className="block text-[10px] text-[#A39BBF]">Fade in · {soundtrackFadeIn}s<input type="range" min="0" max="8" step=".5" value={soundtrackFadeIn} onChange={event=>setSoundtrackFadeIn(Number(event.target.value))} className="mt-2 w-full accent-violet-500"/></label><label className="block text-[10px] text-[#A39BBF]">Fade out · {soundtrackFadeOut}s<input type="range" min="0" max="8" step=".5" value={soundtrackFadeOut} onChange={event=>setSoundtrackFadeOut(Number(event.target.value))} className="mt-2 w-full accent-violet-500"/></label></div>{voiceover && <><label className="flex items-center gap-2 text-[10px] text-[#C9BFF0]"><input type="checkbox" checked={duckMusicUnderVoiceover} onChange={event=>setDuckMusicUnderVoiceover(event.target.checked)} className="accent-violet-500"/>Lower music while narration is playing</label>{duckMusicUnderVoiceover && <label className="block text-[10px] text-[#A39BBF]">Music under voiceover · {Math.round(musicDuckingLevel*100)}%<input type="range" min="0.1" max="0.8" step=".05" value={musicDuckingLevel} onChange={event=>setMusicDuckingLevel(Number(event.target.value))} className="mt-2 w-full accent-violet-500"/></label>}</>}</>}
              <p className="text-[10px] leading-relaxed text-[#827B9C]">Music and source audio are mixed into your exported video.</p>
            </div>
            <div className="space-y-3 rounded-xl border border-[#292244] bg-[#100C20] p-3">
              <div className="flex items-center justify-between gap-2"><div className="flex items-center gap-2"><Mic size={15} className="text-violet-300"/><h2 className="text-xs font-bold">Voiceover</h2></div>{recordingVoiceover && <span className="text-[10px] font-semibold text-rose-300">Recording</span>}</div>
              <button type="button" onClick={recordingVoiceover ? stopVoiceover : startVoiceover} className={`w-full rounded-lg border px-3 py-2 text-xs font-semibold ${recordingVoiceover?'border-rose-400/40 bg-rose-500/10 text-rose-200':'border-[#44376F] text-[#D7CCF7]'}`}>{recordingVoiceover?'Stop recording':'Record voiceover'}</button>
              {voiceover && <div className="flex items-center justify-between gap-2 text-[10px] text-emerald-300"><span className="truncate">Voiceover ready · {(voiceover.size/1024).toFixed(0)} KB</span><button type="button" onClick={()=>setVoiceover(null)} className="shrink-0 text-rose-300">Remove</button></div>}
              {voiceover && <><audio controls preload="metadata" src={getUrlForClip(voiceover)} className="h-9 w-full" aria-label="Preview recorded voiceover"/><div className="flex h-12 items-center gap-px overflow-hidden rounded-lg border border-[#34265E] bg-[#080611] px-2" role="img" aria-label="Voiceover audio waveform">{voiceoverWaveform.length ? voiceoverWaveform.map((peak,index)=><span key={index} className="min-w-0 flex-1 rounded-full bg-violet-400/80" style={{height:`${Math.max(8,Math.round(peak*100))}%`}}/>) : <span className="w-full text-center text-[9px] text-[#827B9C]">Waveform preview unavailable for this recording on this device.</span>}</div></>}
              {voiceover && <><label className="block text-[10px] text-[#A39BBF]">Voice volume · {Math.round(voiceoverVolume*100)}%<input type="range" min="0" max="1" step=".05" value={voiceoverVolume} onChange={event=>setVoiceoverVolume(Number(event.target.value))} className="mt-2 w-full accent-violet-500"/></label><label className="block text-[10px] text-[#A39BBF]">Start voiceover at (seconds)<input type="number" min="0" max={Math.max(0,totalDuration)} step=".1" value={voiceoverStart} onChange={event=>setVoiceoverStart(Math.max(0,Math.min(totalDuration,Number(event.target.value)||0)))} className="mt-1 w-full rounded-lg border border-[#34265E] bg-[#080611] px-2 py-2 text-xs text-white"/></label><div className="grid grid-cols-2 gap-2"><label className="block text-[10px] text-[#A39BBF]">Fade in · {voiceoverFadeIn}s<input type="range" min="0" max="8" step=".5" value={voiceoverFadeIn} onChange={event=>setVoiceoverFadeIn(Number(event.target.value))} className="mt-2 w-full accent-violet-500"/></label><label className="block text-[10px] text-[#A39BBF]">Fade out · {voiceoverFadeOut}s<input type="range" min="0" max="8" step=".5" value={voiceoverFadeOut} onChange={event=>setVoiceoverFadeOut(Number(event.target.value))} className="mt-2 w-full accent-violet-500"/></label></div></>}
              <p className="text-[10px] leading-relaxed text-[#827B9C]">Record narration with your microphone. It is saved as a separate track and mixed during export.</p>
            </div>
            <div className="space-y-3 rounded-xl border border-[#292244] bg-[#100C20] p-3">
              <h2 className="text-xs font-bold">Video format</h2>
              <label className="block text-[10px] text-[#A39BBF]">Canvas ratio<select value={aspectRatio} onChange={event => setAspectRatio(event.target.value as typeof aspectRatio)} className="mt-1 w-full rounded-lg border border-[#34265E] bg-[#080611] px-3 py-2 text-xs text-white"><option value="portrait">9:16 · Reels and vertical video</option><option value="square">1:1 · Square posts</option><option value="landscape">16:9 · Landscape video</option></select></label>
              <label className="block text-[10px] text-[#A39BBF]">Scene transition<select value={transition} onChange={event => setTransition(event.target.value as typeof transition)} className="mt-1 w-full rounded-lg border border-[#34265E] bg-[#080611] px-3 py-2 text-xs text-white"><option value="cut">Clean cut</option><option value="fade">Fade through black</option></select></label>
            </div>
            <div className="space-y-3 rounded-xl border border-[#292244] bg-[#100C20] p-3">
              <div className="flex items-center justify-between gap-2"><div className="flex items-center gap-2"><Type size={15} className="text-violet-300"/><h2 className="text-xs font-bold">Text layers</h2></div><button type="button" onClick={addTextLayer} className="inline-flex items-center gap-1 rounded-lg border border-violet-400/30 px-2 py-1.5 text-[10px] font-semibold text-violet-100"><Plus size={12}/> Add text</button></div>
              {textLayers.length > 0 && <div className="space-y-1">{textLayers.map((layer,index)=><div key={layer.id} className={`flex items-center gap-2 rounded-lg border px-2 py-1.5 ${selectedTextLayerId===layer.id?'border-violet-400/50 bg-violet-500/10':'border-[#292244] bg-[#080611]'}`}><button type="button" onClick={()=>setSelectedTextLayerId(layer.id)} className="min-w-0 flex-1 truncate text-left text-[10px] font-semibold">{index+1}. {layer.text || 'Untitled text'}</button><button type="button" onClick={()=>{const remaining=textLayers.filter(item=>item.id!==layer.id); setTextLayers(remaining); if(selectedTextLayerId===layer.id || !remaining.some(item=>item.id===selectedTextLayerId))setSelectedTextLayerId(remaining[0]?.id||null);}} aria-label={`Delete ${layer.text || 'text'} layer`} className="rounded p-1 text-rose-300"><Trash2 size={12}/></button></div>)}</div>}
              {selectedTextLayer ? <><input value={selectedTextLayer.text} onChange={event=>updateSelectedTextLayer({text:event.target.value.slice(0,120)})} maxLength={120} placeholder="Write your title" className="w-full rounded-lg border border-[#34265E] bg-[#080611] px-3 py-2 text-xs text-white outline-none focus:border-violet-400"/><div className="grid grid-cols-2 gap-2"><label className="block text-[10px] text-[#A39BBF]">Text colour<input aria-label="Text layer colour" type="color" value={selectedTextLayer.color} onChange={event=>updateSelectedTextLayer({color:event.target.value})} className="mt-1 h-8 w-full rounded border-0 bg-transparent"/></label><label className="block text-[10px] text-[#A39BBF]">Placement<select value={selectedTextLayer.position} onChange={event=>updateSelectedTextLayer({position:event.target.value as StudioTextLayer['position']})} className="mt-1 w-full rounded-lg border border-[#34265E] bg-[#080611] px-2 py-2 text-xs text-white"><option value="top">Top</option><option value="center">Centre</option><option value="bottom">Bottom</option></select></label></div><div className="grid grid-cols-2 gap-2"><label className="block text-[10px] text-[#A39BBF]">Show from (s)<input type="number" min="0" max={Math.max(0,totalDuration)} step=".1" value={selectedTextLayer.start} onChange={event=>updateSelectedTextLayer({start:Math.max(0,Math.min(totalDuration,Number(event.target.value)||0))})} className="mt-1 w-full rounded-lg border border-[#34265E] bg-[#080611] px-2 py-2 text-xs text-white"/></label><label className="block text-[10px] text-[#A39BBF]">Hide after (s)<input type="number" min="0" max={Math.max(0,totalDuration)} step=".1" value={selectedTextLayer.end} onChange={event=>updateSelectedTextLayer({end:Math.max(0,Math.min(totalDuration,Number(event.target.value)||0))})} className="mt-1 w-full rounded-lg border border-[#34265E] bg-[#080611] px-2 py-2 text-xs text-white"/></label></div><label className="block text-[10px] text-[#A39BBF]">Font size · {selectedTextLayer.fontSize}px<input type="range" min="18" max="100" step="1" value={selectedTextLayer.fontSize} onChange={event=>updateSelectedTextLayer({fontSize:Number(event.target.value)})} className="mt-2 w-full accent-violet-500"/></label><label className="block text-[10px] text-[#A39BBF]">Opacity · {Math.round(selectedTextLayer.opacity*100)}%<input type="range" min="0" max="1" step=".05" value={selectedTextLayer.opacity} onChange={event=>updateSelectedTextLayer({opacity:Number(event.target.value)})} className="mt-2 w-full accent-violet-500"/></label><div className="grid grid-cols-2 gap-2"><label className="block text-[10px] text-[#A39BBF]">Scale · {selectedTextLayer.scale.toFixed(1)}x<input type="range" min="0.5" max="2" step=".05" value={selectedTextLayer.scale} onChange={event=>updateSelectedTextLayer({scale:Number(event.target.value)})} className="mt-2 w-full accent-violet-500"/></label><label className="block text-[10px] text-[#A39BBF]">Rotation · {selectedTextLayer.rotation}°<input type="range" min="-180" max="180" step="5" value={selectedTextLayer.rotation} onChange={event=>updateSelectedTextLayer({rotation:Number(event.target.value)})} className="mt-2 w-full accent-violet-500"/></label></div><label className="block text-[10px] text-[#A39BBF]">Entrance animation<select value={selectedTextLayer.animation} onChange={event=>updateSelectedTextLayer({animation:event.target.value as StudioTextLayer['animation']})} className="mt-1 w-full rounded-lg border border-[#34265E] bg-[#080611] px-2 py-2 text-xs text-white"><option value="none">None</option><option value="fade">Fade in / out</option><option value="zoom">Zoom in / out</option><option value="slide-up">Slide up</option><option value="pop">Pop</option></select></label>{selectedTextLayer.animation!=='none' && <label className="block text-[10px] text-[#A39BBF]">Animation duration · {selectedTextLayer.animationDuration.toFixed(1)}s<input type="range" min="0.1" max="5" step="0.1" value={selectedTextLayer.animationDuration} onChange={event=>updateSelectedTextLayer({animationDuration:Number(event.target.value)})} className="mt-2 w-full accent-violet-500"/></label>}<div className="space-y-2 rounded-lg border border-[#34265E] bg-[#080611] p-2"><div className="flex items-center justify-between gap-2"><span className="text-[10px] font-semibold text-violet-200">Motion keyframes · {selectedTextLayer.keyframes.length}/100</span><button type="button" onClick={addTextKeyframe} disabled={selectedTextLayer.keyframes.length>=100} className="rounded-md border border-violet-400/40 px-2 py-1 text-[9px] font-semibold text-violet-100 disabled:opacity-40">Add at {previewGlobalTime.toFixed(1)}s</button></div>{selectedTextLayer.keyframes.map(frame=><div key={frame.time} className="flex items-center justify-between gap-2 text-[9px]"><button type="button" onClick={()=>seekToGlobalTime(frame.time)} className="min-w-0 flex-1 text-left text-[#C7B5FF]">{frame.time.toFixed(1)}s · {Math.round(frame.opacity*100)}% · {frame.scale.toFixed(2)}x · {frame.rotation}°</button><button type="button" onClick={()=>updateSelectedTextLayer({keyframes:selectedTextLayer.keyframes.filter(item=>item.time!==frame.time)})} className="rounded px-2 py-1 text-rose-300">Remove</button></div>)}{!selectedTextLayer.keyframes.length && <p className="text-[9px] text-[#827B9C]">Move the playhead, adjust opacity, scale or rotation, then add a keyframe. Values interpolate between saved points.</p>}</div><p className="text-[9px] text-[#827B9C]">Set the end time to 0 to keep this text visible through the end of the video.</p></> : <p className="rounded-lg border border-dashed border-[#44376F] px-3 py-4 text-center text-[10px] text-[#827B9C]">Add a text layer to place titles independently in your video.</p>}
            </div>
            <div className="space-y-3 rounded-xl border border-[#292244] bg-[#100C20] p-3">
              <div className="flex items-center justify-between gap-2"><div className="flex items-center gap-2"><Film size={15} className="text-violet-300"/><h2 className="text-xs font-bold">Image & sticker layers</h2></div><label className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-violet-400/30 px-2 py-1.5 text-[10px] font-semibold text-violet-100"><Plus size={12}/> Add image<input type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={event=>{const file=event.target.files?.[0]; if(file)addImageLayer(file); event.target.value='';}}/></label></div>
              {imageLayers.length>0 && <div className="space-y-1">{imageLayers.map((layer,index)=><div key={layer.id} className={`flex items-center gap-2 rounded-lg border px-2 py-1.5 ${selectedImageLayerId===layer.id?'border-violet-400/50 bg-violet-500/10':'border-[#292244] bg-[#080611]'}`}><button type="button" onClick={()=>setSelectedImageLayerId(layer.id)} className="min-w-0 flex-1 truncate text-left text-[10px] font-semibold">{index+1}. {layer.name}</button><button type="button" onClick={()=>{const remaining=imageLayers.filter(item=>item.id!==layer.id); setImageLayers(remaining); if(selectedImageLayerId===layer.id || !remaining.some(item=>item.id===selectedImageLayerId))setSelectedImageLayerId(remaining[0]?.id||null);}} aria-label={`Delete ${layer.name} layer`} className="rounded p-1 text-rose-300"><Trash2 size={12}/></button></div>)}</div>}
              {selectedImageLayer ? <><div className="grid grid-cols-2 gap-2"><label className="block text-[10px] text-[#A39BBF]">Show from (s)<input type="number" min="0" max={Math.max(0,totalDuration)} step=".1" value={selectedImageLayer.start} onChange={event=>updateSelectedImageLayer({start:Math.max(0,Math.min(totalDuration,Number(event.target.value)||0))})} className="mt-1 w-full rounded-lg border border-[#34265E] bg-[#080611] px-2 py-2 text-xs text-white"/></label><label className="block text-[10px] text-[#A39BBF]">Hide after (s)<input type="number" min="0" max={Math.max(0,totalDuration)} step=".1" value={selectedImageLayer.end} onChange={event=>updateSelectedImageLayer({end:Math.max(0,Math.min(totalDuration,Number(event.target.value)||0))})} className="mt-1 w-full rounded-lg border border-[#34265E] bg-[#080611] px-2 py-2 text-xs text-white"/></label></div><label className="block text-[10px] text-[#A39BBF]">Size · {Math.round(selectedImageLayer.scale*100)}%<input type="range" min="0.05" max="1" step=".01" value={selectedImageLayer.scale} onChange={event=>updateSelectedImageLayer({scale:Number(event.target.value)})} className="mt-2 w-full accent-violet-500"/></label><div className="grid grid-cols-2 gap-2"><label className="block text-[10px] text-[#A39BBF]">Horizontal · {Math.round(selectedImageLayer.x*100)}%<input type="range" min="0" max="1" step=".01" value={selectedImageLayer.x} onChange={event=>updateSelectedImageLayer({x:Number(event.target.value)})} className="mt-2 w-full accent-violet-500"/></label><label className="block text-[10px] text-[#A39BBF]">Vertical · {Math.round(selectedImageLayer.y*100)}%<input type="range" min="0" max="1" step=".01" value={selectedImageLayer.y} onChange={event=>updateSelectedImageLayer({y:Number(event.target.value)})} className="mt-2 w-full accent-violet-500"/></label></div><div className="grid grid-cols-2 gap-2"><label className="block text-[10px] text-[#A39BBF]">Rotation · {selectedImageLayer.rotation}°<input type="range" min="-180" max="180" step="5" value={selectedImageLayer.rotation} onChange={event=>updateSelectedImageLayer({rotation:Number(event.target.value)})} className="mt-2 w-full accent-violet-500"/></label><label className="block text-[10px] text-[#A39BBF]">Opacity · {Math.round(selectedImageLayer.opacity*100)}%<input type="range" min="0" max="1" step=".05" value={selectedImageLayer.opacity} onChange={event=>updateSelectedImageLayer({opacity:Number(event.target.value)})} className="mt-2 w-full accent-violet-500"/></label></div><div className="space-y-2 rounded-lg border border-[#34265E] bg-[#080611] p-2"><div className="flex items-center justify-between gap-2"><span className="text-[10px] font-semibold text-violet-200">Sticker motion · {selectedImageLayer.keyframes.length}/100</span><button type="button" onClick={addImageKeyframe} disabled={selectedImageLayer.keyframes.length>=100} className="rounded-md border border-violet-400/40 px-2 py-1 text-[9px] font-semibold text-violet-100 disabled:opacity-40">Add at {previewGlobalTime.toFixed(1)}s</button></div>{selectedImageLayer.keyframes.map(frame=><div key={frame.time} className="flex items-center justify-between gap-2 text-[9px]"><button type="button" onClick={()=>seekToGlobalTime(frame.time)} className="min-w-0 flex-1 text-left text-[#C7B5FF]">{frame.time.toFixed(1)}s · {Math.round(frame.opacity*100)}% · {frame.scale.toFixed(2)}x · {frame.rotation}°</button><button type="button" onClick={()=>updateSelectedImageLayer({keyframes:selectedImageLayer.keyframes.filter(item=>item.time!==frame.time)})} className="rounded px-2 py-1 text-rose-300">Remove</button></div>)}{!selectedImageLayer.keyframes.length && <p className="text-[9px] text-[#827B9C]">Move the playhead, adjust the sticker's position, size, rotation or opacity, then save a keyframe.</p>}</div></> : <p className="rounded-lg border border-dashed border-[#44376F] px-3 py-4 text-center text-[10px] text-[#827B9C]">Import your own transparent PNG, sticker or image to add it as a timed layer.</p>}
              <p className="text-[9px] text-[#827B9C]">Up to 20 image layers per project, 10 MB each and 40 MB combined. Images stay inside your local Studio draft until you export.</p>
            </div>
            <div className="space-y-3 rounded-xl border border-[#292244] bg-[#100C20] p-3">
              <div className="flex items-center justify-between"><h2 className="text-xs font-bold">Subtitles</h2><button type="button" onClick={addSubtitleSegment} disabled={subtitleSegments.length >= 30} className="rounded-lg border border-violet-400/30 px-2 py-1.5 text-[10px] font-semibold text-violet-100 disabled:opacity-40"><Plus size={12} className="mr-1 inline"/>Add segment</button></div>
              {subtitleSegments.map((segment, index) => <div key={segment.id} className={`flex items-center gap-2 rounded-lg border px-2 py-1.5 ${selectedSubtitleSegmentId === segment.id ? 'border-violet-400/50 bg-violet-500/10' : 'border-[#292244] bg-[#080611]'}`}><button type="button" onClick={() => setSelectedSubtitleSegmentId(segment.id)} className="min-w-0 flex-1 truncate text-left text-[10px]">{index + 1}. {segment.text || 'Untitled subtitle'}</button><button type="button" onClick={() => { const remaining = subtitleSegments.filter(item => item.id !== segment.id); setSubtitleSegments(remaining); if (selectedSubtitleSegmentId === segment.id) setSelectedSubtitleSegmentId(remaining[0]?.id || null); }} aria-label="Delete subtitle segment" className="rounded p-1 text-rose-300"><Trash2 size={12}/></button></div>)}
              {selectedSubtitleSegment ? <><textarea value={selectedSubtitleSegment.text} maxLength={180} rows={2} onChange={event => updateSelectedSubtitle({ text: event.target.value })} className="w-full rounded-lg border border-[#34265E] bg-[#080611] px-3 py-2 text-xs text-white" aria-label="Subtitle text"/><div className="grid grid-cols-2 gap-2"><label className="block text-[10px] text-[#A39BBF]">Start (s)<input type="number" min="0" max={totalDuration} step=".1" value={selectedSubtitleSegment.start} onChange={event => updateSelectedSubtitle({ start: Number(event.target.value) })} className="mt-1 w-full rounded-lg border border-[#34265E] bg-[#080611] px-2 py-2 text-xs text-white"/></label><label className="block text-[10px] text-[#A39BBF]">End (s)<input type="number" min="0" max={totalDuration} step=".1" value={selectedSubtitleSegment.end} onChange={event => updateSelectedSubtitle({ end: Number(event.target.value) })} className="mt-1 w-full rounded-lg border border-[#34265E] bg-[#080611] px-2 py-2 text-xs text-white"/></label></div></> : <p className="text-[10px] text-[#827B9C]">Add timed subtitle segments to display and export captions with your video.</p>}
              <p className="text-[9px] text-[#827B9C]">Subtitles are separate from your post caption. Up to 30 timed segments are saved in your Studio draft and burned into export.</p>
            </div>
            <div className="space-y-2"><label className="block text-xs font-bold">Post caption</label><textarea value={caption} onChange={event=>setCaption(event.target.value.slice(0,500))} maxLength={500} rows={3} placeholder="Write a caption for your finished video…" className="w-full resize-y rounded-xl border border-[#34265E] bg-[#100C20] p-3 text-xs text-white outline-none focus:border-violet-400"/><div className="text-right text-[10px] text-[#827B9C]">{caption.length}/500</div></div>
            <div className="mt-auto space-y-2 border-t border-[#292244] pt-3"><p aria-live="polite" className="min-h-4 text-[10px] text-[#A39BBF]">{message || 'Your edits are saved automatically on this device.'}</p><button type="button" onClick={handlePublish} disabled={!exportBlob || publishing || rendering} className="w-full rounded-xl bg-gradient-to-r from-[#8A3FFC] via-[#4B10F2] to-[#1600A3] px-4 py-3 text-xs font-black disabled:opacity-50">{publishing?'Publishing…':<><Check size={14} className="mr-2 inline"/>Publish to NEXORA</>}</button><p className="text-center text-[9px] text-[#827B9C]">Export first, then publish your rendered video.</p></div>
          </aside>
        </main>
      </motion.div>
    </AnimatePresence>
  );
}
