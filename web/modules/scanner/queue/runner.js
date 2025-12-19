import { getImageJobStore } from '../context.js';
import { scheduleImageQueue as scheduleJobs } from './scheduler.js';
import { clearAutoRetryTimer } from './auto-retry.js';

function scheduleImageQueue() {
  scheduleJobs();
}

function cleanupImageJob(jobId, { revokeObjectUrl = false, abort = false } = {}) {
  const store = getImageJobStore();
  const context = store.get(jobId);
  if (!context) {
    return;
  }

  if (abort && context.controller) {
    context.controller.abort();
  }

  clearAutoRetryTimer(context);

  if (revokeObjectUrl && context.objectUrl) {
    try {
      URL.revokeObjectURL(context.objectUrl);
    } catch {
      // revokeObjectURL は無効/解放済みURL等で例外になり得る。後始末はベストエフォートなので無視する。
    }
  }

  store.delete(jobId);
}

export { cleanupImageJob, clearAutoRetryTimer, scheduleImageQueue };
