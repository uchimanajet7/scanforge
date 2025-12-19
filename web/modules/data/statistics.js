/**
 * データ統計情報の生成。
 */

import { getHistoryStatistics } from './history/statistics.js';
import { getStorageSize } from './storage/metrics.js';
import formats from './formats/catalog.js';

export function getStatistics() {
  const historyStats = getHistoryStatistics();
  const storageInfo = getStorageSize();
  const formatStats = {};

  const allFormats = formats.getAllFormats();
  allFormats.forEach(format => {
    formatStats[format] = {
      name: formats.getDisplayName(format),
      type: formats.getType(format),
      count: historyStats.formatCounts[format] || 0,
    };
  });

  return {
    history: {
      total: historyStats.totalCount,
      today: historyStats.todayCount,
      formats: historyStats.formatCounts,
      dateRange: {
        oldest: historyStats.oldestDate,
        newest: historyStats.newestDate,
      },
    },
    storage: {
      size: storageInfo.humanSize,
      items: storageInfo.itemCount,
      details: storageInfo.details.slice(0, 10),
    },
    formats: formatStats,
    summary: {
      mostUsedFormat: Object.entries(historyStats.formatCounts)
        .sort((a, b) => b[1] - a[1])[0]?.[0] || null,
      averagePerDay: historyStats.oldestDate
        ? Math.round(historyStats.totalCount /
            ((Date.now() - historyStats.oldestDate) / (1000 * 60 * 60 * 24)))
        : 0,
    },
  };
}
