import React, { useState, useEffect } from 'react';

export function parseTimestampToDate(input: string | number | Date): Date {
  if (input instanceof Date) return input;
  if (typeof input === 'number') return new Date(input);
  
  // Check if it looks like a number in string form
  if (/^\d+$/.test(input)) {
    return new Date(parseInt(input, 10));
  }

  // Try standard parsing
  const parsed = Date.parse(input);
  if (!isNaN(parsed)) {
    return new Date(parsed);
  }
  
  // Attempt to parse loose formats like "45 mins ago", "12 hours ago", "Yesterday"
  const now = new Date();
  const trimmed = input.trim().toLowerCase();
  
  if (trimmed === 'just now' || trimmed === 'online') {
    return now;
  }
  if (trimmed === 'yesterday') {
    now.setDate(now.getDate() - 1);
    return now;
  }
  
  const minsMatch = trimmed.match(/(\d+)\s*(min|mins|m)\s*ago/);
  if (minsMatch) {
    now.setMinutes(now.getMinutes() - parseInt(minsMatch[1], 10));
    return now;
  }
  
  const hoursMatch = trimmed.match(/(\d+)\s*(hour|hours|h)\s*ago/);
  if (hoursMatch) {
    now.setHours(now.getHours() - parseInt(hoursMatch[1], 10));
    return now;
  }

  const daysMatch = trimmed.match(/(\d+)\s*(day|days|d)\s*ago/);
  if (daysMatch) {
    now.setDate(now.getDate() - parseInt(daysMatch[1], 10));
    return now;
  }

  const weeksMatch = trimmed.match(/(\d+)\s*(week|weeks|w)\s*ago/);
  if (weeksMatch) {
    now.setDate(now.getDate() - parseInt(weeksMatch[1], 10) * 7);
    return now;
  }

  const monthsMatch = trimmed.match(/(\d+)\s*(month|months|mo)\s*ago/);
  if (monthsMatch) {
    now.setMonth(now.getMonth() - parseInt(monthsMatch[1], 10));
    return now;
  }
  
  return now; // Fallback to current time if unparseable
}

export function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  
  // Handle future dates slightly or clock drift
  if (diffMs < -2000) {
    return 'Just now';
  }
  
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  
  if (diffSecs < 15) {
    return 'Just now';
  }
  if (diffSecs < 60) {
    return `${diffSecs}s ago`;
  }
  if (diffMins < 60) {
    return `${diffMins}m ago`;
  }
  if (diffHours < 24) {
    return `${diffHours}h ago`;
  }
  if (diffDays === 1) {
    return 'Yesterday';
  }
  if (diffDays < 7) {
    return `${diffDays}d ago`;
  }
  if (diffDays < 30) {
    const weeks = Math.max(1, Math.floor(diffDays / 7));
    return `${weeks}w ago`;
  }
  if (diffDays < 365) {
    const months = Math.max(1, Math.floor(diffDays / 30));
    return `${months}mo ago`;
  }
  
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

interface RelativeTimeProps {
  timestamp: string | number | Date;
  className?: string;
}

export default function RelativeTime({ timestamp, className }: RelativeTimeProps) {
  const [relativeText, setRelativeText] = useState(() => {
    const parsedDate = parseTimestampToDate(timestamp);
    return formatRelativeTime(parsedDate);
  });

  useEffect(() => {
    const parsedDate = parseTimestampToDate(timestamp);
    
    // Update immediately
    setRelativeText(formatRelativeTime(parsedDate));

    // Determine update interval based on how old it is
    const diffMs = Date.now() - parsedDate.getTime();
    let intervalTime = 60000; // default 1 min
    
    if (diffMs < 60000) {
      intervalTime = 10000; // 10s for new items
    } else if (diffMs > 86400000) {
      intervalTime = 3600000; // 1 hour for older items
    }

    const interval = setInterval(() => {
      setRelativeText(formatRelativeTime(parsedDate));
    }, intervalTime);

    return () => clearInterval(interval);
  }, [timestamp]);

  return <span className={className}>{relativeText}</span>;
}
