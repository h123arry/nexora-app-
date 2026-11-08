import type { CreatorGiftEarning } from '../services/creatorEarningsService';

function csvCell(value: string | number | null | undefined): string {
  let text = value === null || value === undefined ? '' : String(value);
  // Spreadsheet formula injection protection for creator-controlled gift labels.
  if (/^[\\u0000-\\u0020]*[=+@-]/.test(text)) text = "'" + text;
  return '"' + text.replace(/"/g, '""') + '"';
}

export function buildCreatorEarningsCsv(records: CreatorGiftEarning[]): string {
  const rows: Array<Array<string | number | null>> = [
    ['Date', 'Gift', 'Quantity', 'Gross NEX', 'Creator Share NEX', 'Status'],
    ...records.map(record => [record.createdAt, record.giftName, record.quantity, record.grossNex, record.creatorShareNex, record.status]),
  ];
  return '\\uFEFF' + rows.map(row => row.map(csvCell).join(',')).join('\\r\\n');
}
