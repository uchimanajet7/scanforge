/**
 * 画像ジョブの自動リトライ制御を担当する。
 */

import {
  IMAGE_QUEUE_AUTO_RETRY_LIMIT,
  IMAGE_QUEUE_RETRY_BASE_DELAY_MS,
} from '../context.js';
import { updateImageQueueJob } from '../../core/state/scanner/image-queue/mutations.js';
import { scheduleImageQueue } from './scheduler.js';

export function scheduleAutoRetry(context, message, durationMs) {
  if (context.autoRetryCount >= IMAGE_QUEUE_AUTO_RETRY_LIMIT) {
    return false;
  }

  context.autoRetryCount += 1;
  const delay = IMAGE_QUEUE_RETRY_BASE_DELAY_MS * context.autoRetryCount;
  context.retryAt = Date.now() + delay;

  updateImageQueueJob(context.id, {
    status: 'retrying',
    progress: null,
    error: `${message} 自動的に再試行します…`,
    retryAt: context.retryAt,
    attempts: context.attempts,
    durationMs: durationMs || 0,
  });

  context.retryTimeout = setTimeout(() => {
    context.retryTimeout = null;
    context.retryAt = null;
    context.canceled = false;
    updateImageQueueJob(context.id, {
      status: 'queued',
      progress: null,
      error: null,
      retryAt: null,
    });
    scheduleImageQueue();
  }, delay);

  return true;
}

export function clearAutoRetryTimer(context) {
  if (context.retryTimeout) {
    clearTimeout(context.retryTimeout);
    context.retryTimeout = null;
  }
  context.retryAt = null;
}
