import React, { useCallback, useEffect, useRef, useState } from 'react';
import type { User } from '../types';
import { watchDirectCalls } from '../services/directCallService';
import CallScreen from './CallScreen';

interface IncomingDirectCallListenerProps {
  currentUser: User;
  creators: User[];
  enabled: boolean;
}

/** Keeps incoming-call handling alive while members browse any NEXORA tab. */
export default function IncomingDirectCallListener({ currentUser, creators, enabled }: IncomingDirectCallListenerProps) {
  const [activeCall, setActiveCall] = useState<{
    callId: string;
    type: 'voice' | 'video';
    partnerName: string;
    partnerAvatar: string;
  } | null>(null);
  const creatorsRef = useRef(creators);
  useEffect(() => { creatorsRef.current = creators; }, [creators]);
  const closeCall = useCallback(() => setActiveCall(null), []);

  useEffect(() => {
    if (!enabled) {
      setActiveCall(null);
      return;
    }
    return watchDirectCalls(currentUser.id, calls => {
      setActiveCall(current => {
        if (current) return calls.some(call => call.id === current.callId) ? current : null;
        const incoming = calls
          .filter(call => call.recipientId === currentUser.id && call.status === 'ringing' && call.expiresAt > Date.now())
          .sort((a, b) => b.createdAt - a.createdAt)[0];
        if (!incoming) return null;
        const caller = creatorsRef.current.find(user => user.id === incoming.callerId);
        return {
          callId: incoming.id,
          type: incoming.type,
          partnerName: caller?.name || incoming.callerName || 'NEXORA member',
          partnerAvatar: caller?.avatar || '',
        };
      });
    }, error => console.warn('[NEXORA calls] Incoming call updates are unavailable:', error.message));
  }, [currentUser.id, enabled]);

  if (!activeCall) return null;
  return (
    <CallScreen
      isOpen
      callId={activeCall.callId}
      type={activeCall.type}
      partnerName={activeCall.partnerName}
      partnerAvatar={activeCall.partnerAvatar}
      incoming
      onClose={closeCall}
    />
  );
}
