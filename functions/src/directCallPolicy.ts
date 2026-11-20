export type DirectCallStatus = 'ringing' | 'accepted' | 'declined' | 'missed' | 'busy' | 'ended' | 'failed';

export interface DirectCallRecord {
  id: string;
  chatId: string;
  callerId: string;
  recipientId: string;
  participants: string[];
  type: 'voice' | 'video';
  status: DirectCallStatus;
  createdAt: number;
  expiresAt: number;
}

const CALL_ID = /^[A-Za-z0-9_-]{12,128}$/;
const CHAT_ID = /^[A-Za-z0-9_-]{1,128}$/;
const USER_ID = /^[A-Za-z0-9_-]{1,128}$/;

export function validateDirectCallRequest(input: {
  callId: unknown; chatId: unknown; callerId: unknown; recipientId: unknown; type: unknown;
}): { callId: string; chatId: string; callerId: string; recipientId: string; type: 'voice' | 'video' } {
  const { callId, chatId, callerId, recipientId, type } = input;
  if (typeof callId !== 'string' || !CALL_ID.test(callId)) throw new Error('A valid call ID is required.');
  if (typeof chatId !== 'string' || !CHAT_ID.test(chatId)) throw new Error('A valid conversation is required.');
  if (typeof callerId !== 'string' || !USER_ID.test(callerId)) throw new Error('A valid caller is required.');
  if (typeof recipientId !== 'string' || !USER_ID.test(recipientId) || recipientId === callerId) throw new Error('A different recipient is required.');
  if (type !== 'voice' && type !== 'video') throw new Error('Choose voice or video calling.');
  return { callId, chatId, callerId, recipientId, type };
}

export function isDirectCallParticipant(call: Pick<DirectCallRecord, 'callerId' | 'recipientId' | 'participants'>, uid: string): boolean {
  return Boolean(uid) && (uid === call.callerId || uid === call.recipientId) && call.participants.length === 2 && call.participants.includes(uid);
}

export function canRespondToDirectCall(call: Pick<DirectCallRecord, 'callerId' | 'recipientId' | 'status' | 'expiresAt'>, uid: string, now: number): boolean {
  return uid === call.recipientId && call.status === 'ringing' && call.expiresAt > now;
}

export function canEndDirectCall(call: Pick<DirectCallRecord, 'callerId' | 'recipientId' | 'status'>, uid: string): boolean {
  return (uid === call.callerId || uid === call.recipientId) && ['ringing', 'accepted'].includes(call.status);
}

export function directCallRoomName(callId: string): string {
  if (!CALL_ID.test(callId)) throw new Error('A valid call ID is required.');
  return 'nexora_call_' + callId;
}

export function createDirectCallVideoGrant(roomName: string, callType: 'voice' | 'video') {
  if (!/^nexora_call_[A-Za-z0-9_-]{12,128}$/.test(roomName)) throw new Error('A valid direct-call room is required.');
  return {
    roomJoin: true,
    room: roomName,
    canPublish: true,
    canPublishSources: callType === 'voice' ? ['microphone'] : ['microphone', 'camera'],
    canPublishData: false,
    canSubscribe: true,
    canUpdateOwnMetadata: false,
  };
}
