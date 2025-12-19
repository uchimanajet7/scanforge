import { getState } from '../../core/state/base.js';

export function getHistoryStatistics() {
  const items = getState('history.items');

  const formatCounts = {};
  items.forEach((item) => {
    formatCounts[item.format] = (formatCounts[item.format] || 0) + 1;
  });

  const timestamps = items.map((item) => new Date(item.timestamp).getTime());
  const oldestDate = timestamps.length ? new Date(Math.min(...timestamps)) : null;
  const newestDate = timestamps.length ? new Date(Math.max(...timestamps)) : null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayCount = items.filter((item) => new Date(item.timestamp) >= today).length;

  return {
    totalCount: items.length,
    formatCounts,
    oldestDate,
    newestDate,
    todayCount,
  };
}
