import assert from 'node:assert/strict';
import { test } from 'node:test';
import { getNotificationTimeSection } from '../src/utils/notificationTime.ts';

test('notification time sections use actual local calendar dates', () => {
  const now = new Date(2026, 10, 1, 14, 0, 0);
  const at = (daysAgo: number) => {
    const date = new Date(now);
    date.setDate(date.getDate() - daysAgo);
    return date.toISOString();
  };

  assert.equal(getNotificationTimeSection(at(0), now), 'today');
  assert.equal(getNotificationTimeSection(at(1), now), 'yesterday');
  assert.equal(getNotificationTimeSection(at(6), now), 'this_week');
  assert.equal(getNotificationTimeSection(at(7), now), 'earlier');
  assert.equal(getNotificationTimeSection(at(29), now), 'earlier');
  assert.equal(getNotificationTimeSection(at(30), now), 'older');
});

test('future timestamps stay in today and malformed timestamps are safely classified as older', () => {
  const now = new Date(2026, 10, 1, 14, 0, 0);
  assert.equal(getNotificationTimeSection('2026-11-02T09:00:00.000Z', now), 'today');
  assert.equal(getNotificationTimeSection('not-a-date', now), 'older');
});
