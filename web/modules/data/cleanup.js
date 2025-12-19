/**
 * データクリーンアップ処理。
 */

import { logger } from '../core/logger.js';
import { getHistory } from './history/queries.js';
import { removeHistoryEntry } from './history/commands.js';
import { saveHistory } from './history/persistence.js';
import { remove } from './storage/operations.js';

export function cleanupData(options = {}) {
  const {
    removeOldHistory = false,
    removeInvalidData = false,
    compactStorage = false,
  } = options;

  const results = {
    removed: {
      history: 0,
      storage: 0,
    },
    errors: [],
  };

  try {
    if (removeOldHistory) {
      const oneMonthAgo = new Date();
      oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

      const historyItems = getHistory();
      const oldItems = historyItems.filter(item => {
        return new Date(item.timestamp) < oneMonthAgo;
      });

      oldItems.forEach(item => {
        if (removeHistoryEntry(item.id)) {
          results.removed.history += 1;
        }
      });

      logger.debug('data:cleanup:old-history', { count: results.removed.history });
    }

    if (removeInvalidData) {
      const historyItems = getHistory();
      const invalidItems = historyItems.filter(item => {
        return !item.id || !item.text || !item.format || !item.timestamp;
      });

      invalidItems.forEach(item => {
        if (removeHistoryEntry(item.id)) {
          results.removed.history += 1;
        }
      });

      logger.debug('data:cleanup:invalid-history', { count: invalidItems.length });
    }

    if (compactStorage) {
      saveHistory();

      const keys = [];
      for (let i = 0; i < localStorage.length; i += 1) {
        keys.push(localStorage.key(i));
      }

      keys.forEach(key => {
        if (key.startsWith('temp_') || key.startsWith('cache_')) {
          remove(key);
          results.removed.storage += 1;
        }
      });

      logger.debug('data:cleanup:storage-compaction', { removed: results.removed.storage });
    }
  } catch (error) {
    logger.error('クリーンアップエラー', error);
    results.errors.push(error.message);
  }

  return results;
}
