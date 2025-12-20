import { logger } from '../../core/logger.js';
import { OBSOLETE_KEYS } from '../../core/config/storage-keys.js';
import { getStorageSize } from './metrics.js';

export function initStorage() {
  const obsoleteThemeKey = OBSOLETE_KEYS.theme;
  try {
    if (localStorage.getItem(obsoleteThemeKey) !== null) {
      localStorage.removeItem(obsoleteThemeKey);
      logger.debug('storage:cleanup:obsolete-key-removed', { key: obsoleteThemeKey });
    }
  } catch (error) {
    logger.warn('storage:cleanup:obsolete-key-failed', { key: obsoleteThemeKey, error });
  }

  const sizeInfo = getStorageSize();
  logger.debug('storage:usage', {
    size: sizeInfo.humanSize,
    items: sizeInfo.itemCount,
  });
}
