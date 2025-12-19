/**
 * 検出キャッシュ管理。
 */

import {
  getDetectionCache,
} from './state.js';

export function filterNewDetections(results, cacheMs) {
  const now = Date.now();
  const cache = getDetectionCache();

  return results.filter(result => {
    const key = buildCacheKey(result);
    if (!key) {
      return false;
    }
    const lastSeen = cache.get(key);
    if (!lastSeen || now - lastSeen > cacheMs) {
      return true;
    }
    return false;
  });
}

export function recordDetections(results) {
  const cache = getDetectionCache();
  const now = Date.now();
  results.forEach(result => {
    const key = buildCacheKey(result);
    if (key) {
      cache.set(key, now);
    }
  });
}

export function cleanupCache(cacheMs) {
  const cache = getDetectionCache();
  const now = Date.now();

  for (const [key, timestamp] of cache.entries()) {
    if (now - timestamp > cacheMs) {
      cache.delete(key);
    }
  }
}

export function clearCache() {
  getDetectionCache().clear();
}

function buildCacheKey(result) {
  if (!result?.format || typeof result.text !== 'string') {
    return null;
  }
  return `${result.format}:${result.text}`;
}
