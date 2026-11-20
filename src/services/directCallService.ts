import { collection, doc, onSnapshot, query, where, type Unsubscribe } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db, regionalFunctions } from '../lib/firebase';

export interface DirectCall {
  id: string;
  chatId: string;
  callerId: string;
  recipientId: string;
  participants: string[];
  type: 'voice' | 'video';
  status: 'ringing' | 'accepted' | 'declined' | 'missed' | 'busy' | 'ended' | 'failed';
  callerName: string;
  recipientName: string;
  callerAvatar?: string;
  recipientAvatar?: string;
  createdAt: number;
  updatedAt: number;
  expiresAt: number;
  acceptedAt?: number;
}

export async function startDirectCall(chatId: string, recipientId: string, type: 'voice' | 'video') {
  const callId = doc(collection(db, 'directCalls')).id;
  const callable = httpsCallable<
    { callId: string; chatId: string; recipientId: string; type: 'voice' | 'video' },
    { callId: string; status: 'ringing'; expiresAt: number }
  >(regionalFunctions, 'startDirectCall');
  return (await callable({ callId, chatId, recipientId, type })).data;
}

export async function respondToDirectCall(callId: string, decision: 'accept' | 'decline') {
  const callable = httpsCallable<{ callId: string; decision: 'accept' | 'decline' }, { status: DirectCall['status'] }>(regionalFunctions, 'respondToDirectCall');
  return (await callable({ callId, decision })).data;
}

export async function endDirectCall(callId: string) {
  const callable = httpsCallable<{ callId: string }, { ended: true }>(regionalFunctions, 'endDirectCall');
  return (await callable({ callId })).data;
}

export async function getDirectCallToken(callId: string) {
  const callable = httpsCallable<
    { callId: string },
    { token: string; wsUrl: string; roomName: string; expiresAt: number; callType: 'voice' | 'video' }
  >(regionalFunctions, 'getDirectCallToken');
  return (await callable({ callId })).data;
}

export function watchDirectCalls(uid: string, onCalls: (calls: DirectCall[]) => void, onError?: (error: Error) => void): Unsubscribe {
  const callsQuery = query(
    collection(db, 'directCalls'),
    where('participants', 'array-contains', uid),
    where('status', 'in', ['ringing', 'accepted']),
  );
  return onSnapshot(callsQuery, snapshot => {
    onCalls(snapshot.docs.map(item => ({ id: item.id, ...item.data() } as DirectCall)));
  }, error => onError?.(error));
}

export function watchDirectCall(callId: string, onCall: (call: DirectCall | null) => void, onError?: (error: Error) => void): Unsubscribe {
  return onSnapshot(doc(db, 'directCalls', callId), snapshot => {
    onCall(snapshot.exists() ? ({ id: snapshot.id, ...snapshot.data() } as DirectCall) : null);
  }, error => onError?.(error));
}
