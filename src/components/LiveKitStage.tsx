import React, { useEffect, useRef, useState } from 'react';
import { getLiveKitToken } from '../services/liveSessionsService';

declare global {
  interface Window { LivekitClient?: any; }
}

interface LiveKitStageProps {
  sessionId: string;
  connectionId: string;
  isHost: boolean;
}

export default function LiveKitStage({ sessionId, connectionId, isHost }: LiveKitStageProps) {
  const remoteRef = useRef<HTMLDivElement | null>(null);
  const localRef = useRef<HTMLVideoElement | null>(null);
  const roomRef = useRef<any>(null);
  const [status, setStatus] = useState('Connecting to live video…');
  const [error, setError] = useState('');
  const [cameraOn, setCameraOn] = useState(isHost);
  const [micOn, setMicOn] = useState(isHost);

  useEffect(() => {
    let disposed = false;
    let room: any;
    const attachLocalVideo = () => {
      const publications = room?.localParticipant?.videoTrackPublications;
      const publication = publications ? Array.from(publications.values()).find((item: any) => item.track) as any : null;
      if (publication?.track && localRef.current) {
        localRef.current.srcObject = null;
        publication.track.attach(localRef.current);
      }
    };
    const connect = async () => {
      try {
        const sdk = window.LivekitClient;
        if (!sdk?.Room) throw new Error('The LiveKit video SDK could not be loaded. Refresh and try again.');
        const credentials = await getLiveKitToken(sessionId, connectionId);
        if (disposed) return;
        room = new sdk.Room({ adaptiveStream: true, dynacast: true });
        roomRef.current = room;
        room.on(sdk.RoomEvent.TrackSubscribed, (track: any) => {
          if (!remoteRef.current) return;
          const element = track.attach();
          element.autoplay = true;
          element.playsInline = true;
          element.className = track.kind === 'video'
            ? 'h-full w-full rounded-xl bg-black object-contain'
            : 'hidden';
          remoteRef.current.appendChild(element);
          if (track.kind === 'audio') void element.play().catch(() => undefined);
        });
        room.on(sdk.RoomEvent.TrackUnsubscribed, (track: any) => {
          track.detach().forEach((element: HTMLElement) => element.remove());
        });
        room.on(sdk.RoomEvent.Disconnected, () => {
          if (!disposed) setStatus('Video connection ended');
        });
        await room.connect(credentials.wsUrl, credentials.token, { autoSubscribe: true });
        if (disposed) { await room.disconnect(); return; }
        setStatus(isHost ? 'You are broadcasting' : 'Watching live');
        if (isHost) {
          await room.localParticipant.setCameraEnabled(true);
          attachLocalVideo();
          await room.localParticipant.setMicrophoneEnabled(true);
          setCameraOn(true);
          setMicOn(true);
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
  }, [sessionId, connectionId, isHost]);

  const toggleCamera = async () => {
    const room = roomRef.current;
    if (!room || !isHost) return;
    try {
      await room.localParticipant.setCameraEnabled(!cameraOn);
      const publications = room.localParticipant.videoTrackPublications;
      const publication = publications ? Array.from(publications.values()).find((item: any) => item.track) as any : null;
      if (publication?.track && localRef.current) publication.track.attach(localRef.current);
      setCameraOn(value => !value);
    } catch { setError('Camera permission or device access was denied.'); }
  };
  const toggleMic = async () => {
    const room = roomRef.current;
    if (!room || !isHost) return;
    try {
      await room.localParticipant.setMicrophoneEnabled(!micOn);
      setMicOn(value => !value);
    } catch { setError('Microphone permission or device access was denied.'); }
  };

  return (
    <div className="mt-5 w-full max-w-2xl space-y-3">
      <div className="relative min-h-56 overflow-hidden rounded-2xl border border-violet-300/20 bg-black">
        <div ref={remoteRef} className="grid min-h-56 grid-cols-1 gap-2 p-2" />
        {isHost && <video ref={localRef} autoPlay muted playsInline className="absolute bottom-3 right-3 aspect-video w-32 rounded-xl border border-white/30 bg-black object-cover shadow-xl" />}
        <div className="absolute left-3 top-3 rounded-full bg-black/70 px-3 py-1 text-[10px] font-semibold text-white">{status}</div>
        {error && <div role="alert" className="absolute inset-x-3 bottom-3 rounded-xl border border-rose-400/30 bg-rose-950/90 p-3 text-left text-xs text-rose-100">{error}</div>}
      </div>
      {isHost && <div className="flex justify-center gap-3">
        <button type="button" onClick={() => void toggleCamera()} className="rounded-full border border-white/15 bg-white/10 px-4 py-2 text-xs font-bold">{cameraOn ? 'Turn camera off' : 'Turn camera on'}</button>
        <button type="button" onClick={() => void toggleMic()} className="rounded-full border border-white/15 bg-white/10 px-4 py-2 text-xs font-bold">{micOn ? 'Mute microphone' : 'Unmute microphone'}</button>
      </div>}
    </div>
  );
}
