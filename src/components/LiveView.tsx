import React, { useEffect, useRef, useState } from 'react';
import { collection, doc, limit, onSnapshot, orderBy, query, where } from 'firebase/firestore';
import { AlertCircle, Gift, Loader2, MessageSquare, Radio, Send, Users, Volume2, VolumeX, X } from 'lucide-react';
import GiftLiveOverlay from './GiftLiveOverlay';
import LiveKitStage from './LiveKitStage';
import { User } from '../types';
import { db } from '../lib/firebase';
import { endLiveSession, heartbeatLiveSession, joinLiveSession, leaveLiveSession, requestLiveGuestAccess, reviewLiveGuestAccess, sendLiveChatMessage, startLiveSession, updateLiveSessionSettings, moderateLiveParticipant, startLiveRecording, stopLiveRecording, getLiveReplayPlayback, type LiveChatMessage, type LiveSessionSummary } from '../services/liveSessionsService';

interface LiveViewProps { currentUser: User; onClose: () => void; streamId?: string; }
function asDate(value: any): string {
  const date = value?.toDate?.() || (typeof value === 'string' ? new Date(value) : null);
  return date && Number.isFinite(date.getTime()) ? date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
}

export default function LiveView({ currentUser, onClose, streamId }: LiveViewProps) {
  const [rooms,setRooms] = useState<LiveSessionSummary[]>([]);
  const [myReplays,setMyReplays] = useState<LiveSessionSummary[]>([]);
  const [recordingBusy,setRecordingBusy] = useState(false);
  const [replayBusy,setReplayBusy] = useState(false);
  const [replayUrl,setReplayUrl] = useState<string|null>(null);
  const [roomSearch,setRoomSearch] = useState('');
  const [roomSort,setRoomSort] = useState<'trending'|'popular'|'newest'>('trending');
  const [selectedId,setSelectedId] = useState<string|null>(null);
  const [session,setSession] = useState<LiveSessionSummary|null>(null);
  const [messages,setMessages] = useState<LiveChatMessage[]>([]);
  const [title,setTitle] = useState('');
  const [message,setMessage] = useState('');
  const [isHost,setIsHost] = useState(false);
  const [loading,setLoading] = useState(false);
  const [sending,setSending] = useState(false);
  const [settingsSaving,setSettingsSaving] = useState(false);
  const [guestRequestStatus,setGuestRequestStatus] = useState<'none'|'pending'|'approved'|'denied'>('none');
  const [guestRequests,setGuestRequests] = useState<Array<{id:string;guestId:string;guestName:string}>>([]);
  const [guestActionBusy,setGuestActionBusy] = useState(false);
  const [error,setError] = useState('');
  const [giftSoundsEnabled,setGiftSoundsEnabled] = useState(false);
  const [videoMembershipReady,setVideoMembershipReady] = useState(false);
  const giftAudioContext = useRef<AudioContext|null>(null);
  const bottomRef = useRef<HTMLDivElement|null>(null);
  const connectionId = useRef('live_' + Math.random().toString(36).slice(2) + Date.now().toString(36)).current;

  useEffect(() => () => { if(giftAudioContext.current && giftAudioContext.current.state!=='closed') void giftAudioContext.current.close(); }, []);

  useEffect(() => {
    const activeQuery=query(collection(db,'liveSessions'),where('status','==','live'),limit(50));
    return onSnapshot(activeQuery,snapshot=>{
      const next=snapshot.docs.map(item=>({id:item.id,...item.data()} as LiveSessionSummary));
      next.sort((a,b)=>{
        const date=(v:any)=>v?.toDate?.()?.getTime?.() || (typeof v==='string'?new Date(v).getTime():0);
        return date(b.startedAt)-date(a.startedAt);
      });
      setRooms(next);
    },()=>setError('Live rooms are temporarily unavailable.'));
  },[]);

  useEffect(() => {
    const ownRooms=query(collection(db,'liveSessions'),where('hostId','==',currentUser.id),limit(30));
    return onSnapshot(ownRooms,snapshot=>{
      const ended=snapshot.docs.map(item=>({id:item.id,...item.data()} as LiveSessionSummary))
        .filter(room=>room.status==='ended' && ['completed','processing','recording','stop_failed'].includes(String((room as any).recording?.status||'')));
      ended.sort((a,b)=>{ const time=(value:any)=>value?.toDate?.()?.getTime?.()||(typeof value==='string'?new Date(value).getTime():0); return time(b.endedAt)-time(a.endedAt); });
      setMyReplays(ended.slice(0,8));
    },()=>setError('Your replay library could not be loaded.'));
  },[currentUser.id]);
  useEffect(() => {
    if(streamId) { setSelectedId(streamId); setIsHost(false); }
  },[streamId]);

  useEffect(() => {
    if(!selectedId) { setSession(null);setMessages([]);return; }
    const sessionRef=doc(db,'liveSessions',selectedId);
    const stopSession=onSnapshot(sessionRef,snapshot=>{
      if(!snapshot.exists()) { setSession(null);setSelectedId(null);setIsHost(false);return; }
      const data={id:snapshot.id,...snapshot.data()} as LiveSessionSummary;
      setSession(data);
      setIsHost(data.hostId===currentUser.id);
      if(data.status!=='live') { setSelectedId(null);setIsHost(false); }
    },()=>{setError('This live room is unavailable or has ended.');setSelectedId(null);setIsHost(false);});
    const messagesQuery=query(collection(db,'liveSessions',selectedId,'messages'),orderBy('createdAt','asc'),limit(50));
    const stopMessages=onSnapshot(messagesQuery,snapshot=>{
      setMessages(snapshot.docs.map(item=>({id:item.id,...item.data()} as LiveChatMessage)));
    },()=>setError('Live chat could not be loaded.'));
    return ()=>{stopSession();stopMessages();};
  },[selectedId]);

  useEffect(() => {
    if(!selectedId) { setGuestRequestStatus('none');setGuestRequests([]);return; }
    const requests=collection(db,'liveSessions',selectedId,'guestRequests');
    if(isHost) {
      const pending=query(requests,where('status','==','pending'),limit(10));
      return onSnapshot(pending,snapshot=>{
        setGuestRequests(snapshot.docs.map(item=>({id:item.id,guestId:String(item.data().guestId||item.id),guestName:String(item.data().guestName||'NEXORA member')})));
      },()=>setError('Guest requests could not be loaded.'));
    }
    const ownRequest=doc(requests,currentUser.id);
    return onSnapshot(ownRequest,snapshot=>{
      const status=snapshot.exists()?snapshot.data().status:'none';
      setGuestRequestStatus(status==='pending'||status==='approved'||status==='denied'?status:'none');
    },()=>setError('Your stage request status could not be loaded.'));
  },[selectedId,isHost,currentUser.id]);

  useEffect(() => {
    if(!selectedId) { setVideoMembershipReady(false); return; }
    let cancelled=false;
    let heartbeat: ReturnType<typeof setInterval> | null = null;
    if(isHost) {
      setVideoMembershipReady(true);
      void heartbeatLiveSession(selectedId,connectionId).catch(()=>setError('Your live room connection needs to be refreshed.'));
      heartbeat=setInterval(()=>{void heartbeatLiveSession(selectedId,connectionId).catch(()=>setError('Your live room connection needs to be refreshed.'));},30_000);
      return ()=>{cancelled=true;if(heartbeat)clearInterval(heartbeat);};
    }
    setVideoMembershipReady(false);
    void joinLiveSession(selectedId,connectionId).then(()=>{
      if(cancelled) { void leaveLiveSession(selectedId,connectionId); return; }
      setVideoMembershipReady(true);
      heartbeat=setInterval(()=>{void heartbeatLiveSession(selectedId,connectionId).catch(()=>setError('Your live connection needs to be refreshed.'));},30_000);
    }).catch(()=>setError('You could not join this live room.'));
    return ()=>{cancelled=true;if(heartbeat)clearInterval(heartbeat);void leaveLiveSession(selectedId,connectionId).catch(()=>undefined);};
  },[selectedId,isHost]);

  useEffect(()=>{bottomRef.current?.scrollIntoView({behavior:'smooth'});},[messages.length]);

  const visibleRooms=rooms.filter(room=>(room.title+' '+(room.hostName||'')).toLowerCase().includes(roomSearch.trim().toLowerCase())).sort((a,b)=>{
    const time=(value:any)=>value?.toDate?.()?.getTime?.()||(typeof value==='string'?new Date(value).getTime():0);
    if(roomSort==='popular')return Number(b.viewerCount||0)-Number(a.viewerCount||0)||time(b.startedAt)-time(a.startedAt);
    if(roomSort==='newest')return time(b.startedAt)-time(a.startedAt);
    const score=(room:LiveSessionSummary)=>Math.log1p(Math.max(0,Number(room.viewerCount||0)))*2+Math.max(0,4-(Date.now()-time(room.startedAt))/3_600_000);
    return score(b)-score(a);
  });
  const startRoom=async()=>{
    setLoading(true);setError('');
    try { const result=await startLiveSession(title);setIsHost(true);setSelectedId(result.sessionId);setTitle(''); }
    catch(e:any){setError(e?.message?.replace(/^FirebaseError:\s*/,'')||'Your live room could not be started.');}
    finally{setLoading(false);}
  };
  const openRoom=async(room:LiveSessionSummary)=>{
    setError('');
    setIsHost(room.hostId===currentUser.id);
    setSelectedId(room.id);
  };
  const exitRoom=async()=>{
    if(!selectedId)return;
    const id=selectedId;setLoading(true);setError('');
    try { if(isHost) await endLiveSession(id); else await leaveLiveSession(id,connectionId);setSelectedId(null);setIsHost(false);setGiftSoundsEnabled(false);return true; }
    catch {setError(isHost?'The live room could not be ended.':'You could not leave the live room cleanly.');return false;}
    finally{setLoading(false);}
  };
  const closeView=async()=>{
    if(selectedId && isHost){const ended=await exitRoom();if(!ended)return;}
    onClose();
  };
  const toggleRoomSetting=async(setting:'chatEnabled'|'giftsEnabled')=>{
    if(!selectedId||!session||!isHost||settingsSaving)return;
    setSettingsSaving(true);setError('');
    try { await updateLiveSessionSettings(selectedId,{[setting]:!session[setting]}); }
    catch(e:any){setError(e?.message?.replace(/^FirebaseError:\s*/,'')||'The live room setting could not be updated.');}
    finally{setSettingsSaving(false);}
  };
  const toggleRecording=async()=>{
    if(!selectedId||!isHost||recordingBusy)return;
    setRecordingBusy(true);setError('');
    try { if(session?.recording?.status==='recording') await stopLiveRecording(selectedId); else await startLiveRecording(selectedId); }
    catch(e:any){setError(e?.message?.replace(/^FirebaseError:\\s*/,'')||'The live recording could not be updated.');}
    finally{setRecordingBusy(false);}
  };
  const openReplay=async(sessionId:string)=>{
    if(replayBusy)return;
    setReplayBusy(true);setError('');
    try { const result=await getLiveReplayPlayback(sessionId);setReplayUrl(result.url); }
    catch(e:any){setError(e?.message?.replace(/^FirebaseError:\\s*/,'')||'This replay is not ready yet.');}
    finally{setReplayBusy(false);}
  };
  const requestStageAccess=async()=>{
    if(!selectedId||guestActionBusy||isHost)return;
    setGuestActionBusy(true);setError('');
    try { await requestLiveGuestAccess(selectedId,connectionId);setGuestRequestStatus('pending'); }
    catch(e:any){setError(e?.message?.replace(/^FirebaseError:\\s*/,'')||'Your stage request could not be sent.');}
    finally{setGuestActionBusy(false);}
  };
  const moderateParticipant=async(participantId:string,action:'mute_chat'|'unmute_chat'|'remove'|'ban')=>{
    if(!selectedId||!isHost||guestActionBusy)return;
    setGuestActionBusy(true);setError('');
    try { await moderateLiveParticipant(selectedId,participantId,action); }
    catch(e:any){setError(e?.message?.replace(/^FirebaseError:\\s*/,'')||'The participant could not be moderated.');}
    finally{setGuestActionBusy(false);}
  };
  const decideGuestRequest=async(guestId:string,decision:'approved'|'denied')=>{
    if(!selectedId||!isHost||guestActionBusy)return;
    setGuestActionBusy(true);setError('');
    try { await reviewLiveGuestAccess(selectedId,guestId,decision); }
    catch(e:any){setError(e?.message?.replace(/^FirebaseError:\\s*/,'')||'The guest request could not be reviewed.');}
    finally{setGuestActionBusy(false);}
  };
  const submitMessage=async()=>{
    if(!selectedId||!message.trim()||sending)return;
    setSending(true);setError('');
    try {await sendLiveChatMessage(selectedId,message,connectionId);setMessage('');}
    catch(e:any){setError(e?.message?.replace(/^FirebaseError:\s*/,'')||'Your message could not be sent.');}
    finally{setSending(false);}
  };
  const selectedRoom=!!selectedId && !!session && session.status==='live';

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-[#05030f] text-white md:flex-row">
      <div className="relative flex min-h-[48vh] flex-1 items-center justify-center overflow-hidden bg-[#05030f]">
        {!selectedRoom ? (
          <div className="w-full max-w-xl space-y-5 p-6">
            <div className="mx-auto grid h-20 w-20 place-items-center rounded-full border border-violet-400/20 bg-violet-500/10"><Radio size={34} className="text-violet-200"/></div>
            <div className="text-center"><p className="text-[10px] font-black uppercase tracking-[.25em] text-violet-300">NEXORA LIVE</p><h2 className="mt-2 text-2xl font-black">Live rooms</h2><p className="mt-2 text-sm text-slate-400">Join a creator's live chat or open your own room.</p></div>
            <div className="rounded-2xl border border-amber-300/15 bg-amber-500/[.06] p-3 text-[11px] leading-relaxed text-amber-100">Live rooms now connect through LiveKit video transport when the secure server credentials are configured. Hosts need camera and microphone permissions.</div>
            <div className="space-y-2 rounded-2xl border border-white/10 bg-white/[.03] p-4">
              <h3 className="text-sm font-bold">Start a live room</h3>
              <input value={title} onChange={e=>setTitle(e.target.value)} maxLength={80} placeholder="What are you going live about?" className="min-h-11 w-full rounded-xl border border-white/10 bg-black/30 px-3 text-sm outline-none focus:border-violet-400/50"/>
              <button type="button" onClick={()=>void startRoom()} disabled={loading||title.trim().length<3} className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 text-sm font-bold disabled:opacity-40">{loading?<Loader2 size={16} className="animate-spin"/>:<Radio size={16}/>} Start live room</button>
            </div>
            <div className="space-y-3"><div className="flex items-center justify-between"><h3 className="text-sm font-bold">Happening now</h3><span className="text-[10px] text-slate-500">{visibleRooms.length} of {rooms.length} rooms</span></div>
              <input value={roomSearch} onChange={event=>setRoomSearch(event.target.value)} placeholder="Find a live room or creator…" aria-label="Search live rooms" className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-xs outline-none focus:border-violet-400/50"/>
              <div className="flex flex-wrap gap-2">{([{id:'trending',label:'Trending'},{id:'popular',label:'Most viewers'},{id:'newest',label:'Newest'}] as const).map(option=><button key={option.id} type="button" onClick={()=>setRoomSort(option.id)} aria-pressed={roomSort===option.id} className={'rounded-full border px-3 py-1.5 text-[10px] font-bold '+(roomSort===option.id?'border-violet-400/50 bg-violet-500/20 text-violet-100':'border-white/10 bg-white/[.03] text-slate-400')}>{option.label}</button>)}</div>
              {!rooms.length?<p className="rounded-xl border border-dashed border-white/10 p-5 text-center text-xs text-slate-500">No live rooms right now. Start one and invite your community.</p>:!visibleRooms.length?<p className="rounded-xl border border-dashed border-white/10 p-5 text-center text-xs text-slate-500">No live rooms match that search. Try another title or creator.</p>:visibleRooms.map(room=><button key={room.id} type="button" onClick={()=>void openRoom(room)} className="flex w-full items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[.03] p-3 text-left hover:border-violet-400/30"><span className="min-w-0"><span className="block truncate text-sm font-bold">{room.title}</span><span className="mt-1 block truncate text-[10px] text-slate-400">{room.hostName||'NEXORA creator'} · {(room.viewerCount||0).toLocaleString()} watching</span></span><span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-rose-500/10 px-2 py-1 text-[10px] font-bold text-rose-200"><span className="h-1.5 w-1.5 rounded-full bg-rose-400"/> LIVE</span></button>)}
            </div>
            {myReplays.length>0&&<div className="space-y-2 rounded-2xl border border-white/10 bg-white/[.025] p-4"><div className="flex items-center justify-between"><h3 className="text-sm font-bold">Your live replays</h3><span className="text-[10px] text-slate-500">{myReplays.length} saved</span></div>{myReplays.map(replay=><div key={replay.id} className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-black/20 p-3"><span className="min-w-0"><span className="block truncate text-xs font-bold">{replay.title}</span><span className="mt-1 block text-[10px] text-slate-500">{String((replay as any).recording?.status||'').replace('_',' ')} · {Number(replay.peakViewerCount||0).toLocaleString()} peak viewers</span></span><button type="button" disabled={replayBusy} onClick={()=>void openReplay(replay.id)} className="shrink-0 rounded-lg bg-violet-600 px-3 py-2 text-[10px] font-bold disabled:opacity-40">{replayBusy?'Checking…':(replay as any).recording?.status==='completed'?'Watch':'Check replay'}</button></div>)}</div>}
            {replayUrl&&<div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/90 p-4"><div className="w-full max-w-4xl rounded-2xl border border-white/10 bg-[#0b0917] p-3"><div className="mb-3 flex items-center justify-between"><h3 className="text-sm font-bold">NEXORA Live replay</h3><button type="button" onClick={()=>setReplayUrl(null)} className="rounded-full p-2 hover:bg-white/10" aria-label="Close replay"><X size={18}/></button></div><video src={replayUrl} controls playsInline className="max-h-[75vh] w-full rounded-xl bg-black" /></div></div>}
          </div>
        ) : (
          <div className="relative flex h-full w-full flex-col items-center justify-center bg-[radial-gradient(ellipse_at_center,rgba(91,33,182,.22),transparent_60%)] p-6 text-center">
            <div className="absolute left-4 top-4 flex items-center gap-2 rounded-full bg-rose-600 px-3 py-1.5 text-[10px] font-black tracking-wider"><span className="h-2 w-2 animate-pulse rounded-full bg-white"/> LIVE ROOM</div>
            <div className="absolute right-4 top-4 flex items-center gap-3 rounded-full bg-black/50 px-3 py-1.5 text-xs"><Users size={14}/>{(session?.viewerCount||0).toLocaleString()} viewers</div>
            <div className="w-full max-w-3xl"><Radio size={36} className="mx-auto text-violet-300"/><h2 className="mt-3 text-2xl font-black">{session?.title||'Live room'}</h2><p className="mt-2 text-sm text-slate-400">{isHost?'You are hosting this broadcast.':'You are watching this creator live.'}</p>{isHost&&<div className="mt-4 grid w-full max-w-xl grid-cols-2 gap-2 text-left sm:grid-cols-5"><div className="rounded-xl border border-white/10 bg-black/30 p-2"><p className="text-[9px] text-slate-400">Peak viewers</p><p className="text-lg font-black">{Number(session?.peakViewerCount||0).toLocaleString()}</p></div><div className="rounded-xl border border-white/10 bg-black/30 p-2"><p className="text-[9px] text-slate-400">Unique viewers</p><p className="text-lg font-black">{Number(session?.uniqueViewerCount||0).toLocaleString()}</p></div><div className="rounded-xl border border-white/10 bg-black/30 p-2"><p className="text-[9px] text-slate-400">Chat messages</p><p className="text-lg font-black">{Number(session?.messageCount||0).toLocaleString()}</p></div><div className="rounded-xl border border-white/10 bg-black/30 p-2"><p className="text-[9px] text-slate-400">Gifts sent</p><p className="text-lg font-black">{Number(session?.giftCount||0).toLocaleString()}</p></div><div className="rounded-xl border border-white/10 bg-black/30 p-2"><p className="text-[9px] text-slate-400">Gift value</p><p className="text-lg font-black">{Number(session?.giftNexTotal||0).toLocaleString()} <span className="text-[9px] text-amber-200">NEX</span></p></div></div>}<>{isHost&&<div className="mt-3 flex flex-wrap items-center justify-center gap-2"><button type="button" disabled={recordingBusy} onClick={()=>void toggleRecording()} className="rounded-full border border-violet-300/30 bg-violet-500/15 px-4 py-2 text-[11px] font-bold text-violet-100 disabled:opacity-50">{recordingBusy?'Updating recording…':session?.recording?.status==='recording'?'Stop recording':'Record this live'}</button><span className="text-[10px] text-slate-400">{session?.recording?.status==='recording'?'Recording to private replay storage':session?.recording?.status==='processing'?'Replay is processing':session?.recording?.status==='completed'?'Replay saved':'Recording is optional'}</span></div>}</>{isHost&&<div className="mt-4 flex flex-wrap justify-center gap-2"><button type="button" disabled={settingsSaving} onClick={()=>void toggleRoomSetting('chatEnabled')} aria-pressed={session?.chatEnabled===true} className="rounded-full border border-white/15 bg-white/10 px-3 py-2 text-[11px] font-semibold disabled:opacity-50">{session?.chatEnabled===true?'Disable live chat':'Enable live chat'}</button><button type="button" disabled={settingsSaving} onClick={()=>void toggleRoomSetting('giftsEnabled')} aria-pressed={session?.giftsEnabled===true} className="rounded-full border border-white/15 bg-white/10 px-3 py-2 text-[11px] font-semibold disabled:opacity-50">{session?.giftsEnabled===true?'Disable gifts':'Enable gifts'}</button></div>}{selectedId&&videoMembershipReady?<LiveKitStage key={selectedId+':'+(isHost?'host':guestRequestStatus)} sessionId={selectedId} connectionId={connectionId} isHost={isHost} isGuest={guestRequestStatus==='approved'}/>:<p className="mt-5 text-xs text-violet-200">Joining secure video room…</p>}{!isHost&&videoMembershipReady&&guestRequestStatus!=='approved'&&<div className="mt-3"><button type="button" disabled={guestActionBusy||guestRequestStatus==='pending'} onClick={()=>void requestStageAccess()} className="rounded-full border border-violet-300/30 bg-violet-500/15 px-4 py-2 text-xs font-bold text-violet-100 disabled:opacity-50">{guestActionBusy?'Sending request…':guestRequestStatus==='pending'?'Stage request sent':guestRequestStatus==='denied'?'Request stage access again':'Request to join the stage'}</button></div>}{!isHost&&guestRequestStatus==='approved'&&<p className="mt-3 text-xs font-semibold text-violet-200">The host approved your stage request. Your camera and microphone are ready.</p>}{isHost&&guestRequests.length>0&&<div className="mt-4 w-full rounded-xl border border-white/10 bg-black/30 p-3 text-left"><p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-violet-200">Guest requests</p>{guestRequests.map(item=><div key={item.id} className="flex items-center justify-between gap-2 border-t border-white/5 py-2"><span className="min-w-0 truncate text-xs text-slate-200">{item.guestName}</span><span className="flex shrink-0 gap-1"><button type="button" disabled={guestActionBusy} onClick={()=>void decideGuestRequest(item.guestId,'approved')} className="rounded-lg bg-violet-600 px-2 py-1 text-[10px] font-bold disabled:opacity-50">Approve</button><button type="button" disabled={guestActionBusy} onClick={()=>void decideGuestRequest(item.guestId,'denied')} className="rounded-lg border border-white/15 px-2 py-1 text-[10px] font-bold disabled:opacity-50">Deny</button></span></div>)}</div>}</div>
            {selectedId&&<GiftLiveOverlay streamId={selectedId} soundEnabled={giftSoundsEnabled} audioContext={giftAudioContext.current}/>}
            <div className="absolute bottom-5 left-5 flex items-center gap-2">
              <button type="button" onClick={()=>{if(!giftAudioContext.current&&typeof window!=='undefined'&&window.AudioContext)giftAudioContext.current=new window.AudioContext();if(!giftSoundsEnabled)void giftAudioContext.current?.resume();setGiftSoundsEnabled(v=>!v);}} className="rounded-full border border-white/10 bg-black/50 p-3" aria-label={giftSoundsEnabled?'Mute gift sounds':'Enable gift sounds'}>{giftSoundsEnabled?<Volume2 size={18}/>:<VolumeX size={18}/>}</button>
              <span className="rounded-full bg-black/40 px-3 py-2 text-[10px] text-slate-300"><Gift size={12} className="mr-1 inline"/> {session?.giftsEnabled===true?'GIFTVERSE enabled':'Gifts paused by host'}</span>
            </div>
            <button type="button" onClick={()=>void exitRoom()} disabled={loading} className="absolute bottom-5 right-5 rounded-full bg-rose-600 px-5 py-3 text-xs font-black disabled:opacity-50">{loading?(isHost?'Ending…':'Leaving…'):(isHost?'End live room':'Leave room')}</button>
          </div>
        )}
        <button type="button" onClick={()=>void closeView()} className="absolute right-4 top-16 rounded-full bg-black/60 p-2 text-white hover:bg-black/80" aria-label="Close live view"><X size={20}/></button>
      </div>
      <aside className="flex max-h-[52vh] w-full flex-col border-t border-white/10 bg-[#0b0917] md:max-h-none md:w-80 md:border-l md:border-t-0">
        <div className="flex items-center justify-between border-b border-white/10 p-4"><div className="flex items-center gap-2"><MessageSquare size={15} className="text-violet-300"/><h3 className="text-sm font-bold">Live chat</h3></div><span className="text-[10px] text-slate-500">{selectedRoom?messages.length+' recent':'Room preview'}</span></div>
        <div className="flex-1 space-y-3 overflow-y-auto p-4">
          {!selectedRoom?<p className="pt-8 text-center text-xs text-slate-500">Choose a live room to open its chat.</p>:messages.length===0?<p className="pt-8 text-center text-xs text-slate-500">Be the first to say hello.</p>:messages.map(item=><div key={item.id} className="rounded-xl bg-white/[.03] p-3"><div className="flex items-center justify-between gap-2"><p className="min-w-0 truncate text-[10px] font-bold text-violet-300">{item.senderName||'NEXORA member'} <span className="ml-1 font-normal text-slate-600">{asDate(item.createdAt)}</span></p>{isHost&&item.senderId!==currentUser.id&&<div className="flex shrink-0 gap-1"><button type="button" disabled={guestActionBusy} onClick={()=>void moderateParticipant(item.senderId,'mute_chat')} className="rounded-md border border-white/10 px-2 py-1 text-[9px] text-slate-300 disabled:opacity-40">Mute</button><button type="button" disabled={guestActionBusy} onClick={()=>void moderateParticipant(item.senderId,'remove')} className="rounded-md border border-rose-400/20 px-2 py-1 text-[9px] text-rose-200 disabled:opacity-40">Remove</button></div>}</div><p className="mt-1 whitespace-pre-wrap break-words text-xs text-slate-200">{item.message}</p></div>)}<div ref={bottomRef}/></div>
        {selectedRoom&&<div className="border-t border-white/10 p-3">{session?.chatEnabled===true?<div className="flex gap-2"><input value={message} onChange={e=>setMessage(e.target.value)} onKeyDown={e=>{if(e.key==='Enter')void submitMessage();}} maxLength={500} placeholder="Send a message…" className="min-w-0 flex-1 rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-xs outline-none focus:border-violet-400/50"/><button type="button" onClick={()=>void submitMessage()} disabled={sending||!message.trim()} className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-violet-600 disabled:opacity-40">{sending?<Loader2 size={14} className="animate-spin"/>:<Send size={14}/>}</button></div>:<p className="px-2 py-3 text-center text-xs text-slate-500">Live chat is paused by the host.</p>}</div>}
      </aside>
      {error&&<div role="alert" className="fixed bottom-4 left-4 right-4 z-[130] flex items-start gap-2 rounded-xl border border-rose-400/20 bg-[#240e1a] p-3 text-xs text-rose-100 md:right-auto md:max-w-md"><AlertCircle size={15} className="mt-0.5 shrink-0"/><span>{error}</span><button type="button" onClick={()=>setError('')} className="ml-auto"><X size={14}/></button></div>}
    </div>
  );
}
