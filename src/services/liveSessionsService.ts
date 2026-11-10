import { getFunctions, httpsCallable } from 'firebase/functions';
import { app, functions } from '../lib/firebase';

const liveKitFunctions = getFunctions(app, 'europe-west1');

export interface LiveSessionSummary {
  id: string; hostId: string; hostName?: string; title: string; status: 'live' | 'ended';
  viewerCount: number; chatEnabled: boolean; giftsEnabled: boolean; videoTransport: 'not_configured' | 'livekit';
  startedAt?: { toDate?: () => Date } | string | null;
}
export interface LiveChatMessage {
  id: string; senderId: string; senderName: string; message: string; createdAt?: { toDate?: () => Date } | string | null;
}
export async function startLiveSession(title: string) {
  const call = httpsCallable<{ title: string }, { sessionId: string; status: 'live'; viewerCount: number; videoTransport: 'not_configured' | 'livekit' }>(functions, 'startLiveSession');
  return (await call({ title })).data;
}
export async function endLiveSession(sessionId: string) {
  const call = httpsCallable<{ sessionId: string }, { sessionId: string; status: 'ended'; replayed: boolean }>(functions, 'endLiveSession');
  return (await call({ sessionId })).data;
}
export async function joinLiveSession(sessionId: string, connectionId: string) {
  const call = httpsCallable<{ sessionId: string; connectionId: string }, { sessionId: string; joined: boolean; viewerCount: number }>(functions, 'joinLiveSession');
  return (await call({ sessionId, connectionId })).data;
}
export async function heartbeatLiveSession(sessionId: string, connectionId: string) {
  const call = httpsCallable<{ sessionId: string; connectionId: string }, { sessionId: string; active: boolean }>(functions, 'heartbeatLiveSession');
  return (await call({ sessionId, connectionId })).data;
}
export async function leaveLiveSession(sessionId: string, connectionId: string) {
  const call = httpsCallable<{ sessionId: string; connectionId: string }, { sessionId: string; left: boolean; viewerCount: number }>(functions, 'leaveLiveSession');
  return (await call({ sessionId, connectionId })).data;
}
export async function sendLiveChatMessage(sessionId: string, message: string, connectionId: string) {
  const call = httpsCallable<{ sessionId: string; message: string; connectionId: string }, { messageId: string; sessionId: string; senderId: string; senderName: string; message: string; status: 'sent' }>(functions, 'sendLiveChatMessage');
  return (await call({ sessionId, message, connectionId })).data;
}

export async function updateLiveSessionSettings(sessionId: string, settings: { chatEnabled?: boolean; giftsEnabled?: boolean }) {
  const call = httpsCallable<
    { sessionId: string; settings: { chatEnabled?: boolean; giftsEnabled?: boolean } },
    { sessionId: string; chatEnabled?: boolean; giftsEnabled?: boolean; updated: true }
  >(functions, 'updateLiveSessionSettings');
  return (await call({ sessionId, settings })).data;
}

export async function requestLiveGuestAccess(sessionId: string, connectionId: string) {
  const call = httpsCallable<
    { sessionId: string; connectionId: string },
    { sessionId: string; status: 'pending' | 'approved'; replayed: boolean }
  >(functions, 'requestLiveGuestAccess');
  return (await call({ sessionId, connectionId })).data;
}

export async function reviewLiveGuestAccess(sessionId: string, guestId: string, decision: 'approved' | 'denied') {
  const call = httpsCallable<
    { sessionId: string; guestId: string; decision: 'approved' | 'denied' },
    { sessionId: string; guestId: string; status: 'approved' | 'denied'; updated: true }
  >(functions, 'reviewLiveGuestAccess');
  return (await call({ sessionId, guestId, decision })).data;
}

export async function getLiveKitToken(sessionId: string, connectionId: string) {
  const call = httpsCallable<{ sessionId: string; connectionId: string }, { token: string; wsUrl: string; roomName: string; role: 'host' | 'guest' | 'viewer'; expiresAt: number }>(liveKitFunctions, 'getLiveKitToken');
  return (await call({ sessionId, connectionId })).data;
}
