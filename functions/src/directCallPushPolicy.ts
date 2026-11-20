export interface IncomingDirectCallPushInput {
  callId: string;
  chatId: string;
  callerId: string;
  callerName: string;
  callType: 'voice' | 'video';
}

export function createIncomingDirectCallPush(input: IncomingDirectCallPushInput) {
  const callerName = input.callerName.trim().slice(0, 80) || 'NEXORA member';
  const callLabel = input.callType === 'video' ? 'video call' : 'voice call';
  return {
    notification: {
      title: callerName + ' is calling',
      body: 'Incoming ' + callLabel + ' on NEXORA',
    },
    data: {
      type: 'incoming_call',
      callId: input.callId,
      chatId: input.chatId,
      callerId: input.callerId,
      callerName,
      callType: input.callType,
      url: '/?callId=' + encodeURIComponent(input.callId),
    },
    android: {
      priority: 'high' as const,
      ttl: 45_000,
      notification: {
        channelId: 'nexora_calls',
        sound: 'default',
        priority: 'max' as const,
        defaultVibrateTimings: true,
        visibility: 'public' as const,
        tag: 'nexora-call-' + input.callId,
      },
    },
    apns: {
      headers: {
        'apns-priority': '10',
        'apns-push-type': 'alert',
        'apns-expiration': String(Math.floor(Date.now() / 1000) + 45),
      },
      payload: {
        aps: {
          alert: {
            title: callerName + ' is calling',
            body: 'Incoming ' + callLabel + ' on NEXORA',
          },
          sound: 'default',
          category: 'NEXORA_INCOMING_CALL',
          'interruption-level': 'time-sensitive',
        },
      },
    },
    webpush: {
      headers: { Urgency: 'high', TTL: '45' },
      notification: {
        title: callerName + ' is calling',
        body: 'Incoming ' + callLabel + ' on NEXORA',
        icon: '/nexora-mark.png',
        tag: 'nexora-call-' + input.callId,
        requireInteraction: true,
      },
      fcmOptions: { link: '/?callId=' + encodeURIComponent(input.callId) },
    },
  };
}
