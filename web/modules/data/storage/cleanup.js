import { logger } from '../../core/logger.js';
import { OBSOLETE_KEYS } from '../../core/config/storage-keys.js';

function safelyParseStoredValue(key) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch (error) {
    logger.warn('storage:cleanup:parse-error', { key, error });
    return null;
  }
}

export function cleanupOldData() {
  Object.values(OBSOLETE_KEYS).forEach((key) => {
    try {
      if (localStorage.getItem(key) !== null) {
        localStorage.removeItem(key);
        logger.debug('storage:cleanup:obsolete-key-removed', { key });
      }
    } catch (error) {
      logger.warn('storage:cleanup:obsolete-key-failed', { key, error });
    }
  });

  const now = Date.now();
  const keys = [];
  for (let index = 0; index < localStorage.length; index += 1) {
    const key = localStorage.key(index);
    if (key) {
      keys.push(key);
    }
  }

  keys.forEach((key) => {
    if (key.startsWith('temp_') || key.startsWith('cache_')) {
      const data = safelyParseStoredValue(key);
      if (data && data.timestamp) {
        const age = now - Number(data.timestamp);
        if (Number.isFinite(age) && age > 24 * 60 * 60 * 1000) {
          try {
            localStorage.removeItem(key);
            logger.debug('storage:cleanup:stale-temp-removed', { key, age });
          } catch (error) {
            logger.warn('storage:cleanup:stale-temp-failed', { key, error });
          }
        }
      }
    }
  });
}
