import React, { useCallback, useEffect, useRef, useState } from 'react';
import type { User } from '../types';
import { startDirectCall, watchDirectCalls } from '../services/directCallService';
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
    incoming: boolean;
  } | null>(null);
  const creatorsRef = useRef(creators);
  const activeCallRef = useRef(activeCall);
  const startingCallRef = useRef(false);
  useEffect(() => { creatorsRef.current = creators; }, [creators]);
  useEffect(() => { activeCallRef.current = activeCall; }, [activeCall]);
  const closeCall = useCallback(() => setActiveCall(null), []);

  useEffect(() => {
    if (!enabled) return;
    const handleStartCall = (event: Event) => {
      const detail = (event as CustomEvent).detail || {};
      const chatId = typeof detail.chatId === 'string' ? detail.chatId : '';
      const recipientId = typeof detail.recipientId === 'string' ? detail.recipientId : '';
      const type = detail.type === 'video' ? 'video' : detail.type === 'voice' ? 'voice' : null;
      if (!chatId || !recipientId || !type) return;
      if (activeCallRef.current || startingCallRef.current) {
        window.dispatchEvent(new CustomEvent('toast', { detail: 'You already have a call in progress.' }));
        return;
      }
      startingCallRef.current = true;
      void startDirectCall(chatId, recipientId, type).then(started => {
        const next = {
          callId: started.callId,
          type,
          partnerName: typeof detail.partnerName === 'string' ? detail.partnerName : 'NEXORA member',
          partnerAvatar: typeof detail.partnerAvatar === 'string' ? detail.partnerAvatar : '',
          incoming: false,
        };
        activeCallRef.current = next;
        setActiveCall(next);
      }).catch((error: any) => {
        window.dispatchEvent(new CustomEvent('toast', {
          detail: error?.message || 'The call could not be started. Please try again.',
        }));
      }).finally(() => {
        startingCallRef.current = false;
      });
    };
    window.addEventListener('NEXORA_START_DIRECT_CALL', handleStartCall);
    return () => window.removeEventListener('NEXORA_START_DIRECT_CALL', handleStartCall);
  }, [enabled]);

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
          partnerAvatar: caller?.avatar || incoming.callerAvatar || '',
          incoming: true,
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
      incoming={activeCall.incoming}
      onClose={closeCall}
    />
  );
}
