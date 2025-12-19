/**
 * BarcodeDetector の連続検出ループ。
 */

import { logger } from '../../core/logger.js';
import { throttle } from '../../core/utils.js';
import { APP_CONFIG } from '../../core/config/app-settings.js';
import {
  detect,
} from './barcode.js';
import {
  getIsDetecting,
  setIsDetecting,
  getAnimationFrameId,
  setAnimationFrameId,
  clearAnimationFrameId,
  setLastDetectionTime,
} from './state.js';
import {
  filterNewDetections,
  cleanupCache,
  recordDetections,
} from './cache.js';
import { applyNonMaxSuppression } from './nms.js';

export function startContinuousDetection(video, onDetection, options = {}) {
  const {
    throttleMs = 100,
    cacheMs = APP_CONFIG.DETECTION_CACHE_TTL_MS,
    enableNMS = true,
  } = options;

  if (getIsDetecting()) {
    logger.warn('すでに検出中です');
    return;
  }

  setIsDetecting(true);
  logger.debug('detector:continuous:start');

  const throttledDetect = throttle(async () => {
    if (!getIsDetecting() || !video || video.paused) {
      return;
    }

    try {
      const results = await detect(video);
      if (results.length === 0) {
        return;
      }

      cleanupCache(cacheMs);
      const newResults = filterNewDetections(results, cacheMs);
      const filteredResults = enableNMS
        ? applyNonMaxSuppression(newResults)
        : newResults;

      if (filteredResults.length > 0) {
        recordDetections(filteredResults);
        onDetection(filteredResults);
        setLastDetectionTime(Date.now());
      }
    } catch (error) {
      logger.error('連続検出エラー', error);
    }
  }, throttleMs);

  const detectLoop = () => {
    if (!getIsDetecting()) {
      return;
    }

    throttledDetect();

    if ('requestVideoFrameCallback' in video) {
      video.requestVideoFrameCallback(detectLoop);
    } else {
      const id = requestAnimationFrame(detectLoop);
      setAnimationFrameId(id);
    }
  };

  detectLoop();
}

export function stopContinuousDetection() {
  if (!getIsDetecting()) {
    return;
  }

  setIsDetecting(false);

  const frameId = getAnimationFrameId();
  if (frameId) {
    cancelAnimationFrame(frameId);
    clearAnimationFrameId();
  }

  logger.debug('detector:continuous:stop');
}
