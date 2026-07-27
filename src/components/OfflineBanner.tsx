import React, { useState, useEffect } from 'react';
import { WifiOff, Wifi } from 'lucide-react';

export default function OfflineBanner() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showReconnected, setShowReconnected] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setShowReconnected(true);
      const timer = setTimeout(() => setShowReconnected(false), 4000);
      return () => clearTimeout(timer);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setShowReconnected(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (isOnline && !showReconnected) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[9999] flex justify-center pointer-events-none p-3">
      {!isOnline ? (
        <div className="pointer-events-auto flex items-center gap-2.5 px-4 py-2 rounded-2xl bg-rose-950/90 border border-rose-500/30 text-rose-200 shadow-xl backdrop-blur-md text-xs font-mono animate-pulse">
          <WifiOff className="w-4 h-4 text-rose-400 shrink-0" />
          <span>You are currently offline. Showing cached content.</span>
        </div>
      ) : showReconnected ? (
        <div className="pointer-events-auto flex items-center gap-2.5 px-4 py-2 rounded-2xl bg-emerald-950/90 border border-emerald-500/30 text-emerald-200 shadow-xl backdrop-blur-md text-xs font-mono">
          <Wifi className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>Connection restored. Syncing latest updates...</span>
        </div>
      ) : null}
    </div>
  );
}
