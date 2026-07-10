import React from 'react';
import { Notification } from '../../types';

interface ActivityRowProps {
  notification: Notification;
}

export const ActivityRow: React.FC<ActivityRowProps> = ({ notification }) => {
  return (
    <div className={`flex items-start gap-4 p-4 hover:bg-violet-950/15 cursor-pointer transition-all ${notification.isRead ? 'opacity-60' : ''}`}>
      <img 
        src={notification.avatar} 
        alt={notification.username} 
        className="w-10 h-10 rounded-full"
        referrerPolicy="no-referrer"
      />
      <div className="flex-1">
        <p className="text-xs text-zinc-300">
          <span className="font-bold">{notification.username}</span> {notification.content}
        </p>
        <p className="text-[10px] text-zinc-500 mt-0.5">{notification.timestamp}</p>
      </div>
      {notification.actionText && (
        <button className="px-3 py-1 bg-violet-900/30 text-violet-300 text-[10px] font-bold uppercase rounded-lg hover:bg-violet-900/50">
          {notification.actionText}
        </button>
      )}
    </div>
  );
};
