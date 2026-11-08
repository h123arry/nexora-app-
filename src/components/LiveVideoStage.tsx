import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Camera, CameraOff, Loader2, Mic, MicOff, Radio, Wifi, WifiOff } from 'lucide-react';
import { Room, RoomEvent, Track, VideoPresets } from 'livekit-client';
import { getLiveTransportToken } from '../services/liveSessionsService';

type TransportStatus = 'connecting' | 'connected' | 'reconnecting' | 'unavailable' | 'disconnected';
interface PublishedTrack {
  id: string;
  track: Track;
  participantId: string;
  label: string;
  local: boolean;
}
interface LiveVideoStageProps {
  sessionId: string;
  connectionId: string;
  isHost: boolean;
  onError?: (message: string) => void;
}

function VideoTile({ item }: { item: PublishedTrack }) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  useEffect(() => {
    const element = videoRef.current;
    if (!element) return;
    item.track.attach(element);
    return () => { item.track.detach(element); };
  }, [item.track]);
  return (
    <div className="relative h-full min-h-0 w-full overflow-hidden rounded-2xl bg-[#080713]">
      <video ref={videoRef} autoPlay playsInline muted={item.local} className="h-full w-full object-cover"/>
      <span className="absolute bottom-2 left-2 rounded-full bg-black/60 px-2 py-1 text-[10px] font-semibold text-white">
        {item.label}{item.local ? ' · You' : ''}
      </span>
    </div>
  );
}

function AudioTrack({ item }: { item: PublishedTrack }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  useEffect(() => {
    const element = audioRef.current;
    if (!element) return;
    item.track.attach(element);
    return () => { item.track.detach(element); };
  }, [item.track]);
  return <audio ref={audioRef} autoPlay />;
}

export default function LiveVideoStage({ sessionId, connectionId, isHost, onError }: LiveVideoStageProps) {
  const roomRef = useRef<Room | null>(null);
  const [status, setStatus] = useState<TransportStatus>('connecting');
  const [videoTracks, setVideoTracks] = useState<PublishedTrack[]>([]);
  const [audioTracks, setAudioTracks] = useState<PublishedTrack[]>([]);
  const [cameraEnabled, setCameraEnabled] = useState(false);
  const [microphoneEnabled, setMicrophoneEnabled] = useState(false);
  const [localError, setLocalError] = useState('');

  const removeTrack = useCallback((track: Track, participantId: string) => {
    const id = participantId + ':' + (track.sid || track.kind);
    setVideoTracks(current => current.filter(item => item.id !== id));
    setAudioTracks(current => current.filter(item => item.id !== id));
  }, []);

  useEffect(() => {
    let cancelled = false;
    let activeRoom: Room | null = null;
    const connect = async () => {
      setStatus('connecting');
      setLocalError('');
      try {
        const credentials = await getLiveTransportToken(sessionId, connectionId);
        if (cancelled) return;
        const room = new Room({
          adaptiveStream: true,
          dynacast: true,
          videoCaptureDefaults: { resolution: VideoPresets.h720.resolution },
        });
        activeRoom = room;
        roomRef.current = room;

        const addTrack = (track: Track, participantId: string, label: string, local: boolean) => {
          const item = { id: participantId + ':' + (track.sid || track.kind), track, participantId, label, local };
          if (track.kind === Track.Kind.Video) {
            setVideoTracks(current => current.some(existing => existing.id === item.id) ? current : [...current, item]);
          } else if (track.kind === Track.Kind.Audio) {
            setAudioTracks(current => current.some(existing => existing.id === item.id) ? current : [...current, item]);
          }
        };

        room.on(RoomEvent.TrackSubscribed, (track, _publication, participant) => {
          addTrack(track, participant.identity, participant.name || 'NEXORA creator', false);
        });
        room.on(RoomEvent.TrackUnsubscribed, (track, _publication, participant) => removeTrack(track, participant.identity));
        room.on(RoomEvent.LocalTrackPublished, (publication, participant) => {
          if (publication.track) addTrack(publication.track, participant.identity, participant.name || 'You', true);
        });
        room.on(RoomEvent.LocalTrackUnpublished, publication => {
          if (publication.track) removeTrack(publication.track, room.localParticipant.identity);
        });
        room.on(RoomEvent.ParticipantDisconnected, participant => {
          setVideoTracks(current => current.filter(item => item.participantId !== participant.identity));
          setAudioTracks(current => current.filter(item => item.participantId !== participant.identity));
        });
        room.on(RoomEvent.Reconnecting, () => setStatus('reconnecting'));
        room.on(RoomEvent.Reconnected, () => setStatus('connected'));
        room.on(RoomEvent.ConnectionStateChanged, state => {
          if (state === 'connected') setStatus('connected');
          else if (state === 'reconnecting') setStatus('reconnecting');
          else if (state === 'disconnected') setStatus('disconnected');
        });
        room.on(RoomEvent.Disconnected, () => setStatus('disconnected'));

        room.prepareConnection(credentials.serverUrl, credentials.participantToken);
        await room.connect(credentials.serverUrl, credentials.participantToken);
        if (cancelled) { room.disconnect(); return; }
        setStatus('connected');

        if (isHost) {
          try {
            await room.localParticipant.setCameraEnabled(true);
            if (!cancelled) setCameraEnabled(true);
          } catch {
            if (!cancelled) setLocalError('Camera permission is unavailable. Allow camera access and try again.');
          }
          try {
            await room.localParticipant.setMicrophoneEnabled(true);
            if (!cancelled) setMicrophoneEnabled(true);
          } catch {
            if (!cancelled) setLocalError('Microphone permission is unavailable. Check your device settings.');
          }
        }
      } catch (error) {
        if (cancelled) return;
        setStatus('unavailable');
        const message = error instanceof Error ? error.message.replace(/^FirebaseError:\s*/, '') : 'Live video could not connect.';
        setLocalError(message);
        onError?.(message);
      }
    };
    setVideoTracks([]);
    setAudioTracks([]);
    setCameraEnabled(false);
    setMicrophoneEnabled(false);
    void connect();
    return () => {
      cancelled = true;
      activeRoom?.disconnect();
      if (roomRef.current === activeRoom) roomRef.current = null;
    };
  }, [sessionId, connectionId, isHost, onError, removeTrack]);

  const toggleCamera = async () => {
    const room = roomRef.current;
    if (!room || status !== 'connected') return;
    try {
      const next = !cameraEnabled;
      await room.localParticipant.setCameraEnabled(next);
      setCameraEnabled(next);
      setLocalError('');
    } catch {
      setLocalError('Camera could not be changed. Check the browser permission and selected device.');
    }
  };
  const toggleMicrophone = async () => {
    const room = roomRef.current;
    if (!room || status !== 'connected') return;
    try {
      const next = !microphoneEnabled;
      await room.localParticipant.setMicrophoneEnabled(next);
      setMicrophoneEnabled(next);
      setLocalError('');
    } catch {
      setLocalError('Microphone could not be changed. Check the browser permission and selected device.');
    }
  };

  const statusLabel = status === 'connected' ? 'Video connected'
    : status === 'reconnecting' ? 'Reconnecting'
    : status === 'unavailable' ? 'Video unavailable'
    : status === 'disconnected' ? 'Disconnected' : 'Connecting video';
  const visibleVideos = videoTracks.slice(0, 4);

  return (
    <div className="absolute inset-0 flex flex-col overflow-hidden bg-[#05030f]">
      <div className="absolute right-4 top-4 z-20 inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-black/60 px-3 py-1.5 text-[10px] font-semibold text-white">
        {status === 'connected' ? <Wifi size={12} className="text-emerald-300"/> : status === 'unavailable' || status === 'disconnected' ? <WifiOff size={12} className="text-rose-300"/> : <Loader2 size={12} className="animate-spin text-violet-200"/>}
        {statusLabel}
      </div>
      <div className={visibleVideos.length > 1 ? 'grid h-full min-h-0 flex-1 grid-cols-2 gap-2 p-3' : 'h-full min-h-0 flex-1 p-3'}>
        {visibleVideos.length > 0 ? visibleVideos.map(item => <VideoTile key={item.id} item={item}/>)
          : <div className="flex h-full min-h-0 w-full flex-col items-center justify-center rounded-2xl border border-white/10 bg-[radial-gradient(ellipse_at_center,rgba(91,33,182,.22),transparent_65%)] p-6 text-center">
              {status === 'connecting' || status === 'reconnecting' ? <Loader2 size={34} className="animate-spin text-violet-300"/> : <Radio size={38} className="text-violet-300"/>}
              <p className="mt-3 text-sm font-bold text-white">{isHost ? 'Your live camera will appear here' : 'Waiting for creator video'}</p>
              <p className="mt-2 max-w-sm text-xs leading-5 text-slate-400">{localError || (status === 'connecting' ? 'Connecting securely to the live room…' : status === 'reconnecting' ? 'Restoring your video connection…' : 'Live video is unavailable in this environment. Chat and gifts remain active.')}</p>
            </div>}
      </div>
      {audioTracks.map(item => <AudioTrack key={item.id} item={item}/>)}
      {localError && status === 'connected' && <p role="status" className="absolute bottom-20 left-4 right-4 z-20 rounded-xl border border-amber-300/20 bg-black/75 p-2 text-center text-[10px] text-amber-100">{localError}</p>}
      {isHost && <div className="absolute bottom-4 left-1/2 z-20 flex -translate-x-1/2 items-center gap-2 rounded-full border border-white/10 bg-black/65 p-2 backdrop-blur">
        <button type="button" onClick={()=>void toggleCamera()} disabled={status!=='connected'} aria-label={cameraEnabled?'Turn camera off':'Turn camera on'} className="grid h-10 w-10 place-items-center rounded-full bg-white/10 text-white disabled:opacity-40">{cameraEnabled?<Camera size={17}/>:<CameraOff size={17}/>}</button>
        <button type="button" onClick={()=>void toggleMicrophone()} disabled={status!=='connected'} aria-label={microphoneEnabled?'Mute microphone':'Unmute microphone'} className="grid h-10 w-10 place-items-center rounded-full bg-white/10 text-white disabled:opacity-40">{microphoneEnabled?<Mic size={17}/>:<MicOff size={17}/>}</button>
      </div>}
    </div>
  );
}
