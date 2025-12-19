/**
 * スキャナーモジュール全体で共有する状態と定数を管理する。
 */

const DETECTION_CACHE_CLEANUP_INTERVAL = 1000;
const IMAGE_QUEUE_MAX_PARALLEL = 2;
const IMAGE_QUEUE_AUTO_RETRY_LIMIT = 3;
const IMAGE_QUEUE_RETRY_BASE_DELAY_MS = 1000;
const IMAGE_JOB_ACTIVE_STATUSES = Object.freeze(
  new Set(['queued', 'preparing', 'scanning', 'retrying']),
);

const context = {
  scanMode: 'auto',
  engine: null,
  resumeTimer: null,
  detectionCache: new Map(),
  detectionCleanupHandle: null,
  imageJobStore: new Map(),
  activeImageTaskCount: 0,
};

function getScanMode() {
  return context.scanMode;
}

function setScanMode(mode) {
  context.scanMode = mode;
}

function getCurrentEngine() {
  return context.engine;
}

function setCurrentEngine(engine) {
  context.engine = engine;
}

function getResumeTimer() {
  return context.resumeTimer;
}

function setResumeTimer(timer) {
  context.resumeTimer = timer;
}

function clearResumeTimerRef() {
  context.resumeTimer = null;
}

function getDetectionCache() {
  return context.detectionCache;
}

function clearDetectionCache() {
  context.detectionCache.clear();
}

function getDetectionCleanupHandle() {
  return context.detectionCleanupHandle;
}

function setDetectionCleanupHandle(handle) {
  context.detectionCleanupHandle = handle;
}

function clearDetectionCleanupHandle() {
  context.detectionCleanupHandle = null;
}

function getImageJobStore() {
  return context.imageJobStore;
}

function clearImageJobStore() {
  context.imageJobStore.forEach(job => {
    if (job?.objectUrl) {
      try {
        URL.revokeObjectURL(job.objectUrl);
      } catch {
        // revokeObjectURL は無効/解放済みURL等で例外になり得る。後始末はベストエフォートなので無視する。
      }
    }
  });
  context.imageJobStore.clear();
}

function getActiveImageTaskCount() {
  return context.activeImageTaskCount;
}

function incrementActiveImageTaskCount() {
  context.activeImageTaskCount += 1;
  return context.activeImageTaskCount;
}

function decrementActiveImageTaskCount() {
  context.activeImageTaskCount = Math.max(0, context.activeImageTaskCount - 1);
  return context.activeImageTaskCount;
}

function resetContext() {
  context.scanMode = 'auto';
  context.engine = null;
  context.resumeTimer = null;
  clearDetectionCache();
  clearDetectionCleanupHandle();
  clearImageJobStore();
  context.activeImageTaskCount = 0;
}

export {
  DETECTION_CACHE_CLEANUP_INTERVAL,
  IMAGE_JOB_ACTIVE_STATUSES,
  IMAGE_QUEUE_AUTO_RETRY_LIMIT,
  IMAGE_QUEUE_MAX_PARALLEL,
  IMAGE_QUEUE_RETRY_BASE_DELAY_MS,
  clearDetectionCache,
  clearDetectionCleanupHandle,
  clearImageJobStore,
  clearResumeTimerRef,
  decrementActiveImageTaskCount,
  getActiveImageTaskCount,
  getCurrentEngine,
  getDetectionCache,
  getDetectionCleanupHandle,
  getImageJobStore,
  getResumeTimer,
  getScanMode,
  incrementActiveImageTaskCount,
  resetContext,
  setCurrentEngine,
  setDetectionCleanupHandle,
  setResumeTimer,
  setScanMode,
};
