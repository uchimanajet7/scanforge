import { logger } from '../../core/logger.js';

export function exportStorageData(options = {}) {
  const {
    storage = localStorage,
    keys = null,
    excludeKeys = [],
  } = options;

  const data = {};
  const targets = Array.isArray(keys) ? [...keys] : [];

  if (!keys) {
    for (let index = 0; index < storage.length; index += 1) {
      const key = storage.key(index);
      if (key) {
        targets.push(key);
      }
    }
  }

  targets.forEach((key) => {
    if (!excludeKeys.includes(key)) {
      const value = storage.getItem(key);
      if (value !== null) {
        data[key] = value;
      }
    }
  });

  return {
    version: '1.0',
    timestamp: new Date().toISOString(),
    data,
  };
}

export function importStorageData(exportData, options = {}) {
  const {
    storage = localStorage,
    merge = false,
    validate = true,
  } = options;

  try {
    if (validate) {
      if (!exportData || typeof exportData !== 'object' || !exportData.data) {
        throw new Error('不正なエクスポートデータ');
      }
    }

    if (!merge) {
      storage.clear();
    }

    let successCount = 0;
    let errorCount = 0;

    Object.entries(exportData.data || {}).forEach(([key, value]) => {
      try {
        storage.setItem(key, value);
        successCount += 1;
      } catch (error) {
        logger.error('storage:import:item-error', { key, error });
        errorCount += 1;
      }
    });

    logger.debug('storage:import:complete', { successCount, errorCount });

    return {
      success: errorCount === 0,
      successCount,
      errorCount,
    };
  } catch (error) {
    logger.error('storage:import:error', error);
    return {
      success: false,
      error: error.message,
      successCount: 0,
      errorCount: 0,
    };
  }
}
