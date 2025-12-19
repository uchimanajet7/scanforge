/**
 * 画像キュー状態を操作するミューテーション群を集約する。
 */

import { logger } from '../../../logger.js';
import { getState, setState } from '../../base.js';
import {
  createDefaultImageState,
  cloneImageState,
  cloneImageJob,
  cloneImageJobResult,
} from './state.js';
import {
  finalizeImageState,
  normalizeImageProgress,
} from './normalizers.js';

export function resetImageQueueState() {
  const initial = createDefaultImageState();
  setState('scanner.image', initial);
  logger.debug('state:image-queue:reset');
  return initial;
}

export function mutateImageQueueState(mutator) {
  const currentState = cloneImageState(getState('scanner.image') || createDefaultImageState());
  const draft = typeof mutator === 'function' ? (mutator(currentState) || currentState) : currentState;
  const normalized = finalizeImageState(draft);
  setState('scanner.image', normalized);
  logger.debug('画像キュー状態更新', {
    status: normalized.status,
    queueSize: normalized.queue.length,
  });
  return normalized;
}

export function addImageQueueJobs(jobPayloads = []) {
  if (!Array.isArray(jobPayloads) || jobPayloads.length === 0) {
    return [];
  }

  const addedIds = [];

  mutateImageQueueState(state => {
    jobPayloads.forEach(payload => {
      if (!payload || typeof payload !== 'object' || !payload.id) {
        return;
      }
      const timestamp = Number(payload.createdAt) || Date.now();
      const job = {
        id: payload.id,
        fileName: payload.fileName || '',
        fileSize: Number(payload.fileSize) || 0,
        mime: payload.mime || '',
        objectUrl: payload.objectUrl || null,
        status: payload.status || 'queued',
        progress: normalizeImageProgress(payload.progress),
        attempts: Number.isFinite(payload.attempts) ? Math.max(0, Number(payload.attempts)) : 0,
        error: typeof payload.error === 'string' ? payload.error : null,
        result: payload.result ? cloneImageJobResult(payload.result) : null,
        createdAt: timestamp,
        updatedAt: Number(payload.updatedAt) || timestamp,
        fingerprint: payload.fingerprint ?? null,
        durationMs: Number.isFinite(payload.durationMs) ? Math.max(0, Number(payload.durationMs)) : 0,
        batchId: typeof payload.batchId === 'string' && payload.batchId.trim() ? payload.batchId.trim() : null,
        batchCreatedAt: Number(payload.batchCreatedAt) || timestamp,
        retryAt: Number.isFinite(payload.retryAt) ? Math.max(0, Number(payload.retryAt)) : null,
      };
      state.queue.push(job);
      addedIds.push(job.id);
    });
    return state;
  });

  const queue = getState('scanner.image.queue') || [];
  return queue
    .filter(job => addedIds.includes(job.id))
    .map(cloneImageJob)
    .filter(Boolean);
}

export function updateImageQueueJob(jobId, updates) {
  if (!jobId) {
    return null;
  }

  let updatedJob = null;
  mutateImageQueueState(state => {
    const index = state.queue.findIndex(job => job.id === jobId);
    if (index === -1) {
      return state;
    }

    const target = state.queue[index];
    let next = { ...target };

    if (typeof updates === 'function') {
      next = updates(next) || next;
    } else if (updates && typeof updates === 'object') {
      next = {
        ...next,
        ...updates,
      };
    }

    if (updates?.progress !== undefined || typeof updates === 'function') {
      next.progress = normalizeImageProgress(next.progress);
    }
    if ('result' in next) {
      next.result = next.result ? cloneImageJobResult(next.result) : null;
    }
    if ('error' in next && typeof next.error !== 'string') {
      next.error = null;
    }
    if ('objectUrl' in next && typeof next.objectUrl !== 'string') {
      next.objectUrl = null;
    }
    if (typeof next.status !== 'string') {
      next.status = target.status;
    }
    next.updatedAt = Number(next.updatedAt) || Date.now();
    next.attempts = Number.isFinite(next.attempts) ? Math.max(0, Number(next.attempts)) : target.attempts || 0;
    next.durationMs = Number.isFinite(next.durationMs) ? Math.max(0, Number(next.durationMs)) : target.durationMs || 0;

    state.queue[index] = next;
    updatedJob = next;
    return state;
  });

  return updatedJob ? cloneImageJob(updatedJob) : null;
}

export function updateImageQueueJobsByStatus(statuses, updater) {
  if (!Array.isArray(statuses) || statuses.length === 0) {
    return [];
  }
  const statusSet = new Set(statuses);
  const updated = [];

  mutateImageQueueState(state => {
    state.queue = state.queue.map(job => {
      if (!statusSet.has(job.status)) {
        return job;
      }
      const next = typeof updater === 'function' ? (updater({ ...job }) || job) : { ...job, ...updater };
      next.progress = normalizeImageProgress(next.progress);
      next.result = next.result ? cloneImageJobResult(next.result) : null;
      next.updatedAt = Number(next.updatedAt) || Date.now();
      updated.push(next);
      return next;
    });
    return state;
  });

  return updated.map(cloneImageJob);
}

export function removeImageQueueJob(jobId) {
  if (!jobId) {
    return null;
  }
  let removed = null;
  mutateImageQueueState(state => {
    const index = state.queue.findIndex(job => job.id === jobId);
    if (index === -1) {
      return state;
    }
    removed = state.queue.splice(index, 1)[0];
    state.activeTaskIds = state.activeTaskIds.filter(id => id !== jobId);
    return state;
  });
  return removed ? cloneImageJob(removed) : null;
}

export function removeImageQueueJobsByStatus(statuses = []) {
  if (!Array.isArray(statuses) || statuses.length === 0) {
    return [];
  }
  const statusSet = new Set(statuses);
  const removed = [];

  mutateImageQueueState(state => {
    const remaining = [];
    state.queue.forEach(job => {
      if (statusSet.has(job.status)) {
        removed.push(job);
      } else {
        remaining.push(job);
      }
    });
    state.queue = remaining;
    state.activeTaskIds = state.activeTaskIds.filter(id => remaining.some(job => job.id === id));
    return state;
  });

  return removed.map(cloneImageJob);
}

export function setImageActiveTaskIds(ids = []) {
  mutateImageQueueState(state => {
    state.activeTaskIds = Array.isArray(ids) ? ids.filter(id => typeof id === 'string') : [];
    return state;
  });
}

export function addImageActiveTask(id) {
  if (!id) {
    return;
  }
  mutateImageQueueState(state => {
    if (!state.activeTaskIds.includes(id)) {
      state.activeTaskIds.push(id);
    }
    return state;
  });
}

export function removeImageActiveTask(id) {
  if (!id) {
    return;
  }
  mutateImageQueueState(state => {
    state.activeTaskIds = state.activeTaskIds.filter(taskId => taskId !== id);
    return state;
  });
}
