/**
 * BarcodeDetector ラッパー内部状態。
 */

let detectorInstance = null;
let isDetecting = false;
let animationFrameId = null;
const detectionCache = new Map();
let lastDetectionTime = 0;

export function getDetector() {
  return detectorInstance;
}

export function setDetector(instance) {
  detectorInstance = instance;
}

export function clearDetector() {
  detectorInstance = null;
}

export function getIsDetecting() {
  return isDetecting;
}

export function setIsDetecting(value) {
  isDetecting = !!value;
}

export function getAnimationFrameId() {
  return animationFrameId;
}

export function setAnimationFrameId(id) {
  animationFrameId = id;
}

export function clearAnimationFrameId() {
  animationFrameId = null;
}

export function getDetectionCache() {
  return detectionCache;
}

export function getLastDetectionTime() {
  return lastDetectionTime;
}

export function setLastDetectionTime(timestamp) {
  lastDetectionTime = timestamp;
}

export function resetDetectionState() {
  clearDetector();
  setIsDetecting(false);
  clearAnimationFrameId();
  detectionCache.clear();
  lastDetectionTime = 0;
}
