/**
 * データバックアップ機能。
 */

import { logger } from '../core/logger.js';
import { exportHistoryAsJson } from './history/exporters.js';
import { getHistoryCount } from './history/queries.js';
import { importHistoryFromJson } from './history/importers.js';
import { getStorageSize } from './storage/metrics.js';
import { exportStorageData, importStorageData } from './storage/transfer.js';

export function createBackup() {
  const backup = {
    version: '1.0',
    timestamp: new Date().toISOString(),
    data: {
      history: exportHistoryAsJson(),
      storage: exportStorageData(),
      metadata: {
        historyCount: getHistoryCount(),
        storageSize: getStorageSize(),
      },
    },
  };

  logger.info('backup:created', {
    historyCount: backup.data.metadata.historyCount,
    storageSize: backup.data.metadata.storageSize.humanSize,
  });

  return backup;
}

export function restoreFromBackup(backup, options = {}) {
  const {
    restoreHistory = true,
    restoreStorage = true,
    merge = false,
  } = options;

  const results = {
    success: false,
    restored: {
      history: 0,
      storage: 0,
    },
    errors: [],
  };

  try {
    if (!backup || !backup.data) {
      throw new Error('不正なバックアップデータ');
    }

    if (restoreHistory && backup.data.history) {
      const historyResult = importHistoryFromJson(backup.data.history, { merge });
      if (historyResult.success) {
        results.restored.history = historyResult.count;
      } else {
        results.errors.push(historyResult.error);
      }
    }

    if (restoreStorage && backup.data.storage) {
      const storageResult = importStorageData(backup.data.storage, { merge });
      if (storageResult.success) {
        results.restored.storage = storageResult.successCount;
      } else {
        results.errors.push(storageResult.error);
      }
    }

    results.success = results.errors.length === 0;

    logger.info('backup:restored', {
      success: results.success,
      restored: results.restored,
      errors: results.errors,
    });
  } catch (error) {
    logger.error('バックアップ復元エラー', error);
    results.errors.push(error.message);
  }

  return results;
}
