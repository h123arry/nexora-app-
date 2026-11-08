import test from 'node:test';
import assert from 'node:assert/strict';
import { buildCreatorEarningsCsv } from '../creatorEarningsCsv.ts';

const record = (giftName: string) => ({ id: 'gift_1', giftId: 'rose', giftName, quantity: 2, grossNex: 100, creatorShareNex: 70, platformShareNex: 30, status: 'available', createdAt: '2026-11-08T00:00:00.000Z', settledAt: null });

test('creator earnings CSV quotes cells and preserves embedded quotes and line breaks', () => {
  const csv = buildCreatorEarningsCsv([record('Creator "special" gift\\nsecond line')]);
  assert.ok(csv.startsWith('\\uFEFF"Date","Gift"'));
  assert.ok(csv.includes('"Creator ""special"" gift\\nsecond line"'));
});

test('creator earnings CSV neutralizes spreadsheet formula injection in creator-controlled labels', () => {
  const csv = buildCreatorEarningsCsv([record('=HYPERLINK("https://bad.example")')]);
  assert.ok(csv.includes('"\'=HYPERLINK(""https://bad.example"")"'));
});
