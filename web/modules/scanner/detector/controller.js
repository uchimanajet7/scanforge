/**
 * BarcodeDetector ラッパー公開インターフェース。
 */

import {
  isSupported,
  getSupportedFormats,
  initialize,
  detect,
} from './barcode.js';
import {
  startContinuousDetection,
  stopContinuousDetection,
} from './continuous.js';
import {
  clearCache as clearDetectionCache,
} from './cache.js';
import {
  getDetector,
  getIsDetecting,
  getLastDetectionTime as getLastDetectionTimeState,
  setLastDetectionTime,
  resetDetectionState,
} from './state.js';

export { isSupported, getSupportedFormats, initialize, detect, startContinuousDetection, stopContinuousDetection };

export function isDetectingNow() {
  return getIsDetecting();
}

export function getLastDetectionTime() {
  return getLastDetectionTimeState();
}

export function clearCache() {
  clearDetectionCache();
}

export function getDebugInfo() {
  const detector = getDetector();
  const lastDetection = getLastDetectionTimeState();
  return {
    isSupported: isSupported(),
    isInitialized: detector !== null,
    isDetecting: getIsDetecting(),
    lastDetection: lastDetection ? new Date(lastDetection).toISOString() : null,
  };
}

export function cleanup() {
  stopContinuousDetection();
  clearDetectionCache();
  resetDetectionState();
  setLastDetectionTime(0);
}

export default {
  isSupported,
  getSupportedFormats,
  initialize,
  detect,
  startContinuousDetection,
  stopContinuousDetection,
  isDetectingNow,
  getLastDetectionTime,
  clearCache,
  getDebugInfo,
  cleanup,
};
