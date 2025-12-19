import { formatDateTime } from '../../core/utils.js';
import { getState } from '../../core/state/base.js';

export function exportHistoryAsJson() {
  const items = getState('history.items');
  const payload = {
    version: '1.0',
    exported: new Date().toISOString(),
    items,
  };

  return JSON.stringify(payload, null, 2);
}

export function exportHistoryAsCsv() {
  const items = getState('history.items');
  const headers = ['日時', 'フォーマット', 'テキスト'];
  const rows = [headers];

  items.forEach((item) => {
    const row = [
      formatDateTime(new Date(item.timestamp)),
      item.format,
      `"${(item.text || '').replace(/"/g, '""')}"`,
    ];
    rows.push(row);
  });

  return rows.map((row) => row.join(',')).join('\n');
}

export function exportHistoryAsText() {
  const items = getState('history.items');
  return items.map((item) => {
    const date = formatDateTime(new Date(item.timestamp));
    return `[${date}] ${item.format}: ${item.text}`;
  }).join('\n');
}
