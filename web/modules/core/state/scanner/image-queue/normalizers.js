/**
 * 画像キューに関する正規化・集計ロジックを集約する。
 */

import { IMAGE_ACTIVE_STATUSES, IMAGE_TERMINAL_STATUSES } from '../constants.js';
import {
  createDefaultImageState,
  cloneImageJob,
} from './state.js';
import {
  mergeObjectUrlPool,
  filterActiveTaskIds,
} from '../object-url-pool.js';

export function normalizeImageProgress(progress) {
  if (progress == null) {
    return null;
  }
  if (typeof progress === 'string') {
    return {
      mode: progress === 'determinate' ? 'determinate' : 'indeterminate',
      value: progress === 'determinate' ? 0 : null,
    };
  }
  const mode = progress.mode === 'determinate' ? 'determinate' : 'indeterminate';
  const value = typeof progress.value === 'number'
    ? Math.min(Math.max(progress.value, 0), 1)
    : (mode === 'determinate' ? 0 : null);
  return { mode, value };
}

function calculateImageQueueOverall(queue) {
  return queue.reduce((acc, job) => {
    const size = Number(job.fileSize) || 0;
    acc.totalBytes += size;

    if (IMAGE_TERMINAL_STATUSES.includes(job.status)) {
      acc.processedBytes += size;
    }
    if (job.status === 'success') {
      acc.completed += 1;
    } else if (job.status === 'failed') {
      acc.failed += 1;
    } else if (job.status === 'canceled') {
      acc.canceled += 1;
    }
    return acc;
  }, {
    totalBytes: 0,
    processedBytes: 0,
    completed: 0,
    failed: 0,
    canceled: 0,
  });
}

function deriveImageQueueStatus(queue) {
  if (queue.some(job => IMAGE_ACTIVE_STATUSES.includes(job.status))) {
    return 'busy';
  }
  if (queue.some(job => job.status === 'failed')) {
    return 'error';
  }
  return 'idle';
}

function deriveLatestImageError(queue) {
  for (let i = queue.length - 1; i >= 0; i -= 1) {
    const job = queue[i];
    if (job && typeof job.error === 'string' && job.error.trim()) {
      return job.error.trim();
    }
  }
  return null;
}

export function finalizeImageState(draftInput) {
  const draft = draftInput || createDefaultImageState();

  const normalizedQueue = Array.isArray(draft.queue)
    ? draft.queue.map(job => {
        const next = cloneImageJob(job);
        next.status = next.status || 'queued';
        next.progress = normalizeImageProgress(next.progress);
        next.updatedAt = Number(next.updatedAt) || Date.now();
        next.createdAt = Number(next.createdAt) || next.updatedAt;
        next.attempts = Number.isFinite(next.attempts) ? Math.max(0, Number(next.attempts)) : 0;
        next.durationMs = Number.isFinite(next.durationMs) ? Math.max(0, Number(next.durationMs)) : 0;
        next.retryAt = Number.isFinite(next.retryAt) ? Math.max(0, Number(next.retryAt)) : null;
        next.batchId = typeof next.batchId === 'string' && next.batchId.trim() ? next.batchId.trim() : null;
        next.batchCreatedAt = Number(next.batchCreatedAt) || next.createdAt;
        return next;
      })
    : [];

  const overall = calculateImageQueueOverall(normalizedQueue);
  const status = deriveImageQueueStatus(normalizedQueue);
  const lastError = deriveLatestImageError(normalizedQueue);
  const objectUrlPool = mergeObjectUrlPool(draft.objectUrlPool, normalizedQueue);
  const activeTaskIds = filterActiveTaskIds(draft.activeTaskIds, normalizedQueue);

  return {
    status,
    queue: normalizedQueue,
    activeTaskIds,
    overall,
    objectUrlPool,
    lastProcessedAt: Date.now(),
    lastError,
  };
}
