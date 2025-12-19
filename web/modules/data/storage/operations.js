import { logger } from '../../core/logger.js';
import { cleanupOldData } from './cleanup.js';

export function set(key, value, options = {}) {
  const {
    storage = localStorage,
    serialize = true,
    autoCleanup = true,
  } = options;

  try {
    const payload = serialize ? JSON.stringify(value) : value;
    storage.setItem(key, payload);

    logger.debug('storage:set', {
      key,
      size: typeof payload === 'string' ? payload.length : String(payload).length,
      type: storage === localStorage ? 'local' : 'session',
    });

    return true;
  } catch (error) {
    if (error.name === 'QuotaExceededError' && autoCleanup) {
      logger.error('storage:quota-exceeded', { key, error });
      cleanupOldData();
      return set(key, value, { ...options, autoCleanup: false });
    }

    logger.error('storage:set:error', { key, error });
    return false;
  }
}

export function get(key, options = {}) {
  const {
    storage = localStorage,
    deserialize = true,
    defaultValue = null,
  } = options;

  try {
    const raw = storage.getItem(key);
    if (raw === null) {
      return defaultValue;
    }
    return deserialize ? JSON.parse(raw) : raw;
  } catch (error) {
    logger.error('storage:get:error', { key, error });
    return defaultValue;
  }
}

export function remove(key, options = {}) {
  const { storage = localStorage } = options;

  try {
    storage.removeItem(key);
    logger.debug('storage:remove', { key });
    return true;
  } catch (error) {
    logger.error('storage:remove:error', { key, error });
    return false;
  }
}

export function has(key, options = {}) {
  const { storage = localStorage } = options;

  try {
    return storage.getItem(key) !== null;
  } catch (error) {
    logger.error('storage:has:error', { key, error });
    return false;
  }
}

export function clear(options = {}) {
  const {
    storage = localStorage,
    keepKeys = [],
  } = options;

  try {
    if (!keepKeys.length) {
      storage.clear();
      logger.debug('storage:clear:all');
      return true;
    }

    const snapshot = new Map();
    keepKeys.forEach((key) => {
      const value = storage.getItem(key);
      if (value !== null) {
        snapshot.set(key, value);
      }
    });

    storage.clear();
    snapshot.forEach((value, key) => {
      storage.setItem(key, value);
    });

    logger.debug('storage:clear:partial', { keepKeys });
    return true;
  } catch (error) {
    logger.error('storage:clear:error', error);
    return false;
  }
}
