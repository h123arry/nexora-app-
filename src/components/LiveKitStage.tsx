import React, { useCallback, useEffect, useRef, useState } from 'react';
import { getLiveKitToken } from '../services/liveSessionsService';

declare global {
  interface Window { LivekitClient?: any; }
}

interface LiveKitStageProps {
  sessionId: string;
  connectionId: string;
  isHost: boolean;
  isGuest: boolean;
}

export default function LiveKitStage({ sessionId, connectionId, isHost, isGuest }: LiveKitStageProps) {
  const canPublish = isHost || isGuest;
  const remoteRef = useRef<HTMLDivElement | null>(null);
  const localRef = useRef<HTMLVideoElement | null>(null);
  const roomRef = useRef<any>(null);
  const [status, setStatus] = useState('Connecting to live video…');
  const [error, setError] = useState('');
  const [cameraOn, setCameraOn] = useState(false);
  const [micOn, setMicOn] = useState(false);
  const [audioBlocked, setAudioBlocked] = useState(false);
  const [hasRemoteVideo, setHasRemoteVideo] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [busy, setBusy] = useState(false);

  const attachLocalVideo = useCallback((room: any) => {
    const publications = room?.localParticipant?.videoTrackPublications;
    const publication = publications
      ? Array.from(publications.values()).find((item: any) => item.track) as any
      : null;
    if (publication?.track && localRef.current) {
      publication.track.detach?.(localRef.current);
      publication.track.attach(localRef.current);
    }
  }, []);

  useEffect(() => {
    let disposed = false;
    let room: any;
    const connect = async () => {
      setStatus('Connecting to live video…');
      setError('');
      setCameraOn(false);
      setMicOn(false);
      setHasRemoteVideo(false);
      try {
        const sdk = window.LivekitClient;
        if (!sdk?.Room || !sdk?.RoomEvent) {
          throw new Error('The LiveKit video SDK could not be loaded. Check your connection and retry.');
        }
        const credentials = await getLiveKitToken(sessionId, connectionId);
        if (disposed) return;

        room = new sdk.Room({
          adaptiveStream: true,
          dynacast: true,
          stopLocalTrackOnUnpublish: true,
        });
        roomRef.current = room;

        room.on(sdk.RoomEvent.TrackSubscribed, (track: any) => {
          if (disposed || !remoteRef.current) return;
          const element = track.attach();
          element.autoplay = true;
          element.playsInline = true;
          element.className = track.kind === 'video'
            ? 'h-full w-full rounded-xl bg-black object-contain'
            : 'hidden';
          remoteRef.current.appendChild(element);
          if (track.kind === 'video') setHasRemoteVideo(true);
          if (track.kind === 'audio') {
            void element.play().catch(() => {
              if (!disposed) setAudioBlocked(true);
            });
          }
        });

        room.on(sdk.RoomEvent.TrackUnsubscribed, (track: any) => {
          track.detach().forEach((element: HTMLElement) => element.remove());
          if (track.kind === 'video' && !disposed) setHasRemoteVideo(false);
        });

        room.on(sdk.RoomEvent.LocalTrackPublished, () => attachLocalVideo(room));
        room.on(sdk.RoomEvent.LocalTrackUnpublished, (publication: any) => {
          if (publication?.track && localRef.current) {
            publication.track.detach(localRef.current);
          }
        });

        room.on(sdk.RoomEvent.Reconnecting, () => {
          if (!disposed) setStatus('Connection interrupted. Reconnecting…');
        });
        room.on(sdk.RoomEvent.Reconnected, () => {
          if (!disposed) setStatus(isHost ? 'You are broadcasting' : isGuest ? 'You are on stage' : 'Watching live');
        });
        room.on(sdk.RoomEvent.Disconnected, () => {
          if (!disposed) setStatus('Video connection ended');
        });
        room.on(sdk.RoomEvent.AudioPlaybackStatusChanged, () => {
          if (!disposed) setAudioBlocked(!room.canPlaybackAudio);
        });
        room.on(sdk.RoomEvent.MediaDevicesError, (deviceError: Error) => {
          if (!disposed) setError(deviceError?.message || 'A camera or microphone device could not be opened.');
        });

        await room.connect(credentials.wsUrl, credentials.token, { autoSubscribe: true });
        if (disposed) {
          await room.disconnect();
          return;
        }
        setStatus(isHost ? 'You are broadcasting' : 'Watching live');

        if (canPublish) {
          // Camera and microphone are requested independently so one denied
          // permission does not prevent the other media track from starting.
          try {
            await room.localParticipant.setCameraEnabled(true);
            attachLocalVideo(room);
            setCameraOn(true);
          } catch {
            if (!disposed) setError('Camera access was denied. You can retry it with the camera control.');
          }
          try {
            await room.localParticipant.setMicrophoneEnabled(true);
            setMicOn(true);
          } catch {
            if (!disposed) setError('Microphone access was denied. You can retry it with the microphone control.');
          }
        }
      } catch (cause: any) {
        if (!disposed) {
          setError(cause?.message || 'Could not connect to NEXORA Live video.');
          setStatus('Video unavailable');
        }
      }
    };

    void connect();
    return () => {
      disposed = true;
      roomRef.current = null;
      if (room) void room.disconnect();
      if (localRef.current) localRef.current.srcObject = null;
      if (remoteRef.current) remoteRef.current.replaceChildren();
    };
  }, [sessionId, connectionId, isHost, isGuest, canPublish, attempt, attachLocalVideo]);

  const toggleCamera = async () => {
    const room = roomRef.current;
    if (!room || !canPublish || busy) return;
    setBusy(true);
    try {
      const next = !cameraOn;
      await room.localParticipant.setCameraEnabled(next);
      if (next) attachLocalVideo(room);
      else if (localRef.current) localRef.current.srcObject = null;
      setCameraOn(next);
      setError('');
    } catch {
      setError('Camera permission or device access was denied.');
    } finally {
      setBusy(false);
    }
  };

  const toggleMic = async () => {
    const room = roomRef.current;
    if (!room || !isHost || busy) return;
    setBusy(true);
    try {
      const next = !micOn;
      await room.localParticipant.setMicrophoneEnabled(next);
      setMicOn(next);
      setError('');
    } catch {
      setError('Microphone permission or device access was denied.');
    } finally {
      setBusy(false);
    }
  };

  const enableAudio = async () => {
    const room = roomRef.current;
    if (!room) return;
    try {
      await room.startAudio();
      setAudioBlocked(false);
    } catch {
      setError('Audio playback is still blocked. Check your device volume and browser permissions.');
    }
  };

  return (
    <div className="mt-5 w-full max-w-2xl space-y-3">
      <div className="relative min-h-56 overflow-hidden rounded-2xl border border-violet-300/20 bg-black">
        <div ref={remoteRef} className="grid min-h-56 grid-cols-1 gap-2 p-2" />
        {canPublish && (
          <video
            ref={localRef}
            autoPlay
            muted
            playsInline
            aria-label={isHost ? 'Your live camera preview' : 'Your guest camera preview'}
            className="absolute bottom-3 right-3 aspect-video w-32 rounded-xl border border-white/30 bg-black object-cover shadow-xl"
          />
        )}
        <div className="absolute left-3 top-3 rounded-full bg-black/70 px-3 py-1 text-[10px] font-semibold text-white">
          {status}
        </div>
        {error && (
          <div role="alert" className="absolute inset-x-3 bottom-3 rounded-xl border border-rose-400/30 bg-rose-950/90 p-3 text-left text-xs text-rose-100">
            {error}
          </div>
        )}
        {!canPublish && status === 'Watching live' && !hasRemoteVideo && (
          <div className="pointer-events-none absolute inset-0 grid place-items-center text-xs text-white/60">
            Waiting for the creator's video…
          </div>
        )}
      </div>

      {audioBlocked && (
        <button type="button" onClick={() => void enableAudio()} className="mx-auto block rounded-full bg-violet-600 px-4 py-2 text-xs font-bold">
          Tap to enable live audio
        </button>
      )}

      {isHost && (
        <div className="flex flex-wrap justify-center gap-3">
          <button type="button" disabled={busy || status === 'Video unavailable'} onClick={() => void toggleCamera()} className="rounded-full border border-white/15 bg-white/10 px-4 py-2 text-xs font-bold disabled:opacity-50">
            {cameraOn ? 'Turn camera off' : 'Turn camera on'}
          </button>
          <button type="button" disabled={busy || status === 'Video unavailable'} onClick={() => void toggleMic()} className="rounded-full border border-white/15 bg-white/10 px-4 py-2 text-xs font-bold disabled:opacity-50">
            {micOn ? 'Mute microphone' : 'Unmute microphone'}
          </button>
        </div>
      )}

      {(status === 'Video unavailable' || status === 'Video connection ended') && (
        <button type="button" disabled={busy} onClick={() => setAttempt(value => value + 1)} className="mx-auto block rounded-full border border-violet-300/30 bg-violet-500/15 px-4 py-2 text-xs font-bold text-violet-100 disabled:opacity-50">
          Retry video connection
        </button>
      )}
    </div>
  );
}
