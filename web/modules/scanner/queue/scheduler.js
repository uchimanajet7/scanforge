/**
 * ジョブスケジューリングと実行前後のコンテキスト管理を担当する。
 */

import {
  IMAGE_QUEUE_MAX_PARALLEL,
  getActiveImageTaskCount,
  getImageJobStore,
  incrementActiveImageTaskCount,
  decrementActiveImageTaskCount,
} from '../context.js';
import { updateImageQueueJob } from '../../core/state/scanner/image-queue/mutations.js';
import { getState } from '../../core/state/base.js';
import {
  registerActiveTask,
  unregisterActiveTask,
} from './job-handlers.js';
import { clearAutoRetryTimer } from './auto-retry.js';
import { runImageJob } from './job-execution.js';

export function scheduleImageQueue() {
  if (getActiveImageTaskCount() >= IMAGE_QUEUE_MAX_PARALLEL) {
    return;
  }

  let nextJob = findNextQueuedJob();
  while (nextJob && getActiveImageTaskCount() < IMAGE_QUEUE_MAX_PARALLEL) {
    startImageJob(nextJob);
    nextJob = findNextQueuedJob();
  }
}

export function findNextQueuedJob() {
  const queue = getState('scanner.image.queue') || [];
  return queue.find(job => job.status === 'queued') || null;
}

function startImageJob(jobMeta) {
  const store = getImageJobStore();
  const context = store.get(jobMeta.id);
  if (!context) {
    updateImageQueueJob(jobMeta.id, {
      status: 'failed',
      progress: null,
      error: '解析用データを取得できませんでした。',
    });
    return;
  }

  clearAutoRetryTimer(context);
  context.canceled = false;
  context.controller = new AbortController();
  context.startedAt = performance.now();
  context.attempts += 1;
  incrementActiveImageTaskCount();
  registerActiveTask(jobMeta.id);

  updateImageQueueJob(jobMeta.id, {
    status: 'preparing',
    progress: { mode: 'indeterminate', value: null },
    error: null,
    attempts: context.attempts,
    retryAt: null,
  });

  queueMicrotask(() => runImageJob(context));
}

export function finalizeImageJob(context) {
  unregisterActiveTask(context.id);
  if (context.controller) {
    context.controller = null;
  }
  decrementActiveImageTaskCount();
  scheduleImageQueue();
}
