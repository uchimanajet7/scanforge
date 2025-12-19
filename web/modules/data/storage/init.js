import { logger } from '../../core/logger.js';
import { STORAGE_KEYS, OBSOLETE_KEYS } from '../../core/config/storage-keys.js';
import { getStorageSize } from './metrics.js';
import { migrateStorage } from './migrations.js';

export function initStorage() {
  const migrations = {
    [OBSOLETE_KEYS.theme]: STORAGE_KEYS.settings,
  };

  const results = migrateStorage(migrations);
  if (Object.keys(results).length > 0) {
    logger.debug('storage:migrate:result', results);
  }

  const sizeInfo = getStorageSize();
  logger.debug('storage:usage', {
    size: sizeInfo.humanSize,
    items: sizeInfo.itemCount,
  });
}
