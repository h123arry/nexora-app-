import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AlertTriangle, Check, Loader2, Mic, MicOff, PhoneOff, RefreshCw, Video, VideoOff, X } from 'lucide-react';
import { endDirectCall, getDirectCallToken, respondToDirectCall, watchDirectCall, type DirectCall } from '../services/directCallService';

declare global {
  interface Window { LivekitClient?: any; }
}

interface CallScreenProps {
  isOpen: boolean;
  callId: string;
  type: 'voice' | 'video';
  partnerName: string;
  partnerAvatar?: string;
  incoming?: boolean;
  onClose: () => void;
}

function initials(name: string): string {
  return name.trim().split(/\s+/).filter(Boolean).slice(0, 2).map(part => part[0]).join('').toUpperCase() || 'N';
}

export default function CallScreen({
  isOpen, callId, type, partnerName, partnerAvatar, incoming = false, onClose,
}: CallScreenProps) {
  const [call, setCall] = useState<DirectCall | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [connected, setConnected] = useState(false);
  const [muted, setMuted] = useState(false);
  const [cameraOn, setCameraOn] = useState(type === 'video');
  const [busy, setBusy] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState('');
  const remoteRef = useRef<HTMLDivElement | null>(null);
  const localRef = useRef<HTMLVideoElement | null>(null);
  const roomRef = useRef<any>(null);
  const connectingRef = useRef(false);

  useEffect(() => {
    if (!isOpen || !callId) return;
    return watchDirectCall(callId, next => {
      setCall(next);
      if (!next || ['declined', 'missed', 'busy', 'ended', 'failed'].includes(next.status)) {
        if (roomRef.current) void roomRef.current.disconnect();
        roomRef.current = null;
        setConnected(false);
        onClose();
      }
    }, () => setError('Call status could not be updated. Check your connection.'));
  }, [isOpen, callId, onClose]);

  useEffect(() => {
    if (!call || call.status !== 'ringing' || !Number.isFinite(call.expiresAt)) return;
    const timeout = window.setTimeout(() => {
      void endDirectCall(callId).finally(() => onClose());
    }, Math.max(0, call.expiresAt - Date.now()));
    return () => window.clearTimeout(timeout);
  }, [call?.status, call?.expiresAt, callId, onClose]);

  const connectRoom = useCallback(async () => {
    if (connectingRef.current || roomRef.current || !callId) return;
    connectingRef.current = true;
    setConnecting(true);
    setError('');
    let room: any;
    try {
      const sdk = window.LivekitClient;
      if (!sdk?.Room || !sdk?.RoomEvent) throw new Error('The call service is unavailable. Please try again.');
      const credentials = await getDirectCallToken(callId);
      room = new sdk.Room({ adaptiveStream: true, dynacast: true, stopLocalTrackOnUnpublish: true });
      roomRef.current = room;

      room.on(sdk.RoomEvent.TrackSubscribed, (track: any) => {
        if (!remoteRef.current) return;
        const element = track.attach();
        element.autoplay = true;
        element.playsInline = true;
        element.className = track.kind === 'video' ? 'h-full w-full object-cover bg-black' : 'hidden';
        remoteRef.current.appendChild(element);
        if (track.kind === 'audio') void element.play().catch(() => setError('Tap your device volume or check audio playback permissions.'));
      });
      room.on(sdk.RoomEvent.TrackUnsubscribed, (track: any) => {
        track.detach().forEach((element: HTMLElement) => element.remove());
      });
      room.on(sdk.RoomEvent.Reconnecting, () => setError('Connection interrupted. Reconnecting…'));
      room.on(sdk.RoomEvent.Reconnected, () => setError(''));
      room.on(sdk.RoomEvent.Disconnected, () => {
        setConnected(false);
        if (roomRef.current === room) roomRef.current = null;
      });
      room.on(sdk.RoomEvent.MediaDevicesError, (cause: Error) => setError(cause?.message || 'A microphone or camera could not be opened.'));

      await room.connect(credentials.wsUrl, credentials.token, { autoSubscribe: true });
      await room.localParticipant.setMicrophoneEnabled(true);
      if (type === 'video') {
        try {
          await room.localParticipant.setCameraEnabled(true);
          setCameraOn(true);
        } catch {
          setCameraOn(false);
          setError('Camera access was denied. You can continue with voice or turn the camera on later.');
        }
      }
      setConnected(true);
      setElapsed(0);
    } catch (cause: any) {
      if (room) await room.disconnect().catch(() => undefined);
      if (roomRef.current === room) roomRef.current = null;
      setError(cause?.message || 'Could not connect this call. Please try again.');
      setConnected(false);
    } finally {
      connectingRef.current = false;
      setConnecting(false);
    }
  }, [callId, type]);

  useEffect(() => {
    if (isOpen && call?.status === 'accepted' && !roomRef.current) void connectRoom();
  }, [isOpen, call?.status, connectRoom]);

  useEffect(() => {
    if (!connected || type !== 'video' || !localRef.current || !roomRef.current) return;
    const publications = roomRef.current.localParticipant.videoTrackPublications;
    const publication = publications ? Array.from(publications.values()).find((item: any) => item.track) as any : null;
    if (publication?.track) publication.track.attach(localRef.current);
    return () => { if (publication?.track && localRef.current) publication.track.detach(localRef.current); };
  }, [connected, type]);

  useEffect(() => {
    if (!connected) return;
    const startedAt = call?.acceptedAt || Date.now();
    const update = () => setElapsed(Math.max(0, Math.floor((Date.now() - startedAt) / 1000)));
    update();
    const timer = window.setInterval(update, 1000);
    return () => window.clearInterval(timer);
  }, [connected, call?.acceptedAt]);

  useEffect(() => () => {
    if (roomRef.current) void roomRef.current.disconnect();
    roomRef.current = null;
  }, []);

  const closeCall = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await endDirectCall(callId);
      if (roomRef.current) await roomRef.current.disconnect();
      roomRef.current = null;
      setBusy(false);
      onClose();
    } catch {
      setError('The call could not be ended. Check your connection and try again.');
      setBusy(false);
    }
  };

  const answerCall = async () => {
    setBusy(true);
    setError('');
    try { await respondToDirectCall(callId, 'accept'); }
    catch (cause: any) { setError(cause?.message || 'Could not answer this call.'); }
    finally { setBusy(false); }
  };

  const toggleMic = async () => {
    const room = roomRef.current;
    if (!room || busy) return;
    setBusy(true);
    try {
      const next = !muted;
      await room.localParticipant.setMicrophoneEnabled(!next);
      setMuted(next);
    } catch { setError('Microphone access could not be changed.'); }
    finally { setBusy(false); }
  };

  const toggleCamera = async () => {
    const room = roomRef.current;
    if (!room || busy || type !== 'video') return;
    setBusy(true);
    try {
      const next = !cameraOn;
      await room.localParticipant.setCameraEnabled(next);
      setCameraOn(next);
    } catch { setError('Camera access could not be changed.'); }
    finally { setBusy(false); }
  };

  const switchCamera = async () => {
    const room = roomRef.current;
    if (!room || busy) return;
    setBusy(true);
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const cameras = devices.filter(device => device.kind === 'videoinput');
      if (cameras.length < 2) { setError('This device has only one available camera.'); return; }
      const current = room.localParticipant.getTrackPublication?.('camera')?.track?.mediaStreamTrack?.getSettings?.().deviceId;
      const index = cameras.findIndex(device => device.deviceId === current);
      await room.switchActiveDevice('videoinput', cameras[(index + 1) % cameras.length].deviceId);
      setError('');
    } catch { setError('Could not switch cameras on this device.'); }
    finally { setBusy(false); }
  };

  if (!isOpen) return null;
  const waiting = call?.status === 'ringing';
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60).toString().padStart(2, '0');
    return mins + ':' + (seconds % 60).toString().padStart(2, '0');
  };

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-[#050914] text-white" role="dialog" aria-modal="true" aria-label={type === 'video' ? 'Video call' : 'Voice call'}>
      <header className="flex h-16 shrink-0 items-center justify-between border-b border-white/10 px-5">
        <span className="text-sm font-semibold">{type === 'video' ? 'Video call' : 'Voice call'}</span>
        <button type="button" onClick={() => void closeCall()} aria-label="Close call" className="rounded-full p-2 text-zinc-300 hover:bg-white/10"><X className="h-5 w-5" /></button>
      </header>

      <main className="relative flex min-h-0 flex-1 flex-col items-center justify-center overflow-hidden">
        <div ref={remoteRef} className={type === 'video' && connected ? 'absolute inset-0 grid place-items-center bg-black' : 'hidden'} />
        {type === 'video' && connected && (
          <video ref={localRef} autoPlay muted playsInline aria-label="Your camera preview" className="absolute bottom-5 right-5 z-10 aspect-[3/4] w-28 rounded-2xl border border-white/30 bg-[#111] object-cover shadow-xl" />
        )}
        {!(type === 'video' && connected) && (
          <div className="flex flex-col items-center px-6 text-center">
            <div className="relative mb-6 flex h-28 w-28 items-center justify-center overflow-hidden rounded-full border border-violet-400/30 bg-violet-500/15 text-3xl font-bold text-violet-100 shadow-[0_0_70px_rgba(113,56,255,0.18)]">
              {partnerAvatar ? <img src={partnerAvatar} alt="" className="h-full w-full object-cover" /> : initials(partnerName)}
            </div>
            <h2 className="text-xl font-bold">{partnerName}</h2>
            <p className="mt-2 text-sm text-zinc-400">
              {connected ? formatTime(elapsed) : waiting ? (incoming ? (type === 'video' ? 'Incoming video call' : 'Incoming voice call') : 'Calling…') : connecting ? 'Connecting…' : call?.status === 'accepted' ? 'Reconnecting…' : 'Preparing call…'}
            </p>
          </div>
        )}
        {type === 'video' && connected && (
          <div className="absolute left-5 top-5 rounded-full bg-black/60 px-3 py-2 text-xs font-medium backdrop-blur">{formatTime(elapsed)}</div>
        )}

        {error && (
          <div role="alert" className="absolute bottom-5 left-5 right-5 flex items-start gap-2 rounded-xl border border-amber-300/20 bg-[#181326] p-3 text-left text-xs text-amber-100">
            <AlertTriangle className="h-4 w-4 shrink-0" /> {error}
          </div>
        )}
      </main>

      <footer className="shrink-0 border-t border-white/10 bg-[#080d1b] px-5 pb-[max(24px,env(safe-area-inset-bottom))] pt-5">
        {waiting && incoming ? (
          <div className="mx-auto flex max-w-sm items-center justify-center gap-8">
            <button type="button" disabled={busy} onClick={() => void closeCall()} className="flex h-16 w-16 flex-col items-center justify-center gap-1 rounded-full bg-rose-600 text-white disabled:opacity-50" aria-label="Decline call"><PhoneOff className="h-6 w-6" /><span className="text-[10px]">Decline</span></button>
            <button type="button" disabled={busy} onClick={() => void answerCall()} className="flex h-16 w-16 flex-col items-center justify-center gap-1 rounded-full bg-emerald-600 text-white disabled:opacity-50" aria-label="Answer call"><Check className="h-6 w-6" /><span className="text-[10px]">Answer</span></button>
          </div>
        ) : (
          <div className="mx-auto flex max-w-sm items-center justify-center gap-4">
            <button type="button" disabled={!connected || busy} onClick={() => void toggleMic()} className={'flex h-14 w-14 items-center justify-center rounded-full ' + (muted ? 'bg-white text-black' : 'bg-white/10 text-white')} aria-label={muted ? 'Turn microphone on' : 'Mute microphone'}>{muted ? <MicOff /> : <Mic />}</button>
            {type === 'video' && (
              <>
                <button type="button" disabled={!connected || busy} onClick={() => void toggleCamera()} className="flex h-14 w-14 items-center justify-center rounded-full bg-white/10 text-white disabled:opacity-40" aria-label={cameraOn ? 'Turn camera off' : 'Turn camera on'}>{cameraOn ? <Video /> : <VideoOff />}</button>
                <button type="button" disabled={!connected || busy} onClick={() => void switchCamera()} className="flex h-14 w-14 items-center justify-center rounded-full bg-white/10 text-white disabled:opacity-40" aria-label="Switch camera"><RefreshCw /></button>
              </>
            )}
            <button type="button" disabled={busy} onClick={() => void closeCall()} className="flex h-14 w-14 items-center justify-center rounded-full bg-rose-600 text-white disabled:opacity-50" aria-label="End call"><PhoneOff /></button>
          </div>
        )}
        {error && call?.status === 'accepted' && !connected && !connecting && (
          <button type="button" onClick={() => void connectRoom()} className="mx-auto mt-3 flex items-center gap-2 rounded-full border border-violet-400/30 bg-violet-500/15 px-4 py-2 text-xs font-semibold text-violet-100">
            <RefreshCw className="h-3.5 w-3.5" /> Try connecting again
          </button>
        )}
        {connecting && <p className="mt-3 flex items-center justify-center gap-2 text-xs text-zinc-500"><Loader2 className="h-3.5 w-3.5 animate-spin" /> Connecting securely</p>}
      </footer>
    </div>
  );
}
