import { httpsCallable } from 'firebase/functions';
import { functions } from '../lib/firebase';

export interface LiveSessionSummary {
  id: string; hostId: string; hostName?: string; title: string; status: 'live' | 'ended';
  viewerCount: number; chatEnabled: boolean; giftsEnabled: boolean; videoTransport: 'not_configured' | 'livekit';
  startedAt?: { toDate?: () => Date } | string | null;
}
export interface LiveChatMessage {
  id: string; senderId: string; senderName: string; message: string; createdAt?: { toDate?: () => Date } | string | null;
}
export async function startLiveSession(title: string) {
  const call = httpsCallable<{ title: string }, { sessionId: string; status: 'live'; viewerCount: number; videoTransport: 'not_configured' }>(functions, 'startLiveSession');
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

export interface LiveTransportCredentials {
  provider: 'livekit';
  serverUrl: string;
  roomName: string;
  role: 'host' | 'viewer';
  participantToken: string;
  expiresInSeconds: number;
}
export async function getLiveTransportToken(sessionId: string, connectionId: string): Promise<LiveTransportCredentials> {
  const call = httpsCallable<{ sessionId: string; connectionId: string }, LiveTransportCredentials>(functions, 'getLiveTransportToken');
  return (await call({ sessionId, connectionId })).data;
}
