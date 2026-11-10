import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowDown, ArrowLeft, ArrowUp, Check, Clapperboard, Film, Mic, Music2, Pause, Play, Plus, Scissors, Trash2, Type, Upload, Volume2, X } from 'lucide-react';

type StudioClip = { id: string; name: string; blob: Blob; start: number; end: number; duration: number; volume: number };
type StudioProject = { clips: StudioClip[]; soundtrack: Blob | null; voiceover: Blob | null; caption: string; overlay: string; overlayColor: string; aspectRatio: 'portrait' | 'square' | 'landscape'; transition: 'cut' | 'fade'; soundtrackVolume: number; voiceoverVolume: number; voiceoverStart: number; overlayStart: number; overlayEnd: number; overlayPosition: 'top' | 'center' | 'bottom'; updatedAt: number };
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
  const [caption, setCaption] = useState('');
  const [overlay, setOverlay] = useState('');
  const [overlayColor, setOverlayColor] = useState('#FFFFFF');
  const [aspectRatio, setAspectRatio] = useState<'portrait' | 'square' | 'landscape'>('portrait');
  const [transition, setTransition] = useState<'cut' | 'fade'>('cut');
  const [soundtrackVolume, setSoundtrackVolume] = useState(0.8);
  const [overlayStart, setOverlayStart] = useState(0);
  const [overlayEnd, setOverlayEnd] = useState(0);
  const [overlayPosition, setOverlayPosition] = useState<'top' | 'center' | 'bottom'>('bottom');
  const [playing, setPlaying] = useState(false);
  const [rendering, setRendering] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [message, setMessage] = useState('');
  const [ready, setReady] = useState(false);
  const [muted, setMuted] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const projectUrls = useRef<string[]>([]);
  const voiceoverRecorderRef = useRef<MediaRecorder | null>(null);
  const voiceoverStreamRef = useRef<MediaStream | null>(null);
  const voiceoverChunksRef = useRef<Blob[]>([]);
  const selectedClip = clips.find(clip => clip.id === selectedId) || clips[0] || null;
  const totalDuration = useMemo(() => clips.reduce((sum, clip) => sum + Math.max(0, clip.end - clip.start), 0), [clips]);

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
      setAspectRatio(project.aspectRatio || 'portrait');
      setTransition(project.transition || 'cut');
      setSoundtrackVolume(typeof project.soundtrackVolume === 'number' ? project.soundtrackVolume : 0.8);
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
      void saveProject({ clips, soundtrack, voiceover, caption, overlay, overlayColor, aspectRatio, transition, soundtrackVolume, voiceoverVolume, voiceoverStart, overlayStart, overlayEnd, overlayPosition, updatedAt: Date.now() }, `active-project-v1:${currentUser.id}`)
        .then(() => setMessage('Draft saved on this device'))
        .catch(() => setMessage('This draft could not be saved on this device.'));
    }, 500);
    return () => window.clearTimeout(timer);
  }, [ready, clips, soundtrack, voiceover, caption, overlay, overlayColor, aspectRatio, transition, soundtrackVolume, voiceoverVolume, voiceoverStart, overlayStart, overlayEnd, overlayPosition, currentUser.id]);

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
    if (playing) { video.pause(); setPlaying(false); return; }
    if (video.currentTime < selectedClip.start || video.currentTime >= selectedClip.end) video.currentTime = selectedClip.start;
    try { await video.play(); setPlaying(true); } catch { setMessage('Playback could not start. Tap play again.'); }
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
        voiceoverElement.src = voiceoverObjectUrl = URL.createObjectURL(voiceover);
        voiceoverGain = audioContext.createGain();
        voiceoverGain.gain.value = voiceoverVolume;
        audioContext.createMediaElementSource(voiceoverElement).connect(voiceoverGain);
        voiceoverGain.connect(mixedAudio);
      }
      mixedAudio.stream.getAudioTracks().forEach(track => stream.addTrack(track));
    }
    const recorder = new MediaRecorder(stream, { mimeType });
    const chunks: Blob[] = [];
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
      if (overlay.trim() && elapsed >= overlayStart && elapsed <= (overlayEnd > overlayStart ? overlayEnd : totalDuration)) {
        context.font = '700 54px system-ui, sans-serif';
        context.textAlign = 'center';
        context.textBaseline = overlayPosition === 'top' ? 'top' : overlayPosition === 'center' ? 'middle' : 'bottom';
        context.lineWidth = 8;
        context.strokeStyle = 'rgba(5,9,20,.8)';
        context.fillStyle = overlayColor;
        const words = overlay.trim().split(/\s+/);
        const lines: string[] = [];
        let line = '';
        for (const word of words) {
          const candidate = line ? `${line} ${word}` : word;
          if (line && context.measureText(candidate).width > canvas.width - 120) { lines.push(line); line = word; }
          else line = candidate;
        }
        if (line) lines.push(line);
        lines.slice(-3).forEach((text, index, all) => {
          const base = overlayPosition === 'top' ? 90 : overlayPosition === 'center' ? canvas.height / 2 : canvas.height - 70;
          const y = base + (index - (all.length - 1) / 2) * 64;
          context.strokeText(text, canvas.width / 2, y);
          context.fillText(text, canvas.width / 2, y);
        });
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
      recorder.start(250);
      draw();
      if (audioElement) await audioElement.play().catch(() => undefined);
      if (voiceoverElement) window.setTimeout(() => { void voiceoverElement?.play().catch(() => undefined); }, Math.max(0, voiceoverStart * 1000));
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
        const clipElapsedStart = elapsed;
        await new Promise<void>(resolve => {
          const check = () => {
            elapsed = clipElapsedStart + Math.max(0, preview.currentTime - clip.start);
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
      if (audioElement) audioElement.pause();
      if (audioObjectUrl) URL.revokeObjectURL(audioObjectUrl);
      if (voiceoverElement) voiceoverElement.pause();
      if (voiceoverObjectUrl) URL.revokeObjectURL(voiceoverObjectUrl);
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
          <div className="flex items-center gap-2"><span className="hidden text-[10px] text-[#8E88A7] sm:inline">{currentUser.name || currentUser.username || 'Creator'} · {Math.round(totalDuration)}s</span><button type="button" onClick={handleExport} disabled={rendering || !clips.length} className="rounded-xl bg-gradient-to-r from-[#8A3FFC] via-[#4B10F2] to-[#1600A3] px-4 py-2 text-xs font-bold disabled:opacity-50">{rendering ? 'Rendering…' : 'Export video'}</button></div>
        </header>
        <main className="grid min-h-0 flex-1 grid-rows-[minmax(220px,1fr)_auto] overflow-y-auto lg:grid-cols-[minmax(0,1fr)_340px] lg:grid-rows-1">
          <section className="flex min-h-[260px] flex-col items-center justify-center gap-3 border-b border-[#292244] bg-[radial-gradient(ellipse_at_top,rgba(75,16,242,.16),transparent_65%)] p-4 lg:border-b-0 lg:border-r">
            <div className={`relative flex ${aspectRatio === 'portrait' ? 'aspect-[9/16] max-w-sm' : aspectRatio === 'square' ? 'aspect-square max-w-2xl' : 'aspect-video max-w-5xl'} w-full items-center justify-center overflow-hidden rounded-2xl border border-[#34265E] bg-black shadow-[0_20px_80px_rgba(75,16,242,.14)]`}>
              {selectedClip ? <video ref={videoRef} key={selectedClip.id} src={previewUrl} className="h-full w-full object-contain" playsInline controls muted={muted} onLoadedMetadata={event => { event.currentTarget.currentTime = selectedClip.start; }} onTimeUpdate={event => { if (event.currentTarget.currentTime >= selectedClip.end) { event.currentTarget.pause(); setPlaying(false); } }} onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)}/> : <div className="px-6 text-center"><Clapperboard size={42} className="mx-auto mb-3 text-violet-300"/><p className="font-semibold">Your creative timeline starts here</p><p className="mt-1 text-xs text-[#8E88A7]">Add video clips to begin editing.</p></div>}
              {overlay.trim() && <div className="pointer-events-none absolute inset-x-5 bottom-8 text-center text-2xl font-black drop-shadow-[0_2px_8px_rgba(0,0,0,.9)]" style={{color:overlayColor}}>{overlay}</div>}
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
              <div className="space-y-2">
                {clips.map((clip,index) => <div key={clip.id} className={`rounded-xl border p-3 ${selectedId===clip.id?'border-violet-400/60 bg-violet-500/10':'border-[#292244] bg-[#100C20]'}`}>
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
              {soundtrack && <label className="block text-[10px] text-[#A39BBF]">Music volume · {Math.round(soundtrackVolume * 100)}%<input type="range" min="0" max="1" step=".05" value={soundtrackVolume} onChange={event => setSoundtrackVolume(Number(event.target.value))} className="mt-2 w-full accent-violet-500"/></label>}
              <p className="text-[10px] leading-relaxed text-[#827B9C]">Music and source audio are mixed into your exported video.</p>
            </div>
            <div className="space-y-3 rounded-xl border border-[#292244] bg-[#100C20] p-3">
              <div className="flex items-center justify-between gap-2"><div className="flex items-center gap-2"><Mic size={15} className="text-violet-300"/><h2 className="text-xs font-bold">Voiceover</h2></div>{recordingVoiceover && <span className="text-[10px] font-semibold text-rose-300">Recording</span>}</div>
              <button type="button" onClick={recordingVoiceover ? stopVoiceover : startVoiceover} className={`w-full rounded-lg border px-3 py-2 text-xs font-semibold ${recordingVoiceover?'border-rose-400/40 bg-rose-500/10 text-rose-200':'border-[#44376F] text-[#D7CCF7]'}`}>{recordingVoiceover?'Stop recording':'Record voiceover'}</button>
              {voiceover && <div className="flex items-center justify-between gap-2 text-[10px] text-emerald-300"><span className="truncate">Voiceover ready · {(voiceover.size/1024).toFixed(0)} KB</span><button type="button" onClick={()=>setVoiceover(null)} className="shrink-0 text-rose-300">Remove</button></div>}
              {voiceover && <><label className="block text-[10px] text-[#A39BBF]">Voice volume · {Math.round(voiceoverVolume*100)}%<input type="range" min="0" max="1" step=".05" value={voiceoverVolume} onChange={event=>setVoiceoverVolume(Number(event.target.value))} className="mt-2 w-full accent-violet-500"/></label><label className="block text-[10px] text-[#A39BBF]">Start voiceover at (seconds)<input type="number" min="0" max={Math.max(0,totalDuration)} step=".1" value={voiceoverStart} onChange={event=>setVoiceoverStart(Math.max(0,Math.min(totalDuration,Number(event.target.value)||0)))} className="mt-1 w-full rounded-lg border border-[#34265E] bg-[#080611] px-2 py-2 text-xs text-white"/></label></>}
              <p className="text-[10px] leading-relaxed text-[#827B9C]">Record narration with your microphone. It is saved as a separate track and mixed during export.</p>
            </div>
            <div className="space-y-3 rounded-xl border border-[#292244] bg-[#100C20] p-3">
              <h2 className="text-xs font-bold">Video format</h2>
              <label className="block text-[10px] text-[#A39BBF]">Canvas ratio<select value={aspectRatio} onChange={event => setAspectRatio(event.target.value as typeof aspectRatio)} className="mt-1 w-full rounded-lg border border-[#34265E] bg-[#080611] px-3 py-2 text-xs text-white"><option value="portrait">9:16 · Reels and vertical video</option><option value="square">1:1 · Square posts</option><option value="landscape">16:9 · Landscape video</option></select></label>
              <label className="block text-[10px] text-[#A39BBF]">Scene transition<select value={transition} onChange={event => setTransition(event.target.value as typeof transition)} className="mt-1 w-full rounded-lg border border-[#34265E] bg-[#080611] px-3 py-2 text-xs text-white"><option value="cut">Clean cut</option><option value="fade">Fade through black</option></select></label>
            </div>
            <div className="space-y-3 rounded-xl border border-[#292244] bg-[#100C20] p-3">
              <div className="flex items-center gap-2"><Type size={15} className="text-violet-300"/><h2 className="text-xs font-bold">Text overlay</h2></div>
              <input value={overlay} onChange={event=>setOverlay(event.target.value.slice(0,120))} maxLength={120} placeholder="Add a title or on-screen text" className="w-full rounded-lg border border-[#34265E] bg-[#080611] px-3 py-2 text-xs text-white outline-none focus:border-violet-400"/>
              <div className="flex items-center justify-between text-[10px] text-[#8E88A7]"><span>Text colour</span><input aria-label="Overlay text colour" type="color" value={overlayColor} onChange={event=>setOverlayColor(event.target.value)} className="h-7 w-10 rounded border-0 bg-transparent"/></div>
              <label className="block text-[10px] text-[#A39BBF]">Position<select value={overlayPosition} onChange={event=>setOverlayPosition(event.target.value as typeof overlayPosition)} className="mt-1 w-full rounded-lg border border-[#34265E] bg-[#080611] px-3 py-2 text-xs text-white"><option value="top">Top</option><option value="center">Center</option><option value="bottom">Bottom</option></select></label>
              <div className="grid grid-cols-2 gap-2"><label className="block text-[10px] text-[#A39BBF]">Show from (s)<input type="number" min="0" max={Math.max(0,totalDuration)} step=".1" value={overlayStart} onChange={event=>setOverlayStart(Math.max(0,Math.min(totalDuration,Number(event.target.value)||0)))} className="mt-1 w-full rounded-lg border border-[#34265E] bg-[#080611] px-2 py-2 text-xs text-white"/></label><label className="block text-[10px] text-[#A39BBF]">Hide after (s)<input type="number" min="0" max={Math.max(0,totalDuration)} step=".1" value={overlayEnd} onChange={event=>setOverlayEnd(Math.max(0,Math.min(totalDuration,Number(event.target.value)||0)))} className="mt-1 w-full rounded-lg border border-[#34265E] bg-[#080611] px-2 py-2 text-xs text-white"/></label></div>
              <p className="text-[9px] text-[#827B9C]">Set the end to 0 to keep the title visible until the video ends.</p>
            </div>
            <div className="space-y-2"><label className="block text-xs font-bold">Post caption</label><textarea value={caption} onChange={event=>setCaption(event.target.value.slice(0,500))} maxLength={500} rows={3} placeholder="Write a caption for your finished video…" className="w-full resize-y rounded-xl border border-[#34265E] bg-[#100C20] p-3 text-xs text-white outline-none focus:border-violet-400"/><div className="text-right text-[10px] text-[#827B9C]">{caption.length}/500</div></div>
            <div className="mt-auto space-y-2 border-t border-[#292244] pt-3"><p aria-live="polite" className="min-h-4 text-[10px] text-[#A39BBF]">{message || 'Your edits are saved automatically on this device.'}</p><button type="button" onClick={handlePublish} disabled={!exportBlob || publishing || rendering} className="w-full rounded-xl bg-gradient-to-r from-[#8A3FFC] via-[#4B10F2] to-[#1600A3] px-4 py-3 text-xs font-black disabled:opacity-50">{publishing?'Publishing…':<><Check size={14} className="mr-2 inline"/>Publish to NEXORA</>}</button><p className="text-center text-[9px] text-[#827B9C]">Export first, then publish your rendered video.</p></div>
          </aside>
        </main>
      </motion.div>
    </AnimatePresence>
  );
}
