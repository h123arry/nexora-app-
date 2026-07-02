import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MessageSquare, Bell, Sparkles, Trash2, CheckCheck } from 'lucide-react';
import { User, Chat, Message, Notification } from '../types';
import MessagesView from './MessagesView';
import NotificationsView from './NotificationsView';

interface InboxViewProps {
  currentUser: User;
  chats: Chat[];
  messages: { [chatId: string]: Message[] };
  onSendMessage: (chatId: string, content: string) => void;
  onReceiveBotMessage: (chatId: string, content: string, senderId: string) => void;
  notifications: Notification[];
  onMarkAllAsRead: () => void;
  onClearNotifications: () => void;
  onViewProfile?: (userId: string) => void;
}

export default function InboxView({
  currentUser,
  chats,
  messages,
  onSendMessage,
  onReceiveBotMessage,
  notifications,
  onMarkAllAsRead,
  onClearNotifications,
  onViewProfile
}: InboxViewProps) {
  const [activeTab, setActiveTab] = useState<'messages' | 'notifications'>('messages');

  React.useEffect(() => {
    const handleInboxTabChange = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail && customEvent.detail.tab === 'inbox') {
        if (customEvent.detail.subTab === 'messages' || customEvent.detail.subTab === 'notifications') {
          setActiveTab(customEvent.detail.subTab);
        }
      }
    };
    window.addEventListener('changeInboxTab', handleInboxTabChange);
    return () => window.removeEventListener('changeInboxTab', handleInboxTabChange);
  }, []);

  const unreadMessagesCount = chats.reduce((acc, c) => acc + c.unreadCount, 0);
  const unreadNotificationsCount = notifications.filter(n => !n.isRead).length;

  return (
    <div id="nexora-inbox-wrapper" className="flex flex-col h-full w-full">
      {/* Inbox Subheader with modern segment controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-purple-500/10 pb-4 mb-5 gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-purple-400">
              COMMUNICATION HUB
            </span>
          </div>
          <h2 className="text-xl font-black text-white tracking-tight">
            Central Inbox
          </h2>
        </div>

        {/* Sliding Segmented Toggle Control */}
        <div className="bg-black/40 border border-purple-500/10 p-1.5 rounded-2xl flex relative w-full sm:w-80 overflow-hidden">
          {/* Active indicator background slide */}
          <div 
            className="absolute top-1.5 bottom-1.5 rounded-xl bg-gradient-to-r from-violet-600/25 to-pink-500/10 border border-violet-500/30 transition-all duration-300"
            style={{
              left: activeTab === 'messages' ? '6px' : 'calc(50% + 2px)',
              width: 'calc(50% - 8px)'
            }}
          />

          <button
            onClick={() => setActiveTab('messages')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-bold uppercase tracking-wider relative z-10 transition-all cursor-pointer ${
              activeTab === 'messages' ? 'text-violet-300 font-extrabold' : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>Messages</span>
            {unreadMessagesCount > 0 && (
              <span className="bg-violet-500 text-white font-mono text-[9px] px-1.5 py-0.5 rounded-full font-bold ml-1">
                {unreadMessagesCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('notifications')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-bold uppercase tracking-wider relative z-10 transition-all cursor-pointer ${
              activeTab === 'notifications' ? 'text-violet-300 font-extrabold' : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            <Bell className="w-3.5 h-3.5" />
            <span>Notifications</span>
            {unreadNotificationsCount > 0 && (
              <span className="bg-pink-500 text-white font-mono text-[9px] px-1.5 py-0.5 rounded-full font-bold ml-1">
                {unreadNotificationsCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Render the inner components without destroying their internal state */}
      <div className="flex-1 min-h-0 relative">
        <div className={activeTab === 'messages' ? 'block h-full' : 'hidden'}>
          <MessagesView
            currentUser={currentUser}
            chats={chats}
            messages={messages}
            onSendMessage={onSendMessage}
            onReceiveBotMessage={onReceiveBotMessage}
          />
        </div>
        
        <div className={activeTab === 'notifications' ? 'block h-full' : 'hidden'}>
          <NotificationsView
            notifications={notifications}
            currentUser={currentUser}
            onMarkAllAsRead={onMarkAllAsRead}
            onClearNotifications={onClearNotifications}
            onViewProfile={onViewProfile}
          />
        </div>
      </div>
    </div>
  );
}
