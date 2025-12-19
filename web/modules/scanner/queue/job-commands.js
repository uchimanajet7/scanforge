import { getState } from '../../core/state/base.js';
import {
  removeImageQueueJob,
  removeImageQueueJobsByStatus,
  resetImageQueueState,
  updateImageQueueJob,
} from '../../core/state/scanner/image-queue/mutations.js';
import { getImageQueueJob } from '../../core/state/scanner/selectors.js';
import toast from '../../ui/toast/manager.js';
import {
  IMAGE_JOB_ACTIVE_STATUSES,
  getImageJobStore,
} from '../context.js';
import {
  cleanupImageJob,
  clearAutoRetryTimer,
  scheduleImageQueue,
} from './runner.js';

function cancelImageJob(jobId, options = {}) {
  const { silent = false } = options;
  const job = getImageQueueJob(jobId);
  if (!job) {
    return false;
  }

  if (!IMAGE_JOB_ACTIVE_STATUSES.has(job.status) && job.status !== 'retrying') {
    return false;
  }

  const store = getImageJobStore();
  const context = store.get(jobId);
  if (context) {
    clearAutoRetryTimer(context);
    context.canceled = true;
    if (context.controller) {
      context.controller.abort();
    }
  }

  updateImageQueueJob(jobId, {
    status: 'canceled',
    progress: null,
    error: '処理をキャンセルしました。',
    retryAt: null,
  });

  if (!silent) {
    toast.info('処理をキャンセルしました。');
  }
  return true;
}

function retryImageJob(jobId, { manual = false } = {}) {
  const job = getImageQueueJob(jobId);
  if (!job) {
    return false;
  }

  if (IMAGE_JOB_ACTIVE_STATUSES.has(job.status)) {
    return false;
  }

  const store = getImageJobStore();
  const context = store.get(jobId);
  if (!context) {
    toast.error('元ファイルが見つからないため再試行できません。');
    return false;
  }

  clearAutoRetryTimer(context);
  context.canceled = false;
  if (manual) {
    context.autoRetryCount = 0;
  }

  updateImageQueueJob(jobId, {
    status: 'queued',
    progress: null,
    error: null,
    retryAt: null,
  });

  scheduleImageQueue();
  return true;
}

function retryFailedImageJobs() {
  const queue = getState('scanner.image.queue') || [];
  const targets = queue.filter(job => job.status === 'failed');
  targets.forEach(job => retryImageJob(job.id, { manual: true }));
  return targets.length;
}

function clearImageJobsByStatus(statuses = ['success', 'failed', 'canceled']) {
  const removed = removeImageQueueJobsByStatus(statuses);
  removed.forEach(job => cleanupImageJob(job.id, { revokeObjectUrl: true }));
  return removed.length;
}

function removeImageJob(jobId) {
  const removed = removeImageQueueJob(jobId);
  if (!removed) {
    return false;
  }
  cleanupImageJob(jobId, { revokeObjectUrl: true });
  return true;
}

function resetImageQueue() {
  const queue = getState('scanner.image.queue') || [];
  queue.forEach(job => cleanupImageJob(job.id, { revokeObjectUrl: true }));
  resetImageQueueState();

  const store = getImageJobStore();
  store.forEach((context, jobId) => {
    cleanupImageJob(jobId, { revokeObjectUrl: true, abort: true });
  });

  return queue.length;
}

function stopImageProcessing() {
  const queue = getState('scanner.image.queue') || [];
  let canceled = 0;
  queue.forEach(job => {
    if (job?.id && IMAGE_JOB_ACTIVE_STATUSES.has(job.status)) {
      if (cancelImageJob(job.id, { silent: true })) {
        canceled += 1;
      }
    }
  });
  return canceled;
}

export {
  cancelImageJob,
  clearImageJobsByStatus,
  removeImageJob,
  resetImageQueue,
  retryFailedImageJobs,
  retryImageJob,
  stopImageProcessing,
};
