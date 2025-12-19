/**
 * 検出キャッシュと重複抑制ロジックを提供する。
 */

import { logger } from '../core/logger.js';
import { APP_CONFIG } from '../core/config/app-settings.js';
import {
  DETECTION_CACHE_CLEANUP_INTERVAL,
  clearDetectionCache,
  clearDetectionCleanupHandle,
  getDetectionCache,
  getDetectionCleanupHandle,
  setDetectionCleanupHandle,
} from './context.js';
import { buildDetectionCacheKey } from './geometry.js';

function resetDetectionTracking() {
  clearDetectionCache();
  const handle = getDetectionCleanupHandle();
  if (handle) {
    clearTimeout(handle);
    clearDetectionCleanupHandle();
  }
}

function pruneDetectionCache(now = performance.now()) {
  const cache = getDetectionCache();
  if (!cache.size) {
    return;
  }
  const ttl = APP_CONFIG.DETECTION_CACHE_TTL_MS;
  cache.forEach((entry, key) => {
    if (!entry || typeof entry !== 'object') {
      cache.delete(key);
      return;
    }
    if (now - entry.timestamp > ttl) {
      cache.delete(key);
    }
  });
}

function scheduleDetectionCleanup() {
  if (getDetectionCleanupHandle()) {
    return;
  }
  const handle = setTimeout(() => {
    clearDetectionCleanupHandle();
    pruneDetectionCache(performance.now());
    if (getDetectionCache().size) {
      scheduleDetectionCleanup();
    }
  }, DETECTION_CACHE_CLEANUP_INTERVAL);
  setDetectionCleanupHandle(handle);
}

function shouldEmitDetection(detection, { force = false, now = performance.now() } = {}) {
  const cache = getDetectionCache();
  const key = buildDetectionCacheKey(detection);
  if (!key) {
    return false;
  }

  pruneDetectionCache(now);

  if (!force) {
    const cached = cache.get(key);
    if (cached && typeof cached.timestamp === 'number') {
      if (now - cached.timestamp < APP_CONFIG.DETECTION_CACHE_TTL_MS) {
        logger.debug('検出キャッシュ命中', { key, age: now - cached.timestamp });
        return false;
      }
    }
  }

  cache.set(key, { timestamp: now });
  scheduleDetectionCleanup();
  return true;
}

export { resetDetectionTracking, scheduleDetectionCleanup, shouldEmitDetection };
