import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { collection, query, where, onSnapshot, orderBy, doc, deleteDoc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { User, Notification } from '../types';
import { Bell, Shield, Star, Award, Zap, Heart, MessageSquare, UserCheck, MoreVertical, Trash2 } from 'lucide-react';

interface ActivityViewProps {
  currentUser: User;
}

export default function ActivityView({ currentUser }: ActivityViewProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [activeTab, setActiveTab] = useState<'All' | 'Social' | 'Missions' | 'Rewards' | 'System'>('All');

  useEffect(() => {
    if (!db) return;

    const q = query(
      collection(db, 'notifications'),
      where('userId', '==', currentUser.id),
      orderBy('timestamp', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const notifs: Notification[] = [];
      snapshot.forEach(doc => {
        notifs.push({ id: doc.id, ...doc.data() } as Notification);
      });
      setNotifications(notifs);
    }, (error: any) => {
      if (error?.code === 'permission-denied') return;
      console.warn('[ActivityView] Notifications snapshot error:', error);
    });

    return () => unsubscribe();
  }, [currentUser.id]);

  const filteredNotifications = useMemo(() => {
    let filtered = notifications;
    switch (activeTab) {
      case 'Social':
        filtered = notifications.filter(n => ['like', 'comment', 'follow', 'mention', 'share'].includes(n.type));
        break;
      case 'Missions':
        filtered = notifications.filter(n => ['mission_milestone'].includes(n.type));
        break;
      case 'Rewards':
        filtered = notifications.filter(n => ['reputation_milestone'].includes(n.type));
        break;
      case 'System':
        filtered = notifications.filter(n => ['system', 'pulse_alert'].includes(n.type));
        break;
    }
    return filtered;
  }, [notifications, activeTab]);

  const groupedNotifications = useMemo(() => {
    const groups: Record<string, Notification[]> = {};
    const now = new Date();
    const today = now.toDateString();
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    const yesterdayStr = yesterday.toDateString();

    filteredNotifications.forEach(notif => {
        const date = new Date(notif.timestamp);
        let dateKey = date.toDateString();
        if (dateKey === today) dateKey = 'Today';
        else if (dateKey === yesterdayStr) dateKey = 'Yesterday';
        
        if (!groups[dateKey]) groups[dateKey] = [];
        groups[dateKey].push(notif);
    });

    return Object.entries(groups).sort((a, b) => {
        if (a[0] === 'Today') return -1;
        if (b[0] === 'Today') return 1;
        if (a[0] === 'Yesterday') return -1;
        if (b[0] === 'Yesterday') return 1;
        return new Date(b[1][0].timestamp).getTime() - new Date(a[1][0].timestamp).getTime();
    });
  }, [filteredNotifications]);

  const getIcon = (type: string) => {
    switch (type) {
      case 'like': return <Heart className="w-5 h-5 text-pink-500 fill-pink-500/20" />;
      case 'comment': return <MessageSquare className="w-5 h-5 text-violet-400" />;
      case 'follow': return <UserCheck className="w-5 h-5 text-emerald-400" />;
      case 'mission_milestone': return <Award className="w-5 h-5 text-amber-500" />;
      case 'reputation_milestone': return <Star className="w-5 h-5 text-yellow-400" />;
      case 'system': return <Shield className="w-5 h-5 text-cyan-400" />;
      default: return <Bell className="w-5 h-5 text-zinc-400" />;
    }
  };

  const deleteNotification = async (id: string) => {
      await deleteDoc(doc(db, 'notifications', id));
  }

  const markAsRead = async (id: string) => {
      await updateDoc(doc(db, 'notifications', id), { isRead: true });
  }

  return (
    <div className="flex flex-col h-full bg-[#0A0A0A] text-white">
      {/* Tabs */}
      <div className="flex border-b border-zinc-800 sticky top-0 bg-[#0A0A0A]/80 backdrop-blur-md z-10">
        {(['All', 'Social', 'Missions', 'Rewards', 'System'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-4 text-sm font-semibold transition-colors relative ${activeTab === tab ? 'text-violet-400' : 'text-zinc-500'}`}
          >
            {tab}
            {activeTab === tab && <motion.div className="absolute bottom-0 left-4 right-4 h-0.5 bg-violet-400 rounded-t-full" layoutId="activeTab" />}
          </button>
        ))}
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto px-2">
        {groupedNotifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full p-6 text-center space-y-4">
            <div className="w-20 h-20 bg-zinc-900 rounded-full flex items-center justify-center">
              <Bell className="w-10 h-10 text-zinc-700" />
            </div>
            <div className='space-y-1'>
                <p className="text-white text-lg font-bold">Nothing new yet.</p>
                <p className="text-zinc-500 text-sm max-w-[250px]">When people interact with you, you'll see everything here.</p>
            </div>
          </div>
        ) : (
          groupedNotifications.map(([date, notifs]) => (
            <div key={date} className="mt-4">
              <h2 className="text-xs font-bold text-zinc-500 uppercase tracking-wider px-4 mb-2">{date}</h2>
              {notifs.map(notif => (
                <motion.div 
                  key={notif.id} 
                  className={`p-4 border-b border-zinc-800 flex gap-4 items-start hover:bg-zinc-900/50 rounded-2xl transition-colors group ${!notif.isRead ? 'bg-violet-950/10' : ''}`} 
                  onClick={() => markAsRead(notif.id)}
                  layout
                >
                  <div className="p-2 bg-zinc-900 rounded-full shrink-0 relative">
                    {getIcon(notif.type)}
                    {!notif.isRead && <div className="absolute -top-1 -right-1 w-3 h-3 bg-violet-500 rounded-full ring-2 ring-[#0A0A0A]" />}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-zinc-200">
                        <span className="font-bold text-white">{notif.username} </span> 
                        {notif.content}
                    </p>
                    <p className="text-xs text-zinc-500 mt-1">{new Date(notif.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
                  </div>
                  <button onClick={(e) => { e.stopPropagation(); deleteNotification(notif.id); }} className="opacity-0 group-hover:opacity-100 p-2 text-zinc-600 hover:text-red-400 transition-opacity">
                    <Trash2 className='w-4 h-4'/>
                  </button>
                </motion.div>
              ))}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
