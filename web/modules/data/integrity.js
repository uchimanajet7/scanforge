/**
 * データ整合性検証ロジック。
 */

import { logger } from '../core/logger.js';
import { getHistory } from './history/queries.js';
import { getStorageSize } from './storage/metrics.js';

export function validateDataIntegrity() {
  const issues = [];
  const warnings = [];

  const sizeInfo = getStorageSize();
  const maxSize = 5 * 1024 * 1024;

  if (sizeInfo.totalSize > maxSize) {
    warnings.push({
      type: 'storage_size',
      message: `ストレージ使用量が大きいです: ${sizeInfo.humanSize}`,
      data: sizeInfo,
    });
  }

  const historyItems = getHistory();
  const invalidHistoryItems = historyItems.filter(item => {
    return !item.id || !item.text || !item.format || !item.timestamp;
  });

  if (invalidHistoryItems.length > 0) {
    issues.push({
      type: 'invalid_history',
      message: `不正な履歴項目が見つかりました: ${invalidHistoryItems.length}件`,
      data: invalidHistoryItems,
    });
  }

  const oneMonthAgo = new Date();
  oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

  const oldHistoryItems = historyItems.filter(item => {
    return new Date(item.timestamp) < oneMonthAgo;
  });

  if (oldHistoryItems.length > 50) {
    warnings.push({
      type: 'old_history',
      message: `1ヶ月以上前の履歴が多数あります: ${oldHistoryItems.length}件`,
      data: { count: oldHistoryItems.length },
    });
  }

  logger.debug('data:integrity-check', {
    issues: issues.length,
    warnings: warnings.length,
  });

  return {
    valid: issues.length === 0,
    issues,
    warnings,
  };
}
