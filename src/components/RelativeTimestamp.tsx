import React, { useState, useEffect } from 'react';

/**
 * Parses any relative timestamp string (e.g. '10 mins ago', 'Just now', '2 hours ago', 'Yesterday')
 * or a standard parsable date/time representation into a real Date object.
 */
export function parseTimestampToDate(timestamp: string | Date | number): Date {
  if (!timestamp) return new Date();
  if (timestamp instanceof Date) return timestamp;
  if (typeof timestamp === 'number') return new Date(timestamp);

  const trimmed = timestamp.trim();
  const lower = trimmed.toLowerCase();

  // If it's a parseable date string (e.g., ISO string)
  const parsedMillis = Date.parse(trimmed);
  if (!isNaN(parsedMillis)) {
    return new Date(parsedMillis);
  }

  // Handle Relative Text Patterns
  const now = Date.now();
  if (lower === 'just now') {
    return new Date(now);
  }
  if (lower === 'yesterday') {
    return new Date(now - 24 * 60 * 60 * 1000);
  }

  // Handle singular / plural increments
  // e.g., '10 mins ago', '2 hours ago', '1 day ago', '15 seconds ago'
  const numberMatch = trimmed.match(/^(\d+)\s+(second|sec|min|minute|hour|hr|day|week|month|year)s?\s+ago$/i);
  if (numberMatch) {
    const val = parseInt(numberMatch[1], 10);
    const unit = numberMatch[2].toLowerCase();

    if (unit.startsWith('sec')) {
      return new Date(now - val * 1000);
    }
    if (unit.startsWith('min')) {
      return new Date(now - val * 60 * 1000);
    }
    if (unit.startsWith('hour') || unit.startsWith('hr')) {
      return new Date(now - val * 60 * 60 * 1000);
    }
    if (unit.startsWith('day')) {
      return new Date(now - val * 24 * 60 * 60 * 1000);
    }
    if (unit.startsWith('week')) {
      return new Date(now - val * 7 * 24 * 60 * 60 * 1000);
    }
    if (unit.startsWith('month')) {
      return new Date(now - val * 30 * 24 * 60 * 60 * 1000);
    }
  }

  // Fallback: If it's some other static string, return now
  return new Date(now);
}

/**
 * Formats a Date object into a modern short relative string representation (e.g. '5m ago', '2h ago').
 */
export function formatRelativeTime(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);

  if (seconds < 5) return 'Just now';
  if (seconds < 60) return `${seconds}s ago`;

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;

  // Standard short date format (e.g., Jun 14)
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

interface RelativeTimestampProps {
  timestamp: string | Date | number;
  className?: string;
}

export default function RelativeTimestamp({ timestamp, className }: RelativeTimestampProps) {
  // Parse onto Date object once on mount / when 'timestamp' prop changes
  const [targetDate] = useState(() => parseTimestampToDate(timestamp));
  const [displayValue, setDisplayValue] = useState(() => formatRelativeTime(targetDate));

  useEffect(() => {
    // Initial display set
    setDisplayValue(formatRelativeTime(targetDate));

    // Update every 10 seconds for standard live updates
    const interval = setInterval(() => {
      setDisplayValue(formatRelativeTime(targetDate));
    }, 10000);

    return () => clearInterval(interval);
  }, [targetDate]);

  return <span className={className}>{displayValue}</span>;
}
