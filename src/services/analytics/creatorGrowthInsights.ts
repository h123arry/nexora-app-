export interface CreatorWatchPoint {
  day: string;
  sessionsStarted: number;
  uniqueViewers: number;
  acceptedWatchSeconds: number;
  averageAcceptedWatchSeconds: number | null;
}

export interface CreatorGrowthInsight {
  id: string;
  title: string;
  value: string;
  explanation: string;
  signal: 'positive' | 'attention' | 'neutral';
}

const count = (value: unknown): number =>
  typeof value === 'number' && Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;

/**
 * Derives a small set of creator-facing observations from server-timed playback
 * aggregates. It deliberately avoids claims about unique reach, human attention,
 * or causal growth because the source cannot prove those outcomes.
 */
export function buildCreatorGrowthInsights(points: CreatorWatchPoint[]): CreatorGrowthInsight[] {
  const safe = points
    .filter(point => /^\d{4}-\d{2}-\d{2}$/.test(point.day))
    .map(point => ({
      day: point.day,
      sessions: count(point.sessionsStarted),
      viewers: count(point.uniqueViewers),
      seconds: count(point.acceptedWatchSeconds),
    }))
    .sort((a, b) => a.day.localeCompare(b.day));

  if (!safe.length) return [];

  const sessions = safe.reduce((sum, point) => sum + point.sessions, 0);
  const seconds = safe.reduce((sum, point) => sum + point.seconds, 0);
  const activeDays = safe.filter(point => point.sessions > 0).length;
  const average = sessions > 0 ? Math.round(seconds / sessions) : null;
  const insights: CreatorGrowthInsight[] = [
    {
      id: 'watch-time',
      title: 'Accepted watch time',
      value: sessions > 0 ? `${(seconds / 60).toFixed(1)} min` : 'No sessions',
      explanation: sessions > 0
        ? `${average}s average accepted watch time per session across ${sessions.toLocaleString()} sessions.`
        : 'No server-timed playback sessions have been recorded in this period.',
      signal: sessions > 0 ? 'positive' : 'neutral',
    },
    {
      id: 'consistency',
      title: 'Publishing opportunity',
      value: `${activeDays}/${safe.length} days`,
      explanation: activeDays >= Math.ceil(safe.length * 0.6)
        ? 'Playback activity appeared on most days in this reporting window. Compare this with your publishing calendar.'
        : 'Playback activity was concentrated on fewer days. Review which publishing days brought sessions, then test a consistent schedule.',
      signal: activeDays >= Math.ceil(safe.length * 0.6) ? 'positive' : 'attention',
    },
  ];

  if (safe.length >= 4) {
    const midpoint = Math.floor(safe.length / 2);
    const first = safe.slice(0, midpoint);
    const second = safe.slice(midpoint);
    const firstAverage = first.reduce((sum, point) => sum + point.seconds, 0) / first.length;
    const secondAverage = second.reduce((sum, point) => sum + point.seconds, 0) / second.length;
    const change = firstAverage > 0 ? ((secondAverage - firstAverage) / firstAverage) * 100 : null;
    insights.push({
      id: 'momentum',
      title: 'Watch-time direction',
      value: change === null ? 'Baseline forming' : `${change >= 0 ? '+' : ''}${Math.round(change)}%`,
      explanation: change === null
        ? 'The earlier comparison window has no accepted watch time yet. More data is needed before a trend can be calculated.'
        : 'Compares average accepted watch seconds per day in the first and second halves of this window. It is descriptive, not proof of why the change happened.',
      signal: change === null ? 'neutral' : change > 5 ? 'positive' : change < -5 ? 'attention' : 'neutral',
    });
  }

  return insights;
}
