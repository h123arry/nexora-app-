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
  return (
    <div id="nexora-inbox-wrapper" className="flex flex-col h-full w-full overflow-y-auto">
      {/* Inbox Header */}
      <div className="flex flex-col border-b border-purple-500/10 pb-4 mb-2 pt-2 px-4">
        <h2 className="text-xl font-black text-white tracking-tight">
          Inbox
        </h2>
      </div>

      <div className="flex-1 min-h-0 relative">
        <div className="h-full">
          <MessagesView
            currentUser={currentUser}
            chats={chats}
            messages={messages}
            onSendMessage={onSendMessage}
            onReceiveBotMessage={onReceiveBotMessage}
          />
          <div className="border-t border-purple-500/10 my-4" />
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
